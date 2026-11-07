import {
  createTheme,
  highContrastThemes,
  themes,
  type Theme,
  type ThemeColors,
  type ThemeMode,
} from "./index.js";

export const resolveTheme = (mode: ThemeMode, highContrast: boolean): Theme =>
  highContrast ? highContrastThemes[mode] : themes[mode];

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
