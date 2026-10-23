/**
 * The empty state is a row, not a bare box.
 *
 * `TableEmpty` paints the message a table shows when its set is empty. It used
 * to be one role-less `div` inside `TableBody` (a `rowgroup`), so the
 * accessibility tree described a table whose only body child was a `RowGroup`
 * with the message's text directly under it — invalid ARIA, and measured: the
 * empty table's tree held four nodes (Window, Table, two RowGroups) and no row
 * or cell at all.
 *
 * The guard reads the rendered tree back through a schema, so it holds the
 * shape rather than a screenshot: the empty state must be a `Row` with a `Cell`
 * inside the body's `RowGroup`, and the message must stay under that cell.
 * Restoring the role-less box fails the first case by name.
 *
 * Two more shapes are held here, because "empty" has two ways to go wrong:
 *
 * - `VirtualTable` with `count={0}` and **no** `empty` prop painted the body's
 *   loading skeleton (three placeholder rows of bars), so a caller who passed no
 *   message was told the set was still loading. It paints a default `No rows`
 *   message instead, in the same row-and-cell shape.
 * - `TableEmpty` painted a **string** child as a raw run the tree never hears,
 *   the defect `TableCaption` already lost. A string now paints as its own
 *   `<text>`, so `empty="No matches"` reaches a reader.
 */

import * as Arr from "effect/Array";
import * as Result from "effect/Result";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  decodeA11yTree,
  onlyRole,
  roleOf,
  withRole,
  type A11yTree,
} from "../internal/a11y.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import {
  Table,
  TableBody,
  TableEmpty,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableViewport,
} from "../table/table.js";
import { VirtualTable } from "../virtual/table.js";

/** The empty table under a header, which is the shape the example mounts. */
const emptyTable = () => (
  <Table height={200} aria-label="Files">
    <TableViewport>
      <TableHeader>
        <TableRow>
          <TableHeaderCell width={260}>Name</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty>
          <text>No file matches that filter.</text>
        </TableEmpty>
      </TableBody>
    </TableViewport>
  </Table>
);

/** Render the empty table, read its tree, and always release the window. */
const withEmptyTree = (read: (tree: A11yTree) => void): void => {
  const root: DataTestRoot = renderData(emptyTable());
  try {
    settle(root);
    read(decodeA11yTree(root.renderer.getA11yTree()));
  } finally {
    root.unmount();
  }
};

/** The windowed table over no rows: the same empty state through its own path. */
const emptyVirtualTable = () => (
  <VirtualTable
    height={200}
    aria-label="Files"
    count={0}
    rowHeight={32}
    header={
      <TableRow>
        <TableHeaderCell width={260}>Name</TableHeaderCell>
      </TableRow>
    }
    row={() => null}
    empty={<text>No file matches that filter.</text>}
  />
);

/** Render the empty windowed table, read its tree, and release the window. */
const withEmptyVirtualTree = (read: (tree: A11yTree) => void): void => {
  const root: DataTestRoot = renderData(emptyVirtualTable());
  try {
    settle(root);
    read(decodeA11yTree(root.renderer.getA11yTree()));
  } finally {
    root.unmount();
  }
};

/** A windowed table over no rows, with whatever empty node the case names. */
const windowedTable = (empty?: ReactNode) => (
  <VirtualTable
    height={200}
    aria-label="Files"
    count={0}
    rowHeight={32}
    header={
      <TableRow>
        <TableHeaderCell width={260}>Name</TableHeaderCell>
      </TableRow>
    }
    row={() => null}
    empty={empty}
  />
);

/** Render a windowed table over no rows and read its tree and painted text. */
const withWindowedEmpty = (
  empty: ReactNode,
  read: (tree: A11yTree, root: DataTestRoot) => void,
): void => {
  const root: DataTestRoot = renderData(windowedTable(empty));
  try {
    settle(root);
    read(decodeA11yTree(root.renderer.getA11yTree()), root);
  } finally {
    root.unmount();
  }
};

/** The words the tree announces under one node, in paint order. */
const labelValues = (tree: A11yTree, id: string): ReadonlyArray<string> =>
  Arr.filterMap(withRole(tree, id, "Label"), (node) => {
    const value = tree.nodes[node]?.aria.value;
    return value === undefined ? Result.failVoid : Result.succeed(value);
  });

describe("the table's empty state", () => {
  it("is a row with a cell, inside the body's row group", () => {
    withEmptyTree((tree) => {
      const table = onlyRole(tree, "Table");
      const rowGroups = withRole(tree, table, "RowGroup");
      expect(rowGroups.length).toBeGreaterThanOrEqual(2);

      const rows = Arr.flatMap(rowGroups, (group) =>
        withRole(tree, group, "Row"),
      );
      // The header's row and the empty state's row.
      expect(rows.length).toBeGreaterThanOrEqual(2);
      const cells = Arr.flatMap(rows, (row) => withRole(tree, row, "Cell"));
      expect(cells.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("keeps the message under the cell it declares", () => {
    withEmptyTree((tree) => {
      // A <text> reaches the tree as a Label node. The empty state used to put
      // it directly under the body's RowGroup; it belongs to the cell now.
      const cell = onlyRole(tree, "Cell");
      const labels = withRole(tree, cell, "Label");
      expect(labels).toHaveLength(1);
      // ...and the label's parent is that cell, not the row group.
      const parents = Object.entries(tree.nodes).filter(([, node]) =>
        (node.children ?? []).includes(cell),
      );
      expect(parents.map(([id]) => roleOf(tree, id))).toEqual(["Row"]);
    });
  });

  it("paints no rows as an empty set, not as a loading skeleton", () => {
    // `count={0}` with no `empty` node used to fall through to `TableBody`'s
    // no-children branch, which paints the loading placeholder: a caller who
    // told the table there are no records saw three rows of skeleton bars.
    withWindowedEmpty(undefined, (tree, root) => {
      const table = onlyRole(tree, "Table");
      // One body cell — the empty state's — not the skeleton's nine.
      expect(withRole(tree, table, "Cell")).toHaveLength(1);
      expect(root.renderer.getAllText()).toContain("No rows");
      expect(labelValues(tree, onlyRole(tree, "Cell"))).toEqual(["No rows"]);
    });
  });

  it("paints a caller's empty message given as a string as text", () => {
    // The runtime reaches the tree only through `<text>` elements, so a raw
    // string inside the empty cell painted but could not be heard.
    withWindowedEmpty("No file matches that filter.", (tree, root) => {
      expect(root.renderer.getAllText()).toContain(
        "No file matches that filter.",
      );
      expect(labelValues(tree, onlyRole(tree, "Cell"))).toEqual([
        "No file matches that filter.",
      ]);
    });
  });

  it("gives the windowed table's empty state the same row and cell", () => {
    // `VirtualTable` paints its own body when the set is empty, and it passed
    // the caller's node straight into the body's row group — the role-less
    // shape the plain table had already lost. The message belongs to a cell.
    withEmptyVirtualTree((tree) => {
      const cell = onlyRole(tree, "Cell");
      expect(withRole(tree, cell, "Label")).toHaveLength(1);
      const parents = Object.entries(tree.nodes).filter(([, node]) =>
        (node.children ?? []).includes(cell),
      );
      expect(parents.map(([id]) => roleOf(tree, id))).toEqual(["Row"]);
    });
  });
});
