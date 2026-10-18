/**
 * Guards the defect plan 370 fixes: `FontWeight` was the four shipped literals
 * (`400 | 500 | 600 | 700`), so a brand could not name a weight its installed
 * family provides (a variable font's `450` body or an `800` display), and
 * `themeMetricFailures` never read the member. A probe on the shipped light
 * theme returned `[]` for `NaN`, `0`, `-1` and `1001` on eight roles while
 * `textStyle` handed each value to the renderer unchanged; `body` and
 * `bodyStrong` were caught only incidentally when the weight-variant ladder saw
 * a negative or a `NaN`.
 *
 * Every case below fails without the `weighable` rule in `metrics.ts`; the
 * weight cases fail to compile on the pre-fix literal union, which is the type
 * half of the same bug.
 */
import { describe, expect, it } from "vitest";
import { themeContrastFailures } from "./contrast.js";
import { themeMetricFailures, type MetricFailure } from "./metrics.js";
import {
  getPlatformRecipeTheme,
  platformRecipeNames,
} from "./platform-recipes.js";
import { platformNames } from "./platforms.js";
import { textStyle } from "./styles.js";
import {
  extendTheme,
  getPlatformTheme,
  getTheme,
  lightTheme,
  themeContrasts,
  themeModes,
  type Theme,
} from "./theme.js";
import { textRoles } from "./typography.js";

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

const weightFailure = (
  rule: MetricFailure["rule"],
  actual: number,
  bound: number,
): MetricFailure => ({
  group: "typography",
  member: "display.fontWeight",
  rule,
  actual,
  bound,
});

describe("the font weight contract", () => {
  it("reports a non-finite weight it cannot select", () => {
    expect(
      failuresOf({ typography: { display: { fontWeight: Number.NaN } } }),
    ).toEqual([weightFailure("finite", Number.NaN, 0)]);
  });

  it("reports a zero weight below the CSS range", () => {
    expect(failuresOf({ typography: { display: { fontWeight: 0 } } })).toEqual([
      weightFailure("at-least", 0, 1),
    ]);
  });

  it("reports a negative weight below the CSS range", () => {
    expect(failuresOf({ typography: { display: { fontWeight: -1 } } })).toEqual(
      [weightFailure("at-least", -1, 1)],
    );
  });

  it("reports a weight above the CSS range", () => {
    expect(
      failuresOf({ typography: { display: { fontWeight: 1001 } } }),
    ).toEqual([weightFailure("at-most", 1001, 1000)]);
  });

  it("reports an infinite weight once, not as a range miss too", () => {
    expect(
      failuresOf({ typography: { display: { fontWeight: Infinity } } }),
    ).toEqual([weightFailure("finite", Infinity, 0)]);
  });

  it("accepts an intermediate weight a variable family provides", () => {
    expect(failuresOf({ typography: { body: { fontWeight: 450 } } })).toEqual(
      [],
    );
  });

  it("accepts a heavier weight the shipped scale does not use", () => {
    expect(
      failuresOf({ typography: { display: { fontWeight: 800 } } }),
    ).toEqual([]);
  });

  it("hands the authored weight to the renderer unchanged", () => {
    const edited = extendTheme(lightTheme, {
      typography: { display: { fontWeight: 800 } },
    });
    expect(textStyle(edited, "display").fontWeight).toBe(800);
  });

  it("governs every text role's weight", () => {
    const members = textRoles.map((role) => `${role}.fontWeight`);
    const reported = textRoles.flatMap((role) => {
      const edited = extendTheme(lightTheme, {
        typography: { [role]: { fontWeight: Number.NaN } },
      });
      return themeMetricFailures(edited)
        .filter(
          (failure) =>
            failure.rule === "finite" &&
            failure.member === `${role}.fontWeight`,
        )
        .map((failure) => failure.member);
    });
    expect(new Set(reported)).toEqual(new Set(members));
    expect(reported).toHaveLength(textRoles.length);
  });

  it("keeps the emphasis role heavier than body", () => {
    expect(
      failuresOf({
        typography: {
          bodyStrong: { fontWeight: lightTheme.typography.body.fontWeight },
        },
      }),
    ).toContainEqual({
      group: "typography",
      member: "bodyStrong.fontWeight",
      rule: "increasing",
      actual: lightTheme.typography.body.fontWeight,
      bound: lightTheme.typography.body.fontWeight,
    });
  });

  it("passes every shipped theme, platform variant and recipe", () => {
    shipped.forEach(([label, theme]) => {
      expect(themeMetricFailures(theme), label).toEqual([]);
    });
  });
});
