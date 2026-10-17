import {
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  lightColors,
  type ThemeColors,
} from "./color.js";
import { darkElevation, lightElevation, type Elevation } from "./elevation.js";
import { motion, type Motion, type MotionEasings } from "./motion.js";
import { platformTypes, type PlatformName } from "./platforms.js";
import {
  avatarSize,
  borderWidth,
  defaultDensity,
  densityPresets,
  iconSize,
  radius,
  spacing,
  type AvatarSize,
  type BorderWidth,
  type Density,
  type DensityName,
  type IconSize,
  type Radius,
  type Spacing,
} from "./scale.js";
import { typography, type TextStyle, type Typography } from "./typography.js";

/** Theme modes the library ships. */
export type ThemeMode = "light" | "dark";

/**
 * A complete, resolved design theme. Every field is plain data, so a theme can
 * be passed through React context, stored, or built at startup.
 */
export interface Theme {
  /** Human-readable theme name, used by previews and diagnostics. */
  readonly name: string;
  /** The mode this theme was built for. Never changed by an override. */
  readonly mode: ThemeMode;
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

/** Input to {@link createTheme}: a mode plus overrides. */
export interface ThemeConfig extends ThemeOverrides {
  readonly mode: ThemeMode;
}

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
  return { ...base, ...timings, ease: { ...base.ease, ...ease } };
};

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

const isDensityName = (
  value: DensityName | Partial<Omit<Density, "name">>,
): value is DensityName => typeof value === "string";
const mergeDensity = (
  base: Density,
  override: DensityName | Partial<Omit<Density, "name">> | undefined,
): Density => {
  if (override === undefined) {
    return base;
  }
  if (isDensityName(override)) {
    return densityPresets[override];
  }
  return { ...base, ...override, name: base.name };
};

/** The default light theme. */
export const lightTheme: Theme = {
  name: "Light",
  mode: "light",
  colors: lightColors,
  typography,
  spacing,
  radius,
  density: defaultDensity,
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
  colors: darkColors,
  typography,
  spacing,
  radius,
  density: defaultDensity,
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

/** Contrast variants the library ships, independent of light/dark mode. */
export type ThemeContrast = "default" | "high";

/** The high-contrast light theme. */
export const highContrastLightTheme: Theme = {
  name: "High contrast light",
  mode: "light",
  colors: highContrastLightColors,
  typography,
  spacing,
  radius,
  density: defaultDensity,
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
  colors: highContrastDarkColors,
  typography,
  spacing,
  radius,
  density: defaultDensity,
  elevation: darkElevation,
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
    colors: { ...base.colors, ...overrides.colors },
    typography: mergeTypography(base.typography, overrides.typography),
    spacing: { ...base.spacing, ...overrides.spacing },
    radius: { ...base.radius, ...overrides.radius },
    density: mergeDensity(base.density, overrides.density),
    elevation: { ...base.elevation, ...overrides.elevation },
    motion: mergeMotion(base.motion, overrides.motion),
    borderWidth: { ...base.borderWidth, ...overrides.borderWidth },
    iconSize: { ...base.iconSize, ...overrides.iconSize },
    avatarSize: { ...base.avatarSize, ...overrides.avatarSize },
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
 *   colors: { primary: "#7C5CFF" },
 *   density: "compact",
 * });
 * ```
 */
export function createTheme(config: ThemeConfig): Theme {
  const { mode, ...overrides } = config;
  return extendTheme(themes[mode], overrides);
}

/**
 * A theme for one platform: the base theme's colours, scales, mode and density,
 * with that platform's font families. `extendTheme` does the merge, so the base
 * is never mutated and the mode is preserved.
 *
 * @example
 * ```tsx
 * import { platformTheme, themes } from "@gpuixui/tokens";
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
