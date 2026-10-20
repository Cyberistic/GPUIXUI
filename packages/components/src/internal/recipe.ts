/**
 * The package's single seam over `@gpuixui/tw`.
 *
 * A component's resting appearance is a Tailwind class string, compiled by
 * `classesToStyle` against the **default** registry — shadcn's fixed metrics
 * (`h-9` = 36, `text-sm` = 14/20) — not the primitives' density scale. The
 * component composes the recipe with its caller's `className` through `cn`
 * (caller last, so it wins conflicts), compiles it here, and merges the
 * caller's `style` after the result. See ADR 0006.
 */

import type { StyleDesc } from "@gpuix/react";
import { classesToStyle } from "@gpuixui/tw";
import type { Theme } from "./theme.js";

/** Compile a class-string recipe to the resting `StyleDesc`. */
export const recipeStyle = (recipe: string, theme: Theme): StyleDesc =>
  classesToStyle(recipe, theme).style;
