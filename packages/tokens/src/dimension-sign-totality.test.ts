/**
 * Guards the defect fixed in plan 554: the numeric contract promises that every
 * surface metric is a positive size and that a border width is never negative,
 * but both sign rules named the shipped members by hand. `extendTheme` keeps a
 * member it does not know, and the finite pass accepts a finite value, so
 * `extendTheme(light, { dimensions: { ...dimensions, extraSurface: 0 } })` and
 * `extendTheme(light, { borderWidth: { ...borderWidth, hairline: -1 } })` both
 * returned `[]` from `themeMetricFailures`. The sign rules now walk the theme's
 * own group, the same way plan 552 made the ladders walk it.
 *
 * Each case spreads the shipped group into a variable. A fresh object literal
 * would be excess-property checked; a spread variable reaches the checker the
 * way a decoded or copied style does — no cast and no `any`.
 */
import { describe, expect, it } from "vitest";
import {
  borderWidth,
  dimensions,
  extendTheme,
  getTheme,
  shippedThemes,
  themeMetricFailures,
} from "./index.js";

describe("every surface metric and border width has a sign", () => {
  it("reports a zero dimension the theme adds", () => {
    const widened = { ...dimensions, extraSurface: 0 };
    const theme = extendTheme(getTheme("light"), { dimensions: widened });

    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "extraSurface",
        rule: "positive",
        actual: 0,
        bound: 0,
      },
    ]);
  });

  it("reports a negative dimension the theme adds", () => {
    const widened = { ...dimensions, extraSurface: -4 };
    const theme = extendTheme(getTheme("light"), { dimensions: widened });

    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "extraSurface",
        rule: "positive",
        actual: -4,
        bound: 0,
      },
    ]);
  });

  it("still reports a zero on a shipped dimension", () => {
    const widened = { ...dimensions, toastWidth: 0 };
    const theme = extendTheme(getTheme("light"), { dimensions: widened });

    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "toastWidth",
        rule: "positive",
        actual: 0,
        bound: 0,
      },
    ]);
  });

  it("reports a negative border width the theme adds", () => {
    const widened = { ...borderWidth, hairline: -1 };
    const theme = extendTheme(getTheme("light"), { borderWidth: widened });

    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "borderWidth",
        member: "hairline",
        rule: "non-negative",
        actual: -1,
        bound: 0,
      },
    ]);
  });

  it("keeps a zero border width the theme adds", () => {
    const widened = { ...borderWidth, hairline: 0 };
    const theme = extendTheme(getTheme("light"), { borderWidth: widened });

    expect(themeMetricFailures(theme)).toEqual([]);
  });

  it("leaves every shipped theme passing", () => {
    const failures = shippedThemes.flatMap(({ theme }) =>
      themeMetricFailures(theme),
    );

    expect(failures).toEqual([]);
  });
});
