import type { StyleDesc } from "@gpuix/react";
import { classesToStyle } from "@gpuixui/tw";
import * as MutableHashMap from "effect/MutableHashMap";
import * as Option from "effect/Option";
import type { Theme } from "./theme.js";

const CACHE_LIMIT = 256;

const compiled = new WeakMap<
  Theme,
  MutableHashMap.MutableHashMap<string, StyleDesc>
>();

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
