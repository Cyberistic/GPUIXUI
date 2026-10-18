/**
 * The documented path for the numeric contract: an edited theme is held to the
 * invariants the shipped ones pass, and the colour check alone cannot see a
 * metric that has become unusable.
 */
import { extendTheme, getTheme, themeMetricFailures } from "./index.js";

export const compact = extendTheme(getTheme("dark"), { density: "compact" });
export const compactFailures = themeMetricFailures(compact);

export const ringless = extendTheme(getTheme("light"), {
  borderWidth: { strong: 0 },
});
export const ringlessFailures = themeMetricFailures(ringless);

/**
 * A density that raises the default control above the row that holds it: the
 * colour check is empty, and the numeric one names the clipped row.
 */
export const stretched = extendTheme(getTheme("light"), {
  density: { controlHeight: { md: 40, lg: 44 }, rowHeight: 32 },
});
export const stretchedFailures = themeMetricFailures(stretched);

/**
 * A `full` radius that clears the largest control but not the largest avatar:
 * the colour check is empty, and the numeric one names the rounded square.
 */
export const squarish = extendTheme(getTheme("light"), {
  radius: { full: 18 },
});
export const squarishFailures = themeMetricFailures(squarish);

/**
 * A cubic-bezier easing the runtime cannot interpolate: its first x control
 * point is outside `0…1`, so the colour check is empty and the numeric one
 * names the transition.
 */
export const undriveable = extendTheme(getTheme("light"), {
  motion: { ease: { enter: [2, 0, 0, 1] } },
});
export const undriveableFailures = themeMetricFailures(undriveable);

/**
 * An inverted type scale: `h1` smaller than `h2`, with a leading that still
 * fits. The colour check is empty; the numeric one names the heading.
 */
export const invertedScale = extendTheme(getTheme("light"), {
  typography: { h1: { fontSize: 12, lineHeight: 16 } },
});
export const invertedScaleFailures = themeMetricFailures(invertedScale);

/**
 * An icon size of zero: the ladder does not step backwards, so before plan 372
 * the numeric check accepted it and the `xs` icon painted a 0×0 box. The named
 * size is now held to `positive`.
 */
export const invisibleIcon = extendTheme(getTheme("light"), {
  iconSize: { xs: 0 },
});
export const invisibleIconFailures = themeMetricFailures(invisibleIcon);

/**
 * A body line taller than the smallest field: a field paints the body role, so
 * a 30px line cannot fit the 26px content box of the 28px `sm` control. The
 * colour, typeface and contrast checks are empty; the numeric one names it.
 */
export const crampedField = extendTheme(getTheme("light"), {
  typography: { body: { fontSize: 14, lineHeight: 30 } },
});
export const crampedFieldFailures = themeMetricFailures(crampedField);
