import { isElevationLevel, type ElevationLevel } from "./elevation.js";
import { isPlatformName, type PlatformName } from "./platforms.js";
import { isRetroName, type RetroName } from "./retro.js";
import {
  isAvatarSize,
  isControlSize,
  isDensityName,
  isIconSize,
  isRadiusStep,
  isSpacingStep,
  densityPresets,
  type AvatarSizeName,
  type ControlSize,
  type Density,
  type IconStep,
  type RadiusStep,
  type SpacingStep,
} from "./scale.js";
import { isStatusTone, statusTone, type StatusToneStyle } from "./styles.js";
import { getTheme, isThemeContrast, isThemeMode, type Theme } from "./theme.js";
import { isTextRole, type TextRole } from "./typography.js";

export const orDefault = <A>(
  guard: (value: unknown) => value is A,
  fallback: A,
  value: unknown,
): A => (guard(value) ? value : fallback);

export const themeFromStoredChoice = (stored: {
  readonly mode: unknown;
  readonly contrast: unknown;
}): Theme =>
  getTheme(
    orDefault(isThemeMode, "light", stored.mode),
    orDefault(isThemeContrast, "default", stored.contrast),
  );

export const densityFromStoredChoice = (value: unknown): Density =>
  densityPresets[orDefault(isDensityName, "comfortable", value)];

export const controlSizeFromStoredChoice = (value: unknown): ControlSize =>
  orDefault(isControlSize, "md", value);

export const elevationFromStoredChoice = (value: unknown): ElevationLevel =>
  orDefault(isElevationLevel, "md", value);

export const avatarSizeFromStoredChoice = (value: unknown): AvatarSizeName =>
  orDefault(isAvatarSize, "md", value);

export const iconSizeFromStoredChoice = (value: unknown): IconStep =>
  orDefault(isIconSize, "md", value);

export const spacingStepFromStoredChoice = (
  value: unknown,
): SpacingStep | undefined => (isSpacingStep(value) ? value : undefined);

export const radiusStepFromStoredChoice = (
  value: unknown,
): RadiusStep | undefined => (isRadiusStep(value) ? value : undefined);

export const toneFromStoredChoice = (
  theme: Theme,
  value: unknown,
): StatusToneStyle => statusTone(theme, orDefault(isStatusTone, "info", value));

export const platformFromStoredChoice = (value: unknown): PlatformName =>
  orDefault(isPlatformName, "default", value);

export const lookFromStoredChoice = (value: unknown): RetroName =>
  orDefault(isRetroName, "aero", value);

export const textRoleFromStoredChoice = (value: unknown): TextRole =>
  orDefault(isTextRole, "body", value);
