/**
 * Guards the defect plan 364 fixes: the numeric contract's `motion` group
 * governed only the timing ladders, so three edits that the renderer cannot use
 * returned `[]` from `themeMetricFailures`.
 *
 * `pulse: Infinity` passes a non-decreasing ladder; a timing's sign was checked,
 * its finiteness was not, and the runtime's `validate_seconds` rejects a
 * non-finite duration. `motion.ease` was never read at all, so a cubic bezier
 * with a `NaN` control point or an x value outside `0…1` — both of which the
 * runtime's `validate_ease` rejects, after which `MotionState::invalid` drops
 * the whole transition — also returned `[]`. The pinned
 * `@gpuix/native@0.10.0` type accepts the tuple as four plain numbers.
 *
 * The rule must stay narrow: a y control point may overshoot, and a named easing
 * is constrained by `MotionEasing`, so neither is a numeric failure.
 */
import { describe, expect, it } from "vitest";
import { undriveableFailures } from "./metrics.example.js";
import { themeMetricFailures, type MetricFailure } from "./metrics.js";
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
  type ThemeOverrides,
} from "./theme.js";

/** Every shipped set: identity, platform variant and recipe, with AAA recipes. */
const shipped: ReadonlyArray<readonly [string, Theme]> = [
  ...themeModes.flatMap((mode) =>
    themeContrasts.map(
      (contrast) => [`${mode}/${contrast}`, getTheme(mode, contrast)] as const,
    ),
  ),
  ...platformNames.flatMap((platform) =>
    themeContrasts.flatMap((contrast) =>
      themeModes.map(
        (mode) =>
          [
            `${platform}/${contrast}/${mode}`,
            getPlatformTheme(platform, mode, contrast),
          ] as const,
      ),
    ),
  ),
  ...platformRecipeNames.flatMap((recipe) =>
    themeContrasts.flatMap((contrast) =>
      themeModes.map(
        (mode) =>
          [
            `recipe:${recipe}/${contrast}/${mode}`,
            getPlatformRecipeTheme(recipe, mode, contrast),
          ] as const,
      ),
    ),
  ),
];

const failuresOf = (overrides: ThemeOverrides): ReadonlyArray<MetricFailure> =>
  themeMetricFailures(extendTheme(lightTheme, overrides));

/** The five timing levels; `none` is governed by `zero`, not this list. */
const timingLevels = ["step", "fast", "normal", "slow", "pulse"] as const;

const brokenTimings: ReadonlyArray<readonly [string, ThemeOverrides]> = [
  ["step", { motion: { step: Number.POSITIVE_INFINITY } }],
  ["fast", { motion: { fast: Number.POSITIVE_INFINITY } }],
  ["normal", { motion: { normal: Number.POSITIVE_INFINITY } }],
  ["slow", { motion: { slow: Number.POSITIVE_INFINITY } }],
  ["pulse", { motion: { pulse: Number.POSITIVE_INFINITY } }],
];

describe("motion contract", () => {
  it("reports a non-finite timing on every level", () => {
    expect(timingLevels).toHaveLength(5);
    brokenTimings.forEach(([level, overrides]) => {
      // A level raised to infinity also breaks the ladder against the level
      // after it; the finite failure is the one this plan adds.
      expect(failuresOf(overrides), level).toContainEqual({
        group: "motion",
        member: level,
        rule: "finite",
        actual: Number.POSITIVE_INFINITY,
        bound: 0,
      });
    });

    // The last level has no successor, so its only failure is finiteness.
    expect(failuresOf({ motion: { pulse: Number.POSITIVE_INFINITY } })).toEqual(
      [
        {
          group: "motion",
          member: "pulse",
          rule: "finite",
          actual: Number.POSITIVE_INFINITY,
          bound: 0,
        },
      ],
    );
  });

  it("reports a non-finite control point", () => {
    const x = failuresOf({
      motion: { ease: { enter: [Number.NaN, 0, 0, 1] } },
    });
    expect(x).toHaveLength(1);
    expect(x[0]?.member).toBe("ease.enter[0]");
    expect(x[0]?.rule).toBe("within");
    expect(x[0]?.actual).toBeNaN();

    const y = failuresOf({
      motion: { ease: { exit: [0, Number.NaN, 1, 1] } },
    });
    expect(y).toHaveLength(1);
    expect(y[0]?.member).toBe("ease.exit[1]");
    expect(y[0]?.rule).toBe("finite");
    expect(y[0]?.actual).toBeNaN();
  });

  it("reports an x control point outside 0…1 on either side", () => {
    expect(
      failuresOf({ motion: { ease: { standard: [2, 0, 0, 1] } } }),
    ).toEqual([
      {
        group: "motion",
        member: "ease.standard[0]",
        rule: "within",
        actual: 2,
        bound: 1,
      },
    ]);
    expect(
      failuresOf({ motion: { ease: { linear: [0, 0, -0.2, 1] } } }),
    ).toEqual([
      {
        group: "motion",
        member: "ease.linear[2]",
        rule: "within",
        actual: -0.2,
        bound: 1,
      },
    ]);
  });

  it("keeps an overshoot y control point valid", () => {
    // A spring-like curve overshoots the target; the runtime constrains only the
    // two x values, so this is a design choice, not a broken transition.
    expect(
      failuresOf({ motion: { ease: { standard: [0.4, -0.5, 0.2, 1.5] } } }),
    ).toEqual([]);
  });

  it("passes every shipped set, whose easings are named", () => {
    shipped.forEach(([label, theme]) => {
      expect(themeMetricFailures(theme), label).toEqual([]);
      Object.values(theme.motion.ease).forEach((ease) => {
        expect(typeof ease, label).toBe("string");
      });
    });
  });

  it("names the undocumented transition in the executed example", () => {
    expect(undriveableFailures).toEqual([
      {
        group: "motion",
        member: "ease.enter[0]",
        rule: "within",
        actual: 2,
        bound: 1,
      },
    ]);
  });
});
