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
  typography: {
    body: { lineHeight: 26 },
    bodyStrong: { lineHeight: 26 },
  },
});

/** What the gate reports for it: the one box the leading outgrew, by size. */
export const tallTypeAudit = auditTheme(tallTypeTheme);

/**
 * A brand that enlarged its icon scale for a 24px grid and kept the library's
 * density: every step is finite, positive and in order, and the icon is exactly
 * the box a square action is — except `compact`'s smallest control is 24px and
 * the glyph is 26, so the icon a control carries is taller than the control.
 * Nothing else sees it: the box is still pressable, the type still fits it, and
 * the colours are untouched.
 */
export const grownIconTheme = extendTheme(lightTheme, {
  name: "Grown icon",
  density: "compact",
  iconSize: { md: 26, lg: 28, xl: 30 },
});

/** What the gate reports for it: the box the glyph outgrew, by size. */
export const grownIconAudit = auditTheme(grownIconTheme);

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

/**
 * A brand whose weight scale came from a design-tool export: the strong body
 * role was handed the regular weight. Both type sizes and both leadings are the
 * library's, the size scale is in order, and `bodyStrong` still owns its own
 * role — it just weighs what `body` weighs, so a card title, a lead-in and a line
 * a reader was meant to notice all read as plain body text. Nothing else can see
 * it: both weights are numbers the renderer lays out.
 */
export const flatEmphasisTheme = extendTheme(lightTheme, {
  name: "Flat emphasis",
  typography: { bodyStrong: { fontWeight: 400 } },
});

/** What the gate reports for it: the strong role's weight, by name. */
export const flatEmphasisAudit = auditTheme(flatEmphasisTheme);

/**
 * A brand that raised its reading size and left the emphasis behind. The
 * design-tool export named the token a body line is set from and not the one a
 * card title is: `body` is 15px and `bodyStrong` still 14, so the line the
 * reader is meant to notice is now the smaller of the two. Both sizes are finite
 * and positive, the scale is in order, the leading still reaches the body's own
 * size and the weights are the library's, so only the pair sees it.
 */
export const lopsidedEmphasisTheme = extendTheme(lightTheme, {
  name: "Lopsided emphasis",
  typography: { body: { fontSize: 15 } },
});

/** What the gate reports for it: the strong role's size, by name. */
export const lopsidedEmphasisAudit = auditTheme(lopsidedEmphasisTheme);

/**
 * A theme restored from a stored preference whose weight came from a scale
 * factor with no base: the heading's `fontWeight` is `NaN`, the batch serialises
 * it to `null`, and the runtime drops the property — so the largest role in the
 * scale paints at the runtime's default weight while every size, leading and
 * colour is the library's. A weight is a number, so the value typechecks and the
 * report is what catches it: it reads the number rather than trusting the type.
 */
const storedTypography = {
  ...lightTheme.typography,
  h1: { ...lightTheme.typography.h1, fontWeight: Number.NaN },
};

/** The stored theme, shaped like the theme it was restored from. */
export const droppedWeightTheme = {
  ...lightTheme,
  name: "Dropped weight",
  typography: storedTypography,
};

/** What the gate reports for it: the heading's weight, as a number it cannot serialise. */
export const droppedWeightAudit = auditTheme(droppedWeightTheme);
