/**
 * The package's single seam over `@gpuixui/tokens`.
 *
 * Every component reads its colour, spacing, type and elevation roles from
 * here, so a token change lands in one file and no component repeats a raw
 * field lookup. No other file in this package may import `@gpuixui/tokens`
 * (plan 110 §6).
 */

import type { BoxShadow, StyleDesc } from "@gpuix/react";
import type { Elevation, Theme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export {
  controlHeight,
  controlPaddingX,
  darkTheme,
  lightTheme,
  textStyle,
} from "@gpuixui/tokens";
export type { Theme } from "@gpuixui/tokens";
export { ThemeProvider, useTheme } from "@gpuixui/tokens/react";

/**
 * One elevation level as GPUix's single shadow. `StyleDesc.boxShadow` holds one
 * `BoxShadow`, not a list, so a level that carries several paints its innermost.
 * `undefined` when the level is empty, which leaves the surface flat.
 */
export const elevation = (
  theme: Theme,
  level: keyof Elevation,
): BoxShadow | undefined =>
  Option.getOrUndefined(Arr.head(theme.elevation[level]));

/**
 * The keyboard-focus ring. GPUix has no `outline`, so the ring is a zero-blur
 * shadow spread by the theme's `ring` role and painted outside the border box.
 */
export const focusRing = (theme: Theme): StyleDesc => ({
  boxShadow: {
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    spreadRadius: 2,
    color: theme.colors.ring,
  },
});
