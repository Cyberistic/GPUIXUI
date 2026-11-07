import type { EventModifiers } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { useCallback, useMemo, useState } from "react";
import type {
  PaginationState,
  RowData,
  SortingState,
} from "@tanstack/table-core";
import {
  constructGrid,
  gridConfig,
  readGridState,
  retainSorting,
  type GridColumn,
  type GridConfig,
  type GridTable,
} from "./grid-core.js";
import { filterByTree, type FilterTree } from "./surfaces/logic.js";
import { listOf } from "./internal/list.js";
import {
  clampPageIndex,
  pageCountOf,
  pageSizeOf,
  withPageSize,
} from "./pagination/logic.js";
import {
  allSelected,
  clearSelection,
  currentKey,
  isSelected,
  moveSelection,
  pressMode,
  pressSelection,
  retainSelection,
  selectAll,
  selectionSize,
  someSelected,
  type SelectionState,
} from "./selection/logic.js";
import {
  pressSortOrder,
  type SortDirection,
  type SortOrder,
  type SortState,
} from "./sort/logic.js";

export interface UseTableOptions<Row extends RowData> {
  readonly rows: ReadonlyArray<Row>;

  readonly keyOf: (row: Row) => string;

  readonly columns: ReadonlyArray<GridColumn<Row>>;

  readonly hiddenColumns?: ReadonlyArray<string>;

  readonly filterTree?: FilterTree;

  readonly stored?: unknown;

  readonly initialSort?: SortState;

  readonly pageSize?: number;
}

export interface TableController<Row extends RowData> {
  readonly rows: ReadonlyArray<Row>;

  readonly keys: ReadonlyArray<string>;

  readonly sort: Option.Option<SortState>;

  readonly sortOrder: SortOrder;
  readonly query: string;
  readonly selection: SelectionState;

  readonly kept: ReadonlyArray<Row>;

  readonly selectedCount: number;

  readonly allSelected: boolean;

  readonly someSelected: boolean;

  readonly pageIndex: number;

  readonly pageCount: number;

  readonly pageSize: number;

  readonly setPageIndex: (pageIndex: number) => void;

  readonly setPageSize: (pageSize: number) => void;

  readonly nextPage: () => void;

  readonly previousPage: () => void;

  readonly activeKey: Option.Option<string>;

  readonly tabStop: Option.Option<string>;

  readonly table: GridTable<Row>;

  readonly save: () => GridConfig;
  readonly setSort: (next: Option.Option<SortState>) => void;

  readonly toggleSort: (field: string, additive?: boolean) => void;

  readonly pressSort: (
    field: string,
    initialDirection: SortDirection,
    modifiers?: EventModifiers,
  ) => void;
  readonly setQuery: (query: string) => void;
  readonly press: (key: string, modifiers?: EventModifiers) => void;
  readonly pressRow: (row: Row, modifiers?: EventModifiers) => void;

  readonly toggleSelection: (key: string) => void;

  readonly setAllSelected: (selected: boolean) => void;
  readonly selectAllRows: () => void;
  readonly clear: () => void;
  readonly move: (delta: number) => void;
  readonly isSelected: (key: string) => boolean;
}

const sortingOfOrder = (order: SortOrder): SortingState =>
  Arr.map(order, (state) => ({
    id: state.field,
    desc: state.direction === "desc",
  }));

const sortingOf = (sort: Option.Option<SortState>): SortingState =>
  sortingOfOrder(Option.toArray(sort));

const openingSorting = (
  saved: SortingState,
  initialSort: Option.Option<SortState>,
): SortingState => (saved.length > 0 ? saved : sortingOf(initialSort));

const sortOf = (sorting: SortingState): Option.Option<SortState> =>
  Option.map(Option.fromNullishOr(sorting[0]), (column) => ({
    field: column.id,
    direction: column.desc ? "desc" : "asc",
  }));

const sortOrderOf = (sorting: SortingState): SortOrder =>
  Arr.map(sorting, (column) => ({
    field: column.id,
    direction: column.desc ? "desc" : "asc",
  }));

export const fieldValueOf =
  <Row>(columns: ReadonlyArray<GridColumn<Row>>) =>
  (row: Row, field: string): string | number =>
    Option.match(
      Arr.findFirst(columns, (column) => column.id === field),
      {
        onNone: () => "",
        onSome: (column) => column.valueOf(row),
      },
    );

const rowSelectionOf = (
  state: SelectionState,
): Readonly<Record<string, true>> =>
  R.fromEntries(
    Arr.map(Arr.fromIterable(state.selected), (key) => [key, true] as const),
  );

export const useTable = <Row extends RowData>({
  rows,
  keyOf,
  columns,
  hiddenColumns,
  filterTree,
  stored,
  initialSort,
  pageSize,
}: UseTableOptions<Row>): TableController<Row> => {
  const start = useMemo(() => readGridState(stored), [stored]);
  const [sorting, setSorting] = useState<SortingState>(() =>
    openingSorting(start.sorting, Option.fromNullishOr(initialSort)),
  );
  const [query, setQuery] = useState(start.globalFilter);
  const [rowSelection, setRowSelection] = useState<
    Readonly<Record<string, true>>
  >(start.rowSelection);

  const [pagination, setPagination] = useState<PaginationState>(() => ({
    pageIndex: start.pagination.pageIndex,
    pageSize:
      pageSize === undefined ? start.pagination.pageSize : pageSizeOf(pageSize),
  }));

  const [pageTree, setPageTree] = useState<unknown>(filterTree);
  const askedPageIndex = pageTree === filterTree ? pagination.pageIndex : 0;

  const [anchor, setAnchor] = useState<Option.Option<string>>(Option.none());

  const records = useMemo(() => listOf(rows), [rows]);

  const source = useMemo(
    () =>
      Option.match(Option.fromNullishOr(filterTree), {
        onNone: () => records,
        onSome: (tree) => filterByTree(records, tree, fieldValueOf(columns)),
      }),
    [records, filterTree, columns],
  );

  const updatePage = useCallback(
    (updater: (current: PaginationState) => PaginationState) => {
      setPageTree(filterTree);
      setPagination(updater);
    },
    [filterTree],
  );
  const writePage = useCallback(
    (next: PaginationState) => {
      setPageTree(filterTree);
      setPagination(next);
    },
    [filterTree],
  );
  const firstPage = useCallback(
    () =>
      updatePage((current) =>
        current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
      ),
    [updatePage],
  );
  const writeQuery = useCallback(
    (next: string) => {
      setQuery(next);
      firstPage();
    },
    [firstPage],
  );
  const writeSorting = useCallback(
    (next: SortingState) => {
      setSorting(next);
      firstPage();
    },
    [firstPage],
  );

  const built = useMemo(() => {
    const build = (pageIndex: number) =>
      constructGrid({
        rows: source,
        keyOf,
        columns,
        hiddenColumns,
        state: {
          sorting,
          globalFilter: query,
          rowSelection,
          pagination: { pageIndex, pageSize: pagination.pageSize },
        },
        onSortingChange: writeSorting,
        onGlobalFilterChange: writeQuery,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: writePage,
      });
    const first = build(askedPageIndex);
    const rowCount = first.getPrePaginatedRowModel().rows.length;
    const pageIndex = clampPageIndex(
      askedPageIndex,
      rowCount,
      pagination.pageSize,
    );
    return {
      table: pageIndex === askedPageIndex ? first : build(pageIndex),
      pageIndex,
      pageCount: pageCountOf(rowCount, pagination.pageSize),
      rowCount,
    };
  }, [
    source,
    keyOf,
    columns,
    hiddenColumns,
    sorting,
    query,
    rowSelection,
    askedPageIndex,
    pagination.pageSize,
    writeSorting,
    writeQuery,
    writePage,
  ]);
  const table = built.table;

  const painted = table.getRowModel().rows;

  const order = useMemo(
    () => retainSorting(sorting, columns),
    [sorting, columns],
  );
  const visible = useMemo(
    () => Arr.map(painted, (row) => row.original),
    [painted],
  );
  const keys = useMemo(() => Arr.map(painted, (row) => row.id), [painted]);
  const kept = useMemo(
    () => Arr.map(table.getFilteredRowModel().rows, (row) => row.original),
    [table],
  );

  const keptKeys = useMemo(
    () => Arr.map(table.getPrePaginatedRowModel().rows, (row) => row.id),
    [table],
  );

  const chosen = useMemo<SelectionState>(
    () => ({
      selected: HashSet.fromIterable(table.getSelectedRowIds()),
      anchor,
    }),
    [table, anchor],
  );

  const selection = useMemo(
    () => retainSelection(chosen, keptKeys),
    [chosen, keptKeys],
  );

  const write = useCallback((next: SelectionState) => {
    setRowSelection(rowSelectionOf(next));
    setAnchor(next.anchor);
  }, []);

  const sortOrder = sortOrderOf(order);
  const writeSort = useCallback(
    (next: SortOrder) => writeSorting(sortingOfOrder(next)),
    [writeSorting],
  );
  const stepPage = useCallback(
    (delta: number) =>
      updatePage((current) => ({
        ...current,
        pageIndex: clampPageIndex(
          built.pageIndex + delta,
          built.rowCount,
          current.pageSize,
        ),
      })),
    [built.pageIndex, built.rowCount, updatePage],
  );

  const activeKey = useMemo(
    () =>
      Option.filter(currentKey(selection), (key) => Arr.contains(keys, key)),
    [selection, keys],
  );

  return {
    rows: visible,
    keys,
    kept,
    table,
    sort: sortOf(order),
    sortOrder,
    query,
    selection,
    selectedCount: selectionSize(selection),
    allSelected: allSelected(selection, keys),
    someSelected: someSelected(selection, keys),
    pageIndex: built.pageIndex,
    pageCount: built.pageCount,
    pageSize: pagination.pageSize,
    setPageIndex: (pageIndex) =>
      updatePage((current) => ({
        ...current,
        pageIndex: clampPageIndex(pageIndex, built.rowCount, current.pageSize),
      })),
    setPageSize: (next) =>
      updatePage((current) =>
        withPageSize(
          { pageIndex: built.pageIndex, pageSize: current.pageSize },
          next,
        ),
      ),
    nextPage: () => stepPage(1),
    previousPage: () => stepPage(-1),
    activeKey,
    tabStop: Option.orElse(activeKey, () => Arr.head(keys)),
    save: () =>
      gridConfig({
        sorting: order,
        globalFilter: query,
        rowSelection,
        pagination: {
          pageIndex: built.pageIndex,
          pageSize: pagination.pageSize,
        },
      }),
    setSort: (next) => writeSorting(sortingOf(next)),
    toggleSort: (field, additive = false) =>
      writeSort(pressSortOrder(sortOrder, field, "asc", additive)),
    pressSort: (field, initialDirection, modifiers) =>
      writeSort(
        pressSortOrder(
          sortOrder,
          field,
          initialDirection,
          modifiers?.shift === true,
        ),
      ),
    setQuery: writeQuery,
    press: (key, modifiers) =>
      write(pressSelection(chosen, key, pressMode(modifiers), keys)),
    pressRow: (row, modifiers) =>
      write(pressSelection(chosen, keyOf(row), pressMode(modifiers), keys)),
    toggleSelection: (key) =>
      write(pressSelection(chosen, key, "toggle", keys)),
    setAllSelected: (selected) =>
      write(selected ? selectAll(chosen, keys) : clearSelection(chosen)),
    selectAllRows: () => write(selectAll(chosen, keys)),
    clear: () => write(clearSelection(chosen)),
    move: (delta) => write(moveSelection(chosen, keys, delta)),
    isSelected: (key) => isSelected(selection, key),
  };
};
