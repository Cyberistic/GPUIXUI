/**
 * A chart's config: the labels, the icons and the colours, in one table.
 *
 * This is shadcn/ui's `ChartConfig`, and it is the shape a chart library
 * should have. The table is **decoupled from the data**, so one table can be
 * shared by several charts, a theme can own the colours, and a chart's
 * identity — what the legend, the tooltip and the marks call each series —
 * is stated once rather than repeated per chart.
 *
 * The colour is either one value or one value per mode. A mode is `"light"` or
 * `"dark"`; a table with a single colour paints that colour in either mode, so
 * a brand that ships one hue needs no table of two.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { IconName } from "@gpuixui/icons";

/** The mode a chart's colours are read in. */
export type ChartMode = "light" | "dark";

/** One entry of a chart's config: what a series is called and how it paints. */
export interface ChartConfigEntry {
  /** The series' name in the legend and in the readout. */
  readonly label?: string;
  /** The mark beside the series' name in the legend and the readout. */
  readonly icon?: IconName;
  /** The series' colour, in both modes. */
  readonly color?: string;
  /** The series' colour, per mode. Overrides `color` where it names one. */
  readonly theme?: Partial<Record<ChartMode, string>>;
}

/**
 * A chart's config: a keyed table of entries.
 *
 * The table is `Record<string, ChartConfigEntry>`, so a key is a series'
 * identity — the same key the data names its field by, and the same key the
 * legend and the readout call it by.
 */
export type ChartConfig = Record<string, ChartConfigEntry>;

/**
 * The colour one entry paints in one mode.
 *
 * The per-mode table wins where it names the mode; a table that names no mode
 * falls back to the single colour. A blank is absence: a colour the runtime
 * would drop is not a colour, so the caller reads the theme's scale instead.
 */
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

/**
 * The name one entry is called by.
 *
 * A label is content before it is a literal: a table missing its row answers
 * `""`, and a saved chart can restore a series with no words. A blank label
 * therefore reads as the **key** — the identity the caller stores the series
 * by, and the one word that is always there.
 */
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

/** The icon one entry paints, when it names one. */
export const configIcon = (
  entry: ChartConfigEntry | undefined,
): Option.Option<IconName> => Option.fromNullishOr(entry?.icon);

/**
 * The entries of a config, in the order the keys were declared.
 *
 * A record's key order is the table's own order, so a legend reads the series
 * in the order the config declared them rather than in the order a hash
 * happens to walk.
 */
export const configEntries = (
  config: ChartConfig | undefined,
): ReadonlyArray<readonly [string, ChartConfigEntry]> =>
  Option.match(Option.fromNullishOr(config), {
    onNone: () => [],
    onSome: (table) =>
      Arr.map(Object.keys(table), (key) => {
        const entry = table[key];
        // A table a store wrote can carry a hole: the key is there and the
        // entry is not. The key still names the series, so it keeps its slot.
        return [key, entry ?? {}] as const;
      }),
  });

/**
 * The keys a config names, in the order it declared them.
 *
 * A chart built from a config paints the series the config names, in the
 * config's order — not the order the data's fields happen to be in.
 */
export const configKeys = (
  config: ChartConfig | undefined,
): ReadonlyArray<string> =>
  Arr.map(configEntries(config), ([key]) => key);

/**
 * One row of a chart's data: a record of fields.
 *
 * The data is a table of records, the way a Recharts `data` prop is: one row
 * per category, one field per series.
 */
export type ChartRow = Record<string, unknown>;

/**
 * The number one field of a datum carries.
 *
 * A field that is not a number is not a value: a table a store wrote with a
 * string in a measure field reads as absence, not as `0` — the same rule the
 * geometry follows for a value that is not finite.
 */
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

/**
 * The series a config and a data table produce.
 *
 * This is the shadcn `dataKey` route: the config names the series, the data
 * carries their numbers, and the caller does not have to write the series out
 * by hand. One series per config key, in the config's order; a key the data
 * does not carry paints no value but keeps its slot, so a series with no
 * numbers yet is still named in the legend.
 */
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

/**
 * The categories a data table names.
 *
 * The first field every row carries that is a string is the category, so a
 * table of `{ month, desktop, mobile }` reads `January … June` under the plot.
 * The field is the one the **first** row carries a string in, so every row
 * agrees on which field names the category.
 */
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

/**
 * The config's colours, in the config's order.
 *
 * A config that names no colour for a series leaves that series to the
 * caller's palette, so the list may be shorter than the list of series.
 */
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

/** The config as a record, when a caller hands one over as stored data. */
export const configOf = (
  config: ChartConfig | undefined,
): ChartConfig => Option.getOrElse(Option.fromNullishOr(config), () => ({}));

/** The config's own keys, for a caller that wants them as a set. */
export const configKeySet = (
  config: ChartConfig | undefined,
): ReadonlyArray<string> => Object.keys(configOf(config));

/** The record a config's entry carries, read through the stored-data rules. */
export const configEntryOf = (
  config: ChartConfig | undefined,
  key: string,
): Option.Option<ChartConfigEntry> =>
  Option.fromNullishOr(configOf(config)[key]).pipe(
    Option.map((entry) => entry ?? {}),
  );
