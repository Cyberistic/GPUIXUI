/**
 * The height a list row paints at.
 *
 * The bug these guard: `ListItem` wrote `theme.density.rowHeight` (and
 * `theme.density.rowHeight + theme.spacing.md` for the two-line form) straight
 * off the theme. A theme a store hands back can lack the density group — JSON
 * writes `null` for a group it never carried, a hand-edited literal drops the
 * key, and a saved style from a release that added one restores without it — so
 * the first row a list painted threw
 * `TypeError: Cannot read properties of undefined (reading 'rowHeight')`, and a
 * group that lost only the step built a `NaN` height the serialiser drops.
 *
 * The step now comes from the primitives' density and spacing readers, which
 * answer the library's numbers for that absence.
 */

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
    // The two shapes a store writes for "no group": `null` from JSON, and the
    // absent key a hand-edited literal leaves.
    expect(listRowHeight({ density: null }, true)).toBe(
      defaultDensity.rowHeight,
    );
    expect(listRowHeight({}, true)).toBe(defaultDensity.rowHeight);
    // The two-line row adds the library's `md` step to the library's row, not a
    // `NaN` from an addition against a missing scale.
    expect(listRowHeight({ density: null, spacing: null }, false)).toBe(
      defaultDensity.rowHeight + spacing.md,
    );
    // The library's row is a real height, not the `undefined` a dropped style
    // paints: a box with no height sizes to its content.
    expect(defaultDensity.rowHeight).toBeGreaterThan(0);
  });

  it("keeps the theme's own step and the step it adds above it", () => {
    expect(listRowHeight(darkTheme, true)).toBe(darkTheme.density.rowHeight);
    expect(listRowHeight(lightTheme, true)).toBe(lightTheme.density.rowHeight);
    // The shipped densities are the same row for both modes; the two-line row is
    // one `md` step taller, which is what the row's second line sits in.
    expect(listRowHeight(lightTheme, false)).toBe(
      lightTheme.density.rowHeight + lightTheme.spacing.md,
    );
  });

  it("paints both rows through the published seams", () => {
    // The component must not keep the raw group reads beside the helper, or a
    // stored theme throws in the shipped list and not in the guarded one.
    const source = read("../list.tsx");
    expect(source).toContain("listRowHeight(theme, dense)");
    expect(source).not.toMatch(/theme\.density\.rowHeight/);
  });
});
