/**
 * A link painted from the theme, over the brand the library ships and over a
 * brand pale enough that the fill role cannot be read as text. Executed by
 * `brand-text.test.ts`, so the call site the catalogue documents is a real one.
 */

import { brandText, type Theme } from "./index.js";
import { extendTheme, lightTheme } from "./theme.js";

/**
 * The three states a link paints: its resting colour, and the wash it tints
 * while hovered and pressed. A real component adds typography and the underline;
 * this is only the colour a link must not invent.
 */
export const linkStyles = (theme: Theme) => ({
  resting: { color: brandText(theme) },
  hover: { color: brandText(theme), backgroundColor: theme.colors.hover },
  pressed: { color: brandText(theme), backgroundColor: theme.colors.active },
});

/** A brand that is a fill and not a text colour: a pale violet on a light page. */
export const paleBrand = extendTheme(lightTheme, {
  colors: { primary: "#C9B8FF" },
});
