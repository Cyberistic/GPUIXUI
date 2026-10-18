import {
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  lightColors,
  type ThemeColors,
} from "./color.js";
import {
  darkElevation,
  highContrastDarkElevation,
  lightElevation,
  type Elevation,
  type ElevationShape,
} from "./elevation.js";
import { motion, type Motion, type MotionEasings } from "./motion.js";
import {
  platformStyles,
  platformTypes,
  type PlatformName,
  type PlatformStyle,
} from "./platforms.js";
import {
  avatarSize,
  borderWidth,
  defaultDensity,
  densityPresets,
  dimensions,
  iconSize,
  isDensityName,
  radius,
  spacing,
  type AvatarSize,
  type BorderWidth,
  type Density,
  type DensityName,
  type DensityOverrides,
  type Dimensions,
  type IconSize,
  type Radius,
  type Spacing,
} from "./scale.js";
import { typography, type TextStyle, type Typography } from "./typography.js";

/**
 * Theme modes the library ships, in documentation order. `ThemeMode` derives
 * from this list, so a new mode must also gain a value in `themes` and
 * `highContrastThemes`.
 */
export const themeModes = ["light", "dark"] as const;

/** Theme modes the library ships. */
export type ThemeMode = (typeof themeModes)[number];

/**
 * A complete, resolved design theme. Every field is plain data, so a theme can
 * be passed through React context, stored, or built at startup.
 */
export interface Theme {
  /** Human-readable theme name, used by previews and diagnostics. */
  readonly name: string;
  /** The mode this theme was built for. Never changed by an override. */
  readonly mode: ThemeMode;
  /**
   * The floor set this theme is designed against. `extendTheme` keeps the base
   * level unless one is declared; `themeContrastFailures` checks it.
   */
  readonly contrast: ThemeContrast;
  /** Semantic colour roles. */
  readonly colors: ThemeColors;
  /** Font families and type roles. */
  readonly typography: Typography;
  /** Spacing scale. */
  readonly spacing: Spacing;
  /** Corner radii. */
  readonly radius: Radius;
  /** Control metrics for the active density. */
  readonly density: Density;
  /** Fixed surface metrics: overlay widths, field chrome, toast and preview cards. */
  readonly dimensions: Dimensions;
  /** Elevation levels: geometry plus the alpha applied to the `shadow` tint. */
  readonly elevation: Elevation;
  /** Motion timings and easings. */
  readonly motion: Motion;
  /** Border thicknesses. */
  readonly borderWidth: BorderWidth;
  /** Icon sizes. */
  readonly iconSize: IconSize;
  /** Avatar diameters. */
  readonly avatarSize: AvatarSize;
}

/**
 * Partial typography overrides. Text roles merge field by field, so changing a
 * body size keeps the base leading and weight.
 */
export interface TypographyOverrides {
  readonly sans?: string;
  readonly mono?: string;
  readonly display?: Partial<TextStyle>;
  readonly h1?: Partial<TextStyle>;
  readonly h2?: Partial<TextStyle>;
  readonly h3?: Partial<TextStyle>;
  readonly body?: Partial<TextStyle>;
  readonly bodyStrong?: Partial<TextStyle>;
  readonly label?: Partial<TextStyle>;
  readonly caption?: Partial<TextStyle>;
  readonly code?: Partial<TextStyle>;
  readonly codeBlock?: Partial<TextStyle>;
}

/**
 * A partial theme. Every group is optional; omitted groups inherit from the
 * base theme. Elevation arrays replace rather than concatenate.
 */
export interface ThemeOverrides {
  /** Override the theme name. */
  readonly name?: string;
  /**
   * Declare the floor set the result is designed against. A claim, not a
   * measurement: `themeContrastFailures(theme)` checks it.
   */
  readonly contrast?: ThemeContrast;
  /**
   * Override individual semantic colour roles. A filled family moves as a set —
   * the fill, its foreground and its two pointer states — and a fill painted as
   * a value indicator moves `track` with it; see `brand-theme.example.ts`.
   */
  readonly colors?: Partial<ThemeColors>;
  /** Override font families or text roles. */
  readonly typography?: TypographyOverrides;
  /** Override individual spacing steps. */
  readonly spacing?: Partial<Spacing>;
  /** Override individual radii. */
  readonly radius?: Partial<Radius>;
  /**
   * Use a density preset, or override individual metrics. A size-keyed record
   * merges size by size, so changing the medium control height keeps the small
   * and large ones. `preset` names the preset the metrics start from; omitted,
   * they start from the base theme's density and keep its name.
   */
  readonly density?: DensityName | DensityOverrides;
  /** Override individual component dimensions. */
  readonly dimensions?: Partial<Dimensions>;
  /** Replace individual elevation levels. */
  readonly elevation?: Partial<Elevation>;
  /**
   * Override motion timings, or the easings inside `ease`. A partial override
   * keeps the other timings and the other phasings.
   */
  readonly motion?: Partial<Omit<Motion, "ease">> & {
    readonly ease?: Partial<MotionEasings>;
  };
  /** Override border thicknesses. */
  readonly borderWidth?: Partial<BorderWidth>;
  /** Override icon sizes. */
  readonly iconSize?: Partial<IconSize>;
  /** Override individual avatar diameters. */
  readonly avatarSize?: Partial<AvatarSize>;
}

/**
 * Input to {@link createTheme}: a mode, the built-in contrast variant to start
 * from, and overrides. `contrast` selects the palette; it is not a claim.
 */
export interface ThemeConfig extends Omit<ThemeOverrides, "contrast"> {
  readonly mode: ThemeMode;
  /**
   * Which built-in variant to build on. Defaults to `"default"`, so the call
   * without it is unchanged. Unlike an `extendTheme` override, this selects the
   * palette rather than declaring a level the theme may not carry.
   */
  readonly contrast?: ThemeContrast;
}

/**
 * Merge the defined entries of `override` over `base`. An explicit `undefined`
 * is treated as omitted, so a partial config spread cannot erase a role, a
 * metric or an elevation level.
 */
const mergeDefined = <T extends object>(
  base: T,
  override: Partial<T> | undefined,
): T => {
  if (override === undefined) {
    return base;
  }
  const merged = { ...base };
  Object.assign(
    merged,
    Object.fromEntries(
      Object.entries(override).filter(([, value]) => value !== undefined),
    ),
  );
  return merged;
};

const mergeMotion = (
  base: Motion,
  override:
    | (Partial<Omit<Motion, "ease">> & {
        readonly ease?: Partial<MotionEasings>;
      })
    | undefined,
): Motion => {
  if (override === undefined) {
    return base;
  }
  const { ease, ...timings } = override;
  return {
    ...mergeDefined(base, timings),
    ease: mergeDefined(base.ease, ease),
  };
};

const mergeTypography = (
  base: Typography,
  override: TypographyOverrides | undefined,
): Typography => {
  if (override === undefined) {
    return base;
  }
  return {
    sans: override.sans ?? base.sans,
    mono: override.mono ?? base.mono,
    display: mergeDefined(base.display, override.display),
    h1: mergeDefined(base.h1, override.h1),
    h2: mergeDefined(base.h2, override.h2),
    h3: mergeDefined(base.h3, override.h3),
    body: mergeDefined(base.body, override.body),
    bodyStrong: mergeDefined(base.bodyStrong, override.bodyStrong),
    label: mergeDefined(base.label, override.label),
    caption: mergeDefined(base.caption, override.caption),
    code: mergeDefined(base.code, override.code),
    codeBlock: mergeDefined(base.codeBlock, override.codeBlock),
  };
};

const mergeDensity = (
  base: Density,
  override: DensityName | DensityOverrides | undefined,
): Density => {
  if (override === undefined) {
    return base;
  }
  if (isDensityName(override)) {
    return densityPresets[override];
  }
  const from =
    override.preset === undefined ? base : densityPresets[override.preset];
  return {
    name: from.name,
    controlHeight: mergeDefined(from.controlHeight, override.controlHeight),
    controlPaddingX: mergeDefined(
      from.controlPaddingX,
      override.controlPaddingX,
    ),
    rowHeight: override.rowHeight ?? from.rowHeight,
  };
};

/** The default light theme. */
export const lightTheme: Theme = {
  name: "Light",
  mode: "light",
  contrast: "default",
  colors: lightColors,
  typography,
  spacing,
  radius,
  density: defaultDensity,
  dimensions,
  elevation: lightElevation,
  motion,
  borderWidth,
  iconSize,
  avatarSize,
};

/** The default dark theme. */
export const darkTheme: Theme = {
  name: "Dark",
  mode: "dark",
  contrast: "default",
  colors: darkColors,
  typography,
  spacing,
  radius,
  density: defaultDensity,
  dimensions,
  elevation: darkElevation,
  motion,
  borderWidth,
  iconSize,
  avatarSize,
};

/** Themes by mode, for application mode switches. */
export const themes: Readonly<Record<ThemeMode, Theme>> = {
  light: lightTheme,
  dark: darkTheme,
};

/**
 * Contrast variants the library ships, in documentation order. `ThemeContrast`
 * derives from this list, so a new variant must also gain a set of floors and a
 * theme per mode.
 */
export const themeContrasts = ["default", "high"] as const;

/** Contrast variants the library ships, independent of light/dark mode. */
export type ThemeContrast = (typeof themeContrasts)[number];

/** Narrow unknown input to a theme mode. Not a theme decoder. */
export const isThemeMode = (value: unknown): value is ThemeMode =>
  themeModes.some((mode) => mode === value);

/** Narrow unknown input to a contrast variant. Not a theme decoder. */
export const isThemeContrast = (value: unknown): value is ThemeContrast =>
  themeContrasts.some((contrast) => contrast === value);

/** The high-contrast light theme. */
export const highContrastLightTheme: Theme = {
  name: "High contrast light",
  mode: "light",
  contrast: "high",
  colors: highContrastLightColors,
  typography,
  spacing,
  radius,
  density: defaultDensity,
  dimensions,
  elevation: lightElevation,
  motion,
  borderWidth,
  iconSize,
  avatarSize,
};

/** The high-contrast dark theme. */
export const highContrastDarkTheme: Theme = {
  name: "High contrast dark",
  mode: "dark",
  contrast: "high",
  colors: highContrastDarkColors,
  typography,
  spacing,
  radius,
  density: defaultDensity,
  dimensions,
  elevation: highContrastDarkElevation,
  motion,
  borderWidth,
  iconSize,
  avatarSize,
};

/** High-contrast themes by mode. */
export const highContrastThemes: Readonly<Record<ThemeMode, Theme>> = {
  light: highContrastLightTheme,
  dark: highContrastDarkTheme,
};

/**
 * Return a built-in theme for a mode and contrast level. The default contrast
 * keeps the existing behaviour, so `getTheme("dark")` is unchanged.
 *
 * @example
 * ```ts
 * const accessible = getTheme("dark", "high");
 * ```
 */
export function getTheme(
  mode: ThemeMode,
  contrast: ThemeContrast = "default",
): Theme {
  return contrast === "high" ? highContrastThemes[mode] : themes[mode];
}

/**
 * Derive a theme from a base theme without mutating it. A colour change moves
 * the whole filled family, the value groove included; the complete, executed
 * example is `src/brand-theme.example.ts`.
 *
 * @example
 * ```ts
 * import { darkTheme, extendTheme } from "@gpuixui/tokens";
 *
 * const compact = extendTheme(darkTheme, {
 *   name: "Acme compact",
 *   density: "compact",
 *   radius: { md: 8 },
 * });
 * ```
 */
export function extendTheme(base: Theme, overrides: ThemeOverrides): Theme {
  return {
    name: overrides.name ?? base.name,
    mode: base.mode,
    contrast: overrides.contrast ?? base.contrast,
    colors: mergeDefined(base.colors, overrides.colors),
    typography: mergeTypography(base.typography, overrides.typography),
    spacing: mergeDefined(base.spacing, overrides.spacing),
    radius: mergeDefined(base.radius, overrides.radius),
    density: mergeDensity(base.density, overrides.density),
    dimensions: mergeDefined(base.dimensions, overrides.dimensions),
    elevation: mergeDefined(base.elevation, overrides.elevation),
    motion: mergeMotion(base.motion, overrides.motion),
    borderWidth: mergeDefined(base.borderWidth, overrides.borderWidth),
    iconSize: mergeDefined(base.iconSize, overrides.iconSize),
    avatarSize: mergeDefined(base.avatarSize, overrides.avatarSize),
  };
}

/**
 * Build a theme for a mode and contrast variant, starting from the built-in
 * theme for that pair. Only {@link extendTheme} can declare a floor set: the
 * builder selects the palette it carries, so it cannot claim another.
 *
 * @example
 * ```ts
 * import { createTheme } from "@gpuixui/tokens";
 *
 * const brand = createTheme({
 *   mode: "dark",
 *   name: "Acme",
 *   colors: {
 *     primary: "#7C5CFF",
 *     primaryForeground: "#000000",
 *     primaryHover: "#8F73FF",
 *     primaryActive: "#A28CFF",
 *     primaryText: "#C9BDFF",
 *     track: "#20202E",
 *     ring: "#9B8CFF",
 *     overlay: "#000000D9",
 *   },
 *   radius: { md: 8 },
 *   density: "compact",
 * });
 *
 * const accessible = createTheme({ mode: "dark", contrast: "high" });
 * ```
 */
export function createTheme(config: ThemeConfig): Theme {
  const { mode, contrast = "default", ...overrides } = config;
  return extendTheme(getTheme(mode, contrast), overrides);
}

/**
 * A palette's name with a style's label, once. A name that already ends with the
 * label belongs to that style already, so re-applying a stored choice keeps the
 * name a preview prints instead of appending the label again.
 */
const appliedStyleName = (paletteName: string, label: string): string =>
  paletteName.endsWith(` · ${label}`)
    ? paletteName
    : `${paletteName} · ${label}`;

/**
 * Change only the two font families of a theme for a platform.
 *
 * @deprecated Plan 063 replaced this with {@link applyPlatformStyle} and
 * {@link getPlatformTheme}: a platform variant is a full style (families,
 * radii, density, motion, surfaces, accent, shadows), not a font decision.
 * This alias keeps the pre-063 contract — same colours, scales, mode, density
 * and elevation; only the families and the name change — for the `primitives`
 * workstream, which still imports it. It will be removed when that workstream
 * migrates; do not use it in new code.
 *
 * @example
 * ```tsx
 * import { platformTheme, themes } from "@gpuixui/tokens";
 * import { ThemeProvider } from "@gpuixui/tokens/react";
 *
 * <ThemeProvider theme={platformTheme(themes.dark, "win32")} />
 * ```
 */
export function platformTheme(base: Theme, platform: PlatformName): Theme {
  const { label, sans, mono } = platformTypes[platform];
  return extendTheme(base, {
    name: appliedStyleName(base.name, label),
    typography: { sans, mono },
  });
}

/**
 * The theme a requested level is built on. A base that already carries the
 * level is kept as it is — a consumer's edits, a brand's name and a style's
 * unnamed roles survive — and otherwise the identity at that level supplies the
 * palette, its name and the opacity its `shadow` tint was designed with.
 */
const levelIdentity = (base: Theme, level: ThemeContrast): Theme =>
  base.contrast === level ? base : getTheme(base.mode, level);

/**
 * A style level's geometry with the base theme's opacity. An alpha is designed
 * against a tint — the AAA dark set paints with light, so a dark-mode platform's
 * 0.4–0.8 would paint a near-white halo — so at high contrast a platform lends
 * its depth and the base's opacity stays with its tint.
 */
const withBaseAlpha = (
  base: ReadonlyArray<ElevationShape>,
  style: ReadonlyArray<ElevationShape>,
): ElevationShape[] => {
  const [painted] = base;
  return painted === undefined
    ? [...style]
    : style.map((shape) => ({ ...shape, alpha: painted.alpha }));
};

/**
 * Every level a style defines, its geometry kept and its alpha taken from the
 * palette's own level. `mergeDefined` drops an omitted level, so a style that
 * names no elevation still inherits the palette's.
 */
const platformElevation = (
  base: Elevation,
  style: Partial<Elevation>,
): Partial<Elevation> => ({
  sm: style.sm === undefined ? undefined : withBaseAlpha(base.sm, style.sm),
  md: style.md === undefined ? undefined : withBaseAlpha(base.md, style.md),
  lg: style.lg === undefined ? undefined : withBaseAlpha(base.lg, style.lg),
  overlay:
    style.overlay === undefined
      ? undefined
      : withBaseAlpha(base.overlay, style.overlay),
});

const platformOverrides = (
  base: Theme,
  style: PlatformStyle,
  contrast: ThemeContrast,
): ThemeOverrides => {
  const { label, sans, mono } = style.types;
  const styleColors = style.colors[base.mode];
  const appliesColors = Object.values(styleColors).some(
    (color) => color !== undefined,
  );
  // One decision, four consequences: the level decides the palette, and the
  // palette decides the name, the declaration and the elevation opacity. A high
  // request always builds the AAA palette; a default request builds the default
  // palette when the style contributes colours (plan 373); a shape-only style
  // changes no colour, so the base's level is kept (plan 301).
  const level =
    contrast === "high" ? "high" : appliesColors ? "default" : base.contrast;
  const palette = levelIdentity(base, level);
  return {
    name: appliedStyleName(palette.name, label),
    typography: { sans, mono, ...style.structure.typography },
    spacing: style.structure.spacing,
    radius: style.structure.radius,
    density: style.structure.density,
    motion: style.structure.motion,
    borderWidth: style.structure.borderWidth,
    iconSize: style.structure.iconSize,
    avatarSize: style.structure.avatarSize,
    dimensions: style.structure.dimensions,
    // A high-contrast palette keeps the opacity its tint was designed with: a
    // dark platform's 0.4–0.8 over the AAA dark set's light tint would paint a
    // near-white halo (plan 505). The style still lends its geometry, and a
    // level it does not name stays the palette's.
    elevation:
      level === "high"
        ? mergeDefined(
            palette.elevation,
            platformElevation(palette.elevation, style.elevation[base.mode]),
          )
        : style.elevation[base.mode],
    // AAA floors win over a style's colours, which are designed at the default
    // level. A same-level base keeps its own palette, edits included. An
    // undefined colour is unnamed, so it inherits from the requested palette,
    // never from the AAA base the request is leaving (plan 551).
    colors:
      level === "high"
        ? palette === base
          ? undefined
          : palette.colors
        : mergeDefined(palette.colors, styleColors),
    contrast: palette === base ? undefined : level,
  };
};

/**
 * Apply any platform style — shipped or copied and edited — to a base theme.
 *
 * The requested level decides the palette, the name, the declaration and the
 * elevation opacity, so the result always carries the level it claims:
 *
 * - `"high"` builds the AAA palette of the base's mode. A platform's colours are
 *   designed at the default floors, so they never repaint it; the AAA `shadow`
 *   tint and the opacity designed against it stay, while the platform lends its
 *   geometry — radii, density, motion and its elevation shapes.
 * - `"default"` builds the default palette when the style contributes colours,
 *   taking the roles it does not name from the default-level identity of the
 *   same mode, so the result is a whole palette rather than half an AAA one
 *   (plan 373).
 * - Omitting the argument, or naming the level the base already declares, keeps
 *   the base's palette, name and edits, so a style still overrides only what it
 *   names.
 *
 * A style with no colour overrides changes no colour, so a default request keeps
 * the base's level (plan 301); its name says so, because the name follows the
 * palette. The result is a normal {@link Theme}, so it composes through
 * {@link extendTheme} like any other. Applying a style the result already ends
 * with is a no-op on every field, the name included: a stored choice re-applied
 * on startup keeps `Light · Windows` instead of printing
 * `Light · Windows · Windows` (plan 545).
 *
 * @example
 * ```ts
 * import {
 *   applyPlatformStyle,
 *   getTheme,
 *   platformStyles,
 * } from "@gpuixui/tokens";
 *
 * const windows = applyPlatformStyle(getTheme("dark"), platformStyles.win32);
 * ```
 */
export function applyPlatformStyle(
  base: Theme,
  style: PlatformStyle,
  contrast: ThemeContrast = base.contrast,
): Theme {
  return extendTheme(base, platformOverrides(base, style, contrast));
}

/**
 * Build a shipped platform variant for a mode and contrast level.
 *
 * The Default variant returns the identity unchanged. Every other variant is
 * the built-in theme for the mode, extended with the platform's type families,
 * radii, density, motion, surfaces, accent and shadows — a normal {@link Theme},
 * so it composes through {@link extendTheme} like any other.
 *
 * @example
 * ```tsx
 * import { getPlatformTheme } from "@gpuixui/tokens";
 * import { ThemeProvider } from "@gpuixui/tokens/react";
 *
 * <ThemeProvider theme={getPlatformTheme("win32", "dark")} />
 * ```
 */
export function getPlatformTheme(
  platform: PlatformName,
  mode: ThemeMode,
  contrast: ThemeContrast = "default",
): Theme {
  const base = getTheme(mode, contrast);
  return platform === "default"
    ? base
    : applyPlatformStyle(base, platformStyles[platform]);
}
