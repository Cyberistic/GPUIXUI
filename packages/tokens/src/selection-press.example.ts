import {
  alpha,
  compositeOver,
  extendTheme,
  getTheme,
  themeFailures,
} from "./index.js";

/** The share of the mode's extreme a selected row's press adds. */
export const selectionPressVeilAmount = 0.24;

/**
 * The veil a selected row's press adds: a 24% veil of white in light and black
 * in dark over `selected`. A light press lightens and a dark press darkens,
 * because both preview the row the click returns to.
 *
 * The extreme, not the canvas: a default canvas is near-white or near-black, so
 * veiling the canvas itself is a different fill. The high-contrast sets are the
 * only ones where the two readings agree, which is why the older wording
 * survived.
 */
export const selectionPressVeils = {
  light: alpha("#FFFFFF", selectionPressVeilAmount),
  dark: alpha("#000000", selectionPressVeilAmount),
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
