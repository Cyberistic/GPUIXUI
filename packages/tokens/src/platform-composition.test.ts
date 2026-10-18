/**
 * Guards the defect plan 374 fixes: `applyPlatformStyle` accepts any base,
 * including a theme that already carries another platform's style, and a style
 * only overrides the roles it names. Linux dark is the one shipped style that
 * names `destructiveSoft` (`#3A0B0D`, plan 091); macOS dark, Windows dark, XP
 * and Aero inherited the identity tint (`#66191B`). Applying any of them over a
 * Linux dark theme kept Linux's tint, which measures **1.0005:1** on macOS
 * dark's background and 1.0448:1 on Windows', under the 1.05:1 surface floor —
 * an invisible Alert or Badge produced by the documented call.
 *
 * This file fails without the fix: cases 1 and 2 report the four Linux-dark
 * compositions, and case 1 names the role that kept the wrong platform's value.
 */

import { describe, expect, it } from "vitest";
import { darkColors, palette } from "./color.js";
import {
  getPlatformRecipeTheme,
  platformRecipes,
  platformRecipeNames,
} from "./platform-recipes.js";
import { platformNames, platformStyles } from "./platforms.js";
import {
  applyPlatformStyle,
  createTheme,
  getPlatformTheme,
  getTheme,
  themeContrasts,
  themeModes,
  type Theme,
} from "./theme.js";
import {
  themeChecks,
  themeFailures,
  type ThemeFailure,
} from "./theme-check.js";

const modes = themeModes;
const levels = themeContrasts;
/** The styles that inherited the identity dark tint before plan 374 named it. */
const tintInheritors = ["darwin", "win32"] as const;

/** Every check a theme must pass, so a composition is held to all of them. */
const failuresOf = (theme: Theme): ReadonlyArray<ThemeFailure> =>
  themeFailures(theme);

/** The shipped styles a consumer can apply, keyed for a labelled failure. */
const appliedStyles = [
  ...Object.entries(platformStyles).map(
    ([name, style]) => [`style:${name}`, style] as const,
  ),
  ...Object.entries(platformRecipes).map(
    ([name, style]) => [`recipe:${name}`, style] as const,
  ),
];

/** Every shipped theme a consumer can use as the base of an application. */
const shippedBases = (mode: Theme["mode"], contrast: Theme["contrast"]) => [
  ["identity", getTheme(mode, contrast)] as const,
  ["createTheme", createTheme({ mode, contrast })] as const,
  ...platformNames.map(
    (platform) =>
      [
        `platform:${platform}`,
        getPlatformTheme(platform, mode, contrast),
      ] as const,
  ),
  ...platformRecipeNames.map(
    (recipe) =>
      [
        `recipe:${recipe}`,
        getPlatformRecipeTheme(recipe, mode, contrast),
      ] as const,
  ),
];

describe("a platform style applied over another platform", () => {
  it("keeps the applied dark style's own soft destructive tint", () => {
    const linux = getPlatformTheme("linux", "dark");

    expect(linux.colors.destructiveSoft).toBe(palette.red[950]);
    appliedStyles.forEach(([label, style]) => {
      const applied = applyPlatformStyle(linux, style);
      expect(applied.colors.destructiveSoft, label).toBe(
        style.colors.dark.destructiveSoft ?? linux.colors.destructiveSoft,
      );
      expect(failuresOf(applied), label).toEqual([]);
    });

    // The two styles that inherited the identity tint before the fix now name
    // it, so neither can keep Linux's `#3A0B0D` on its own canvas.
    tintInheritors.forEach((platform) => {
      const applied = applyPlatformStyle(linux, platformStyles[platform]);
      expect(applied.colors.destructiveSoft, platform).toBe(
        darkColors.destructiveSoft,
      );
    });
    platformRecipeNames.forEach((recipe) => {
      const applied = applyPlatformStyle(linux, platformRecipes[recipe]);
      expect(applied.colors.destructiveSoft, recipe).toBe(
        darkColors.destructiveSoft,
      );
    });
  });

  it(`holds every shipped base and applied style to all ${themeChecks.length} checks`, () => {
    const failures = modes.flatMap((mode) =>
      levels.flatMap((contrast) =>
        shippedBases(mode, contrast).flatMap(([baseName, base]) =>
          appliedStyles.flatMap(([styleName, style]) =>
            levels.flatMap((level) => {
              const label = `${mode}/${contrast} ${baseName} -> ${styleName} @${level}`;
              return failuresOf(applyPlatformStyle(base, style, level)).map(
                (failure) => `${label}: ${JSON.stringify(failure)}`,
              );
            }),
          ),
        ),
      ),
    );

    expect(failures).toEqual([]);
  });

  it("moves no shipped pixel: the named tint is the one inherited", () => {
    modes.forEach((mode) => {
      // At high contrast a platform applies shape only; the AAA palette's own
      // tint is already asserted by the platform suites.
      const identity = getTheme(mode, "default");
      platformNames.forEach((platform) => {
        const named =
          platformStyles[platform].colors[mode].destructiveSoft ??
          identity.colors.destructiveSoft;
        expect(
          getPlatformTheme(platform, mode).colors.destructiveSoft,
          `${platform} ${mode}`,
        ).toBe(named);
      });
      platformRecipeNames.forEach((recipe) => {
        const named =
          platformRecipes[recipe].colors[mode].destructiveSoft ??
          identity.colors.destructiveSoft;
        expect(
          getPlatformRecipeTheme(recipe, mode).colors.destructiveSoft,
          `${recipe} ${mode}`,
        ).toBe(named);
      });
    });
    // macOS and Windows dark now name the identity tint they already painted.
    tintInheritors.forEach((platform) => {
      expect(
        platformStyles[platform].colors.dark.destructiveSoft,
        platform,
      ).toBe(darkColors.destructiveSoft);
    });
  });

  it("lets both Windows recipes carry the Windows dark palette", () => {
    platformRecipeNames.forEach((recipe) => {
      expect(platformRecipes[recipe].colors.dark, recipe).toBe(
        platformStyles.win32.colors.dark,
      );
      expect(platformRecipes[recipe].colors.dark.destructiveSoft, recipe).toBe(
        darkColors.destructiveSoft,
      );
    });
  });
});
