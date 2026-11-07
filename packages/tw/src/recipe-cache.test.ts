import { darkTheme, lightTheme } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { createRecipeCache } from "./recipe-cache.js";

describe("a recipe compile cache", () => {
  it("answers the same object for the same recipe and theme", () => {
    const compile = createRecipeCache(8);
    const first = compile("p-4 bg-card", lightTheme);

    expect(compile("p-4 bg-card", lightTheme)).toBe(first);
  });

  it("recompiles for another theme", () => {
    const compile = createRecipeCache(8);

    expect(compile("bg-card", lightTheme)).not.toBe(
      compile("bg-card", darkTheme),
    );
  });

  it("answers a recipe it could not store rather than refusing it", () => {
    const compile = createRecipeCache(1);

    expect(compile("p-4", lightTheme)).toEqual(compile("p-4", lightTheme));
    expect(compile("p-8", lightTheme)).toEqual(compile("p-8", lightTheme));
  });

  it("freezes what it shares", () => {
    const compile = createRecipeCache(4);

    expect(Object.isFrozen(compile("rounded-lg", lightTheme))).toBe(true);
  });
});
