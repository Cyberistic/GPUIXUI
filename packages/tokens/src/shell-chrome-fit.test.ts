/**
 * Guards the defect plan 625 fixes: plan 620 held the fixed surfaces whose
 * chrome never wraps (toast, notification inbox, overlay minimum) but left the
 * dialog and drawer ladders alone as reflow containers. The title reflows; the
 * padding and the close control do not. A copied style could therefore set
 *
 *   dialogWidthSm: 40, dialogWidthMd: 48, dialogWidthLg: 56,
 *   drawerWidthSm: 40, drawerWidthMd: 48, drawerWidthLg: 56,
 *   drawerHeightSm: 50, drawerHeightMd: 60, drawerHeightLg: 70,
 *
 * and both checks returned `[]` while `DialogContent` and `DrawerContent` paint
 * a `sm` close control (28px) and `spacing["2xl"]` padding (24px a side) into a
 * 40px surface. The width rules hold the padding and the header's reserve plus
 * one `h3` title glyph (90px at the shipped metrics, the shell's two borders
 * included); the height rule holds the close zone, one row and the bottom
 * padding (98px). Every shipped set is 360/320/240, so no value moves.
 */
import { describe, expect, it } from "vitest";
import { themeMetricFailures, type MetricFailure } from "./metrics.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme, type Theme } from "./theme.js";
import { themeFailures } from "./theme-check.js";

const base = getTheme("light");

/**
 * Two paddings, the header's reserve for the close control, one title glyph, and
 * the surface's two `borderWidth.thin` edges (plan 627).
 */
const widthBound = (theme: Theme): number =>
  3 * theme.spacing["2xl"] +
  theme.typography.h3.fontSize +
  2 * theme.borderWidth.thin;

/** The close zone from the top, one row of content, the bottom padding, two borders. */
const heightBound = (theme: Theme): number =>
  Math.max(
    theme.spacing["2xl"],
    theme.spacing.lg + theme.density.controlHeight.sm,
  ) +
  theme.density.rowHeight +
  theme.spacing["2xl"] +
  2 * theme.borderWidth.thin;

const dimensionsOf = (theme: Theme): ReadonlyArray<MetricFailure> =>
  themeMetricFailures(theme).filter(({ group }) => group === "dimensions");

describe("dialog and drawer shell chrome", () => {
  it("passes every shipped set", () => {
    let tightestWidth = Number.POSITIVE_INFINITY;
    let tightestHeight = Number.POSITIVE_INFINITY;
    const failures = shippedThemes.flatMap(({ theme }) => {
      const width = widthBound(theme);
      const height = heightBound(theme);
      expect(theme.dimensions.dialogWidthSm).toBeGreaterThanOrEqual(width);
      expect(theme.dimensions.drawerWidthSm).toBeGreaterThanOrEqual(width);
      expect(theme.dimensions.drawerHeightSm).toBeGreaterThanOrEqual(height);
      tightestWidth = Math.min(
        tightestWidth,
        Math.min(
          theme.dimensions.dialogWidthSm / width,
          theme.dimensions.drawerWidthSm / width,
        ),
      );
      tightestHeight = Math.min(
        tightestHeight,
        theme.dimensions.drawerHeightSm / height,
      );
      return dimensionsOf(theme);
    });
    expect(failures).toEqual([]);
    expect(tightestWidth).toBeCloseTo(320 / 90, 4);
    expect(tightestHeight).toBeCloseTo(240 / 98, 4);
  });

  it("states the shipped bounds", () => {
    expect(widthBound(base)).toBe(90);
    expect(heightBound(base)).toBe(98);
    expect(base.dimensions.dialogWidthSm).toBe(360);
    expect(base.dimensions.drawerWidthSm).toBe(320);
    expect(base.dimensions.drawerHeightSm).toBe(240);
  });

  it("reports a dialog narrower than its close control", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: { dialogWidthSm: 40, dialogWidthMd: 48, dialogWidthLg: 56 },
    });

    expect(dimensionsOf(theme)).toEqual([
      {
        group: "dimensions",
        member: "dialogWidthSm",
        rule: "at-least",
        actual: 40,
        bound: 90,
      },
    ]);
  });

  it("reports a drawer narrower than its close control", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: { drawerWidthSm: 40, drawerWidthMd: 48, drawerWidthLg: 56 },
    });

    expect(dimensionsOf(theme)).toEqual([
      {
        group: "dimensions",
        member: "drawerWidthSm",
        rule: "at-least",
        actual: 40,
        bound: 90,
      },
    ]);
  });

  it("reports a bottom drawer shorter than its chrome", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: {
        drawerHeightSm: 50,
        drawerHeightMd: 60,
        drawerHeightLg: 70,
      },
    });

    expect(dimensionsOf(theme)).toEqual([
      {
        group: "dimensions",
        member: "drawerHeightSm",
        rule: "at-least",
        actual: 50,
        bound: 98,
      },
    ]);
  });

  it("reads the theme's own spacing, not a hardcoded 88", () => {
    // `2xl` moves from 24 to 40 and the steps above it keep the ladder, so the
    // width bound rises to 138 (`3*40 + 16 + 2`) and 120 no longer fits.
    const spacing = { "2xl": 40, "3xl": 48, "4xl": 64, "5xl": 80 } as const;
    const narrowDialog = extendTheme(getTheme("light"), {
      spacing,
      dimensions: {
        dialogWidthSm: 120,
        dialogWidthMd: 160,
        dialogWidthLg: 200,
      },
    });
    expect(dimensionsOf(narrowDialog)).toEqual([
      {
        group: "dimensions",
        member: "dialogWidthSm",
        rule: "at-least",
        actual: 120,
        bound: 138,
      },
    ]);

    // The same spacing lifts the height bound to 114
    // (`max(40, 40) + 32 + 40 + 2`).
    const shortDrawer = extendTheme(getTheme("light"), {
      spacing,
      dimensions: {
        drawerHeightSm: 100,
        drawerHeightMd: 110,
        drawerHeightLg: 120,
      },
    });
    expect(dimensionsOf(shortDrawer)).toEqual([
      {
        group: "dimensions",
        member: "drawerHeightSm",
        rule: "at-least",
        actual: 100,
        bound: 114,
      },
    ]);
  });

  it("carries the failure through the total check", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: { dialogWidthSm: 40, dialogWidthMd: 48, dialogWidthLg: 56 },
    });
    const metrics = themeFailures(theme).filter(
      (failure) => failure.kind === "metric",
    );
    expect(metrics).toContainEqual({
      kind: "metric",
      group: "dimensions",
      member: "dialogWidthSm",
      rule: "at-least",
      actual: 40,
      bound: 90,
    });
  });
});
