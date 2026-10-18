/**
 * The level an applied platform style carries.
 *
 * A contrast request is a claim about the floors a theme is designed against, so
 * the level decides the palette, the name and the elevation's opacity. A `"high"`
 * request on a default theme builds the AAA palette and carries the AAA `shadow`
 * tint at the opacity designed for it; a same-level base keeps its own palette,
 * name and edits, and a shape-only style changes no colour, so it keeps the
 * base's level. The result is a normal theme, so the classes and the resolvers a
 * consumer already uses apply unchanged.
 */
import { elevationShadow } from "./elevation.js";
import { platformStyles } from "./platforms.js";
import {
  applyPlatformStyle,
  extendTheme,
  getPlatformTheme,
  getTheme,
} from "./theme.js";

/** A high-contrast request on a default theme: the AAA palette, with the shape. */
export const highContrastWindows = applyPlatformStyle(
  getTheme("dark"),
  platformStyles.win32,
  "high",
);

/** The level the theme declares — the one the request asked for. */
export const highContrastWindowsLevel = highContrastWindows.contrast; // "high"

/** The AAA dark set's light tint at its own 14% for `md`, on the Windows shape. */
export const highContrastWindowsMd = elevationShadow(
  highContrastWindows,
  "md",
)?.color;

/** A same-level base keeps its own palette, name and edits. */
export const acmeWindows = applyPlatformStyle(
  extendTheme(getTheme("dark", "high"), { name: "Acme" }),
  platformStyles.win32,
);

/** Or take the resolver that builds the level first, which is the same theme. */
export const windowsHigh = getPlatformTheme("win32", "dark", "high");
