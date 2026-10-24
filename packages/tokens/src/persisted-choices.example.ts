/**
 * Resolving a stored choice at the boundary.
 *
 * A preference restored from storage is `unknown`: a settings row, a URL
 * parameter or a persisted workspace can carry a mode, a contrast variant, a
 * platform, a look, a density, a control size, a status tone, the type role a
 * saved document was written with or the elevation a saved panel was raised to
 * that this build no longer ships. Each axis has an ordered index beside its
 * guard, so a consumer narrows the stored value and falls back to a readable
 * default instead of retyping the union or casting the value.
 *
 * The example is executed in [`guards.test.ts`](./guards.test.ts).
 */

import { isElevationLevel, type ElevationLevel } from "./elevation.js";
import { isPlatformName, type PlatformName } from "./platforms.js";
import { isRetroName, type RetroName } from "./retro.js";
import {
  isControlSize,
  isDensityName,
  densityPresets,
  type ControlSize,
  type Density,
} from "./scale.js";
import { isStatusTone, statusTone, type StatusToneStyle } from "./styles.js";
import { getTheme, isThemeContrast, isThemeMode, type Theme } from "./theme.js";
import { isTextRole, type TextRole } from "./typography.js";

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

/**
 * Resolve the level a saved panel was raised to.
 *
 * A workspace layout or a settings row stores the lift a surface had, so a
 * release that renames or drops a level hands the painter a name the union no
 * longer carries. `elevationShadow` reads that name as `md` on its own;
 * narrowing here is what keeps the saved intent — a dialog's `lg` stays `lg`
 * — and tells the consumer which value it substituted.
 */
export const elevationFromStoredChoice = (value: unknown): ElevationLevel =>
  orDefault(isElevationLevel, "md", value);

/** Resolve a stored status tone to the roles a soft surface needs. */
export const toneFromStoredChoice = (
  theme: Theme,
  value: unknown,
): StatusToneStyle => statusTone(theme, orDefault(isStatusTone, "info", value));

/** Resolve a stored platform to one this library styles. */
export const platformFromStoredChoice = (value: unknown): PlatformName =>
  orDefault(isPlatformName, "default", value);

/** Resolve a stored look to one this library ships. */
export const lookFromStoredChoice = (value: unknown): RetroName =>
  orDefault(isRetroName, "aero", value);

/**
 * Resolve the role a saved document carries to one this release's scale paints.
 *
 * A markdown node, a rich-text span or a restored inspector row stores the role
 * it was written with, so a release that renames or drops a role hands the
 * painter a name the union no longer carries. `textStyle` reads that name as
 * `body` on its own; narrowing here is what keeps the *document's* intent —
 * a heading stays the default body role only where the scale has nothing better
 * to say, and the consumer knows which value it substituted.
 */
export const textRoleFromStoredChoice = (value: unknown): TextRole =>
  orDefault(isTextRole, "body", value);
