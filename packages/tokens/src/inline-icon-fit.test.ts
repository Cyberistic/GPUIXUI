/**
 * Guards the gap plan 521 closes. The design system's alignment rule says
 * inline icons take `xs` "so they do not raise the line box", and `scale.ts`
 * names the partners: `xs` is inline with caption text and `sm` with label text.
 * The numeric contract held `iconSize` to a positive, non-decreasing ladder and
 * `md` inside the smallest control, but never compared the two inline sizes with
 * the line boxes they share. A theme with `iconSize.xs` 17, or one whose
 * `caption.lineHeight` was tightened under the shipped icon, returned `[]` from
 * every check while a caption's 16px line box grew to hold the glyph; a 19px
 * `sm` against the 18px label line did the same. Both rules read the theme's own
 * leading, so a brand that raises its type keeps the allowance, and equality is
 * legal because the rule is "does not raise the line box".
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  extendTheme,
  getTheme,
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
  crampedInlineIcon,
  crampedInlineIconFailures,
} from "./inline-icon.example.js";

const atMost = (
  member: string,
  actual: number,
  bound: number,
): MetricFailure => ({
  group: "iconSize",
  member,
  rule: "at-most",
  actual,
  bound,
});

describe("an inline icon fits its line box", () => {
  it("reports a caption icon taller than its line", () => {
    expect(crampedInlineIconFailures).toEqual([atMost("xs", 17, 16)]);
  });

  it("reports a label icon taller than its line", () => {
    const cramped = extendTheme(getTheme("light"), {
      iconSize: { sm: 19, md: 19 },
    });

    expect(themeMetricFailures(cramped)).toEqual([atMost("sm", 19, 18)]);
  });

  it("allows an icon exactly the height of its line", () => {
    const tight = extendTheme(getTheme("light"), {
      typography: { caption: { fontSize: 12, lineHeight: 12 } },
    });
    expect(themeMetricFailures(tight)).toEqual([]);

    const oneOver = extendTheme(tight, { iconSize: { xs: 13 } });
    expect(themeMetricFailures(oneOver)).toEqual([atMost("xs", 13, 12)]);
  });

  it("reads the theme's own leading, not the shipped one", () => {
    const tight = extendTheme(getTheme("light"), {
      typography: { caption: { fontSize: 10, lineHeight: 11 } },
    });

    expect(themeMetricFailures(tight)).toEqual([atMost("xs", 12, 11)]);
  });

  it("is invisible to the other checks", () => {
    expect(themeColorFailures(crampedInlineIcon)).toEqual([]);
    expect(themeTypefaceFailures(crampedInlineIcon)).toEqual([]);
    expect(themeContrastFailures(crampedInlineIcon)).toEqual([]);
    expect(themeTextTierFailures(crampedInlineIcon)).toEqual([]);
    expect(themeDirectionFailures(crampedInlineIcon)).toEqual([]);
    expect(themeFailures(crampedInlineIcon)).toEqual([
      { kind: "metric", ...atMost("xs", 17, 16) },
    ]);
  });

  it("passes every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeMetricFailures(theme), theme.name).toEqual([]);
    });
  });
});
