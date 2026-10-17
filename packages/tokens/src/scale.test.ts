import { describe, expect, it } from "vitest";
import {
  avatarSize,
  controlSizes,
  densityNames,
  densityPresets,
  spacing,
  type DensityName,
} from "./scale.js";

const ascendingSpacing = [
  [spacing["2xs"], spacing.xs],
  [spacing.xs, spacing.sm],
  [spacing.sm, spacing.md],
  [spacing.md, spacing.lg],
  [spacing.lg, spacing.xl],
  [spacing.xl, spacing["2xl"]],
  [spacing["2xl"], spacing["3xl"]],
  [spacing["3xl"], spacing["4xl"]],
  [spacing["4xl"], spacing["5xl"]],
] as const;

const ascendingDensities: readonly [DensityName, DensityName][] = [
  ["compact", "comfortable"],
  ["comfortable", "spacious"],
];

describe("spacing scale", () => {
  it("increases strictly from 2xs to 5xl", () => {
    ascendingSpacing.forEach(([smaller, larger]) => {
      expect(larger).toBeGreaterThan(smaller);
    });
  });

  it("never uses a negative value", () => {
    Object.values(spacing).forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("avatar size scale", () => {
  it("increases strictly from xs to lg", () => {
    expect(avatarSize.sm).toBeGreaterThan(avatarSize.xs);
    expect(avatarSize.md).toBeGreaterThan(avatarSize.sm);
    expect(avatarSize.lg).toBeGreaterThan(avatarSize.md);
  });

  it("gives every size a positive whole number of pixels", () => {
    Object.values(avatarSize).forEach((diameter) => {
      expect(Number.isInteger(diameter)).toBe(true);
      expect(diameter).toBeGreaterThan(0);
    });
  });
});

describe("density presets", () => {
  it("orders control heights from compact to spacious", () => {
    ascendingDensities.forEach(([smaller, larger]) => {
      controlSizes.forEach((size) => {
        expect(
          densityPresets[smaller].controlHeight[size],
          `${smaller} < ${larger} (${size})`,
        ).toBeLessThan(densityPresets[larger].controlHeight[size]);
      });
    });
  });

  it("orders horizontal padding from compact to spacious", () => {
    ascendingDensities.forEach(([smaller, larger]) => {
      controlSizes.forEach((size) => {
        expect(
          densityPresets[smaller].controlPaddingX[size],
          `${smaller} < ${larger} (${size})`,
        ).toBeLessThan(densityPresets[larger].controlPaddingX[size]);
      });
    });
  });

  it("orders sizes within every preset", () => {
    densityNames.forEach((preset) => {
      expect(densityPresets[preset].controlHeight.sm).toBeLessThan(
        densityPresets[preset].controlHeight.md,
      );
      expect(densityPresets[preset].controlHeight.md).toBeLessThan(
        densityPresets[preset].controlHeight.lg,
      );
      expect(densityPresets[preset].rowHeight).toBeGreaterThan(0);
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
