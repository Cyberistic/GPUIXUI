/**
 * The decorative-surface check over the themes the library ships and over a
 * brand that breaks one on purpose. Executed by `decorative.test.ts`, so the
 * call site the catalogue documents is a real one.
 */

import { decorativeFailures, type Theme } from "./index.js";
import { extendTheme, lightTheme } from "./theme.js";

/** Whether a theme's dividers, skeletons and veil are all visible. */
export const decorativeSurfacesAreVisible = (theme: Theme): boolean =>
  decorativeFailures(theme).length === 0;

/** A brand that paints its card edge in its own card fill — a card with no edge. */
export const edgeLessBrand = extendTheme(lightTheme, {
  colors: { border: lightTheme.colors.card },
});

/**
 * A brand whose secondary action is its own toolbar strip. The variant paints no
 * border, so a tonal button in a muted toolbar is a label with no button around
 * it — the same defect as the states, one control over.
 */
export const flatActionBrand = extendTheme(lightTheme, {
  colors: { secondary: lightTheme.colors.muted },
});

/**
 * A brand whose shadows are its own page colour. A tint equal to the surface it
 * falls on cannot darken it, so a raised card, menu or dialog paints flat at
 * every level however strong the level's share is.
 */
export const flatShadowBrand = extendTheme(lightTheme, {
  colors: { shadow: lightTheme.colors.background },
});

/**
 * A brand whose unavailable action wears the enabled tonal action's fill. The
 * two controls sit side by side in a toolbar and paint the same box; only the
 * lighter label says which one a reader can press.
 */
export const unavailableActionBrand = extendTheme(lightTheme, {
  colors: { disabled: lightTheme.colors.secondary },
});

/**
 * A brand whose loading placeholder is the fill a dialog paints. The dialog's
 * body is still loading and the skeleton rows are the only content it has, so a
 * placeholder in the dialog's own colour is a dialog that looks empty.
 */
export const flatSkeletonBrand = extendTheme(lightTheme, {
  colors: { skeleton: lightTheme.colors.popover },
});

/** A failure written the way a theme editor shows it. */
export const report = (theme: Theme): ReadonlyArray<string> =>
  decorativeFailures(theme).map(
    ({ surface, role, over, ratio }) =>
      `${surface}: ${role} on ${over} is ${ratio === undefined ? "unmeasurable" : ratio.toFixed(2)}`,
  );
