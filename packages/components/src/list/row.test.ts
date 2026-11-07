import { readFileSync } from "node:fs";
import {
  darkTheme,
  defaultDensity,
  lightTheme,
  spacing,
} from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { listRowHeight } from "../list.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("the height a list row paints at", () => {
  it("reads a theme that lost its density group as the library's row", () => {
    expect(listRowHeight({ density: null }, true)).toBe(
      defaultDensity.rowHeight,
    );
    expect(listRowHeight({}, true)).toBe(defaultDensity.rowHeight);

    expect(listRowHeight({ density: null, spacing: null }, false)).toBe(
      defaultDensity.rowHeight + spacing.md,
    );

    expect(defaultDensity.rowHeight).toBeGreaterThan(0);
  });

  it("keeps the theme's own step and the step it adds above it", () => {
    expect(listRowHeight(darkTheme, true)).toBe(darkTheme.density.rowHeight);
    expect(listRowHeight(lightTheme, true)).toBe(lightTheme.density.rowHeight);

    expect(listRowHeight(lightTheme, false)).toBe(
      lightTheme.density.rowHeight + lightTheme.spacing.md,
    );
  });

  it("paints both rows through the published seams", () => {
    const source = read("../list.tsx");
    expect(source).toContain("listRowHeight(theme, dense)");
    expect(source).not.toMatch(/theme\.density\.rowHeight/);
  });
});
