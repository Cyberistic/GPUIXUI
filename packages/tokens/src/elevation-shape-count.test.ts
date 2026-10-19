/**
 * Guards the defect plan 642 fixes: `themeMetricFailures` validated every shape
 * in an elevation level and required `sm`/`md`/`lg` to hold at least one, but
 * never reported a level holding a second shape. The native runtime paints one
 * shadow per element and `elevationShadow` reads the first entry, so a copied
 * theme with `elevation: { md: [a, b] }` returned `[]` from every check while
 * it painted `a` and silently discarded `b`. Every level, the reserved
 * `overlay` included, is now held to `at-most 1` shape; a single-shape level
 * and the shipped sets are unchanged.
 */

import { describe, expect, it } from "vitest";
import { elevationLevels, type ElevationShape } from "./elevation.js";
import {
  elevationShadow,
  extendTheme,
  getTheme,
  shippedThemes,
  themeFailures,
  themeMetricFailures,
  type Theme,
} from "./index.js";

const shape = (offsetY: number, blurRadius: number): ElevationShape => ({
  offsetX: 0,
  offsetY,
  blurRadius,
  spreadRadius: 0,
  alpha: 0.12,
});

const elevationFailures = (theme: Theme) =>
  themeMetricFailures(theme).filter((failure) => failure.group === "elevation");

describe("an elevation level holds one shape", () => {
  it("reports the second md shape the runtime never paints", () => {
    const theme = extendTheme(getTheme("light"), {
      elevation: { md: [shape(4, 12), shape(8, 24)] },
    });

    expect(elevationFailures(theme)).toEqual([
      {
        group: "elevation",
        member: "md",
        rule: "at-most",
        actual: 2,
        bound: 1,
      },
    ]);
  });

  it("names the shape that is painted", () => {
    const theme = extendTheme(getTheme("light"), {
      elevation: { md: [shape(4, 12), shape(8, 24)] },
    });

    expect(elevationShadow(theme, "md")?.offsetY).toBe(4);
    expect(elevationShadow(theme, "md")?.blurRadius).toBe(12);
  });

  it("holds the reserved overlay when a theme defines two entries", () => {
    const theme = extendTheme(getTheme("light"), {
      elevation: { overlay: [shape(24, 56), shape(28, 64)] },
    });

    expect(elevationFailures(theme)).toEqual([
      {
        group: "elevation",
        member: "overlay",
        rule: "at-most",
        actual: 2,
        bound: 1,
      },
    ]);
    expect(elevationShadow(theme, "overlay")?.offsetY).toBe(24);
  });

  it("keeps a single-shape level clean", () => {
    const theme = extendTheme(getTheme("light"), {
      elevation: { md: [shape(4, 12)] },
    });

    expect(elevationFailures(theme)).toEqual([]);
    expect(themeFailures(theme)).toEqual([]);
  });

  it("keeps an empty level's only diagnostic its at-least count", () => {
    const theme = extendTheme(getTheme("light"), {
      elevation: { sm: [] },
    });

    expect(elevationFailures(theme)).toEqual([
      {
        group: "elevation",
        member: "sm",
        rule: "at-least",
        actual: 0,
        bound: 1,
      },
    ]);
  });

  it("reports the whole count, not merely more-than-one", () => {
    const theme = extendTheme(getTheme("light"), {
      elevation: { lg: [shape(16, 40), shape(18, 44), shape(20, 48)] },
    });

    expect(elevationFailures(theme)).toEqual([
      {
        group: "elevation",
        member: "lg",
        rule: "at-most",
        actual: 3,
        bound: 1,
      },
    ]);
  });

  it("counts a duplicated shape too", () => {
    const theme = extendTheme(getTheme("light"), {
      elevation: { sm: [shape(1, 2), shape(1, 2)] },
    });

    expect(elevationFailures(theme)).toEqual([
      {
        group: "elevation",
        member: "sm",
        rule: "at-most",
        actual: 2,
        bound: 1,
      },
    ]);
  });

  it("carries the count through the total check", () => {
    const theme = extendTheme(getTheme("light"), {
      elevation: { md: [shape(4, 12), shape(8, 24)] },
    });

    expect(
      themeFailures(theme).filter((failure) => failure.kind === "metric"),
    ).toEqual([
      {
        kind: "metric",
        group: "elevation",
        member: "md",
        rule: "at-most",
        actual: 2,
        bound: 1,
      },
    ]);
  });

  it("keeps every shipped level at one shape or none", () => {
    shippedThemes.forEach(({ theme }) => {
      elevationLevels.forEach((level) => {
        expect(theme.elevation[level].length).toBeLessThanOrEqual(1);
      });
      expect(themeMetricFailures(theme)).toEqual([]);
    });
  });
});
