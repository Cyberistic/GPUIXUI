import {
  systemMonoFamily,
  systemUiFont,
  type PlatformStyle,
} from "../platform-types.js";

/**
 * The library's own identity: no structural or colour overrides. The Default
 * variant exists so a preview can offer a fourth switch position that means
 * "the shipped design system", and `getPlatformTheme` returns the base theme
 * unchanged for it. Its mono is therefore the identity's `systemMonoFamily` —
 * the running platform's family — not one platform's face, which would name a
 * family Linux and Windows do not install when a consumer applies this style.
 */
export const defaultPlatformStyle = {
  types: { label: "Default", sans: systemUiFont, mono: systemMonoFamily },
  structure: {},
  colors: { light: {}, dark: {} },
  elevation: { light: {}, dark: {} },
} as const satisfies PlatformStyle;
