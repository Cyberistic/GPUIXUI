import {
  compositeOver,
  extendTheme,
  getTheme,
  themeFailures,
} from "./index.js";

/**
 * The canvas-tinted veil a selected row's press is designed with: 24% of the
 * canvas colour over `selected`. A light press lightens and a dark press
 * darkens, because both preview the row the click returns to.
 */
export const selectionPressVeils = {
  light: "#FFFFFF3D",
  dark: "#0000003D",
} as const;

const brandSelected = "#D8E6FF";

/**
 * A copied theme that moves its selection and derives the press with the same
 * veil, so the new fill clears every pair and the direction check. A copied
 * style that edits `selected` alone keeps the old `selectedActive` and the
 * step pair reports it.
 */
export const selectionPressTheme = extendTheme(getTheme("light"), {
  colors: {
    selected: brandSelected,
    selectedActive: compositeOver(selectionPressVeils.light, brandSelected),
  },
});

/** The guarantee for the copied theme: no colour, contrast or metric failure. */
export const selectionPressFailures = themeFailures(selectionPressTheme);
