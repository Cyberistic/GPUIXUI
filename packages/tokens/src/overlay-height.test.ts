/**
 * Guards the defect plan 365 fixes: `overlayMaxHeight` is documented as the
 * height at which a long overlay list starts to scroll, but the numeric contract
 * only checked that it was positive.
 *
 * A theme that set it to `20` while `density.rowHeight` is `32` returned `[]`,
 * and every menu, select and combobox list using the token would scroll in a
 * viewport shorter than one of its rows — the first option clipped and no
 * complete option ever shown. The bound is the active density's row, not a fixed
 * number: a list item is a row, and a denser theme lowers the floor.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import { themeMetricFailures } from "./metrics.js";
import { extendTheme, lightTheme, type Theme } from "./theme.js";

/** Every shipped set: identity, platform variant and recipe. */
const shipped: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

describe("overlay scroll height", () => {
  it("reports a viewport shorter than one row", () => {
    expect(
      themeMetricFailures(
        extendTheme(lightTheme, {
          dimensions: { overlayMaxHeight: 20 },
        }),
      ),
    ).toEqual([
      {
        group: "dimensions",
        member: "overlayMaxHeight",
        rule: "at-least",
        actual: 20,
        bound: 32,
      },
    ]);
  });

  it("passes exactly one row", () => {
    expect(
      themeMetricFailures(
        extendTheme(lightTheme, {
          dimensions: { overlayMaxHeight: 32 },
        }),
      ),
    ).toEqual([]);
  });

  it("lowers the bound with a denser row", () => {
    // Compact rows are 28px, so 30 shows one complete row even though the
    // comfortable theme's bound is 32.
    expect(
      themeMetricFailures(
        extendTheme(lightTheme, {
          density: "compact",
          dimensions: { overlayMaxHeight: 30 },
        }),
      ),
    ).toEqual([]);
  });

  it("passes every shipped set, whose height fits its row", () => {
    shipped.forEach(([label, theme]) => {
      expect(themeMetricFailures(theme), label).toEqual([]);
      expect(theme.dimensions.overlayMaxHeight, label).toBeGreaterThanOrEqual(
        theme.density.rowHeight,
      );
    });
  });
});
