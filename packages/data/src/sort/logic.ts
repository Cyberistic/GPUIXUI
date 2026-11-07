import { spokenText } from "@gpuixui/primitives/core";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { pipe } from "effect";

export type SortDirection = "asc" | "desc";

export interface SortState {
  readonly field: string;
  readonly direction: SortDirection;
}

export type SortOrder = ReadonlyArray<SortState>;

export type SortValue = string | number;

const flip = (direction: SortDirection): SortDirection =>
  direction === "asc" ? "desc" : "asc";

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

export const sortPosition = (
  order: SortOrder,
  field: string,
): Option.Option<number> =>
  Option.map(
    Arr.findFirstIndex(order, (entry) => entry.field === field),
    (index) => index + 1,
  );

export const directionOf = (
  sort: Option.Option<SortState>,
  field: string,
): Option.Option<SortDirection> =>
  Option.flatMap(sort, (state) =>
    state.field === field ? Option.some(state.direction) : Option.none(),
  );

export const directionIn = (
  order: SortOrder,
  field: string,
): Option.Option<SortDirection> =>
  Option.map(
    Arr.findFirst(order, (entry) => entry.field === field),
    (entry) => entry.direction,
  );

export const sortLabel = (
  label: string,
  sort: Option.Option<SortState>,
  field: string,
): string => sortOrderLabel(label, Option.toArray(sort), field);

export const columnName = (label: string, field: string): string =>
  spokenText(Option.fromNullishOr(label), field);

export const sortOrderLabel = (
  label: string,
  order: SortOrder,
  field: string,
): string => {
  const name = columnName(label, field);
  return Option.match(
    Option.all([directionIn(order, field), sortPosition(order, field)]),
    {
      onNone: () => `${name}, sortable`,
      onSome: ([direction, position]) => {
        const state = `${name}, sorted ${direction === "asc" ? "ascending" : "descending"}`;
        return order.length > 1
          ? `${state}, sort ${position} of ${order.length}`
          : state;
      },
    },
  );
};

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
