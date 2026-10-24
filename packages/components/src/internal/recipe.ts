/**
 * The package's single seam over `@gpuixui/tw`.
 *
 * A component's resting appearance is a Tailwind class string, compiled by
 * `classesToStyle` against the **default** registry: shadcn's fixed metrics
 * (`rounded-lg` = 8, `text-sm` = 14/20), while `h-8`/`h-9`/`h-10` and `size-*`
 * read the theme's density, so `h-9` is `md` (32 in the default theme) and a
 * control's box follows the active density. The component composes the recipe
 * with its caller's `className` through `cn` (caller last, so it wins
 * conflicts), compiles it here, and merges the caller's `style` after the
 * result. See ADR 0006.
 *
 * The compile cache is the compiler's (`createRecipeCache`): one cache per
 * theme and recipe, shared with `@gpuixui/data`, so a repaint does not re-parse
 * each part's appearance and a fix to the cap reaches both painters.
 */

import type { StyleDesc } from "@gpuix/react";
import { createRecipeCache } from "@gpuixui/tw";
import type { Theme } from "./theme.js";

/** Compile a class-string recipe to the resting `StyleDesc`. */
export const recipeStyle: (recipe: string, theme: Theme) => StyleDesc =
  createRecipeCache(512);
