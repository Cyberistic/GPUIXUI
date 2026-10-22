/**
 * The dock's resting appearance, as Tailwind class strings.
 *
 * They compile against `@gpuixui/tw`'s default registry — shadcn's fixed
 * metrics — the same seam the data and component packages use. Geometry the
 * runtime exposes as behaviour (a divider's axis, a pane's measured size) is
 * set in `style`, not in a class: a divider's width or height is data, and the
 * divider's `col-resize`/`row-resize` cursor lives only in `style`.
 */

import type { StyleDesc } from "@gpuix/react";
import { classesToStyle } from "@gpuixui/tw";
import * as MutableHashMap from "effect/MutableHashMap";
import * as Option from "effect/Option";
import type { Theme } from "./theme.js";

/** The group's flex container; the axis is the caller's `flexDirection`. */
export const PANEL_ROOT = "flex min-h-0 min-w-0";

/** One pane: clipped, so a scroller inside it owns the overflow. */
export const PANE = "min-h-0 min-w-0 overflow-hidden";

/**
 * The divider's resting fill and its hover wash.
 *
 * It paints a fill at rest because GPUI's hit test stops at the first painted
 * child: a transparent strip never receives the press. The hover wash is the
 * `primary` role the table's column divider also uses, so a resize affordance
 * reads the same across the library.
 */
export const DIVIDER = "bg-border hover:bg-primary";

/** The dock's root box. */
export const DOCK_ROOT = "flex min-h-0 min-w-0";

/** One dock pane, clipped like a panel pane. */
export const DOCK_PANE = "min-h-0 min-w-0 overflow-hidden";

/** How many distinct recipes one theme's cache stores. */
const CACHE_LIMIT = 256;

const compiled = new WeakMap<
  Theme,
  MutableHashMap.MutableHashMap<string, StyleDesc>
>();

/** Compile a class-string recipe to its resting `StyleDesc`, once per theme. */
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

/**
 * Shallow-merge a caller's override over a defined base.
 *
 * The dock composes styles field by field (geometry over a recipe, a ring over
 * a divider), never replacing a nested state object, so a shallow merge is
 * exactly the semantics the parts need — and the base is always defined, which
 * keeps the result a `StyleDesc` rather than the runtime's `| undefined`.
 */
export const mergeStyle = (
  base: StyleDesc,
  override: StyleDesc | undefined,
): StyleDesc => (override === undefined ? base : { ...base, ...override });
