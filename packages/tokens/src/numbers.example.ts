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
 * pixels. Each height is a finite number the renderer lays out, so nothing looks
 * broken — but the box a pointer presses is the control, the library reserves no
 * hit area on top of it, and two of the three sizes are now under the 24px floor.
 */
export const squatDensityTheme = extendTheme(lightTheme, {
  name: "Squat",
  density: { controlHeight: { sm: 20, md: 22, lg: 24 } },
});

/** What the gate reports for it: the two heights under the floor, by size. */
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
