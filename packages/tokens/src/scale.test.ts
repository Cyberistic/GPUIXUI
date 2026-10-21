import { describe, expect, it } from "vitest";
import {
  avatarSize,
  densityPresets,
  spacing,
  type ControlSize,
  type DensityName,
} from "./scale.js";

const sizes: readonly ControlSize[] = ["sm", "md", "lg"];
const presetNames = ["compact", "comfortable", "spacious"] as const;

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

describe("density presets", () => {
  it("orders control heights from compact to spacious", () => {
    ascendingDensities.forEach(([smaller, larger]) => {
      sizes.forEach((size) => {
        expect(
          densityPresets[smaller].controlHeight[size],
          `${smaller} < ${larger} (${size})`,
        ).toBeLessThan(densityPresets[larger].controlHeight[size]);
      });
    });
  });

  it("orders horizontal padding from compact to spacious", () => {
    ascendingDensities.forEach(([smaller, larger]) => {
      sizes.forEach((size) => {
        expect(
          densityPresets[smaller].controlPaddingX[size],
          `${smaller} < ${larger} (${size})`,
        ).toBeLessThan(densityPresets[larger].controlPaddingX[size]);
      });
    });
  });

  it("orders sizes within every preset", () => {
    presetNames.forEach((preset) => {
      expect(densityPresets[preset].controlHeight.sm).toBeLessThan(
        densityPresets[preset].controlHeight.md,
      );
      expect(densityPresets[preset].controlHeight.md).toBeLessThan(
        densityPresets[preset].controlHeight.lg,
      );
      expect(densityPresets[preset].rowHeight).toBeGreaterThan(0);
    });
  });
});

describe("avatar sizes", () => {
  it("increases strictly from xs to lg", () => {
    expect(avatarSize.xs).toBeLessThan(avatarSize.sm);
    expect(avatarSize.sm).toBeLessThan(avatarSize.md);
    expect(avatarSize.md).toBeLessThan(avatarSize.lg);
  });

  it("uses whole pixels", () => {
    Object.values(avatarSize).forEach((value) => {
      expect(Number.isInteger(value)).toBe(true);
    });
  });

  it("aligns the inline sizes with the text and row scales", () => {
    // 20px is the large icon, so an avatar sits optically level with a toolbar;
    // 26px is a 20px body line plus 3px of breathing room either side.
    expect(avatarSize.xs).toBe(20);
    expect(avatarSize.sm).toBe(26);
    expect(avatarSize.md).toBe(densityPresets.comfortable.controlHeight.md);
    expect(avatarSize.lg).toBe(densityPresets.spacious.controlHeight.lg);
  });
});
