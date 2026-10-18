/**
 * Guards the gap plan 523 closes. `scale.ts` calls `controlPaddingX` the
 * horizontal control padding and every labelled control paints it inside its
 * own border — a button's label, a field's typed text, a time picker's
 * separator — but the numeric contract held it only finite, ordered and
 * non-negative. A theme whose whole padding ladder fell to zero returned `[]`
 * from every check while every labelled control painted its glyph on its
 * border, and a 1px inset did the same against the 2px hairline the spacing
 * scale defines for padding. The rule reads the theme's own
 * `spacing["2xs"]`, so a brand that widens its hairline gets the allowance, and
 * zero is a hard floor of its own because a theme may zero its hairline too.
 */
import { describe, expect, it } from "vitest";
import {
  controlSizes,
  extendTheme,
  getTheme,
  spacing,
  themeColorFailures,
  themeContrastFailures,
  themeDirectionFailures,
  themeFailures,
  themeMetricFailures,
  themeTextTierFailures,
  themeTypefaceFailures,
  type MetricFailure,
} from "./index.js";
import {
  flushControlFailures,
  flushControls,
} from "./control-padding.example.js";
import { shippedThemes } from "./shipped-themes.js";

const flush = (size: string): MetricFailure => ({
  group: "density",
  member: `controlPaddingX.${size}`,
  rule: "positive",
  actual: 0,
  bound: 0,
});

const hairline = (
  size: string,
  actual: number,
  bound: number = spacing["2xs"],
): MetricFailure => ({
  group: "density",
  member: `controlPaddingX.${size}`,
  rule: "at-least",
  actual,
  bound,
});

describe("a control's horizontal padding paints", () => {
  it("reports a flush inset as positive and below the hairline", () => {
    expect(flushControlFailures).toEqual([
      ...controlSizes.map(flush),
      ...controlSizes.map((size) => hairline(size, 0)),
    ]);
  });

  it("reports an inset tighter than the theme's hairline", () => {
    const tight = extendTheme(getTheme("light"), {
      density: { controlPaddingX: { sm: 1, md: 1, lg: 1 } },
    });

    expect(themeMetricFailures(tight)).toEqual(
      controlSizes.map((size) => hairline(size, 1)),
    );
  });

  it("reads the theme's own hairline, not the shipped one", () => {
    const roomier = extendTheme(getTheme("dark"), {
      spacing: { "2xs": 4 },
    });
    expect(themeMetricFailures(roomier)).toEqual([]);

    const tighter = extendTheme(roomier, {
      density: { controlPaddingX: { sm: 3 } },
    });
    expect(themeMetricFailures(tighter)).toEqual([hairline("sm", 3, 4)]);
  });

  it("reports a negative inset as positive, not only below the hairline", () => {
    const negative = extendTheme(getTheme("light"), {
      density: { controlPaddingX: { sm: -1, md: -1, lg: -1 } },
    });

    expect(themeMetricFailures(negative)).toEqual([
      ...controlSizes.map(
        (size): MetricFailure => ({
          group: "density",
          member: `controlPaddingX.${size}`,
          rule: "positive",
          actual: -1,
          bound: 0,
        }),
      ),
      ...controlSizes.map((size) => hairline(size, -1)),
    ]);
  });

  it("keeps the ordering rule beside the new floor", () => {
    const inverted = extendTheme(getTheme("light"), {
      density: { controlPaddingX: { sm: 6, md: 1, lg: 2 } },
    });

    expect(themeMetricFailures(inverted)).toEqual([
      {
        group: "density",
        member: "controlPaddingX.md",
        rule: "non-decreasing",
        actual: 1,
        bound: 6,
      },
      hairline("md", 1),
    ]);
  });

  it("is invisible to the other checks", () => {
    expect(themeColorFailures(flushControls)).toEqual([]);
    expect(themeTypefaceFailures(flushControls)).toEqual([]);
    expect(themeContrastFailures(flushControls)).toEqual([]);
    expect(themeTextTierFailures(flushControls)).toEqual([]);
    expect(themeDirectionFailures(flushControls)).toEqual([]);
    expect(themeFailures(flushControls)).toEqual(
      flushControlFailures.map((failure) => ({ kind: "metric", ...failure })),
    );
  });

  it("passes every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeMetricFailures(theme), theme.name).toEqual([]);
    });
  });
});
