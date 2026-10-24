/**
 * The data package's seam over the compiler's recipe cache.
 *
 * A table repaints its header and every visible cell on a sort, a selection or
 * a filter, and a compile is the expensive half of that paint. The cache is
 * `@gpuixui/tw`'s one seam (`createRecipeCache`), shared with the components
 * package, so the two painters cannot drift and a data grid does not need a
 * second copy of the rule.
 */

import type { StyleDesc } from "@gpuix/react";
import { createRecipeCache } from "@gpuixui/tw";
import type { Theme } from "./theme.js";

/** Compile a class-string recipe to its resting `StyleDesc`. */
export const recipeStyle: (recipe: string, theme: Theme) => StyleDesc =
  createRecipeCache(256);
