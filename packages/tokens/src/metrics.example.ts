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
