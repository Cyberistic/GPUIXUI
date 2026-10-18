/**
 * Guards the defect fixed in plan 552: the numeric contract's finite half walked
 * the theme's own group value (plan 531), but its ladder half read hand-typed
 * lists of the shipped member names. A theme can carry an extra step —
 * `extendTheme(light, { spacing: { ...spacing, "6xl": 1 } })` keeps it — and the
 * finiteness rule accepted it as finite while no ladder compared it, so
 * `themeMetricFailures` returned `[]` although `docs/tokens.md` promises every
 * named ladder must not step backwards.
 *
 * Each case appends a step below the one before it by spreading the shipped
 * scale into a variable. A fresh object literal would be excess-property
 * checked; a spread variable is not, so the theme reaches the checker the way a
 * decoded or copied scale does — no cast and no `any`.
 */
import { describe, expect, it } from "vitest";
import {
  densityPresets,
  extendTheme,
  getTheme,
  spacing,
  themeMetricFailures,
  iconSize,
  avatarSize,
  radius,
  shippedThemes,
  type MetricFailure,
} from "./index.js";

const ladderFailure = (
  group: MetricFailure["group"],
  member: string,
  actual: number,
  bound: number,
): MetricFailure => ({
  group,
  member,
  rule: "non-decreasing",
  actual,
  bound,
});

describe("every size ladder walks the theme's own scale", () => {
  it("reports a spacing step the theme adds below its last step", () => {
    const extended = { ...spacing, "6xl": 1 };
    const theme = extendTheme(getTheme("light"), { spacing: extended });

    expect(themeMetricFailures(theme)).toEqual([
      ladderFailure("spacing", "6xl", 1, spacing["5xl"]),
    ]);
  });

  it("reports an icon size the theme adds below its last size", () => {
    const extended = { ...iconSize, xxl: 1 };
    const theme = extendTheme(getTheme("light"), { iconSize: extended });

    expect(themeMetricFailures(theme)).toEqual([
      ladderFailure("iconSize", "xxl", 1, iconSize.xl),
    ]);
  });

  it("reports an avatar size the theme adds below its last size", () => {
    const extended = { ...avatarSize, xl: 1 };
    const theme = extendTheme(getTheme("light"), { avatarSize: extended });

    expect(themeMetricFailures(theme)).toEqual([
      ladderFailure("avatarSize", "xl", 1, avatarSize.lg),
    ]);
  });

  it("reports a radius step the theme adds below the corner ladder", () => {
    const extended = { ...radius, "2xl": 1 };
    const theme = extendTheme(getTheme("light"), { radius: extended });

    // `none` and `full` keep their own rules, so the walk reaches `2xl` from
    // the last corner step, `xl` — not from the `full` sentinel.
    expect(themeMetricFailures(theme)).toEqual([
      ladderFailure("radius", "2xl", 1, radius.xl),
    ]);
  });

  it("reports a control size the theme adds below the density ladder", () => {
    const preset = densityPresets.comfortable;
    const extended = {
      ...preset,
      controlHeight: { ...preset.controlHeight, xl: 1 },
    };
    const theme = extendTheme(getTheme("light"), { density: extended });

    expect(themeMetricFailures(theme)).toEqual([
      ladderFailure("density", "controlHeight.xl", 1, preset.controlHeight.lg),
    ]);
  });

  it("leaves every shipped theme passing", () => {
    const failures = shippedThemes.flatMap(({ theme }) =>
      themeMetricFailures(theme),
    );

    expect(failures).toEqual([]);
  });
});
