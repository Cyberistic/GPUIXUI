import {
  flattenTree,
  treeCursorMove,
  treeName,
  typeAheadRow,
  type TreeCursor,
} from "@gpuixui/data/tree/logic";
import { createWindowCalculator } from "@gpuixui/data/virtual/window";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DEPENDENCY_TREE,
  DependencyTreeDemo,
  OPEN_ACTIVE,
  OPEN_BRANCHES,
  VIRTUAL_TREE_OVERDRAW,
  VIRTUAL_TREE_ROW_HEIGHT,
  VirtualTreeDemo,
  dependencyLabel,
  dependencyRows,
  dependencySpec,
  revealOffsetFor,
  rowId,
  treeMountedRows,
  treeOffset,
  treeReadout,
  treeVisibleRows,
  treeWindowReadout,
  virtualTreeExpanded,
  virtualTreeRows,
  virtualTreeSpecFor,
  withActive,
} from "./tree-demo";
import { treeKeyOf } from "./tree-keys";

/**
 * The two tree previews.
 *
 * `packages/data/docs/tree-view.mdx` and `virtual-tree.mdx` are the package's
 * Markdown, so the site mounts both drawings from `package-preview.ts`. The
 * registry's guard sees that each demo exists and is mounted; what it cannot
 * see is whether a drawing still runs the package's rules. These cases hold the
 * rows to `flattenTree`, the cursor to `treeCursorMove`, the typed prefix to
 * `typeAheadRow` and the window to `createWindowCalculator`.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const openCursor = (): TreeCursor => ({
  expanded: HashSet.fromIterable(OPEN_BRANCHES),
  active: Option.some(OPEN_ACTIVE),
});

const markup = (node: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(node);

describe("the TreeView preview", () => {
  it("flattens the graph with the package's walk, and paints only open rows", () => {
    const cursor = openCursor();
    const rows = dependencyRows(DEPENDENCY_TREE, cursor);

    // The drawing's rows are the package's flattening, not a second walk.
    expect(rows).toEqual(
      flattenTree(DEPENDENCY_TREE, dependencySpec, cursor.expanded),
    );
    expect(rows.length).toBe(11);
    expect(
      markup(<DependencyTreeDemo />).match(/role="treeitem"/g),
    ).toHaveLength(rows.length);

    // A closed branch's children are absent from the drawing, not hidden.
    const closed = dependencyRows(DEPENDENCY_TREE, {
      expanded: HashSet.empty(),
      active: Option.none(),
    });
    expect(closed.length).toBe(2);
    expect(markup(<DependencyTreeDemo />)).toContain("fumadocs-ui");
  });

  it("moves the cursor with the package's key rule", () => {
    const rows = dependencyRows(DEPENDENCY_TREE, openCursor());
    const cursor = openCursor();

    expect(Option.getOrNull(treeCursorMove(rows, cursor, "down").active)).toBe(
      "docs/components/tw",
    );
    // Right on an open branch steps into its first child; Left closes it.
    expect(
      Option.getOrNull(
        treeCursorMove(rows, withActive(cursor, "docs/components"), "right")
          .active,
      ),
    ).toBe("docs/components/primitives");
    expect(
      Option.getOrNull(
        treeCursorMove(rows, withActive(cursor, "docs/components"), "left")
          .active,
      ),
    ).toBe("docs/components");
    expect(
      HashSet.has(
        treeCursorMove(rows, withActive(cursor, "docs/components"), "left")
          .expanded,
        "docs/components",
      ),
    ).toBe(false);
    // A leaf's Enter moves nowhere: there is no branch under it to flip.
    expect(
      Option.getOrNull(
        treeCursorMove(rows, withActive(cursor, "docs/effect"), "enter").active,
      ),
    ).toBe("docs/effect");
    expect(treeCursorMove(rows, cursor, "end").active).toEqual(
      Option.some("playground"),
    );
  });

  it("moves to the next row a typed prefix names, through the package", () => {
    const rows = dependencyRows(DEPENDENCY_TREE, openCursor());
    const cursor = openCursor();

    expect(
      Option.getOrNull(
        typeAheadRow(rows, cursor.active, "f", (row) =>
          dependencyLabel(row.node),
        ),
      ),
    ).toBe("docs/fumadocs");
    // A prefix nothing carries answers `None`, so the cursor stays put.
    expect(
      Option.isNone(
        typeAheadRow(rows, cursor.active, "zzz", (row) =>
          dependencyLabel(row.node),
        ),
      ),
    ).toBe(true);
    expect(Option.getOrNull(treeKeyOf("ArrowDown"))).toBe("down");
    expect(Option.getOrNull(treeKeyOf(" "))).toBe("space");
    expect(Option.isNone(treeKeyOf("PageDown"))).toBe(true);
  });

  it("paints one treeitem per row, names the active one and its depth", () => {
    const html = markup(<DependencyTreeDemo />);

    expect(rowId(OPEN_ACTIVE)).toBe("gx-tree-docs-components-tokens");
    expect(html).toContain(
      'aria-activedescendant="gx-tree-docs-components-tokens"',
    );
    expect(html).toContain('id="gx-tree-docs-components-tokens"');
    expect(html).toContain('aria-level="2"');
    expect(html).toContain('aria-level="3"');
    // The version is the node's own, not a label the drawing invented.
    expect(html).toContain("15.8.5");
    expect(html).toContain("4.0.0");
    // A blank label paints the row's key, the package's own rule.
    expect(treeName("", "docs/effect")).toBe("docs/effect");
  });

  it("reports the rows, the open branches and the row it stands on", () => {
    const cursor = openCursor();
    const rows = dependencyRows(DEPENDENCY_TREE, cursor);

    expect(treeReadout(rows, cursor)).toBe(
      "11 rows · 3 open · @gpuixui/tokens",
    );
    expect(treeReadout(rows, { ...cursor, active: Option.none() })).toBe(
      "11 rows · 3 open · no active row",
    );
  });
});

describe("the VirtualTree preview", () => {
  const count = virtualTreeRows.length;

  it("holds the whole graph while the package's window mounts a slice", () => {
    expect(count).toBe(1884);
    // A registry-sized set: the page's subject is thousands of rows.
    expect(count).toBeGreaterThan(1500);
    const mounted = treeMountedRows(count, 0);
    const calculator = createWindowCalculator(virtualTreeSpecFor(count));
    expect(mounted).toEqual(calculator.indicesAt(0));
    // A non-zero offset is the case a fixed slice would still pass at the top.
    expect(treeMountedRows(count, 900)).toEqual(calculator.indicesAt(900));
    expect(treeVisibleRows(count, 900)).toEqual({ start: 20, end: 35 });
    expect(mounted.length).toBeLessThan(100);
    // The whole set is what the tree holds; only the window is mounted.
    expect(virtualTreeRows.length).toBeGreaterThan(mounted.length * 10);
    expect(VIRTUAL_TREE_ROW_HEIGHT).toBe(37);
  });

  it("clamps an offset into the rows it holds and reveals the last row", () => {
    const last = count - 1;
    const revealed = revealOffsetFor(count, last);

    expect(treeOffset(count, -40)).toBe(0);
    expect(treeOffset(count, 1e9)).toBe(revealed);
    expect(Arr.contains(treeMountedRows(count, revealed), last)).toBe(true);
    // The window at the top of the set: seven rows in view, four either side.
    expect(treeWindowReadout(count, 0)).toBe(`1–11 of 1884 · 11 mounted`);
    expect(treeVisibleRows(count, 0)).toEqual({ start: 0, end: 11 });
    // The overdraw the page prints is the package's default.
    expect(VIRTUAL_TREE_OVERDRAW).toBe(4);
    expect(HashSet.size(virtualTreeExpanded)).toBeGreaterThan(100);
  });

  it("mounts the rows the readout names, and nothing else", () => {
    const html = markup(<VirtualTreeDemo />);
    const mounted = treeMountedRows(count, 0);

    expect(html.match(/role="treeitem"/g)).toHaveLength(mounted.length);
    expect(html).toContain('id="gx-vtree-registry-01"');
    // The first mounted row sits at the top of the window; the next is one row
    // height below it, which is the package's step.
    expect(html).toContain("top:0");
    expect(html).toContain(`top:${String(VIRTUAL_TREE_ROW_HEIGHT)}px`);
  });
});

describe("the tree drawings run the package's rules", () => {
  it("reads the package's controller, arithmetic and key rule", () => {
    const source = read("apps/docs/src/components/docs/tree-demo.tsx");

    expect(source).toContain('from "@gpuixui/data/tree/use-expanded"');
    expect(source).toContain('from "@gpuixui/data/tree/logic"');
    expect(source).toContain('from "@gpuixui/data/virtual/window"');
    expect(source).toContain("flattenTree");
    expect(source).toContain("treeCursorMove");
    expect(source).toContain("typeAheadRow");
    expect(source).toContain("createWindowCalculator");
    expect(source).toContain("useExpandedRows");
    // A second copy of the walk, the order or the window would show up as the
    // shape it re-implements.
    expect(source).not.toContain("split(");
    expect(source.match(/\.sort\(/g) ?? []).toHaveLength(
      source.match(/Arr\.sort\(/g)?.length ?? 0,
    );
  });
});
