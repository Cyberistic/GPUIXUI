/**
 * The level an applied platform style carries.
 *
 * A contrast request is a claim about the floors a theme is designed against, so
 * the level decides the palette, the name and the elevation's opacity. A `"high"`
 * request on a default theme builds the AAA palette and carries the AAA `shadow`
 * tint at the opacity designed for it; a same-level base keeps its own palette,
 * name and edits, and a shape-only style changes no colour, so it keeps the
 * base's level. An omitted elevation level follows the palette too: a default
 * request takes the levels its style does not name from the requested palette,
 * not from the AAA base it is leaving. Re-applying the style the result already
 * carries changes nothing, so a settings panel or a restored choice can apply
 * the platform over the current theme. The result is a normal theme, so the
 * classes and the resolvers a consumer already uses apply unchanged.
 */
import { elevationShadow } from "./elevation.js";
import { platformStyles, type PlatformStyle } from "./platforms.js";
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

/** The same style applied again is the same theme, name included. */
export const acmeWindowsReapplied = applyPlatformStyle(
  acmeWindows,
  platformStyles.win32,
);

/** Or take the resolver that builds the level first, which is the same theme. */
export const windowsHigh = getPlatformTheme("win32", "dark", "high");

/** A copied style that names a colour and leaves the elevation to the palette. */
export const colourOnlyStyle: PlatformStyle = {
  ...platformStyles.default,
  types: { ...platformStyles.default.types, label: "Colour only" },
  colors: {
    light: { primary: getTheme("light").colors.primary },
    dark: { primary: getTheme("dark").colors.primary },
  },
  elevation: { light: {}, dark: {} },
};

/** A default request over the AAA dark base: the default palette's shadows. */
export const defaultFromHighContrast = applyPlatformStyle(
  getTheme("dark", "high"),
  colourOnlyStyle,
  "default",
);
