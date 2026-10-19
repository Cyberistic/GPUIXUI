/**
 * Guards the defect plan 596 fixes: a control paints the icon tier that matches
 * its own size, but `themeMetricFailures` held only the default glyph against
 * the smallest control (plan 384). `IconButton` maps `sm`/`md`/`lg` to the same
 * `iconSize` tier, and a slider's thumb is `iconSize[size]` tall inside a
 * `controlHeight[size]` track, so a theme that raised only the large tier —
 * `iconSize: { lg: 48, xl: 48 }` — returned `[]` from all nine checks while a
 * 48px glyph was painted in a 36px large control (a 34px content box).
 *
 * Case 1 fails without the matching-tier rule, case 2 proves the older
 * default-glyph rule is unchanged, case 3 isolates the fit rule from the control
 * ladder, and case 4 holds every shipped set to its own pair.
 */
import { describe, expect, it } from "vitest";
import { themeMetricFailures } from "./metrics.js";
import { controlSizes } from "./scale.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, lightTheme } from "./theme.js";

describe("control glyph fit", () => {
  it("reports a large icon that overflows its control", () => {
    const plant = extendTheme(lightTheme, { iconSize: { lg: 48, xl: 48 } });

    expect(themeMetricFailures(plant)).toEqual([
      {
        group: "density",
        member: "controlHeight.lg",
        rule: "at-least",
        actual: lightTheme.density.controlHeight.lg,
        bound: 50,
      },
    ]);
  });

  it("keeps the default-glyph rule on the smallest control", () => {
    const plant = extendTheme(lightTheme, {
      density: { controlHeight: { sm: 24 } },
      iconSize: { md: 23, lg: 24, xl: 25 },
    });

    expect(themeMetricFailures(plant)).toEqual([
      {
        group: "density",
        member: "controlHeight.sm",
        rule: "at-least",
        actual: 24,
        bound: 25,
      },
    ]);
  });

  it("separates the fit failure from the control ladder", () => {
    const plant = extendTheme(lightTheme, {
      density: { controlHeight: { lg: 24 } },
      iconSize: { lg: 24, xl: 24 },
    });

    expect(themeMetricFailures(plant)).toContainEqual({
      group: "density",
      member: "controlHeight.lg",
      rule: "at-least",
      actual: 24,
      bound: 26,
    });
  });

  it("passes every shipped set's matching pair", () => {
    shippedThemes.forEach(({ theme }) => {
      controlSizes.forEach((size) => {
        expect(
          theme.density.controlHeight[size],
          `${theme.name} ${size}`,
        ).toBeGreaterThanOrEqual(
          theme.iconSize[size] + 2 * theme.borderWidth.thin,
        );
      });
      expect(themeMetricFailures(theme), theme.name).toEqual([]);
    });
  });
});
