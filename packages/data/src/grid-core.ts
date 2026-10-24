/**
 * The TanStack Table core a grid's state runs on.
 *
 * A data grid is state, not markup: sorting, the filtered order, the chosen
 * records and (later) grouping and pagination are row models over one data
 * array. `@tanstack/table-core` owns those models; this package owns the GPUix
 * renderer and the interaction rules a window measured (the press cycle, the
 * pointer gestures, the tab stop). Registering the features once, statically,
 * is the core's own rule — a features object re-created per render invalidates
 * every memoised model.
 *
 * The table is built with **controlled** state: React holds each slice and the
 * core derives the row models from it. That is the core's documented
 * non-reactive path — it needs no store subscription, no adapter package and
 * no DOM, which is what a GPUix window is.
 *
 * ```ts
 * const table = constructGrid({ rows, keyOf, columns, sorting, globalFilter, rowSelection, onChange });
 * table.getRowModel().rows; // filtered, then sorted
 * ```
 */

import {
  columnFilteringFeature,
  constructTable,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  functionalUpdate,
  globalFilteringFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
  type ColumnDef,
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

/**
 * The features every grid registers.
 *
 * A stock bundle would be shorter and would carry every feature's cost into
 * every consumer; these five are the ones the controller drives. Filtering is
 * registered for its **global** filter (the field above the rows), and its
 * `columnFilteringFeature` prerequisite carries the filter function registry.
 */
export const gridFeatures = tableFeatures({
  coreReactivityFeature: storeReactivityBindings(),
  columnFilteringFeature,
  globalFilteringFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { basic: sortFn_basic },
});

/** A grid table over one row type. */
export type GridTable<Row extends RowData> = Table<typeof gridFeatures, Row>;

/** One column of the row model: an id and the value it sorts and filters by. */
export interface GridColumn<Row> {
  readonly id: string;
  readonly valueOf: (row: Row) => string | number;
}

/** The state slices the controller holds and the core reads. */
export interface GridState {
  readonly sorting: SortingState;
  readonly globalFilter: string;
  readonly rowSelection: Readonly<Record<string, true>>;
}

/** A sorting entry a store wrote: a column id, and its direction when it had one. */
class StoredSort extends Schema.Class<StoredSort>("StoredSort")({
  id: Schema.String,
  desc: Schema.optionalKey(Schema.Boolean),
}) {}

const decodeStoredSort = Schema.decodeUnknownOption(StoredSort);

/** A record a store wrote, read as its keys and whatever they carry. */
const StoredRecord = Schema.Record(Schema.String, Schema.Unknown);

const decodeStoredRecord = Schema.decodeUnknownOption(StoredRecord);

/** The record a store wrote, or an empty one when it wrote something else. */
const storedRecord = (stored: unknown): Record<string, unknown> =>
  Option.getOrElse(decodeStoredRecord(stored), () =>
    R.empty<string, unknown>(),
  );

/** One slice of a stored record, or absence when the key is not there. */
const storedSlice = (record: Record<string, unknown>, key: string): unknown =>
  Option.getOrUndefined(R.get(record, key));

/** The sorting list a store wrote: the entries that name a column, in order. */
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

/** The query a store wrote: text, or no query at all. */
const storedQuery = (stored: unknown): string =>
  P.isString(stored) ? stored : "";

/** The chosen ids a store wrote: the ones it set to `true`. */
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

/**
 * A grid state a store handed back, read as the shape the core takes.
 *
 * `constructGrid` is the seam an Effect- or store-driven grid builds its table
 * with, so the state is **stored data** as often as it is React state: a saved
 * workspace restores its sorting, its query and its chosen ids in one record,
 * and JSON writes a field that was never set as `null`. Measured before this
 * read: `globalFilter: null` threw `Cannot read properties of null (reading
 * 'trim')` out of the first build and `sorting: null` threw `state.sorting is
 * not iterable`, while an entry that named no column threw
 * `Cannot read properties of null (reading 'id')` — a grid that remembered its
 * state could not reopen at all.
 *
 * Each slice is read, not dereferenced: a sorting list that is not a list is
 * **no sort** (the source order) and an entry that names no column is dropped,
 * a query that is not text is **no query** (nothing narrowed the set), and a
 * chosen set keeps only the ids the store set to `true`. A `hiddenColumns`
 * list follows the same rule: one that is not a list hides nothing. A sorting
 * entry that names a column **this grid does not hold** is dropped when the
 * table is built ({@link retainSorting}), because only the column list knows
 * which ids still exist.
 */
export const readGridState = (stored: unknown): GridState => {
  const record = storedRecord(stored);
  return {
    sorting: storedSorting(storedSlice(record, "sorting")),
    globalFilter: storedQuery(storedSlice(record, "globalFilter")),
    rowSelection: storedChosen(storedSlice(record, "rowSelection")),
  };
};

/** The visible-column opt-outs a store wrote: only text ids are ids. */
const storedIds = (stored: unknown): ReadonlyArray<string> =>
  Arr.isArray(stored) ? Arr.filter(stored, P.isString) : [];

/**
 * The sorting entries this grid can run.
 *
 * A saved order names the columns of the release that wrote it, and a column
 * set outlives the release: a renamed or dropped column leaves an entry no
 * header paints. The core skips such an entry — there is no column to compare —
 * but the controller still counted it, so a Shift press on a live column
 * announced "sort 2 of 2" above one sort and `sortOrder` named a field that does
 * not exist. Dropping it here keeps the row model, the headers and every
 * readout on the same order.
 */
export const retainSorting = <Row>(
  sorting: SortingState,
  columns: ReadonlyArray<GridColumn<Row>>,
): SortingState =>
  Arr.filter(sorting, (entry) =>
    Arr.some(columns, (column) => column.id === entry.id),
  );

/**
 * The state to persist: the sorting, the query and the chosen ids.
 *
 * The inverse of {@link readGridState}, and the shape a store keeps beside
 * `columnConfig`'s: a workspace writes it, hands it back as `useTable`'s
 * `stored` or `constructGrid`'s `state`, and the grid reopens as it was left.
 * The record is written from the reader's own normalisation and holds copies, so
 * a store can serialise it without aliasing the arrays the controller paints
 * from.
 */
export interface GridConfig {
  readonly sorting: SortingState;
  readonly globalFilter: string;
  readonly rowSelection: Readonly<Record<string, true>>;
}

/** Write the record a store keeps for one grid. */
export const gridConfig = (state: GridState): GridConfig => {
  const current = readGridState(state);
  return {
    sorting: Arr.map(current.sorting, (entry) => ({
      id: entry.id,
      desc: entry.desc,
    })),
    globalFilter: current.globalFilter,
    rowSelection: R.map(current.rowSelection, () => true as const),
  };
};

/** How a grid reports a slice the core changed through its own API. */
export interface GridChange {
  readonly onSortingChange: (next: SortingState) => void;
  readonly onGlobalFilterChange: (next: string) => void;
  readonly onRowSelectionChange: (next: Readonly<Record<string, true>>) => void;
}

/** What {@link constructGrid} needs. */
export interface ConstructGridOptions<Row> extends GridChange {
  readonly rows: ReadonlyArray<Row>;
  readonly keyOf: (row: Row) => string;
  readonly columns: ReadonlyArray<GridColumn<Row>>;
  /**
   * The ids of columns the caller has hidden.
   *
   * A hidden column is still **sorted** — the order belongs to the records, and
   * hiding the column a reader sorted by must not silently restore the source
   * order. It is not **searched**: a row kept by text no painted cell shows
   * reads as a filter that does not work. The list is read as data: one that is
   * not a list of text ids hides nothing.
   */
  readonly hiddenColumns?: ReadonlyArray<string>;
  /**
   * The controlled state the core derives its row models from.
   *
   * It is read through {@link readGridState}, so a record a store restored — a
   * `null` slice, a sorting entry that names no column — reads as the absence it
   * is rather than taking the build down. A consumer that decodes before holding
   * it can call the same function at its own boundary.
   */
  readonly state: GridState;
}

/**
 * The column definitions the core sorts and filters by.
 *
 * `sortFn: "basic"` is the registered comparator: numbers numerically, text by
 * code unit — the order the probes measured, not the core's natural-sort
 * default. The global filter reads these same accessors, so the field above the
 * rows searches what the columns show: a hidden column opts out of the global
 * filter while keeping its sort.
 */
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

/**
 * Build the table for one state.
 *
 * Rebuilt whenever the state, the rows or the columns change: the core is a
 * pure function of them, and a grid's state changes on a press, not per frame —
 * a wheel or a window move re-renders the parts without re-running a model.
 *
 * The state is read through {@link readGridState} first, so a restored record
 * narrows and sorts the set instead of taking the renderer down; the callbacks'
 * own fallback is that same read, so an updater never receives a slice the core
 * could not read.
 */
export const constructGrid = <Row extends RowData>({
  rows,
  keyOf,
  columns,
  hiddenColumns,
  state,
  onSortingChange,
  onGlobalFilterChange,
  onRowSelectionChange,
}: ConstructGridOptions<Row>): GridTable<Row> => {
  const current = readGridState(state);
  return constructTable({
    features: gridFeatures,
    columns: columnDefs(
      columns,
      HashSet.fromIterable(storedIds(hiddenColumns)),
    ),
    data: rows,
    getRowId: keyOf,
    /**
     * The field's text is trimmed before it narrows the set: a query of spaces
     * is empty, and clearing the field restores the rows rather than painting
     * an empty table (`table-filter-lifecycle`).
     */
    state: {
      sorting: [...retainSorting(current.sorting, columns)],
      globalFilter: current.globalFilter.trim(),
      rowSelection: current.rowSelection,
    },
    globalFilterFn: "includesString",
    onSortingChange: (updater) =>
      onSortingChange(functionalUpdate(updater, current.sorting)),
    onGlobalFilterChange: (updater) =>
      onGlobalFilterChange(functionalUpdate(updater, current.globalFilter)),
    onRowSelectionChange: (updater) =>
      onRowSelectionChange(functionalUpdate(updater, current.rowSelection)),
  });
};
