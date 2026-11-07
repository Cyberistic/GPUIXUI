import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as P from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

export interface ComboboxOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

class StoredOption extends Schema.Class<StoredOption>("StoredOption")({
  value: Schema.String,
  label: Schema.optionalKey(Schema.NullOr(Schema.String)),
  description: Schema.optionalKey(Schema.NullOr(Schema.String)),
  disabled: Schema.optionalKey(Schema.NullOr(Schema.Boolean)),
}) {}

const decodeStoredOption = Schema.decodeUnknownOption(StoredOption);

export const optionsOf = (value: unknown): ReadonlyArray<ComboboxOption> =>
  Arr.isArray(value)
    ? Arr.getSomes(
        Arr.map(value, (entry) =>
          Option.map(decodeStoredOption(entry), (option) => ({
            value: option.value,
            label: Option.getOrElse(
              Option.fromNullishOr(option.label),
              () => option.value,
            ),
            ...Option.match(Option.fromNullishOr(option.description), {
              onNone: () => ({}),
              onSome: (description) => ({ description }),
            }),
            disabled: Option.getOrElse(
              Option.fromNullishOr(option.disabled),
              () => false,
            ),
          })),
        ),
      )
    : [];

export const selectionOf = (
  value: unknown,
): Option.Option<string | ReadonlyArray<string>> =>
  P.isString(value)
    ? Option.some(value)
    : Arr.isArray(value)
      ? Option.some(Arr.filter(value, P.isString))
      : Option.none();

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

const CREATE_ROW_PREFIX = "\u0000create\u0000";

export const isCreateRow = (value: string): boolean =>
  Str.startsWith(CREATE_ROW_PREFIX)(value);

export const createRowValue = (query: string): string =>
  `${CREATE_ROW_PREFIX}${query}`;

export const createRowQuery = (value: string): string =>
  Str.slice(CREATE_ROW_PREFIX.length)(value);

export const offersCreate = (
  visible: ReadonlyArray<ComboboxOption>,
  query: string,
  canCreate: boolean,
): boolean =>
  canCreate &&
  !Str.isEmpty(Str.trim(query)) &&
  Arr.isReadonlyArrayEmpty(visible);

export const toggledSelection = (
  selected: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> =>
  Arr.contains(selected, value)
    ? Arr.filter(selected, (candidate) => candidate !== value)
    : Arr.append(selected, value);

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
