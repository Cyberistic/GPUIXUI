/**
 * The upload queue: a pure state machine over a list of files.
 *
 * The component owns only this and the `upload` wiring; the transfer itself is
 * the caller's. A file moves `idle → uploading → done | error`, and `retry` (a
 * second `start`) moves an errored file back to `uploading` under a fresh
 * `token`. The token is the cancellation channel: a remove drops the item, so
 * every later report for the removed item's token is a no-op, and a report with
 * a stale token (a previous attempt) never overwrites the current one.
 *
 * Progress is monotonic and clamped to `0…1`: a late or out-of-order report
 * cannot paint the bar backwards.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** A file's lifecycle within the queue. */
export type UploadStatus = "idle" | "uploading" | "done" | "error";

/** A file the caller wants uploaded. The id is its stable identity. */
export interface UploadFile {
  readonly id: string;
  readonly name: string;
}

/** A file the queue is tracking, with its lifecycle and progress. */
export interface UploadItem {
  readonly id: string;
  readonly name: string;
  readonly status: UploadStatus;
  /** Fraction `0…1`. */
  readonly progress: number;
  /** The attempt counter; `0` before the first start, `1, 2, …` after each. */
  readonly token: number;
}

/** The queue: one item per file, in the order the files were added. */
export type UploadQueue = ReadonlyArray<UploadItem>;

export const emptyQueue: UploadQueue = [];

const has = (state: UploadQueue, id: string): boolean =>
  Arr.some(state, (item) => item.id === id);

/** Add idle items for the files whose id is not already in the queue. */
export const enqueue = (
  state: UploadQueue,
  files: ReadonlyArray<UploadFile>,
): UploadQueue =>
  Arr.reduce(files, state, (queue, file) =>
    has(queue, file.id)
      ? queue
      : Arr.append(queue, {
          id: file.id,
          name: file.name,
          status: "idle",
          progress: 0,
          token: 0,
        }),
  );

/** The tracked file, when its id is in the queue. */
export const findItem = (
  state: UploadQueue,
  id: string,
): Option.Option<UploadItem> => Arr.findFirst(state, (item) => item.id === id);

/**
 * Start (or retry) a file. An idle file starts and an errored file retries,
 * each under a fresh token and a reset progress; an uploading or done file is
 * left alone, so a start can never interrupt a transfer or reopen a finished
 * one.
 */
export const start = (state: UploadQueue, id: string): UploadQueue =>
  Arr.map(state, (item) =>
    item.id === id && (item.status === "idle" || item.status === "error")
      ? { ...item, status: "uploading", progress: 0, token: item.token + 1 }
      : item,
  );

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Report progress for a file's current attempt. A report whose token is not the
 * item's current token (a removed file or a superseded attempt) is ignored, and
 * progress only ever advances: a value at or below the item's current progress
 * changes nothing.
 */
export const reportProgress = (
  state: UploadQueue,
  id: string,
  token: number,
  progress: number,
): UploadQueue =>
  Arr.map(state, (item) => {
    if (item.id !== id || item.token !== token || item.status !== "uploading") {
      return item;
    }
    const next = clamp01(progress);
    return Number.isNaN(next) || next <= item.progress
      ? item
      : { ...item, progress: next };
  });

/** Mark a file's current attempt done. */
export const complete = (
  state: UploadQueue,
  id: string,
  token: number,
): UploadQueue =>
  Arr.map(state, (item) =>
    item.id === id && item.token === token && item.status === "uploading"
      ? { ...item, status: "done", progress: 1 }
      : item,
  );

/** Mark a file's current attempt failed, leaving it ready to retry. */
export const fail = (
  state: UploadQueue,
  id: string,
  token: number,
): UploadQueue =>
  Arr.map(state, (item) =>
    item.id === id && item.token === token && item.status === "uploading"
      ? { ...item, status: "error" }
      : item,
  );

/** Drop a file, cancelling its attempt: later reports for its token do nothing. */
export const remove = (state: UploadQueue, id: string): UploadQueue =>
  Arr.filter(state, (item) => item.id !== id);
