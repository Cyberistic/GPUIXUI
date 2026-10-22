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
  readonly state: GridState;
}

/**
 * The column definitions the core sorts and filters by.
 *
 * `sortFn: "basic"` is the registered comparator: numbers numerically, text by
 * code unit — the order the probes measured, not the core's natural-sort
 * default. The global filter reads these same accessors, so the field above the
 * rows searches what the columns show.
 */
const columnDefs = <Row extends RowData>(
  columns: ReadonlyArray<GridColumn<Row>>,
): ReadonlyArray<ColumnDef<typeof gridFeatures, Row>> =>
  columns.map((column) => ({
    id: column.id,
    accessorFn: column.valueOf,
    sortFn: "basic" as const,
  }));

/**
 * Build the table for one state.
 *
 * Rebuilt whenever the state, the rows or the columns change: the core is a
 * pure function of them, and a grid's state changes on a press, not per frame —
 * a wheel or a window move re-renders the parts without re-running a model.
 */
export const constructGrid = <Row extends RowData>({
  rows,
  keyOf,
  columns,
  state,
  onSortingChange,
  onGlobalFilterChange,
  onRowSelectionChange,
}: ConstructGridOptions<Row>): GridTable<Row> =>
  constructTable({
    features: gridFeatures,
    columns: columnDefs(columns),
    data: rows,
    getRowId: keyOf,
    /**
     * The field's text is trimmed before it narrows the set: a query of spaces
     * is empty, and clearing the field restores the rows rather than painting
     * an empty table (`table-filter-lifecycle`).
     */
    state: {
      sorting: [...state.sorting],
      globalFilter: state.globalFilter.trim(),
      rowSelection: state.rowSelection,
    },
    globalFilterFn: "includesString",
    onSortingChange: (updater) =>
      onSortingChange(functionalUpdate(updater, state.sorting)),
    onGlobalFilterChange: (updater) =>
      onGlobalFilterChange(functionalUpdate(updater, state.globalFilter)),
    onRowSelectionChange: (updater) =>
      onRowSelectionChange(functionalUpdate(updater, state.rowSelection)),
  });
