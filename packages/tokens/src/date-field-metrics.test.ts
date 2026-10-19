/**
 * Guards the defect plan 601 fixes: the date trigger paints a 220px field around
 * its own `spacing.md` insets, a `spacing.md` gap between the value and the
 * disclosure glyph, its two borders, one `label` glyph and the `caption`
 * chevron. The width was a component literal, so a brand could not own it, and
 * no metric rule held the field to the chrome it paints: a theme with
 * `dateFieldWidth: 40` returned `[]` from every check while the trigger had no
 * room for its own value.
 *
 * The same audit corrected `overlayWidth`'s description: the calendar is not an
 * overlay width but a content-sized grid of seven `calendarCellSize` cells
 * (238px at the shipped 34px cell). The docs cases live in `docs.test.ts`; the
 * arithmetic below is the number that guard derives.
 *
 * Every case fails without the rule in `metrics.ts`: case 2 returns `[]`, and
 * case 3 cannot see the boundary.
 */
import { describe, expect, it } from "vitest";
import { themeMetricFailures } from "./metrics.js";
import { dimensions } from "./scale.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, lightTheme, type Theme } from "./theme.js";

/** Every shipped set: identity, platform variant and recipe, in both modes. */
const shipped: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

/** The content the date trigger paints: three insets, two borders, two glyphs. */
const contentBound = (theme: Theme): number =>
  3 * theme.spacing.md +
  2 * theme.borderWidth.thin +
  theme.typography.label.fontSize +
  theme.typography.caption.fontSize;

describe("the date field's fixed width", () => {
  it("ships the trigger width and a calendar grid of seven cells", () => {
    expect(dimensions.dateFieldWidth).toBe(220);
    expect(dimensions.calendarCellSize * 7).toBe(238);
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

  it("passes every shipped set", () => {
    expect(shipped).toHaveLength(shippedThemes.length);
    shipped.forEach(([label, theme]) => {
      expect(themeMetricFailures(theme), label).toEqual([]);
    });
  });
});
