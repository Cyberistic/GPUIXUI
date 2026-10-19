/**
 * Guards the defect plans 601 and 632 fix: the date trigger paints a 220px field
 * around its own `spacing.md` insets, a `spacing.md` gap between the value and
 * the disclosure marker, its two borders, one `label` glyph and the `sm` icon
 * tier the `Icon` paints. The width was a component literal, so a brand could
 * not own it, and no metric rule held the field to the chrome it paints: a
 * theme with `dateFieldWidth: 40` returned `[]` from every check while the
 * trigger had no room for its own value.
 *
 * Plan 632 closes the sibling undercount: the bound charged the `caption` type
 * (12px) for a marker that is `<Icon size="sm" />` → `iconSize.sm` (14px), so a
 * theme at the old 51px bound returned `[]` while the trigger needed 53, and a
 * theme that lifted the icon tier was read as the caption size.
 *
 * The same audit corrected `overlayWidth`'s description: the calendar is not an
 * overlay width but a content-sized grid of seven `calendarCellSize` cells
 * (238px at the shipped 34px cell). The docs cases live in `docs.test.ts`; the
 * arithmetic below is the number that guard derives.
 *
 * Every case fails without the rule in `metrics.ts`: the pre-fix width returns
 * `[]`, and the boundary cases cannot see the edge.
 */
import { describe, expect, it } from "vitest";
import { themeMetricFailures } from "./metrics.js";
import { dimensions, iconSize, spacing } from "./scale.js";
import { shippedThemes } from "./shipped-themes.js";
import { themeFailures } from "./theme-check.js";
import { extendTheme, lightTheme, type Theme } from "./theme.js";
import { typography } from "./typography.js";

/** Every shipped set: identity, platform variant and recipe, in both modes. */
const shipped: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

/** The content the date trigger paints: three insets, two borders, two glyphs. */
const contentBound = (theme: Theme): number =>
  3 * theme.spacing.md +
  2 * theme.borderWidth.thin +
  theme.typography.label.fontSize +
  theme.iconSize.sm;

describe("the date field's fixed width", () => {
  it("ships the trigger width and a calendar grid of seven cells", () => {
    expect(dimensions.dateFieldWidth).toBe(220);
    expect(dimensions.calendarCellSize * 7).toBe(238);
  });

  it("charges the disclosure icon tier, not the caption type", () => {
    expect(contentBound(lightTheme)).toBe(53);
    expect(
      3 * spacing.md +
        2 * lightTheme.borderWidth.thin +
        typography.label.fontSize +
        iconSize.sm,
    ).toBe(53);
    expect(iconSize.sm).not.toBe(typography.caption.fontSize);
  });

  it("reports a field narrower than its own chrome", () => {
    const theme = extendTheme(lightTheme, {
      dimensions: { dateFieldWidth: 40 },
    });
    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "dateFieldWidth",
        rule: "at-least",
        actual: 40,
        bound: contentBound(lightTheme),
      },
    ]);
  });

  it("reports the width the pre-632 rule let through", () => {
    const theme = extendTheme(lightTheme, {
      dimensions: { dateFieldWidth: 52 },
    });
    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "dateFieldWidth",
        rule: "at-least",
        actual: 52,
        bound: 53,
      },
    ]);
  });

  it("holds the boundary, not a house number", () => {
    const bound = contentBound(lightTheme);
    expect(
      themeMetricFailures(
        extendTheme(lightTheme, { dimensions: { dateFieldWidth: bound } }),
      ),
    ).toEqual([]);
    expect(
      themeMetricFailures(
        extendTheme(lightTheme, {
          dimensions: { dateFieldWidth: bound - 1 },
        }),
      ),
    ).toEqual([
      {
        group: "dimensions",
        member: "dateFieldWidth",
        rule: "at-least",
        actual: bound - 1,
        bound,
      },
    ]);
  });

  it("reads the theme's own disclosure icon tier", () => {
    const lifted = extendTheme(lightTheme, {
      iconSize: { xs: 12, sm: 16, md: 18, lg: 22, xl: 26 },
    });
    const bound = contentBound(lifted);
    expect(bound).toBe(55);
    expect(
      themeMetricFailures(
        extendTheme(lifted, { dimensions: { dateFieldWidth: 54 } }),
      ),
    ).toEqual([
      {
        group: "dimensions",
        member: "dateFieldWidth",
        rule: "at-least",
        actual: 54,
        bound: 55,
      },
    ]);
    expect(
      themeMetricFailures(
        extendTheme(lifted, { dimensions: { dateFieldWidth: 55 } }),
      ),
    ).toEqual([]);
  });

  it("leaves a zero width to the sign rule", () => {
    const theme = extendTheme(lightTheme, {
      dimensions: { dateFieldWidth: 0 },
    });
    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "dateFieldWidth",
        rule: "positive",
        actual: 0,
        bound: 0,
      },
    ]);
  });

  it("carries the failure through the total check", () => {
    const theme = extendTheme(lightTheme, {
      dimensions: { dateFieldWidth: 52 },
    });
    expect(
      themeFailures(theme).filter(
        (entry) => entry.kind === "metric" && entry.member === "dateFieldWidth",
      ),
    ).toEqual([
      {
        kind: "metric",
        group: "dimensions",
        member: "dateFieldWidth",
        rule: "at-least",
        actual: 52,
        bound: 53,
      },
    ]);
  });

  it("passes every shipped set", () => {
    expect(shipped).toHaveLength(shippedThemes.length);
    shipped.forEach(([label, theme]) => {
      expect(themeMetricFailures(theme), label).toEqual([]);
    });
  });
});
