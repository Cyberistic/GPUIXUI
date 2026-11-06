import { getTheme, type Theme } from "@gpuixui/tokens";

export const paletteIds = ["dark", "light", "high"] as const;

export type PaletteId = (typeof paletteIds)[number];

export const palettes: Readonly<Record<PaletteId, Theme>> = {
  dark: getTheme("dark"),
  light: getTheme("light"),
  high: getTheme("dark", "high"),
};

export const nextPalette: Readonly<Record<PaletteId, PaletteId>> = {
  dark: "light",
  light: "high",
  high: "dark",
};
