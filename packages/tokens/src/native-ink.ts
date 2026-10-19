import { alpha, type ThemeColors } from "./color.js";
import { compositeOver, relativeLuminance } from "./contrast.js";
import type { Theme } from "./theme.js";

/**
 * The fraction the runtime fades a native document's `bg` by before painting a
 * code block on it — `ink()` in `render.rs`, fixed in the pinned runtime.
 */
export const nativeInkOpacity = 0.035;

/**
 * The surface a native document actually paints on: `bg` under one of the
 * runtime's fixed black-or-white ink washes. A light tone is darkened and a dark
 * tone is lightened, exactly as the runtime chooses its ink. The default is the
 * code block's {@link nativeInkOpacity} body wash; a caller names the chrome's
 * fraction for a language header, a file header or a hover wash.
 */
export function nativeInk(
  theme: Theme,
  surface: keyof ThemeColors = "card",
  opacity: number = nativeInkOpacity,
): string {
  const ink =
    relativeLuminance(theme.colors[surface]) < 0.5 ? "#FFFFFF" : "#000000";
  return compositeOver(alpha(ink, opacity), theme.colors[surface]);
}
