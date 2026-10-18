/**
 * A density whose controls paint their labels on their own border: the colour,
 * typeface, contrast, hierarchy and direction checks are empty, and the numeric
 * one names the flush inset. The whole padding ladder moves together, so the
 * order rule stays satisfied and the only defect is the inset.
 */
import { extendTheme, getTheme, themeMetricFailures } from "./index.js";

export const flushControls = extendTheme(getTheme("light"), {
  density: { controlPaddingX: { sm: 0, md: 0, lg: 0 } },
});
export const flushControlFailures = themeMetricFailures(flushControls);
