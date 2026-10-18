/**
 * Combobox option ranking and multi-selection membership.
 *
 * The ranking is ours rather than the renderer's so the order is testable and
 * stable: an exact prefix beats a word prefix, which beats a substring, and
 * ties keep the order the caller declared. Ranking is scoped to a **group run**
 * (consecutive options sharing `group`) so a group's heading never repeats,
 * the same rule `CommandAction.group` documents for the command palette.
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
  /** Consecutive options sharing a group render under one heading. */
  readonly group?: string;
  readonly disabled?: boolean;
}

/** The text shown for an option, falling back to its value. */
export const labelOf = (option: ComboboxOption): string =>
  Str.isNonEmpty(option.label) ? option.label : option.value;

/** The heading an option sits under; an absent or blank group is ungrouped. */
export const groupOfOption = (option: ComboboxOption): Option.Option<string> =>
  Option.filter(Option.fromNullishOr(option.group), (group) =>
    Str.isNonEmpty(Str.trim(group)),
  );

/** One contiguous slice of options sharing a heading. */
export interface ComboboxOptionRun {
  readonly group: Option.Option<string>;
  readonly options: ReadonlyArray<ComboboxOption>;
  /** Declaration index of the run's first option; the ranking tie-break. */
  readonly from: number;
}

/** One contiguous slice of row values sharing a heading. */
export interface ComboboxRowRun {
  readonly group: Option.Option<string>;
  readonly values: ReadonlyArray<string>;
}

interface Run<A> {
  readonly group: Option.Option<string>;
  readonly items: ReadonlyArray<A>;
  readonly from: number;
}

const sameGroup = (
  left: Option.Option<string>,
  right: Option.Option<string>,
): boolean =>
  Option.match(left, {
    onNone: () => Option.isNone(right),
    onSome: (name) => Option.exists(right, (candidate) => candidate === name),
  });

/** Split a sequence into maximal contiguous runs of equal group names. */
const runsBy = <A>(
  items: ReadonlyArray<A>,
  groupOf: (item: A) => Option.Option<string>,
): ReadonlyArray<Run<A>> =>
  Arr.reduce(items, Arr.empty<Run<A>>(), (runs, item, index) => {
    const group = groupOf(item);
    return Option.match(Arr.last(runs), {
      onNone: () => [{ group, items: [item], from: index }],
      onSome: (run) =>
        sameGroup(run.group, group)
          ? Arr.append(Arr.dropRight(runs, 1), {
              ...run,
              items: Arr.append(run.items, item),
            })
          : Arr.append(runs, { group, items: [item], from: index }),
    });
  });

/** The option runs, in declaration order. */
export const optionRuns = (
  options: ReadonlyArray<ComboboxOption>,
): ReadonlyArray<ComboboxOptionRun> =>
  Arr.map(runsBy(options, groupOfOption), (run) => ({
    group: run.group,
    options: run.items,
    from: run.from,
  }));

/** The row runs, in display order; the create row is ungrouped. */
export const rowRuns = (
  values: ReadonlyArray<string>,
  groupOf: (value: string) => Option.Option<string>,
): ReadonlyArray<ComboboxRowRun> =>
  Arr.map(runsBy(values, groupOf), (run) => ({
    group: run.group,
    values: run.items,
  }));

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
 * The options to show for a query, best match first **within each group run**.
 * An empty or blank query returns every option in declaration order. A run
 * whose options all fail the query disappears with its heading. Disabled
 * options are kept, because they stay visible and unselectable rather than
 * disappearing.
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

  return Arr.flatMap(optionRuns(options), (run) =>
    Arr.map(
      Arr.sort(
        Arr.filter(
          ranked,
          (entry) =>
            entry.index >= run.from &&
            entry.index < run.from + Arr.length(run.options),
        ),
        byRankThenDeclaration,
      ),
      (entry) => entry.option,
    ),
  );
};

/**
 * The rows to feed the runtime. `filter` is `false` when the caller owns the
 * search (remote options), so the caller's result is shown exactly as given.
 */
export const visibleOptions = (
  options: ReadonlyArray<ComboboxOption>,
  query: string,
  filter: boolean,
): ReadonlyArray<ComboboxOption> =>
  filter ? filterOptions(options, query) : options;

/** Add `value` to the selection, or remove it when it is already selected. */
export const toggledSelection = (
  selected: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> =>
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

/**
 * The prefix of the synthetic "create" item. A NUL cannot appear in an option
 * value a caller types, so the sentinel can never collide with real data.
 */
export const CREATE_PREFIX = "\u0000gpuixui:create:";

/** The synthetic item value carrying the query a create row would make. */
export const createValue = (query: string): string =>
  `${CREATE_PREFIX}${query}`;

/** The query behind a synthetic item, or `None` for a real option value. */
export const parseCreateValue = (value: string): Option.Option<string> =>
  Str.startsWith(CREATE_PREFIX)(value)
    ? Option.some(value.slice(CREATE_PREFIX.length))
    : Option.none();

/**
 * Whether a create row should be offered: the trimmed query is non-empty and no
 * option already carries it as its label or value (case-insensitive).
 */
export const canCreate = (
  options: ReadonlyArray<ComboboxOption>,
  query: string,
): boolean => {
  const needle = normalise(query);
  return (
    Str.isNonEmpty(needle) &&
    !Arr.some(
      options,
      (option) =>
        normalise(labelOf(option)) === needle ||
        normalise(option.value) === needle,
    )
  );
};
