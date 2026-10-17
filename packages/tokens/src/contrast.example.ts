import {
  extendTheme,
  getTheme,
  highContrastLightTheme,
  themeContrastFailures,
} from "./index.js";

/**
 * A brand theme whose secondary text is deliberately too quiet — the mistake a
 * copied platform style can make when a value is edited by eye.
 */
export const quietBrandTheme = extendTheme(getTheme("light"), {
  name: "Quiet",
  colors: { mutedForeground: "#B8BCC4" },
});

/**
 * The one line a consumer's test adds: an empty array is the library's
 * guarantee, and a non-empty one names every pair that needs fixing.
 */
export const quietBrandFailures = themeContrastFailures(quietBrandTheme);

/**
 * A theme that declares the high-contrast floors and then loses them: 5.33:1
 * against the white canvas, under the 7:1 it was built for.
 */
export const quietHighContrastTheme = extendTheme(highContrastLightTheme, {
  name: "Quiet AAA",
  colors: { mutedForeground: "#6B6B6B" },
});

/**
 * No second argument: the check reads the level the theme declares, so a
 * high-contrast theme is measured against 7:1 rather than the default floors.
 */
export const quietHighContrastFailures = themeContrastFailures(
  quietHighContrastTheme,
);
