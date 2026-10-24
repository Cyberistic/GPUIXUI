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
 *
 * A **restored state** is read, not dereferenced: `constructGrid` is the seam a
 * store-driven grid builds with, and JSON writes a slice that was never set as
 * `null`. Before the read, `globalFilter: null` threw `Cannot read properties of
 * null (reading 'trim')`, `sorting: null` threw `state.sorting is not iterable`
 * and a sorting entry that named no column threw `Cannot read properties of null
 * (reading 'id')` — the grid could not reopen with the state it saved.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import type { SortingState } from "@tanstack/table-core";
import {
  constructGrid,
  gridConfig,
  readGridState,
  retainSorting,
  type GridColumn,
  type GridTable,
} from "./grid-core.js";

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

  it("orders the records the first sort ties by the next entry", () => {
    // The first sort ties every pair in a group, so only the second entry can
    // decide the order inside it. A controller that wrote one entry — or a
    // core that read one — leaves each group in source order.
    const tieRows: ReadonlyArray<Row> = [
      { id: "a", name: "beta", status: "x", size: 1 },
      { id: "b", name: "alpha", status: "y", size: 1 },
      { id: "c", name: "alpha", status: "x", size: 1 },
      { id: "d", name: "beta", status: "y", size: 1 },
    ];
    const tieGrid = constructGrid({
      rows: tieRows,
      keyOf: (row) => row.id,
      columns,
      state: {
        sorting: [
          { id: "status", desc: false },
          { id: "name", desc: true },
        ],
        globalFilter: "",
        rowSelection: {},
      },
      onSortingChange: () => {},
      onGlobalFilterChange: () => {},
      onRowSelectionChange: () => {},
    });
    expect(Arr.map(tieGrid.getRowModel().rows, (row) => row.id)).toEqual([
      "a",
      "c",
      "d",
      "b",
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

/**
 * Build a grid from a value a store handed back.
 *
 * The `@ts-expect-error` is the point of the suite — a store hands over
 * `unknown`, and the boundary is what has to survive it. It is the one
 * suppression this package's tests carry for store-written values, rather than
 * an `as` that would hide the same crossing without a parser watching it.
 */
const restoredGrid = (
  state: unknown,
  hiddenColumns?: unknown,
): GridTable<Row> =>
  constructGrid({
    rows,
    keyOf: (row) => row.id,
    columns,
    // @ts-expect-error a stored list is decoded by the core, not trusted
    hiddenColumns,
    // @ts-expect-error a stored state is decoded by the core, not trusted
    state,
    onSortingChange: () => {},
    onGlobalFilterChange: () => {},
    onRowSelectionChange: () => {},
  });

/** The painted ids of a restored grid, in row-model order. */
const restoredIds = (state: unknown): ReadonlyArray<string> =>
  Arr.map(restoredGrid(state).getRowModel().rows, (row) => row.id);

describe("a grid state a store restored", () => {
  it("reads each slice as the absence an unreadable one means", () => {
    const state = readGridState({
      sorting: [null, { id: "size" }, "name", { id: 42 }],
      globalFilter: null,
      rowSelection: { r1: true, r2: "yes", r3: false },
    });
    expect(state.sorting).toEqual([{ id: "size", desc: false }]);
    expect(state.globalFilter).toBe("");
    expect(state.rowSelection).toEqual({ r1: true });
  });

  it("reads a state that is not a record as no state at all", () => {
    const emptyState = { sorting: [], globalFilter: "", rowSelection: {} };
    expect(
      Arr.map([null, undefined, 42, "sorting"], (stored) =>
        readGridState(stored),
      ),
    ).toEqual([emptyState, emptyState, emptyState, emptyState]);
  });

  it("builds the table from the slices that used to take the build down", () => {
    // The three shapes a JSON round trip writes for slices it never set.
    const table = restoredGrid({
      sorting: null,
      globalFilter: null,
      rowSelection: null,
    });
    expect(Arr.map(table.getRowModel().rows, (row) => row.id)).toEqual([
      "r3",
      "r1",
      "r2",
    ]);
    expect(table.getSelectedRowIds()).toEqual([]);
  });

  it("keeps the sort and the query the store wrote", () => {
    // `desc` absent is the ascending direction it means; `auth` narrows first,
    // then the sort orders what the query kept.
    expect(
      restoredIds({
        sorting: [{ id: "size" }],
        globalFilter: "auth",
        rowSelection: { r1: true },
      }),
    ).toEqual(["r3", "r1"]);
  });

  it("hides only the text ids a stored column list names", () => {
    // A number is not a list of ids, and a list holding one keeps the ids it
    // does name: `status` leaves the search either way, `size` does not.
    const query = { sorting: [], globalFilter: "modified", rowSelection: {} };
    expect(restoredIds(query)).toEqual(["r3"]);
    expect(
      Arr.map(
        restoredGrid(query, ["status", 42]).getRowModel().rows,
        (row) => row.id,
      ),
    ).toEqual([]);
    expect(
      Arr.map(restoredGrid(query, 42).getRowModel().rows, (row) => row.id),
    ).toEqual(["r3"]);
  });

  it("drops a sort that names a column this grid does not hold", () => {
    // The release that saved this order sorted by `path`; the column is gone.
    // The row model already skipped it — there is no column to compare — while
    // the controller counted it, so a Shift press on `name` announced
    // "sort 2 of 2" above one sort and `sortOrder` named a field no header
    // paints.
    const saved = readGridState({
      sorting: [
        { id: "path", desc: true },
        { id: "size", desc: false },
      ],
      globalFilter: "",
      rowSelection: {},
    });
    expect(retainSorting(saved.sorting, columns)).toEqual([
      { id: "size", desc: false },
    ]);
    // The order the grid runs is the order it paints: the dropped entry never
    // decided anything.
    expect(
      Arr.map(
        restoredGrid({
          sorting: saved.sorting,
          globalFilter: saved.globalFilter,
          rowSelection: saved.rowSelection,
        }).getRowModel().rows,
        (row) => row.id,
      ),
    ).toEqual(["r2", "r3", "r1"]);
  });
});

describe("the record a grid writes to a store", () => {
  it("reads back through the seam that restores it", () => {
    const state = readGridState({
      sorting: [{ id: "size", desc: true }, { id: "name" }],
      globalFilter: "auth",
      rowSelection: { r1: true, r2: true },
    });
    expect(readGridState(gridConfig(state))).toEqual(state);
  });

  it("writes an empty record for a state it cannot read", () => {
    expect(gridConfig(readGridState(null))).toEqual({
      sorting: [],
      globalFilter: "",
      rowSelection: {},
    });
  });

  it("writes lists of its own, so a store never holds the controller's", () => {
    // A store that kept the controller's arrays would see them change on the
    // next sort, and a serialiser could not walk the record safely.
    const state = readGridState({
      sorting: [{ id: "size", desc: false }],
      globalFilter: "",
      rowSelection: { r1: true },
    });
    const saved = gridConfig(state);
    expect(saved.sorting).not.toBe(state.sorting);
    expect(saved.sorting[0]).not.toBe(state.sorting[0]);
    expect(saved.rowSelection).not.toBe(state.rowSelection);
  });
});
