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
 * The designed edge around each soft status surface. It is a decorative border
 * on its own fill, so the divider floor applies: 1.05:1 by default and 3:1 at
 * high contrast, where the 30% mixture it replaced measured 1.12:1.
 */
const softBorderPairs: readonly ContrastPair[] = [
  ["infoSoftBorder", "infoSoft", "divider"],
  ["successSoftBorder", "successSoft", "divider"],
  ["warningSoftBorder", "warningSoft", "divider"],
  ["destructiveSoftBorder", "destructiveSoft", "divider"],
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
 * The surfaces a bounded control sits on beyond the plain ones: the quiet panel
 * that groups fields and checkboxes, and the four washes a row paints. A
 * checkbox in a hovered, pressed, selectable or selected row paints its
 * `borderStrong` edge against that fill, so the boundary floor applies.
 */
const controlBoundarySurfaces = [
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

const controlBoundaryPairs: readonly ContrastPair[] =
  controlBoundarySurfaces.map(
    (background): ContrastPair => ["borderStrong", background, "boundary"],
  );

/**
 * The surfaces brand-toned text is painted on: the plain surfaces, the quiet
 * grouping panel a sidebar link sits on, and the two washes the Link variant
 * paints behind its own label.
 */
const primaryTextSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
] as const;

const primaryTextPairs: readonly ContrastPair[] = primaryTextSurfaces.map(
  (background): ContrastPair => ["primaryText", background, "secondary"],
);

/**
 * The surfaces a focused control can sit on: the plain surfaces, the quiet
 * panel a sidebar control sits on, the accent wash a selectable row paints, and
 * the three state washes a focused row paints. The ring is painted outside the
 * control, on the surface behind it, so each must keep it visible.
 */
const ringSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "accent",
  "hover",
  "active",
  "selected",
] as const;

const ringPairs: readonly ContrastPair[] = ringSurfaces.map(
  (background): ContrastPair => ["ring", background, "boundary"],
);

/**
 * The state washes a row paints behind a status label, icon or indicator dot:
 * pointer hover, press, the accent a selectable row uses on hover, and the
 * selected fill. A status dot in a list, table or menu sits on all four, so the
 * `secondary` floor applies to each.
 */
const statusTextWashes = ["hover", "active", "accent", "selected"] as const;

const statusTextTones = ["info", "success", "warning", "destructive"] as const;

const statusTextWashPairs: readonly ContrastPair[] = statusTextTones.flatMap(
  (tone) =>
    statusTextWashes.map(
      (background): ContrastPair => [`${tone}Text`, background, "secondary"],
    ),
);

/**
 * The surfaces default body text (`foreground`) is painted on: the canvas and
 * the card, the quiet panel an avatar's fallback initials sit on, the floating
 * surface a date picker's month header sits on, and the hover and pressed
 * washes a ghost row paints. `foreground` is the default `Text` tone on every
 * `Surface` tone in `primitives`, so the panel and the popover are compositions
 * the API invites, not accidents.
 */
const bodyTextSurfaces = [
  "background",
  "card",
  "muted",
  "popover",
  "hover",
  "active",
] as const;

const bodyTextPairs: readonly ContrastPair[] = bodyTextSurfaces.map(
  (background): ContrastPair => ["foreground", background, "body"],
);

/**
 * Every documented pair — text, status, surface and divider — including
 * secondary text and status text on the state washes, brand-toned text on the
 * plain surfaces and washes a link paints, default body text on the quiet panel
 * and the floating surface, the focus ring on every surface a focused control
 * can sit on, status text on a floating surface, the functional control
 * boundary on a floating surface, a quiet panel and the state washes, the soft
 * status surfaces and the loading skeleton a canvas must distinguish, the
 * designed edge around each soft status surface, and the decorative dividers
 * that must stay visible, including on the fills a bordered control paints.
 */
export const contrastPairs: readonly ContrastPair[] = [
  ...bodyTextPairs,
  ["cardForeground", "card", "body"],
  ["popoverForeground", "popover", "body"],
  ["mutedForeground", "muted", "secondary"],
  ["mutedForeground", "background", "secondary"],
  ["mutedForeground", "card", "secondary"],
  ["mutedForeground", "popover", "secondary"],
  ["inputForeground", "input", "body"],
  ...ringPairs,
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
  ...statusTextWashPairs,
  ["accentForeground", "accent", "secondary"],
  ["selectedForeground", "selected", "secondary"],
  ["placeholder", "input", "secondary"],
  ["borderStrong", "background", "boundary"],
  ["borderStrong", "card", "boundary"],
  ["borderStrong", "input", "boundary"],
  ["borderStrong", "popover", "boundary"],
  ...controlBoundaryPairs,
  ...primaryTextPairs,
  ...secondaryTextPairs,
  ...surfacePairs,
  ...softBorderPairs,
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

/**
 * The surfaces a selected glyph is painted on: the plain surfaces, the quiet
 * panel, the field, the three state washes and a selected row. A wash measured
 * only on the canvas leaves the other eight unprotected.
 */
export const selectionSurfaces = [
  "background",
  "card",
  "muted",
  "hover",
  "active",
  "accent",
  "popover",
  "input",
  "selected",
] as const;

const selectionForegrounds: Readonly<
  Record<(typeof selectionSurfaces)[number], keyof ThemeColors>
> = {
  background: "foreground",
  card: "foreground",
  muted: "foreground",
  hover: "foreground",
  active: "foreground",
  accent: "foreground",
  popover: "popoverForeground",
  input: "inputForeground",
  selected: "selectedForeground",
};

/**
 * Every text pair a selected glyph paints: the role each surface uses for its
 * own text on the left, and secondary text on the right. A row description or a
 * message timestamp is selected with the body copy around it, so it carries the
 * secondary floor through the same wash.
 */
export const selectionPairs: readonly ContrastPair[] = [
  ...selectionSurfaces.map(
    (surface): ContrastPair => [
      selectionForegrounds[surface],
      surface,
      surface === "selected" ? "secondary" : "body",
    ],
  ),
  ...selectionSurfaces.map(
    (surface): ContrastPair => ["mutedForeground", surface, "secondary"],
  ),
];

/**
 * The surfaces a selection wash must stay visible on. Each entry pairs the
 * translucent `selection` role with the surface it paints on; the check
 * composites the two, so a theme whose highlight has become imperceptible fails
 * the `surface` floor even when every glyph is readable.
 */
export const selectionWashPairs: readonly ContrastPair[] =
  selectionSurfaces.map(
    (surface): ContrastPair => ["selection", surface, "surface"],
  );

/**
 * Every documented pair a theme misses — text, status, secondary text and status
 * text on the state washes, selection, surface and divider — including the
 * selection wash measured over the surfaces a selected glyph paints on, the
 * secondary text and the wash's own perceivability on those surfaces, the
 * loading skeleton measured on the surfaces it fills, the designed edge around
 * each soft status surface measured on its own fill, the control edge measured
 * on the fills a bordered control paints, and the functional boundary measured
 * on the quiet panel and state washes a bounded control sits on. The level
 * defaults to the one the theme declares, so a high-contrast theme is checked
 * against its own floors. An empty array is the library's guarantee; a consumer
 * test asserts exactly that:
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
  const washVisibilityFailures: ReadonlyArray<ContrastFailure> =
    selectionWashPairs.flatMap(([foreground, background, pairClass]) => {
      const painted = compositeOver(
        theme.colors.selection,
        theme.colors[background],
      );
      const ratio = contrastRatio(painted, theme.colors[background]);
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
    });
  return [...pairFailures, ...washFailures, ...washVisibilityFailures];
}
