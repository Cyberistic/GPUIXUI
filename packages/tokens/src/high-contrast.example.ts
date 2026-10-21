import {
  createTheme,
  highContrastThemes,
  themes,
  type Theme,
  type ThemeColors,
  type ThemeMode,
} from "./index.js";

/**
 * Resolve the built-in theme for a mode and an accessibility preference. A real
 * application stores the preference and calls this once per render.
 */
export const resolveTheme = (mode: ThemeMode, highContrast: boolean): Theme =>
  highContrast ? highContrastThemes[mode] : themes[mode];

/**
 * A brand over either palette. `createTheme` starts from the contrast variant it
 * is given, so one set of overrides serves both accessibility preferences and a
 * consumer never assembles the accessible palette by hand.
 */
export const resolveBrandTheme = (
  mode: ThemeMode,
  highContrast: boolean,
  colors: Partial<ThemeColors>,
): Theme =>
  createTheme({
    mode,
    contrast: highContrast ? "high" : "default",
    name: "House",
    colors,
  });
