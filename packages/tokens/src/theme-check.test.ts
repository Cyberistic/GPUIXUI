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
 *
 * Plan 387 moves the shipped list to `shippedThemes`: this suite was one of the
 * hand-built enumerations that called itself "every shipped set" while covering
 * the recipes at the default contrast only (20 of the 24 sets).
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  extendTheme,
  getTheme,
  lightColors,
  platformRecipeNames,
  platformVariants,
  shippedThemes,
  themeColorFailures,
  themeContrastFailures,
  themeContrasts,
  themeFailures,
  themeMetricFailures,
  themeModes,
  themeTypefaceFailures,
  type ShippedTheme,
} from "./index.js";
import {
  brandFailures,
  brandTheme,
  brokenFailures,
  brokenTheme,
} from "./theme-check.example.js";

/** How many shipped sets came from each axis. */
const sourceCount = (source: ShippedTheme["source"]): number =>
  shippedThemes.filter((set) => set.source === source).length;

const kinds = (failures: ReadonlyArray<{ readonly kind: string }>) =>
  failures.map((failure) => failure.kind);

describe("one total theme check", () => {
  it("covers every shipped set, not a sample", () => {
    expect(sourceCount("identity")).toBe(
      themeModes.length * themeContrasts.length,
    );
    expect(sourceCount("platform")).toBe(
      platformVariants.length * themeModes.length * themeContrasts.length,
    );
    expect(sourceCount("recipe")).toBe(
      platformRecipeNames.length * themeModes.length * themeContrasts.length,
    );
  });

  shippedThemes.forEach(({ theme }) => {
    it(`${theme.name}: passes every check through one call`, () => {
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
