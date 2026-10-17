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
import { statusTones } from "./styles.js";
import type { Theme, ThemeContrast } from "./theme.js";

/** The floor class a documented pair belongs to. */
export type ContrastPairClass =
  | "body"
  | "secondary"
  /** An inactive label: dimmed but readable (a design floor, not a WCAG one). */
  | "inactive"
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

/**
 * The base surfaces a soft status panel can occupy. The quiet panel is the
 * sidebar and settings group surface — a status badge or a small Alert sits
 * there, and the platform light variants change `muted` while inheriting the
 * identity's tints, so it is held to the same floor as the canvas.
 */
const softSurfacePairs: readonly ContrastPair[] = softSurfaceRoles.flatMap(
  (role) =>
    (["background", "card", "popover", "muted"] as const).map(
      (background): ContrastPair => [role, background, "surface"],
    ),
);

/**
 * The surfaces a loading placeholder sits on beyond the plain ones: the quiet
 * panel of a sidebar list and the washes a loading row paints. A skeleton row is
 * hovered, pressed and selected like any other, and a placeholder that vanishes
 * into the wash is a failed loading state, so each is held to the surface floor.
 */
const skeletonSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "selected",
] as const;

/**
 * The fills that must stay perceivable on the surfaces they sit on: the soft
 * status tints and the loading skeleton.
 */
const surfacePairs: readonly ContrastPair[] = [
  ...softSurfacePairs,
  ...skeletonSurfaces.map(
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
 * The surfaces a soft status chip occupies. A Badge sits on the plain surfaces,
 * the quiet panel and the four washes a row paints, so the chip's designed edge
 * is the boundary a reader sees — its fill is deliberately close to the row
 * wash (plan 300), which makes the edge the shape.
 */
const softBorderSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

/** Each soft status edge measured on the surfaces a chip sits on. */
export const softBorderSurfacePairs: readonly ContrastPair[] =
  statusTones.flatMap((tone) =>
    softBorderSurfaces.map(
      (background): ContrastPair => [
        `${tone}SoftBorder`,
        background,
        "divider",
      ],
    ),
  );

/**
 * The soft status fills a plain divider is painted on. An Alert or Toast can
 * separate a footer or an action row with a line, and the divider must stay
 * visible there like it does on the canvas.
 */
const softDividerPairs: readonly ContrastPair[] = softSurfaceRoles.map(
  (background): ContrastPair => ["border", background, "divider"],
);

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
 * The fills a bordered control paints behind its own edge: a secondary
 * control's resting, hovered and pressed fills, the hover and pressed washes an
 * outline control uses, and the accent fill a pressed outline toggle takes.
 * `border` is painted on all six, so the divider floor applies to each.
 */
const controlFillRoles = [
  "secondary",
  "secondaryHover",
  "secondaryActive",
  "hover",
  "active",
  "accent",
] as const;

const controlFillPairs: readonly ContrastPair[] = controlFillRoles.map(
  (background): ContrastPair => ["border", background, "divider"],
);

/**
 * The interactive fills a control or a row paints as its own shape: the two
 * generic washes, the accent and selected fills, and the filled-action families
 * at rest, hover and press. A filled control is a surface, so its fill has to
 * stay perceivable on the surface behind it.
 */
export const stateFillRoles = [
  "primary",
  "primaryHover",
  "primaryActive",
  "secondary",
  "secondaryHover",
  "secondaryActive",
  "destructive",
  "destructiveHover",
  "destructiveActive",
  "accent",
  "hover",
  "active",
  "selected",
] as const;

/**
 * The surfaces an interactive fill is painted on: the canvas, a card, a
 * popover (a menu item) and the quiet `muted` panel (a sidebar row or a
 * settings-group control). A fill that matches its panel is not a state.
 */
export const stateFillSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
] as const;

/** Every interactive fill, measured on each surface it paints on. */
export const stateFillSurfacePairs: readonly ContrastPair[] =
  stateFillRoles.flatMap((fill) =>
    stateFillSurfaces.map(
      (background): ContrastPair => [fill, background, "surface"],
    ),
  );

/**
 * The surfaces an inactive label paints on, beyond the soft status fills: its
 * own `disabled` fill, the plain surfaces a ghost disabled action sits on, and
 * the row washes a disabled control inside a hovered or selected row paints. A
 * disabled `Select` item is the shipped case — it paints `disabledForeground` on
 * the menu's `popover` with no fill behind it.
 */
const inactiveBaseSurfaces = [
  "disabled",
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

/**
 * The soft status fills a disabled action sits on. An Alert or Toast carries
 * actions — Retry, Undo, Dismiss — and one can be unavailable while the panel is
 * open, so the label needs the inactive floor there like it does on a plain
 * surface.
 */
export const inactiveSoftPairs: readonly ContrastPair[] = softSurfaceRoles.map(
  (background): ContrastPair => ["disabledForeground", background, "inactive"],
);

/** Every surface an inactive label paints on, in documentation order. */
export const inactiveSurfaces = [
  ...inactiveBaseSurfaces,
  ...softSurfaceRoles,
] as const;

/** The inactive label measured on each surface in {@link inactiveSurfaces}. */
export const inactivePairs: readonly ContrastPair[] = [
  ...inactiveBaseSurfaces.map(
    (background): ContrastPair => [
      "disabledForeground",
      background,
      "inactive",
    ],
  ),
  ...inactiveSoftPairs,
];

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
 * The soft status fills a bounded control can sit on. An Alert or Toast carries
 * an action — a field, a "don't show again" checkbox — and inline validation
 * renders inside a soft `destructive` block, so the edge a reader uses to see an
 * unchecked control is painted on these fills too. The boundary floor applies.
 */
export const controlBoundarySoftPairs: readonly ContrastPair[] =
  softSurfaceRoles.map(
    (background): ContrastPair => ["borderStrong", background, "boundary"],
  );

/**
 * The surfaces brand-toned text is painted on: the plain surfaces, the quiet
 * grouping panel a sidebar link sits on, the two washes the Link variant paints
 * behind its own label, and the fills a selectable row paints under a nested
 * link (`accent` on hover, `selected` when selected).
 */
const primaryTextSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
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
 * The soft status fills a focused control can sit on. An Alert or Toast carries
 * actions — a Retry or Dismiss button — and the ring is the only indicator of
 * which control holds focus, so each fill is held to the boundary floor like the
 * surfaces a control normally sits on.
 */
export const ringSoftPairs: readonly ContrastPair[] = softSurfaceRoles.map(
  (background): ContrastPair => ["ring", background, "boundary"],
);

/**
 * The surfaces a status label, icon or indicator dot paints on: the quiet
 * panel of a sidebar or settings group, and the four washes a row paints. A
 * status dot in a sidebar sits on `muted` the way a soft status chip does
 * (plan 300), so the `secondary` floor applies there too.
 */
const statusTextSurfaces = [
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

const statusTextTones = ["info", "success", "warning", "destructive"] as const;

const statusTextSurfacePairs: readonly ContrastPair[] = statusTextTones.flatMap(
  (tone) =>
    statusTextSurfaces.map(
      (background): ContrastPair => [`${tone}Text`, background, "secondary"],
    ),
);

/**
 * The default text roles a row paints on the washes it paints behind them. A
 * selectable list row uses `accent` on hover and `selected` when selected, a
 * selected row keeps its inherited `selectedForeground` while hovered or
 * pressed — the `accent` fill `list.tsx` paints on hover as well as the
 * `hover`/`active` pointer washes — a menu row paints `popoverForeground` on
 * `hover`/`active`, and a selected `Select` option paints `popoverForeground`
 * on `selected`.
 */
const rowTextPairs: readonly ContrastPair[] = [
  ["foreground", "accent", "body"],
  ["foreground", "selected", "body"],
  ["popoverForeground", "hover", "body"],
  ["popoverForeground", "active", "body"],
  ["popoverForeground", "selected", "body"],
  ["selectedForeground", "hover", "secondary"],
  ["selectedForeground", "active", "secondary"],
  ["selectedForeground", "accent", "secondary"],
];

/**
 * The field edge. A text field paints `border` on the `input` fill, so the
 * divider floor applies to the pair a reader uses to find the field.
 */
const fieldEdgePairs: readonly ContrastPair[] = [
  ["border", "input", "divider"],
];

/**
 * The surfaces a placeholder is painted on beyond the `input` fill: the four
 * `Surface` tones a transparent field (`SearchInput`, `InlineEdit`,
 * `ColorPicker`, `TagInput`, `MentionInput`) can sit on. A hint that disappears
 * into a sidebar or a dialog is a failed field.
 */
const placeholderSurfacePairs: readonly ContrastPair[] = (
  ["background", "card", "popover", "muted"] as const
).map((background): ContrastPair => ["placeholder", background, "secondary"]);

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
 * secondary text and status text on the state washes, a status label or dot on
 * the quiet `muted` panel, brand-toned text on the plain surfaces, the washes a
 * link paints and the row fills it sits on, default body text on the quiet panel
 * and the floating surface, the focus ring on every surface a focused control
 * can sit on, the ring on the soft status fills a toast's action button sits on,
 * status text on a floating surface, the functional control
 * boundary on a floating surface, a quiet panel, the state washes and the soft
 * status fills a control sits in, the soft
 * status surfaces and the loading skeleton a canvas, a quiet panel or a row wash
 * must distinguish, the
 * designed edge around each soft status surface, measured on its own fill and
 * on the eight surfaces a chip sits on, the plain divider on those
 * soft fills, the decorative dividers
 * that must stay visible, including on the fills a bordered control paints —
 * the neutral family's resting, hovered and pressed fills and the generic washes
 * an outline control uses — and
 * on the inactive fill a disabled control keeps its shape with, and the inactive
 * label an unavailable control, menu item or row paints on its fill, the plain
 * surfaces and the state washes. The default text role of a list or menu row is
 * measured on the washes the row paints — including a selected row's inherited
 * label on the `accent` fill a selectable row hovers and on the `hover`/`active`
 * pointer washes — a selected `Select` option's label on
 * its `selected` fill, a status label or dot on the quiet `muted` panel, typed
 * text on the `input` fill and on the `background` canvas a transparent field
 * paints, the placeholder on that canvas and on the `card`, `popover` and
 * `muted` surfaces a transparent field can sit on instead, and a text field's
 * edge is measured on the `input` fill it sits on.
 *
 * The filled families are measured at rest, hover and pressed. The neutral
 * fill's `secondaryHover`/`secondaryActive` steps are designed roles, not the
 * generic `hover`/`active` washes a ghost or outline control paints. Every
 * interactive fill — the washes, the accent and selected fills and the three
 * filled families at rest, hover and press — is a surface in its own right and
 * is held to the surface floor on the canvas, a card, a popover and the quiet
 * `muted` panel it paints on, because a fill that matches its panel is not a
 * state.
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
  ["inputForeground", "background", "body"],
  ...ringPairs,
  ...ringSoftPairs,
  ["secondaryForeground", "secondary", "secondary"],
  ["secondaryForeground", "secondaryHover", "secondary"],
  ["secondaryForeground", "secondaryActive", "secondary"],
  ["primaryForeground", "primary", "secondary"],
  ["primaryForeground", "primaryHover", "secondary"],
  ["primaryForeground", "primaryActive", "secondary"],
  ["destructiveForeground", "destructive", "secondary"],
  ["destructiveForeground", "destructiveHover", "secondary"],
  ["destructiveForeground", "destructiveActive", "secondary"],
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
  ...statusTextSurfacePairs,
  ...rowTextPairs,
  ["accentForeground", "accent", "secondary"],
  ["selectedForeground", "selected", "secondary"],
  ["placeholder", "input", "secondary"],
  ...placeholderSurfacePairs,
  ...inactivePairs,
  ["borderStrong", "background", "boundary"],
  ["borderStrong", "card", "boundary"],
  ["borderStrong", "input", "boundary"],
  ["borderStrong", "popover", "boundary"],
  ...controlBoundaryPairs,
  ...controlBoundarySoftPairs,
  ...primaryTextPairs,
  ...secondaryTextPairs,
  ...surfacePairs,
  ...softBorderPairs,
  ...softBorderSurfacePairs,
  ...softDividerPairs,
  ["border", "background", "divider"],
  ["border", "card", "divider"],
  ["border", "popover", "divider"],
  ["border", "muted", "divider"],
  ["border", "disabled", "divider"],
  ...fieldEdgePairs,
  ...controlFillPairs,
  ...stateFillSurfacePairs,
];

/** WCAG floors by contrast level and pair class. */
export const contrastFloors: Readonly<
  Record<ThemeContrast, Readonly<Record<ContrastPairClass, number>>>
> = {
  default: {
    body: 7,
    secondary: 4.5,
    inactive: 3,
    boundary: 3,
    surface: 1.05,
    divider: 1.05,
  },
  high: {
    body: 7,
    secondary: 7,
    inactive: 4.5,
    boundary: 4.5,
    surface: 1.05,
    divider: 3,
  },
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
 * The soft status surfaces a selected glyph is painted on. An Alert, Badge or
 * Toast is text a reader copies, and the wash composites over its fill, so the
 * tone's own foreground is held to the body floor like the plain surfaces.
 */
export const selectionSoftPairs: readonly ContrastPair[] = [
  ["infoSoftForeground", "infoSoft", "body"],
  ["successSoftForeground", "successSoft", "body"],
  ["warningSoftForeground", "warningSoft", "body"],
  ["destructiveSoftForeground", "destructiveSoft", "body"],
];

/**
 * The surfaces the selection wash must stay visible on inside a soft status
 * surface. A highlight that disappears on a dark destructive tint is still a
 * failed selection, so each fill is compared with the composited wash.
 */
export const selectionSoftWashPairs: readonly ContrastPair[] = [
  ["selection", "infoSoft", "surface"],
  ["selection", "successSoft", "surface"],
  ["selection", "warningSoft", "surface"],
  ["selection", "destructiveSoft", "surface"],
];

/**
 * The surfaces a modal scrim covers. A dialog's scrim is painted across the
 * window, so the app's base layout is behind it: the canvas, a card, the quiet
 * panel and the floating surface a menu opens on. A scrim that composites to its
 * own surface is an invisible modal backdrop, so each is held to the `surface`
 * floor.
 */
export const overlaySurfaces = [
  "background",
  "card",
  "muted",
  "popover",
] as const;

/**
 * The scrim composited over the surfaces it covers. Row washes are deliberately
 * absent: the pointer leaves the row to reach the dialog, so a scrim over a
 * transient hover is not a composition the design system supports.
 */
export const overlayWashPairs: readonly ContrastPair[] = overlaySurfaces.map(
  (surface): ContrastPair => ["overlay", surface, "surface"],
);

const textOverWashFailures = (
  pairs: readonly ContrastPair[],
  wash: keyof ThemeColors,
  theme: Theme,
  floors: Readonly<Record<ContrastPairClass, number>>,
): ReadonlyArray<ContrastFailure> =>
  pairs.flatMap(([foreground, background, pairClass]) => {
    const ratio = contrastRatio(
      theme.colors[foreground],
      compositeOver(theme.colors[wash], theme.colors[background]),
    );
    const floor = floors[pairClass];
    return ratio >= floor
      ? []
      : [{ foreground, background, wash, pairClass, floor, ratio }];
  });

const washVisibilityFailures = (
  pairs: readonly ContrastPair[],
  wash: keyof ThemeColors,
  theme: Theme,
  floors: Readonly<Record<ContrastPairClass, number>>,
): ReadonlyArray<ContrastFailure> =>
  pairs.flatMap(([foreground, background, pairClass]) => {
    const painted = compositeOver(theme.colors[wash], theme.colors[background]);
    const ratio = contrastRatio(painted, theme.colors[background]);
    const floor = floors[pairClass];
    return ratio >= floor
      ? []
      : [{ foreground, background, wash, pairClass, floor, ratio }];
  });

/**
 * Every documented pair a theme misses — text, status, secondary text and status
 * text on the state washes, selection, surface and divider — including the
 * selection wash measured over the surfaces a selected glyph paints on, the
 * secondary text and the wash's own perceivability on those surfaces, the
 * loading skeleton measured on every surface and row wash it fills, the designed edge around
 * each soft status surface measured on its own fill, the plain divider measured
 * on those fills, the selection wash and the
 * tone's own foreground on the four soft status surfaces a selected Alert,
 * Badge or Toast paints, the control edge measured
 * on the fills a bordered control paints, the focus ring on the soft status fills
 * a toast's action button sits on, and the functional boundary measured
 * on the quiet panel, the state washes and the soft status fills a bounded
 * control sits on, the inactive label on the nine surfaces a disabled control
 * paints, the disabled control's own edge and the divider on the quiet panel,
 * and the modal scrim composited over the base surfaces it
 * covers (reported with `wash: "overlay"`; the AAA dark scrim was 1.000:1 on its
 * own canvas). It also measures every interactive fill — the two washes, the
 * accent and selected fills and the three filled families at rest, hover and
 * press — against the canvas, card, popover and quiet panel it paints on,
 * because the identity light panel was the same value as its `hover`,
 * `secondary`, `accent` and `selected` fills. It measures a row's own default
 * text on the washes it paints and the field edge on its `input` fill, so a
 * selected list title or a menu row cannot lose its label on its own state
 * fill. The level
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
  return [
    ...pairFailures,
    ...textOverWashFailures(selectionPairs, "selection", theme, floors),
    ...washVisibilityFailures(selectionWashPairs, "selection", theme, floors),
    ...textOverWashFailures(selectionSoftPairs, "selection", theme, floors),
    ...washVisibilityFailures(
      selectionSoftWashPairs,
      "selection",
      theme,
      floors,
    ),
    ...washVisibilityFailures(overlayWashPairs, "overlay", theme, floors),
  ];
}
