/**
 * A predicate tree narrows the table, and a selection it hides is released.
 *
 * `useTable` narrowed by a text query only, so the advanced filter's tree — the
 * shape `AdvancedFilter` composes and `filterByTree` runs — could not reach a
 * grid without the caller copying the column lookup. This mounts the shipped
 * controller with a tree and measures the consequences a window can see: the
 * painted rows are the tree's, a record the tree hides leaves the selection in
 * the same commit, and a tree that keeps it again paints it chosen (the release
 * is a view, not a write — the core still holds the id).
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "@gpuixui/primitives/button";
import type { GridColumn } from "../grid-core.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import { emptyTree, type FilterTree } from "../surfaces/logic.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableViewport,
} from "../table/table.js";
import { useTable } from "../use-table.js";

interface FileRow {
  readonly id: string;
  readonly name: string;
  readonly size: number;
}

const byte: FileRow = { id: "byte", name: "byte.ts", size: 10 };
const beta: FileRow = { id: "beta", name: "beta.ts", size: 200 };
const gamma: FileRow = { id: "gamma", name: "gamma.md", size: 150 };
const files: ReadonlyArray<FileRow> = [byte, beta, gamma];

const columns: ReadonlyArray<GridColumn<FileRow>> = [
  { id: "name", valueOf: (row) => row.name },
  { id: "size", valueOf: (row) => row.size },
];

/** The tree a reader builds: `size greater than 100`. */
const keepLarge: FilterTree = {
  kind: "all",
  children: [
    {
      kind: "predicate",
      field: "size",
      comparison: "greaterThan",
      value: "100",
    },
  ],
};

/** The same clause narrowed the other way: `size less than 100`. */
const keepSmall: FilterTree = {
  kind: "all",
  children: [
    { kind: "predicate", field: "size", comparison: "lessThan", value: "100" },
  ],
};

/** The controller over the tree, with the buttons a reader would press. */
const TreeTable = () => {
  const [tree, setTree] = useState<FilterTree>(keepLarge);
  const table = useTable({
    rows: files,
    keyOf: (row) => row.id,
    columns,
    filterTree: tree,
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <Button onActivate={() => setTree(keepSmall)} testId="tree-small">
          Small
        </Button>
        <Button onActivate={() => setTree(emptyTree)} testId="tree-all">
          All
        </Button>
        <text testId="tree-readout">
          {`${table.keys.length} rows · ${table.selectedCount} selected`}
        </text>
      </div>
      <Table height={240} aria-label="Tree filtered files">
        <TableViewport>
          <TableHeader>
            <TableRow>
              <TableHeaderCell width={200}>Name</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((row) => (
              <TableRow
                key={row.id}
                testId={`tree-row-${row.id}`}
                selected={table.isSelected(row.id)}
                onClick={() => table.press(row.id)}
              >
                <TableCell width={200}>{row.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableViewport>
      </Table>
    </div>
  );
};

let root: DataTestRoot | undefined;

const mount = (): DataTestRoot => {
  root = renderData(<TreeTable />);
  settle(root);
  return root;
};

afterEach(() => {
  root?.unmount();
  root = undefined;
});

/** Whether a record's row is mounted, so a hidden record is one that is not. */
const paints = (testRoot: DataTestRoot, id: string): boolean =>
  testRoot.renderer.findByTestId(`tree-row-${id}`) !== undefined;

const press = (testRoot: DataTestRoot, testId: string): void => {
  const element = testRoot.renderer.findByTestId(testId);
  if (element === undefined)
    throw new Error(`no element with testId ${testId}`);
  const bounds = testRoot.renderer.getElementBounds(element.id);
  if (bounds === null) throw new Error(`no painted box for ${testId}`);
  testRoot.renderer.nativeSimulateClick(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  testRoot.renderer.flush();
};

/** The readout's own words, out of every run the renderer painted. */
const readout = (testRoot: DataTestRoot): string =>
  Option.getOrElse(
    Arr.findFirst(testRoot.renderer.getAllText(), Str.includes(" rows · ")),
    () => "",
  );

describe("a table narrowed by a predicate tree", () => {
  it("paints the records the tree keeps and none of the rest", () => {
    const testRoot = mount();

    expect(paints(testRoot, "beta")).toBe(true);
    expect(paints(testRoot, "gamma")).toBe(true);
    expect(paints(testRoot, "byte")).toBe(false);
    expect(readout(testRoot)).toBe("2 rows · 0 selected");
  });

  it("releases a chosen record in the commit that hides it, and paints it again when it returns", () => {
    const testRoot = mount();

    press(testRoot, "tree-row-beta");
    expect(readout(testRoot)).toBe("2 rows · 1 selected");

    press(testRoot, "tree-small");
    expect(paints(testRoot, "byte")).toBe(true);
    expect(paints(testRoot, "beta")).toBe(false);
    // The tree hides the chosen record, so the same commit paints no choice.
    expect(readout(testRoot)).toBe("1 rows · 0 selected");

    press(testRoot, "tree-all");
    expect(paints(testRoot, "beta")).toBe(true);
    // Retention is a view, not a write: the core still holds the id, so the
    // widened set paints the record the reader chose.
    expect(readout(testRoot)).toBe("3 rows · 1 selected");
  });
});
