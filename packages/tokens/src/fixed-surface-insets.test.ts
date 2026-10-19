/**
 * Guards the defect plan 645 fixes: five fixed-surface bounds counted some of
 * the chrome painted inside them but not all of it. A chat viewport at one
 * `density.rowHeight` had no content box for that row once its `spacing.md`
 * padding and two borders were painted; a `previewCardMinWidth` of 10 was
 * narrower than its own padding; an overlay minimum omitted the menu surface's
 * `spacing.xs`; the field's query row omitted the field's two borders while the
 * chip row charged them; and a dialog or drawer reserved
 * `2 * spacing["2xl"]` for the close control even when the control reached
 * `spacing.lg + controlHeight.sm` further. Every theme below passed the checks
 * on the pre-fix tree; each case asserts the diagnostic the new rule adds.
 */
import { describe, expect, it } from "vitest";
import { themeFailures, themeMetricFailures } from "./index.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme } from "./theme.js";

const base = getTheme("light");
const themes = shippedThemes.map((set) => set.theme);

describe("fixed-surface insets", () => {
  it.each(themes)("holds $name to the bounds", (theme) => {
    expect(themeMetricFailures(theme)).toEqual([]);
  });

  it("charges the message viewport its padding and borders", () => {
    const actual = base.density.rowHeight;
    const theme = extendTheme(base, {
      dimensions: { chatViewportMinHeight: actual },
    });
    const bound =
      base.density.rowHeight + 2 * base.spacing.md + 2 * base.borderWidth.thin;
    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "chatViewportMinHeight",
        rule: "at-least",
        actual,
        bound,
      },
    ]);
    expect(themeFailures(theme)).toEqual([
      {
        kind: "metric",
        group: "dimensions",
        member: "chatViewportMinHeight",
        rule: "at-least",
        actual,
        bound,
      },
    ]);
  });

  it("charges the preview card its padding and borders", () => {
    const theme = extendTheme(base, {
      dimensions: { previewCardMinWidth: 10 },
    });
    const bound =
      2 * base.spacing.lg + base.spacing["2xs"] + 2 * base.borderWidth.thin;
    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "previewCardMinWidth",
        rule: "at-least",
        actual: 10,
        bound,
      },
    ]);
  });

  it("charges the overlay minimum the surface padding", () => {
    const oldRowBound =
      2 * base.spacing.md +
      base.iconSize.md +
      base.spacing.md +
      base.typography.label.fontSize +
      2 * base.borderWidth.thin;
    const theme = extendTheme(base, {
      dimensions: {
        overlayMinWidth: oldRowBound,
        overlayWidth: oldRowBound + 1,
      },
    });
    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "overlayMinWidth",
        rule: "at-least",
        actual: oldRowBound,
        bound: oldRowBound + 2 * base.spacing.xs,
      },
    ]);
  });

  it("charges the field query row the field's two borders", () => {
    const oldQueryBound =
      2 * base.spacing.md +
      base.iconSize.md +
      2 * base.spacing.md +
      base.typography.body.fontSize +
      base.dimensions.fieldAdornmentSize;
    const theme = extendTheme(base, {
      dimensions: {
        chipMinWidth: 10,
        fieldMinWidth: oldQueryBound,
      },
    });
    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "fieldMinWidth",
        rule: "at-least",
        actual: oldQueryBound,
        bound: oldQueryBound + 2 * base.borderWidth.thin,
      },
    ]);
  });

  it("reserves the close control's reach on a dialog", () => {
    const theme = extendTheme(base, { spacing: { "2xl": 16 } });
    const oldBound =
      3 * theme.spacing["2xl"] +
      theme.typography.h3.fontSize +
      2 * theme.borderWidth.thin;
    const narrow = extendTheme(theme, {
      dimensions: { dialogWidthSm: oldBound },
    });
    const bound =
      2 * theme.borderWidth.thin +
      theme.spacing["2xl"] +
      theme.typography.h3.fontSize +
      Math.max(
        2 * theme.spacing["2xl"],
        theme.spacing.lg + theme.density.controlHeight.sm,
      );
    expect(themeMetricFailures(narrow)).toEqual([
      {
        group: "dimensions",
        member: "dialogWidthSm",
        rule: "at-least",
        actual: oldBound,
        bound,
      },
    ]);
  });

  it("reserves the close control's reach on a drawer", () => {
    const theme = extendTheme(base, { spacing: { "2xl": 16 } });
    const oldBound =
      3 * theme.spacing["2xl"] +
      theme.typography.h3.fontSize +
      2 * theme.borderWidth.thin;
    const narrow = extendTheme(theme, {
      dimensions: { drawerWidthSm: oldBound },
    });
    const bound =
      2 * theme.borderWidth.thin +
      theme.spacing["2xl"] +
      theme.typography.h3.fontSize +
      Math.max(
        2 * theme.spacing["2xl"],
        theme.spacing.lg + theme.density.controlHeight.sm,
      );
    expect(themeMetricFailures(narrow)).toEqual([
      {
        group: "dimensions",
        member: "drawerWidthSm",
        rule: "at-least",
        actual: oldBound,
        bound,
      },
    ]);
  });

  it("takes the larger of the header reserve and the control reach", () => {
    const wideHeader = extendTheme(base, {
      spacing: { "2xl": 64, "3xl": 72, "4xl": 88, "5xl": 104 },
    });
    const bound =
      2 * wideHeader.borderWidth.thin +
      wideHeader.spacing["2xl"] +
      wideHeader.typography.h3.fontSize +
      Math.max(
        2 * wideHeader.spacing["2xl"],
        wideHeader.spacing.lg + wideHeader.density.controlHeight.sm,
      );
    const atBound = extendTheme(wideHeader, {
      dimensions: { dialogWidthSm: bound },
    });
    expect(themeMetricFailures(atBound)).toEqual([]);
    const below = extendTheme(wideHeader, {
      dimensions: { dialogWidthSm: bound - 1 },
    });
    expect(themeMetricFailures(below)).toEqual([
      {
        group: "dimensions",
        member: "dialogWidthSm",
        rule: "at-least",
        actual: bound - 1,
        bound,
      },
    ]);
  });
});
