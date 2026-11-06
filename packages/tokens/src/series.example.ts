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

export interface LegendRow {
  readonly label: string;
  readonly color: string;
}

const SERIES_LIMIT = 5;

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

export const brandSeries: SeriesColors = [
  "#6A45F0",
  "#0E7490",
  "#116A43",
  "#B57600",
  "#A5262B",
];

export const brandChartTheme: Theme = extendTheme(lightTheme, {
  name: "Acme charts",
  series: brandSeries,
});

export const houseSeries: SeriesColors = [
  "#6A45F0",
  "#0E7490",
  "#116A43",
  "#9A6300",
  "#A5262B",
];

export const houseLook: PlatformStyle = {
  ...retroStyles.luna,
  label: "Windows XP (Luna) · house",
  series: { light: houseSeries },
};

export const houseTheme = (mode: ThemeMode): Theme =>
  applyStyle(themes[mode], houseLook);

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
