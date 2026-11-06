import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { afterEach, describe, expect, it } from "vitest";
import { requireBounds } from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import { FrozenTable } from "../table/frozen.js";
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
import { VirtualTable, VirtualTableBody } from "../virtual/table.js";
import { VirtualTree } from "../virtual/tree.js";
import type { TreeRow } from "../tree/logic.js";

const TABLE_HEIGHT = 320;

const PANE_HEIGHT = 200;

const NODES = Arr.map(Arr.range(0, 19), (index) => ({
  id: `node-${index}`,
  label: `node ${index}`,
}));

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

const paintedRows = (mounted: DataTestRoot, prefix: string): number =>
  mounted.renderer.getPaintedText().filter((line) => line.startsWith(prefix))
    .length;

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

const bodyHeightFor = (height: number | undefined): number =>
  withRoot(
    () => renderData(<PlainTable height={height} />),
    (mounted) => requireBounds(mounted, "paintable-body").height,
  );

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

const windowedBodyRowsFor = (height: number | undefined): number =>
  withRoot(
    () => renderData(<WindowedBody height={height} />),
    (mounted) => paintedRows(mounted, "row-"),
  );

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

const treeHeightFor = (height: number | undefined): number =>
  withRoot(
    () => renderData(<Tree height={height} />),
    (mounted) => requireBounds(mounted, "paintable-tree").height,
  );

const WINDOW_PANE = 320;

const WindowedTable = ({ height }: { readonly height: number | undefined }) => (
  <div
    style={{ display: "flex", flexDirection: "column", height: WINDOW_PANE }}
  >
    <VirtualTable
      height={height ?? Number.NaN}
      aria-label="Rows"
      count={200}
      rowHeight={37}
      header={
        <TableRow>
          <TableHeaderCell width={180}>Name</TableHeaderCell>
        </TableRow>
      }
      row={(index) => (
        <TableRow>
          <TableCell width={180}>
            <text>{`row-${index}`}</text>
          </TableCell>
        </TableRow>
      )}
    />
  </div>
);

const windowedTableRowsFor = (height: number | undefined): number =>
  withRoot(
    () => renderData(<WindowedTable height={height} />),
    (mounted) => paintedRows(mounted, "row-"),
  );

const WindowedTree = ({ height }: { readonly height: number | undefined }) => (
  <div
    style={{ display: "flex", flexDirection: "column", height: WINDOW_PANE }}
  >
    <VirtualTree
      height={height ?? Number.NaN}
      aria-label="Nodes"
      rows={TREE_ROWS}
      rowHeight={37}
      labelOf={(node) => node.label}
    />
  </div>
);

const windowedTreeRowsFor = (height: number | undefined): number =>
  withRoot(
    () => renderData(<WindowedTree height={height} />),
    (mounted) => paintedRows(mounted, "node "),
  );

const FROZEN_ROWS = Arr.map(Arr.range(0, 19), (index) => ({
  id: `record-${index}`,
  name: `record-${index}`,
}));

const FROZEN_ROW_HEIGHT = 32;

const Frozen = ({ height }: { readonly height: number }) => (
  <div
    style={{ display: "flex", flexDirection: "column", height: WINDOW_PANE }}
  >
    <FrozenTable
      height={height}
      frozenWidth={180}
      contentWidth={420}
      rows={FROZEN_ROWS}
      rowKey={(row) => row.id}
      aria-label="Records"
      frozenTestId="paintable-frozen"
      bodyTestId="paintable-frozen-body"
      frozenHeader={
        <TableRow>
          <TableHeaderCell width={180}>Name</TableHeaderCell>
        </TableRow>
      }
      frozenRow={(row) => (
        <TableRow style={{ height: FROZEN_ROW_HEIGHT }}>
          <TableCell width={180}>
            <text>{row.name}</text>
          </TableCell>
        </TableRow>
      )}
      header={
        <TableRow>
          <TableHeaderCell width={140}>Status</TableHeaderCell>
        </TableRow>
      }
      row={() => (
        <TableRow style={{ height: FROZEN_ROW_HEIGHT }}>
          <TableCell width={140}>
            <text>tracked</text>
          </TableCell>
        </TableRow>
      )}
    />
  </div>
);

const frozenPanesFor = (height: number): ReadonlyArray<number> =>
  withRoot(
    () => renderData(<Frozen height={height} />),
    (mounted) => [
      requireBounds(mounted, "paintable-frozen").height,
      requireBounds(mounted, "paintable-frozen-body").height,
    ],
  );

describe("a height the layout cannot paint", () => {
  it("keeps the row scroller's measured frame", () => {
    const measured = bodyHeightFor(undefined);
    expect(measured).toBeGreaterThan(100);

    expect(bodyHeightFor(Number.NaN)).toBe(measured);
    expect(bodyHeightFor(Number.POSITIVE_INFINITY)).toBe(measured);
    expect(bodyHeightFor(Number.NEGATIVE_INFINITY)).toBe(measured);

    expect(bodyHeightFor(-20)).toBe(measured);
  });

  it("keeps a height the layout can paint", () => {
    expect(bodyHeightFor(200)).toBe(200);
  });

  it("paints the rows of a windowed table's body", () => {
    const measured = windowedBodyRowsFor(undefined);
    expect(measured).toBeGreaterThan(0);

    expect(windowedBodyRowsFor(Number.NaN)).toBe(measured);
  });

  it("keeps a tree inside the pane it sits in", () => {
    const measured = treeHeightFor(undefined);
    expect(measured).toBe(PANE_HEIGHT);

    expect(treeHeightFor(Number.NaN)).toBe(measured);
  });

  it("paints the rows of a windowed table in the pane it fills", () => {
    const bounded = windowedTableRowsFor(WINDOW_PANE);
    expect(bounded).toBeGreaterThan(5);

    expect(windowedTableRowsFor(undefined)).toBe(bounded);
  });

  it("paints the rows of a windowed tree in the pane it fills", () => {
    const bounded = windowedTreeRowsFor(WINDOW_PANE);

    expect(bounded).toBeGreaterThan(5);

    expect(windowedTreeRowsFor(undefined)).toBe(bounded);
    expect(windowedTreeRowsFor(undefined)).toBeGreaterThanOrEqual(
      Math.ceil(WINDOW_PANE / 37),
    );
  });

  it("keeps the frozen composition's two scrollers inside their pane", () => {
    const bounded = frozenPanesFor(WINDOW_PANE);

    expect(bounded[0]).toBeGreaterThan(100);
    expect(bounded[0]).toBe(bounded[1]);

    expect(frozenPanesFor(Number.NaN)).toEqual(bounded);
    expect(frozenPanesFor(Number.POSITIVE_INFINITY)).toEqual(bounded);
    expect(frozenPanesFor(Number.NEGATIVE_INFINITY)).toEqual(bounded);
  });
});
