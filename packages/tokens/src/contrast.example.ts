import { extendTheme, getTheme, themeContrastFailures } from "./index.js";

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
