import {
  columnFilteringFeature,
  constructTable,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  functionalUpdate,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type SortingState,
  type Table,
} from "@tanstack/table-core";
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as R from "effect/Record";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { rowsOf } from "./internal/list.js";
import { readPagination } from "./pagination/logic.js";

export const gridFeatures = tableFeatures({
  coreReactivityFeature: storeReactivityBindings(),
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { basic: sortFn_basic },
});

export type GridTable<Row extends RowData> = Table<typeof gridFeatures, Row>;

export interface GridColumn<Row> {
  readonly id: string;
  readonly valueOf: (row: Row) => string | number;
}

export interface GridState {
  readonly sorting: SortingState;
  readonly globalFilter: string;
  readonly rowSelection: Readonly<Record<string, true>>;

  readonly pagination?: PaginationState;
}

export type RestoredGridState = GridState & {
  readonly pagination: PaginationState;
};

class StoredSort extends Schema.Class<StoredSort>("StoredSort")({
  id: Schema.String,
  desc: Schema.optionalKey(Schema.Boolean),
}) {}

const decodeStoredSort = Schema.decodeUnknownOption(StoredSort);

const StoredRecord = Schema.Record(Schema.String, Schema.Unknown);

const decodeStoredRecord = Schema.decodeUnknownOption(StoredRecord);

const storedRecord = (stored: unknown): Record<string, unknown> =>
  Option.getOrElse(decodeStoredRecord(stored), () =>
    R.empty<string, unknown>(),
  );

const storedSlice = (record: Record<string, unknown>, key: string): unknown =>
  Option.getOrUndefined(R.get(record, key));

const storedSorting = (stored: unknown): SortingState =>
  Arr.isArray(stored)
    ? Arr.map(
        Arr.getSomes(Arr.map(stored, (entry) => decodeStoredSort(entry))),
        (entry) => ({
          id: entry.id,
          desc: entry.desc === true,
        }),
      )
    : [];

const storedQuery = (stored: unknown): string =>
  P.isString(stored) ? stored : "";

const storedChosen = (stored: unknown): Readonly<Record<string, true>> =>
  Option.match(decodeStoredRecord(stored), {
    onNone: () => ({}),
    onSome: (record) =>
      R.fromEntries(
        Arr.filterMap(R.toEntries(record), ([key, value]) =>
          value === true
            ? Result.succeed([key, true] as const)
            : Result.failVoid,
        ),
      ),
  });

export const readGridState = (stored: unknown): RestoredGridState => {
  const record = storedRecord(stored);
  return {
    sorting: storedSorting(storedSlice(record, "sorting")),
    globalFilter: storedQuery(storedSlice(record, "globalFilter")),
    rowSelection: storedChosen(storedSlice(record, "rowSelection")),
    pagination: readPagination(storedSlice(record, "pagination")),
  };
};

const storedIds = (stored: unknown): ReadonlyArray<string> =>
  Arr.isArray(stored) ? Arr.filter(stored, P.isString) : [];

export const retainSorting = <Row>(
  sorting: SortingState,
  columns: ReadonlyArray<GridColumn<Row>>,
): SortingState =>
  Arr.filter(sorting, (entry) =>
    Arr.some(columns, (column) => column.id === entry.id),
  );

export interface GridConfig {
  readonly sorting: SortingState;
  readonly globalFilter: string;
  readonly rowSelection: Readonly<Record<string, true>>;
  readonly pagination: PaginationState;
}

export const gridConfig = (state: GridState): GridConfig => {
  const current = readGridState(state);
  return {
    sorting: Arr.map(current.sorting, (entry) => ({
      id: entry.id,
      desc: entry.desc,
    })),
    globalFilter: current.globalFilter,
    rowSelection: R.map(current.rowSelection, () => true as const),
    pagination: {
      pageIndex: current.pagination.pageIndex,
      pageSize: current.pagination.pageSize,
    },
  };
};

export interface GridChange {
  readonly onSortingChange: (next: SortingState) => void;
  readonly onGlobalFilterChange: (next: string) => void;
  readonly onRowSelectionChange: (next: Readonly<Record<string, true>>) => void;

  readonly onPaginationChange?: (next: PaginationState) => void;
}

export interface ConstructGridOptions<Row> extends GridChange {
  readonly rows: ReadonlyArray<Row>;
  readonly keyOf: (row: Row) => string;
  readonly columns: ReadonlyArray<GridColumn<Row>>;

  readonly hiddenColumns?: ReadonlyArray<string>;

  readonly state: GridState;
}

const columnDefs = <Row extends RowData>(
  columns: ReadonlyArray<GridColumn<Row>>,
  hidden: HashSet.HashSet<string>,
): ReadonlyArray<ColumnDef<typeof gridFeatures, Row>> =>
  columns.map((column) => ({
    id: column.id,
    accessorFn: column.valueOf,
    sortFn: "basic" as const,
    enableGlobalFilter: !HashSet.has(hidden, column.id),
  }));

export const constructGrid = <Row extends RowData>({
  rows,
  keyOf,
  columns,
  hiddenColumns,
  state,
  onSortingChange,
  onGlobalFilterChange,
  onRowSelectionChange,
  onPaginationChange,
}: ConstructGridOptions<Row>): GridTable<Row> => {
  const current = readGridState(state);
  return constructTable({
    features: gridFeatures,
    columns: columnDefs(
      columns,
      HashSet.fromIterable(storedIds(hiddenColumns)),
    ),
    data: rowsOf(rows, keyOf),
    getRowId: keyOf,

    state: {
      sorting: [...retainSorting(current.sorting, columns)],
      globalFilter: current.globalFilter.trim(),
      rowSelection: current.rowSelection,
      pagination: current.pagination,
    },
    autoResetPageIndex: false,
    globalFilterFn: "includesString",
    onSortingChange: (updater) =>
      onSortingChange(functionalUpdate(updater, current.sorting)),
    onGlobalFilterChange: (updater) =>
      onGlobalFilterChange(functionalUpdate(updater, current.globalFilter)),
    onRowSelectionChange: (updater) =>
      onRowSelectionChange(functionalUpdate(updater, current.rowSelection)),
    onPaginationChange: (updater) =>
      onPaginationChange?.(functionalUpdate(updater, current.pagination)),
  });
};
