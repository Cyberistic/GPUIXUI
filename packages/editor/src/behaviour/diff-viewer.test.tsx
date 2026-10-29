/**
 * DiffViewer behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: split mode stacked a removed line and its replacement on
 * two rows — the removed line above a blank right half, then a blank left half
 * above the added line — although a side-by-side diff exists to put them on one
 * row; its cells sized themselves by content, so the two columns were unequal
 * and the right one was clipped; and the two views used different row heights,
 * so switching modes moved every row. The logic suite pins the pairing; these
 * cases read it back off the painted tree, so the component cannot stop using it.
 */

import { createTestRoot } from "@gpuix/react/testing";
import { darkTheme, textStyle } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { DiffViewer } from "../diff/diff-viewer.js";
import type { DiffMode } from "../diff/logic.js";

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
    expect(rowText(root, "diff-viewer-row-1-before")).toEqual(["2", "beta"]);
    expect(rowText(root, "diff-viewer-row-1-after")).toEqual(["2", "BETA"]);
    // Three rows, not four: the removal and the addition are not stacked, so
    // the trailing context row sits at index 2 and nothing follows it.
    expect(
      root.renderer.findByTestId("diff-viewer-row-3-before"),
    ).toBeUndefined();
  });

  it("gives the two columns equal widths and a visible divider", () => {
    // The bug guarded: each cell asked for an equal share but sized itself by
    // its line first, so a long left line pushed the right column past the
    // sheet's edge and its code was clipped, with no divider between them.
    const root = render(
      <DiffViewer
        before={"a very long removed line that would push its column wide"}
        after={"short"}
        mode="split"
      />,
    );
    const before = root.renderer.findByTestId("diff-viewer-before");
    const after = root.renderer.findByTestId("diff-viewer-after");
    expect(before?.style.flexGrow).toBe(1);
    expect(after?.style.flexGrow).toBe(1);
    expect(before?.style.minWidth).toBe(0);
    expect(after?.style.minWidth).toBe(0);
    expect(before?.style.overflowX).toBe("scroll");
    expect(after?.style.overflowX).toBe("scroll");
    const divider = root.renderer.findByTestId("diff-viewer-divider");
    expect(divider?.style.width).toBe(darkTheme.borderWidth.thin);
    expect(divider?.style.backgroundColor).toBe(darkTheme.colors.border);
  });

  it("holds both sides of a row on one height, and both views on that height", () => {
    // The bug guarded: unified rows were code height while split rows sized to
    // their content, so switching modes moved every row below the change.
    const root = render(
      <DiffViewer
        before={"alpha\nbeta\ngamma"}
        after={"alpha\nBETA\ngamma"}
        mode="split"
      />,
    );
    const lineHeight = textStyle(darkTheme, "codeBlock").lineHeight;
    const left = root.renderer.findByTestId("diff-viewer-row-1-before");
    const right = root.renderer.findByTestId("diff-viewer-row-1-after");
    expect(left?.style.height).toBe(lineHeight);
    expect(right?.style.height).toBe(lineHeight);
    root.unmount();

    const merged = render(
      <DiffViewer before={"alpha\nbeta\ngamma"} after={"alpha\nBETA\ngamma"} />,
    );
    expect(
      merged.renderer.findByTestId("diff-viewer-row-1")?.style.height,
    ).toBe(lineHeight);
  });

  it("paints a hunk heading once across both columns", () => {
    const before = Array.from({ length: 12 }, (_, index) =>
      String(index + 1).padStart(2, "0"),
    );
    const after = before.map((line) =>
      line === "02" ? "02 changed" : line === "11" ? "11 changed" : line,
    );
    const root = render(
      <DiffViewer
        before={before.join("\n")}
        after={after.join("\n")}
        mode="split"
        contextLines={1}
      />,
    );
    // The heading is a row of its own, so it is painted once; the side rows
    // below it line up because the heading is outside the two columns.
    expect(rowText(root, "diff-viewer-hunk-0")).toEqual(["@@ -1,3 +1,3 @@"]);
    expect(rowText(root, "diff-viewer-row-1-before")).toEqual(["2", "02"]);
    expect(rowText(root, "diff-viewer-row-1-after")).toEqual([
      "2",
      "02 changed",
    ]);
  });

  it("names the surface when the stored label is blank", () => {
    // The bug guarded: the rows are presentational, so the group's name is the
    // whole surface's name — a blank label published a silent diff, while a
    // default covers only `undefined`.
    const root = render(
      <DiffViewer before={"alpha"} after={"beta"} label="   " />,
    );
    expect(
      root.renderer.findByTestId("diff-viewer")?.customProps?.["aria-label"],
    ).toBe("Diff");
    root.unmount();

    // A saved record writes the field it kept, and a label that is not text is
    // no name at all: it reads as the same default instead of throwing
    // `self.trim is not a function` out of `accessibleName`.
    const stored = render(
      <DiffViewer
        before={"alpha"}
        after={"beta"}
        label={42 as unknown as string}
      />,
    );
    expect(
      stored.renderer.findByTestId("diff-viewer")?.customProps?.["aria-label"],
    ).toBe("Diff");
    stored.unmount();
  });

  it("reads a side that carried no document as an empty source", () => {
    // The bug guarded: `before` and `after` were split as strings, so a diff
    // restored from a saved record whose side carried no document (`null`)
    // threw out of `splitLines` before a row painted, while every sibling
    // surface reads a stored draft through `draftOf`.
    const root = render(
      <DiffViewer
        before={null as unknown as string}
        after={"beta"}
        lineNumbers={false}
      />,
    );
    expect(rowText(root, "diff-viewer-row-0")).toEqual(["+", "beta"]);
    root.unmount();
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
    expect(rowText(root, "diff-viewer-row-1-after")).toEqual(["beta"]);
    expect(
      root.renderer.findByTestId("diff-viewer-row-2-after"),
    ).toBeUndefined();
  });

  it("paints the default layout for a stored mode name it does not declare", () => {
    // The bug guarded: `mode` was compared with `=== "unified"`, so every other
    // value — a preference saved by an older release, a typo, a record
    // restored with `"inline"` — fell through to the split layout and painted
    // two columns on a reader who asked for one. The name is read at the
    // boundary now, so the unified script keeps its four rows.
    const root = render(
      <DiffViewer
        before={"alpha\nbeta\ngamma"}
        after={"alpha\nBETA\ngamma"}
        mode={"inline" as unknown as DiffMode}
      />,
    );
    expect(rowText(root, "diff-viewer-row-1")).toEqual(["-", "2", "beta"]);
    expect(rowText(root, "diff-viewer-row-3")).toEqual([
      " ",
      "3",
      "3",
      "gamma",
    ]);
    root.unmount();
  });
});
