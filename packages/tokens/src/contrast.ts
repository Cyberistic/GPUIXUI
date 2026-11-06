import { themeColors, type ColourSource, type ThemeColors } from "./color.js";
import { relativeLuminance } from "./luminance.js";
import { themeContrastOf } from "./mode.js";

export function contrastRatio(
  foreground: string | undefined,
  background: string | undefined,
): number | undefined {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  if (first === undefined || second === undefined) {
    return undefined;
  }
  const high = Math.max(first, second);
  const low = Math.min(first, second);
  return (high + 0.05) / (low + 0.05);
}

export interface ContrastFloors {
  readonly body: number;

  readonly secondary: number;

  readonly boundary: number;

  readonly disabled: number;
}

export const contrastFloors: ContrastFloors = {
  body: 7,
  secondary: 4.5,
  boundary: 3,
  disabled: 1.5,
};

export const highContrastFloors: ContrastFloors = {
  body: 7,
  secondary: 7,
  boundary: 4.5,
  disabled: 3,
};

export interface ContrastSource {
  readonly contrast?: unknown;
}

export function contrastFloorsFor(theme: ContrastSource): ContrastFloors {
  return themeContrastOf(theme) === "high"
    ? highContrastFloors
    : contrastFloors;
}

export interface ContrastPair {
  readonly foreground: keyof ThemeColors;

  readonly background: keyof ThemeColors;

  readonly floor: keyof ContrastFloors;
}

export const contrastPairs: readonly ContrastPair[] = [
  { foreground: "foreground", background: "background", floor: "body" },
  { foreground: "foreground", background: "card", floor: "body" },

  { foreground: "foreground", background: "popover", floor: "body" },
  { foreground: "foreground", background: "muted", floor: "body" },
  { foreground: "cardForeground", background: "card", floor: "body" },
  { foreground: "popoverForeground", background: "popover", floor: "body" },
  { foreground: "inputForeground", background: "input", floor: "body" },

  { foreground: "inputForeground", background: "background", floor: "body" },
  { foreground: "placeholder", background: "background", floor: "secondary" },

  { foreground: "mutedForeground", background: "input", floor: "secondary" },
  {
    foreground: "mutedForeground",
    background: "background",
    floor: "secondary",
  },
  { foreground: "mutedForeground", background: "card", floor: "secondary" },
  { foreground: "mutedForeground", background: "muted", floor: "secondary" },
  {
    foreground: "mutedForeground",
    background: "popover",
    floor: "secondary",
  },
  {
    foreground: "secondaryForeground",
    background: "secondary",
    floor: "secondary",
  },
  {
    foreground: "primaryForeground",
    background: "primary",
    floor: "secondary",
  },
  {
    foreground: "destructiveForeground",
    background: "destructive",
    floor: "secondary",
  },
  {
    foreground: "successForeground",
    background: "success",
    floor: "secondary",
  },
  {
    foreground: "warningForeground",
    background: "warning",
    floor: "secondary",
  },
  { foreground: "infoForeground", background: "info", floor: "secondary" },
  { foreground: "infoSoftForeground", background: "infoSoft", floor: "body" },

  { foreground: "foreground", background: "infoSoft", floor: "body" },
  { foreground: "foreground", background: "successSoft", floor: "body" },
  { foreground: "foreground", background: "warningSoft", floor: "body" },
  { foreground: "foreground", background: "destructiveSoft", floor: "body" },

  {
    foreground: "mutedForeground",
    background: "successSoft",
    floor: "secondary",
  },
  {
    foreground: "mutedForeground",
    background: "destructiveSoft",
    floor: "secondary",
  },
  {
    foreground: "successSoftForeground",
    background: "successSoft",
    floor: "body",
  },
  {
    foreground: "warningSoftForeground",
    background: "warningSoft",
    floor: "body",
  },
  {
    foreground: "destructiveSoftForeground",
    background: "destructiveSoft",
    floor: "body",
  },

  { foreground: "infoSoftForeground", background: "background", floor: "body" },
  { foreground: "infoSoftForeground", background: "card", floor: "body" },
  {
    foreground: "successSoftForeground",
    background: "background",
    floor: "body",
  },
  { foreground: "successSoftForeground", background: "card", floor: "body" },
  {
    foreground: "warningSoftForeground",
    background: "background",
    floor: "body",
  },
  { foreground: "warningSoftForeground", background: "card", floor: "body" },
  {
    foreground: "destructiveSoftForeground",
    background: "background",
    floor: "body",
  },
  {
    foreground: "destructiveSoftForeground",
    background: "card",
    floor: "body",
  },

  { foreground: "infoSoftForeground", background: "popover", floor: "body" },
  {
    foreground: "successSoftForeground",
    background: "popover",
    floor: "body",
  },
  {
    foreground: "warningSoftForeground",
    background: "popover",
    floor: "body",
  },
  {
    foreground: "destructiveSoftForeground",
    background: "popover",
    floor: "body",
  },

  { foreground: "infoSoftForeground", background: "muted", floor: "body" },
  { foreground: "successSoftForeground", background: "muted", floor: "body" },
  { foreground: "warningSoftForeground", background: "muted", floor: "body" },
  {
    foreground: "destructiveSoftForeground",
    background: "muted",
    floor: "body",
  },

  {
    foreground: "accentForeground",
    background: "accent",
    floor: "body",
  },

  { foreground: "foreground", background: "hover", floor: "body" },
  { foreground: "foreground", background: "active", floor: "body" },
  { foreground: "foreground", background: "accent", floor: "body" },
  { foreground: "mutedForeground", background: "hover", floor: "secondary" },
  { foreground: "mutedForeground", background: "active", floor: "secondary" },
  { foreground: "mutedForeground", background: "accent", floor: "secondary" },

  {
    foreground: "foreground",
    background: "secondary",
    floor: "body",
  },
  {
    foreground: "mutedForeground",
    background: "secondary",
    floor: "secondary",
  },

  { foreground: "foreground", background: "selected", floor: "body" },
  {
    foreground: "selectedForeground",
    background: "selected",
    floor: "body",
  },
  { foreground: "selectedForeground", background: "hover", floor: "body" },
  { foreground: "selectedForeground", background: "active", floor: "body" },
  { foreground: "selectedForeground", background: "accent", floor: "body" },

  { foreground: "popoverForeground", background: "hover", floor: "body" },
  { foreground: "popoverForeground", background: "active", floor: "body" },

  { foreground: "popoverForeground", background: "selected", floor: "body" },
  {
    foreground: "destructiveSoftForeground",
    background: "hover",
    floor: "body",
  },
  {
    foreground: "destructiveSoftForeground",
    background: "active",
    floor: "body",
  },

  {
    foreground: "destructiveSoftForeground",
    background: "selected",
    floor: "body",
  },
  {
    foreground: "destructiveSoftForeground",
    background: "accent",
    floor: "body",
  },
  { foreground: "placeholder", background: "input", floor: "secondary" },
  { foreground: "borderStrong", background: "background", floor: "boundary" },
  { foreground: "borderStrong", background: "card", floor: "boundary" },
  { foreground: "borderStrong", background: "input", floor: "boundary" },
  { foreground: "ring", background: "background", floor: "boundary" },
  { foreground: "ring", background: "card", floor: "boundary" },
  { foreground: "ring", background: "popover", floor: "boundary" },

  { foreground: "ring", background: "muted", floor: "boundary" },
  { foreground: "ring", background: "secondary", floor: "boundary" },

  { foreground: "ring", background: "input", floor: "boundary" },
  { foreground: "ring", background: "selected", floor: "boundary" },
  { foreground: "ring", background: "hover", floor: "boundary" },
  { foreground: "ring", background: "active", floor: "boundary" },
  { foreground: "ring", background: "accent", floor: "boundary" },

  { foreground: "borderStrong", background: "muted", floor: "boundary" },
  { foreground: "borderStrong", background: "secondary", floor: "boundary" },

  { foreground: "borderStrong", background: "popover", floor: "boundary" },

  { foreground: "borderStrong", background: "hover", floor: "boundary" },
  { foreground: "borderStrong", background: "active", floor: "boundary" },

  { foreground: "borderStrong", background: "accent", floor: "boundary" },
  { foreground: "borderStrong", background: "selected", floor: "boundary" },

  { foreground: "borderStrong", background: "infoSoft", floor: "boundary" },
  { foreground: "borderStrong", background: "successSoft", floor: "boundary" },
  { foreground: "borderStrong", background: "warningSoft", floor: "boundary" },
  {
    foreground: "borderStrong",
    background: "destructiveSoft",
    floor: "boundary",
  },

  { foreground: "ring", background: "infoSoft", floor: "boundary" },
  { foreground: "ring", background: "successSoft", floor: "boundary" },
  { foreground: "ring", background: "warningSoft", floor: "boundary" },
  { foreground: "ring", background: "destructiveSoft", floor: "boundary" },

  { foreground: "destructive", background: "input", floor: "boundary" },
  { foreground: "destructive", background: "secondary", floor: "boundary" },

  {
    foreground: "disabledForeground",
    background: "disabled",
    floor: "disabled",
  },

  {
    foreground: "disabledForeground",
    background: "background",
    floor: "disabled",
  },
  { foreground: "disabledForeground", background: "card", floor: "disabled" },
  {
    foreground: "disabledForeground",
    background: "popover",
    floor: "disabled",
  },

  { foreground: "disabledForeground", background: "muted", floor: "disabled" },
  {
    foreground: "disabledForeground",
    background: "secondary",
    floor: "disabled",
  },

  {
    foreground: "mutedForeground",
    background: "selected",
    floor: "secondary",
  },
];

export interface ContrastFailure {
  readonly foreground: keyof ThemeColors;

  readonly background: keyof ThemeColors;

  readonly ratio: number | undefined;

  readonly floor: number;
}

export function contrastFailures(
  theme: ColourSource & ContrastSource,
  floors: ContrastFloors = contrastFloorsFor(theme),
): readonly ContrastFailure[] {
  const colors = themeColors(theme);
  return contrastPairs.flatMap(({ foreground, background, floor }) => {
    const ratio = contrastRatio(colors[foreground], colors[background]);
    return ratio !== undefined && ratio >= floors[floor]
      ? []
      : [{ foreground, background, ratio, floor: floors[floor] }];
  });
}
