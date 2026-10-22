/**
 * Filtering, as a literal case-insensitive query over the row's searchable text.
 *
 * The rule the `table-filter-lifecycle` probe measured is deliberately plain: a
 * query is matched as a substring, lowercased, and never interpreted as a
 * pattern. A grid owns what a narrower set does to everything else, so
 * {@link narrowTable} pairs the filtered rows with the selection it must
 * release — a chosen record the new set hides is cleared before the next
 * frame paints, while one the set still holds survives.
 *
 * The predicate tree a query builder composes (`AdvancedFilter`) is a later
 * phase of plan 610; this is the field above the rows, not the builder.
 */

import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { pipe } from "effect";
import { retainSelection, type SelectionState } from "../selection/logic.js";

/** The normalised query a set is narrowed by. */
export const normalizeQuery = (query: string): string =>
  pipe(query, Str.trim, Str.toLowerCase);

/**
 * Whether a query matches one row's text.
 *
 * An empty query matches everything, so clearing the field restores the set
 * rather than painting an empty table.
 */
export const matchesQuery = (query: string, text: string): boolean => {
  const needle = normalizeQuery(query);
  return needle.length === 0 || Str.includes(needle, 0)(Str.toLowerCase(text));
};

/** The rows a query keeps, in the caller's order. */
export const filterRows = <Row>(
  rows: ReadonlyArray<Row>,
  query: string,
  textOf: (row: Row) => string,
): ReadonlyArray<Row> =>
  Arr.filter(rows, (row) => matchesQuery(query, textOf(row)));

/** A narrowed set, and the selection the narrower set leaves standing. */
export interface Narrowed<Row> {
  readonly rows: ReadonlyArray<Row>;
  readonly selection: SelectionState;
}

/**
 * Narrow the rows and release the selection they no longer show.
 *
 * This is the one function a grid calls when its query changes; doing the two
 * halves apart is how a selection ended up kept but unpaintable.
 */
export const narrowTable = <Row>(
  rows: ReadonlyArray<Row>,
  query: string,
  textOf: (row: Row) => string,
  keyOf: (row: Row) => string,
  selection: SelectionState,
): Narrowed<Row> => {
  const kept = filterRows(rows, query, textOf);
  return {
    rows: kept,
    selection: retainSelection(
      selection,
      Arr.map(kept, (row) => keyOf(row)),
    ),
  };
};
