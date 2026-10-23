/**
 * The sort a header press produces.
 *
 * The rules are the ones the window measured (`table-select-sort`): the first
 * press sorts ascending, a press on the same field flips the direction, and a
 * press on another field starts that field at its initial direction. A
 * **Shift press** keeps the fields already sorted and adds the pressed one as
 * the next tie-break — or flips it where it already sits — so two records the
 * primary sort ties are ordered by the second. The selected **record** survives
 * a sort because the row models key by identity, never by index.
 *
 * The order itself is the row model's: `constructGrid` registers
 * `sortFn_basic`, which compares numbers numerically and text by code unit,
 * and its sorted model walks every entry of the sorting state in turn — the
 * order the probes measured. This module is the press cycle and the words a
 * header announces, nothing that reorders a list.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { pipe } from "effect";

/** The two directions a column can be in. */
export type SortDirection = "asc" | "desc";

/** Which field is sorted, and which way. */
export interface SortState {
  readonly field: string;
  readonly direction: SortDirection;
}

/**
 * The fields a table is sorted by, primary first.
 *
 * One entry is the ordinary single-column sort. A second entry orders the rows
 * the first entry ties, a third orders the rows the second ties, and so on.
 */
export type SortOrder = ReadonlyArray<SortState>;

/** A value a column can sort by. */
export type SortValue = string | number;

/** The other direction, for a press on a field that is already sorted. */
const flip = (direction: SortDirection): SortDirection =>
  direction === "asc" ? "desc" : "asc";

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
      onSome: (state) => ({ field, direction: flip(state.direction) }),
    }),
  );

/**
 * The order a press produces.
 *
 * A plain press keeps the press cycle over the **primary** entry and drops
 * every other field: pressing a column is a request to sort by that column,
 * not to rearrange a multi-column order. A Shift press (`additive`) leaves the
 * order in place and either flips the pressed field where it already sits or
 * appends it at `initialDirection` — so the first Shift press on a second
 * column makes it the tie-break, and the next flips it.
 */
export const pressSortOrder = (
  order: SortOrder,
  field: string,
  initialDirection: SortDirection = "asc",
  additive: boolean = false,
): SortOrder => {
  const at = Arr.findFirstIndex(order, (entry) => entry.field === field);
  if (additive) {
    return Option.match(at, {
      onNone: () => [...order, { field, direction: initialDirection }],
      onSome: (index) =>
        Arr.map(order, (entry, position) =>
          position === index
            ? { ...entry, direction: flip(entry.direction) }
            : entry,
        ),
    });
  }
  return Option.match(Arr.head(order), {
    onNone: () => [{ field, direction: initialDirection }],
    onSome: (primary) => [
      {
        field,
        direction:
          primary.field === field ? flip(primary.direction) : initialDirection,
      },
    ],
  });
};

/** The position of a field in an order, one-based, when it is sorted. */
export const sortPosition = (
  order: SortOrder,
  field: string,
): Option.Option<number> =>
  Option.map(
    Arr.findFirstIndex(order, (entry) => entry.field === field),
    (index) => index + 1,
  );

/** The direction a column is in, when it is sorted in this order. */
export const directionOf = (
  sort: Option.Option<SortState>,
  field: string,
): Option.Option<SortDirection> =>
  Option.flatMap(sort, (state) =>
    state.field === field ? Option.some(state.direction) : Option.none(),
  );

/** The direction a field is in, within an order. */
export const directionIn = (
  order: SortOrder,
  field: string,
): Option.Option<SortDirection> =>
  Option.map(
    Arr.findFirst(order, (entry) => entry.field === field),
    (entry) => entry.direction,
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
): string => sortOrderLabel(label, Option.toArray(sort), field);

/**
 * The announced name of a column within an order.
 *
 * The state is the same as {@link sortLabel}'s, with the field's place in a
 * multi-column order appended — "Name, sorted descending, sort 1 of 2" — so a
 * reader learns both the direction and which field decides first.
 */
export const sortOrderLabel = (
  label: string,
  order: SortOrder,
  field: string,
): string =>
  Option.match(
    Option.all([directionIn(order, field), sortPosition(order, field)]),
    {
      onNone: () => `${label}, sortable`,
      onSome: ([direction, position]) => {
        const state = `${label}, sorted ${direction === "asc" ? "ascending" : "descending"}`;
        return order.length > 1
          ? `${state}, sort ${position} of ${order.length}`
          : state;
      },
    },
  );

/**
 * The glyph a column paints within an order.
 *
 * An arrow alone is the single-column state. In a multi-column order the
 * arrow carries the field's one-based place, so a reader can see which sort a
 * column is: `↓1` decides first, `↑2` orders the rows `↓1` ties.
 */
export const sortOrderGlyph = (order: SortOrder, field: string): string =>
  Option.match(
    Option.all([directionIn(order, field), sortPosition(order, field)]),
    {
      onNone: () => "",
      onSome: ([direction, position]) => {
        const arrow = direction === "asc" ? "↑" : "↓";
        return order.length > 1 ? `${arrow}${position}` : arrow;
      },
    },
  );
