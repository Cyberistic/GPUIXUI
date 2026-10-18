/**
 * The alpha form a role must take, and the two edits it catches.
 *
 * `themeColorFailures` accepts six- and eight-digit hex, because the token maths
 * parses both. The form is the other half: the three veils composite over
 * content, and every other role paints solid. A tint authored at 50% loses its
 * byte to the level's own alpha (`elevationShadow`), and a solid scrim hides the
 * window it exists to veil. Both edits change no contrast pair, so this check is
 * the only one that sees them.
 */
import { themeOpacityFailures } from "./opacity.js";
import { extendTheme, getTheme } from "./theme.js";

/** The light theme with its elevation tint authored at 50%. */
export const translucentTint = extendTheme(getTheme("light"), {
  colors: { shadow: "#191D2580" },
});

/** The tint's byte is discarded by the paint, so the role must be opaque. */
export const translucentTintFailures = themeOpacityFailures(translucentTint);

/** The light theme with a scrim that hides the window instead of veiling it. */
export const solidScrim = extendTheme(getTheme("light"), {
  colors: { overlay: "#000000" },
});

/** A scrim is a veil, so it needs an alpha byte the runtime can composite. */
export const solidScrimFailures = themeOpacityFailures(solidScrim);
