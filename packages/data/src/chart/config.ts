import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { IconName } from "@gpuixui/icons";

export type ChartMode = "light" | "dark";

export interface ChartConfigEntry {
  readonly label?: string;

  readonly icon?: IconName;

  readonly color?: string;

  readonly theme?: Partial<Record<ChartMode, string>>;
}

export type ChartConfig = Record<string, ChartConfigEntry | undefined>;

export const configColour = (
  entry: ChartConfigEntry | undefined,
  mode: ChartMode,
): Option.Option<string> => {
  if (entry === undefined) return Option.none();
  const themed = Option.fromNullishOr(entry.theme?.[mode]);
  const chosen = Option.match(themed, {
    onNone: () => Option.fromNullishOr(entry.color),
    onSome: (colour) => Option.some(colour),
  });
  return Option.filter(chosen, (colour) => colour.trim().length > 0);
};

export const configLabel = (
  key: string,
  entry: ChartConfigEntry | undefined,
): string => {
  const label = entry?.label;
  return Option.match(Option.fromNullishOr(label), {
    onNone: () => key,
    onSome: (value) => (value.trim().length === 0 ? key : value),
  });
};

export const configIcon = (
  entry: ChartConfigEntry | undefined,
): Option.Option<IconName> => Option.fromNullishOr(entry?.icon);

export const configEntries = (
  config: ChartConfig | undefined,
): ReadonlyArray<readonly [string, ChartConfigEntry]> =>
  Option.match(Option.fromNullishOr(config), {
    onNone: () => [],
    onSome: (table) =>
      Arr.map(Object.keys(table), (key) => {
        const entry = table[key];

        return [key, entry ?? {}] as const;
      }),
  });

export const configKeys = (
  config: ChartConfig | undefined,
): ReadonlyArray<string> => Arr.map(configEntries(config), ([key]) => key);

export type ChartRow = Record<string, unknown>;

export const datumNumber = (
  datum: ChartRow | undefined,
  field: string,
): Option.Option<number> => {
  if (datum === undefined) return Option.none();
  const value = datum[field];
  return typeof value === "number" && Number.isFinite(value)
    ? Option.some(value)
    : Option.none<number>();
};

export const seriesFromConfig = (
  config: ChartConfig | undefined,
  data: ReadonlyArray<ChartRow>,
): ReadonlyArray<{
  readonly key: string;
  readonly label: string;
  readonly values: ReadonlyArray<number>;
}> =>
  Arr.map(configEntries(config), ([key, entry]) => ({
    key,
    label: configLabel(key, entry),
    values: Arr.map(data, (datum) =>
      Option.getOrElse(datumNumber(datum, key), () => 0),
    ),
  }));

export const configSeriesColour = (
  config: ChartConfig | undefined,
  key: string,
  mode: ChartMode,
): Option.Option<string> =>
  Option.flatMap(Option.fromNullishOr(config), (table) =>
    configColour(table[key], mode),
  );

export const categoriesFromData = (
  data: ReadonlyArray<ChartRow>,
): ReadonlyArray<string> => {
  const first = data[0];
  if (first === undefined) return [];
  const field = Arr.findFirst(Object.keys(first), (key) =>
    Arr.some(data, (datum) => typeof datum[key] === "string"),
  );
  return Option.match(field, {
    onNone: () => [],
    onSome: (name) =>
      Arr.map(data, (datum) => {
        const value = datum[name];
        return typeof value === "string" ? value : "";
      }),
  });
};

export const configColours = (
  config: ChartConfig | undefined,
  mode: ChartMode,
): ReadonlyArray<string> =>
  Arr.map(
    Arr.filter(configEntries(config), ([, entry]) =>
      Option.isSome(configColour(entry, mode)),
    ),
    ([, entry]) => Option.getOrElse(configColour(entry, mode), () => ""),
  );

export const configOf = (config: ChartConfig | undefined): ChartConfig =>
  Option.getOrElse(Option.fromNullishOr(config), () => ({}));

export const configKeySet = (
  config: ChartConfig | undefined,
): ReadonlyArray<string> => Object.keys(configOf(config));

export const configEntryOf = (
  config: ChartConfig | undefined,
  key: string,
): Option.Option<ChartConfigEntry> =>
  Option.fromNullishOr(configOf(config)[key]).pipe(
    Option.map((entry) => entry ?? {}),
  );
