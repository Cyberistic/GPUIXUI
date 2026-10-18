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
  /** Override individual semantic colour roles. */
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
   * and large ones. A partial override keeps the base preset's name.
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
  return {
    name: base.name,
    controlHeight: mergeDefined(base.controlHeight, override.controlHeight),
    controlPaddingX: mergeDefined(
      base.controlPaddingX,
      override.controlPaddingX,
    ),
    rowHeight: override.rowHeight ?? base.rowHeight,
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
 * Derive a theme from a base theme without mutating it.
 *
 * @example
 * ```ts
 * const brand = extendTheme(darkTheme, {
 *   name: "Acme",
 *   colors: { primary: "#7C5CFF" },
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
 * const brand = createTheme({
 *   mode: "dark",
 *   name: "Acme",
 *   colors: { primary: "#7C5CFF" },
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
    name: `${base.name} · ${label}`,
    typography: { sans, mono },
  });
}

/**
 * The palette an applied platform colour set is written over. A theme that
 * already declares the default level keeps its own colours, edits included. A
 * base at another level is replaced as a set, because a platform palette is
 * designed at the default floors and the roles a style does not name must not
 * stay behind from a palette the caller asked to leave (plan 373).
 */
const appliedPalette = (base: Theme): ThemeColors =>
  base.contrast === "default"
    ? base.colors
    : getTheme(base.mode, "default").colors;

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
 * base theme. `mergeDefined` drops an omitted level, so a style that names no
 * elevation still inherits the base's.
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
  // A level carries no colour: its alpha is designed against the base's
  // `shadow` tint, so a platform lends the geometry at high contrast and the
  // AAA set keeps the opacity that tint was designed with (plan 505). At
  // default contrast the style's own tint, geometry and alpha all apply.
  const elevation =
    contrast === "high"
      ? platformElevation(base.elevation, style.elevation[base.mode])
      : style.elevation[base.mode];
  const structural: ThemeOverrides = {
    name: `${base.name} · ${label}`,
    typography: { sans, mono, ...style.structure.typography },
    spacing: style.structure.spacing,
    radius: style.structure.radius,
    density: style.structure.density,
    motion: style.structure.motion,
    borderWidth: style.structure.borderWidth,
    iconSize: style.structure.iconSize,
    avatarSize: style.structure.avatarSize,
    dimensions: style.structure.dimensions,
  };
  if (contrast === "high") {
    return { ...structural, elevation };
  }
  const colors = style.colors[base.mode];
  const appliesColors = Object.values(colors).some(
    (color) => color !== undefined,
  );
  return {
    ...structural,
    elevation,
    colors: appliesColors ? { ...appliedPalette(base), ...colors } : colors,
    // The declaration follows the palette: a defined platform colour is an
    // override designed at the default floors, while an undefined one inherits
    // the base role and leaves the base's level alone.
    contrast: appliesColors ? "default" : base.contrast,
  };
};

/**
 * Apply any platform style — shipped or copied and edited — to a base theme.
 *
 * The contrast level defaults to the one the base declares, so applying a
 * copied style to a high-contrast theme keeps the AAA palette. At `"high"` the
 * families and shape are applied — radii, density, motion and the platform's
 * elevation geometry — while the base keeps its colour set and the opacity its
 * `shadow` tint was designed with, because a platform accent must not drop those
 * floors. The result
 * declares the level of the palette it carries:
 * naming `"default"` on an AAA base applies the platform colours and returns a
 * `default` theme, while a style with no colour overrides keeps the base's
 * level. Naming `"default"` on a base at another level replaces the palette as a
 * set: the roles the style does not name come from the default-level identity of
 * the same mode, so the returned theme is held to the floors it declares and
 * `themeContrastFailures` returns `[]` for every shipped style. A base that
 * already declares the level keeps its own colours, so a consumer's edits and a
 * style's unnamed roles are untouched. The result is a normal {@link Theme}, so
 * it composes through {@link extendTheme} like any other.
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
