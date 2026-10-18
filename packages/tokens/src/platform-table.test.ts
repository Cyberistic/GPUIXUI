/**
 * Bug guarded: the platform and recipe tables were built from a
 * `PlatformStyle`'s **override record**, but `structure.radius` is partial
 * (plan 389) and `structure.density` may be `{ preset, … }` (plan 534). A style
 * the type contract allows therefore printed `undefined` radius cells and
 * `[object Object]` for its density — and the doc guard compared that wrong
 * string with the document, so a false row could ship green. Plan 535 derives
 * the row from `applyPlatformStyle(getTheme(mode), style)`: the theme a
 * consumer actually gets.
 */

import { describe, expect, it } from "vitest";
import { platformTableCells } from "./platform-table.js";
import { contosoDensityPlatformStyle } from "./platform-extension.example.js";
import {
  getPlatformRecipeTheme,
  platformRecipeNames,
  platformRecipes,
} from "./platform-recipes.js";
import { platformNames, platformStyles } from "./platforms.js";
import { applyPlatformStyle, getPlatformTheme, getTheme } from "./theme.js";
import type { PlatformStyle } from "./platform-types.js";

const cellsOf = (style: PlatformStyle): string => {
  const cells = platformTableCells(style);
  return `${cells.radius.sm} / ${cells.radius.md} / ${cells.radius.lg} / ${cells.radius.xl}`;
};

describe("the documented platform row", () => {
  it("inherits the radii a style does not name", () => {
    const partial: PlatformStyle = {
      ...platformStyles.darwin,
      structure: { radius: { md: 10 } },
    };

    expect(platformTableCells(partial).radius).toEqual({
      ...getTheme("light").radius,
      md: 10,
    });
    expect(cellsOf(partial)).toBe("4 / 10 / 8 / 12");
  });

  it("prints the preset a density override starts from", () => {
    const tuned: PlatformStyle = {
      ...platformStyles.darwin,
      structure: {
        ...platformStyles.darwin.structure,
        density: { preset: "compact", rowHeight: 30 },
      },
    };

    // What the old record read produced in the table.
    expect(String(tuned.structure.density)).toBe("[object Object]");

    expect(platformTableCells(tuned).density).toBe("compact");
    const resolved = applyPlatformStyle(getTheme("light"), tuned);
    expect(resolved.density.name).toBe("compact");
    expect(resolved.density.rowHeight).toBe(30);
  });

  it("resolves the executed platform example", () => {
    expect(platformTableCells(contosoDensityPlatformStyle).density).toBe(
      "compact",
    );
    expect(cellsOf(contosoDensityPlatformStyle)).toBe("4 / 6 / 8 / 12");
  });

  it("inherits an accent the style names in one mode only", () => {
    const lightOnly: PlatformStyle = {
      ...platformStyles.default,
      colors: { light: { primary: "#123456" }, dark: {} },
    };
    const cells = platformTableCells(lightOnly);

    expect(cells.light).toBe("#123456");
    expect(cells.dark).toBe(getTheme("dark").colors.primary);
  });

  it("prints what every shipped style resolves to", () => {
    platformNames.forEach((platform) => {
      const cells = platformTableCells(platformStyles[platform]);
      const light = getPlatformTheme(platform, "light");
      const dark = getPlatformTheme(platform, "dark");

      expect(cells.radius, platform).toEqual(light.radius);
      expect(cells.density, platform).toBe(light.density.name);
      expect(cells.light, platform).toBe(light.colors.primary);
      expect(cells.dark, platform).toBe(dark.colors.primary);
      expect(cells.background, platform).toBe(light.colors.background);
      expect(cells.selected, platform).toBe(light.colors.selected);
    });
    platformRecipeNames.forEach((recipe) => {
      const cells = platformTableCells(platformRecipes[recipe]);
      const light = getPlatformRecipeTheme(recipe, "light");

      expect(cells.radius, recipe).toEqual(light.radius);
      expect(cells.density, recipe).toBe(light.density.name);
      expect(cells.background, recipe).toBe(light.colors.background);
      expect(cells.selected, recipe).toBe(light.colors.selected);
    });
  });
});
