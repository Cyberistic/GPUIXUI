/**
 * An inline avatar taller than the dense row it leads: the colour, typeface,
 * contrast, hierarchy and direction checks are empty, and the numeric one names
 * the raised row. The whole avatar ladder moves together and `radius.full`
 * still rounds the largest tier, so the only defect is the mark outgrowing its
 * row.
 */
import { extendTheme, getTheme, themeMetricFailures } from "./index.js";

export const tallInlineAvatar = extendTheme(getTheme("light"), {
  avatarSize: { xs: 40, sm: 44, md: 48, lg: 52 },
});
export const tallInlineAvatarFailures = themeMetricFailures(tallInlineAvatar);
