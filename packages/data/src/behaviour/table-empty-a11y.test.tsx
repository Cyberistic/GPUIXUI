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
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
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

/** One node of the accessibility tree the renderer reports. */
class A11yNode extends Schema.Class<A11yNode>("A11yNode")({
  aria: Schema.Struct({
    role: Schema.optionalKey(Schema.String),
    label: Schema.optionalKey(Schema.String),
  }),
  children: Schema.optionalKey(Schema.Array(Schema.String)),
}) {}

/** The tree, with its node table addressed by id. */
class A11yTree extends Schema.Class<A11yTree>("A11yTree")({
  root: Schema.String,
  nodes: Schema.Record(Schema.String, A11yNode),
}) {}

/** The role the platform gave one node, if any. */
const roleOf = (tree: A11yTree, id: string): string =>
  tree.nodes[id]?.aria.role ?? "";

/** Every node id under one id, in paint order. */
const descendants = (tree: A11yTree, id: string): ReadonlyArray<string> =>
  Arr.flatMap(tree.nodes[id]?.children ?? [], (child) => [
    child,
    ...descendants(tree, child),
  ]);

/** The node ids under one id whose role is `role`, in paint order. */
const withRole = (
  tree: A11yTree,
  id: string,
  role: string,
): ReadonlyArray<string> =>
  Arr.filter(descendants(tree, id), (node) => roleOf(tree, node) === role);

/** The one node id carrying `role`, failing the case when there is not one. */
const onlyRole = (tree: A11yTree, role: string): string =>
  Option.getOrElse(
    Arr.findFirst(
      Object.keys(tree.nodes),
      (node) => roleOf(tree, node) === role,
    ),
    () => {
      throw new Error(`the tree has no ${role} node`);
    },
  );

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
    read(Schema.decodeUnknownSync(A11yTree)(root.renderer.getA11yTree()));
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
    read(Schema.decodeUnknownSync(A11yTree)(root.renderer.getA11yTree()));
  } finally {
    root.unmount();
  }
};

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
