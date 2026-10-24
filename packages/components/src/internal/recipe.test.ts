/**
 * The package's seam over the compiler's recipe cache.
 *
 * The cache itself is `@gpuixui/tw`'s (`recipe-cache.test.ts` holds the hit,
 * the per-theme key, the cap and the freeze). What this file guards is that the
 * package still paints through that shared cache and hands the caller's recipe
 * and theme straight through: the same class string and theme answer the same
 * immutable style, and another theme is another entry.
 */

import { createTheme } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { recipeStyle } from "./recipe.js";

describe("recipeStyle", () => {
  it("serves the same style to the next render, frozen for sharing", () => {
    const dark = createTheme({ mode: "dark" });
    const first = recipeStyle("px-4 py-3 rounded-lg border", dark);

    expect(recipeStyle("px-4 py-3 rounded-lg border", dark)).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it("keys by theme, so two themes do not share an entry", () => {
    const recipe = "px-4 py-3 rounded-lg border";

    expect(recipeStyle(recipe, createTheme({ mode: "dark" }))).not.toBe(
      recipeStyle(recipe, createTheme({ mode: "light" })),
    );
  });
});
