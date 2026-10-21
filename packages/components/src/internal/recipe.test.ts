/**
 * The resting-appearance cache, without a renderer.
 *
 * The bug these guard: a repaint re-parsed every part's class string, which
 * measures ~0.25 ms for one recipe and runs 154 times across the package's
 * parts. The seam must compile a recipe once per theme and hand the same
 * immutable style to every later render, while a caller's dynamic class name
 * cannot grow the cache without bound.
 */

import { createTheme } from "@gpuixui/tokens";
import { classesToStyle } from "@gpuixui/tw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recipeStyle } from "./recipe.js";

vi.mock("@gpuixui/tw", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpuixui/tw")>();
  return { ...actual, classesToStyle: vi.fn(actual.classesToStyle) };
});

const compile = vi.mocked(classesToStyle);

/** A fresh theme object, so each case gets its own cache entries. */
const theme = () => createTheme({ mode: "dark" });

beforeEach(() => {
  compile.mockClear();
});

describe("recipeStyle", () => {
  it("compiles a recipe once and serves the same style to the next render", () => {
    const dark = theme();
    const recipe = "px-4 py-3 rounded-lg border";

    const first = recipeStyle(recipe, dark);
    const second = recipeStyle(recipe, dark);

    expect(compile).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it("caches per theme, so two themes compile the same recipe twice", () => {
    const recipe = "px-4 py-3 rounded-lg border";
    const dark = theme();
    const light = createTheme({ mode: "light" });

    const darkStyle = recipeStyle(recipe, dark);
    const lightStyle = recipeStyle(recipe, light);

    expect(compile).toHaveBeenCalledTimes(2);
    expect(lightStyle).not.toBe(darkStyle);
    // Returning to the first theme is still a cache hit.
    expect(recipeStyle(recipe, dark)).toBe(darkStyle);
    expect(compile).toHaveBeenCalledTimes(2);
  });

  it("keeps one entry per recipe", () => {
    const dark = theme();

    recipeStyle("px-4", dark);
    recipeStyle("py-3", dark);

    expect(compile).toHaveBeenCalledTimes(2);
  });

  it("hands out a frozen style, because every render shares it", () => {
    expect(Object.isFrozen(recipeStyle("px-4", theme()))).toBe(true);
  });

  it("stops storing past the limit, so a dynamic recipe cannot grow it", () => {
    const dark = theme();
    // The cache holds 512 recipes; fill it, then ask for one more twice.
    const recipes = Array.from({ length: 512 }, (_, index) => `p-${index}`);

    recipes.forEach((recipe) => recipeStyle(recipe, dark));
    const stored = compile.mock.calls.length;

    recipeStyle("p-512", dark);
    expect(compile).toHaveBeenCalledTimes(stored + 1);
    // The overflow recipe was not stored, so it compiles again rather than
    // silently evicting a shipped recipe.
    recipeStyle("p-512", dark);
    expect(compile).toHaveBeenCalledTimes(stored + 2);
    // A stored recipe is still a hit.
    recipeStyle("p-0", dark);
    expect(compile).toHaveBeenCalledTimes(stored + 2);
  });
});
