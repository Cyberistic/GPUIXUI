/**
 * Guards the defect plan 358 fixes: the extension mechanism held an edited
 * theme's **colours** to the library's floors (plan 071) and left every metric
 * unguarded. The invariants lived in test-only code asserted on the shipped
 * constants, so an edited theme could zero `borderWidth.strong` — the spread of
 * `focusRing`, the only focus indicator GPUix 0.10.0 can draw — clip a type
 * role's leading, invert a named size ladder or ship a `NaN` elevation alpha
 * (`alpha()` then falls back to the opaque tint) and still get `[]` from
 * `themeContrastFailures`.
 *
 * Every case below fails without its rule in `metrics.ts`. The shipped-theme
 * case fails if a value moves out of a ladder, the per-rule cases fail if the
 * rule is removed, and the coverage case fails if a group ships unmeasured.
 */
import { describe, expect, it } from "vitest";
import { themeContrastFailures } from "./contrast.js";
import type { ElevationShape } from "./elevation.js";
import {
  compactFailures,
  ringlessFailures,
  squarishFailures,
  stretchedFailures,
} from "./metrics.example.js";
import {
  metricGroups,
  themeMetricFailures,
  type MetricFailure,
} from "./metrics.js";
import {
  getPlatformRecipeTheme,
  platformRecipeNames,
} from "./platform-recipes.js";
import { platformNames } from "./platforms.js";
import {
  extendTheme,
  getPlatformTheme,
  getTheme,
  lightTheme,
  themeContrasts,
  themeModes,
  type Theme,
} from "./theme.js";

/** Every shipped set: identity, platform variant and recipe, in both modes. */
const shipped: ReadonlyArray<readonly [string, Theme]> = [
  ...themeModes.flatMap((mode) =>
    themeContrasts.map(
      (contrast) => [`${mode}/${contrast}`, getTheme(mode, contrast)] as const,
    ),
  ),
  ...platformNames.flatMap((platform) =>
    themeModes.map(
      (mode) =>
        [`${platform}/${mode}`, getPlatformTheme(platform, mode)] as const,
    ),
  ),
  ...platformRecipeNames.flatMap((recipe) =>
    themeModes.map(
      (mode) =>
        [
          `recipe:${recipe}/${mode}`,
          getPlatformRecipeTheme(recipe, mode),
        ] as const,
    ),
  ),
];

/** A complete md level, so a case can vary one field without shipped data. */
const mdShape: ElevationShape = {
  offsetX: 0,
  offsetY: 4,
  blurRadius: 12,
  spreadRadius: -2,
  alpha: 0.12,
};

/** The failures a partial override produces. */
const failuresOf = (overrides: Parameters<typeof extendTheme>[1]) =>
  themeMetricFailures(extendTheme(lightTheme, overrides));

describe("theme metric contract", () => {
  it("has every shipped set to check", () => {
    expect(shipped).toHaveLength(
      themeModes.length * themeContrasts.length +
        platformNames.length * themeModes.length +
        platformRecipeNames.length * themeModes.length,
    );
  });

  it("passes every shipped theme, platform variant and recipe", () => {
    shipped.forEach(([label, theme]) => {
      expect(themeMetricFailures(theme), label).toEqual([]);
    });
  });

  it("passes the identity theme and the executed example", () => {
    expect(themeMetricFailures(lightTheme)).toEqual([]);
    expect(compactFailures).toEqual([]);
    expect(ringlessFailures).toHaveLength(1);
    expect(stretchedFailures).toHaveLength(1);
    expect(squarishFailures).toHaveLength(1);
  });

  it("states the gap: a ringless theme passes the colour check", () => {
    const ringless = extendTheme(lightTheme, { borderWidth: { strong: 0 } });
    expect(themeContrastFailures(ringless)).toEqual([]);
    expect(themeMetricFailures(ringless)).toEqual([
      {
        group: "borderWidth",
        member: "strong",
        rule: "positive",
        actual: 0,
        bound: 0,
      },
    ]);
  });

  it("reports a type role whose leading is shorter than its size", () => {
    expect(failuresOf({ typography: { body: { lineHeight: 12 } } })).toEqual([
      {
        group: "typography",
        member: "body.lineHeight",
        rule: "at-least",
        actual: 12,
        bound: 14,
      },
    ]);
  });

  it("reports a smallest control that cannot fit its label", () => {
    expect(failuresOf({ density: { controlHeight: { sm: 19 } } })).toEqual([
      {
        group: "density",
        member: "controlHeight.sm",
        rule: "at-least",
        actual: 19,
        bound: 20,
      },
    ]);
  });

  it("reports an inverted density ladder", () => {
    const failures = failuresOf({ density: { controlHeight: { md: 20 } } });
    expect(failures).toEqual([
      {
        group: "density",
        member: "controlHeight.md",
        rule: "non-decreasing",
        actual: 20,
        bound: 28,
      },
    ]);
  });

  it("reports a rounded square corner and a pill that does not round", () => {
    expect(failuresOf({ radius: { none: 6 } })).toEqual([
      {
        group: "radius",
        member: "none",
        rule: "zero",
        actual: 6,
        bound: 0,
      },
    ]);
    expect(failuresOf({ radius: { full: 8 } })).toEqual([
      {
        group: "radius",
        member: "full",
        rule: "at-least",
        actual: 8,
        bound: 12,
      },
      {
        group: "radius",
        member: "full",
        rule: "at-least",
        actual: 8,
        bound: 18,
      },
      {
        group: "radius",
        member: "full",
        rule: "at-least",
        actual: 8,
        bound: 20,
      },
    ]);
  });

  it("reports a pill radius that leaves the largest avatar a rounded square", () => {
    // 18 satisfies the control bound (controlHeight.lg / 2) but not the avatar
    // bound (avatarSize.lg / 2 = 20), so the 40px avatar is not a circle.
    expect(failuresOf({ radius: { full: 18 } })).toEqual([
      {
        group: "radius",
        member: "full",
        rule: "at-least",
        actual: 18,
        bound: 20,
      },
    ]);

    // Exactly half the largest avatar is round, and is the intended edit.
    expect(failuresOf({ radius: { full: 20 } })).toEqual([]);
  });

  it("reports an elevation alpha the colour helper cannot parse", () => {
    const broken = extendTheme(lightTheme, {
      elevation: { md: [{ ...mdShape, alpha: Number.NaN }] },
    });
    const failures: ReadonlyArray<MetricFailure> = themeMetricFailures(broken);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.group).toBe("elevation");
    expect(failures[0]?.member).toBe("md[0].alpha");
    expect(failures[0]?.rule).toBe("within");
    expect(failures[0]?.actual).toBeNaN();

    expect(
      failuresOf({ elevation: { md: [{ ...mdShape, alpha: 1.5 }] } }),
    ).toEqual([
      {
        group: "elevation",
        member: "md[0].alpha",
        rule: "within",
        actual: 1.5,
        bound: 1,
      },
    ]);
  });

  it("reports elevation geometry the renderer cannot paint", () => {
    const broken = extendTheme(lightTheme, {
      elevation: { md: [{ ...mdShape, offsetX: Number.NaN }] },
    });
    const failures = themeMetricFailures(broken);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.group).toBe("elevation");
    expect(failures[0]?.member).toBe("md[0].offsetX");
    expect(failures[0]?.rule).toBe("finite");
    expect(failures[0]?.actual).toBeNaN();

    // A negative offset or spread is a direction, not breakage: the shipped
    // light level already ships a negative spread.
    expect(
      failuresOf({
        elevation: {
          md: [{ ...mdShape, offsetX: -4, offsetY: -2, spreadRadius: -8 }],
        },
      }),
    ).toEqual([]);

    // Infinite is finite-checked but not sign-checked: one failure, not two.
    const infinite = failuresOf({
      elevation: { md: [{ ...mdShape, blurRadius: Number.POSITIVE_INFINITY }] },
    });
    expect(infinite.map(({ member, rule }) => `${member}:${rule}`)).toEqual([
      "md[0].blurRadius:finite",
    ]);
  });

  it("reports a row shorter than the default control", () => {
    // The ladder stays valid (sm 28 < md 40 < lg 44) and the row still fits a
    // body line (20), so the only broken rule is the control it holds.
    expect(
      failuresOf({
        density: { controlHeight: { md: 40, lg: 44 }, rowHeight: 32 },
      }),
    ).toEqual([
      {
        group: "density",
        member: "rowHeight",
        rule: "at-least",
        actual: 32,
        bound: 40,
      },
    ]);
  });

  it("reports a negative motion timing twice: sign and ladder", () => {
    expect(failuresOf({ motion: { fast: -140 } })).toEqual([
      {
        group: "motion",
        member: "fast",
        rule: "non-negative",
        actual: -140,
        bound: 0,
      },
      {
        group: "motion",
        member: "fast",
        rule: "non-decreasing",
        actual: -140,
        bound: 120,
      },
    ]);
  });

  it("reports a zero width and an inverted preview range", () => {
    expect(failuresOf({ dimensions: { toastWidth: 0 } })).toEqual([
      {
        group: "dimensions",
        member: "toastWidth",
        rule: "positive",
        actual: 0,
        bound: 0,
      },
    ]);
    expect(failuresOf({ dimensions: { previewCardMinWidth: 400 } })).toEqual([
      {
        group: "dimensions",
        member: "previewCardMaxWidth",
        rule: "increasing",
        actual: 360,
        bound: 400,
      },
    ]);
  });

  it("reports an icon larger than the smallest control", () => {
    // The icon ladder must still step, so the size is raised with its larger
    // neighbours; only the fit against the smallest control is broken.
    expect(
      failuresOf({
        density: { controlHeight: { sm: 20 } },
        iconSize: { md: 21, lg: 22, xl: 24 },
      }),
    ).toEqual([
      {
        group: "iconSize",
        member: "md",
        rule: "at-most",
        actual: 21,
        bound: 20,
      },
    ]);
  });

  it("indexes the ten governed groups in documentation order", () => {
    expect(metricGroups).toHaveLength(10);
    expect(metricGroups).toEqual([
      "typography",
      "borderWidth",
      "density",
      "dimensions",
      "iconSize",
      "avatarSize",
      "radius",
      "spacing",
      "elevation",
      "motion",
    ]);
  });

  it("governs every group it indexes", () => {
    const broken: ReadonlyArray<Parameters<typeof extendTheme>[1]> = [
      { typography: { body: { lineHeight: 12 } } },
      { borderWidth: { strong: 0 } },
      { density: { controlHeight: { sm: 19 } } },
      { dimensions: { toastWidth: 0 } },
      { iconSize: { md: 28 } },
      { avatarSize: { md: 20 } },
      { radius: { none: 6 } },
      { spacing: { md: 0 } },
      { elevation: { md: [{ ...mdShape, alpha: 2 }] } },
      { motion: { fast: -140 } },
    ];
    const observed = new Set(
      broken.flatMap((overrides) =>
        failuresOf(overrides).map((failure) => failure.group),
      ),
    );
    expect([...observed].toSorted()).toEqual([...metricGroups].toSorted());
  });
});
