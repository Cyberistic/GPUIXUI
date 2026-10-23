/**
 * DiffViewer behaviour, in the real GPUix renderer.
 *
 * The bug these guard: split mode stacked a removed line and its replacement on
 * two rows — the removed line above a blank right half, then a blank left half
 * above the added line — although a side-by-side diff exists to put them on one
 * row. The logic suite pins the pairing; these cases read it back off the
 * painted tree, so the component cannot stop using it.
 */

import { createTestRoot } from "@gpuix/react/testing";
import { darkTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { DiffViewer } from "../diff/diff-viewer.js";

interface Root {
  readonly renderer: ReturnType<typeof createTestRoot>["renderer"];
  readonly unmount: () => void;
}

let current: Root | undefined;

const render = (node: ReactNode): Root => {
  const root = createTestRoot({ width: 900, height: 500 });
  root.render(<ThemeProvider theme={darkTheme}>{node}</ThemeProvider>);
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

/** Every string painted inside one row, in tree order. */
const rowText = (root: Root, testId: string): ReadonlyArray<string> => {
  const row = root.renderer.findByTestId(testId);
  if (row === undefined) return [];
  const found: Array<string> = [];
  const walk = (id: number): void => {
    const element = root.renderer.getElement(id);
    if (element === undefined) return;
    if (element.type === "text" && element.text !== null) {
      found.push(element.text);
    }
    element.children.forEach(walk);
  };
  walk(row.id);
  return found;
};

describe("DiffViewer in split mode", () => {
  it("puts a changed line and its replacement on one row", () => {
    const root = render(
      <DiffViewer
        before={"alpha\nbeta\ngamma"}
        after={"alpha\nBETA\ngamma"}
        mode="split"
      />,
    );
    // The change is one row: the old line on the left, the new one on the
    // right, each beside its own line number.
    expect(rowText(root, "diff-viewer-row-1")).toEqual([
      "2",
      "beta",
      "2",
      "BETA",
    ]);
    // Three rows, not four: the removal and the addition are not stacked, so
    // the trailing context row sits at index 2 and nothing follows it.
    expect(root.renderer.findByTestId("diff-viewer-row-3")).toBeUndefined();
  });

  it("leaves the side blank when a run only adds lines", () => {
    const root = render(
      <DiffViewer
        before={"alpha"}
        after={"alpha\nbeta"}
        mode="split"
        lineNumbers={false}
      />,
    );
    expect(rowText(root, "diff-viewer-row-1")).toEqual(["beta"]);
    expect(root.renderer.findByTestId("diff-viewer-row-2")).toBeUndefined();
  });
});
