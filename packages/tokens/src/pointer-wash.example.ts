/**
 * The pointer-wash derivation over a brand that breaks it on purpose.
 * Executed by `pointer-wash.test.ts`, so the call site the catalogue documents is
 * a real one.
 */

import {
  contrastRatio,
  extendTheme,
  lightTheme,
  pointerWash,
  pointerWashFailures,
  type Theme,
} from "./index.js";

/**
 * A brand whose press paints the wash the row is already wearing.
 *
 * The list row tints `accent` under the pointer and paints `active` while the
 * press is down, so a brand whose two roles are one value has a row that does
 * not answer the press: the row is repainted in the fill it already wears.
 */
export const flatPressBrand = extendTheme(lightTheme, {
  colors: { active: lightTheme.colors.accent },
});

/**
 * A brand whose press cannot be separated from its hover at all.
 *
 * The derivation moves the press toward the theme's `foreground`, so a palette
 * whose text colour *is* the hover wash has nowhere to move: every step paints
 * the same colour and the state stays invisible. This is the case the report
 * exists for.
 */
export const invisiblePressBrand = extendTheme(lightTheme, {
  colors: {
    active: lightTheme.colors.accent,
    foreground: lightTheme.colors.accent,
  },
});

/** The wash a row paints while it is pressed, as a painter reads it. */
export const pressWash = (
  theme: Theme,
  replaced: "accent" | "hover",
): string | undefined => pointerWash(theme, "active", replaced);

/** How far the derived press is from the wash it replaces. */
export const pressSeparation = (
  theme: Theme,
  replaced: "accent" | "hover",
): number | undefined => {
  const painted = pressWash(theme, replaced);
  return painted === undefined
    ? undefined
    : contrastRatio(painted, theme.colors[replaced]);
};

/** A failure written the way a theme editor shows it. */
export const reportPointerWashes = (theme: Theme): ReadonlyArray<string> =>
  pointerWashFailures(theme).map(
    ({ role, over, ratio }) =>
      `${role} on ${over} is ${
        ratio === undefined ? "unmeasurable" : ratio.toFixed(2)
      }`,
  );
