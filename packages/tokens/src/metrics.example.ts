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
