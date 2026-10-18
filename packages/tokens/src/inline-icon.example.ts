/**
 * An inline icon taller than the caption line it sits in: the colour, typeface,
 * contrast, hierarchy and direction checks are empty, and the numeric one names
 * the raised line. The icon ladder still ascends and the default control icon
 * still fits, so the only defect is the glyph outgrowing its line box.
 */
import { extendTheme, getTheme, themeMetricFailures } from "./index.js";

export const crampedInlineIcon = extendTheme(getTheme("light"), {
  iconSize: { xs: 17, sm: 18, md: 18 },
});
export const crampedInlineIconFailures = themeMetricFailures(crampedInlineIcon);
