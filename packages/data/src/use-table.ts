/**
 * The table controller: the grid's state over one row array.
 *
 * Sorting, the filtered order and the chosen records are **row models**, so
 * they run on `@tanstack/table-core` (`grid-core.ts`) rather than in a reducer
 * of this package's own. React still owns the state slices — the core reads
 * them as controlled state and derives the models — which keeps a GPUix window
 * out of the store-and-subscription path a browser adapter takes.
 *
 * What stays here is the part a window measured and a headless core cannot
 * know: the press cycle a header reports, the pointer gesture a chord means
 * (`selection/logic`), the render-time release a filter owes a selection, and
 * the arrow walk that moves native focus with the cursor. The checkbox column
 * reads the same state: `allSelected`/`someSelected` are computed over the
 * painted keys, and `toggleSelection`/`setAllSelected` write it.
 *
 * The grid is **one stop in the Tab order** and the stop always exists:
 * `tabStop` is the chosen record, or the first painted row when nothing is
 * chosen. A tab stop that waited for a pointer press left a fresh table out of
 * the Tab order entirely, and a filter that releases the chosen record removed
 * the stop the reader was standing on — measured by
 * `src/behaviour/table.test.tsx` through the renderer's own `focusNext`.
 *
 * The order a reader expects: narrow first, then sort the narrowed set, and
 * measure a Shift range over what is painted. Sorting is an **order**, not a
 * field: a plain header press replaces it and a Shift press adds the column as
 * the next tie-break (or flips it where it sits), so records the primary sort
 * ties are decided by the second. The search reads the **painted**
 * columns: pass the columns a reader has hidden (`useColumns().hidden`) as
 * `hiddenColumns`, and a record is never kept by text no cell shows — while a
 * sort on the hidden column still orders the set. A filter that hides a chosen
 * record releases it in the same commit, so no frame shows a selection the
 * table cannot paint — the release is **render-time retention**, not a write:
 * the core still holds the record, so a query that widens back to it paints it
 * chosen again. A grid that needs a permanent clear calls `clear()` on the
 * change.
 *
 * ```tsx
 * const columns = [
 *   { id: "name", label: "Name", width: 260, valueOf: (row) => row.name },
 *   { id: "size", label: "Size", width: 90, valueOf: (row) => row.size },
 * ];
 * const table = useTable({ rows, keyOf: (row) => row.id, columns });
 *
 * <TableFilterField value={table.query} onValueChange={table.setQuery} />
 * <Table height={360}>
 *   <TableViewport>
 *     <TableHeader>
 *       <TableRow>
 *         <TableSortHeader field="name" label="Name" sort={table.sort} onSort={table.setSort} />
 *       </TableRow>
 *     </TableHeader>
 *     <TableBody>
 *       {table.rows.map((row) => (
 *         <TableRow
 *           key={row.id}
 *           selected={table.isSelected(row.id)}
 *           onClick={(event) => table.press(row.id, event.modifiers)}
 *         >
 *           ...
 *         </TableRow>
 *       ))}
 *     </TableBody>
 *   </TableViewport>
 * </Table>;
 * ```
 */

import type { EventModifiers } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { useCallback, useMemo, useState } from "react";
import type { RowData, SortingState } from "@tanstack/table-core";
import { constructGrid, type GridColumn, type GridTable } from "./grid-core.js";
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

/** What the hook needs to know about a row. */
export interface UseTableOptions<Row extends RowData> {
  readonly rows: ReadonlyArray<Row>;
  /** The stable record key a selection is kept by. */
  readonly keyOf: (row: Row) => string;
  /**
   * The columns the core sorts and filters by — the same list the header and
   * the rows paint. A grid keeps **one** list, so a hidden or moved column
   * cannot leave the row model on a second copy of the layout.
   */
  readonly columns: ReadonlyArray<GridColumn<Row>>;
  /**
   * The ids of columns the caller has hidden — `useColumns`' `hidden` list.
   *
   * A hidden column keeps its sort but leaves the search, so the field above
   * the rows never keeps a record by text no painted cell shows. Pass a list
   * whose identity changes only when visibility does: the controller's
   * `hidden` is memoised for exactly that, and a fresh array on every render
   * rebuilds the core's row models with it.
   */
  readonly hiddenColumns?: ReadonlyArray<string>;
  /** Start sorted, for a table whose natural order is not the source order. */
  readonly initialSort?: SortState;
}

/** Everything a table's parts read from {@link useTable}. */
export interface TableController<Row extends RowData> {
  /** The painted rows, narrowed, then sorted by every field in the order. */
  readonly rows: ReadonlyArray<Row>;
  /** The visible keys, in paint order — what a Shift range spans. */
  readonly keys: ReadonlyArray<string>;
  /** The primary sort, for a single-sort header or a readout. */
  readonly sort: Option.Option<SortState>;
  /**
   * The whole order, primary first.
   *
   * One entry is the ordinary sort. A Shift press on a header appends a
   * tie-break (or flips the field where it already sits), and the row model
   * walks the entries in turn, so records the first sort ties are ordered by
   * the second.
   */
  readonly sortOrder: SortOrder;
  readonly query: string;
  readonly selection: SelectionState;
  /** The rows the current query keeps, before sorting. */
  readonly kept: ReadonlyArray<Row>;
  /** How many records are chosen. */
  readonly selectedCount: number;
  /** Every visible record is chosen — the header checkbox's checked state. */
  readonly allSelected: boolean;
  /** Some visible records are chosen — the header checkbox's mixed state. */
  readonly someSelected: boolean;
  /** The chosen record, when one is chosen: what a focus-follow effect reads. */
  readonly activeKey: Option.Option<string>;
  /**
   * The record that owns the roving tab stop: the chosen one, or the first
   * painted row when nothing is chosen.
   *
   * A grid is a single stop in the Tab order, and its stop must exist before a
   * pointer press chooses a record — otherwise Tab from the toolbar skips the
   * rows entirely, and a filter that releases the chosen record removes the
   * stop a keyboard reader was standing on.
   */
  readonly tabStop: Option.Option<string>;
  /** The core table the controller runs on, for a consumer that needs more. */
  readonly table: GridTable<Row>;
  readonly setSort: (next: Option.Option<SortState>) => void;
  /**
   * The next sort for one field.
   *
   * `additive` is the Shift gesture: keep the order and flip the field where
   * it sits, or append it as the next tie-break.
   */
  readonly toggleSort: (field: string, additive?: boolean) => void;
  /**
   * The order a header press reports.
   *
   * The header hands over the field, its first-press direction and the
   * runtime's modifiers; a Shift press composes a multi-column order. This is
   * the callback {@link TableSortHeader}`'s` `onSortPress` receives.
   */
  readonly pressSort: (
    field: string,
    initialDirection: SortDirection,
    modifiers?: EventModifiers,
  ) => void;
  readonly setQuery: (query: string) => void;
  readonly press: (key: string, modifiers?: EventModifiers) => void;
  readonly pressRow: (row: Row, modifiers?: EventModifiers) => void;
  /** Flip one record from its checkbox, without disturbing the rest of the set. */
  readonly toggleSelection: (key: string) => void;
  /** Choose every visible record, or clear the set — the header checkbox. */
  readonly setAllSelected: (selected: boolean) => void;
  readonly selectAllRows: () => void;
  readonly clear: () => void;
  readonly move: (delta: number) => void;
  readonly isSelected: (key: string) => boolean;
}

/** The core's sorting state for an order, primary first. */
const sortingOfOrder = (order: SortOrder): SortingState =>
  Arr.map(order, (state) => ({
    id: state.field,
    desc: state.direction === "desc",
  }));

/** The core's sorting state for the press cycle's single sort. */
const sortingOf = (sort: Option.Option<SortState>): SortingState =>
  sortingOfOrder(Option.toArray(sort));

/** The press cycle's primary sort, read back off the core's state. */
const sortOf = (sorting: SortingState): Option.Option<SortState> =>
  Option.map(Option.fromNullishOr(sorting[0]), (column) => ({
    field: column.id,
    direction: column.desc ? "desc" : "asc",
  }));

/** The whole order, read back off the core's state. */
const sortOrderOf = (sorting: SortingState): SortOrder =>
  Arr.map(sorting, (column) => ({
    field: column.id,
    direction: column.desc ? "desc" : "asc",
  }));

/** A chosen set in the core's record shape. */
const rowSelectionOf = (
  state: SelectionState,
): Readonly<Record<string, true>> =>
  R.fromEntries(
    Arr.map(Arr.fromIterable(state.selected), (key) => [key, true] as const),
  );

/**
 * Hold a table's query, sort and selection.
 *
 * Controlled consumers that already own one of the three can construct the
 * core table themselves (`constructGrid`) and keep the parts.
 */
export const useTable = <Row extends RowData>({
  rows,
  keyOf,
  columns,
  hiddenColumns,
  initialSort,
}: UseTableOptions<Row>): TableController<Row> => {
  const [sorting, setSorting] = useState<SortingState>(() =>
    sortingOf(Option.fromNullishOr(initialSort)),
  );
  const [query, setQuery] = useState("");
  const [rowSelection, setRowSelection] = useState<
    Readonly<Record<string, true>>
  >({});
  /**
   * The record a Shift range extends from.
   *
   * The core keeps the chosen ids; the anchor is a gesture cursor, not
   * selection — a range press extends **from** it and keeps it, and a filter
   * that hides it drops it.
   */
  const [anchor, setAnchor] = useState<Option.Option<string>>(Option.none());

  const table = useMemo(
    () =>
      constructGrid({
        rows,
        keyOf,
        columns,
        hiddenColumns,
        state: { sorting, globalFilter: query, rowSelection },
        onSortingChange: setSorting,
        onGlobalFilterChange: setQuery,
        onRowSelectionChange: setRowSelection,
      }),
    [rows, keyOf, columns, hiddenColumns, sorting, query, rowSelection],
  );

  const painted = table.getRowModel().rows;
  const visible = useMemo(
    () => Arr.map(painted, (row) => row.original),
    [painted],
  );
  const keys = useMemo(() => Arr.map(painted, (row) => row.id), [painted]);
  const kept = useMemo(
    () => Arr.map(table.getFilteredRowModel().rows, (row) => row.original),
    [table],
  );

  /**
   * The chosen records, before the visible set releases what it hides.
   *
   * Retention is a **view**, not a write: the ids stay in the core's state, so
   * a query that widens back to a released record paints it chosen again.
   */
  const chosen = useMemo<SelectionState>(
    () => ({
      selected: HashSet.fromIterable(table.getSelectedRowIds()),
      anchor,
    }),
    [table, anchor],
  );

  // A narrowed set releases the records it no longer shows **during render**,
  // not in an effect: the first frame after a query change already paints the
  // released selection, and the next press starts from it.
  const selection = useMemo(
    () => retainSelection(chosen, keys),
    [chosen, keys],
  );

  const write = useCallback((next: SelectionState) => {
    setRowSelection(rowSelectionOf(next));
    setAnchor(next.anchor);
  }, []);

  const sortOrder = sortOrderOf(sorting);
  const writeSort = useCallback(
    (order: SortOrder) => setSorting(sortingOfOrder(order)),
    [],
  );

  return {
    rows: visible,
    keys,
    kept,
    table,
    sort: sortOf(sorting),
    sortOrder,
    query,
    selection,
    selectedCount: selectionSize(selection),
    allSelected: allSelected(selection, keys),
    someSelected: someSelected(selection, keys),
    activeKey: currentKey(selection),
    tabStop: Option.orElse(currentKey(selection), () => Arr.head(keys)),
    setSort: (next) => setSorting(sortingOf(next)),
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
    setQuery,
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
