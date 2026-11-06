import {
  namesColour,
  themeColors,
  type ColourSource,
  type ThemeColors,
} from "./color.js";
import { contrastFloorsFor, contrastRatio } from "./contrast.js";
import { opaqueRgb } from "./measure.js";
import { themeContrastOf, themeModeOf } from "./mode.js";

export type SeriesColors = readonly [string, string, string, string, string];

export type StoredSeries = ReadonlyArray<unknown>;

export const lightSeries: SeriesColors = [
  "#5F4BDB",
  "#1B45AC",
  "#158754",
  "#B57600",
  "#A5262B",
];

export const darkSeries: SeriesColors = [
  "#A7A9FF",
  "#6E9CFF",
  "#1FA968",
  "#FFDE8A",
  "#FF9E9E",
];

export const highContrastLightSeries: SeriesColors = [
  "#4C39B5",
  "#2559D6",
  "#0E5135",
  "#8E5B00",
  "#CC3439",
];

export const highContrastDarkSeries: SeriesColors = [
  "#C7CBFF",
  "#6E9CFF",
  "#3BC97F",
  "#FFE7A8",
  "#FFC6C6",
];

export type SeriesSurface = keyof ThemeColors;

export const seriesSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
] as const;

export const seriesDistinctnessFloor = 0.06;

export const colorVisionDeficiencies = [
  "protanopia",
  "deuteranopia",
  "tritanopia",
] as const;

export type ColorVisionDeficiency = (typeof colorVisionDeficiencies)[number];

export const seriesDeficiencyFloor = 0.05;

type MatrixRow = readonly [number, number, number];

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

const seriesPositions = [0, 1, 2, 3, 4] as const;

export interface SeriesSource extends ColourSource {
  readonly mode?: unknown;

  readonly contrast?: unknown;

  readonly series?: StoredSeries | null;
}

const shippedSeries = (theme: SeriesSource): SeriesColors => {
  const mode = themeModeOf(theme);
  if (themeContrastOf(theme) === "high") {
    return mode === "dark" ? highContrastDarkSeries : highContrastLightSeries;
  }
  return mode === "dark" ? darkSeries : lightSeries;
};

const isCompleteSeries = (scale: StoredSeries): scale is SeriesColors =>
  scale.length === seriesPositions.length && scale.every(namesColour);

export function seriesPalette(
  stored: StoredSeries,
  fallback: SeriesColors,
): SeriesColors {
  if (isCompleteSeries(stored)) {
    return stored;
  }
  const at = (position: 0 | 1 | 2 | 3 | 4): string => {
    const value = stored[position];
    return namesColour(value) ? value : fallback[position];
  };
  return [at(0), at(1), at(2), at(3), at(4)];
}

export function seriesColors(theme: SeriesSource): SeriesColors {
  const table = shippedSeries(theme);
  return theme.series == null ? table : seriesPalette(theme.series, table);
}

export interface SeriesSurfaceFailure {
  readonly index: number;

  readonly color: string | undefined;

  readonly surface: SeriesSurface;

  readonly ratio: number | undefined;

  readonly floor: number;
}

export interface SeriesDistinctnessFailure {
  readonly index: number;

  readonly other: number;

  readonly distance: number | undefined;

  readonly floor: number;
}

export interface SeriesVisionFailure {
  readonly deficiency: ColorVisionDeficiency;

  readonly index: number;

  readonly other: number;

  readonly distance: number | undefined;

  readonly floor: number;
}

export interface SeriesReport {
  readonly surfaces: readonly SeriesSurfaceFailure[];

  readonly distinctness: readonly SeriesDistinctnessFailure[];

  readonly deficiencies: readonly SeriesVisionFailure[];
}

export interface SeriesContract {
  readonly surface?: number;

  readonly surfaces?: readonly SeriesSurface[];

  readonly distinctness?: number;

  readonly deficiency?: number;
}

const linear = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

const encode = (channel: number): number =>
  channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;

const clamp = (channel: number): number => Math.min(1, Math.max(0, channel));

const linearRgb = (
  color: string | undefined,
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

const hexFromLinear = (channels: readonly [number, number, number]): string =>
  `#${channels
    .map((channel) =>
      Math.round(clamp(encode(channel)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;

const oklab = (
  color: string | undefined,
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

const colorDistance = (
  first: string | undefined,
  second: string | undefined,
): number | undefined => {
  const left = oklab(first);
  const right = oklab(second);
  if (left === undefined || right === undefined) {
    return undefined;
  }
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
};

export function simulateColorVision(
  color: string | undefined,
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

export type SeriesAuditSource = Omit<SeriesSource, "series"> &
  ColourSource & {
    readonly series?: StoredSeries | null;
  };

export function seriesFailures(
  theme: SeriesAuditSource,
  contract: SeriesContract = {},
): SeriesReport {
  const variant = contrastFloorsFor(theme);
  const surfaces = contract.surfaces ?? seriesSurfaces;
  const surfaceFloor = contract.surface ?? variant.boundary;
  const distinctnessFloor = contract.distinctness ?? seriesDistinctnessFloor;
  const deficiencyFloor = contract.deficiency ?? seriesDeficiencyFloor;
  const series: StoredSeries =
    theme.series ??
    seriesColors({
      mode: theme.mode,
      contrast: theme.contrast,
      colors: theme.colors,
    });

  const at = (position: number): string | undefined => {
    const color = series[position];
    return namesColour(color) ? color : undefined;
  };
  const surfaceFailures = surfaces.flatMap((surface) =>
    seriesPositions.flatMap((index) => {
      const color = at(index);
      const ratio = contrastRatio(color, themeColors(theme)[surface]);
      return ratio !== undefined && ratio >= surfaceFloor
        ? []
        : [{ index, color, surface, ratio, floor: surfaceFloor }];
    }),
  );
  const distinctness = seriesPositions.flatMap((index) =>
    seriesPositions
      .filter((other) => other > index)
      .flatMap((other) => {
        const distance = colorDistance(at(index), at(other));
        return distance !== undefined && distance >= distinctnessFloor
          ? []
          : [{ index, other, distance, floor: distinctnessFloor }];
      }),
  );
  const deficiencies = colorVisionDeficiencies.flatMap((deficiency) =>
    seriesPositions.flatMap((index) =>
      seriesPositions
        .filter((other) => other > index)
        .flatMap((other) => {
          const color = at(index);
          const otherColor = at(other);
          const simulated =
            color === undefined
              ? undefined
              : simulateColorVision(color, deficiency);
          const simulatedOther =
            otherColor === undefined
              ? undefined
              : simulateColorVision(otherColor, deficiency);
          const distance =
            simulated === undefined || simulatedOther === undefined
              ? undefined
              : colorDistance(simulated, simulatedOther);
          return distance !== undefined && distance >= deficiencyFloor
            ? []
            : [{ deficiency, index, other, distance, floor: deficiencyFloor }];
        }),
    ),
  );
  return { surfaces: surfaceFailures, distinctness, deficiencies };
}
