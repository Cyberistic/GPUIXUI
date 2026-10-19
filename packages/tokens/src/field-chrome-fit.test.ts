/**
 * Guards the defect plan 624 fixes: `dimensions.fieldMinWidth` is documented as
 * "narrowest field that shows a query and an action", but the metric contract
 * measured only the token-input chip inside it (plan 384). A theme that lowered
 * both minima cleared every rule while a `SearchInput` could not show its own
 * query:
 *
 *   extendTheme(getTheme("light"), {
 *     dimensions: { chipMinWidth: 10, fieldMinWidth: 60 },
 *   });
 *   themeMetricFailures(theme); // [] before the rule
 *
 * The field's content box at 60px is 42px (`60 - 2 * spacing.md - 2 *
 * borderWidth.thin`), while the component paints a 16px leading glyph, an 8px
 * gap, a 14px query glyph, the same gap and a 16px clear control — 62px. The
 * rule now takes the larger of the chip's content box (102px at the shipped
 * metrics) and the query row (78px), so no shipped value or plan-384 case
 * moves.
 */
import { describe, expect, it } from "vitest";
import { themeMetricFailures, type MetricFailure } from "./metrics.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme, type Theme } from "./theme.js";
import { themeFailures } from "./theme-check.js";

const base = getTheme("light");

/** The field width a token-input chip needs, borders and padding included. */
const chipBound = (theme: Theme): number =>
  theme.dimensions.chipMinWidth +
  2 * theme.density.controlPaddingX.md +
  2 * theme.borderWidth.thin;

/** The field width its own query row needs: padding, glyph, gap, query, gap, action. */
const chromeBound = (theme: Theme): number =>
  2 * theme.spacing.md +
  2 * theme.dimensions.fieldAdornmentSize +
  2 * theme.spacing.md +
  theme.typography.body.fontSize;

const fieldFailures = (theme: Theme): ReadonlyArray<MetricFailure> =>
  themeMetricFailures(theme).filter(
    ({ group, member }) => group === "dimensions" && member === "fieldMinWidth",
  );

describe("field query-row fit", () => {
  it("passes every shipped set", () => {
    let tightest = Number.POSITIVE_INFINITY;
    const failures = shippedThemes.flatMap(({ theme }) => {
      const bound = Math.max(chipBound(theme), chromeBound(theme));
      expect(theme.dimensions.fieldMinWidth).toBeGreaterThanOrEqual(bound);
      tightest = Math.min(tightest, theme.dimensions.fieldMinWidth / bound);
      return fieldFailures(theme);
    });
    expect(failures).toEqual([]);
    expect(tightest).toBeCloseTo(200 / 102, 4);
  });

  it("states the two shipped bounds", () => {
    expect(chromeBound(base)).toBe(78);
    expect(chipBound(base)).toBe(102);
    expect(base.dimensions.fieldMinWidth).toBe(200);
  });

  it("reports a field too narrow for its query row once the chip fits", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: { chipMinWidth: 10, fieldMinWidth: 60 },
    });

    expect(fieldFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "fieldMinWidth",
        rule: "at-least",
        actual: 60,
        bound: 78,
      },
    ]);
  });

  it("keeps plan 384's chip diagnostic", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: { fieldMinWidth: 90, chipMinWidth: 80 },
    });

    expect(fieldFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "fieldMinWidth",
        rule: "at-least",
        actual: 90,
        bound: 102,
      },
    ]);
  });

  it("reads the theme's own padding, not a hardcoded 78", () => {
    const roomy = extendTheme(getTheme("light"), {
      dimensions: { chipMinWidth: 10, fieldMinWidth: 100 },
    });
    expect(fieldFailures(roomy)).toEqual([]);

    // `md` moves from 8 to 16 and the steps above it keep the ladder, so the
    // query row's own bound rises from 78 to 110 and 100 no longer fits.
    const tightened = extendTheme(roomy, {
      spacing: {
        md: 16,
        lg: 20,
        xl: 24,
        "2xl": 32,
        "3xl": 40,
        "4xl": 56,
        "5xl": 72,
      },
    });
    expect(fieldFailures(tightened)).toEqual([
      {
        group: "dimensions",
        member: "fieldMinWidth",
        rule: "at-least",
        actual: 100,
        bound: 110,
      },
    ]);
  });

  it("carries the failure through the total check", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: { chipMinWidth: 10, fieldMinWidth: 60 },
    });
    const metrics = themeFailures(theme).filter(
      (failure) => failure.kind === "metric",
    );
    expect(metrics).toContainEqual({
      kind: "metric",
      group: "dimensions",
      member: "fieldMinWidth",
      rule: "at-least",
      actual: 60,
      bound: 78,
    });
  });
});
