/**
 * Guards the elevation hole plan 369 fixes: the numeric contract's elevation
 * rule walked `sm`, `md` and `lg` only and exempted `overlay` as "reserved and
 * empty". The shipped data is empty, but the type is not: `ElevationLevel`
 * includes `"overlay"`, `extendTheme` replaces a level's array, and
 * `elevationShadow(theme, "overlay")` paints the first entry. A defined overlay
 * entry with `offsetX: NaN` and `alpha: 2` therefore returned `[]` from both
 * checkers while the renderer received a shadow it cannot paint (`NaN` geometry)
 * with an opaque tint (`alpha()` clamps the fraction).
 *
 * Every case below fails without the four-level loop in `metrics.ts`.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import { themeContrastFailures } from "./contrast.js";
import { elevationShadow, type ElevationShape } from "./elevation.js";
import { themeMetricFailures } from "./metrics.js";
import { extendTheme, lightTheme, type Theme } from "./theme.js";

/** A complete level, so one field varies at a time. The feather clears `lg`. */
const shape: ElevationShape = {
  offsetX: 0,
  offsetY: 4,
  blurRadius: 48,
  spreadRadius: 0,
  alpha: 0.12,
};

/** A theme with a defined overlay level. */
const withOverlay = (overlays: ReadonlyArray<ElevationShape>) =>
  extendTheme(lightTheme, { elevation: { overlay: [...overlays] } });

/** Every shipped set: identity, platform variant and recipe, in both modes. */
const shipped: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

describe("a defined overlay elevation level", () => {
  it("reports a non-finite offset before the renderer sees it", () => {
    const broken = withOverlay([{ ...shape, offsetX: Number.NaN }]);
    expect(themeMetricFailures(broken)).toEqual([
      {
        group: "elevation",
        member: "overlay[0].offsetX",
        rule: "finite",
        actual: Number.NaN,
        bound: 0,
      },
    ]);
    expect(themeContrastFailures(broken)).toEqual([]);
  });

  it("reports an alpha the fraction rule cannot carry", () => {
    expect(themeMetricFailures(withOverlay([{ ...shape, alpha: 2 }]))).toEqual([
      {
        group: "elevation",
        member: "overlay[0].alpha",
        rule: "within",
        actual: 2,
        bound: 1,
      },
    ]);
  });

  it("reports a negative blur without folding it into the finite rule", () => {
    expect(
      themeMetricFailures(withOverlay([{ ...shape, blurRadius: -1 }])),
    ).toEqual([
      {
        group: "elevation",
        member: "overlay[0].blurRadius",
        rule: "non-negative",
        actual: -1,
        bound: 0,
      },
    ]);
  });

  it("accepts a defined level that is paint", () => {
    expect(themeMetricFailures(withOverlay([shape]))).toEqual([]);
  });

  it("keeps an empty overlay exempt", () => {
    expect(themeMetricFailures(withOverlay([]))).toEqual([]);
    shipped.forEach(([label, theme]) => {
      expect(themeMetricFailures(theme), label).toEqual([]);
    });
  });

  it("guards a path elevationShadow actually paints", () => {
    const shadow = elevationShadow(
      withOverlay([{ ...shape, offsetX: Number.NaN }]),
      "overlay",
    );
    expect(shadow?.offsetX).toBeNaN();
    expect(shadow?.offsetY).toBe(shape.offsetY);
  });

  it("still governs the three designed levels", () => {
    (["sm", "md", "lg"] as const).forEach((level) => {
      const [own] = lightTheme.elevation[level];
      expect(own, level).toBeDefined();
      if (own === undefined) {
        return;
      }
      const broken = extendTheme(lightTheme, {
        elevation: { [level]: [{ ...own, offsetX: Number.NaN }] },
      });
      expect(themeMetricFailures(broken)).toEqual([
        {
          group: "elevation",
          member: `${level}[0].offsetX`,
          rule: "finite",
          actual: Number.NaN,
          bound: 0,
        },
      ]);
    });
  });
});
