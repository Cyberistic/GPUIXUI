import {
  applyPlatformStyle,
  extendTheme,
  getPlatformTheme,
  getTheme,
  systemUiFont,
  type PlatformStyle,
  type Theme,
  type ThemeMode,
} from "./index.js";

/**
 * The copy-and-own story: start from a shipped platform variant and edit any
 * value. The result is a normal theme, so every component reads it through the
 * same provider and no component source changes.
 */
export const resolveEditedPlatformTheme = (mode: ThemeMode): Theme =>
  extendTheme(getPlatformTheme("win32", mode), {
    name: "Contoso",
    colors: { primary: "#005A9E", primaryHover: "#004578" },
    radius: { md: 3, lg: 6 },
  });

/**
 * A style file authored from scratch, as a consumer would after copying one from
 * `platform-styles/`. It names only what Contoso changes; every other role and
 * every scale inherits the identity.
 */
export const contosoPlatformStyle = {
  types: { label: "Contoso", sans: systemUiFont, mono: "Cascadia Mono" },
  structure: {
    density: "spacious",
    radius: { sm: 3, md: 5, lg: 9, xl: 12 },
  },
  colors: {
    light: {
      primary: "#0F6CBD",
      primaryForeground: "#FFFFFF",
      primaryHover: "#0C5694",
      accent: "#E8F1FB",
      accentForeground: "#004578",
      ring: "#0F6CBD",
      selected: "#DCEEFB",
      selectedForeground: "#003A6B",
    },
    dark: {
      primary: "#5CB8FF",
      primaryForeground: "#001A33",
      primaryHover: "#8CCFFF",
      accent: "#0C3559",
      accentForeground: "#BCE0FF",
      ring: "#5CB8FF",
      selected: "#0A3A63",
      selectedForeground: "#D6EBFF",
    },
  },
  elevation: {
    light: {
      md: [
        {
          offsetX: 0,
          offsetY: 6,
          blurRadius: 16,
          spreadRadius: -4,
          alpha: 0.14,
        },
      ],
    },
    dark: {},
  },
} as const satisfies PlatformStyle;

/** Apply the authored file to the identity, the way the shipped variants are. */
export const resolveAuthoredPlatformStyle = (mode: ThemeMode): Theme =>
  applyPlatformStyle(getTheme(mode), contosoPlatformStyle);
