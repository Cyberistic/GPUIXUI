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

const withEmptyTree = (read: (tree: A11yTree) => void): void => {
  const root: DataTestRoot = renderData(emptyTable());
  try {
    settle(root);
    read(decodeA11yTree(root.renderer.getA11yTree()));
  } finally {
    root.unmount();
  }
};

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

const withEmptyVirtualTree = (read: (tree: A11yTree) => void): void => {
  const root: DataTestRoot = renderData(emptyVirtualTable());
  try {
    settle(root);
    read(decodeA11yTree(root.renderer.getA11yTree()));
  } finally {
    root.unmount();
  }
};

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

      expect(rows.length).toBeGreaterThanOrEqual(2);
      const cells = Arr.flatMap(rows, (row) => withRole(tree, row, "Cell"));
      expect(cells.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("keeps the message under the cell it declares", () => {
    withEmptyTree((tree) => {
      const cell = onlyRole(tree, "Cell");
      const labels = withRole(tree, cell, "Label");
      expect(labels).toHaveLength(1);

      const parents = Object.entries(tree.nodes).filter(([, node]) =>
        (node.children ?? []).includes(cell),
      );
      expect(parents.map(([id]) => roleOf(tree, id))).toEqual(["Row"]);
    });
  });

  it("paints no rows as an empty set, not as a loading skeleton", () => {
    withWindowedEmpty(undefined, (tree, root) => {
      const table = onlyRole(tree, "Table");

      expect(withRole(tree, table, "Cell")).toHaveLength(1);
      expect(root.renderer.getAllText()).toContain("No rows");
      expect(labelValues(tree, onlyRole(tree, "Cell"))).toEqual(["No rows"]);
    });
  });

  it("paints a caller's empty message given as a string as text", () => {
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
