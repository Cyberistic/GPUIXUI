import { systemUiFont, type PlatformStyle } from "../platform-types.js";

/**
 * The library's own identity: no structural or colour overrides. The Default
 * variant exists so a preview can offer a fourth switch position that means
 * "the shipped design system", and `getPlatformTheme` returns the base theme
 * unchanged for it.
 */
export const defaultPlatformStyle = {
  types: { label: "Default", sans: systemUiFont, mono: "Menlo" },
  structure: {},
  colors: { light: {}, dark: {} },
  elevation: { light: {}, dark: {} },
} as const satisfies PlatformStyle;
