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

interface Root {
  readonly renderer: ReturnType<typeof createTestRoot>["renderer"];
  readonly unmount: () => void;
}

let current: Root | undefined;

const render = (upload: UploadFunction): Root => {
  const root = createTestRoot({ width: 700, height: 400 });
  root.render(
    <ThemeProvider theme={lightTheme}>
      <FileUpload
        upload={upload}
        files={[{ id: "notes.txt", name: "notes.txt" }]}
        label="Uploads"
      />
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
});
