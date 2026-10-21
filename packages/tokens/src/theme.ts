import {
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  lightColors,
  type ThemeColors,
} from "./color.js";
import { darkElevation, lightElevation, type Elevation } from "./elevation.js";
import { platformStyles, type PlatformName } from "./platforms.js";
import {
  borderWidth,
  defaultDensity,
  densityPresets,
  iconSize,
  radius,
  spacing,
  type BorderWidth,
  type Density,
  type DensityName,
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
 * Contrast variants the library ships, in documentation order. `ThemeContrast`
 * derives from this list, so a new variant must also gain a set of floors and a
 * theme per mode.
 */
export const themeContrasts = ["default", "high"] as const;

/** Contrast variants the library ships, independent of light/dark mode. */
export type ThemeContrast = (typeof themeContrasts)[number];

/**
 * Narrow unknown input — a stored preference — to a theme mode. This is not a
 * theme decoder: it checks the axis only, and a consumer iterates
 * {@link themeModes} instead of retyping the modes.
 */
export const isThemeMode = (value: unknown): value is ThemeMode =>
  themeModes.some((mode) => mode === value);

/**
 * Narrow unknown input to a contrast variant. Not a theme decoder, and a
 * consumer iterates {@link themeContrasts} rather than retyping them.
 */
export const isThemeContrast = (value: unknown): value is ThemeContrast =>
  themeContrasts.some((contrast) => contrast === value);

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
   * The contrast variant this theme carries. Absent on a hand-built theme, so
   * a caller can tell a high-contrast theme from an ordinary one — which is how
   * {@link platformTheme} knows to keep its colours.
   */
  readonly contrast?: ThemeContrast;
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
  /** Shadow levels. */
  readonly elevation: Elevation;
  /** Border thicknesses. */
  readonly borderWidth: BorderWidth;
  /** Icon sizes. */
  readonly iconSize: IconSize;
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
  /** Override individual semantic colour roles. */
  readonly colors?: Partial<ThemeColors>;
  /** Override font families or text roles. */
  readonly typography?: TypographyOverrides;
  /** Override individual spacing steps. */
  readonly spacing?: Partial<Spacing>;
  /** Override individual radii. */
  readonly radius?: Partial<Radius>;
  /**
   * Use a density preset, or override density metrics. A partial override
   * keeps the base preset's name.
   */
  readonly density?: DensityName | Partial<Omit<Density, "name">>;
  /** Replace individual elevation levels. */
  readonly elevation?: Partial<Elevation>;
  /** Override border thicknesses. */
  readonly borderWidth?: Partial<BorderWidth>;
  /** Override icon sizes. */
  readonly iconSize?: Partial<IconSize>;
}

/** Input to {@link createTheme}: a mode plus overrides. */
export interface ThemeConfig extends ThemeOverrides {
  readonly mode: ThemeMode;
}

const mergeTextStyle = (
  base: TextStyle,
  override: Partial<TextStyle> | undefined,
): TextStyle => (override === undefined ? base : { ...base, ...override });

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
    display: mergeTextStyle(base.display, override.display),
    h1: mergeTextStyle(base.h1, override.h1),
    h2: mergeTextStyle(base.h2, override.h2),
    h3: mergeTextStyle(base.h3, override.h3),
    body: mergeTextStyle(base.body, override.body),
    bodyStrong: mergeTextStyle(base.bodyStrong, override.bodyStrong),
    label: mergeTextStyle(base.label, override.label),
    caption: mergeTextStyle(base.caption, override.caption),
    code: mergeTextStyle(base.code, override.code),
    codeBlock: mergeTextStyle(base.codeBlock, override.codeBlock),
  };
};

const mergeDensity = (
  base: Density,
  override: DensityName | Partial<Omit<Density, "name">> | undefined,
): Density => {
  if (override === undefined) {
    return base;
  }
  return typeof override === "string"
    ? densityPresets[override]
    : { ...base, ...override, name: base.name };
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
  elevation: lightElevation,
  borderWidth,
  iconSize,
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
  elevation: darkElevation,
  borderWidth,
  iconSize,
};

/** Themes by mode, for application mode switches. */
export const themes: Readonly<Record<ThemeMode, Theme>> = {
  light: lightTheme,
  dark: darkTheme,
};

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
  elevation: lightElevation,
  borderWidth,
  iconSize,
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
  elevation: darkElevation,
  borderWidth,
  iconSize,
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
 *   colors: { primary: "#6A45F0", primaryForeground: "#FFFFFF" },
 * });
 * ```
 */
export function extendTheme(base: Theme, overrides: ThemeOverrides): Theme {
  return {
    name: overrides.name ?? base.name,
    mode: base.mode,
    contrast: base.contrast,
    colors: { ...base.colors, ...overrides.colors },
    typography: mergeTypography(base.typography, overrides.typography),
    spacing: { ...base.spacing, ...overrides.spacing },
    radius: { ...base.radius, ...overrides.radius },
    density: mergeDensity(base.density, overrides.density),
    elevation: { ...base.elevation, ...overrides.elevation },
    borderWidth: { ...base.borderWidth, ...overrides.borderWidth },
    iconSize: { ...base.iconSize, ...overrides.iconSize },
  };
}

/**
 * Build a theme for a mode, starting from the built-in light or dark theme.
 *
 * @example
 * ```ts
 * const brand = createTheme({
 *   mode: "dark",
 *   name: "Acme",
 *   colors: { primary: "#6A45F0", primaryForeground: "#FFFFFF" },
 *   density: "compact",
 * });
 * ```
 */
export function createTheme(config: ThemeConfig): Theme {
  const { mode, ...overrides } = config;
  return extendTheme(themes[mode], overrides);
}

/**
 * A theme for one platform: the base theme's mode and elevation, with that
 * platform's families, radii, density and chrome colours. A high-contrast base
 * keeps its own colours — accessibility outranks the platform look — and takes
 * only the families, radii and density.
 *
 * `extendTheme` does the merge, so the base is never mutated. The result is an
 * ordinary theme: layer `extendTheme` on top to keep the platform's look but
 * change a value.
 *
 * @example
 * ```tsx
 * import { platformTheme, themes } from "@gpuixui/tokens";
 *
 * <ThemeProvider theme={platformTheme(themes.dark, "win32")} />
 * ```
 */
export function platformTheme(base: Theme, platform: PlatformName): Theme {
  const {
    label,
    sans,
    mono,
    radius: platformRadius,
    density,
    colors,
  } = platformStyles[platform];
  return extendTheme(base, {
    name: `${base.name} · ${label}`,
    typography: { sans, mono },
    radius: platformRadius,
    density,
    colors: base.contrast === "high" ? undefined : colors[base.mode],
  });
}
