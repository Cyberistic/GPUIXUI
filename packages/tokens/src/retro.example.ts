import {
  extendTheme,
  retroTheme,
  type RetroName,
  type Theme,
  type ThemeMode,
  themes,
} from "./index.js";

/**
 * Resolve an authored look for a mode. Both modes, both eras; `retroTheme`
 * keeps the base theme untouched, so it is safe to call on every render.
 */
export const resolveRetroTheme = (mode: ThemeMode, name: RetroName): Theme =>
  retroTheme(themes[mode], name);

/**
 * Take an era's chrome and make it your own: the radius and the accent family
 * are the same roles every component reads, so a brand owns the values it
 * changes and inherits the rest. A look is data, not a preset — read
 * `retroStyles`, override what you want, and check the result.
 */
export const resolveRetroBrand = (mode: ThemeMode): Theme =>
  extendTheme(resolveRetroTheme(mode, "aero"), {
    name: "Aero brand",
    colors: {
      primary: "#0F5E8C",
      primaryForeground: "#FFFFFF",
      ring: mode === "dark" ? "#4FA9E0" : "#0F7BB8",
      accent: mode === "dark" ? "#163A4E" : "#BFE1F9",
      accentForeground: mode === "dark" ? "#BFE2F5" : "#0A3A56",
      selected: mode === "dark" ? "#1B445C" : "#BEE0F5",
      selectedForeground: mode === "dark" ? "#CDECFF" : "#0A3550",
      selection: mode === "dark" ? "#0F7BB84D" : "#0F7BB83D",
    },
    radius: { md: 6, lg: 8 },
  });
