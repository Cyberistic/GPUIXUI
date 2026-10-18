/**
 * Guards the defect plan 550 fixes: `themeMetricFailures` held each border role
 * on its own — `thin` non-negative, `strong` positive — and never compared
 * them, so `extendTheme(light, { borderWidth: { thin: 1, strong: 0.5 } })`
 * returned `[]` from all seven checks while every focus ring painted a
 * sub-pixel spread thinner than a decorative border. `strong` is emphasis and
 * the spread of the only focus indicator GPUix 0.10.0 can draw (`focusRing`),
 * because the pinned runtime has no `outline*` and no `focusVisible`.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  extendTheme,
  getTheme,
  metricMembers,
  themeFailures,
  themeMetricFailures,
  type Theme,
} from "./index.js";

const thinStrong = (theme: Theme, thin: number, strong: number): Theme =>
  extendTheme(theme, { borderWidth: { thin, strong } });

describe("the border-width ladder", () => {
  it("reports a strong border thinner than the thin one", () => {
    const edited = thinStrong(getTheme("light"), 1, 0.5);

    expect(themeFailures(edited)).toEqual([
      {
        kind: "metric",
        group: "borderWidth",
        member: "strong",
        rule: "at-least",
        actual: 0.5,
        bound: 1,
      },
    ]);
  });

  it("keeps a finite negative strong one defect", () => {
    expect(themeMetricFailures(thinStrong(getTheme("light"), 1, -1))).toEqual([
      {
        group: "borderWidth",
        member: "strong",
        rule: "positive",
        actual: -1,
        bound: 0,
      },
    ]);
  });

  it("allows a flat pair", () => {
    expect(themeMetricFailures(thinStrong(getTheme("light"), 1, 1))).toEqual(
      [],
    );
  });

  it("rules on both modes", () => {
    shippedThemes
      .filter(({ theme }) => theme.mode === "dark")
      .forEach(({ theme }) => {
        expect(themeMetricFailures(thinStrong(theme, 1, 0.5))).toEqual([
          {
            group: "borderWidth",
            member: "strong",
            rule: "at-least",
            actual: 0.5,
            bound: 1,
          },
        ]);
      });
  });

  it("passes every shipped theme", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(
        theme.borderWidth.strong,
        `${theme.name}.borderWidth.strong`,
      ).toBeGreaterThanOrEqual(theme.borderWidth.thin);
      expect(themeMetricFailures(theme), theme.name).toEqual([]);
    });
  });

  it("keeps the metric member index total", () => {
    expect(metricMembers.borderWidth).toEqual(["thin", "strong"]);
  });
});
