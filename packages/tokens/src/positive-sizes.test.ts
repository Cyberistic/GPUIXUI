/**
 * Guards the defect plan 372 fixes: `themeMetricFailures` held `iconSize` and
 * `avatarSize` to a non-decreasing ladder only, so a zero first step passed
 * every check. A theme with `iconSize.xs: 0` or `avatarSize.xs: 0` returned
 * `[]` from `themeMetricFailures`, `themeContrastFailures` and
 * `themeColorFailures` while an `xs` icon or avatar painted a 0×0 box — a
 * missing glyph or identity mark, not a size.
 */
import { describe, expect, it } from "vitest";
import { themeColorFailures, themeContrastFailures } from "./contrast.js";
import { themeMetricFailures } from "./metrics.js";
import { extendTheme, getTheme, lightTheme } from "./theme.js";

describe("positive named sizes", () => {
  it("reports a zero icon size and leaves the two colour checks silent", () => {
    const zeroIcon = extendTheme(getTheme("light"), { iconSize: { xs: 0 } });

    expect(themeMetricFailures(zeroIcon)).toEqual([
      {
        group: "iconSize",
        member: "xs",
        rule: "positive",
        actual: 0,
        bound: 0,
      },
    ]);
    expect(themeContrastFailures(zeroIcon)).toEqual([]);
    expect(themeColorFailures(zeroIcon)).toEqual([]);
  });

  it("reports a zero avatar size", () => {
    const zeroAvatar = extendTheme(getTheme("light"), {
      avatarSize: { xs: 0 },
    });

    expect(themeMetricFailures(zeroAvatar)).toEqual([
      {
        group: "avatarSize",
        member: "xs",
        rule: "positive",
        actual: 0,
        bound: 0,
      },
    ]);
  });

  it("reports every step of a ladder of zeroes, without ladder noise", () => {
    const zeroIcons = extendTheme(getTheme("light"), {
      iconSize: { xs: 0, sm: 0, md: 0, lg: 0, xl: 0 },
    });
    const failures = themeMetricFailures(zeroIcons);

    expect(failures.map(({ member }) => member)).toEqual([
      "xs",
      "sm",
      "md",
      "lg",
      "xl",
    ]);
    expect(failures.map(({ rule }) => rule)).toEqual([
      "positive",
      "positive",
      "positive",
      "positive",
      "positive",
    ]);
  });

  it("accepts a positive first step, so the rule is not a minimum above one", () => {
    expect(
      themeMetricFailures(
        extendTheme(getTheme("light"), { iconSize: { xs: 1 } }),
      ),
    ).toEqual([]);
  });

  it("leaves the shipped theme passing", () => {
    expect(themeMetricFailures(lightTheme)).toEqual([]);
  });
});
