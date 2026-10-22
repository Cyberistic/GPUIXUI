/**
 * The sort a header press produces.
 *
 * The rules are the ones the window measured (`table-select-sort`): the first
 * press sorts ascending, a press on the same field flips the direction, and a
 * press on another field starts that field at its initial direction. The
 * selected **record** survives a sort because the row models key by identity,
 * never by index.
 *
 * The order itself is the row model's: `constructGrid` registers
 * `sortFn_basic`, which compares numbers numerically and text by code unit —
 * the order the probes measured. This module is the press cycle and the words
 * a header announces, nothing that reorders a list.
 */

import * as Option from "effect/Option";
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
