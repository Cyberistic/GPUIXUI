import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { accessibleName } from "../name.js";

export type UploadStatus = "idle" | "uploading" | "done" | "error";

export interface UploadFile {
  readonly id: string;
  readonly name: string;
}

export interface UploadItem {
  readonly id: string;
  readonly name: string;
  readonly status: UploadStatus;

  readonly progress: number;

  readonly token: number;
}

export interface UploadQueue {
  readonly items: ReadonlyArray<UploadItem>;

  readonly attempts: number;
}

export const emptyQueue: UploadQueue = { attempts: 0, items: [] };

class StoredFile extends Schema.Class<StoredFile>("StoredFile")({
  id: Schema.NonEmptyString,
  name: Schema.optionalKey(Schema.NullOr(Schema.String)),
}) {}

const decodeStoredFile = Schema.decodeUnknownOption(StoredFile);

export const filesOf = (value: unknown): ReadonlyArray<UploadFile> =>
  Arr.isArray(value)
    ? Arr.getSomes(
        Arr.map(value, (entry) =>
          Option.map(decodeStoredFile(entry), (file) => ({
            id: file.id,
            name: Option.getOrElse(
              Option.fromNullishOr(file.name),
              () => file.id,
            ),
          })),
        ),
      )
    : [];

const withItems = (
  state: UploadQueue,
  items: ReadonlyArray<UploadItem>,
): UploadQueue => ({ attempts: state.attempts, items });

const has = (state: UploadQueue, id: string): boolean =>
  Arr.some(state.items, (item) => item.id === id);

export const enqueue = (
  state: UploadQueue,
  files: ReadonlyArray<UploadFile>,
): UploadQueue =>
  Arr.reduce(files, state, (queue, file) =>
    has(queue, file.id)
      ? queue
      : withItems(
          queue,
          Arr.append(queue.items, {
            id: file.id,

            name: accessibleName(file.name, file.id),
            status: "idle",
            progress: 0,
            token: 0,
          }),
        ),
  );

export const findItem = (
  state: UploadQueue,
  id: string,
): Option.Option<UploadItem> =>
  Arr.findFirst(state.items, (item) => item.id === id);

export const start = (state: UploadQueue, id: string): UploadQueue => {
  const [attempts, items] = Arr.mapAccum(
    state.items,
    state.attempts,
    (attempts, item): readonly [number, UploadItem] =>
      item.id === id && (item.status === "idle" || item.status === "error")
        ? [
            attempts + 1,
            {
              ...item,
              status: "uploading",
              progress: 0,
              token: attempts + 1,
            },
          ]
        : [attempts, item],
  );
  return { attempts, items };
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const reportProgress = (
  state: UploadQueue,
  id: string,
  token: number,
  progress: number,
): UploadQueue =>
  withItems(
    state,
    Arr.map(state.items, (item) => {
      if (
        item.id !== id ||
        item.token !== token ||
        item.status !== "uploading"
      ) {
        return item;
      }
      const next = clamp01(progress);
      return Number.isNaN(next) || next <= item.progress
        ? item
        : { ...item, progress: next };
    }),
  );

export const complete = (
  state: UploadQueue,
  id: string,
  token: number,
): UploadQueue =>
  withItems(
    state,
    Arr.map(state.items, (item) =>
      item.id === id && item.token === token && item.status === "uploading"
        ? { ...item, status: "done", progress: 1 }
        : item,
    ),
  );

export const fail = (
  state: UploadQueue,
  id: string,
  token: number,
): UploadQueue =>
  withItems(
    state,
    Arr.map(state.items, (item) =>
      item.id === id && item.token === token && item.status === "uploading"
        ? { ...item, status: "error" }
        : item,
    ),
  );

export const remove = (state: UploadQueue, id: string): UploadQueue =>
  withItems(
    state,
    Arr.filter(state.items, (item) => item.id !== id),
  );
