/**
 * The height a tree row paints at.
 *
 * The bug these guard: `TreeRowView` wrote `height ?? theme.density.rowHeight`,
 * and the windowed tree handed the same raw read to its normaliser. A theme a
 * store hands back can lack the density group — JSON writes `null` for a group
 * it never carried, a hand-edited literal drops the key, a saved style from a
 * release that added one restores without it — so the first row a tree painted
 * threw `TypeError: Cannot read properties of undefined (reading 'rowHeight')`.
 * The step now comes from the primitives' density reader, which answers the
 * library's row for that absence (`rowHeightOf({ density: null })`).
 */

import { readFileSync } from "node:fs";
import { darkTheme, defaultDensity, lightTheme } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { treeRowHeight } from "./row.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("the height a tree row paints at", () => {
  it("reads a theme that lost its density group as the library's row", () => {
    // The two shapes a store writes for "no group": `null` from JSON, and the
    // absent key a hand-edited literal leaves.
    expect(treeRowHeight(undefined, { density: null })).toBe(
      defaultDensity.rowHeight,
    );
    expect(treeRowHeight(undefined, {})).toBe(defaultDensity.rowHeight);
    // The library's row is a real height, not the `undefined` the drop would
    // paint: a styled box with no height sizes to its content.
    expect(defaultDensity.rowHeight).toBeGreaterThan(0);
  });

  it("keeps the theme's own step, and the caller's height over it", () => {
    expect(treeRowHeight(undefined, darkTheme)).toBe(
      darkTheme.density.rowHeight,
    );
    expect(treeRowHeight(undefined, lightTheme)).toBe(
      lightTheme.density.rowHeight,
    );
    // A caller's step is what the windowed tree passes down, so it wins.
    expect(treeRowHeight(44, darkTheme)).toBe(44);
  });

  it("resolves both trees through the published density reader", () => {
    // The plain tree paints from `treeRowHeight`; the windowed tree must not
    // keep the raw group read beside it, or a stored theme throws in one tree
    // and not the other.
    const windowed = read("../virtual/tree.tsx");
    expect(windowed).toContain("rowHeightOf(theme)");
    expect(windowed).not.toContain("density.rowHeight");
    expect(read("./row.tsx")).not.toMatch(/theme\.density\.rowHeight/);
  });
});
