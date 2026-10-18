/**
 * The pure model behind `data-grid-virtual` (plan `338`).
 *
 * A data grid's sort, filter and frozen-column window are deterministic
 * functions of its state, so they are testable without a renderer. The probe
 * view and the scenario's expectations both call these — one implementation,
 * so an expectation cannot drift from what the view renders.
 */
import { Match, Order } from "effect";
import * as Arr from "effect/Array";
import * as Str from "effect/String";

/** One grid row; `name` is the sort and filter key. */
export interface GridRow {
  readonly id: number;
  readonly name: string;
  readonly kind: "file" | "dir";
  readonly size: number;
}

/** A row's display text for one column of the probe grids. */
export const cellText = (row: GridRow, id: string): string =>
  Match.value(id).pipe(
    Match.when("name", () => row.name),
    Match.when("status", () => row.kind),
    Match.when("size", () => `${row.size} B`),
    Match.orElse(() => `note ${row.id}`),
  );

/** Sort direction on `name`. */
export type SortDirection = "asc" | "desc";

/** A virtual list's anchor: the first visible row and the pixels scrolled into it. */
export interface Anchor {
  readonly index: number;
  readonly offset: number;
}

/** An inclusive range of row indices. `last < first` is empty. */
export interface RowRange {
  readonly first: number;
  readonly last: number;
}

const byName = Order.mapInput(Order.String, (row: GridRow) => row.name);

const clamped = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** Rows whose name contains `query`, case-insensitively; an empty query keeps every row. */
export const filterRows = (
  rows: ReadonlyArray<GridRow>,
  query: string,
): ReadonlyArray<GridRow> => {
  const needle = Str.toLowerCase(query);
  return Arr.filter(rows, (row) =>
    Str.includes(needle)(Str.toLowerCase(row.name)),
  );
};

/** `rows` by name; `desc` reverses a fresh ascending sort, so the input is never mutated. */
export const sortRows = (
  rows: ReadonlyArray<GridRow>,
  direction: SortDirection,
): ReadonlyArray<GridRow> =>
  direction === "asc"
    ? Arr.sort(rows, byName)
    : Arr.reverse(Arr.sort(rows, byName));

/**
 * The rows the frozen column paints for `anchor`, plus one row of overdraw on
 * each side, clamped to the row count. Empty when there are no rows.
 */
export const anchoredWindow = (
  anchor: Anchor,
  viewport: number,
  rowHeight: number,
  count: number,
): RowRange => {
  if (count <= 0 || rowHeight <= 0) return { first: 0, last: -1 };
  const first = clamped(Math.floor(anchor.index) - 1, 0, count - 1);
  const visible = Math.ceil((viewport + anchor.offset) / rowHeight) + 2;
  const last = clamped(
    Math.floor(anchor.index) + visible - 1,
    first,
    count - 1,
  );
  return { first, last };
};

/** Row `index`'s y inside the viewport, given the list's anchor. */
export const rowTop = (
  index: number,
  anchor: Anchor,
  rowHeight: number,
): number => index * rowHeight - (anchor.index * rowHeight + anchor.offset);

/** Every index in `range`, or an empty list for the empty range. */
export const indices = (range: RowRange): ReadonlyArray<number> =>
  range.last < range.first ? [] : Arr.range(range.first, range.last);
