/**
 * The one place a colour's lightness is measured.
 *
 * Two questions need it: WCAG's contrast ratio, and which mode a page's fill
 * implies. Both read the same transfer function and the same parser, so a page
 * `contrastRatio` can measure is a page a mode can be read from — the rule the
 * palette resolver already followed inline. Internal module: the public answers
 * are `contrastRatio` and `themeModeOf`.
 */

import { opaqueRgb } from "./measure.js";

const channel = (rgb: string, at: number): number => {
  const srgb = Number.parseInt(rgb.slice(at, at + 2), 16) / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.1 relative luminance of an opaque colour. */
export const relativeLuminance = (
  color: string | undefined,
): number | undefined => {
  const rgb = color === undefined ? undefined : opaqueRgb(color);
  return rgb === undefined
    ? undefined
    : 0.2126 * channel(rgb, 1) +
        0.7152 * channel(rgb, 3) +
        0.0722 * channel(rgb, 5);
};

/**
 * The mode a page's fill implies: a page closer to white than black is a dark
 * theme's page, because its ink is designed to read on it. `undefined` when no
 * colour grammar reads the page, the same absence `contrastRatio` answers.
 */
export const pageMode = (
  background: string | undefined,
): "light" | "dark" | undefined => {
  const page = relativeLuminance(background);
  if (page === undefined) {
    return undefined;
  }
  // Ratios against white and black, compared without the second luminance read.
  return 1.05 / (page + 0.05) > (page + 0.05) / 0.05 ? "dark" : "light";
};
