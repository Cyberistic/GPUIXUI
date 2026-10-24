/**
 * The upload queue: the state machine the `FileUpload` component runs on.
 *
 * The four rules this suite guards are the ones a transfer can break silently:
 * a retry must not reopen a finished or in-flight file, progress must never
 * paint backwards, a remove must cancel the removed file's token so a late
 * report cannot resurrect it, and that token must stay cancelled when the same
 * id is re-added (the counter outlives the item, so a re-upload gets a fresh
 * attempt rather than the removed transfer's number). Each rule carries a
 * negative control that the opposite behaviour would trip.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  complete,
  emptyQueue,
  enqueue,
  fail,
  filesOf,
  findItem,
  remove,
  reportProgress,
  start,
  type UploadQueue,
  type UploadStatus,
} from "./queue.js";

const file = (id: string) => ({ id, name: `${id}.txt` });

const statusOf = (
  state: UploadQueue,
  id: string,
): Option.Option<UploadStatus> =>
  Option.map(findItem(state, id), (item) => item.status);

const tokenOf = (state: UploadQueue, id: string): Option.Option<number> =>
  Option.map(findItem(state, id), (item) => item.token);

const progressOf = (state: UploadQueue, id: string): Option.Option<number> =>
  Option.map(findItem(state, id), (item) => item.progress);

const uploading = (id: string): UploadQueue =>
  start(enqueue(emptyQueue, [file(id)]), id);

describe("upload queue", () => {
  it("reads a stored file list structurally, keeping only files with an id", () => {
    // The bug guarded: the component's effect read the caller's list directly,
    // so a saved queue's `null` reached `Arr.some`/`Arr.reduce` and threw out of
    // the effect that seeds the queue, taking the surface down; and an entry a
    // record wrote without a text id queued a row no remove action could name.
    expect(filesOf(null)).toEqual([]);
    expect(filesOf({ id: "notes.txt" })).toEqual([]);
    expect(filesOf([{ id: "notes.txt" }])).toEqual([
      { id: "notes.txt", name: "notes.txt" },
    ]);
    expect(
      filesOf([{ id: "" }, { id: 4 }, { id: "b.txt", name: "  b.txt  " }]),
    ).toEqual([{ id: "b.txt", name: "  b.txt  " }]);
  });

  it("names a file by its id when the stored name is blank", () => {
    // The bug guarded: a file record restored with no name reached the row and
    // its remove action, which published "Remove null" and painted a nameless
    // row, while every other label is read through the absence rule.
    const named = enqueue(emptyQueue, [
      { id: "notes.txt", name: null as unknown as string },
      { id: "b", name: "   " },
      { id: "c.txt", name: "  c.txt  " },
    ]);
    const nameOf = (id: string) =>
      Option.map(findItem(named, id), (item) => item.name);
    expect(nameOf("notes.txt")).toStrictEqual(Option.some("notes.txt"));
    expect(nameOf("b")).toStrictEqual(Option.some("b"));
    expect(nameOf("c.txt")).toStrictEqual(Option.some("c.txt"));
  });

  it("retries an errored file under a fresh token", () => {
    const errored = fail(uploading("a"), "a", 1);
    const retried = start(errored, "a");
    expect(statusOf(retried, "a")).toStrictEqual(Option.some("uploading"));
    expect(tokenOf(retried, "a")).toStrictEqual(Option.some(2));
  });

  it("does not retry a done file", () => {
    const done = complete(uploading("a"), "a", 1);
    expect(statusOf(start(done, "a"), "a")).toStrictEqual(Option.some("done"));
  });

  it("does not restart a file already uploading", () => {
    expect(tokenOf(start(uploading("a"), "a"), "a")).toStrictEqual(
      Option.some(1),
    );
  });

  it("never lets progress decrease", () => {
    const at50 = reportProgress(uploading("a"), "a", 1, 0.5);
    const at30 = reportProgress(at50, "a", 1, 0.3);
    expect(progressOf(at30, "a")).toStrictEqual(Option.some(0.5));
    expect(progressOf(reportProgress(at30, "a", 1, 0.8), "a")).toStrictEqual(
      Option.some(0.8),
    );
  });

  it("clamps progress into 0..1", () => {
    expect(
      progressOf(reportProgress(uploading("a"), "a", 1, 1.5), "a"),
    ).toStrictEqual(Option.some(1));
    expect(
      progressOf(reportProgress(uploading("a"), "a", 1, -0.5), "a"),
    ).toStrictEqual(Option.some(0));
  });

  it("ignores a stale token from a superseded attempt", () => {
    const retried = start(fail(uploading("a"), "a", 1), "a"); // token 2
    expect(progressOf(reportProgress(retried, "a", 1, 0.9), "a")).toStrictEqual(
      Option.some(0),
    );
  });

  it("cancels an uploading file's token when it is removed", () => {
    const removed = remove(uploading("a"), "a");
    expect(findItem(removed, "a")).toStrictEqual(Option.none());
    expect(reportProgress(removed, "a", 1, 0.9)).toStrictEqual(removed);
    expect(complete(removed, "a", 1)).toStrictEqual(removed);
  });

  it("does not let a removed transfer finish the same id re-added", () => {
    const removed = remove(uploading("a"), "a"); // attempt 1, still counting
    const readded = start(enqueue(removed, [file("a")]), "a");

    expect(tokenOf(readded, "a")).toStrictEqual(Option.some(2));
    expect(complete(readded, "a", 1)).toStrictEqual(readded);
    expect(progressOf(reportProgress(readded, "a", 1, 0.9), "a")).toStrictEqual(
      Option.some(0),
    );
    expect(statusOf(readded, "a")).toStrictEqual(Option.some("uploading"));
  });
});
