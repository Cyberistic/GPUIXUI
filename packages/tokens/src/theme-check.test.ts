/**
 * Guards the gap plan 383 closes: the extension mechanism advertises one
 * guarantee but shipped separate checks — colour format, contrast and numeric
 * metrics — and each is total only over its own domain. The reference
 * introduces `themeContrastFailures` first, so a copied theme whose only defect
 * is a `shadow: "black"` tint or a zero focus-ring spread returned `[]` from the
 * check a consumer is most likely to run alone; the docs-site interlock row is
 * the first real consumer of that mistake. `themeFailures` composes them into
 * one tagged list, and this suite proves the composition neither drops a class
 * nor hides a partial check.
 *
 * Plan 385 adds the fourth class: a family name the runtime cannot resolve as
 * written, which no older check could see.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  extendTheme,
  getPlatformRecipeTheme,
  getPlatformTheme,
  getTheme,
  lightColors,
  platformNames,
  platformRecipeNames,
  themeColorFailures,
  themeContrastFailures,
  themeContrasts,
  themeFailures,
  themeMetricFailures,
  themeModes,
  themeTypefaceFailures,
  type Theme,
} from "./index.js";
import {
  brandFailures,
  brandTheme,
  brokenFailures,
  brokenTheme,
} from "./theme-check.example.js";

const realPlatforms = platformNames.filter(
  (platform) => platform !== "default",
);

const shipped: ReadonlyArray<{
  readonly label: string;
  readonly theme: Theme;
}> = [
  ...themeContrasts.flatMap((contrast) =>
    themeModes.map((mode) => ({
      label: `identity ${mode} ${contrast}`,
      theme: getTheme(mode, contrast),
    })),
  ),
  ...realPlatforms.flatMap((platform) =>
    themeContrasts.flatMap((contrast) =>
      themeModes.map((mode) => ({
        label: `${platform} ${mode} ${contrast}`,
        theme: getPlatformTheme(platform, mode, contrast),
      })),
    ),
  ),
  ...platformRecipeNames.flatMap((recipe) =>
    themeModes.map((mode) => ({
      label: `${recipe} ${mode}`,
      theme: getPlatformRecipeTheme(recipe, mode),
    })),
  ),
];

const kinds = (failures: ReadonlyArray<{ readonly kind: string }>) =>
  failures.map((failure) => failure.kind);

describe("one total theme check", () => {
  it("covers every shipped set, not a sample", () => {
    expect(shipped.length).toBeGreaterThanOrEqual(20);
  });

  shipped.forEach(({ label, theme }) => {
    it(`${label}: passes every check through one call`, () => {
      expect(themeFailures(theme)).toEqual([]);
    });
  });

  it("returns exactly the four checks' failures, tagged and grouped", () => {
    expect(brokenFailures.length).toBe(
      themeColorFailures(brokenTheme).length +
        themeTypefaceFailures(brokenTheme).length +
        themeContrastFailures(brokenTheme).length +
        themeMetricFailures(brokenTheme).length,
    );

    expect(new Set(kinds(brokenFailures))).toEqual(
      new Set(["color", "typeface", "contrast", "metric"]),
    );

    const firstTypeface = kinds(brokenFailures).indexOf("typeface");
    const lastColor = kinds(brokenFailures).lastIndexOf("color");
    const firstContrast = kinds(brokenFailures).indexOf("contrast");
    const lastTypeface = kinds(brokenFailures).lastIndexOf("typeface");
    const firstMetric = kinds(brokenFailures).indexOf("metric");
    const lastContrast = kinds(brokenFailures).lastIndexOf("contrast");
    expect(lastColor).toBeLessThan(firstTypeface);
    expect(lastTypeface).toBeLessThan(firstContrast);
    expect(lastContrast).toBeLessThan(firstMetric);
  });

  it("names each failure's payload", () => {
    expect(brokenFailures).toContainEqual({
      kind: "color",
      role: "shadow",
      value: "black",
    });
    expect(brokenFailures).toContainEqual({
      kind: "typeface",
      role: "sans",
      rule: "single-family",
      value: "Inter, system-ui, sans-serif",
    });
    expect(brokenFailures).toContainEqual({
      kind: "metric",
      group: "borderWidth",
      member: "strong",
      rule: "positive",
      actual: 0,
      bound: 0,
    });
    expect(brokenFailures).toContainEqual({
      kind: "contrast",
      foreground: "mutedForeground",
      background: "background",
      pairClass: "secondary",
      floor: contrastFloors.default.secondary,
      ratio: 1,
    });
  });

  it("catches a typeface-only defect the contrast check alone passes", () => {
    const stacked = extendTheme(getTheme("light"), {
      typography: { sans: "Inter, system-ui, sans-serif" },
    });

    expect(themeContrastFailures(stacked)).toEqual([]);
    expect(kinds(themeFailures(stacked))).toEqual(["typeface"]);
  });

  it("catches a metric-only defect the contrast check alone passes", () => {
    const ringless = extendTheme(getTheme("light"), {
      borderWidth: { strong: 0 },
    });

    expect(themeContrastFailures(ringless)).toEqual([]);
    expect(kinds(themeFailures(ringless))).toEqual(["metric"]);
  });

  it("catches a format-only defect the contrast check alone passes", () => {
    const tinted = extendTheme(getTheme("light"), {
      colors: { shadow: "black" },
    });

    expect(themeContrastFailures(tinted)).toEqual([]);
    expect(kinds(themeFailures(tinted))).toEqual(["color"]);
  });

  it("catches a contrast-only defect with its pair intact", () => {
    const erased = extendTheme(getTheme("light"), {
      colors: { foreground: lightColors.background },
    });

    expect(themeColorFailures(erased)).toEqual([]);
    expect(themeMetricFailures(erased)).toEqual([]);
    expect(themeFailures(erased)).toContainEqual({
      kind: "contrast",
      foreground: "foreground",
      background: "background",
      pairClass: "body",
      floor: contrastFloors.default.body,
      ratio: 1,
    });
  });

  it("passes the requested contrast level to the contrast half", () => {
    expect(themeFailures(getTheme("light"))).toEqual([]);
    expect(kinds(themeFailures(getTheme("light"), "high"))).toContain(
      "contrast",
    );
  });

  it("runs the documented examples", () => {
    expect(brandFailures).toEqual([]);
    expect(new Set(kinds(brokenFailures))).toEqual(
      new Set(["color", "typeface", "contrast", "metric"]),
    );
    expect(brandTheme.name).toBe("Acme");
  });
});
