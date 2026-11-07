import {
  extendTheme,
  retroTheme,
  type RetroName,
  type Theme,
  type ThemeMode,
  themes,
} from "./index.js";

export const resolveRetroTheme = (mode: ThemeMode, name: RetroName): Theme =>
  retroTheme(themes[mode], name);

export const resolveRetroBrand = (mode: ThemeMode): Theme =>
  extendTheme(resolveRetroTheme(mode, "aero"), {
    name: "Aero brand",
    colors: {
      primary: mode === "dark" ? "#4FA9E0" : "#0F5E8C",
      primaryForeground: mode === "dark" ? "#06222F" : "#FFFFFF",
      ring: mode === "dark" ? "#4FA9E0" : "#0F7BB8",
      accent: mode === "dark" ? "#163A4E" : "#BFE1F9",
      accentForeground: mode === "dark" ? "#BFE2F5" : "#0A3A56",

      selected: mode === "dark" ? "#1B445C" : "#B4D9F1",
      selectedForeground: mode === "dark" ? "#CDECFF" : "#0A3550",
      selection: mode === "dark" ? "#0F7BB84D" : "#0F7BB83D",
    },
    radius: { md: 6, lg: 8 },
  });
