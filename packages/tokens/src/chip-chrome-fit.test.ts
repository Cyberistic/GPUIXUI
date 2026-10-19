/**
 * The regression this suite guards: `dimensions.chipMinWidth` was only
 * positive, so a theme could shrink the token-input chip below the chrome it
 * paints and pass every check.
 *
 * `TagInputChip` paints its minimum as an outer `minWidth` and spends that
 * width on two `spacing.sm` insets, one `caption` label, the `spacing.xs` gap
 * and a `fieldAdornmentSize` remove control. Plan 384 declined to count the
 * chip's own half because it read `chipMinWidth` as a *content* width and said
 * the theme ships no chip-padding token; the padding is `spacing.sm`, and the
 * component paints the value as an outer width, so this theme:
 *
 *   extendTheme(getTheme("light"), {
 *     dimensions: { chipMinWidth: 10, fieldMinWidth: 100 },
 *   });
 *
 * returned `[]` from `themeMetricFailures` and `themeFailures` while the chip's
 * content box was `10 − 2 × 6 = −2px`. The `field-chrome-fit` suite could not
 * see it: it measures the field the chip sits in, not the chip itself.
 *
 * The rule reads the theme's own spacing, caption size and adornment square, so
 * a brand that widens any of them widens the bound with it. Every shipped set
 * ships 80px against the 44px identity bound, so no value moves.
 */

import { describe, expect, it } from "vitest";
import { themeMetricFailures, type MetricFailure } from "./metrics.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme, type Theme } from "./theme.js";
import { themeFailures } from "./theme-check.js";

const base = getTheme("light");

/** The width a chip needs for its own insets, label, gap and remove control. */
const chipBound = (theme: Theme): number =>
  2 * theme.spacing.sm +
  theme.spacing.xs +
  theme.typography.caption.fontSize +
  theme.dimensions.fieldAdornmentSize;

const chipFailures = (theme: Theme): ReadonlyArray<MetricFailure> =>
  themeMetricFailures(theme).filter(
    ({ group, member }) => group === "dimensions" && member === "chipMinWidth",
  );

describe("token-input chip chrome fit", () => {
  it("passes every shipped set at the tightest ratio", () => {
    let tightest = Number.POSITIVE_INFINITY;
    const failures = shippedThemes.flatMap(({ theme }) => {
      const bound = chipBound(theme);
      expect(theme.dimensions.chipMinWidth, theme.name).toBeGreaterThanOrEqual(
        bound,
      );
      tightest = Math.min(tightest, theme.dimensions.chipMinWidth / bound);
      return chipFailures(theme);
    });

    expect(failures).toEqual([]);
    expect(tightest).toBeCloseTo(80 / 44, 4);
  });

  it("states the shipped pair the documents quote", () => {
    expect(base.dimensions.chipMinWidth).toBe(80);
    expect(chipBound(base)).toBe(44);
    expect(chipFailures(base)).toEqual([]);
  });

  it("reports a chip narrower than its own chrome", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: { chipMinWidth: 10, fieldMinWidth: 100 },
    });

    expect(chipFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "chipMinWidth",
        rule: "at-least",
        actual: 10,
        bound: 44,
      },
    ]);
    // Plan 624's field bound still passes, so this is the chip's diagnostic.
    expect(
      themeMetricFailures(theme).filter(
        ({ member }) => member === "fieldMinWidth",
      ),
    ).toEqual([]);
  });

  it("reads the theme's own spacing, type and adornment", () => {
    const roomier = extendTheme(getTheme("light"), {
      spacing: {
        xs: 4,
        sm: 10,
        md: 12,
        lg: 16,
        xl: 20,
        "2xl": 28,
        "3xl": 36,
        "4xl": 52,
        "5xl": 68,
      },
      dimensions: { chipMinWidth: 50, fieldMinWidth: 100 },
    });

    expect(chipBound(roomier)).toBe(52);
    expect(chipFailures(roomier)).toEqual([
      {
        group: "dimensions",
        member: "chipMinWidth",
        rule: "at-least",
        actual: 50,
        bound: 52,
      },
    ]);

    const corrected = extendTheme(roomier, {
      dimensions: { chipMinWidth: 52 },
    });
    expect(chipFailures(corrected)).toEqual([]);
  });

  it("carries the failure through the total check", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: { chipMinWidth: 10, fieldMinWidth: 100 },
    });

    expect(
      themeFailures(theme).filter(({ kind }) => kind === "metric"),
    ).toContainEqual({
      kind: "metric",
      group: "dimensions",
      member: "chipMinWidth",
      rule: "at-least",
      actual: 10,
      bound: 44,
    });
  });
});
