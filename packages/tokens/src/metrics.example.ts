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
