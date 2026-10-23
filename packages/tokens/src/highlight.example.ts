/**
 * The find-highlight call site, and the two brands an accent cannot carry.
 * Executed by `highlight.test.ts`, so the snippet the catalogue prints is a real
 * one.
 */

import {
  alphaOf,
  blend,
  contrastRatio,
  extendTheme,
  findHighlight,
  highlightFailures,
  lightTheme,
  type HighlightFailure,
  type HighlightSurface,
  type Theme,
} from "./index.js";

/**
 * The spec a text host takes for a search's matches.
 *
 * Spread into `highlight` beside the query: the host then paints this theme's
 * wash instead of the runtime's built-in accent, and marks the active match with
 * the stronger one.
 */
export const searchHighlight = (theme: Theme) => {
  const { color, activeColor, radius } = findHighlight(theme);
  return { color, activeColor, radius };
};

/**
 * How far the resting wash is from the strip under it — what a reader sees as
 * "this is a match". The wash is translucent, so it is composited first.
 */
export const matchSeparation = (
  theme: Theme,
  surface: HighlightSurface,
): number | undefined => {
  const wash = findHighlight(theme).color;
  return contrastRatio(
    blend(theme.colors[surface], wash, alphaOf(wash)),
    theme.colors[surface],
  );
};

/** The active match's wash over the same strip, at the share the theme chose. */
export const activeSeparation = (
  theme: Theme,
  surface: HighlightSurface,
): number | undefined => {
  const wash = findHighlight(theme).activeColor;
  return contrastRatio(
    blend(theme.colors[surface], wash, alphaOf(wash)),
    theme.colors[surface],
  );
};

/**
 * A brand whose accent **is** its page: the wash is the strip, so nothing marks
 * a match.
 */
export const invisibleHighlightBrand = extendTheme(lightTheme, {
  colors: { primary: lightTheme.colors.background },
});

/**
 * A brand whose body pair sits exactly on the floor: `#555555` on the light
 * page measures 7.00:1, so the contrast contract passes it with no headroom
 * left. Any wash strong enough to be seen lowers the text under the floor it
 * just met, which is the one thing a find highlight needs.
 */
export const lowHeadroomBrand = extendTheme(lightTheme, {
  colors: { foreground: "#555555" },
});

/** A failure written the way a theme editor shows it. */
export const reportHighlights = (theme: Theme): ReadonlyArray<string> =>
  highlightFailures(theme).map(
    ({ kind, state, surface, ratio, floor }: HighlightFailure) =>
      `${state} ${kind} on ${surface}: ${
        ratio === undefined ? "unmeasurable" : ratio.toFixed(2)
      } (needs ${floor})`,
  );
