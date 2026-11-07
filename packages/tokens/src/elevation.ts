import {
  alpha,
  alphaOf,
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  isPaintableColor,
  lightColors,
} from "./color.js";
import { measuredColour } from "./measure.js";
import type { Stored } from "./theme.js";

export interface BoxShadow {
  readonly offsetX: number;

  readonly offsetY: number;

  readonly blurRadius: number;

  readonly spreadRadius: number;

  readonly color: string;
}

export interface Elevation {
  readonly sm: BoxShadow[];

  readonly md: BoxShadow[];

  readonly lg: BoxShadow[];

  readonly overlay: BoxShadow[];
}

export type ElevationLevel = keyof Elevation;

export const elevationLevels = [
  "sm",
  "md",
  "lg",
  "overlay",
] as const satisfies readonly ElevationLevel[];

export const isElevationLevel = (value: unknown): value is ElevationLevel =>
  elevationLevels.some((level) => level === value);

const isShadow = (value: unknown): value is BoxShadow =>
  typeof value === "object" && value !== null;

const shadowColor = (shadow: unknown): string | undefined =>
  isShadow(shadow) && typeof shadow.color === "string"
    ? shadow.color
    : undefined;

export function elevationShadow(
  theme: ShadowSource,
  level: ElevationLevel,
): BoxShadow | undefined {
  const shadows: unknown =
    theme.elevation?.[isElevationLevel(level) ? level : "md"];
  const first: unknown = Array.isArray(shadows) ? shadows[0] : undefined;
  return isShadow(first) ? first : undefined;
}

export interface ShadowSource {
  readonly elevation?: Stored<Elevation>;
}

export interface InvalidShadowColor {
  readonly level: ElevationLevel;

  readonly index: number;

  readonly color: string | undefined;
}

export function invalidShadowColors(
  theme: ShadowSource,
): readonly InvalidShadowColor[] {
  return elevationLevels.flatMap((level): ReadonlyArray<InvalidShadowColor> => {
    const shadows: unknown = theme.elevation?.[level];

    if (!Array.isArray(shadows)) {
      return [{ level, index: 0, color: undefined }];
    }
    return shadows.flatMap((shadow: unknown, index) => {
      const color = shadowColor(shadow);
      return isPaintableColor(color) ? [] : [{ level, index, color }];
    });
  });
}

const strength = {
  light: { sm: 0.08, md: 0.12, lg: 0.16 },
  dark: { sm: 0.4, md: 0.65, lg: 0.8 },
} as const;

const level = (
  offsetY: number,
  blurRadius: number,
  spreadRadius: number,
  share: number,
  tint: string,
): BoxShadow[] => [
  {
    offsetX: 0,
    offsetY,
    blurRadius,
    spreadRadius,
    color: alpha(tint, share),
  },
];

export type ElevationSource = Partial<Record<ElevationLevel, unknown>>;

const retintedShadow = (shadow: unknown, tint: string): unknown => {
  const color = shadowColor(shadow);
  if (!isShadow(shadow) || measuredColour(color) === undefined) {
    return shadow;
  }
  return { ...shadow, color: alpha(tint, alphaOf(color)) };
};

const retintedLevel = (shadows: unknown, tint: string): unknown =>
  Array.isArray(shadows)
    ? shadows.map((shadow: unknown) => retintedShadow(shadow, tint))
    : shadows;

export function elevationWithTint(
  elevation: Elevation,
  tint: string,
): Elevation;
export function elevationWithTint(
  elevation: ElevationSource | undefined,
  tint: string,
): ElevationSource;
export function elevationWithTint(
  elevation: ElevationSource | undefined,
  tint: string,
): ElevationSource {
  return {
    sm: retintedLevel(elevation?.sm, tint),
    md: retintedLevel(elevation?.md, tint),
    lg: retintedLevel(elevation?.lg, tint),
    overlay: retintedLevel(elevation?.overlay, tint),
  };
}

export const lightElevation: Elevation = {
  sm: level(1, 2, 0, strength.light.sm, lightColors.shadow),
  md: level(4, 12, -2, strength.light.md, lightColors.shadow),
  lg: level(16, 40, -8, strength.light.lg, lightColors.shadow),
  overlay: [],
};

export const darkElevation: Elevation = {
  sm: level(1, 2, 0, strength.dark.sm, darkColors.shadow),
  md: level(8, 24, -4, strength.dark.md, darkColors.shadow),
  lg: level(24, 56, -12, strength.dark.lg, darkColors.shadow),
  overlay: [],
};

export const highContrastLightElevation: Elevation = elevationWithTint(
  lightElevation,
  highContrastLightColors.shadow,
);

export const highContrastDarkElevation: Elevation = elevationWithTint(
  darkElevation,
  highContrastDarkColors.shadow,
);
