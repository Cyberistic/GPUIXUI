import {
  applyPlatformStyle,
  getTheme,
  platformRecipes,
  type Theme,
  type ThemeColors,
} from "./index.js";

/**
 * The primary family a copied recipe moves, taken from the platform example so
 * both copy-and-own paths teach the same rule: a fill painted as a mark keeps
 * its foreground and its two pointer states beside it. The one-role edit this
 * replaced left the Aero dark black foreground on the new fill (3.999:1) and
 * the fill itself under the 3:1 mark floor on a card, the value groove and the
 * hover wash (plan 658).
 */
export const recipePrimary = {
  primary: "#5CB8FF",
  primaryForeground: "#001A33",
  primaryHover: "#8CCFFF",
  primaryActive: "#A6DBFF",
  primaryText: "#8CCFFF",
} as const satisfies Readonly<Partial<ThemeColors>>;

/**
 * Aero, copied and edited the way `docs/tokens.md` teaches. The recipe's light
 * half is untouched; the dark half is the Windows palette the recipe already
 * carries, so the Contoso family is designed against the same surfaces.
 */
export const editedAeroTheme: Theme = applyPlatformStyle(getTheme("dark"), {
  ...platformRecipes.aero,
  colors: {
    ...platformRecipes.aero.colors,
    dark: { ...platformRecipes.aero.colors.dark, ...recipePrimary },
  },
});
