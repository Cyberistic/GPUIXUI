/**
 * The row models the grid runs on.
 *
 * These are the rules that used to be this package's own reducers and are now
 * the core's: an unsorted table keeps the caller's order, a numeric column
 * sorts numerically (not lexically), a descending sort reverses the comparator,
 * and the filter field is a literal case-insensitive substring that matches
 * everything when blank. A grid that registered the wrong comparator or lost
 * the filter model fails here.
 *
 * The last case holds the premise the controller's render-time retention rests
 * on: the core keeps a chosen id a filter hides, so a query that widens back to
 * the record can paint it chosen again.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import type { SortingState } from "@tanstack/table-core";
import { constructGrid, type GridColumn } from "./grid-core.js";

interface Row {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly size: number;
}

const rows: ReadonlyArray<Row> = [
  { id: "r3", name: "auth.test.ts", status: "modified", size: 30 },
  { id: "r1", name: "auth.ts", status: "tracked", size: 100 },
  { id: "r2", name: "readme.md", status: "untracked", size: 20 },
];

const columns: ReadonlyArray<GridColumn<Row>> = [
  { id: "name", valueOf: (row) => row.name },
  { id: "status", valueOf: (row) => row.status },
  { id: "size", valueOf: (row) => row.size },
];

interface GridState {
  readonly sorting?: SortingState;
  readonly query?: string;
  readonly chosen?: Readonly<Record<string, true>>;
  readonly hidden?: ReadonlyArray<string>;
}

const grid = ({
  sorting = [],
  query = "",
  chosen = {},
  hidden,
}: GridState = {}) =>
  constructGrid({
    rows,
    keyOf: (row) => row.id,
    columns,
    hiddenColumns: hidden,
    state: { sorting, globalFilter: query, rowSelection: chosen },
    onSortingChange: () => {},
    onGlobalFilterChange: () => {},
    onRowSelectionChange: () => {},
  });

/** The painted ids, in row-model order. */
const ids = (state: GridState = {}): ReadonlyArray<string> =>
  Arr.map(grid(state).getRowModel().rows, (row) => row.id);

describe("the sorted row model", () => {
  it("keeps the caller's order when nothing is sorted", () => {
    expect(ids()).toEqual(["r3", "r1", "r2"]);
  });

  it("sorts text ascending and reverses it descending", () => {
    expect(ids({ sorting: [{ id: "name", desc: false }] })).toEqual([
      "r3",
      "r1",
      "r2",
    ]);
    expect(ids({ sorting: [{ id: "name", desc: true }] })).toEqual([
      "r2",
      "r1",
      "r3",
    ]);
  });

  it("sorts a number column numerically, not lexically", () => {
    expect(ids({ sorting: [{ id: "size", desc: false }] })).toEqual([
      "r2",
      "r3",
      "r1",
    ]);
  });
});

describe("the filtered row model", () => {
  const kept = (query: string): ReadonlyArray<string> =>
    Arr.map(grid({ query }).getFilteredRowModel().rows, (row) => row.id);

  it("matches a literal, case-insensitive substring", () => {
    expect(kept("AUTH")).toEqual(["r3", "r1"]);
    expect(kept("*.ts")).toEqual([]);
  });

  it("matches everything when blank", () => {
    expect(kept("   ")).toEqual(["r3", "r1", "r2"]);
  });

  it("keeps a chosen id the query hides, so a wider query repaints it", () => {
    const narrowed = grid({ query: "readme", chosen: { r1: true } });
    expect(narrowed.getSelectedRowIds()).toEqual(["r1"]);
    expect(narrowed.getRowModel().rows).toHaveLength(1);
  });
});

describe("a hidden column", () => {
  it("leaves the search, so no record is kept by text no cell shows", () => {
    expect(ids({ query: "modified", hidden: ["status"] })).toEqual([]);
    expect(ids({ query: "tracked", hidden: ["status"] })).toEqual([]);
    // The painted columns still match — the hidden one is the only one gone.
    expect(ids({ query: "auth", hidden: ["status"] })).toEqual(["r3", "r1"]);
  });

  it("keeps its sort, so hiding the sorted column does not restore the source", () => {
    expect(ids({ sorting: [{ id: "status", desc: true }] })).toEqual([
      "r2",
      "r1",
      "r3",
    ]);
    expect(
      ids({ sorting: [{ id: "status", desc: true }], hidden: ["status"] }),
    ).toEqual(["r2", "r1", "r3"]);
  });
});
