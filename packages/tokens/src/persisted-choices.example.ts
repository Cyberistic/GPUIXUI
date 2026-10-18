import {
  extendTheme,
  isControlSize,
  isDensityName,
  isStatusTone,
  resolveThemeChoice,
  type ControlSize,
  type StatusTone,
  type Theme,
} from "./index.js";

const fallbackControlSize: ControlSize = "md";
const fallbackTone: StatusTone = "info";

/**
 * Apply a persisted density to an already-resolved theme. A value the library
 * does not ship — an older preset, a hand-edited settings row — keeps the
 * theme's own preset, so a macOS workspace stays `compact` instead of becoming
 * comfortable because the stored value was stale. `resolveThemeChoice` applies
 * the same rule when it resolves the whole choice. Asserted in
 * `guards.test.ts` and `theme-choice.test.ts`.
 */
export const themeWithDensity = (theme: Theme, stored: unknown): Theme =>
  isDensityName(stored) ? extendTheme(theme, { density: stored }) : theme;

/**
 * Resolve a stored control size for a component that takes one. A value the
 * library does not ship keeps the default size rather than reaching the
 * density metrics as an unknown key.
 */
export const resolveControlSize = (value: unknown): ControlSize =>
  isControlSize(value) ? value : fallbackControlSize;

/** Resolve a tone from a payload; an unknown family falls back to `info`. */
export const resolveStatusTone = (value: unknown): StatusTone =>
  isStatusTone(value) ? value : fallbackTone;

/**
 * Resolve the mode and contrast half of a stored choice through the package's
 * resolver; a full settings row passes `platform`, `recipe` and `density` to
 * `resolveThemeChoice` as well. An unknown half keeps the readable default
 * rather than selecting a theme that does not exist.
 */
export const themeFromStoredChoice = (stored: {
  readonly mode: unknown;
  readonly contrast: unknown;
}): Theme => resolveThemeChoice(stored);
