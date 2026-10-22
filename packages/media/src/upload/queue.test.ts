/**
 * The upload queue: the state machine the `FileUpload` component runs on.
 *
 * The three rules this suite guards are the ones a transfer can break silently:
 * a retry must not reopen a finished or in-flight file, progress must never
 * paint backwards, and a remove must cancel the removed file's token so a late
 * report cannot resurrect it. Each rule carries a negative control that the
 * opposite behaviour would trip.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  complete,
  emptyQueue,
  enqueue,
  fail,
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
});
