/**
 * Guards the defect plan 345 fixes: plan 063 skipped a platform style's
 * elevation at high contrast because a level then carried its own colour.
 * Plan 085 made a level geometry plus an alpha over the theme's `shadow` tint,
 * so skipping it now only removes the platform's depth — every AAA variant
 * painted the identity's shadows while the docs toggle promised a platform
 * preview. This file fails without the fix.
 */

import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import { alpha } from "./color.js";
import { themeContrastFailures } from "./contrast.js";
import {
  elevationLevels,
  elevationShadow,
  type ElevationShape,
} from "./elevation.js";
import {
  getPlatformRecipeTheme,
  platformRecipes,
  platformRecipeNames,
} from "./platform-recipes.js";
import { platformStyles } from "./platforms.js";
import { resolveHighContrastPlatformTheme } from "./platforms.example.js";
import {
  applyPlatformStyle,
  getPlatformTheme,
  getTheme,
  highContrastLightTheme,
  lightTheme,
  themeModes,
  type Theme,
} from "./theme.js";

const realVariants = ["darwin", "linux", "win32"] as const;
const modes = themeModes;

const firstLevel = (levels: ReadonlyArray<ElevationShape>): ElevationShape => {
  const [level] = levels;
  if (level === undefined) {
    throw new Error("a shipped elevation level must carry one shape");
  }
  return level;
};

/** A level with its opacity zeroed, so two geometries compare as shapes. */
const geometry = (
  levels: ReadonlyArray<ElevationShape>,
): ReadonlyArray<ElevationShape> =>
  levels.map((shape) => ({ ...shape, alpha: 0 }));

const levelKey = (level: ElevationShape): string =>
  `${level.offsetX},${level.offsetY},${level.blurRadius},${level.spreadRadius},${level.alpha}`;

const elevationKey = (elevation: Theme["elevation"]): string =>
  [elevation.sm, elevation.md, elevation.lg]
    .map((levels) => levels.map(levelKey).join(";"))
    .join("|");

/** Every shipped style theme: the identity, three variants and two recipes. */
const shipped: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

describe("high-contrast platform elevation", () => {
  it("gives every high-contrast variant its platform's geometry", () => {
    realVariants.forEach((platform) => {
      modes.forEach((mode) => {
        const themed = getPlatformTheme(platform, mode, "high");
        const base = getTheme(mode, "high");
        elevationLevels.forEach((level) => {
          const styleLevels = platformStyles[platform].elevation[mode][level];
          if (styleLevels === undefined) {
            return;
          }
          expect(
            geometry(themed.elevation[level]),
            `${platform} ${mode} ${level}`,
          ).toEqual(geometry(styleLevels));
          expect(
            themed.elevation[level][0]?.alpha,
            `${platform} ${mode} ${level} alpha`,
          ).toBe(base.elevation[level][0]?.alpha);
        });
      });
    });
  });

  it("gives every high-contrast recipe its platform's geometry", () => {
    platformRecipeNames.forEach((recipe) => {
      modes.forEach((mode) => {
        const themed = getPlatformRecipeTheme(recipe, mode, "high");
        const base = getTheme(mode, "high");
        elevationLevels.forEach((level) => {
          const styleLevels = platformRecipes[recipe].elevation[mode][level];
          if (styleLevels === undefined) {
            return;
          }
          expect(
            geometry(themed.elevation[level]),
            `${recipe} ${mode} ${level}`,
          ).toEqual(geometry(styleLevels));
          expect(
            themed.elevation[level][0]?.alpha,
            `${recipe} ${mode} ${level} alpha`,
          ).toBe(base.elevation[level][0]?.alpha);
        });
      });
    });
  });

  it("gives each high-contrast variant a depth that differs from the identity", () => {
    const same = realVariants.filter((platform) =>
      modes.every(
        (mode) =>
          elevationKey(getPlatformTheme(platform, mode, "high").elevation) ===
          elevationKey(getTheme(mode, "high").elevation),
      ),
    );
    expect(same).toEqual([]);
  });

  it("keeps the AAA shadow tint and its opacity while taking the platform geometry", () => {
    const shape = firstLevel(platformStyles.linux.elevation.light.md ?? []);
    const identity = firstLevel(highContrastLightTheme.elevation.md);
    const high = getPlatformTheme("linux", "light", "high");

    expect(elevationShadow(high, "md")).toEqual({
      offsetX: shape.offsetX,
      offsetY: shape.offsetY,
      blurRadius: shape.blurRadius,
      spreadRadius: shape.spreadRadius,
      color: alpha(highContrastLightTheme.colors.shadow, identity.alpha),
    });
    expect(shape.offsetY).not.toBe(identity.offsetY);
    expect(shape.alpha).not.toBe(identity.alpha);
    // The AAA light tint is black; the identity light tint is graphite. Using
    // the platform's tint instead of the base's would produce the identity
    // colour here.
    expect(elevationShadow(high, "md")?.color).not.toBe(
      alpha(lightTheme.colors.shadow, identity.alpha),
    );
  });

  it("keeps the AAA dark light tint and its own opacity through a platform", () => {
    const base = getTheme("dark", "high");
    expect(base.colors.shadow).toBe("#FFFFFF");

    realVariants.forEach((platform) => {
      const themed = getPlatformTheme(platform, "dark", "high");
      expect(themed.colors.shadow, platform).toBe("#FFFFFF");
      expect(elevationShadow(themed, "lg")?.color, platform).toBe("#FFFFFF2E");
      expect(themed.elevation.lg[0]?.alpha, platform).toBe(
        base.elevation.lg[0]?.alpha,
      );
    });
  });

  it("keeps the high-contrast colour set and the contrast contract", () => {
    const high = shipped.filter(([, theme]) => theme.contrast === "high");
    expect(high).toHaveLength(12);
    high.forEach(([label, theme]) => {
      expect(theme.colors, label).toEqual(getTheme(theme.mode, "high").colors);
    });
    shipped.forEach(([label, theme]) => {
      expect(themeContrastFailures(theme), label).toEqual([]);
    });
  });

  it("leaves the Default variant and a shape-only style on the base", () => {
    modes.forEach((mode) => {
      expect(getPlatformTheme("default", mode, "high")).toBe(
        getTheme(mode, "high"),
      );
    });
    const shapeOnly = applyPlatformStyle(
      highContrastLightTheme,
      { ...platformStyles.default, elevation: { light: {}, dark: {} } },
      "high",
    );
    expect(shapeOnly.elevation).toEqual(highContrastLightTheme.elevation);
  });

  it("resolves the documented high-contrast preview helper", () => {
    expect(resolveHighContrastPlatformTheme("dark", "win32")).toEqual(
      getPlatformTheme("win32", "dark", "high"),
    );
    expect(resolveHighContrastPlatformTheme("light", "linux").contrast).toBe(
      "high",
    );
  });
});
