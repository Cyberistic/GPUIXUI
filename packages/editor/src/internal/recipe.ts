/**
 * The package's single seam over `@gpuixui/tw`.
 *
 * A component's resting appearance is a Tailwind class string, compiled by
 * `classesToStyle` against the default registry, then merged with the caller's
 * `className` through `cn` (caller last, so it wins conflicts). State colours
 * and geometry stay in the component's `style`, exactly as the non-editor
 * components do.
 */

import type { StyleDesc } from "@gpuix/react";
import { classesToStyle } from "@gpuixui/tw";
import type { Theme } from "@gpuixui/tokens";

/** Compile a class-string recipe to the resting `StyleDesc`. */
export const recipeStyle = (recipe: string, theme: Theme): StyleDesc =>
  classesToStyle(recipe, theme).style;
