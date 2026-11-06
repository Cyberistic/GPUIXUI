import type { StyleDesc } from "@gpuix/react";
import type { Theme } from "@gpuixui/tokens";
import * as MutableHashMap from "effect/MutableHashMap";
import * as Option from "effect/Option";
import { classesToStyle } from "./classes.js";

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
