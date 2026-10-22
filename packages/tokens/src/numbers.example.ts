import { auditTheme, extendTheme, lightTheme } from "./index.js";

/**
 * A brand whose corner radius was computed from a scale factor nobody set: the
 * value is `NaN`, the style batch serialises it to `null`, and the runtime drops
 * the property in silence — so every card paints square while the theme claims a
 * radius.
 */
export const unmeasuredBrandTheme = extendTheme(lightTheme, {
  name: "Unmeasured",
  radius: { md: Number.NaN },
});

/**
 * What the gate reports for it: the radius by group, path, value and rule, and
 * none of the colour reports, because nothing is wrong with a colour.
 */
export const unmeasuredBrandAudit = auditTheme(unmeasuredBrandTheme);

/**
 * A "dense" preset a settings file handed back with every control shaved a few
 * pixels and the rows shaved further. Each height is a finite number the
 * renderer lays out, so nothing looks broken — but the box a pointer presses is
 * the control (or, for a dense list row, the row itself), the library reserves
 * no hit area on top of either, and two of the three control sizes plus the row
 * are now under the 24px floor.
 */
export const squatDensityTheme = extendTheme(lightTheme, {
  name: "Squat",
  density: {
    controlHeight: { sm: 20, md: 22, lg: 24 },
    rowHeight: 20,
  },
});

/** What the gate reports for it: the two shrunken sizes and the row, by name. */
export const squatDensityAudit = auditTheme(squatDensityTheme);

/**
 * A type scale a factor moved: the sizes are the library's, the leadings were
 * multiplied by 0.7. Every number is positive and finite, so the renderer lays
 * the text out — each line just starts inside the glyph box of the one above it,
 * and a paragraph becomes a smear. The gate compares the pair rather than the
 * numbers alone.
 */
export const crushedTypeTheme = extendTheme(lightTheme, {
  name: "Crushed",
  typography: {
    display: { lineHeight: 20 },
    h1: { lineHeight: 16 },
    body: { lineHeight: 10 },
  },
});

/** What the gate reports for it: each leading that fell under its own size. */
export const crushedTypeAudit = auditTheme(crushedTypeTheme);

/**
 * A brand that grew its reading size and kept the smallest density: the body
 * leading is 26px inside `compact`'s 24px `sm` control, so the line is taller
 * than the box that carries it. Every number is finite, positive and pressable,
 * the type scale is in order, and the colours are untouched — only the pair
 * across the two groups fails.
 */
export const tallTypeTheme = extendTheme(lightTheme, {
  name: "Tall type",
  density: "compact",
  typography: { body: { lineHeight: 26 } },
});

/** What the gate reports for it: the one box the leading outgrew, by size. */
export const tallTypeAudit = auditTheme(tallTypeTheme);

/**
 * A brand that states "no heavy lines" by setting the strong border to zero.
 * Every number is finite and non-negative, so nothing looks broken — and the
 * strong width is the width of the focus ring: `keyboardFocusRing`'s outline is
 * zero pixels wide and `focusRing`'s shadow has neither spread nor blur, so a
 * keyboard reader has no focus cue at all while every colour report passes.
 */
export const invisibleRingTheme = extendTheme(lightTheme, {
  name: "Invisible ring",
  borderWidth: { strong: 0 },
});

/** What the gate reports for it: the strong border, by name, as a size. */
export const invisibleRingAudit = auditTheme(invisibleRingTheme);
