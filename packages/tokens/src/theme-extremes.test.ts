/**
 * Guards the defect plan 568 fixes: the numeric contract's ladders walk the
 * theme's own scale (plan 552), but four shape bounds still read the shipped
 * member's name — `radius.full` against `radius.xl`, `density.controlHeight.lg`
 * and `avatarSize.lg`, and the presence dot against `avatarSize.xs`. A theme
 * carrying a wider scale therefore painted a rounded square avatar, a rounded
 * square control or a dot larger than half its smallest avatar while
 * `themeMetricFailures` returned `[]`, and both documents' "largest"/"smallest"
 * sentences were false.
 *
 * Each case appends (or prepends) a step through a spread variable: a fresh
 * object literal would be excess-property checked, a spread variable is not,
 * so the theme reaches the checker the way a decoded or copied scale does.
 */
import { describe, expect, it } from "vitest";
import {
  avatarSize,
  densityPresets,
  dimensions,
  extendTheme,
  getTheme,
  lightTheme,
  radius,
  shippedThemes,
  themeMetricFailures,
  type MetricFailure,
  type Theme,
} from "./index.js";

const radiusFailure = (actual: number, bound: number): MetricFailure => ({
  group: "radius",
  member: "full",
  rule: "at-least",
  actual,
  bound,
});

describe("the shape bounds read the theme's own extremes", () => {
  it("rounds an avatar the theme adds above the shipped largest tier", () => {
    const avatars = { ...avatarSize, xl: 80 };
    const theme = extendTheme(getTheme("light"), {
      avatarSize: avatars,
      radius: { full: 20 },
    });

    expect(themeMetricFailures(theme)).toEqual([radiusFailure(20, 40)]);
  });

  it("rounds a control the theme adds above the shipped largest size", () => {
    const preset = densityPresets.comfortable;
    const controls = { ...preset.controlHeight, xl: 48 };
    const theme = extendTheme(getTheme("light"), {
      density: { controlHeight: controls },
      radius: { full: 20 },
    });

    expect(themeMetricFailures(theme)).toEqual([radiusFailure(20, 24)]);
  });

  it("rounds a corner step the theme adds above the shipped largest radius", () => {
    const corners = { ...radius, "2xl": 24 };
    const theme = extendTheme(getTheme("light"), {
      radius: { ...corners, full: 20 },
    });

    expect(themeMetricFailures(theme)).toEqual([radiusFailure(20, 24)]);
  });

  it("holds the presence dot to a smaller avatar the theme carries", () => {
    // A decoded or copied theme may order a smaller tier first; `extendTheme`
    // appends, so this shape reaches the checker as a `Theme` value.
    const avatars = { xxs: 8, ...avatarSize };
    const theme: Theme = { ...lightTheme, avatarSize: avatars };

    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "avatarPresenceDotSize",
        rule: "at-most",
        actual: dimensions.avatarPresenceDotSize,
        bound: 4,
      },
    ]);
  });

  it("accepts the derived bound when the radius reaches it", () => {
    const avatars = { ...avatarSize, xl: 80 };
    const theme = extendTheme(getTheme("light"), {
      avatarSize: avatars,
      radius: { full: 40 },
    });

    expect(themeMetricFailures(theme)).toEqual([]);
  });

  it("leaves every shipped theme passing", () => {
    const failures = shippedThemes.flatMap(({ theme }) =>
      themeMetricFailures(theme),
    );

    expect(failures).toEqual([]);
  });
});
