/**
 * Guards two defects. Plan 624: `dimensions.fieldMinWidth` is documented as
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
 *
 * Plan 634: the query row's leading glyph is `<Icon size="md" />`, which
 * resolves through `iconSize.md`, while the rule charged `fieldAdornmentSize`
 * for both it and the trailing clear control. The shipped tiers are both 16,
 * so 78 hid the gap; a theme that lifted the icon tier to 20 returned `[]`
 * while the row needed 82 and the field clipped its own magnifier.
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

/** The field width its own query row needs: padding, icon, gap, query, gap, action. */
const chromeBound = (theme: Theme): number =>
  2 * theme.spacing.md +
  theme.iconSize.md +
  2 * theme.spacing.md +
  theme.typography.body.fontSize +
  theme.dimensions.fieldAdornmentSize;

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

  it("states the two shipped bounds and the tier that keeps them equal", () => {
    expect(chromeBound(base)).toBe(78);
    expect(chipBound(base)).toBe(102);
    expect(base.dimensions.fieldMinWidth).toBe(200);
    // The lead is `iconSize.md` and the action `fieldAdornmentSize`; at the
    // shipped identity both are 16, which is why the 634 correction moves no
    // shipped value.
    expect(base.iconSize.md).toBe(16);
    expect(base.dimensions.fieldAdornmentSize).toBe(16);
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

  it("reads the icon tier the query row paints", () => {
    // `SearchInput`'s magnifier is `<Icon size="md" />`, so lifting the tier
    // widens the row even though the trailing adornment keeps its size. The
    // chip is lowered so only the query row decides the result.
    const lifted = extendTheme(getTheme("light"), {
      iconSize: { xs: 12, sm: 14, md: 20, lg: 24, xl: 28 },
      dimensions: { chipMinWidth: 10, fieldMinWidth: 81 },
    });
    expect(chipBound(lifted)).toBe(32);
    expect(chromeBound(lifted)).toBe(82);
    expect(fieldFailures(lifted)).toEqual([
      {
        group: "dimensions",
        member: "fieldMinWidth",
        rule: "at-least",
        actual: 81,
        bound: 82,
      },
    ]);
  });

  it("accepts the corrected bound", () => {
    const lifted = extendTheme(getTheme("light"), {
      iconSize: { xs: 12, sm: 14, md: 20, lg: 24, xl: 28 },
      dimensions: { chipMinWidth: 10, fieldMinWidth: 82 },
    });
    expect(fieldFailures(lifted)).toEqual([]);
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

  it("carries the lifted-tier failure through the total check", () => {
    const lifted = extendTheme(getTheme("light"), {
      iconSize: { xs: 12, sm: 14, md: 20, lg: 24, xl: 28 },
      dimensions: { chipMinWidth: 10, fieldMinWidth: 81 },
    });
    const metrics = themeFailures(lifted).filter(
      (failure) => failure.kind === "metric",
    );
    expect(metrics).toContainEqual({
      kind: "metric",
      group: "dimensions",
      member: "fieldMinWidth",
      rule: "at-least",
      actual: 81,
      bound: 82,
    });
  });
});
