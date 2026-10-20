import { describe, expect, it } from "vitest";
import {
  avatarSize,
  avatarSizeSteps,
  controlSizes,
  densityNames,
  densityPresets,
  spacing,
  spacingSteps,
  type Density,
  type DensityName,
} from "./scale.js";

/** `[smaller, larger]` for every neighbouring pair of an ordered index. */
const adjacent = <Step extends string>(
  steps: ReadonlyArray<Step>,
): ReadonlyArray<readonly [Step, Step]> =>
  steps.flatMap((step, index) => {
    const next = steps[index + 1];
    return next === undefined ? [] : ([[step, next]] as const);
  });

const ascendingSpacing = adjacent(spacingSteps);
const ascendingDensities = adjacent(densityNames);

/**
 * Why a preset does not rise above the one below it, as readable labels.
 *
 * The three density metrics are a ladder, not three independent numbers: a
 * preset whose rows shrink as density grows makes "compact" a lie even while
 * every individual metric is positive. `themeMetricFailures` holds the active
 * preset's own ladders, but no `Theme` holds all three presets — they are
 * shipped data — so the cross-preset order lives here.
 */
const presetOrderFailures = (
  presets: Readonly<Record<DensityName, Density>>,
): ReadonlyArray<string> =>
  ascendingDensities.flatMap(([smaller, larger]) => [
    ...controlSizes.flatMap((size) =>
      presets[larger].controlHeight[size] > presets[smaller].controlHeight[size]
        ? []
        : [`controlHeight.${size}: ${larger} is not above ${smaller}`],
    ),
    ...controlSizes.flatMap((size) =>
      presets[larger].controlPaddingX[size] >
      presets[smaller].controlPaddingX[size]
        ? []
        : [`controlPaddingX.${size}: ${larger} is not above ${smaller}`],
    ),
    ...(presets[larger].rowHeight > presets[smaller].rowHeight
      ? []
      : [`rowHeight: ${larger} is not above ${smaller}`]),
  ]);

describe("spacing scale", () => {
  it("increases strictly along the index", () => {
    expect(ascendingSpacing).toHaveLength(spacingSteps.length - 1);
    ascendingSpacing.forEach(([smaller, larger]) => {
      expect(spacing[larger]).toBeGreaterThan(spacing[smaller]);
    });
  });

  it("never uses a negative value", () => {
    Object.values(spacing).forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("avatar size scale", () => {
  it("increases strictly along the index", () => {
    const ascending = adjacent(avatarSizeSteps);
    expect(ascending).toHaveLength(avatarSizeSteps.length - 1);
    ascending.forEach(([smaller, larger]) => {
      expect(avatarSize[larger]).toBeGreaterThan(avatarSize[smaller]);
    });
  });

  it("gives every size a positive whole number of pixels", () => {
    Object.values(avatarSize).forEach((diameter) => {
      expect(Number.isInteger(diameter)).toBe(true);
      expect(diameter).toBeGreaterThan(0);
    });
  });
});

describe("density presets", () => {
  it("orders every preset pair on all three metrics", () => {
    expect(ascendingDensities).toHaveLength(densityNames.length - 1);
    expect(presetOrderFailures(densityPresets)).toEqual([]);
  });

  it("catches a preset ladder that steps the wrong way", () => {
    const inverted: Readonly<Record<DensityName, Density>> = {
      ...densityPresets,
      compact: { ...densityPresets.compact, rowHeight: 100 },
    };

    expect(presetOrderFailures(inverted)).toEqual([
      "rowHeight: comfortable is not above compact",
    ]);

    const squeezed: Readonly<Record<DensityName, Density>> = {
      ...densityPresets,
      spacious: {
        ...densityPresets.spacious,
        controlHeight: { ...densityPresets.spacious.controlHeight, md: 1 },
      },
    };

    expect(presetOrderFailures(squeezed)).toEqual([
      "controlHeight.md: spacious is not above comfortable",
    ]);
  });

  it("orders the control sizes the index holds inside every preset", () => {
    const sizes = adjacent(controlSizes);
    expect(sizes).toHaveLength(controlSizes.length - 1);
    densityNames.forEach((preset) => {
      expect(densityPresets[preset].rowHeight).toBeGreaterThan(0);
      sizes.forEach(([smaller, larger]) => {
        expect(
          densityPresets[preset].controlHeight[larger],
          `${preset}: ${larger} > ${smaller}`,
        ).toBeGreaterThan(densityPresets[preset].controlHeight[smaller]);
      });
    });
  });

  it("gives every size in the index a metric in every preset", () => {
    densityNames.forEach((preset) => {
      expect(
        Object.keys(densityPresets[preset].controlHeight).toSorted(),
      ).toEqual([...controlSizes].toSorted());
      expect(
        Object.keys(densityPresets[preset].controlPaddingX).toSorted(),
      ).toEqual([...controlSizes].toSorted());
    });
  });
});
