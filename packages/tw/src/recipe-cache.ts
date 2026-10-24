/**
 * One compile per recipe per theme.
 *
 * A compile is the expensive half of a paint: the class string is expanded,
 * alias-resolved, merged and parsed, which measures ~0.25 ms for a card recipe,
 * so a composite that repaints every part would re-parse each appearance. The
 * result depends only on the class string and the theme, so it is cached: keyed
 * by the theme object (a `WeakMap`, so a theme's entries die with it) and then
 * by the recipe, and frozen because every later render shares it.
 *
 * The compiler owns this seam because both consumers measure it: the components
 * paint every part through it and a data grid cannot pay a compile per cell.
 * `limit` bounds one theme's entries — a recipe past it is compiled but not
 * stored, so a caller's dynamic class name cannot grow the cache without bound.
 */

import type { StyleDesc } from "@gpuix/react";
import type { Theme } from "@gpuixui/tokens";
import * as MutableHashMap from "effect/MutableHashMap";
import * as Option from "effect/Option";
import { classesToStyle } from "./classes.js";

/** Build a cache that compiles a class-string recipe at most once per theme. */
export const createRecipeCache = (
  limit: number,
): ((recipe: string, theme: Theme) => StyleDesc) => {
  const compiled = new WeakMap<
    Theme,
    MutableHashMap.MutableHashMap<string, StyleDesc>
  >();

  return (recipe, theme) => {
    const byRecipe = compiled.get(theme);
    if (byRecipe !== undefined) {
      const hit = MutableHashMap.get(byRecipe, recipe);
      if (Option.isSome(hit)) return hit.value;
    }

    const style = Object.freeze(classesToStyle(recipe, theme).style);
    if (byRecipe === undefined) {
      compiled.set(theme, MutableHashMap.make([recipe, style]));
    } else if (MutableHashMap.size(byRecipe) < limit) {
      MutableHashMap.set(byRecipe, recipe, style);
    }
    return style;
  };
};
