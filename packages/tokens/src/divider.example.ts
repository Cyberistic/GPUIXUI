/**
 * The divider derivation over the wash a row wears, and a brand whose own
 * strongest line cannot answer one. Executed by `divider.test.ts`, so the call
 * site the catalogue documents is a real one.
 */

import {
  contrastRatio,
  dividerFailures,
  dividerOn,
  extendTheme,
  lightTheme,
  type DividerWash,
  type Theme,
} from "./index.js";

/**
 * The rule a row paints on the state it is in.
 *
 * A table row draws its own rule inside the row, so the colour has to be read
 * against the fill the row is wearing — the `hover` a pointed row tints, the
 * `accent` a chosen row hovers with, the `active` it presses into, or the
 * `selected` fill it holds once chosen.
 */
export const rowRule = (theme: Theme, wash: DividerWash): string | undefined =>
  dividerOn(theme, theme.colors[wash]);

/** How far a row's rule is from the fill it is drawn on. */
export const ruleSeparation = (
  theme: Theme,
  wash: DividerWash,
): number | undefined => {
  const rule = rowRule(theme, wash);
  return rule === undefined
    ? undefined
    : contrastRatio(rule, theme.colors[wash]);
};

/**
 * A brand whose strongest line **is** the fill a chosen row hovers with.
 *
 * `borderStrong` is the ceiling the derivation may step to, so a palette that
 * makes it the wash has nowhere left to move where the authored role already
 * fails: the rule on that row is the row.
 */
export const swallowedRuleBrand = extendTheme(lightTheme, {
  colors: { borderStrong: lightTheme.colors.accent },
});

/** A failure written the way a theme editor shows it. */
export const reportRules = (theme: Theme): ReadonlyArray<string> =>
  dividerFailures(theme).map(
    ({ role, over, ratio }) =>
      `${role} on ${over} is ${
        ratio === undefined ? "unmeasurable" : ratio.toFixed(2)
      }`,
  );
