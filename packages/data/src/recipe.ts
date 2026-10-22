/**
 * One compile per recipe per theme.
 *
 * A table repaints its header and every visible cell on a sort, a selection or
 * a filter, and a compile is the expensive half of that paint (expanding,
 * alias-resolving, merging and parsing a class string measures ~0.25 ms). The
 * compiled value depends only on the class string and the theme, so it is
 * cached: keyed by the theme object (a `WeakMap`, so entries die with it) and
 * then by the recipe, and frozen because every later render shares it.
 *
 * `@gpuixui/components` carries the same seam privately. It is not importable
 * without widening that package's public surface, so this is a deliberate
 * second copy; `TODO.md` tracks hoisting the seam into `@gpuixui/tw`.
 */

import type { StyleDesc } from "@gpuix/react";
import { classesToStyle } from "@gpuixui/tw";
import * as MutableHashMap from "effect/MutableHashMap";
import * as Option from "effect/Option";
import type { Theme } from "./theme.js";

/** How many distinct recipes one theme's cache stores. */
const CACHE_LIMIT = 256;

const compiled = new WeakMap<
  Theme,
  MutableHashMap.MutableHashMap<string, StyleDesc>
>();

/** Compile a class-string recipe to its resting `StyleDesc`. */
export const recipeStyle = (recipe: string, theme: Theme): StyleDesc => {
  const byRecipe = compiled.get(theme);
  if (byRecipe !== undefined) {
    const hit = MutableHashMap.get(byRecipe, recipe);
    if (Option.isSome(hit)) return hit.value;
  }
  const style = Object.freeze(classesToStyle(recipe, theme).style);
  if (byRecipe === undefined) {
    compiled.set(theme, MutableHashMap.make([recipe, style]));
  } else if (MutableHashMap.size(byRecipe) < CACHE_LIMIT) {
    MutableHashMap.set(byRecipe, recipe, style);
  }
  return style;
};
