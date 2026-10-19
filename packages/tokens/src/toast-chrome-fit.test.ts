/**
 * Guards the defect plan 631 fixes: plan 620 bounded the Toast card by its
 * padding, tone icon, one gap and one `bodyStrong` title glyph, and plan 627
 * added the card's two borders, but `toast/viewport.tsx` also paints an
 * unconditional `IconButton label="Dismiss" size="sm"` after a second
 * `spacing.lg` gap. `IconButton` is a square `controlHeight.sm` wide, so a
 * theme with `toastWidth: 100` returned `[]` from every check while the card
 * needed 108 inside its `overflow: "hidden"` — the dismiss control was painted
 * outside the card and the toast could not be closed.
 *
 * The bound now reads the gap and the square control from the theme's own
 * spacing and density. Every shipped set clears it (the identity 380 against
 * 108), so no colour, pair, floor, metric or shipped theme value moves.
 */
import { describe, expect, it } from "vitest";
import { themeMetricFailures, type MetricFailure } from "./metrics.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme, type Theme } from "./theme.js";
import { themeFailures } from "./theme-check.js";

/** The card's chrome, read from the theme the card will paint with. */
const toastBound = (theme: Theme): number =>
  2 * theme.spacing.lg +
  theme.iconSize.md +
  theme.spacing.lg +
  theme.typography.bodyStrong.fontSize +
  theme.spacing.lg +
  theme.density.controlHeight.sm +
  2 * theme.borderWidth.thin;

const dimensionFailures = (theme: Theme): ReadonlyArray<MetricFailure> =>
  themeMetricFailures(theme).filter(({ group }) => group === "dimensions");

/** A theme whose `sm` control is taller than its title line, kept coherent. */
const lifted = extendTheme(getTheme("light"), {
  typography: { label: { lineHeight: 40 } },
  density: { controlHeight: { sm: 48, md: 52, lg: 56 }, rowHeight: 60 },
  dimensions: { toastWidth: 90, calendarCellSize: 48 },
});

describe("Toast card chrome fit", () => {
  it("passes every shipped set", () => {
    let tightest = Number.POSITIVE_INFINITY;
    const failures = shippedThemes.flatMap(({ theme }) => {
      const bound = toastBound(theme);
      expect(theme.dimensions.toastWidth, theme.name).toBeGreaterThanOrEqual(
        bound,
      );
      tightest = Math.min(tightest, theme.dimensions.toastWidth / bound);
      return dimensionFailures(theme);
    });
    expect(failures).toEqual([]);
    expect(tightest).toBeCloseTo(380 / 108, 4);
  });

  it("states the shipped bound", () => {
    expect(toastBound(getTheme("light"))).toBe(108);
    expect(getTheme("light").dimensions.toastWidth).toBe(380);
  });

  it("reports the 100px card the title-only bound accepted", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: { toastWidth: 100 },
    });
    expect(dimensionFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "toastWidth",
        rule: "at-least",
        actual: 100,
        bound: 108,
      },
    ]);
  });

  it("is a minimum, not a maximum", () => {
    const at = (toastWidth: number) =>
      dimensionFailures(
        extendTheme(getTheme("light"), { dimensions: { toastWidth } }),
      );
    expect(at(108)).toEqual([]);
    expect(at(107)).toEqual([
      {
        group: "dimensions",
        member: "toastWidth",
        rule: "at-least",
        actual: 107,
        bound: 108,
      },
    ]);
  });

  it("reads the dismiss control from the theme's own density", () => {
    expect(toastBound(lifted)).toBe(128);
    expect(dimensionFailures(lifted)).toEqual([
      {
        group: "dimensions",
        member: "toastWidth",
        rule: "at-least",
        actual: 90,
        bound: 128,
      },
    ]);

    const fits = extendTheme(lifted, { dimensions: { toastWidth: 128 } });
    expect(dimensionFailures(fits)).toEqual([]);
  });

  it("reads the gap from the theme's own spacing", () => {
    const roomy = extendTheme(getTheme("light"), {
      spacing: {
        lg: 24,
        xl: 24,
        "2xl": 32,
        "3xl": 40,
        "4xl": 56,
        "5xl": 72,
      },
    });
    expect(toastBound(roomy)).toBe(156);
    expect(
      dimensionFailures(
        extendTheme(roomy, { dimensions: { toastWidth: 155 } }),
      ),
    ).toEqual([
      {
        group: "dimensions",
        member: "toastWidth",
        rule: "at-least",
        actual: 155,
        bound: 156,
      },
    ]);
    expect(
      dimensionFailures(
        extendTheme(roomy, { dimensions: { toastWidth: 156 } }),
      ),
    ).toEqual([]);
  });

  it("carries the failure through the total check", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: { toastWidth: 100 },
    });
    expect(
      themeFailures(theme).filter((failure) => failure.kind === "metric"),
    ).toContainEqual({
      kind: "metric",
      group: "dimensions",
      member: "toastWidth",
      rule: "at-least",
      actual: 100,
      bound: 108,
    });
  });
});
