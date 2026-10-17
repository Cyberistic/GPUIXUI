/**
 * The three built-in palettes the playground paints, by id.
 *
 * The shell's theme switch and the theme gallery both step through these, so
 * the gallery cannot prove a palette the shell never offers. High contrast is
 * the dark variant: the gallery's job is the token layer, not a contrast pass
 * over every combination.
 */
import { getTheme, type Theme } from "@gpuixui/tokens";

/** The palette ids the shell switch exposes. */
export const paletteIds = ["dark", "light", "high"] as const;

/** One palette the playground can paint. */
export type PaletteId = (typeof paletteIds)[number];

/** Resolved themes by palette id. */
export const palettes: Readonly<Record<PaletteId, Theme>> = {
  dark: getTheme("dark"),
  light: getTheme("light"),
  high: getTheme("dark", "high"),
};

/** The next palette in the switch's cycle. */
export const nextPalette: Readonly<Record<PaletteId, PaletteId>> = {
  dark: "light",
  light: "high",
  high: "dark",
};
