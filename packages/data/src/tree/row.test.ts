import { readFileSync } from "node:fs";
import { darkTheme, defaultDensity, lightTheme } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { treeRowHeight } from "./row.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("the height a tree row paints at", () => {
  it("reads a theme that lost its density group as the library's row", () => {
    expect(treeRowHeight(undefined, { density: null })).toBe(
      defaultDensity.rowHeight,
    );
    expect(treeRowHeight(undefined, {})).toBe(defaultDensity.rowHeight);

    expect(defaultDensity.rowHeight).toBeGreaterThan(0);
  });

  it("keeps the theme's own step, and the caller's height over it", () => {
    expect(treeRowHeight(undefined, darkTheme)).toBe(
      darkTheme.density.rowHeight,
    );
    expect(treeRowHeight(undefined, lightTheme)).toBe(
      lightTheme.density.rowHeight,
    );

    expect(treeRowHeight(44, darkTheme)).toBe(44);
  });

  it("resolves both trees through the published density reader", () => {
    const windowed = read("../virtual/tree.tsx");
    expect(windowed).toContain("rowHeightOf(theme)");
    expect(windowed).not.toContain("density.rowHeight");
    expect(read("./row.tsx")).not.toMatch(/theme\.density\.rowHeight/);
  });
});
