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
 * The scale a look needs when it repaints the strips a plot is drawn on, and the
 * look that carries it.
 *
 * Windows XP's Luna light edition is the measured case: its `#ECE9D8` page and
 * `#E0DCCB` toolbar swallow the shared light amber (`#B57600`), which reads
 * **2.75:1** there — a chart in that status bar would have one series nobody can
 * find. The same five hues with the amber one step deeper clear the look's page,
 * card, popover and toolbar (tightest 3.67:1, that amber on the toolbar) and keep
 * every pair apart for a dichromat: the ramp's own `700` step, `#8E5B00`, is
 * 0.044 from the red under deuteranopia, under the 0.05 floor.
 *
 * A look owns the scale in the `PlatformStyle` shape, per mode, and `applyStyle`
 * hands it to the base theme under the same `contrast` rule as the look's
 * palette. A consumer copies the style they ship — this is the copy of Luna with
 * one more field — rather than naming a new platform.
 */
export const beigeSeries: SeriesColors = [
  "#5F4BDB",
  "#1B45AC",
  "#158754",
  "#9A6300",
  "#A5262B",
];

/** The Luna look, with the light-edition scale its own strips need. */
export const beigeLook: PlatformStyle = {
  ...retroStyles.luna,
  label: "Windows XP (Luna) · house",
  series: { light: beigeSeries },
};

/** The look applied to a base theme, which is what a chart is painted on. */
export const beigeTheme = (mode: ThemeMode): Theme =>
  applyStyle(themes[mode], beigeLook);

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
