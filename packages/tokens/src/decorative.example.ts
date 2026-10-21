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

/** A failure written the way a theme editor shows it. */
export const report = (theme: Theme): ReadonlyArray<string> =>
  decorativeFailures(theme).map(
    ({ surface, role, over, ratio }) =>
      `${surface}: ${role} on ${over} is ${ratio === undefined ? "unmeasurable" : ratio.toFixed(2)}`,
  );
