/**
 * A chart's palette, resolved from the theme, and the audit a brand runs on a
 * scale it authored. Executed by `series.test.ts`, so the call site the
 * catalogue and the design-system page teach is a real one.
 */

import {
  applyStyle,
  seriesColors,
  seriesFailures,
  type PlatformStyle,
  type SeriesColors,
  type Theme,
  type ThemeMode,
} from "./index.js";
import { retroStyles } from "./retro.js";
import { extendTheme, lightTheme, themes } from "./theme.js";

/** One legend row: the label a chart was given and the colour it is drawn in. */
export interface LegendRow {
  readonly label: string;
  readonly color: string;
}

/** The scale has five positions; a chart with more categories folds the tail. */
const SERIES_LIMIT = 5;

/**
 * Pair the categories a chart was given with the theme's scale, in order. A
 * sixth category is not a recycled colour: the tail folds into one "Other" row,
 * painted with `mutedForeground`, because a repeated swatch would claim two
 * categories are the same thing.
 */
export function legend(
  theme: Theme,
  labels: ReadonlyArray<string>,
): ReadonlyArray<LegendRow> {
  const colors = seriesColors(theme);
  const direct = (name: string, index: number): LegendRow => ({
    label: name,
    color: colors[index] ?? colors[0],
  });
  if (labels.length <= SERIES_LIMIT) {
    return labels.map(direct);
  }
  return [
    ...labels.slice(0, SERIES_LIMIT).map(direct),
    { label: "Other", color: theme.colors.mutedForeground },
  ];
}

/** A brand that spends its five positions on its own house palette. */
export const brandSeries: SeriesColors = [
  "#6A45F0",
  "#0E7490",
  "#116A43",
  "#B57600",
  "#A5262B",
];

/** The same brand theme with the scale it owns. */
export const brandChartTheme: Theme = extendTheme(lightTheme, {
  name: "Acme charts",
  series: brandSeries,
});

/**
 * The scale a house look carries, and the look that carries it.
 *
 * Luna's light edition is the measured case for the mechanism: its `#E0DCCB`
 * toolbar swallows the shared light amber (`#B57600`) at **2.75:1**, so the look
 * ships a table of its own (`retroStyles.luna.series`, `retro.ts`). A house that
 * wants different hues copies the style — this is that copy — and replaces the
 * five positions; the house table keeps the look's page, card, popover and
 * toolbar readable and every pair apart for a dichromat.
 *
 * A look owns the scale in the `PlatformStyle` shape, per mode, and `applyStyle`
 * hands it to the base theme under the same `contrast` rule as the look's
 * palette. A consumer copies the style they ship rather than naming a new
 * platform.
 */
export const houseSeries: SeriesColors = [
  "#6A45F0",
  "#0E7490",
  "#116A43",
  "#9A6300",
  "#A5262B",
];

/** Luna's chrome with a house chart scale, the way a consumer authors one. */
export const houseLook: PlatformStyle = {
  ...retroStyles.luna,
  label: "Windows XP (Luna) · house",
  series: { light: houseSeries },
};

/** The look applied to a base theme, which is what a chart is painted on. */
export const houseTheme = (mode: ThemeMode): Theme =>
  applyStyle(themes[mode], houseLook);

/** A failure written the way a theme editor shows it. */
export function seriesReport(theme: Theme): ReadonlyArray<string> {
  const report = seriesFailures(theme);
  return [
    ...report.surfaces.map(
      ({ index, surface, ratio }) =>
        `series ${index + 1} on ${surface} is ${ratio === undefined ? "unmeasurable" : ratio.toFixed(2)}`,
    ),
    ...report.distinctness.map(
      ({ index, other, distance }) =>
        `series ${index + 1} and ${other + 1} are ${distance === undefined ? "unmeasurable" : distance.toFixed(3)} apart`,
    ),
    ...report.deficiencies.map(
      ({ deficiency, index, other, distance }) =>
        `${deficiency}: series ${index + 1} and ${other + 1} are ${distance === undefined ? "unmeasurable" : distance.toFixed(3)} apart`,
    ),
  ];
}
