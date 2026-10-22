/**
 * Sorting, as pure data over an immutable row array.
 *
 * The rules are the ones the window measured (`table-select-sort`): the first
 * press sorts ascending, a press on the same field flips the direction, and a
 * press on another field starts that field at its initial direction. The
 * selected **record** survives a sort, so selection is keyed by row identity
 * and never by index — which is why this module never sees indices.
 *
 * Nothing here imports React: an application driving the grid from Effect or
 * its own store reads the same reducer.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import { pipe } from "effect";

/** The two directions a column can be in. */
export type SortDirection = "asc" | "desc";

/** Which field is sorted, and which way. */
export interface SortState {
  readonly field: string;
  readonly direction: SortDirection;
}

/** A value a column can sort by. */
export type SortValue = string | number;

/** The values' order: numbers numerically, strings by code unit. */
const valueOrder: Order.Order<SortValue> = Order.make((self, that) => {
  if (typeof self === "number" && typeof that === "number") {
    return self < that ? -1 : self > that ? 1 : 0;
  }
  const left = `${self}`;
  const right = `${that}`;
  return left < right ? -1 : left > right ? 1 : 0;
});

/**
 * The sort a press produces.
 *
 * Pressing the sorted field flips it; any other field starts at
 * `initialDirection`, which the header passes so a numeric column can start
 * descending when that is the useful reading.
 */
export const toggleSort = (
  current: Option.Option<SortState>,
  field: string,
  initialDirection: SortDirection = "asc",
): SortState =>
  pipe(
    current,
    Option.filter((state) => state.field === field),
    Option.match({
      onNone: () => ({ field, direction: initialDirection }),
      onSome: (state) => ({
        field,
        direction: state.direction === "asc" ? "desc" : "asc",
      }),
    }),
  );

/** The direction a column is in, when it is the sorted one. */
export const directionOf = (
  sort: Option.Option<SortState>,
  field: string,
): Option.Option<SortDirection> =>
  Option.flatMap(sort, (state) =>
    state.field === field ? Option.some(state.direction) : Option.none(),
  );

/**
 * The announced name of a sortable column.
 *
 * `@gpuix/native@0.11.0` has no `aria-sort`, so the state travels in the
 * control's accessible name instead: a reader hears "Name, sorted descending"
 * rather than "Name" and a glyph they cannot see.
 */
export const sortLabel = (
  label: string,
  sort: Option.Option<SortState>,
  field: string,
): string =>
  pipe(
    directionOf(sort, field),
    Option.match({
      onNone: () => `${label}, sortable`,
      onSome: (direction) =>
        `${label}, sorted ${direction === "asc" ? "ascending" : "descending"}`,
    }),
  );

/**
 * The rows in the sorted order.
 *
 * An unsorted table keeps the caller's order exactly; a sorted one compares
 * only the named field and never mutates the input array.
 */
export const sortRows = <Row>(
  rows: ReadonlyArray<Row>,
  sort: Option.Option<SortState>,
  valueOf: (row: Row, field: string) => SortValue,
): ReadonlyArray<Row> =>
  pipe(
    sort,
    Option.match({
      onNone: () => rows,
      onSome: ({ field, direction }) => {
        const order = Order.mapInput(valueOrder, (row: Row) =>
          valueOf(row, field),
        );
        return Arr.sort(rows, direction === "asc" ? order : Order.flip(order));
      },
    }),
  );
