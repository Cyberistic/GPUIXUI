import { describe, expect, it } from "vitest";
import type { GridColumn } from "./grid-core.js";
import { emptyTree, filterByTree, type FilterTree } from "./surfaces/logic.js";
import { fieldValueOf } from "./use-table.js";

interface File {
  readonly id: string;
  readonly name: string;
  readonly size: number;
}

const byte: File = { id: "byte", name: "byte.ts", size: 10 };
const beta: File = { id: "beta", name: "beta.ts", size: 200 };
const gamma: File = { id: "gamma", name: "gamma.md", size: 150 };
const files: ReadonlyArray<File> = [byte, beta, gamma];

const columns: ReadonlyArray<GridColumn<File>> = [
  { id: "name", valueOf: (row) => row.name },
  { id: "size", valueOf: (row) => row.size },
];

const fieldOf = fieldValueOf(columns);

const oneClause = (
  field: string,
  comparison: "equals" | "contains" | "greaterThan" | "lessThan",
  value: string,
): FilterTree => ({
  kind: "all",
  children: [{ kind: "predicate", field, comparison, value }],
});

describe("a predicate tree over the grid's columns", () => {
  it("reads a field through the column that owns it", () => {
    expect(fieldOf(beta, "size")).toBe(200);
    expect(fieldOf(beta, "name")).toBe("beta.ts");
  });

  it("reads a field no column names as blank, not a throw", () => {
    expect(fieldOf(beta, "removed")).toBe("");
    expect(
      filterByTree(files, oneClause("removed", "greaterThan", "100"), fieldOf),
    ).toEqual([]);
  });

  it("narrows by a numeric comparison a clause types as text", () => {
    expect(
      filterByTree(files, oneClause("size", "greaterThan", "100"), fieldOf),
    ).toEqual([beta, gamma]);
    expect(
      filterByTree(files, oneClause("size", "lessThan", "100"), fieldOf),
    ).toEqual([byte]);
  });

  it("narrows by text the way the builder teaches it", () => {
    expect(
      filterByTree(files, oneClause("name", "contains", "BETA"), fieldOf),
    ).toEqual([beta]);
    expect(
      filterByTree(files, oneClause("name", "equals", "gamma.md"), fieldOf),
    ).toEqual([gamma]);
  });

  it("keeps every row for the empty tree a builder starts from", () => {
    expect(filterByTree(files, emptyTree, fieldOf)).toEqual(files);
  });
});
