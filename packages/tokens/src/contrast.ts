/**
 * The accessibility contract, as data and total functions.
 *
 * The library's own suites hold every shipped colour set to these pairs and
 * floors, and {@link themeContrastFailures} exposes the same check so a
 * consumer can hold an edited platform style or brand theme to it in one
 * assertion. Keeping the pair list here — rather than in test-only code — means
 * the documented contract and the tests that enforce it cannot drift.
 */

import type { ThemeColors } from "./color.js";
import type { Theme, ThemeContrast } from "./theme.js";

/** The floor class a documented pair belongs to. */
export type ContrastPairClass =
  | "body"
  | "secondary"
  | "boundary"
  /** One surface must be perceivable against another (`xSoft` on a canvas). */
  | "surface"
  /** A decorative border (`border`) must stay visible on its surface. */
  | "divider";

/** A role pair and the floor class it belongs to. */
export type ContrastPair = readonly [
  keyof ThemeColors,
  keyof ThemeColors,
  ContrastPairClass,
];

const softSurfaceRoles = [
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;

const softSurfacePairs: readonly ContrastPair[] = softSurfaceRoles.flatMap(
  (role) =>
    (["background", "card", "popover"] as const).map(
      (background): ContrastPair => [role, background, "surface"],
    ),
);

/**
 * The fills that must stay perceivable on the surfaces they sit on: the soft
 * status tints and the loading skeleton.
 */
const surfacePairs: readonly ContrastPair[] = [
  ...softSurfacePairs,
  ...(["background", "card", "popover"] as const).map(
    (background): ContrastPair => ["skeleton", background, "surface"],
  ),
];

/**
 * The state washes a row paints behind its own text: pointer hover, press, the
 * accent a selectable row uses on hover, and the selected fill. Secondary text
 * sits on all four, so the `secondary` floor applies to each.
 */
const stateWashes = ["hover", "active", "accent", "selected"] as const;

const secondaryTextPairs: readonly ContrastPair[] = stateWashes.map(
  (background): ContrastPair => ["mutedForeground", background, "secondary"],
);

/**
 * The fills a bordered control paints behind its own edge: a secondary control's
 * resting fill, the hover and pressed washes an outline control uses, and the
 * accent fill a pressed outline toggle takes. `border` is painted on all four,
 * so the divider floor applies to each.
 */
const controlFillRoles = ["secondary", "hover", "active", "accent"] as const;

const controlFillPairs: readonly ContrastPair[] = controlFillRoles.map(
  (background): ContrastPair => ["border", background, "divider"],
);

/**
 * Every documented pair — text, status, surface and divider — including
 * secondary text on the state washes, the focus ring on the washes a focused
 * row paints, the status text and control boundary on a floating surface, the
 * soft status surfaces and the loading skeleton a canvas must distinguish, and
 * the decorative dividers that must stay visible, including on the fills a
 * bordered control paints.
 */
export const contrastPairs: readonly ContrastPair[] = [
  ["foreground", "background", "body"],
  ["foreground", "card", "body"],
  ["cardForeground", "card", "body"],
  ["popoverForeground", "popover", "body"],
  ["mutedForeground", "muted", "secondary"],
  ["mutedForeground", "background", "secondary"],
  ["mutedForeground", "card", "secondary"],
  ["mutedForeground", "popover", "secondary"],
  ["inputForeground", "input", "body"],
  ["foreground", "hover", "body"],
  ["foreground", "active", "body"],
  ["ring", "hover", "boundary"],
  ["ring", "active", "boundary"],
  ["secondaryForeground", "secondary", "secondary"],
  ["primaryForeground", "primary", "secondary"],
  ["primaryForeground", "primaryHover", "secondary"],
  ["destructiveForeground", "destructive", "secondary"],
  ["destructiveForeground", "destructiveHover", "secondary"],
  ["successForeground", "success", "secondary"],
  ["warningForeground", "warning", "secondary"],
  ["infoForeground", "info", "secondary"],
  ["infoSoftForeground", "infoSoft", "body"],
  ["successSoftForeground", "successSoft", "body"],
  ["warningSoftForeground", "warningSoft", "body"],
  ["destructiveSoftForeground", "destructiveSoft", "body"],
  ["infoText", "background", "secondary"],
  ["infoText", "card", "secondary"],
  ["infoText", "popover", "secondary"],
  ["successText", "background", "secondary"],
  ["successText", "card", "secondary"],
  ["successText", "popover", "secondary"],
  ["warningText", "background", "secondary"],
  ["warningText", "card", "secondary"],
  ["warningText", "popover", "secondary"],
  ["destructiveText", "background", "secondary"],
  ["destructiveText", "card", "secondary"],
  ["destructiveText", "popover", "secondary"],
  ["accentForeground", "accent", "secondary"],
  ["selectedForeground", "selected", "secondary"],
  ["ring", "selected", "boundary"],
  ["placeholder", "input", "secondary"],
  ["borderStrong", "background", "boundary"],
  ["borderStrong", "card", "boundary"],
  ["borderStrong", "input", "boundary"],
  ["borderStrong", "popover", "boundary"],
  ["ring", "background", "boundary"],
  ["ring", "card", "boundary"],
  ["ring", "popover", "boundary"],
  ...secondaryTextPairs,
  ...surfacePairs,
  ["border", "background", "divider"],
  ["border", "card", "divider"],
  ["border", "popover", "divider"],
  ...controlFillPairs,
];

/** WCAG floors by contrast level and pair class. */
export const contrastFloors: Readonly<
  Record<ThemeContrast, Readonly<Record<ContrastPairClass, number>>>
> = {
  default: {
    body: 7,
    secondary: 4.5,
    boundary: 3,
    surface: 1.05,
    divider: 1.05,
  },
  high: { body: 7, secondary: 7, boundary: 4.5, surface: 1.05, divider: 3 },
};

const opaqueHex = /^#([0-9A-Fa-f]{6})$/;
const translucentHex = /^#([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})$/;

const hexOf = (color: string): string | undefined => opaqueHex.exec(color)?.[1];

const channel = (hex: string, at: number): number =>
  Number.parseInt(hex.slice(at, at + 2), 16) / 255;

const linear = (value: number): number =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

const luminance = (hex: string): number =>
  0.2126 * linear(channel(hex, 0)) +
  0.7152 * linear(channel(hex, 2)) +
  0.0722 * linear(channel(hex, 4));

/**
 * The WCAG 2.x contrast ratio between two **opaque** `#RRGGBB` colours.
 *
 * A value that is not an opaque six-digit hex — a translucent role, a CSS
 * function, a typo — yields `NaN`, which can never pass a floor, so a malformed
 * theme is reported rather than silently accepted.
 *
 * @example
 * ```ts
 * contrastRatio("#FFFFFF", "#000000"); // 21
 * ```
 */
export function contrastRatio(foreground: string, background: string): number {
  const foregroundHex = hexOf(foreground);
  const backgroundHex = hexOf(background);
  if (foregroundHex === undefined || backgroundHex === undefined) {
    return Number.NaN;
  }
  const high = Math.max(luminance(foregroundHex), luminance(backgroundHex));
  const low = Math.min(luminance(foregroundHex), luminance(backgroundHex));
  return (high + 0.05) / (low + 0.05);
}

/**
 * Composite a translucent `#RRGGBBAA` colour over an opaque `#RRGGBB` one.
 *
 * The result is the opaque colour the runtime paints, so a wash such as the
 * `selection` role can be measured as text actually sees it. An input the
 * parser does not recognise is returned unchanged, the same convention as
 * {@link alpha}, so it reaches a ratio check as a failure instead of a guess.
 *
 * @example
 * ```ts
 * compositeOver("#00000080", "#FFFFFF"); // "#7F7F7F"
 * ```
 */
export function compositeOver(color: string, background: string): string {
  const overlay = translucentHex.exec(color);
  const under = opaqueHex.exec(background);
  if (overlay === null || under === null) {
    return color;
  }
  const [, overlayRgb, alphaHex] = overlay;
  const [, baseRgb] = under;
  if (
    overlayRgb === undefined ||
    alphaHex === undefined ||
    baseRgb === undefined
  ) {
    return color;
  }
  const opacity = Number.parseInt(alphaHex, 16) / 255;
  const channels = [0, 2, 4].map((at) =>
    Math.round(
      Number.parseInt(overlayRgb.slice(at, at + 2), 16) * opacity +
        Number.parseInt(baseRgb.slice(at, at + 2), 16) * (1 - opacity),
    )
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${channels.join("")}`.toUpperCase();
}

/** A documented pair that misses its floor in one theme. */
export interface ContrastFailure {
  /** The role carrying text, or the surface being perceived. */
  readonly foreground: keyof ThemeColors;
  /** The role painted behind it, or the surface it must stand out from. */
  readonly background: keyof ThemeColors;
  /** The translucent role composited over `background`, when the pair sits on a wash. */
  readonly wash?: keyof ThemeColors;
  /** The class whose floor the pair missed. */
  readonly pairClass: ContrastPairClass;
  /** The floor the pair missed. */
  readonly floor: number;
  /** The measured ratio; `NaN` when a role is not an opaque `#RRGGBB`. */
  readonly ratio: number;
}

/** The surfaces a selected glyph is painted on, with the role each one uses. */
export const selectionPairs: readonly ContrastPair[] = [
  ["foreground", "background", "body"],
  ["foreground", "card", "body"],
  ["foreground", "muted", "body"],
  ["foreground", "hover", "body"],
  ["foreground", "active", "body"],
  ["foreground", "accent", "body"],
  ["popoverForeground", "popover", "body"],
  ["inputForeground", "input", "body"],
  ["selectedForeground", "selected", "secondary"],
];

/**
 * Every documented pair a theme misses — text, status, secondary text on the
 * state washes, selection, surface and divider — including the selection wash
 * measured over the surfaces a selected glyph paints on, the loading skeleton
 * measured on the surfaces it fills, and the control edge measured on the fills
 * a bordered control paints. The level defaults
 * to the one the theme declares, so a high-contrast theme is checked against its
 * own floors. An empty array is the library's guarantee; a consumer test asserts
 * exactly that:
 *
 * @example
 * ```ts
 * import { getTheme, themeContrastFailures } from "@gpuixui/tokens";
 *
 * themeContrastFailures(getTheme("dark")); // []
 * themeContrastFailures(getTheme("dark"), "high"); // the same theme at AAA
 * ```
 */
export function themeContrastFailures(
  theme: Theme,
  contrast: ThemeContrast = theme.contrast,
): ReadonlyArray<ContrastFailure> {
  const floors = contrastFloors[contrast];
  const pairFailures: ReadonlyArray<ContrastFailure> = contrastPairs.flatMap(
    ([foreground, background, pairClass]) => {
      const ratio = contrastRatio(
        theme.colors[foreground],
        theme.colors[background],
      );
      return ratio >= floors[pairClass]
        ? []
        : [
            {
              foreground,
              background,
              pairClass,
              floor: floors[pairClass],
              ratio,
            },
          ];
    },
  );
  const washFailures: ReadonlyArray<ContrastFailure> = selectionPairs.flatMap(
    ([foreground, background, pairClass]) => {
      const ratio = contrastRatio(
        theme.colors[foreground],
        compositeOver(theme.colors.selection, theme.colors[background]),
      );
      const floor = floors[pairClass];
      return ratio >= floor
        ? []
        : [
            {
              foreground,
              background,
              wash: "selection" as const,
              pairClass,
              floor,
              ratio,
            },
          ];
    },
  );
  return [...pairFailures, ...washFailures];
}
