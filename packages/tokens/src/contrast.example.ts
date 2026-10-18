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

/**
 * A theme whose progress segment is nearly its own track: `primary` is a
 * near-panel grey that still clears the 1.05:1 interactive-fill floor on every
 * panel, so the old check passed while a 4px bar, a rating star or a slider's
 * rail had no shape. Plan 332's `mark` pairs are what report it.
 */
export const quietMarkTheme = extendTheme(getTheme("light"), {
  name: "Quiet mark",
  colors: { primary: "#E6E9EE" },
});

/** Every mark pair the quiet theme misses — the card, panel, popover and field. */
export const quietMarkFailures = themeContrastFailures(quietMarkTheme);

/**
 * A theme whose press is its own hover: the `active` wash is the `hover` wash,
 * so a ghost or outline control still clears every surface pair but stops
 * reacting to a press. Plan 357's `washStepPairs` is what reports it.
 */
export const quietPressTheme = extendTheme(getTheme("light"), {
  name: "Quiet press",
  colors: { active: getTheme("light").colors.hover },
});

/** The generic press pair the quiet theme misses. */
export const quietPressFailures = themeContrastFailures(quietPressTheme);

/**
 * A theme whose elevation tint is the selected row: a context menu or preview
 * card opened over a chosen row paints a shadow that composites to that row, so
 * it has no shadow there. Plan 509's `selected` elevation surface is what
 * reports it — the fill persists while the raised surface is open, exactly like
 * the scrim over the same row.
 */
export const quietShadowTheme = extendTheme(getTheme("light"), {
  name: "Quiet shadow",
  colors: { shadow: getTheme("light").colors.selected },
});

/** The three elevation levels the quiet shadow erases on the selected row. */
export const quietShadowFailures = themeContrastFailures(quietShadowTheme);
