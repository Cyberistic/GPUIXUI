/**
 * The frozen-column grid's empty set, read back through the accessibility tree.
 *
 * The bug these guard: `FrozenTable` passed its `empty` node straight into the
 * data pane's `TableBody`, and when the caller named none the body's
 * no-children branch painted the loading skeleton — so a grid that said it had
 * no records showed three rows of placeholder bars, and a caller who did give a
 * message got a role-less box under the body's `rowgroup` (no row, no cell).
 *
 * The plain table and `VirtualTable` had both already closed this class; the
 * frozen composition kept it. Now the data pane paints a `TableEmpty` row
 * holding one cell, a string message paints as that cell's own text, and the
 * default is `No rows` — an empty set is not a load.
 */

import type { ReactNode } from "react";
import * as Arr from "effect/Array";
import * as Result from "effect/Result";
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
import { FrozenTable } from "../table/frozen.js";
import { TableHeaderCell, TableRow } from "../table/table.js";

interface NoRecord {
  readonly id: string;
}

const NO_ROWS: ReadonlyArray<NoRecord> = [];

/** A zero-row frozen grid: headers paint, the data pane holds the empty state. */
const emptyFrozen = (empty?: ReactNode) => (
  <FrozenTable
    height={200}
    frozenWidth={160}
    contentWidth={320}
    rows={NO_ROWS}
    rowKey={(row) => row.id}
    aria-label="Files"
    frozenHeader={
      <TableRow>
        <TableHeaderCell width={160}>Name</TableHeaderCell>
      </TableRow>
    }
    frozenRow={() => null}
    header={
      <TableRow>
        <TableHeaderCell width={320}>Size</TableHeaderCell>
      </TableRow>
    }
    row={() => null}
    empty={empty}
  />
);

/** Render one empty frozen grid, read its tree and its words, release it. */
const withEmptyFrozen = (
  empty: ReactNode,
  read: (tree: A11yTree, root: DataTestRoot) => void,
): void => {
  const root: DataTestRoot = renderData(emptyFrozen(empty));
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

describe("the frozen-column grid over no rows", () => {
  it("paints an empty row and cell instead of the loading skeleton", () => {
    withEmptyFrozen(undefined, (tree, root) => {
      const table = onlyRole(tree, "Table");
      // One body cell — the empty state's. The skeleton painted nine.
      expect(withRole(tree, table, "Cell")).toHaveLength(1);
      expect(root.renderer.getAllText()).toContain("No rows");
      // The headers still paint: an empty set is not an empty grid.
      expect(root.renderer.getAllText()).toContain("Name");
      expect(root.renderer.getAllText()).toContain("Size");
      const cell = onlyRole(tree, "Cell");
      expect(labelValues(tree, cell)).toEqual(["No rows"]);
      const parents = Object.entries(tree.nodes).filter(([, node]) =>
        (node.children ?? []).includes(cell),
      );
      expect(parents.map(([id]) => roleOf(tree, id))).toEqual(["Row"]);
    });
  });

  it("paints a caller's string message as the empty cell's text", () => {
    withEmptyFrozen("No file matches that filter.", (tree, root) => {
      expect(root.renderer.getAllText()).toContain(
        "No file matches that filter.",
      );
      expect(labelValues(tree, onlyRole(tree, "Cell"))).toEqual([
        "No file matches that filter.",
      ]);
    });
  });
});
