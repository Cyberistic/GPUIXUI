/**
 * Guards the defect plan 531 fixes: `themeMetricFailures` promised that every
 * numeric member of every metric group is finite, but the `finite` pass was a
 * hand-maintained list per group. Plan 530 had to add nine `Dimensions` members
 * to that list by hand; the next field added to a group — a dimension, a spacing
 * step, a size in a copied `PlatformStyle` — reached the renderer ungoverned and
 * the check returned `[]` while the JSDoc and both documents claimed it could
 * not. The colour half closed the same class of gap with `colorRoles` (plan 086).
 *
 * `metricMembers` is the published index of the walked domain and
 * `themeMetricFailures` walks each group value instead of listing it. The
 * unlisted-member cases fail on the pre-fix code — the hand list does not name
 * the extra field — and pass with the walk. The runtime-agreement case uses a
 * second walker written here, not the one in `metrics.ts`: two independent
 * implementations disagreeing is the signal that the index drifted.
 */
import { describe, expect, it } from "vitest";
import type { ElevationShape } from "./elevation.js";
import {
  metricGroups,
  metricMembers,
  themeMetricFailures,
  type MetricGroup,
} from "./metrics.js";
import { motionLevels, motionPhases } from "./motion.js";
import { extendTheme, lightTheme } from "./theme.js";

/** A complete shadow level, so one field varies at a time. */
const mdShape: ElevationShape = {
  offsetX: 0,
  offsetY: 4,
  blurRadius: 12,
  spreadRadius: -2,
  alpha: 0.12,
};

/** Every numeric leaf of a group value, named the way a failure names it. */
const numericPaths = (value: unknown, prefix = ""): ReadonlyArray<string> => {
  if (typeof value === "number") {
    return [prefix];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      numericPaths(entry, `${prefix}[${index}]`),
    );
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, entry]) =>
      numericPaths(entry, prefix === "" ? key : `${prefix}.${key}`),
    );
  }
  return [];
};

/**
 * An elevation failure names the entry it measured (`md[0].offsetX`) while the
 * index names the field once per level (`md.offsetX`): the rule reads every
 * entry in a level.
 */
const withoutIndex = (member: string): string =>
  member.replaceAll(/\[\d+\]/g, "");

/** The numeric leaves a resolved group carries today. */
const runtimeMembers = (
  group: MetricGroup,
  theme = lightTheme,
): ReadonlyArray<string> => numericPaths(theme[group]);

describe("the metric member index", () => {
  it("indexes the ten groups in documentation order", () => {
    expect(Object.keys(metricMembers)).toEqual([...metricGroups]);
  });

  it("names every member once, and names it", () => {
    metricGroups.forEach((group) => {
      const names = metricMembers[group];
      expect(new Set(names).size, group).toBe(names.length);
      names.forEach((name) => expect(name.trim(), group).not.toBe(""));
    });
  });

  it("agrees with the numeric leaves each shipped group carries", () => {
    // The shipped `overlay` level is empty and therefore has no leaves; a
    // consumer can define it (plan 369), so the walk is measured on a theme
    // that does.
    const defined = extendTheme(lightTheme, {
      elevation: { overlay: [mdShape] },
    });
    metricGroups.forEach((group) => {
      const runtime = runtimeMembers(
        group,
        group === "elevation" ? defined : lightTheme,
      );
      const indexed =
        group === "elevation"
          ? metricMembers[group]
          : // The shipped easings are named strings, so only the timings are
            // numeric leaves today; the index still owns the tuple form.
            metricMembers[group].filter((name) => !name.startsWith("ease."));
      expect(
        new Set(group === "elevation" ? runtime.map(withoutIndex) : runtime),
        group,
      ).toEqual(new Set(indexed));
    });
  });

  it("owns every easing point a theme may replace with a tuple", () => {
    const easing = metricMembers.motion.filter((name) =>
      name.startsWith("ease."),
    );
    expect(easing).toEqual(
      motionPhases.flatMap((phase) =>
        [0, 1, 2, 3].map((point) => `ease.${phase}[${point}]`),
      ),
    );
    expect(metricMembers.motion).toEqual(
      expect.arrayContaining([...motionLevels]),
    );
  });
});

describe("the finite rule walks the group", () => {
  it("reports a dimension the hand-written list would not have named", () => {
    // A variable, not a fresh literal: the extra property is structurally
    // assignable to `Partial<Dimensions>` and `mergeDefined` keeps it, which is
    // what a newly shipped field looks like before the contract learns it.
    const extended = {
      ...lightTheme.dimensions,
      segmentedControlWidth: Number.NaN,
    };
    const themed = extendTheme(lightTheme, { dimensions: extended });
    expect(themeMetricFailures(themed)).toEqual([
      {
        group: "dimensions",
        member: "segmentedControlWidth",
        rule: "finite",
        actual: Number.NaN,
        bound: 0,
      },
    ]);
  });

  it("reports an unlisted member outside the dimensions group too", () => {
    const extended = { ...lightTheme.iconSize, xxl: Number.NaN };
    const themed = extendTheme(lightTheme, { iconSize: extended });
    expect(themeMetricFailures(themed)).toEqual([
      {
        group: "iconSize",
        member: "xxl",
        rule: "finite",
        actual: Number.NaN,
        bound: 0,
      },
    ]);
  });

  it("keeps a finite value outside its range on the range rule", () => {
    const themed = extendTheme(lightTheme, {
      elevation: { md: [{ ...mdShape, alpha: 1.5 }] },
    });
    expect(themeMetricFailures(themed)).toEqual([
      {
        group: "elevation",
        member: "md[0].alpha",
        rule: "within",
        actual: 1.5,
        bound: 1,
      },
    ]);
  });
});
