/**
 * `FileUpload` — the queue view: retry only for an errored file, remove for all.
 *
 * The state machine itself lives in `upload/queue.ts` (tested there); this suite
 * guards the *view's* decision: an errored row offers a retry that reaches the
 * caller, a done row offers none (the negative control), and the remove action
 * reaches the caller for every row.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { lightTheme } from "@gpuixui/tokens";
import { renderFileUpload } from "./file-upload.js";
import type { UploadItem } from "./upload/queue.js";
import { elementHandler, findByTestId, expectSome } from "./testing/element.js";

const noop = (): void => undefined;

const item = (partial: Partial<UploadItem>): UploadItem => ({
  id: "a",
  name: "a.txt",
  status: "idle",
  progress: 0,
  token: 0,
  ...partial,
});

const render = (
  items: ReadonlyArray<UploadItem>,
  actions: {
    readonly onRetry: (id: string) => void;
    readonly onRemove: (id: string) => void;
  },
) =>
  renderFileUpload(
    { upload: async () => undefined, files: [] },
    lightTheme,
    items,
    actions,
  );

describe("FileUpload", () => {
  it("offers retry for an errored file and routes it to the caller", () => {
    const retried: string[] = [];
    const root = render([item({ status: "error", token: 1 })], {
      onRetry: (id) => retried.push(id),
      onRemove: noop,
    });
    const retry = expectSome(findByTestId(root, "upload-retry-a"));
    expectSome(elementHandler(retry, "onActivate"))({});
    expect(retried).toStrictEqual(["a"]);
  });

  it("offers no retry for a done file", () => {
    const root = render([item({ status: "done", progress: 1, token: 1 })], {
      onRetry: noop,
      onRemove: noop,
    });
    expect(Option.isNone(findByTestId(root, "upload-retry-a"))).toBe(true);
  });

  it("routes the remove action to the caller for a finished file", () => {
    const removed: string[] = [];
    const root = render([item({ status: "done", progress: 1, token: 1 })], {
      onRetry: noop,
      onRemove: (id) => removed.push(id),
    });
    const remove = expectSome(findByTestId(root, "upload-remove-a"));
    expectSome(elementHandler(remove, "onActivate"))({});
    expect(removed).toStrictEqual(["a"]);
  });
});
