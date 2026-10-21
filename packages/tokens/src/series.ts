/**
 * The categorical scale for data marks — chart series, legend swatches, heat
 * map regions — where the colour carries identity rather than status.
 *
 * A semantic role answers "what is this?" (`destructive`, `success`), so reusing
 * one for a chart would make a revenue bar read as a warning. Letting each chart
 * pick its own hex is the scattered literal the design system forbids. Data
 * marks therefore get one fixed categorical scale, sized to the five categories
 * shadcn/ui's charts also ship, and held to the two contracts such a scale
 * needs: every colour is perceivable against the surfaces a plot is drawn on
 * (WCAG's 3:1 non-text floor), and no two colours are the same colour to the
 * eye (an OKLab distance below which two swatches read as one).
 *
 * The scale is designed per mode and contrast variant because a categorical
 * hue that separates on a pale canvas does not separate on a dark one. A theme
 * may carry its own `series`; {@link seriesColors} otherwise resolves the
 * shipped table for the theme's mode and variant, so a platform or authored
 * look follows its base's palette without another table.
 */

import type { ThemeColors } from "./color.js";
import {
  contrastFloors,
  contrastRatio,
  highContrastFloors,
} from "./contrast.js";
import type { ThemeContrast, ThemeMode } from "./theme.js";

/**
 * One categorical scale: five colours, in the order a chart assigns them. A
 * tuple rather than an array, so a theme cannot carry four or six and leave the
 * legend short; a chart with more categories folds the tail into "Other".
 */
export type SeriesColors = readonly [string, string, string, string, string];

/** The series scale for the default light theme. */
export const lightSeries: SeriesColors = [
  "#5F4BDB",
  "#0E7490",
  "#158754",
  "#B57600",
  "#CC3439",
];

/** The series scale for the default dark theme. */
export const darkSeries: SeriesColors = [
  "#A7A9FF",
  "#67D4E8",
  "#6FE0A3",
  "#FFC94D",
  "#FF6B6B",
];

/** The series scale for the high-contrast light theme. */
export const highContrastLightSeries: SeriesColors = [
  "#3B2C8F",
  "#0B4A57",
  "#0E5135",
  "#6B4500",
  "#7E1D21",
];

/** The series scale for the high-contrast dark theme. */
export const highContrastDarkSeries: SeriesColors = [
  "#D6D2FF",
  "#A8E8F5",
  "#A8F0C6",
  "#FFE7A8",
  "#FFC6C6",
];

/**
 * The surfaces a plot is drawn on, so every series colour is measured where a
 * chart actually paints it: the page, a card and a popover.
 */
export const seriesSurfaces = ["background", "card", "popover"] as const;

/**
 * The OKLab distance two series colours must reach to read as two categories.
 *
 * Contrast ratio cannot answer this: a blue and a violet of the same lightness
 * have a ratio near 1 yet are plainly different colours, while two tints of one
 * hue can pass a ratio and read as the same series. OKLab distance tracks
 * perceived difference, and 0.06 is roughly three just-noticeable steps — below
 * it a legend swatch is indistinguishable from its neighbour at chart size.
 * The high-contrast palettes sit closest to it (0.069 and 0.075), because a
 * palette squeezed to AAA luminance has less hue range to spend.
 */
export const seriesDistinctnessFloor = 0.06;

/** A theme's mode, contrast variant and optional authored series. */
export interface SeriesSource {
  readonly mode: ThemeMode;
  readonly contrast?: ThemeContrast;
  readonly series?: SeriesColors;
}

/**
 * The categorical scale a theme paints its data marks in.
 *
 * A theme that carries `series` owns it — the array replaces the shipped one
 * whole, like an elevation level — and every other theme resolves the table for
 * its mode and contrast variant.
 *
 * @example
 * ```ts
 * import { seriesColors, themes } from "@gpuixui/tokens";
 *
 * const bars = seriesColors(themes.dark); // five colours, series 1 to 5
 * ```
 */
export function seriesColors(theme: SeriesSource): SeriesColors {
  if (theme.series !== undefined) {
    return theme.series;
  }
  if (theme.contrast === "high") {
    return theme.mode === "dark"
      ? highContrastDarkSeries
      : highContrastLightSeries;
  }
  return theme.mode === "dark" ? darkSeries : lightSeries;
}

/** One series colour that is not perceivable on a surface it can be drawn on. */
export interface SeriesSurfaceFailure {
  /** Its position in the scale, zero-based. */
  readonly index: number;
  /** The colour that failed. */
  readonly color: string;
  /** The surface it was measured against. */
  readonly surface: (typeof seriesSurfaces)[number];
  /** The measured ratio, or `undefined` when the colour is not opaque hex. */
  readonly ratio: number | undefined;
  /** The floor it had to reach. */
  readonly floor: number;
}

/** Two series colours a reader cannot tell apart. */
export interface SeriesDistinctnessFailure {
  /** The earlier position in the scale, zero-based. */
  readonly index: number;
  /** The later position. */
  readonly other: number;
  /** The measured OKLab distance, or `undefined` when a colour cannot be read. */
  readonly distance: number | undefined;
  /** The floor it had to reach. */
  readonly floor: number;
}

/** What a theme's series scale fails, if anything. */
export interface SeriesReport {
  /** Series colours too close to a surface a plot is drawn on. */
  readonly surfaces: readonly SeriesSurfaceFailure[];
  /** Pairs of series colours too close to each other. */
  readonly distinctness: readonly SeriesDistinctnessFailure[];
}

/** Floors a caller may tighten when auditing a series. */
export interface SeriesFloors {
  /** Contrast against a plot surface. Defaults to the variant's boundary floor. */
  readonly surface?: number;
  /** OKLab distance between two series. Defaults to {@link seriesDistinctnessFloor}. */
  readonly distinctness?: number;
}

const opaqueHex = /^#[0-9A-Fa-f]{6}$/;

const linear = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

/** OKLab coordinates of an opaque `#RRGGBB` colour, or `undefined` otherwise. */
const oklab = (
  color: string,
): readonly [number, number, number] | undefined => {
  if (!opaqueHex.test(color)) {
    return undefined;
  }
  const red = linear(Number.parseInt(color.slice(1, 3), 16) / 255);
  const green = linear(Number.parseInt(color.slice(3, 5), 16) / 255);
  const blue = linear(Number.parseInt(color.slice(5, 7), 16) / 255);
  const l =
    (0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue) **
    (1 / 3);
  const m =
    (0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue) **
    (1 / 3);
  const s =
    (0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue) **
    (1 / 3);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

/**
 * The perceived distance between two colours — Euclidean distance in OKLab,
 * where 0 is identical and 1 is black against white.
 */
const colorDistance = (first: string, second: string): number | undefined => {
  const left = oklab(first);
  const right = oklab(second);
  if (left === undefined || right === undefined) {
    return undefined;
  }
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
};

/** A theme with the fields a series audit reads. */
type SeriesAuditSource = SeriesSource & { readonly colors: ThemeColors };

/**
 * Every way a theme's categorical scale fails its two contracts.
 *
 * A plot surface is measured at the theme's own variant: 3:1 for a default
 * theme and 4.5:1 for a high-contrast one. A translucent or malformed series
 * colour is reported, not skipped — a swatch nobody can verify is not a pass.
 * Both options are floors, so a caller can hold an authored scale to a stricter
 * contract than the variant asks for; the variant still decides the default.
 *
 * @example
 * ```ts
 * import { seriesFailures, themes } from "@gpuixui/tokens";
 *
 * const report = seriesFailures(themes.light);
 * report.surfaces.length === 0; // every swatch is perceivable on a plot
 * ```
 */
export function seriesFailures(
  theme: SeriesAuditSource,
  floors: SeriesFloors = {},
): SeriesReport {
  const variant =
    theme.contrast === "high" ? highContrastFloors : contrastFloors;
  const surfaceFloor = floors.surface ?? variant.boundary;
  const distinctnessFloor = floors.distinctness ?? seriesDistinctnessFloor;
  const series = seriesColors(theme);
  const surfaces = seriesSurfaces.flatMap((surface) =>
    series.flatMap((color, index) => {
      const ratio = contrastRatio(color, theme.colors[surface]);
      return ratio !== undefined && ratio >= surfaceFloor
        ? []
        : [{ index, color, surface, ratio, floor: surfaceFloor }];
    }),
  );
  const distinctness = series.flatMap((color, index) =>
    series.slice(index + 1).flatMap((other, offset) => {
      const distance = colorDistance(color, other);
      return distance !== undefined && distance >= distinctnessFloor
        ? []
        : [
            {
              index,
              other: index + 1 + offset,
              distance,
              floor: distinctnessFloor,
            },
          ];
    }),
  );
  return { surfaces, distinctness };
}
