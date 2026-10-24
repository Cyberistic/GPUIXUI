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

/** A drop shadow, structurally identical to GPUix's `StyleDesc.boxShadow`. */
export interface BoxShadow {
  /** Horizontal offset in pixels. */
  readonly offsetX: number;
  /** Vertical offset in pixels. */
  readonly offsetY: number;
  /** Blur radius in pixels. */
  readonly blurRadius: number;
  /** Spread radius in pixels. */
  readonly spreadRadius: number;
  /**
   * Shadow colour: the theme's `shadow` role at the level's designed strength,
   * so retinting the role retints every level.
   */
  readonly color: string;
}

/**
 * Elevation levels. A level is a list because the runtime accepts a shadow list;
 * the scale is designed with **one** shadow per level, so a shipped level carries
 * one entry and a consumer reads it with {@link elevationShadow}. `overlay` is
 * reserved and empty.
 */
export interface Elevation {
  /** Resting cards and raised rows. */
  readonly sm: BoxShadow[];
  /** Menus and popovers. */
  readonly md: BoxShadow[];
  /** Dialogs and command palettes. */
  readonly lg: BoxShadow[];
  /**
   * Reserved and empty: it lifts nothing, so a surface that names it paints
   * flat. Overlay *layering* is paint order (there is no `zIndex` to raise a
   * surface with), and the scrim behind a modal is the `overlay` colour role —
   * neither is a shadow. Floating surfaces take `md` or `lg`.
   */
  readonly overlay: BoxShadow[];
}

/** A level a surface can be raised to. */
export type ElevationLevel = keyof Elevation;

/**
 * Every elevation level, in the order the catalogue lists them: the order a
 * surface is raised through, and the order `invalidShadowColors` reports a level
 * in. A consumer that renders the scale iterates this instead of retyping it.
 *
 * `elevationLevels` is public for the same reason `statusTones` and
 * `platformNames` are: an ordered index is the one place the set is written
 * down, so a level added to a theme cannot leave a picker with a stale list.
 */
export const elevationLevels = [
  "sm",
  "md",
  "lg",
  "overlay",
] as const satisfies readonly ElevationLevel[];

/**
 * Narrow unknown input — a stored level, a URL parameter — to an elevation
 * level this release ships.
 *
 * A level name is content as often as a literal: a saved workspace, a panel
 * layout or a settings row raises a surface with the level it stored. A
 * consumer iterates {@link elevationLevels} instead of retyping the union, and
 * narrows a restored value before a surface takes it, so a name from a release
 * that renamed or dropped a level never needs a cast.
 */
export const isElevationLevel = (value: unknown): value is ElevationLevel =>
  elevationLevels.some((level) => level === value);

/**
 * Whether a stored value is one shadow. Only the shape every read depends on is
 * checked: a level is a list of objects, and a list a store wrote can carry a
 * `null` or a number where an entry belongs. The numbers themselves are
 * `invalidNumbers`' business.
 */
const isShadow = (value: unknown): value is BoxShadow =>
  typeof value === "object" && value !== null;

/**
 * The colour a stored shadow states, or `undefined` when it states one that is
 * not a colour. A store can write `null` (JSON has no `undefined`) or a number
 * where a colour belongs, and the same rule `invalidColorRoles` follows applies:
 * a value that is not a string is the absence it is, not a crash.
 */
const shadowColor = (shadow: unknown): string | undefined =>
  isShadow(shadow) && typeof shadow.color === "string"
    ? shadow.color
    : undefined;

/**
 * The shadow an elevation level paints. A level is designed as one shadow, so it
 * resolves to its first entry; a level that paints nothing — the reserved empty
 * `overlay`, one a theme restored from storage does not carry, or one a store
 * wrote as something other than a list — returns `undefined`, which `boxShadow`
 * accepts. The runtime also accepts a shadow list; the scale does not use one, so
 * a level cannot render half of itself.
 *
 * The source is `Partial<Elevation>` because a stored theme can predate a level
 * the library added: the report names it (`invalidShadowColors`) and the surface
 * paints flat, rather than the first raised card throwing where the audit had
 * already said why. The group itself may be absent — a store that predates the
 * elevation scale — in which case every level paints nothing, the same answer
 * one level up.
 *
 * A level **name** is a different absence: a saved workspace or a panel layout
 * raises a surface with the level it stored, so a name this release does not
 * ship reads as the default lift (`md`) rather than a surface that silently
 * paints flat — the rule `textStyle`, `controlHeight` and `iconPixels` follow.
 * Narrow a stored name with {@link isElevationLevel} where the caller can tell
 * the reader what it substituted.
 *
 * @example
 * ```tsx
 * <div style={{ boxShadow: elevationShadow(theme, "md") }} />
 * ```
 */
export function elevationShadow(
  theme: ShadowSource,
  level: ElevationLevel,
): BoxShadow | undefined {
  const shadows: unknown =
    theme.elevation?.[isElevationLevel(level) ? level : "md"];
  const first: unknown = Array.isArray(shadows) ? shadows[0] : undefined;
  return isShadow(first) ? first : undefined;
}

/**
 * The elevation scale as a report or a paint seam reads it.
 *
 * A store writes `null` for a level it never carried — JSON has no `undefined` —
 * so a level is the storage shape beside the array the type promises, and a
 * theme a store truncated reaches these seams without a cast. A level written as
 * anything but a list paints nothing and is the shadow report's line.
 */
export interface ShadowSource {
  readonly elevation?: Stored<Elevation>;
}

/** One elevation shadow whose colour the renderer cannot paint. */
export interface InvalidShadowColor {
  /** The level that carries it. */
  readonly level: ElevationLevel;
  /**
   * The shadow's position in the level's list, or `0` for a level the theme does
   * not carry at all.
   */
  readonly index: number;
  /**
   * The value the theme carries, or `undefined` when the level is absent — a
   * theme restored from storage can predate a level the library added.
   */
  readonly color: string | undefined;
}

/**
 * Every elevation shadow whose colour GPUix cannot parse.
 *
 * A level is normally a geometry plus a share of the `shadow` role, which
 * `invalidColorRoles` covers — but `extendTheme` also takes an `elevation`
 * override that replaces a level whole, colours and all. Those colours are the
 * caller's, the runtime ignores one it cannot parse, and the level then paints
 * no shadow at all: a raised card or a dialog silently sits flat. This is the
 * report that makes it visible, and `auditTheme` includes it.
 *
 * **A level the theme does not carry is reported once, at position `0`, with no
 * colour**, rather than throwing: `elevationShadow` would read past the end of a
 * missing list, so the missing level is the same silent flat surface as a colour
 * the renderer ignores. The source is `Partial<Elevation>` for that reason, and
 * the group may be absent too: a store that predates the scale reports **every**
 * level missing, which is the same answer one level up.
 *
 * **A shape a store wrote is the same absence, not a crash**: a level written as
 * one object where the type declares a list, or a list with a `null` entry, is a
 * surface that paints nothing, so it is reported at its position with no colour.
 * A shadow colour that is not a string is reported the same way, by the rule
 * `invalidColorRoles` follows for a role.
 *
 * A level's geometry is not checked here: a number the renderer reads is
 * painted, so the failure this report covers is the silent one.
 *
 * @example
 * ```ts
 * import { extendTheme, invalidShadowColors, lightTheme } from "@gpuixui/tokens";
 *
 * const brand = extendTheme(lightTheme, {
 *   elevation: {
 *     md: [{ offsetX: 0, offsetY: 4, blurRadius: 12, spreadRadius: 0, color: "#00000020" }],
 *   },
 * });
 * invalidShadowColors(brand); // [] — the colour is one GPUix paints
 *
 * const { md: _omitted, ...restored } = lightTheme.elevation;
 * invalidShadowColors({ elevation: restored });
 * // [{ level: "md", index: 0, color: undefined }] — a stored theme older than the level
 * ```
 */
export function invalidShadowColors(
  theme: ShadowSource,
): readonly InvalidShadowColor[] {
  return elevationLevels.flatMap((level): ReadonlyArray<InvalidShadowColor> => {
    const shadows: unknown = theme.elevation?.[level];
    // A level written as anything but a list is one surface's shadow this report
    // cannot read, so it is named once — the same line an absent level gets.
    if (!Array.isArray(shadows)) {
      return [{ level, index: 0, color: undefined }];
    }
    return shadows.flatMap((shadow: unknown, index) => {
      const color = shadowColor(shadow);
      return isPaintableColor(color) ? [] : [{ level, index, color }];
    });
  });
}

/**
 * The share of the `shadow` role each level paints. A pale canvas needs only a
 * hint of shade; a dark one needs more, because a shadow is the only
 * separation two dark surfaces have. Every level is also held to the
 * decorative perceptibility floor against the strips it can fall on
 * (`decorativeFailures`), so a tint that cannot darken its page is reported
 * rather than shipped flat — the weaker `sm` and `md` lifts included, because a
 * card's lift is what a reader sees first.
 */
const strength = {
  light: { sm: 0.08, md: 0.12, lg: 0.16 },
  dark: { sm: 0.4, md: 0.65, lg: 0.8 },
} as const;

/** One level, painted in `tint` at `share`. */
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

/**
 * An elevation scale as storage hands it back: the levels a theme carries, in
 * the shape a store wrote them. A saved theme may have lost the whole scale, one
 * level, or keep a level the store wrote as `null` where JSON has no `undefined`
 * — the absences `invalidShadowColors` reports and `elevationShadow` paints
 * nothing for. Reading one is what {@link elevationWithTint} keeps total.
 */
export type ElevationSource = Partial<Record<ElevationLevel, unknown>>;

/**
 * One entry restated in `tint`, or the entry the store wrote.
 *
 * A share is the alpha the entry already carries, so an entry this seam cannot
 * measure has no share to keep: a colour outside the measurement dialect (an
 * `oklch()` a design tool exported) reads as **opaque** through `alphaOf`, and
 * restating it in the tint would paint a shadow the store never asked for and
 * drop the line `invalidShadowColors` reports. Such an entry, one that states no
 * colour, and one that is not a shadow at all are returned as written.
 */
const retintedShadow = (shadow: unknown, tint: string): unknown => {
  const color = shadowColor(shadow);
  if (!isShadow(shadow) || measuredColour(color) === undefined) {
    return shadow;
  }
  return { ...shadow, color: alpha(tint, alphaOf(color)) };
};

/** One level restated entry by entry, or kept as written when it is not a list. */
const retintedLevel = (shadows: unknown, tint: string): unknown =>
  Array.isArray(shadows)
    ? shadows.map((shadow: unknown) => retintedShadow(shadow, tint))
    : shadows;

/**
 * Restate every level of an elevation scale in `tint`, keeping each level's
 * designed strength and geometry.
 *
 * The strength is the alpha the level already carries, so the rule has one
 * source: a level is a geometry plus a share of the shadow role. `extendTheme`
 * applies it whenever a theme overrides `colors.shadow`, which is why a brand
 * retints the library's shadows by changing one role. An empty level stays
 * empty, and a level a caller passes to `extendTheme` replaces the whole array
 * instead — its colours are the caller's.
 *
 * **The scale is read level by level**, because a theme restored from storage
 * may not be the designed one: a brand retinting `colors.shadow` over such a
 * theme used to throw `Cannot read properties of undefined (reading 'sm')` for a
 * lost scale and `(reading 'map')` for a lost or `null` level, while every report
 * had already called those absences paintable. A level that is gone stays gone —
 * `invalidShadowColors` still names it and the surface paints flat — and a level
 * written as something other than a list is kept as the store wrote it.
 *
 * **An entry whose colour the seam cannot measure is left as written**, the rule
 * the other derived colours follow: restated in the tint it would read as a full
 * share, so a colour nobody can measure became an **opaque shadow** and the line
 * that named it disappeared.
 *
 * @example
 * ```ts
 * const brandElevation = elevationWithTint(lightElevation, "#0B1220");
 * // A stored scale answers a source: the levels it carries, retinted.
 * const restored = elevationWithTint(fromStorage, "#0B1220");
 * ```
 */
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

/** Light theme elevation, shaded from the {@link lightColors} `shadow` role. */
export const lightElevation: Elevation = {
  sm: level(1, 2, 0, strength.light.sm, lightColors.shadow),
  md: level(4, 12, -2, strength.light.md, lightColors.shadow),
  lg: level(16, 40, -8, strength.light.lg, lightColors.shadow),
  overlay: [],
};

/** Dark theme elevation; stronger because the canvas is darker. */
export const darkElevation: Elevation = {
  sm: level(1, 2, 0, strength.dark.sm, darkColors.shadow),
  md: level(8, 24, -4, strength.dark.md, darkColors.shadow),
  lg: level(24, 56, -12, strength.dark.lg, darkColors.shadow),
  overlay: [],
};

/**
 * High-contrast light elevation: the light levels in the high-contrast
 * palette's own `shadow` tint.
 *
 * The contrast variant changes the palette, so it changes the role, and the
 * role owns the hue — a level is a geometry plus a share of the role, and the
 * share is the same in every variant of a mode.
 */
export const highContrastLightElevation: Elevation = elevationWithTint(
  lightElevation,
  highContrastLightColors.shadow,
);

/** High-contrast dark elevation: the dark levels in its own `shadow` tint. */
export const highContrastDarkElevation: Elevation = elevationWithTint(
  darkElevation,
  highContrastDarkColors.shadow,
);
