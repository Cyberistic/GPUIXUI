/**
 * A height the layout cannot paint.
 *
 * The bug these guard: a height is often computed — a pane's height, a share
 * of a window, a measurement taken before the first layout — and
 * `@gpuix/native@0.11.0` drops a value it cannot lay out (the style batch is
 * serialised with `JSON.stringify`, so `NaN` and the infinities arrive as
 * `null`). The box then kept the flex settings the style wrote beside it
 * (`flexGrow: 0`, `flexShrink: 0`) and **no basis**, so it collapsed to its
 * content — or to nothing at all.
 *
 * Measured before the fix, on 0.11.0:
 *
 * - a table's row scroller given a `NaN` height painted **37 points** — the one
 *   row it held — instead of the **280** its measured frame gives it, so the
 *   rows below the first overflowed a scroller that could not scroll;
 * - a windowed table given a `NaN` height painted **no row at all**, against
 *   the **8** the same table paints with a readable height; the same held for
 *   the windowed table's body and for the windowed tree;
 * - a tree given a `NaN` height painted **640 points** inside a **200**-point
 *   pane, so it overflowed its pane instead of scrolling inside it.
 *
 * The fix is one rule: a size the layout cannot paint reads as **no size**,
 * the reading the prop already has when it is omitted (`internal/size.ts`).
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { afterEach, describe, expect, it } from "vitest";
import { requireBounds } from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableViewport,
} from "../table/table.js";
import { TreeView } from "../tree/tree-view.js";
import { VirtualTableBody } from "../virtual/table.js";
import type { TreeRow } from "../tree/logic.js";

/** The table's own height: the frame the body is measured against. */
const TABLE_HEIGHT = 320;

/** The pane a tree sits in: the box it must not overflow. */
const PANE_HEIGHT = 200;

/** The rows a tree holds — more than a pane shows. */
const NODES = Arr.map(Arr.range(0, 19), (index) => ({
  id: `node-${index}`,
  label: `node ${index}`,
}));

/** The tree's rows, as the model paints them. */
const TREE_ROWS: ReadonlyArray<TreeRow<{ id: string; label: string }>> =
  Arr.map(NODES, (node) => ({
    node,
    key: node.id,
    depth: 0,
    parent: Option.none(),
    hasChildren: false,
    expanded: false,
  }));

let root: DataTestRoot | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
});

/** Mount a tree, read what it painted, and unmount it. */
const withRoot = <A,>(
  mount: () => DataTestRoot,
  read: (mounted: DataTestRoot) => A,
): A => {
  const mounted = mount();
  root = mounted;
  settle(mounted);
  const answer = read(mounted);
  mounted.unmount();
  root = undefined;
  return answer;
};

/** The rows that reached the frame, by their prefix. */
const paintedRows = (mounted: DataTestRoot, prefix: string): number =>
  mounted.renderer.getPaintedText().filter((line) => line.startsWith(prefix))
    .length;

/** The plain table, with a body height the caller names. */
const PlainTable = ({ height }: { readonly height: number | undefined }) => (
  <Table height={TABLE_HEIGHT} aria-label="Rows">
    <TableViewport>
      <TableHeader>
        <TableRow>
          <TableHeaderCell width={180}>Name</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody height={height} testId="paintable-body">
        <TableRow>
          <TableCell width={180}>
            <text>row-0</text>
          </TableCell>
        </TableRow>
      </TableBody>
    </TableViewport>
  </Table>
);

/** The height the plain table's row scroller paints. */
const bodyHeightFor = (height: number | undefined): number =>
  withRoot(
    () => renderData(<PlainTable height={height} />),
    (mounted) => requireBounds(mounted, "paintable-body").height,
  );

/** The windowed body on its own, inside a bounded table. */
const WindowedBody = ({ height }: { readonly height: number | undefined }) => (
  <Table height={TABLE_HEIGHT} aria-label="Rows">
    <TableHeader>
      <TableRow>
        <TableHeaderCell width={180}>Name</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <VirtualTableBody
      count={50}
      rowHeight={37}
      height={height}
      renderRow={(index) => (
        <TableRow>
          <TableCell width={180}>
            <text>{`row-${index}`}</text>
          </TableCell>
        </TableRow>
      )}
    />
  </Table>
);

/** The rows the windowed body painted. */
const windowedBodyRowsFor = (height: number | undefined): number =>
  withRoot(
    () => renderData(<WindowedBody height={height} />),
    (mounted) => paintedRows(mounted, "row-"),
  );

/** The tree, in a pane it must not overflow. */
const Tree = ({ height }: { readonly height: number | undefined }) => (
  <div
    style={{ display: "flex", flexDirection: "column", height: PANE_HEIGHT }}
  >
    <TreeView
      height={height}
      testId="paintable-tree"
      aria-label="Nodes"
      rows={TREE_ROWS}
      labelOf={(node) => node.label}
    />
  </div>
);

/** The height the tree paints inside its pane. */
const treeHeightFor = (height: number | undefined): number =>
  withRoot(
    () => renderData(<Tree height={height} />),
    (mounted) => requireBounds(mounted, "paintable-tree").height,
  );

describe("a height the layout cannot paint", () => {
  it("keeps the row scroller's measured frame", () => {
    // The frame: the table's own height less its header.
    const measured = bodyHeightFor(undefined);
    expect(measured).toBeGreaterThan(100);

    // Measured before the fix: 37 — the one row the body held — so the rows
    // below the first overflowed a scroller that could not scroll.
    expect(bodyHeightFor(Number.NaN)).toBe(measured);
    expect(bodyHeightFor(Number.POSITIVE_INFINITY)).toBe(measured);
    expect(bodyHeightFor(Number.NEGATIVE_INFINITY)).toBe(measured);
    // A negative height painted nothing at all before the fix (0 points).
    expect(bodyHeightFor(-20)).toBe(measured);
  });

  it("keeps a height the layout can paint", () => {
    // The negative control: a readable height is the caller's, exactly.
    expect(bodyHeightFor(200)).toBe(200);
  });

  it("paints the rows of a windowed table's body", () => {
    const measured = windowedBodyRowsFor(undefined);
    expect(measured).toBeGreaterThan(0);

    // Measured before the fix: no row at all — the body had no bound.
    expect(windowedBodyRowsFor(Number.NaN)).toBe(measured);
  });

  // TODO: a window given no paintable height still paints no rows — it needs
  // the height it painted reported back into its window (TODO.md, `packages/data`).
  it("keeps a tree inside the pane it sits in", () => {
    const measured = treeHeightFor(undefined);
    expect(measured).toBe(PANE_HEIGHT);

    // Measured before the fix: 640 points inside a 200-point pane — the tree
    // overflowed it instead of scrolling inside it.
    expect(treeHeightFor(Number.NaN)).toBe(measured);
  });
});
