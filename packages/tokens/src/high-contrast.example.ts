import {
  createTheme,
  highContrastThemes,
  themes,
  type Theme,
  type ThemeMode,
} from "./index.js";

/**
 * Resolve the built-in theme for a mode and an accessibility preference. A real
 * application stores the preference and calls this once per render.
 */
export const resolveTheme = (mode: ThemeMode, highContrast: boolean): Theme =>
  highContrast ? highContrastThemes[mode] : themes[mode];

/**
 * Start a theme on the high-contrast variant. `contrast` selects the palette,
 * the way it does in `getTheme`; it is not a claim about a palette the theme
 * does not carry.
 */
export const accessibleDarkTheme = createTheme({
  mode: "dark",
  contrast: "high",
});
