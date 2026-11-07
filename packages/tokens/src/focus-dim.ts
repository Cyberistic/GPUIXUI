import { themeColors, type ColourSource, type ThemeColors } from "./color.js";
import { contrastRatio } from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import { fadedPair, type FadeFailure, type FadePair } from "./fade.js";

export const keyboardFocusDimOpacity = 0.4;

export type KeyboardDimPair = FadePair;

const strips = ["background", "card", "popover", "muted"] as const;

const fieldFills = ["input", "background"] as const;

const fieldLabels = ["inputForeground", "placeholder"] as const;

const washedRows: ReadonlyArray<
  readonly [fill: keyof ThemeColors, label: keyof ThemeColors]
> = [
  ["hover", "foreground"],
  ["accent", "foreground"],
  ["accent", "selectedForeground"],
  ["active", "foreground"],
  ["active", "selectedForeground"],
];

export const keyboardDimPairs: readonly KeyboardDimPair[] = strips.flatMap(
  (over) => [
    { fill: "primary", label: "primaryForeground", over },
    { fill: "secondary", label: "secondaryForeground", over },
    { fill: "destructive", label: "destructiveForeground", over },
    ...fieldFills.flatMap((fill) =>
      fieldLabels.map((label) => ({ fill, label, over })),
    ),
    { fill: over, label: "foreground", over },
    { fill: over, label: "mutedForeground", over },
    { fill: "selected", label: "selectedForeground", over },
    ...washedRows.map(([fill, label]) => ({ fill, label, over })),
  ],
);

export type KeyboardDimFailure = FadeFailure;

export function keyboardDimFailures(
  theme: ColourSource,
  floor: number = decorativeFloor,
): readonly KeyboardDimFailure[] {
  const colors = themeColors(theme);
  return keyboardDimPairs.flatMap((pair) => {
    const dimmed = fadedPair(colors, pair, keyboardFocusDimOpacity);
    const ratio = contrastRatio(dimmed.label, dimmed.fill);
    return ratio !== undefined && ratio >= floor
      ? []
      : [{ ...pair, ratio, floor }];
  });
}
