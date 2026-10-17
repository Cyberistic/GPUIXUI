import { registerFonts, type FontRegistrar, type Typefaces } from "./fonts.js";
import { extendTheme, type Theme } from "./theme.js";

/**
 * Register an application's typefaces and derive the theme that names them in
 * one call. `registerFonts` is idempotent per renderer and file, so an effect
 * that re-runs on every render can call this unconditionally. Exercised by
 * `fonts.test.ts`.
 */
export const brandFontTheme = (
  registrar: FontRegistrar,
  typefaces: Typefaces,
  base: Theme,
): Theme =>
  extendTheme(base, { typography: registerFonts(registrar, typefaces) });
