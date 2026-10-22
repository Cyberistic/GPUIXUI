/**
 * The package's single seam over `@gpuixui/tw` and `@gpuixui/tokens`.
 *
 * A component's resting appearance is a Tailwind class string compiled through
 * `@gpuixui/tw` against the theme the caller provided; the caller's `className`
 * is joined after the recipe and its `style` is merged last, so it wins. The
 * colours, spacing and radii every component paints are `@gpuixui/tokens` roles,
 * never a literal.
 */

import type { StyleDesc } from "@gpuix/react";
import { classesToStyle } from "@gpuixui/tw";
import type { Theme } from "@gpuixui/tokens";

export { ThemeProvider, useTheme } from "@gpuixui/tokens/react";
export type { Theme } from "@gpuixui/tokens";

/** Compile a Tailwind class recipe to the resting `StyleDesc`. */
export const recipeStyle = (recipe: string, theme: Theme): StyleDesc =>
  classesToStyle(recipe, theme).style;
