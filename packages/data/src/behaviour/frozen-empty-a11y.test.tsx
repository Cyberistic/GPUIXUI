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

const labelValues = (tree: A11yTree, id: string): ReadonlyArray<string> =>
  Arr.filterMap(withRole(tree, id, "Label"), (node) => {
    const value = tree.nodes[node]?.aria.value;
    return value === undefined ? Result.failVoid : Result.succeed(value);
  });

describe("the frozen-column grid over no rows", () => {
  it("paints an empty row and cell instead of the loading skeleton", () => {
    withEmptyFrozen(undefined, (tree, root) => {
      const table = onlyRole(tree, "Table");

      expect(withRole(tree, table, "Cell")).toHaveLength(1);
      expect(root.renderer.getAllText()).toContain("No rows");

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

  it("reads a blank message as the documented No rows", () => {
    Arr.forEach(["", "   "], (blank) =>
      withEmptyFrozen(blank, (tree, root) => {
        expect(root.renderer.getAllText()).toContain("No rows");
        expect(labelValues(tree, onlyRole(tree, "Cell"))).toEqual(["No rows"]);
      }),
    );
  });
});
