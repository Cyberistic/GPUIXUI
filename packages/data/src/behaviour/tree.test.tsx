/**
 * The tree in the real GPUix renderer, mounted through the shipped example.
 *
 * The bugs these guard are the ones the window probes found and a pure reducer
 * cannot see:
 *
 * - a nested row that does not inset, so the hierarchy reads as a flat list;
 * - an arrow key that moves the cursor without moving native focus, so the next
 *   key goes to the row the reader left;
 * - a press on a folder that reports the row but never opens it;
 * - Left closing a branch and leaving it in the same press, which loses the
 *   reader's place;
 * - a reveal that moves the cursor without opening the path to it, so the row
 *   it names is not painted.
 */

import { afterEach, describe, expect, it } from "vitest";
import { darkTheme } from "@gpuixui/tokens";
import * as Option from "effect/Option";
import { TreeExample } from "../../examples/tree.example.js";
import {
  clickCentreOf,
  focusedTestId,
  pressKey,
  requireBounds,
  requireStyle,
} from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import { TREE_INDENT } from "../tree/logic.js";

let root: DataTestRoot | undefined;

/** Mount the example; `afterEach` tears it down even when an assertion fails. */
const mount = (): DataTestRoot => {
  root = renderData(<TreeExample />);
  settle(root);
  return root;
};

const readout = (root: DataTestRoot): string =>
  root.renderer.getAllText().join(" ");

afterEach(() => {
  root?.unmount();
  root = undefined;
});

describe("the file tree", () => {
  it("opens the folder a press lands on, and reports the row", () => {
    const root = mount();

    // `src` starts open, so its two children paint and `docs` stays shut.
    expect(readout(root)).toContain("5 rows · active=src");
    expect(root.renderer.findByTestId("tree-row-readme.md")).toBeUndefined();

    clickCentreOf(root, "tree-row-docs");
    root.renderer.flush();

    expect(readout(root)).toContain("7 rows · active=docs");
    expect(root.renderer.findByTestId("tree-row-readme.md")).toBeDefined();
  });

  it("insets a child row one step under its parent", () => {
    const root = mount();

    // `src` starts open and `components` shut, so open it to paint the
    // grandchild the second step is measured on.
    clickCentreOf(root, "tree-row-components");
    root.renderer.flush();

    const parent = requireBounds(root, "tree-row-src-slot");
    const child = requireBounds(root, "tree-row-components-slot");
    const grandchild = requireBounds(root, "tree-row-table-slot");

    // The chevron slot is the row's own inset, so a child starts one step in
    // and a grandchild two — the measured 16px per level.
    expect(child.x - parent.x).toBe(TREE_INDENT);
    expect(grandchild.x - parent.x).toBe(TREE_INDENT * 2);
  });

  it("walks the rows with the arrow keys and moves native focus with them", () => {
    const root = mount();

    pressKey(root, "tree-row-src", "down");
    root.renderer.flush();

    // The cursor moved…
    expect(readout(root)).toContain("active=components");
    // …and so did the platform focus, which is what the next key needs.
    expect(focusedTestId(root)).toEqual(Option.some("tree-row-components"));
  });

  it("opens a branch on Right and closes it on Left, keeping the row", () => {
    const root = mount();

    // `components` is closed under an open `src`: Right opens it…
    pressKey(root, "tree-row-src", "right");
    pressKey(root, "tree-row-components", "right");
    root.renderer.flush();
    expect(root.renderer.findByTestId("tree-row-button.tsx")).toBeDefined();

    // …and Left closes it without leaving the row.
    pressKey(root, "tree-row-components", "left");
    root.renderer.flush();
    expect(readout(root)).toContain("active=components");
    expect(root.renderer.findByTestId("tree-row-button.tsx")).toBeUndefined();
  });

  it("paints the active row in the selection pair", () => {
    const root = mount();

    pressKey(root, "tree-row-src", "down");
    root.renderer.flush();

    expect(requireStyle(root, "tree-row-components").backgroundColor).toBe(
      darkTheme.colors.selected,
    );
    expect(requireStyle(root, "tree-row-src").backgroundColor).not.toBe(
      darkTheme.colors.selected,
    );
  });

  it("moves the cursor to the row a typed prefix names", () => {
    const root = mount();

    clickCentreOf(root, "tree-expand");
    root.renderer.flush();

    pressKey(root, "tree-row-src", "r");
    root.renderer.flush();

    // `row.tsx` is the first row after `src` that starts with `r`.
    expect(readout(root)).toContain("active=row.tsx");
    expect(focusedTestId(root)).toEqual(Option.some("tree-row-row.tsx"));
  });

  it("reveals a deep row by opening the path to it", () => {
    const root = mount();

    // `row.tsx` is two closed folders deep when the reveal runs.
    clickCentreOf(root, "tree-reveal");
    root.renderer.flush();

    expect(readout(root)).toContain("active=row.tsx");
    expect(root.renderer.findByTestId("tree-row-row.tsx")).toBeDefined();
    // The reveal is the caller's move, not the tree's key handler: the focus
    // follows the committed cursor, so a search hit or a "show this file"
    // command leaves the reader on the row it revealed.
    expect(focusedTestId(root)).toEqual(Option.some("tree-row-row.tsx"));
  });
});
