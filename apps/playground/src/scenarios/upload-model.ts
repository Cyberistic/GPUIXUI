/**
 * The file-upload queue as pure rules (plan `388`).
 *
 * The runtime gives a drop only absolute paths — no size, MIME type or mtime —
 * so a known size is `Option.Some` and an unstatted path is `Option.None`.
 * Everything else here is queue arithmetic: add/dedupe/reject, progress,
 * cancel/retry and the derived summary. The view and the smoke scenario read
 * this module; no rule lives in the JSX.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The largest file the probe admits, in bytes. */
export const MAX_BYTES = 25 * 1024 * 1024;

/** The extensions the probe accepts, lower-case with the dot. */
export const ACCEPTED: ReadonlyArray<string> = [
  ".png",
  ".jpg",
  ".csv",
  ".pdf",
  ".txt",
];

/** A row's lifecycle. */
export type UploadStatus =
  | "queued"
  | "uploading"
  | "done"
  | "error"
  | "canceled";

/** One queued file. `bytes` is `None` until the app has statted the path. */
export interface UploadFile {
  readonly id: number;
  readonly path: string;
  readonly name: string;
  readonly bytes: Option.Option<number>;
  readonly progress: number;
  readonly status: UploadStatus;
}

/** A dropped path plus what the app already knows about it. */
export interface DroppedFile {
  readonly path: string;
  readonly bytes: Option.Option<number>;
}

/** The whole queue and the probe's counters. */
export interface UploadState {
  readonly files: ReadonlyArray<UploadFile>;
  readonly nextId: number;
  /** How many `onFileDrop` events arrived. */
  readonly events: number;
  readonly clicks: number;
  readonly picker: number;
  readonly duplicates: number;
  /** `"name: type"` or `"name: size"` for every refused path. */
  readonly rejected: ReadonlyArray<string>;
  readonly last: string;
}

/** The derived footer: counts, known bytes and the rounded mean progress. */
export interface UploadSummary {
  readonly total: number;
  readonly done: number;
  readonly bytes: number;
  readonly percent: number;
}

/** An empty queue. */
export const initial: UploadState = {
  files: [],
  nextId: 0,
  events: 0,
  clicks: 0,
  picker: 0,
  duplicates: 0,
  rejected: [],
  last: "start",
};

const nonEmptySegments = (value: string): ReadonlyArray<string> =>
  Arr.filter(Str.split(value, "/"), Str.isNonEmpty);

/** The last path segment, or the whole path when it has none. */
export const fileNameOf = (path: string): string =>
  Option.getOrElse(Arr.last(nonEmptySegments(path)), () => path);

/** The lower-case extension including the dot, or `""` when there is none. */
export const extensionOf = (path: string): string => {
  const name = fileNameOf(path);
  return Option.match(Str.lastIndexOf(".")(name), {
    onNone: () => "",
    onSome: (index) => Str.toLowerCase(Str.slice(index)(name)),
  });
};

/** Whether the probe accepts this path's extension. */
export const isAccepted = (path: string): boolean =>
  Arr.contains(ACCEPTED, extensionOf(path));

const UNITS: ReadonlyArray<string> = ["B", "KB", "MB", "GB"];

/** A compact byte count: `0 B`, `512 B`, `2.0 KB`, `15 KB`, `3.2 MB`. */
export const formatBytes = (bytes: number): string => {
  if (bytes <= 0) {
    return "0 B";
  }
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    Arr.length(UNITS) - 1,
  );
  const value = bytes / 1024 ** exponent;
  const digits = exponent === 0 ? 0 : value < 10 ? 1 : 0;
  const unit = Option.getOrElse(Arr.get(UNITS, exponent), () => "B");
  return `${value.toFixed(digits)} ${unit}`;
};

/** Adds every accepted, non-duplicate path. */
export const addFiles = (
  state: UploadState,
  files: ReadonlyArray<DroppedFile>,
): UploadState =>
  Arr.reduce(files, state, (current, file) => {
    const name = fileNameOf(file.path);
    if (Arr.some(current.files, (queued) => queued.path === file.path)) {
      return {
        ...current,
        duplicates: current.duplicates + 1,
        last: "duplicate",
      };
    }
    if (!isAccepted(file.path)) {
      return {
        ...current,
        rejected: Arr.append(current.rejected, `${name}: type`),
        last: "rejected",
      };
    }
    if (Option.exists(file.bytes, (bytes) => bytes > MAX_BYTES)) {
      return {
        ...current,
        rejected: Arr.append(current.rejected, `${name}: size`),
        last: "rejected",
      };
    }
    return {
      ...current,
      files: Arr.append(current.files, {
        id: current.nextId,
        path: file.path,
        name,
        bytes: file.bytes,
        progress: 0,
        status: "queued",
      }),
      nextId: current.nextId + 1,
      last: "add",
    };
  });

/**
 * Records one `onFileDrop` event.
 *
 * Measured in plan `388`: a drop on an element that **handles** it delivers no
 * following click (only an element without a handler gets the click, plan
 * `162`). A drop zone therefore needs no click guard — arming one swallows the
 * next real click, which is how this rule was found.
 *
 * One simulated drop delivers one event carrying every path; the counter stays
 * separate from the queue so a test can tell "one event" from "one row".
 */
export const noteDrop = (state: UploadState): UploadState => ({
  ...state,
  events: state.events + 1,
  last: "drop",
});

/** A click on the drop zone requests the picker. */
export const clickZone = (state: UploadState): UploadState => ({
  ...state,
  clicks: state.clicks + 1,
  picker: state.picker + 1,
  last: "picker",
});

const update = (
  state: UploadState,
  id: number,
  change: (file: UploadFile) => UploadFile,
  last: string,
): UploadState => ({
  ...state,
  files: Arr.map(state.files, (file) => (file.id === id ? change(file) : file)),
  last,
});

const transition =
  (from: ReadonlyArray<UploadStatus>) =>
  (
    state: UploadState,
    id: number,
    next: (file: UploadFile) => UploadFile,
    last: string,
  ): UploadState =>
    update(
      state,
      id,
      (file) => (Arr.contains(from, file.status) ? next(file) : file),
      last,
    );

const startable = transition(["queued"]);
const uploading = transition(["uploading"]);

/** Moves a queued row to `uploading`. */
export const start = (state: UploadState, id: number): UploadState =>
  startable(state, id, (file) => ({ ...file, status: "uploading" }), "start");

/** Clamps a progress report and refuses to move a settled row. */
export const setProgress = (
  state: UploadState,
  id: number,
  percent: number,
): UploadState =>
  uploading(
    state,
    id,
    (file) => ({
      ...file,
      progress: Math.min(100, Math.max(0, percent)),
    }),
    "progress",
  );

/** Marks an uploading row complete at 100%. */
export const complete = (state: UploadState, id: number): UploadState =>
  uploading(
    state,
    id,
    (file) => ({ ...file, progress: 100, status: "done" }),
    "done",
  );

/** Marks an uploading row failed, keeping its progress. */
export const fail = (state: UploadState, id: number): UploadState =>
  uploading(state, id, (file) => ({ ...file, status: "error" }), "fail");

/** Cancels an uploading row and freezes its progress. */
export const cancel = (state: UploadState, id: number): UploadState =>
  uploading(state, id, (file) => ({ ...file, status: "canceled" }), "cancel");

/** Returns a failed or canceled row to the queue at 0%. */
export const retry = (state: UploadState, id: number): UploadState =>
  transition(["canceled", "error"])(
    state,
    id,
    (file) => ({ ...file, progress: 0, status: "queued" }),
    "retry",
  );

/** The row with `id`, when the queue holds one. */
export const findFile = (
  state: UploadState,
  id: number,
): Option.Option<UploadFile> =>
  Arr.findFirst(state.files, (file) => file.id === id);

/** The derived footer. A canceled row's frozen progress still counts. */
export const summary = (state: UploadState): UploadSummary => {
  const total = Arr.length(state.files);
  const done = Arr.length(
    Arr.filter(state.files, (file) => file.status === "done"),
  );
  const bytes = Arr.reduce(
    state.files,
    0,
    (sum, file) => sum + Option.getOrElse(file.bytes, () => 0),
  );
  const percent =
    total === 0
      ? 0
      : Math.round(
          Arr.reduce(state.files, 0, (sum, file) => sum + file.progress) /
            total,
        );
  return { total, done, bytes, percent };
};

/** The label a row's single action shows, or `None` when it has none. */
export const actionLabel = (file: UploadFile): Option.Option<string> =>
  Match.value(file.status).pipe(
    Match.when("queued", () => Option.some("Start")),
    Match.when("uploading", () => Option.some("Cancel")),
    Match.when("done", () => Option.none<string>()),
    Match.when("error", () => Option.some("Retry")),
    Match.when("canceled", () => Option.some("Retry")),
    Match.exhaustive,
  );

/** The row's action applied to the queue. */
export const act = (state: UploadState, id: number): UploadState =>
  Option.match(findFile(state, id), {
    onNone: () => state,
    onSome: (file) =>
      Match.value(file.status).pipe(
        Match.when("queued", () => start(state, id)),
        Match.when("uploading", () => cancel(state, id)),
        Match.when("done", () => state),
        Match.when("error", () => retry(state, id)),
        Match.when("canceled", () => retry(state, id)),
        Match.exhaustive,
      ),
  });
