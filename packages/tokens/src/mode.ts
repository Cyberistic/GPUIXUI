import { themeColors, type ColourSource } from "./color.js";
import { pageMode } from "./luminance.js";

export const themeModes = ["light", "dark"] as const;

export type ThemeMode = (typeof themeModes)[number];

export const themeContrasts = ["default", "high"] as const;

export type ThemeContrast = (typeof themeContrasts)[number];

export const isThemeMode = (value: unknown): value is ThemeMode =>
  themeModes.some((mode) => mode === value);

export const isThemeContrast = (value: unknown): value is ThemeContrast =>
  themeContrasts.some((contrast) => contrast === value);

export const themeContrastOf = (theme: {
  readonly contrast?: unknown;
}): ThemeContrast => {
  const stated = theme.contrast;
  if (stated === undefined || stated === null) {
    return "default";
  }
  return isThemeContrast(stated) ? stated : "high";
};

export const themeModeOf = (
  theme: ColourSource & { readonly mode?: unknown },
): ThemeMode => {
  const stated = theme.mode;
  if (isThemeMode(stated)) {
    return stated;
  }
  return pageMode(themeColors(theme).background) ?? "light";
};
