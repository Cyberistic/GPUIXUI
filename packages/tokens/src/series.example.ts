/**
 * A chart's palette, resolved from the theme, and the audit a brand runs on a
 * scale it authored. Executed by `series.test.ts`, so the call site the
 * catalogue and the design-system page teach is a real one.
 */

import {
  seriesColors,
  seriesFailures,
  type SeriesColors,
  type Theme,
} from "./index.js";
import { extendTheme, lightTheme } from "./theme.js";

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
  "#1F7A8C",
  "#2E7D32",
  "#A15C00",
  "#C02B45",
];

/** The same brand theme with the scale it owns. */
export const brandChartTheme: Theme = extendTheme(lightTheme, {
  name: "Acme charts",
  series: brandSeries,
});

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
  ];
}
