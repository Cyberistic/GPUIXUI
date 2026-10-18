/**
 * Guards the defect plan 385 closes: the family names were the one documented
 * form no check read. Before this suite, a copied theme with
 * `typography.sans: "Inter, system-ui, sans-serif"` — the CSS habit every
 * consumer brings — or with an empty family returned `[]` from
 * `themeColorFailures`, `themeContrastFailures`, `themeMetricFailures` and
 * `themeFailures`. The single-family rule was held only for the shipped
 * `platformTypes` table (`platforms.test.ts`), never for a theme a consumer
 * edits, so the whole theme's typography painted GPUI's silent fallback while
 * the library's guarantee said it was good.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  extendTheme,
  getTheme,
  themeColorFailures,
  themeContrastFailures,
  themeFailures,
  themeMetricFailures,
  themeTypefaceFailures,
  typefaceRoles,
  typefaceRules,
  typography,
  type Theme,
} from "./index.js";
import {
  installedFailures,
  stackedFailures,
  stackedTheme,
} from "./typeface.example.js";

const families = (sans: string, mono = typography.mono): Theme =>
  extendTheme(getTheme("light"), { typography: { sans, mono } });

const shipped: ReadonlyArray<{
  readonly label: string;
  readonly theme: Theme;
}> = shippedThemes.map(({ theme }) => ({ label: theme.name, theme }));

describe("themeTypefaceFailures", () => {
  it("reports a CSS stack as a single-family failure", () => {
    expect(stackedFailures).toEqual([
      {
        role: "sans",
        rule: "single-family",
        value: "Inter, system-ui, sans-serif",
      },
    ]);
  });

  it("reports an empty family", () => {
    expect(themeFailures(families(""))).toEqual([
      { kind: "typeface", role: "sans", rule: "non-empty", value: "" },
    ]);
  });

  it("reports a whitespace-only family", () => {
    expect(themeFailures(families("   "))).toEqual([
      { kind: "typeface", role: "sans", rule: "non-empty", value: "   " },
    ]);
  });

  it("checks both fields, in documentation order", () => {
    expect(themeFailures(families("   ", "Menlo, monospace"))).toEqual([
      { kind: "typeface", role: "sans", rule: "non-empty", value: "   " },
      {
        kind: "typeface",
        role: "mono",
        rule: "single-family",
        value: "Menlo, monospace",
      },
    ]);
  });

  it("accepts a single installed family with a space in its name", () => {
    expect(installedFailures).toEqual([]);
  });

  it("accepts the shipped system sentinel", () => {
    expect(themeFailures(getTheme("light"))).toEqual([]);
    expect(themeFailures(getTheme("dark", "high"))).toEqual([]);
  });

  it("passes every shipped identity theme, platform variant and recipe", () => {
    expect(shipped.length).toBeGreaterThanOrEqual(20);
    shipped.forEach(({ label, theme }) => {
      expect(themeFailures(theme), label).toEqual([]);
    });
  });

  it("is invisible to the other three checks", () => {
    expect(themeColorFailures(stackedTheme)).toEqual([]);
    expect(themeContrastFailures(stackedTheme)).toEqual([]);
    expect(themeMetricFailures(stackedTheme)).toEqual([]);
    expect(themeFailures(stackedTheme)).toEqual([
      {
        kind: "typeface",
        role: "sans",
        rule: "single-family",
        value: "Inter, system-ui, sans-serif",
      },
    ]);
  });

  it("uses the role and rule indexes for every field it checks", () => {
    const familyKeys = Object.entries(typography)
      .filter(([, value]) => typeof value === "string")
      .map(([key]) => key);
    expect(typefaceRoles.toSorted()).toEqual(familyKeys.toSorted());

    const reported = [
      ...themeTypefaceFailures(families("")),
      ...themeTypefaceFailures(families("Menlo, monospace")),
    ].map((failure) => failure.rule);
    expect(reported.toSorted()).toEqual([...typefaceRules].toSorted());
  });
});
