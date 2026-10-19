import { alpha, type ThemeColors } from "./color.js";
import { compositeOver, relativeLuminance } from "./contrast.js";
import type { Theme } from "./theme.js";

/**
 * The fraction the runtime fades a native document's `bg` by before painting a
 * code block on it — `ink()` in `render.rs`, fixed in the pinned runtime.
 */
export const nativeInkOpacity = 0.035;

/**
 * The surface a native code block actually paints on: `bg` under the runtime's
 * {@link nativeInkOpacity} black-or-white ink wash. A light tone is darkened and
 * a dark tone is lightened, exactly as the runtime chooses its ink.
 */
export function nativeInk(
  theme: Theme,
  surface: keyof ThemeColors = "card",
): string {
  const ink =
    relativeLuminance(theme.colors[surface]) < 0.5 ? "#FFFFFF" : "#000000";
  return compositeOver(alpha(ink, nativeInkOpacity), theme.colors[surface]);
}
