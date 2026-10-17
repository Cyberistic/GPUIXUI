import {
  extendTheme,
  getPlatformTheme,
  type Theme,
  type ThemeMode,
} from "./index.js";

/**
 * The copy-and-own story: start from a shipped platform variant and edit any
 * value. The result is a normal theme, so every component reads it through the
 * same provider and no component source changes.
 */
export const resolveEditedPlatformTheme = (mode: ThemeMode): Theme =>
  extendTheme(getPlatformTheme("win32", mode), {
    name: "Contoso",
    colors: { primary: "#005A9E", primaryHover: "#004578" },
    radius: { md: 3, lg: 6 },
  });
