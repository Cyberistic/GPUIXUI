/**
 * The table controller: filter, sort and select over one row array.
 *
 * This is the state a data grid owns, in one hook, so a page does not
 * reassemble the rules the probes measured. Every rule lives in the pure
 * modules beside it — `sort/logic`, `selection/logic`, `filter/logic` — and this
 * hook only holds the state and recomputes the visible order.
 *
 * The order it applies is the one a reader expects: narrow first, then sort
 * the narrowed set, and measure a Shift range over what is painted. A filter
 * that hides a chosen record clears it in the same commit, so no frame shows a
 * selection the table cannot paint.
 *
 * ```tsx
 * const table = useTable({ rows, keyOf: (row) => row.id, textOf, valueOf });
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
 *           selected={isSelected(table.selection, row.id)}
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
import * as Option from "effect/Option";
import { useMemo, useState } from "react";
import { filterRows } from "./filter/logic.js";
import {
  clearSelection,
  currentKey,
  emptySelection,
  isSelected,
  moveSelection,
  pressMode,
  pressSelection,
  retainSelection,
  selectAll,
  selectionSize,
  type SelectionState,
} from "./selection/logic.js";
import {
  sortRows,
  toggleSort as nextSort,
  type SortState,
  type SortValue,
} from "./sort/logic.js";

/** What the hook needs to know about a row. */
export interface UseTableOptions<Row> {
  readonly rows: ReadonlyArray<Row>;
  /** The stable record key a selection is kept by. */
  readonly keyOf: (row: Row) => string;
  /** The text a filter query is matched against. */
  readonly textOf: (row: Row) => string;
  /** The value a named column sorts by. */
  readonly valueOf: (row: Row, field: string) => SortValue;
  /** Start sorted, for a table whose natural order is not the source order. */
  readonly initialSort?: SortState;
}

/** Everything a table's parts read from {@link useTable}. */
export interface TableController<Row> {
  /** The painted rows: narrowed, then sorted. */
  readonly rows: ReadonlyArray<Row>;
  /** The visible keys, in paint order — what a Shift range spans. */
  readonly keys: ReadonlyArray<string>;
  readonly sort: Option.Option<SortState>;
  readonly query: string;
  readonly selection: SelectionState;
  /** The rows the current query keeps, before sorting. */
  readonly kept: ReadonlyArray<Row>;
  /** How many records are chosen. */
  readonly selectedCount: number;
  /** The record that owns the roving tab stop, when one is chosen. */
  readonly activeKey: Option.Option<string>;
  readonly setSort: (next: Option.Option<SortState>) => void;
  readonly toggleSort: (field: string) => void;
  readonly setQuery: (query: string) => void;
  readonly press: (key: string, modifiers?: EventModifiers) => void;
  readonly pressRow: (row: Row, modifiers?: EventModifiers) => void;
  readonly selectAllRows: () => void;
  readonly clear: () => void;
  readonly move: (delta: number) => void;
  readonly isSelected: (key: string) => boolean;
}

/**
 * Hold a table's query, sort and selection.
 *
 * Controlled consumers that already own one of the three can drive the pure
 * reducers directly instead; this hook is the convenient uncontrolled path.
 */
export const useTable = <Row>({
  rows,
  keyOf,
  textOf,
  valueOf,
  initialSort,
}: UseTableOptions<Row>): TableController<Row> => {
  const [sort, setSort] = useState<Option.Option<SortState>>(
    Option.fromNullishOr(initialSort),
  );
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<SelectionState>(emptySelection);

  const kept = useMemo(
    () => filterRows(rows, query, textOf),
    [rows, query, textOf],
  );
  const visible = useMemo(
    () => sortRows(kept, sort, valueOf),
    [kept, sort, valueOf],
  );
  const keys = useMemo(() => Arr.map(visible, keyOf), [visible, keyOf]);

  // A narrowed set releases the records it no longer shows **during render**,
  // not in an effect: the first frame after a query change already paints the
  // released selection, and the next press starts from it.
  const selection = useMemo(
    () => retainSelection(chosen, keys),
    [chosen, keys],
  );

  return {
    rows: visible,
    keys,
    kept,
    sort,
    query,
    selection,
    selectedCount: selectionSize(selection),
    activeKey: currentKey(selection),
    setSort,
    toggleSort: (field) =>
      setSort((current) => Option.some(nextSort(current, field))),
    setQuery,
    press: (key, modifiers) =>
      setChosen(pressSelection(selection, key, pressMode(modifiers), keys)),
    pressRow: (row, modifiers) =>
      setChosen(
        pressSelection(selection, keyOf(row), pressMode(modifiers), keys),
      ),
    selectAllRows: () => setChosen(selectAll(selection, keys)),
    clear: () => setChosen(clearSelection(selection)),
    move: (delta) => setChosen(moveSelection(selection, keys, delta)),
    isSelected: (key) => isSelected(selection, key),
  };
};
