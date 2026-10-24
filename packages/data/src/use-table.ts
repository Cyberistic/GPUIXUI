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
 * change. An **advanced filter's predicate tree** narrows the same set before
 * the query does (`filterTree`), read through the columns the grid paints via
 * {@link fieldValueOf}: one tree shape serves the builder, a saved query and
 * the table.
 *
 * A **page** is the last view over that set: the filtered and sorted rows are
 * sliced by the core's pagination model, so `rows`/`keys` are the page while
 * `kept` and the selection are the whole kept set. A filter, a search or a new
 * sort returns to the first page (the rows the reader was on are not where the
 * index says they are), a page index past a narrowed set clamps to its last
 * page, and a page size change keeps the reader's top row in view. The chosen
 * ids are not per page, so a record chosen on page one is still chosen — and
 * still saved — while page two paints.
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
  /**
   * A predicate tree that narrows the records before the text query does —
   * `AdvancedFilter`'s tree, read through the same columns the grid paints.
   *
   * The tree is the caller's, so the builder that composes it and the grid that
   * runs it read one shape. A chosen record the tree hides is released during
   * render by the retention a query already gets, and a tree that keeps it
   * again paints it chosen (the core keeps the id). Pass a tree whose identity
   * changes only when the query does: a fresh object on every render rebuilds
   * the row models.
   *
   * A saved query is data: `null`/`undefined` means **no filter**, while a tree
   * this release cannot read (an unknown comparison or node, a missing child)
   * keeps no row rather than throwing or showing every record — see
   * `readFilterTree`.
   */
  readonly filterTree?: FilterTree;
  /**
   * A state a store handed back — sorting, query, chosen ids and page in one
   * record.
   *
   * Read **once, at mount**, through `readGridState`, the seam a store-driven
   * grid already uses: a saved workspace reopens a grid sorted, narrowed and
   * chosen the way the reader left it, and a record this release cannot read
   * reads as the slice it can — a sorting list that is not a list is no sort, an
   * entry that names no column is dropped, a query that is not text is no query,
   * and a chosen set keeps only the ids set to `true`. A later edit is the
   * controller's state; the record is not re-read.
   *
   * `initialSort` is the sorting shorthand, used only when the saved record
   * names no sorting of its own.
   */
  readonly stored?: unknown;
  /** Start sorted, for a table whose natural order is not the source order. */
  readonly initialSort?: SortState;
  /**
   * How many rows one page paints.
   *
   * Omit it for **one page holding every filtered row** — the table earlier
   * releases shipped, and what `stored` names when the saved grid had no page
   * size. A size the grid cannot lay out (`NaN`, zero, a negative) is that one
   * page too, because a page of no row paints nothing.
   *
   * The page a reader is on is controller state, not an option: `pageIndex`,
   * `pageCount`, `setPageIndex`, `setPageSize`, `nextPage` and `previousPage`
   * are the API, and `save()` writes the page so a workspace reopens on it.
   */
  readonly pageSize?: number;
}

/** Everything a table's parts read from {@link useTable}. */
export interface TableController<Row extends RowData> {
  /**
   * The painted rows: narrowed by the tree and the query, sorted by every field
   * in the order, and then sliced to the page.
   */
  readonly rows: ReadonlyArray<Row>;
  /**
   * The visible keys, in paint order — what a Shift range spans.
   *
   * It is the **page**, not the kept set: a range extends over the records the
   * reader can see, and a page turn paints a different order.
   */
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
  /** The rows the tree and the current query keep, before sorting or a page. */
  readonly kept: ReadonlyArray<Row>;
  /** How many kept records are chosen — the selection is not per page. */
  readonly selectedCount: number;
  /** Every record on the painted page is chosen — the header checkbox's state. */
  readonly allSelected: boolean;
  /** Some record on the painted page is chosen — the header checkbox's mixed state. */
  readonly someSelected: boolean;
  /**
   * The page the grid paints, clamped to the pages the kept set holds.
   *
   * It is a **view**: a saved index past the end of a narrowed set clamps to
   * the last page, so the grid paints rows instead of a blank page. The stored
   * index is not rewritten, the same rule the selection's retention follows.
   */
  readonly pageIndex: number;
  /**
   * How many pages the kept set holds.
   *
   * Never zero: an empty grid paints one page, which its empty state sits on.
   */
  readonly pageCount: number;
  /** How many rows one page paints; every row is `Infinity`. */
  readonly pageSize: number;
  /** Move to a page; an index outside the pages the set holds clamps. */
  readonly setPageIndex: (pageIndex: number) => void;
  /** Change how many rows a page paints, keeping the top row in view. */
  readonly setPageSize: (pageSize: number) => void;
  /** Move to the next page, when the set holds one. */
  readonly nextPage: () => void;
  /** Move to the previous page, when the grid is past the first. */
  readonly previousPage: () => void;
  /**
   * The chosen record **on the painted page**: what a focus-follow effect reads.
   *
   * A record chosen on another page is still in `selection` and `save()`, but
   * no row paints it, so focusing it would target nothing.
   */
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
  /**
   * The record to keep: the sorting, the query, the chosen ids and the page.
   *
   * The chosen ids are the **core's**, not the retained view — a filter hides a
   * chosen record from the paint but does not clear it — so a grid saved while
   * narrowed restores that record when the query widens again. The sort is the
   * order the grid runs, so an entry naming a column this release dropped is
   * not written back. The page is the one the grid paints, clamped, so a
   * workspace reopens on a page the restored set still holds. The range anchor
   * is a gesture cursor, not state: it starts fresh on the next press.
   */
  readonly save: () => GridConfig;
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

/**
 * The sorting a grid opens on.
 *
 * A saved record's own list wins — it is the more specific state, and a caller
 * restoring a workspace should see the order it saved. `initialSort` is the
 * shorthand for a table whose natural order is not the source order, so it
 * applies only when the record names no sorting at all.
 */
const openingSorting = (
  saved: SortingState,
  initialSort: Option.Option<SortState>,
): SortingState => (saved.length > 0 ? saved : sortingOf(initialSort));

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

/**
 * Read a row's field through the column that owns it.
 *
 * A predicate tree names fields by column id while the grid keeps one column
 * list, so this is the seam both read: `AdvancedFilter`'s tree, a saved query
 * and the grid's row model resolve a field the same way. A field no column
 * names reads as blank rather than throwing, so a saved tree that mentions a
 * column the caller has since removed narrows to the records it can decide.
 */
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
  filterTree,
  stored,
  initialSort,
  pageSize,
}: UseTableOptions<Row>): TableController<Row> => {
  // The record a store handed back, read once through the seam a store-driven
  // grid uses. Each starting slice is the saved one; an unreadable record reads
  // as no sort, no query, no chosen ids and the first page of every row
  // (`readGridState`).
  const start = useMemo(() => readGridState(stored), [stored]);
  const [sorting, setSorting] = useState<SortingState>(() =>
    openingSorting(start.sorting, Option.fromNullishOr(initialSort)),
  );
  const [query, setQuery] = useState(start.globalFilter);
  const [rowSelection, setRowSelection] = useState<
    Readonly<Record<string, true>>
  >(start.rowSelection);
  /**
   * The page the grid paints.
   *
   * The caller's `pageSize` is the layout; a saved record's page size is the
   * reader's own choice when the caller names none. The saved index is kept as
   * written and clamped at paint time, so a narrowed set paints its last page
   * without rewriting where the reader was.
   */
  const [pagination, setPagination] = useState<PaginationState>(() => ({
    pageIndex: start.pagination.pageIndex,
    pageSize:
      pageSize === undefined ? start.pagination.pageSize : pageSizeOf(pageSize),
  }));
  /**
   * The record a Shift range extends from.
   *
   * The core keeps the chosen ids; the anchor is a gesture cursor, not
   * selection — a range press extends **from** it and keeps it, and a filter
   * that hides it drops it.
   */
  const [anchor, setAnchor] = useState<Option.Option<string>>(Option.none());

  // The caller's row list is stored data too: a saved workspace restores it
  // from JSON, and `snapshot?.rows` is `undefined` before the snapshot arrives.
  // Read once, so the tree's filter and the core's row models read one list.
  const records = useMemo(() => listOf(rows), [rows]);

  // The tree narrows the records before the core builds its row models, so the
  // text query searches the set the tree kept and the sort orders that same set.
  // A nullish query is no filter; a query this release cannot read keeps no row
  // (the schema refusal in `filterByTree`), never every row.
  const source = useMemo(
    () =>
      Option.match(Option.fromNullishOr(filterTree), {
        onNone: () => records,
        onSome: (tree) => filterByTree(records, tree, fieldValueOf(columns)),
      }),
    [records, filterTree, columns],
  );

  // A page belongs to the set it was measured against: a narrowing or a
  // reorder moves the reader to the first page, because the rows they were
  // reading are not where the page index says they are. The core's own
  // auto-reset is off (`constructGrid`), so this is the one place a filter or a
  // sort changes the page — in the gesture, not inside a row model.
  const firstPage = useCallback(
    () =>
      setPagination((current) =>
        current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
      ),
    [],
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

  /**
   * The table, and the page it can paint.
   *
   * The core slices the filtered and sorted rows by the index it is given, so a
   * stored index past the end would paint no row at all. The pre-paginated model
   * knows the set's size, so the index is clamped against it and the table is
   * rebuilt at that page — once, on a stale record, not per frame.
   */
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
        onPaginationChange: setPagination,
      });
    const first = build(pagination.pageIndex);
    const rowCount = first.getPrePaginatedRowModel().rows.length;
    const pageIndex = clampPageIndex(
      pagination.pageIndex,
      rowCount,
      pagination.pageSize,
    );
    return {
      table: pageIndex === pagination.pageIndex ? first : build(pageIndex),
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
    pagination.pageIndex,
    pagination.pageSize,
    writeSorting,
    writeQuery,
  ]);
  const table = built.table;

  const painted = table.getRowModel().rows;
  /**
   * The order the grid runs: a saved entry naming a column this set dropped is
   * not a sort, and the readouts must not count it (the core already skips it).
   */
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
  /**
   * Every record the query keeps, in the order the grid runs.
   *
   * A page is a view of this set, not a second filter: a record chosen on page
   * one is still chosen while page two paints, so retention reads these keys
   * rather than the page's. The header checkbox reads the page (`keys`).
   */
  const keptKeys = useMemo(
    () => Arr.map(table.getPrePaginatedRowModel().rows, (row) => row.id),
    [table],
  );

  /**
   * The chosen records, before the kept set releases what it hides.
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

  // A narrowed set releases the records it no longer keeps **during render**,
  // not in an effect: the first frame after a query change already paints the
  // released selection, and the next press starts from it.
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
      setPagination((current) => ({
        ...current,
        pageIndex: clampPageIndex(
          current.pageIndex + delta,
          built.rowCount,
          current.pageSize,
        ),
      })),
    [built.rowCount],
  );
  /**
   * The chosen record the painted page holds.
   *
   * A range or a page change can leave the core's chosen record off this page;
   * it stays chosen (and saved), but nothing paints it, so a focus-follow effect
   * must not be handed it.
   */
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
      setPagination((current) => ({
        ...current,
        pageIndex: clampPageIndex(pageIndex, built.rowCount, current.pageSize),
      })),
    setPageSize: (next) =>
      setPagination((current) => withPageSize(current, next)),
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
