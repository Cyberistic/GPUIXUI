/**
 * The divider derivation over the wash a row wears, and the two brands whose own
 * strongest line cannot answer one. Executed by `divider.test.ts`, so the call
 * sites the catalogue documents are real ones.
 */

import {
  contrastRatio,
  dividerFailures,
  dividerOn,
  extendTheme,
  lightTheme,
  platformTheme,
  pointerWash,
  themes,
  type DividerWash,
  type PointerWashSurface,
  type Theme,
} from "./index.js";

/**
 * The rule a row paints on the state it is in.
 *
 * A table row draws its own rule inside the row, so the colour has to be read
 * against the fill the row is wearing — the `hover` a pointed row tints, the
 * `accent` a chosen row hovers with, or the `selected` fill it holds once
 * chosen.
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
 * The rule a **pressed** row paints, over the wash the press derives.
 *
 * A press is not the `active` role: the packages that paint a row derive it with
 * `pointerWash`
 * over the wash the row was wearing, and seven of the thirty-six press
 * placements in the shipped styles paint a colour that role does not name. The
 * rule is read against that wash, so the call site names the wash it replaces
 * rather than a role.
 */
export const pressRule = (
  theme: Theme,
  replaced: PointerWashSurface,
): string | undefined => {
  const wash = pointerWash(theme, "active", replaced);
  return wash === undefined ? undefined : dividerOn(theme, wash);
};

/** How far a pressed row's rule is from the wash it is drawn on. */
export const pressSeparation = (
  theme: Theme,
  replaced: PointerWashSurface,
): number | undefined => {
  const rule = pressRule(theme, replaced);
  const wash = pointerWash(theme, "active", replaced);
  return rule === undefined || wash === undefined
    ? undefined
    : contrastRatio(rule, wash);
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

/** The pressed wash the authored macOS light style paints, which its `active` role is not. */
const authoredPress =
  pointerWash(platformTheme(themes.light, "darwin"), "active", "hover") ??
  lightTheme.colors.active;

/**
 * A brand whose strongest line **is** the wash a press derives.
 *
 * The role is not the press: macOS light's press over `hover` is a step off its
 * `active` role, and a palette that makes its whole rule family that colour has
 * no line left to draw on the pressed row.
 */
export const swallowedPressBrand = extendTheme(
  platformTheme(themes.light, "darwin"),
  { colors: { border: authoredPress, borderStrong: authoredPress } },
);

/** A failure written the way a theme editor shows it. */
export const reportRules = (theme: Theme): ReadonlyArray<string> =>
  dividerFailures(theme).map(
    ({ surface, role, over, ratio }) =>
      `${role} on ${surface === "pressedDivider" ? `the press over ${over}` : over} is ${
        ratio === undefined ? "unmeasurable" : ratio.toFixed(2)
      }`,
  );
