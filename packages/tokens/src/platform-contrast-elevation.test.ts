/**
 * Guards the defect plan 345 fixes: plan 063 skipped a platform style's
 * elevation at high contrast because a level then carried its own colour.
 * Plan 085 made a level geometry plus an alpha over the theme's `shadow` tint,
 * so skipping it now only removes the platform's depth — every AAA variant
 * painted the identity's shadows while the docs toggle promised a platform
 * preview. This file fails without the fix.
 */

import { describe, expect, it } from "vitest";
import { alpha } from "./color.js";
import { themeContrastFailures } from "./contrast.js";
import { elevationShadow, type ElevationShape } from "./elevation.js";
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
  themeContrasts,
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

const levelKey = (level: ElevationShape): string =>
  `${level.offsetX},${level.offsetY},${level.blurRadius},${level.spreadRadius},${level.alpha}`;

const elevationKey = (elevation: Theme["elevation"]): string =>
  [elevation.sm, elevation.md, elevation.lg]
    .map((levels) => levels.map(levelKey).join(";"))
    .join("|");

/** Every shipped style theme: the identity, three variants and two recipes. */
const shippedThemes = (): ReadonlyArray<readonly [string, Theme]> => [
  ...modes.flatMap((mode) =>
    themeContrasts.map((contrast): readonly [string, Theme] => [
      `identity ${mode} ${contrast}`,
      getTheme(mode, contrast),
    ]),
  ),
  ...realVariants.flatMap((platform) =>
    modes.flatMap((mode) =>
      themeContrasts.map((contrast): readonly [string, Theme] => [
        `${platform} ${mode} ${contrast}`,
        getPlatformTheme(platform, mode, contrast),
      ]),
    ),
  ),
  ...platformRecipeNames.flatMap((recipe) =>
    modes.flatMap((mode) =>
      themeContrasts.map((contrast): readonly [string, Theme] => [
        `${recipe} ${mode} ${contrast}`,
        getPlatformRecipeTheme(recipe, mode, contrast),
      ]),
    ),
  ),
];

describe("high-contrast platform elevation", () => {
  it("gives every high-contrast variant its platform's elevation", () => {
    realVariants.forEach((platform) => {
      modes.forEach((mode) => {
        expect(
          getPlatformTheme(platform, mode, "high").elevation,
          `${platform} ${mode}`,
        ).toEqual({
          ...getTheme(mode, "high").elevation,
          ...platformStyles[platform].elevation[mode],
        });
      });
    });
  });

  it("gives every high-contrast recipe its platform's elevation", () => {
    platformRecipeNames.forEach((recipe) => {
      modes.forEach((mode) => {
        expect(
          getPlatformRecipeTheme(recipe, mode, "high").elevation,
          `${recipe} ${mode}`,
        ).toEqual({
          ...getTheme(mode, "high").elevation,
          ...platformRecipes[recipe].elevation[mode],
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

  it("keeps the AAA shadow tint while taking the platform geometry", () => {
    const shape = firstLevel(platformStyles.linux.elevation.light.md ?? []);
    const identity = firstLevel(highContrastLightTheme.elevation.md);
    const high = getPlatformTheme("linux", "light", "high");

    expect(elevationShadow(high, "md")).toEqual({
      offsetX: shape.offsetX,
      offsetY: shape.offsetY,
      blurRadius: shape.blurRadius,
      spreadRadius: shape.spreadRadius,
      color: alpha(highContrastLightTheme.colors.shadow, shape.alpha),
    });
    expect(shape.offsetY).not.toBe(identity.offsetY);
    // The AAA light tint is black; the identity light tint is graphite. Using
    // the platform's tint instead of the base's would produce the identity
    // colour here.
    expect(elevationShadow(high, "md")?.color).not.toBe(
      alpha(lightTheme.colors.shadow, shape.alpha),
    );
  });

  it("keeps the high-contrast colour set and the contrast contract", () => {
    const high = shippedThemes().filter(
      ([, theme]) => theme.contrast === "high",
    );
    expect(high).toHaveLength(12);
    high.forEach(([label, theme]) => {
      expect(theme.colors, label).toEqual(getTheme(theme.mode, "high").colors);
    });
    shippedThemes().forEach(([label, theme]) => {
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
