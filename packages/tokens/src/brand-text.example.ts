/**
 * A link painted from the theme, over the brand the library ships and over a
 * brand pale enough that the fill role cannot be read as text. Executed by
 * `brand-text.test.ts`, so the call site the catalogue documents is a real one.
 */

import { brandText, brandTextOn, type Theme } from "./index.js";
import { extendTheme, lightTheme } from "./theme.js";

/**
 * The four states a link paints: its resting colour, the wash it tints while
 * hovered and pressed, and the row it sits in once that row is chosen. A real
 * component adds typography and the underline; this is only the colour a link
 * must not invent.
 */
export const linkStyles = (theme: Theme) => ({
  resting: { color: brandText(theme) },
  hover: { color: brandText(theme), backgroundColor: theme.colors.hover },
  pressed: { color: brandText(theme), backgroundColor: theme.colors.active },
  row: { color: brandText(theme), backgroundColor: theme.colors.selected },
});

/** A brand that is a fill and not a text colour: a pale violet on a light page. */
export const paleBrand = extendTheme(lightTheme, {
  colors: { primary: "#C9B8FF" },
});

/**
 * A link action inside a message's own tint — an `Alert`'s description is a
 * container, so an action can live on the tone's `xSoft` fill. The shared
 * `brandText` colour cannot serve it (it is derived for the page and the washes
 * a link tints), so the run names the surface it sits on.
 */
export const messageLinkStyles = (theme: Theme) => ({
  color: brandTextOn(theme, "infoSoft"),
  backgroundColor: theme.colors.infoSoft,
});
