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
import { ALL_ROWS } from "./pagination/logic.js";

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
  readonly page?: { readonly pageIndex: number; readonly pageSize: number };
}

const grid = ({
  sorting = [],
  query = "",
  chosen = {},
  hidden,
  page,
}: GridState = {}) =>
  constructGrid({
    rows,
    keyOf: (row) => row.id,
    columns,
    hiddenColumns: hidden,
    state: {
      sorting,
      globalFilter: query,
      rowSelection: chosen,
      ...(page === undefined ? {} : { pagination: page }),
    },
    onSortingChange: () => {},
    onGlobalFilterChange: () => {},
    onRowSelectionChange: () => {},
  });

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

describe("the paginated row model", () => {
  const page = (
    pageIndex: number,
    pageSize: number,
  ): { readonly pageIndex: number; readonly pageSize: number } => ({
    pageIndex,
    pageSize,
  });

  it("paints one page of the filtered and sorted set", () => {
    const sorting = [{ id: "size", desc: false }];
    expect(ids({ sorting, page: page(0, 2) })).toEqual(["r2", "r3"]);
    expect(ids({ sorting, page: page(1, 2) })).toEqual(["r1"]);
  });

  it("slices the order a multi-entry sort produces", () => {
    const order = [
      { id: "status", desc: false },
      { id: "size", desc: true },
    ];
    expect(ids({ sorting: order, page: page(0, 1) })).toEqual(["r3"]);
    expect(ids({ sorting: order, page: page(1, 1) })).toEqual(["r1"]);
    expect(ids({ sorting: order, page: page(2, 1) })).toEqual(["r2"]);
  });

  it("pages the rows the query kept, not the source", () => {
    const query = "auth";
    expect(ids({ query, page: page(0, 1) })).toEqual(["r3"]);
    expect(ids({ query, page: page(1, 1) })).toEqual(["r1"]);
    expect(ids({ query, page: page(2, 1) })).toEqual([]);
  });

  it("paints every row when the size is every row", () => {
    expect(ids()).toEqual(["r3", "r1", "r2"]);
    expect(ids({ page: page(0, ALL_ROWS) })).toEqual(["r3", "r1", "r2"]);
  });

  it("paints no row for a page past the set", () => {
    expect(ids({ page: page(4, 2) })).toEqual([]);
  });

  it("keeps the whole set before the page, so selection can read it", () => {
    const paged = grid({ page: page(0, 1), chosen: { r1: true } });
    expect(
      Arr.map(paged.getPrePaginatedRowModel().rows, (row) => row.id),
    ).toEqual(["r3", "r1", "r2"]);
    expect(Arr.map(paged.getRowModel().rows, (row) => row.id)).toEqual(["r3"]);
    expect(paged.getSelectedRowIds()).toEqual(["r1"]);
  });
});

describe("a hidden column", () => {
  it("leaves the search, so no record is kept by text no cell shows", () => {
    expect(ids({ query: "modified", hidden: ["status"] })).toEqual([]);
    expect(ids({ query: "tracked", hidden: ["status"] })).toEqual([]);

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
    const emptyState = {
      sorting: [],
      globalFilter: "",
      rowSelection: {},
      pagination: { pageIndex: 0, pageSize: ALL_ROWS },
    };
    expect(
      Arr.map([null, undefined, 42, "sorting"], (stored) =>
        readGridState(stored),
      ),
    ).toEqual([emptyState, emptyState, emptyState, emptyState]);
  });

  it("builds the table from the slices that used to take the build down", () => {
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
    expect(
      restoredIds({
        sorting: [{ id: "size" }],
        globalFilter: "auth",
        rowSelection: { r1: true },
      }),
    ).toEqual(["r3", "r1"]);
  });

  it("hides only the text ids a stored column list names", () => {
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

describe("a grid handed a row list a store wrote as absent", () => {
  const gridOver = (list: ReadonlyArray<Row>): GridTable<Row> =>
    constructGrid({
      rows: list,
      keyOf: (row) => row.id,
      columns,
      state: { sorting: [], globalFilter: "", rowSelection: {} },
      onSortingChange: () => {},
      onGlobalFilterChange: () => {},
      onRowSelectionChange: () => {},
    });

  it("builds an empty table instead of throwing", () => {
    // @ts-expect-error — a row list a store wrote as absent.
    const absent = gridOver(null);
    expect(Arr.map(absent.getRowModel().rows, (row) => row.id)).toEqual([]);
    // @ts-expect-error — the other absence a store writes.
    expect(gridOver(undefined).getFilteredRowModel().rows).toEqual([]);
  });

  it("still builds the rows a readable list holds", () => {
    expect(Arr.map(gridOver(rows).getRowModel().rows, (row) => row.id)).toEqual(
      ["r3", "r1", "r2"],
    );
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
      pagination: { pageIndex: 0, pageSize: ALL_ROWS },
    });
  });

  it("reads back the page it wrote", () => {
    const state = readGridState({
      sorting: [],
      globalFilter: "",
      rowSelection: {},
      pagination: { pageIndex: 1, pageSize: 2 },
    });
    const saved = gridConfig(state);
    expect(saved.pagination).toEqual({ pageIndex: 1, pageSize: 2 });
    expect(readGridState(saved)).toEqual(state);
  });

  it("writes lists of its own, so a store never holds the controller's", () => {
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
