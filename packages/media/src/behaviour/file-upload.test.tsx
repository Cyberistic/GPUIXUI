/**
 * `FileUpload`'s queue wiring, driven through the real GPUix renderer.
 *
 * The bug these guard: a transfer that threw before it returned its promise
 * took the queue down — the throw escaped the effect that starts a file and
 * unmounted the tree — instead of failing the file it was handed, which is the
 * state `error` and its `Retry` action exist for.
 */

import { createTestRoot } from "@gpuix/react/testing";
import { lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { afterEach, describe, expect, it } from "vitest";
import { FileUpload, type UploadFunction } from "../file-upload.js";
import type { UploadFile } from "../upload/queue.js";

interface Root {
  readonly renderer: ReturnType<typeof createTestRoot>["renderer"];
  readonly unmount: () => void;
}

let current: Root | undefined;

const render = (
  upload: UploadFunction,
  files: ReadonlyArray<UploadFile> = [{ id: "notes.txt", name: "notes.txt" }],
): Root => {
  const root = createTestRoot({ width: 700, height: 400 });
  root.render(
    <ThemeProvider theme={lightTheme}>
      <FileUpload upload={upload} files={files} label="Uploads" />
    </ThemeProvider>,
  );
  const mounted: Root = {
    renderer: root.renderer,
    unmount: () => {
      root.unmount();
      current = undefined;
    },
  };
  current = mounted;
  return mounted;
};

afterEach(() => {
  current?.unmount();
});

/** Poll until `ready`, so a report the queue settles in a microtask is seen. */
const waitUntil = async (
  ready: () => boolean,
  attempts = 40,
): Promise<void> => {
  if (ready() || attempts <= 0) return;
  await new Promise((resolve) => {
    setTimeout(resolve, 20);
  });
  return waitUntil(ready, attempts - 1);
};

describe("FileUpload", () => {
  it("fails a file whose transfer threw, and offers its retry", async () => {
    const page = render(() => {
      throw new Error("no upload token");
    });
    await waitUntil(
      () => page.renderer.findByTestId("upload-retry-notes.txt") !== undefined,
    );
    expect(page.renderer.findByTestId("upload-retry-notes.txt")).toBeDefined();
    expect(page.renderer.findByTestId("upload-remove-notes.txt")).toBeDefined();
    page.unmount();
  });

  it("paints the empty queue for a stored file list that is not a list", async () => {
    // The bug this guards: the effect that seeds the queue read `Arr.some` and
    // `Arr.reduce` over the caller's list, so a saved queue's `null` — the field
    // a store writes where it carried nothing — threw out of the effect and
    // unmounted the surface instead of painting the empty state.
    // @ts-expect-error — a list a store wrote as absent.
    const page = render(async () => undefined, null);
    await waitUntil(() => page.renderer.findByText("No files") !== undefined);
    expect(page.renderer.findByText("No files")).toBeDefined();
    page.unmount();
  });
});
