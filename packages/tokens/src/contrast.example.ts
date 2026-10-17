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
 * A theme that declares the high-contrast floors and then loses them: 6.70:1 on
 * the pressed wash and 6.65:1 through the selection wash, under the 7:1 it was
 * built for, while still passing the default floors on every pair.
 */
export const quietHighContrastTheme = extendTheme(highContrastLightTheme, {
  name: "Quiet AAA",
  colors: { mutedForeground: "#444444" },
});

/**
 * No second argument: the check reads the level the theme declares, so a
 * high-contrast theme is measured against 7:1 rather than the default floors.
 */
export const quietHighContrastFailures = themeContrastFailures(
  quietHighContrastTheme,
);

/**
 * A theme whose focus ring is a surface tint rather than a contrast ring: it
 * passes as a fill, not as a ring. Focus and selection co-occur, so the check
 * measures the ring on every surface a focused control sits on — the quiet
 * panel and the accent wash included — not only on the canvas.
 */
export const quietRingTheme = extendTheme(getTheme("light"), {
  name: "Quiet ring",
  colors: { ring: "#EFF4FF" },
});

/** Every pair the quiet ring misses, the selected row included. */
export const quietRingFailures = themeContrastFailures(quietRingTheme);
