import {
  applyPlatformStyle,
  extendTheme,
  getPlatformTheme,
  getTheme,
  systemUiFont,
  type PlatformStyle,
  type Theme,
  type ThemeColors,
  type ThemeMode,
} from "./index.js";

/**
 * Contoso's primary family. A brand that moves a fill moves the whole family —
 * fill, foreground, hover, pressed and text — because an inherited state keeps
 * the base hue and an inherited foreground can miss the on-colour floor. The
 * Windows dark foreground this example used to inherit measured 2.96:1 on the
 * fill and 2.12:1 on the hover (plan 310).
 */
const contosoPrimary = {
  light: {
    primary: "#0F6CBD",
    primaryForeground: "#FFFFFF",
    primaryHover: "#0C5694",
    primaryActive: "#0A4A7D",
    primaryText: "#0A4A7D",
  },
  dark: {
    primary: "#5CB8FF",
    primaryForeground: "#001A33",
    primaryHover: "#8CCFFF",
    primaryActive: "#A6DBFF",
    primaryText: "#8CCFFF",
  },
} as const satisfies Readonly<Record<ThemeMode, Partial<ThemeColors>>>;

/**
 * The copy-and-own story: start from a shipped platform variant and edit any
 * value. The result is a normal theme, so every component reads it through the
 * same provider and no component source changes.
 */
export const resolveEditedPlatformTheme = (mode: ThemeMode): Theme =>
  extendTheme(getPlatformTheme("win32", mode), {
    name: "Contoso",
    colors: contosoPrimary[mode],
    radius: { md: 3, lg: 6 },
  });

/**
 * A style file authored from scratch, as a consumer would after copying one from
 * `platform-styles/`. It names only what Contoso changes; every other role and
 * every scale inherits the identity. The accent family moves whole — fill,
 * foreground, hover and press — because an inherited state keeps the base hue:
 * this example's hover and press were the identity iris until plan 330. The
 * drag-selection wash follows the accent at the identity's alpha, so a copied
 * style does not select text in another hue (plan 331). The dark selection fill
 * steps one deeper than the accent's tint so the inherited graphite divider
 * keeps a visible edge on it (plan 335).
 */
export const contosoPlatformStyle = {
  types: { label: "Contoso", sans: systemUiFont, mono: "Cascadia Mono" },
  structure: {
    density: "spacious",
    radius: { sm: 3, md: 5, lg: 9, xl: 12 },
  },
  colors: {
    light: {
      ...contosoPrimary.light,
      accent: "#E8F1FB",
      accentForeground: "#004578",
      accentHover: "#D5E8F7",
      accentActive: "#B7D4F0",
      ring: "#0F6CBD",
      selected: "#DCEEFB",
      selectedForeground: "#003A6B",
      selection: "#0F6CBD3D",
    },
    dark: {
      ...contosoPrimary.dark,
      accent: "#0C3559",
      accentForeground: "#BCE0FF",
      accentHover: "#17497A",
      accentActive: "#245F96",
      ring: "#5CB8FF",
      selected: "#082F52",
      selectedForeground: "#D6EBFF",
      selection: "#5CB8FF33",
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
