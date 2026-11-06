import { themeColors, type ColourSource } from "./color.js";
import { contrastFloors, contrastRatio } from "./contrast.js";
import { fadedPair, type FadeFailure, type FadePair } from "./fade.js";
import type { Theme } from "./theme.js";

export const disabledOpacity = 0.5;

export type DisabledFadePair = FadePair;

const fieldFills = ["input", "background"] as const;

const fieldLabels = ["inputForeground", "placeholder"] as const;

const fieldStrips = ["background", "card", "popover", "muted"] as const;

export const disabledFadePairs: readonly DisabledFadePair[] = [
  { fill: "primary", label: "primaryForeground", over: "background" },
  { fill: "destructive", label: "destructiveForeground", over: "background" },
  { fill: "secondary", label: "secondaryForeground", over: "background" },
  ...fieldFills.flatMap((fill) =>
    fieldLabels.flatMap((label) =>
      fieldStrips.map((over) => ({ fill, label, over })),
    ),
  ),
];

export type DisabledFadeFailure = FadeFailure;

export function disabledFadeFailures(
  theme: ColourSource,
  floor: number = contrastFloors.disabled,
): readonly DisabledFadeFailure[] {
  const colors = themeColors(theme);
  return disabledFadePairs.flatMap((pair) => {
    const faded = fadedPair(colors, pair, disabledOpacity);
    const ratio = contrastRatio(faded.label, faded.fill);
    return ratio !== undefined && ratio >= floor
      ? []
      : [{ ...pair, ratio, floor }];
  });
}

export interface DisabledActionStyle {
  readonly backgroundColor: string;

  readonly color: string;
}

export function disabledAction(theme: Theme): DisabledActionStyle;
export function disabledAction(
  theme: ColourSource,
): DisabledActionStyle | undefined;
export function disabledAction(
  theme: ColourSource,
): DisabledActionStyle | undefined {
  const colors = themeColors(theme);
  const background = colors.disabled;
  const label = colors.disabledForeground;
  return background === undefined || label === undefined
    ? undefined
    : { backgroundColor: background, color: label };
}
