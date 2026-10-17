import {
  extendTheme,
  isDensityName,
  isStatusTone,
  type DensityName,
  type StatusTone,
  type Theme,
} from "./index.js";

const fallbackDensity: DensityName = "comfortable";
const fallbackTone: StatusTone = "info";

/**
 * Apply a persisted density to any theme. A value the library does not ship —
 * an older preset, a hand-edited settings row — keeps the default instead of
 * producing a theme with no control metrics. Type-checked and asserted in
 * `guards.test.ts`.
 */
export const themeWithDensity = (theme: Theme, stored: unknown): Theme =>
  extendTheme(theme, {
    density: isDensityName(stored) ? stored : fallbackDensity,
  });

/** Resolve a tone from a payload; an unknown family falls back to `info`. */
export const resolveStatusTone = (value: unknown): StatusTone =>
  isStatusTone(value) ? value : fallbackTone;
