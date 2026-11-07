import {
  blend,
  isColorRole,
  themeColors,
  type ColourSource,
  type ThemeColors,
} from "./color.js";
import {
  contrastFloorsFor,
  contrastRatio,
  type ContrastFloors,
  type ContrastSource,
} from "./contrast.js";
import type { Theme } from "./theme.js";

export const brandTextSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

const TEXT_STEPS = 50;

type BrandSource = ColourSource & ContrastSource;

const worstRatio = (
  theme: ColourSource,
  colour: string,
): number | undefined => {
  const colors = themeColors(theme);
  return brandTextSurfaces.reduce<number | undefined>((worst, surface) => {
    const ratio = contrastRatio(colour, colors[surface]);
    return worst === undefined || ratio === undefined
      ? undefined
      : Math.min(worst, ratio);
  }, Number.POSITIVE_INFINITY);
};

const derivedBrandText = (
  theme: ColourSource,
  legible: (colour: string) => boolean,
): string | undefined => {
  const { primary, foreground } = themeColors(theme);
  return primary === undefined || foreground === undefined
    ? undefined
    : (Array.from({ length: TEXT_STEPS + 1 }, (_, step) =>
        blend(primary, foreground, step / TEXT_STEPS),
      ).find(legible) ?? blend(primary, foreground, 1));
};

const anywhereLegible =
  (theme: BrandSource, floors: ContrastFloors) =>
  (colour: string): boolean => {
    const ratio = worstRatio(theme, colour);
    return ratio === undefined || ratio >= floors.secondary;
  };

export function brandText(theme: Theme, floors?: ContrastFloors): string;
export function brandText(
  theme: BrandSource,
  floors?: ContrastFloors,
): string | undefined;
export function brandText(
  theme: BrandSource,
  floors: ContrastFloors = contrastFloorsFor(theme),
): string | undefined {
  return derivedBrandText(theme, anywhereLegible(theme, floors));
}

export function brandTextOn(
  theme: Theme,
  surface: keyof ThemeColors,
  floors?: ContrastFloors,
): string;
export function brandTextOn(
  theme: BrandSource,
  surface: keyof ThemeColors,
  floors?: ContrastFloors,
): string | undefined;
export function brandTextOn(
  theme: BrandSource,
  surface: keyof ThemeColors,
  floors: ContrastFloors = contrastFloorsFor(theme),
): string | undefined {
  const role = isColorRole(surface) ? surface : undefined;
  if (role === undefined) {
    return derivedBrandText(theme, anywhereLegible(theme, floors));
  }
  const legible = (colour: string): boolean => {
    const ratio = contrastRatio(colour, themeColors(theme)[role]);
    return ratio === undefined || ratio >= floors.secondary;
  };
  return derivedBrandText(theme, legible);
}
