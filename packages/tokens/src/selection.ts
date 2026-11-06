import {
  alphaOf,
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
  type ContrastPair,
  type ContrastSource,
} from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import { statusTones } from "./styles.js";
import type { Theme } from "./theme.js";

export const selectionPairs: readonly ContrastPair[] = [
  { foreground: "inputForeground", background: "input", floor: "body" },
  { foreground: "foreground", background: "background", floor: "body" },
  { foreground: "cardForeground", background: "card", floor: "body" },
  { foreground: "popoverForeground", background: "popover", floor: "body" },

  { foreground: "foreground", background: "muted", floor: "body" },
  {
    foreground: "mutedForeground",
    background: "background",
    floor: "secondary",
  },
  { foreground: "mutedForeground", background: "card", floor: "secondary" },
  { foreground: "mutedForeground", background: "popover", floor: "secondary" },
];

export interface SelectionFailure {
  readonly kind: "visibility" | "legibility";

  readonly foreground: keyof ThemeColors;

  readonly background: keyof ThemeColors;

  readonly wash: string | undefined;

  readonly ratio: number | undefined;

  readonly floor: number;
}

const washOver = (
  colors: Partial<ThemeColors>,
  over: keyof ThemeColors,
): string | undefined => {
  const surface = colors[over];
  const wash = colors.selection;
  return surface === undefined || wash === undefined
    ? undefined
    : blend(surface, wash, alphaOf(wash));
};

const WASH_STEPS = 50;

const inksOn = (surface: keyof ThemeColors): readonly (keyof ThemeColors)[] => {
  const pair = selectionPairs.find(
    (entry) => entry.background === surface && entry.floor === "body",
  )?.foreground;
  const tone = statusTones.find((name) => `${name}Soft` === surface);
  return [
    ...(tone === undefined ? [] : [`${tone}SoftForeground` as const]),
    ...(pair === undefined ? [] : [pair]),
    "foreground",
  ];
};

export function selectionFailures(
  theme: ColourSource & ContrastSource,
  floors: ContrastFloors = contrastFloorsFor(theme),
): readonly SelectionFailure[] {
  const colors = themeColors(theme);
  return selectionPairs.flatMap(({ foreground, background, floor }) => {
    const wash = washOver(colors, background);
    const failures: SelectionFailure[] = [];
    const visible = contrastRatio(wash, colors[background]);
    if (visible === undefined || visible < decorativeFloor) {
      failures.push({
        kind: "visibility",
        foreground,
        background,
        wash,
        ratio: visible,
        floor: decorativeFloor,
      });
    }
    const legible = contrastRatio(colors[foreground], wash);
    if (legible === undefined || legible < floors[floor]) {
      failures.push({
        kind: "legibility",
        foreground,
        background,
        wash,
        ratio: legible,
        floor: floors[floor],
      });
    }
    return failures;
  });
}

export function selectionOn(
  theme: Theme,
  surface: keyof ThemeColors,
  floors?: ContrastFloors,
): string;
export function selectionOn(
  theme: ColourSource & ContrastSource,
  surface: keyof ThemeColors,
  floors?: ContrastFloors,
): string | undefined;
export function selectionOn(
  theme: ColourSource & ContrastSource,
  surface: keyof ThemeColors,
  floors: ContrastFloors = contrastFloorsFor(theme),
): string | undefined {
  const colors = themeColors(theme);
  const role = isColorRole(surface) ? surface : undefined;
  const fill = role === undefined ? undefined : colors[role];
  const wash = colors.selection;
  const page = colors.background;
  if (fill === undefined || wash === undefined || page === undefined) {
    return undefined;
  }
  const inks = inksOn(surface).map((ink) => colors[ink]);
  const carries = (candidate: string): boolean => {
    const composed = blend(fill, candidate, alphaOf(candidate));
    const visible = contrastRatio(composed, fill);
    return (
      (visible === undefined || visible >= decorativeFloor) &&
      inks.every((ink) => {
        const legible = contrastRatio(ink, composed);
        return legible === undefined || legible >= floors.body;
      })
    );
  };
  return (
    Array.from({ length: WASH_STEPS + 1 }, (_, step) =>
      blend(wash, page, step / WASH_STEPS),
    ).find(carries) ?? wash
  );
}
