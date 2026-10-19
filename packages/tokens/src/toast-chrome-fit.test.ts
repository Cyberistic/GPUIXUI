/**
 * Guards two defects. Plan 631: plan 620 bounded the Toast card by its padding,
 * tone icon, one gap and one `bodyStrong` title glyph, and plan 627 added the
 * card's two borders, but `toast/viewport.tsx` also paints an unconditional
 * `IconButton label="Dismiss" size="sm"` after a second `spacing.lg` gap.
 * `IconButton` is a square `controlHeight.sm` wide, so a theme with
 * `toastWidth: 100` returned `[]` from every check while the card needed 108
 * inside its `overflow: "hidden"` — the dismiss control was painted outside the
 * card and the toast could not be closed.
 *
 * Plan 636 closes the bar plan 631 left out. `ToastCard` paints a 3px tone bar
 * as a sibling of its content row inside the card's own width, but the token
 * set did not own it and the bound did not charge it, so a theme at 110 passed
 * while the content row needed 111 under `overflow: "hidden"`. The bar is now
 * `dimensions.toastToneBarWidth` and the bound reads it; the shipped 380 clears
 * the corrected 111 at 3.42×.
 */
import { describe, expect, it } from "vitest";
import { themeMetricFailures, type MetricFailure } from "./metrics.js";
import { dimensions } from "./scale.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme, type Theme } from "./theme.js";
import { themeFailures } from "./theme-check.js";

/** The card's chrome, read from the theme the card will paint with. */
const toastBound = (theme: Theme): number =>
  2 * theme.spacing.lg +
  theme.dimensions.toastToneBarWidth +
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
    expect(tightest).toBeCloseTo(380 / 111, 4);
  });

  it("states the shipped bound", () => {
    expect(toastBound(getTheme("light"))).toBe(111);
    expect(getTheme("light").dimensions.toastWidth).toBe(380);
  });

  it("owns the tone bar as a dimension", () => {
    expect(getTheme("light").dimensions.toastToneBarWidth).toBe(3);
    expect(Object.keys(dimensions)).toContain("toastToneBarWidth");
  });

  it("reads the tone bar from the theme", () => {
    const wideBar = extendTheme(getTheme("light"), {
      dimensions: { toastToneBarWidth: 6, toastWidth: 111 },
    });
    expect(toastBound(wideBar)).toBe(114);
    expect(dimensionFailures(wideBar)).toEqual([
      {
        group: "dimensions",
        member: "toastWidth",
        rule: "at-least",
        actual: 111,
        bound: 114,
      },
    ]);
    expect(
      dimensionFailures(
        extendTheme(wideBar, { dimensions: { toastWidth: 114 } }),
      ),
    ).toEqual([]);
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
        bound: 111,
      },
    ]);
  });

  it("is a minimum, not a maximum", () => {
    const at = (toastWidth: number) =>
      dimensionFailures(
        extendTheme(getTheme("light"), { dimensions: { toastWidth } }),
      );
    expect(at(111)).toEqual([]);
    expect(at(107)).toEqual([
      {
        group: "dimensions",
        member: "toastWidth",
        rule: "at-least",
        actual: 107,
        bound: 111,
      },
    ]);
  });

  it("reads the dismiss control from the theme's own density", () => {
    expect(toastBound(lifted)).toBe(131);
    expect(dimensionFailures(lifted)).toEqual([
      {
        group: "dimensions",
        member: "toastWidth",
        rule: "at-least",
        actual: 90,
        bound: 131,
      },
    ]);

    const fits = extendTheme(lifted, { dimensions: { toastWidth: 131 } });
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
    expect(toastBound(roomy)).toBe(159);
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
        bound: 159,
      },
    ]);
    expect(
      dimensionFailures(
        extendTheme(roomy, { dimensions: { toastWidth: 159 } }),
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
      bound: 111,
    });
  });
});
