/**
 * The browser font bridge.
 *
 * GPUI resolves the `.SystemUIFont` sentinel to the operating system's own UI
 * font; a browser cannot. The preview maps the sentinel to a CSS system stack
 * so it paints what the runtime paints on the reader's machine, and leaves
 * every other family alone.
 */

/** The CSS stack that stands in for GPUI's system UI font. */
export const SYSTEM_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** The CSS font stack for a theme's UI family. */
export const cssFontStack = (sans: string): string =>
  sans === ".SystemUIFont" ? SYSTEM_FONT_STACK : sans;
