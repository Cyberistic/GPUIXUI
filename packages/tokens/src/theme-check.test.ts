/**
 * Guards the gap plan 383 closes: the extension mechanism advertises one
 * guarantee but shipped separate checks — colour format, contrast and numeric
 * metrics — and each is total only over its own domain. The reference
 * introduces `themeContrastFailures` first, so a copied theme whose only defect
 * is an unpairable role (`scrollbar: "rebeccapurple"`) or a zero focus-ring
 * spread returned `[]` from the check a consumer is most likely to run alone;
 * the docs-site interlock row is the first real consumer of that mistake.
 * `themeFailures` composes them into one tagged list, and this suite proves the
 * composition neither drops a class nor hides a partial check. Plan 505 made
 * `shadow` a measured role, so an unparseable tint is now a contrast defect as
 * well as a colour one; the format-only case uses the remaining exempt role.
 *
 * Plan 385 adds the fourth class: a family name the runtime cannot resolve as
 * written, which no older check could see.
 *
 * Plan 392 adds the fifth: a text tier that is not a perceivable step below the
 * tier above it. `brokenTheme` lowers the secondary text role to the canvas
 * colour, which is both a contrast defect and an inverted hierarchy, so the
 * composition now covers five classes without a new example theme.
 *
 * Plan 502 adds the sixth: a pointer ladder that steps toward the canvas. The
 * broken theme's primary family is now lighter on hover and lighter still on
 * press in a light theme — the plan-097 defect — which the contrast check cannot
 * see because the step floor is direction-agnostic.
 *
 * Plan 540 adds the seventh: a role whose alpha channel is not the form it is
 * painted in. Neither a translucent elevation tint (`elevationShadow` replaces
 * the byte with the level's own alpha) nor a solid modal scrim changes a single
 * contrast pair, so this check is the only one that sees them.
 *
 * Plan 387 moves the shipped list to `shippedThemes`: this suite was one of the
 * hand-built enumerations that called itself "every shipped set" while covering
 * the recipes at the default contrast only (20 of the 24 sets).
 *
 * Plan 398 gives the set an owner: `themeChecks` indexes the kinds and
 * `ThemeFailureKind` derives from it, so the composition's order is asserted
 * against the index rather than a second hand-written list.
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
  themeDirectionFailures,
  themeFailures,
  themeMetricFailures,
  themeModes,
  themeOpacityFailures,
  themeTextTierFailures,
  themeTypefaceFailures,
  themeChecks,
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

  it(`returns exactly the ${themeChecks.length} checks' failures, tagged and grouped`, () => {
    expect(brokenFailures.length).toBe(
      themeColorFailures(brokenTheme).length +
        themeOpacityFailures(brokenTheme).length +
        themeTypefaceFailures(brokenTheme).length +
        themeContrastFailures(brokenTheme).length +
        themeTextTierFailures(brokenTheme).length +
        themeDirectionFailures(brokenTheme).length +
        themeMetricFailures(brokenTheme).length,
    );

    expect(new Set(kinds(brokenFailures))).toEqual(new Set(themeChecks));

    const lastColor = kinds(brokenFailures).lastIndexOf("color");
    const firstOpacity = kinds(brokenFailures).indexOf("opacity");
    const lastOpacity = kinds(brokenFailures).lastIndexOf("opacity");
    const firstTypeface = kinds(brokenFailures).indexOf("typeface");
    const lastTypeface = kinds(brokenFailures).lastIndexOf("typeface");
    const firstContrast = kinds(brokenFailures).indexOf("contrast");
    const lastContrast = kinds(brokenFailures).lastIndexOf("contrast");
    const firstHierarchy = kinds(brokenFailures).indexOf("hierarchy");
    const lastHierarchy = kinds(brokenFailures).lastIndexOf("hierarchy");
    const firstDirection = kinds(brokenFailures).indexOf("direction");
    const lastDirection = kinds(brokenFailures).lastIndexOf("direction");
    const firstMetric = kinds(brokenFailures).indexOf("metric");
    expect(lastColor).toBeLessThan(firstOpacity);
    expect(lastOpacity).toBeLessThan(firstTypeface);
    expect(lastTypeface).toBeLessThan(firstContrast);
    expect(lastContrast).toBeLessThan(firstHierarchy);
    expect(lastHierarchy).toBeLessThan(firstDirection);
    expect(lastDirection).toBeLessThan(firstMetric);
  });

  it("emits the index's kinds, in its order", () => {
    expect([...new Set(kinds(brokenFailures))]).toEqual([...themeChecks]);
  });

  it("names each failure's payload", () => {
    expect(brokenFailures).toContainEqual({
      kind: "color",
      role: "shadow",
      value: "black",
    });
    expect(brokenFailures).toContainEqual({
      kind: "opacity",
      role: "overlay",
      value: "#000000",
      expected: "translucent",
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
    expect(brokenFailures).toContainEqual({
      kind: "direction",
      ladder: "primary",
      from: "primary",
      to: "primaryHover",
      expected: "darker",
      fromLuminance: expect.any(Number),
      toLuminance: expect.any(Number),
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

  it("catches a direction-only defect the contrast check alone passes", () => {
    const inverted = extendTheme(getTheme("light"), {
      colors: {
        primary: "#1E1060",
        primaryHover: "#2A1A7A",
        primaryActive: "#372394",
      },
    });

    expect(themeContrastFailures(inverted)).toEqual([]);
    expect(kinds(themeFailures(inverted))).toEqual(["direction", "direction"]);
  });

  it("catches an opacity-only defect the contrast check alone passes", () => {
    const tinted = extendTheme(getTheme("light"), {
      colors: { shadow: "#191D2580" },
    });
    const scrimmed = extendTheme(getTheme("light"), {
      colors: { overlay: "#000000" },
    });

    expect(themeContrastFailures(tinted)).toEqual([]);
    expect(kinds(themeFailures(tinted))).toEqual(["opacity"]);
    expect(themeContrastFailures(scrimmed)).toEqual([]);
    expect(kinds(themeFailures(scrimmed))).toEqual(["opacity"]);
  });

  it("catches a format-only defect the contrast check alone passes", () => {
    const tinted = extendTheme(getTheme("light"), {
      colors: { scrollbar: "rebeccapurple" },
    });

    expect(themeContrastFailures(tinted)).toEqual([]);
    expect(kinds(themeFailures(tinted))).toEqual(["color"]);
  });

  it("reports an unparseable elevation tint through the contrast check too", () => {
    const tinted = extendTheme(getTheme("light"), {
      colors: { shadow: "black" },
    });
    const failures = themeContrastFailures(tinted);

    expect(failures.length).toBeGreaterThan(0);
    expect(failures.every(({ ratio }) => Number.isNaN(ratio))).toBe(true);
    expect([...new Set(kinds(themeFailures(tinted)))]).toEqual([
      "color",
      "contrast",
    ]);
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
    expect(new Set(kinds(brokenFailures))).toEqual(new Set(themeChecks));
    expect(brandTheme.name).toBe("Acme");
  });
});
