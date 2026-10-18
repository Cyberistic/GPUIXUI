/**
 * Guards the defect plan 368 fixes: `themeMetricFailures` added a `finite` rule
 * for elevation geometry (plan 360) and motion timings and easings (plan 364),
 * but the other eight groups accepted `Infinity`. A ladder's last step and a
 * standalone metric have no later rule to catch it, so `spacing["5xl"]`,
 * `radius.full`, `borderWidth.strong`, `iconSize.xl`, `density.rowHeight`,
 * `dimensions.toastWidth` and a display size of `Infinity` all returned `[]`
 * while the renderer casts each to `f32::INFINITY` — invalid layout it paints as
 * nothing, with no error (`packages/native/src/theme.rs` says so of the runtime's
 * own metrics, and `renderer.rs` casts a style's lengths unchecked).
 *
 * Each case below fails without the finite pass in `metrics.ts`.
 */
import { describe, expect, it } from "vitest";
import { themeContrastFailures } from "./contrast.js";
import { themeMetricFailures, type MetricFailure } from "./metrics.js";
import {
  getPlatformRecipeTheme,
  platformRecipeNames,
} from "./platform-recipes.js";
import { platformNames } from "./platforms.js";
import { dimensions } from "./scale.js";
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

/** The failures a partial override produces, with the colour check beside it. */
const failuresOf = (overrides: Parameters<typeof extendTheme>[1]) => {
  const edited = extendTheme(lightTheme, overrides);
  expect(themeContrastFailures(edited)).toEqual([]);
  return themeMetricFailures(edited);
};

const infinite = (
  group: MetricFailure["group"],
  member: string,
): MetricFailure => ({
  group,
  member,
  rule: "finite",
  actual: Infinity,
  bound: 0,
});

describe("the finite metric rule", () => {
  it("reports a non-finite type size and leading", () => {
    expect(
      failuresOf({
        typography: { display: { fontSize: Infinity, lineHeight: Infinity } },
      }),
    ).toEqual([
      infinite("typography", "display.fontSize"),
      infinite("typography", "display.lineHeight"),
    ]);
  });

  it("reports the last step of a spacing ladder", () => {
    // The last step has no successor, so no ladder comparison catches it.
    expect(failuresOf({ spacing: { "5xl": Infinity } })).toEqual([
      infinite("spacing", "5xl"),
    ]);
  });

  it("reports a non-finite pill radius", () => {
    expect(failuresOf({ radius: { full: Infinity } })).toEqual([
      infinite("radius", "full"),
    ]);
  });

  it("reports a non-finite focus-ring spread", () => {
    // `strong` is only checked for being positive, which infinity satisfies.
    expect(failuresOf({ borderWidth: { strong: Infinity } })).toEqual([
      infinite("borderWidth", "strong"),
    ]);
  });

  it("reports the last step of the icon ladder", () => {
    expect(failuresOf({ iconSize: { xl: Infinity } })).toEqual([
      infinite("iconSize", "xl"),
    ]);
  });

  it("reports a non-finite row height", () => {
    // The row also stops fitting the overlay's scroll height, which the
    // existing bound reports: raising a row must not clip every menu option.
    expect(failuresOf({ density: { rowHeight: Infinity } })).toEqual([
      infinite("density", "rowHeight"),
      {
        group: "dimensions",
        member: "overlayMaxHeight",
        rule: "at-least",
        actual: dimensions.overlayMaxHeight,
        bound: Infinity,
      },
    ]);
  });

  it("reports a non-finite surface dimension", () => {
    expect(failuresOf({ dimensions: { toastWidth: Infinity } })).toEqual([
      infinite("dimensions", "toastWidth"),
    ]);
  });

  it("reports a negative infinity as non-finite, not merely negative", () => {
    const failures = failuresOf({ spacing: { sm: -Infinity } });
    expect(failures).toContainEqual({
      group: "spacing",
      member: "sm",
      rule: "finite",
      actual: -Infinity,
      bound: 0,
    });
    expect(failures).toContainEqual({
      group: "spacing",
      member: "sm",
      rule: "non-negative",
      actual: -Infinity,
      bound: 0,
    });
  });

  it("leaves a finite negative to the sign rule", () => {
    const failures = failuresOf({ spacing: { sm: -4 } });
    expect(failures.some((failure) => failure.rule === "finite")).toBe(false);
    expect(failures).toContainEqual({
      group: "spacing",
      member: "sm",
      rule: "non-negative",
      actual: -4,
      bound: 0,
    });
  });

  it("passes every shipped theme, platform variant and recipe", () => {
    shipped.forEach(([label, theme]) => {
      expect(themeMetricFailures(theme), label).toEqual([]);
    });
  });
});
