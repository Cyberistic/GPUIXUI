/**
 * Resolving a stored choice at the boundary.
 *
 * A preference restored from storage is `unknown`: a settings row, a URL
 * parameter or a persisted workspace can carry a mode, a contrast variant, a
 * platform, a density, a control size or a status tone that this build no longer
 * ships. Each axis has an ordered index beside its guard, so a consumer narrows
 * the stored value and falls back to a readable default instead of retyping the
 * union or casting the value.
 *
 * The example is executed in [`guards.test.ts`](./guards.test.ts).
 */

import { isPlatformName, type PlatformName } from "./platforms.js";
import {
  isControlSize,
  isDensityName,
  densityPresets,
  type ControlSize,
  type Density,
} from "./scale.js";
import { isStatusTone, statusTone, type StatusToneStyle } from "./styles.js";
import { getTheme, isThemeContrast, isThemeMode, type Theme } from "./theme.js";

/** `value` when `guard` accepts it, the readable `fallback` otherwise. */
export const orDefault = <A>(
  guard: (value: unknown) => value is A,
  fallback: A,
  value: unknown,
): A => (guard(value) ? value : fallback);

/** Resolve a stored mode and contrast to a shipped theme. */
export const themeFromStoredChoice = (stored: {
  readonly mode: unknown;
  readonly contrast: unknown;
}): Theme =>
  getTheme(
    orDefault(isThemeMode, "light", stored.mode),
    orDefault(isThemeContrast, "default", stored.contrast),
  );

/** Resolve a stored preset name to its control metrics. */
export const densityFromStoredChoice = (value: unknown): Density =>
  densityPresets[orDefault(isDensityName, "comfortable", value)];

/** Resolve a stored control size to a size this library renders. */
export const controlSizeFromStoredChoice = (value: unknown): ControlSize =>
  orDefault(isControlSize, "md", value);

/** Resolve a stored status tone to the roles a soft surface needs. */
export const toneFromStoredChoice = (
  theme: Theme,
  value: unknown,
): StatusToneStyle => statusTone(theme, orDefault(isStatusTone, "info", value));

/** Resolve a stored platform to one this library styles. */
export const platformFromStoredChoice = (value: unknown): PlatformName =>
  orDefault(isPlatformName, "default", value);
