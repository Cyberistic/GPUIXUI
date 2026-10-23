import {
  extendTheme,
  retroTheme,
  type RetroName,
  type Theme,
  type ThemeMode,
  themes,
} from "./index.js";

/**
 * Resolve an authored look for a mode. Every mode of every look — Luna, Aero
 * and Omarchy; `retroTheme` keeps the base theme untouched, so it is safe to
 * call on every render.
 */
export const resolveRetroTheme = (mode: ThemeMode, name: RetroName): Theme =>
  retroTheme(themes[mode], name);

/**
 * Take a look's chrome and make it your own: the radius and the accent family
 * are the same roles every component reads, so a brand owns the values it
 * changes and inherits the rest. A look is data, not a preset — read
 * `retroStyles`, override what you want, and check the result.
 *
 * The brand owns `primary` **per mode**: it is also the mark a checked menu row
 * paints, and the look's dark washes are light enough that a single dark blue
 * sat at 1.70:1 and 1.46:1 on the row a reader points at (the mark contract
 * measures those strips). Light keeps the look's deep blue with white; dark
 * takes the light blue the brand already uses as its ring, with the near-black
 * it carries.
 */
export const resolveRetroBrand = (mode: ThemeMode): Theme =>
  extendTheme(resolveRetroTheme(mode, "aero"), {
    name: "Aero brand",
    colors: {
      primary: mode === "dark" ? "#4FA9E0" : "#0F5E8C",
      primaryForeground: mode === "dark" ? "#06222F" : "#FFFFFF",
      ring: mode === "dark" ? "#4FA9E0" : "#0F7BB8",
      accent: mode === "dark" ? "#163A4E" : "#BFE1F9",
      accentForeground: mode === "dark" ? "#BFE2F5" : "#0A3A56",
      // A chosen row is repainted `accent` under the pointer: the light
      // selection is a step deeper than the hover so the click is visible.
      selected: mode === "dark" ? "#1B445C" : "#B4D9F1",
      selectedForeground: mode === "dark" ? "#CDECFF" : "#0A3550",
      selection: mode === "dark" ? "#0F7BB84D" : "#0F7BB83D",
    },
    radius: { md: 6, lg: 8 },
  });
