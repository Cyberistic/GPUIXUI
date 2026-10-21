/**
 * The package's single seam over `@gpuixui/tw`.
 *
 * A component's resting appearance is a Tailwind class string, compiled by
 * `classesToStyle` against the **default** registry — shadcn's fixed metrics
 * (`h-9` = 36, `text-sm` = 14/20) — not the primitives' density scale. The
 * component composes the recipe with its caller's `className` through `cn`
 * (caller last, so it wins conflicts), compiles it here, and merges the
 * caller's `style` after the result. See ADR 0006.
 *
 * A compile is not free: the class string is expanded, alias-resolved, merged
 * and parsed, which measures ~0.25 ms for a card recipe, so a full repaint of a
 * composite re-parses every part's appearance. The result depends only on the
 * class string and the theme, so it is cached: keyed by the theme object (a
 * `WeakMap`, so a theme's entries die with it) and then by the recipe. The
 * compiled value is frozen because it is shared by every render that asks for
 * it — a part that mutated it would repaint another part's surface.
 *
 * The cache holds every shipped recipe many times over. A recipe past the limit
 * is compiled but not stored, so a caller's dynamic class name cannot grow the
 * cache without bound — it simply pays the compile it paid before.
 */

import type { StyleDesc } from "@gpuix/react";
import { classesToStyle } from "@gpuixui/tw";
import * as MutableHashMap from "effect/MutableHashMap";
import * as Option from "effect/Option";
import type { Theme } from "./theme.js";

/** How many distinct recipes one theme's cache stores. */
const CACHE_LIMIT = 512;

const compiled = new WeakMap<
  Theme,
  MutableHashMap.MutableHashMap<string, StyleDesc>
>();

/** Compile a class-string recipe to the resting `StyleDesc`. */
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
