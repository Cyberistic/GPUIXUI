import {
  alpha,
  alphaOf,
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  isPaintableColor,
  lightColors,
} from "./color.js";
import type { Theme } from "./theme.js";

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

/** Every elevation level, in the order the catalogue lists them. */
const elevationLevels = [
  "sm",
  "md",
  "lg",
  "overlay",
] as const satisfies readonly ElevationLevel[];

/**
 * The shadow an elevation level paints. A level is designed as one shadow, so it
 * resolves to its first entry; a reserved empty level paints nothing and returns
 * `undefined`, which `boxShadow` accepts. The runtime also accepts a shadow list;
 * the scale does not use one, so a level cannot render half of itself.
 *
 * @example
 * ```tsx
 * <div style={{ boxShadow: elevationShadow(theme, "md") }} />
 * ```
 */
export function elevationShadow(
  theme: Theme,
  level: ElevationLevel,
): BoxShadow | undefined {
  return theme.elevation[level][0];
}

/** One elevation shadow whose colour the renderer cannot paint. */
export interface InvalidShadowColor {
  /** The level that carries it. */
  readonly level: ElevationLevel;
  /** The shadow's position in the level's list. */
  readonly index: number;
  /** The value the theme carries. */
  readonly color: string;
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
 * ```
 */
export function invalidShadowColors(theme: {
  readonly elevation: Elevation;
}): readonly InvalidShadowColor[] {
  return elevationLevels.flatMap((level) =>
    theme.elevation[level].flatMap((shadow, index) =>
      isPaintableColor(shadow.color)
        ? []
        : [{ level, index, color: shadow.color }],
    ),
  );
}

/**
 * The share of the `shadow` role each level paints. A pale canvas needs only a
 * hint of shade; a dark one needs more, because a shadow is the only
 * separation two dark surfaces have.
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
 * @example
 * ```ts
 * const brandElevation = elevationWithTint(lightElevation, "#0B1220");
 * ```
 */
export function elevationWithTint(
  elevation: Elevation,
  tint: string,
): Elevation {
  const retint = (name: ElevationLevel): BoxShadow[] =>
    elevation[name].map((shadow) => ({
      ...shadow,
      color: alpha(tint, alphaOf(shadow.color)),
    }));

  return {
    sm: retint("sm"),
    md: retint("md"),
    lg: retint("lg"),
    overlay: retint("overlay"),
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
