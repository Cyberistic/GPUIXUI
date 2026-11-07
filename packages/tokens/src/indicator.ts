import { themeColors, type ColourSource, type ThemeColors } from "./color.js";
import {
  contrastFloorsFor,
  contrastRatio,
  type ContrastFloors,
  type ContrastSource,
} from "./contrast.js";
import { statusTones } from "./styles.js";

export const indicatorRoles = [
  "primary",
  "success",
  "destructive",
  "mutedForeground",
  ...statusTones.map((tone) => `${tone}SoftForeground` as const),
] as const satisfies readonly (keyof ThemeColors)[];

export const indicatorSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",

  "input",
  ...statusTones.map((tone) => `${tone}Soft` as const),
] as const;

export interface IndicatorFailure {
  readonly role: keyof ThemeColors;

  readonly surface: keyof ThemeColors;

  readonly ratio: number | undefined;

  readonly floor: number;
}

export function indicatorFailures(
  theme: ColourSource & ContrastSource,
  floors: ContrastFloors = contrastFloorsFor(theme),
): readonly IndicatorFailure[] {
  const colors = themeColors(theme);
  return indicatorRoles.flatMap((role) =>
    indicatorSurfaces.flatMap((surface): ReadonlyArray<IndicatorFailure> => {
      const ratio = contrastRatio(colors[role], colors[surface]);
      return ratio !== undefined && ratio >= floors.boundary
        ? []
        : [{ role, surface, ratio, floor: floors.boundary }];
    }),
  );
}
