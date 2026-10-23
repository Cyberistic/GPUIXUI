/**
 * `FileUpload` — the queue view: retry only for an errored file, remove for all.
 *
 * The state machine itself lives in `upload/queue.ts` (tested there); this suite
 * guards the *view's* decision: an errored row offers a retry that reaches the
 * caller, a done row offers none (the negative control), and the remove action
 * reaches the caller for every row. A blank label also reads as its documented
 * default — the group, the empty state and both actions keep a name a copy
 * table's empty string would have erased.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { lightTheme } from "@gpuixui/tokens";
import { renderFileUpload } from "./file-upload.js";
import { emptyQueue, enqueue, type UploadItem } from "./upload/queue.js";
import {
  elementChildren,
  elementHandler,
  elementProp,
  findByTestId,
  expectSome,
  hostTag,
} from "./testing/element.js";

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

  it("names a row by its id when the stored file name is blank", () => {
    // The bug guarded: a file record restored without a name reached the row
    // and its remove action as `null`, so the action published "Remove null"
    // and the row painted no name. The queue names such a file by its id.
    const named = enqueue(emptyQueue, [
      { id: "notes.txt", name: null as unknown as string },
    ]).items;
    const root = render(named, { onRetry: noop, onRemove: noop });
    expect(
      expectSome(
        elementProp(
          expectSome(findByTestId(root, "upload-remove-notes.txt")),
          "label",
        ),
      ),
    ).toBe("Remove notes.txt");
  });

  it("reads a blank name as the documented default, never an unnamed row", () => {
    // A label table is copy as often as a literal: an empty string reached
    // `aria-label` and the action names, so the group, the empty state, the
    // retry and the remove said nothing while their defaults sat unused.
    const errored = renderFileUpload(
      {
        upload: async () => undefined,
        files: [],
        label: "",
        retryLabel: "",
        removeLabel: "",
      },
      lightTheme,
      [item({ status: "error", token: 1 })],
      { onRetry: noop, onRemove: noop },
    );
    expect(expectSome(elementProp(errored, "aria-label"))).toBe("Upload files");
    expect(
      expectSome(
        elementProp(
          expectSome(findByTestId(errored, "upload-retry-a")),
          "children",
        ),
      ),
    ).toBe("Retry");
    expect(
      expectSome(
        elementProp(
          expectSome(findByTestId(errored, "upload-remove-a")),
          "label",
        ),
      ),
    ).toBe("Remove a.txt");

    const empty = renderFileUpload(
      { upload: async () => undefined, files: [], emptyLabel: "   " },
      lightTheme,
      [],
      { onRetry: noop, onRemove: noop },
    );
    const text = expectSome(
      Arr.findFirst(
        elementChildren(empty),
        (child) => Option.getOrElse(hostTag(child), () => "") === "text",
      ),
    );
    expect(expectSome(elementProp(text, "children"))).toBe("No files");
  });
});
