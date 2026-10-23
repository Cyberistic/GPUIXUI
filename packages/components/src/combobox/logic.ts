/**
 * Combobox option ranking, multi-selection membership and the "create" row.
 *
 * The ranking is ours rather than the renderer's so the order is testable and
 * stable: an exact prefix beats a word prefix, which beats a substring, and
 * ties keep the order the caller declared.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Str from "effect/String";

/** One selectable option. */
export interface ComboboxOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

/**
 * The text shown for an option, falling back to its value.
 *
 * A label is often a column a caller decoded from a table, so a blank one is
 * absence rather than a name: a whitespace-only label would paint an empty
 * trigger and an empty row where the value is the only name there is, which is
 * the rule `AvatarGroup` and `CopyButton` apply to the names they are handed.
 */
export const labelOf = (option: ComboboxOption): string => {
  const label = Str.trim(option.label);
  return Str.isNonEmpty(label) ? label : option.value;
};

interface Ranked {
  readonly option: ComboboxOption;
  readonly rank: number;
  readonly index: number;
}

const normalise = (value: string): string => Str.toLowerCase(Str.trim(value));

const wordStarts = (haystack: string, needle: string): boolean =>
  Arr.some(Str.split(haystack, " "), (word) => Str.startsWith(needle)(word));

/** Lower is better. `None` when the option does not match at all. */
const rank = (option: ComboboxOption, query: string): Option.Option<number> => {
  const label = normalise(labelOf(option));
  if (Str.startsWith(query)(label)) return Option.some(0);
  if (wordStarts(label, query)) return Option.some(1);
  if (Str.includes(query)(label)) return Option.some(2);
  if (Str.includes(query)(normalise(option.description ?? "")))
    return Option.some(3);
  return Option.none();
};

const byRankThenDeclaration = Order.combine(
  Order.mapInput(Order.Number, (entry: Ranked) => entry.rank),
  Order.mapInput(Order.Number, (entry: Ranked) => entry.index),
);

/**
 * The options to show for a query, best match first. An empty or blank query
 * returns every option in declaration order. Disabled options are kept, because
 * they stay visible and unselectable rather than disappearing.
 */
export const filterOptions = (
  options: ReadonlyArray<ComboboxOption>,
  query: string,
): ReadonlyArray<ComboboxOption> => {
  const needle = normalise(query);
  if (Str.isEmpty(needle)) return options;

  const ranked = Arr.flatMap(options, (option, index) =>
    Option.match(rank(option, needle), {
      onNone: () => [],
      onSome: (value) => [{ option, rank: value, index }],
    }),
  );

  return Arr.map(
    Arr.sort(ranked, byRankThenDeclaration),
    (entry) => entry.option,
  );
};

/**
 * The value the "create" row carries. A NUL cannot appear in a typed query, so
 * the sentinel cannot collide with an option the caller declared.
 */
const CREATE_ROW_PREFIX = "\u0000create\u0000";

/** Whether `value` is the synthetic create row rather than a caller option. */
export const isCreateRow = (value: string): boolean =>
  Str.startsWith(CREATE_ROW_PREFIX)(value);

/** The row value for a query the caller may create. */
export const createRowValue = (query: string): string =>
  `${CREATE_ROW_PREFIX}${query}`;

/** The query a create row carries. */
export const createRowQuery = (value: string): string =>
  Str.slice(CREATE_ROW_PREFIX.length)(value);

/**
 * Whether the query should offer a create row: it has text, no option matched,
 * and the caller supplied a handler. Offering it only when nothing matches keeps
 * the row from competing with a real result the user can pick instead.
 */
export const offersCreate = (
  visible: ReadonlyArray<ComboboxOption>,
  query: string,
  canCreate: boolean,
): boolean =>
  canCreate &&
  !Str.isEmpty(Str.trim(query)) &&
  Arr.isReadonlyArrayEmpty(visible);

/** Add `value` to the selection, or remove it when it is already selected. */ export const toggledSelection =
  (selected: ReadonlyArray<string>, value: string): ReadonlyArray<string> =>
    Arr.contains(selected, value)
      ? Arr.filter(selected, (candidate) => candidate !== value)
      : Arr.append(selected, value);

/**
 * The label shown on a single-select trigger. The component converts its
 * optional `value` prop to an `Option` at the React boundary.
 */
export const selectedLabel = (
  options: ReadonlyArray<ComboboxOption>,
  value: Option.Option<string>,
): Option.Option<string> =>
  Option.flatMap(value, (selected) =>
    Option.map(
      Arr.findFirst(options, (option) => option.value === selected),
      labelOf,
    ),
  );
