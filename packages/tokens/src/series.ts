/**
 * The categorical scale for data marks — chart series, legend swatches, heat
 * map regions — where the colour carries identity rather than status.
 *
 * A semantic role answers "what is this?" (`destructive`, `success`), so reusing
 * one for a chart would make a revenue bar read as a warning. Letting each chart
 * pick its own hex is the scattered literal the design system forbids. Data
 * marks therefore get one fixed categorical scale, sized to the five categories
 * shadcn/ui's charts also ship, and held to the three contracts such a scale
 * needs: every colour is perceivable against the surfaces a plot is drawn on
 * (WCAG's 3:1 non-text floor), no two colours are the same colour to the eye
 * (an OKLab distance below which two swatches read as one), and no two still
 * collapse for a reader with a colour-vision deficiency.
 *
 * The scale is designed per mode and contrast variant because a categorical
 * hue that separates on a pale canvas does not separate on a dark one. A theme
 * may carry its own `series`; {@link seriesColors} otherwise resolves the
 * shipped table for the theme's mode and variant, so a platform or authored
 * look follows its base's palette without another table.
 */

import type { ThemeColors } from "./color.js";
import { contrastFloorsFor, contrastRatio } from "./contrast.js";
import { opaqueRgb } from "./hex.js";
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
  "#1B45AC",
  "#158754",
  "#B57600",
  "#A5262B",
];

/** The series scale for the default dark theme. */
export const darkSeries: SeriesColors = [
  "#A7A9FF",
  "#6E9CFF",
  "#1FA968",
  "#FFDE8A",
  "#FF9E9E",
];

/** The series scale for the high-contrast light theme. */
export const highContrastLightSeries: SeriesColors = [
  "#4C39B5",
  "#2559D6",
  "#0E5135",
  "#8E5B00",
  "#CC3439",
];

/** The series scale for the high-contrast dark theme. */
export const highContrastDarkSeries: SeriesColors = [
  "#C7CBFF",
  "#6E9CFF",
  "#3BC97F",
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

/**
 * The colour-vision deficiencies a categorical scale is measured against, in
 * documentation order: protanopia (no red-sensitive cones), deuteranopia (no
 * green-sensitive cones) and tritanopia (no blue-sensitive cones).
 */
export const colorVisionDeficiencies = [
  "protanopia",
  "deuteranopia",
  "tritanopia",
] as const;

/** One colour-vision deficiency a scale is measured against. */
export type ColorVisionDeficiency = (typeof colorVisionDeficiencies)[number];

/**
 * The OKLab distance two series colours must keep once a colour-vision
 * deficiency is simulated: 0.05, about two just-noticeable steps. Lower than
 * {@link seriesDistinctnessFloor} because a simulated scale has less hue range
 * to spend; the claim is narrower too — no two categories collapse into one.
 */
export const seriesDeficiencyFloor = 0.05;

type MatrixRow = readonly [number, number, number];

/**
 * Machado, Oliveira and Fernandes (2009), severity 1.0, in linear sRGB. Every
 * row sums to 1, so an achromatic colour survives a simulation unchanged.
 */
const deficiencyMatrices: Readonly<
  Record<ColorVisionDeficiency, readonly [MatrixRow, MatrixRow, MatrixRow]>
> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

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

/** Two series colours a reader with a colour-vision deficiency cannot tell apart. */
export interface SeriesVisionFailure {
  /** The deficiency the pair was simulated with. */
  readonly deficiency: ColorVisionDeficiency;
  /** The earlier position in the scale, zero-based. */
  readonly index: number;
  /** The later position. */
  readonly other: number;
  /** The simulated OKLab distance, or `undefined` when a colour cannot be read. */
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
  /** Pairs too close after each colour-vision deficiency is simulated. */
  readonly deficiencies: readonly SeriesVisionFailure[];
}

/** Floors a caller may tighten when auditing a series. */
export interface SeriesFloors {
  /** Contrast against a plot surface. Defaults to the variant's boundary floor. */
  readonly surface?: number;
  /** OKLab distance between two series. Defaults to {@link seriesDistinctnessFloor}. */
  readonly distinctness?: number;
  /** OKLab distance after a deficiency simulation. Defaults to {@link seriesDeficiencyFloor}. */
  readonly deficiency?: number;
}

const linear = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

const encode = (channel: number): number =>
  channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;

const clamp = (channel: number): number => Math.min(1, Math.max(0, channel));

/** Linear-light sRGB channels of an opaque hex colour, in any painted length. */
const linearRgb = (
  color: string,
): readonly [number, number, number] | undefined => {
  const rgb = opaqueRgb(color);
  return rgb === undefined
    ? undefined
    : [
        linear(Number.parseInt(rgb.slice(1, 3), 16) / 255),
        linear(Number.parseInt(rgb.slice(3, 5), 16) / 255),
        linear(Number.parseInt(rgb.slice(5, 7), 16) / 255),
      ];
};

/** An `#RRGGBB` colour from linear-light sRGB channels, clamped to the gamut. */
const hexFromLinear = (channels: readonly [number, number, number]): string =>
  `#${channels
    .map((channel) =>
      Math.round(clamp(encode(channel)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;

/** OKLab coordinates of an opaque `#RRGGBB` colour, or `undefined` otherwise. */
const oklab = (
  color: string,
): readonly [number, number, number] | undefined => {
  const rgb = linearRgb(color);
  if (rgb === undefined) {
    return undefined;
  }
  const [red, green, blue] = rgb;
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

/**
 * The colour a reader with `deficiency` sees, or `undefined` when `color` is not
 * an opaque `#RRGGBB` value.
 *
 * The simulation is a model, not a diagnosis: it applies the severity-1.0
 * matrices of Machado, Oliveira and Fernandes (2009) to linear sRGB, i.e.
 * dichromatic protanopia, deuteranopia and tritanopia. Anomalous trichromacy,
 * acquired deficiency and display calibration are outside it. It answers "do
 * these two swatches still differ for that reader", not "what exactly does this
 * reader see".
 *
 * @example
 * ```ts
 * import { simulateColorVision } from "@gpuixui/tokens";
 *
 * simulateColorVision("#C02B45", "deuteranopia"); // that red, as a deuteranope sees it
 * ```
 */
export function simulateColorVision(
  color: string,
  deficiency: ColorVisionDeficiency,
): string | undefined {
  const rgb = linearRgb(color);
  if (rgb === undefined) {
    return undefined;
  }
  const matrix = deficiencyMatrices[deficiency];
  const applied = (row: MatrixRow): number =>
    row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2];
  return hexFromLinear([
    applied(matrix[0]),
    applied(matrix[1]),
    applied(matrix[2]),
  ]);
}

/** A theme with the fields a series audit reads. */
type SeriesAuditSource = SeriesSource & {
  readonly colors: Partial<ThemeColors>;
};

/**
 * Every way a theme's categorical scale fails its three contracts.
 *
 * A plot surface is measured at the theme's own variant: 3:1 for a default
 * theme and 4.5:1 for a high-contrast one. A translucent or malformed series
 * colour is reported, not skipped — a swatch nobody can verify is not a pass.
 * The last contract simulates each colour for protanopia, deuteranopia and
 * tritanopia and measures the same OKLab distance again, because a pair that
 * separates for a full-colour reader can still collapse into one swatch for a
 * reader who cannot tell its two hues apart. Every option is a floor, so a
 * caller can hold an authored scale to a stricter contract than the variant
 * asks for; the variant still decides the surface default.
 *
 * @example
 * ```ts
 * import { seriesFailures, themes } from "@gpuixui/tokens";
 *
 * const report = seriesFailures(themes.light);
 * report.surfaces.length === 0; // every swatch is perceivable on a plot
 * report.deficiencies.length === 0; // and no two collapse for a colour-blind reader
 * ```
 */
export function seriesFailures(
  theme: SeriesAuditSource,
  floors: SeriesFloors = {},
): SeriesReport {
  const variant = contrastFloorsFor(theme);
  const surfaceFloor = floors.surface ?? variant.boundary;
  const distinctnessFloor = floors.distinctness ?? seriesDistinctnessFloor;
  const deficiencyFloor = floors.deficiency ?? seriesDeficiencyFloor;
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
  const deficiencies = colorVisionDeficiencies.flatMap((deficiency) =>
    series.flatMap((color, index) =>
      series.slice(index + 1).flatMap((other, offset) => {
        const simulated = simulateColorVision(color, deficiency);
        const simulatedOther = simulateColorVision(other, deficiency);
        const distance =
          simulated === undefined || simulatedOther === undefined
            ? undefined
            : colorDistance(simulated, simulatedOther);
        return distance !== undefined && distance >= deficiencyFloor
          ? []
          : [
              {
                deficiency,
                index,
                other: index + 1 + offset,
                distance,
                floor: deficiencyFloor,
              },
            ];
      }),
    ),
  );
  return { surfaces, distinctness, deficiencies };
}
