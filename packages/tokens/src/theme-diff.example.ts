/**
 * The inverse of `extendTheme`: an edited theme is expressed as the overrides
 * that reproduce it, so an editor can store or emit the small set instead of a
 * whole theme object. This file is type-checked and asserted in
 * `theme-diff.test.ts`.
 */
import { extendTheme, getTheme, themeOverrides } from "./index.js";

/** The base an editor starts from. */
export const exportedBase = getTheme("light");

/**
 * An edited theme touching four groups in the documented copy-and-own shape.
 * `body` moves only its leading, so the rest of its type role inherits.
 */
export const exportedTheme = extendTheme(exportedBase, {
  name: "Exported",
  density: "compact",
  radius: { md: 8 },
  typography: { body: { lineHeight: 22 } },
});

/**
 * The minimal overrides that rebuild {@link exportedTheme} from
 * {@link exportedBase}, ready to print in a `createTheme` module.
 */
export const exportedOverrides = themeOverrides(exportedBase, exportedTheme);
