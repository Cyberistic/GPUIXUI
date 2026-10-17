/**
 * Guards the copy-and-own contract one era over: Windows XP (Luna) and Windows
 * 7 (Aero) are plain `PlatformStyle` data reshaped from the Windows variant,
 * resolved through the same `applyPlatformStyle` path as a shipped variant, and
 * held to the same contrast floors in both modes. A recipe is not a fifth
 * platform — it must stay out of `platformNames` and `platformStyles` — and a
 * low-contrast value must fail this suite, because a documented theme the
 * package's own checker rejects is not a theme a consumer can ship.
 */

import { describe, expect, it } from "vitest";
import { colorRoles } from "./color.js";
import { contrastRatio, themeContrastFailures } from "./contrast.js";
import {
  getPlatformRecipeTheme,
  isPlatformRecipeName,
  platformRecipeNames,
  platformRecipes,
} from "./platform-recipes.js";
import { platformNames, platformStyles } from "./platforms.js";
import {
  getPlatformTheme,
  getTheme,
  themeModes,
  type ThemeMode,
} from "./theme.js";

const modes = themeModes;

describe("platform recipe index", () => {
  it("indexes every recipe once, in documented order", () => {
    expect(platformRecipeNames).toEqual(["xp", "aero"]);
    expect(new Set(platformRecipeNames).size).toBe(platformRecipeNames.length);
    expect(Object.keys(platformRecipes).toSorted()).toEqual(
      [...platformRecipeNames].toSorted(),
    );
  });

  it("narrows a stored or URL choice", () => {
    platformRecipeNames.forEach((name) => {
      expect(isPlatformRecipeName(name), name).toBe(true);
    });
    [
      "win32",
      "default",
      "darwin",
      "linux",
      "",
      "XP",
      null,
      undefined,
      42,
    ].forEach((value) => {
      expect(isPlatformRecipeName(value), String(value)).toBe(false);
    });
  });

  it("is not a platform axis member", () => {
    platformRecipeNames.forEach((name) => {
      expect(platformNames).not.toContain(name);
      expect(Object.keys(platformStyles)).not.toContain(name);
    });
  });
});

describe("platform recipe resolution", () => {
  modes.forEach((mode) => {
    platformRecipeNames.forEach((recipe) => {
      it(`${recipe} ${mode}: keeps the requested mode and labels the era`, () => {
        const theme = getPlatformRecipeTheme(recipe, mode);
        expect(theme.mode).toBe(mode);
        expect(theme.name).toContain(platformRecipes[recipe].types.label);
      });

      it(`${recipe} ${mode}: inherits every role the recipe does not name`, () => {
        const base = getTheme(mode).colors;
        const theme = getPlatformRecipeTheme(recipe, mode);
        const declared = platformRecipes[recipe].colors[mode];
        (
          [
            "destructive",
            "success",
            "warningSoft",
            "overlay",
            "scrollbar",
          ] as const
        ).forEach((role) => {
          expect(declared[role], `${recipe} ${mode} declares ${role}`).toBe(
            undefined,
          );
          expect(theme.colors[role], `${recipe} ${mode} ${role}`).toBe(
            base[role],
          );
        });
      });

      it(`${recipe} ${mode}: clears the documented contrast contract`, () => {
        expect(
          themeContrastFailures(getPlatformRecipeTheme(recipe, mode)),
          `${recipe} ${mode}`,
        ).toEqual([]);
      });
    });
  });

  it("applies the recipe's family and shape at high contrast only", () => {
    modes.forEach((mode) => {
      const identity = getTheme(mode, "high");
      platformRecipeNames.forEach((recipe) => {
        const theme = getPlatformRecipeTheme(recipe, mode, "high");
        expect(theme.contrast, recipe).toBe("high");
        expect(theme.colors.primary, recipe).toBe(identity.colors.primary);
        expect(theme.typography.mono, recipe).toBe(
          platformRecipes[recipe].types.mono,
        );
        expect(theme.radius.md, recipe).toBe(
          platformRecipes[recipe].structure.radius?.md,
        );
        expect(themeContrastFailures(theme), `${recipe} ${mode} high`).toEqual(
          [],
        );
      });
    });
  });
});

describe("platform recipes reshape the Windows variant", () => {
  const windows = (mode: ThemeMode) => getPlatformTheme("win32", mode);

  it("moves at least three roles and the control radius in light mode", () => {
    platformRecipeNames.forEach((recipe) => {
      const theme = getPlatformRecipeTheme(recipe, "light");
      const base = windows("light").colors;
      const declared = platformRecipes[recipe].colors.light;
      const moved = colorRoles.filter((role) => {
        const value = declared[role];
        return value !== undefined && value !== base[role];
      });
      expect(moved.length, recipe).toBeGreaterThanOrEqual(3);
      expect(theme.radius.md, recipe).not.toBe(windows("light").radius.md);
      expect(theme.radius.sm, recipe).toBe(
        platformRecipes[recipe].structure.radius?.sm,
      );
    });
  });

  it("keeps the era's canvas and accent, not the Windows 11 pair", () => {
    const xp = getPlatformRecipeTheme("xp", "light");
    const aero = getPlatformRecipeTheme("aero", "light");
    expect(xp.colors.background).toBe(
      platformRecipes.xp.colors.light.background,
    );
    expect(aero.colors.background).toBe(
      platformRecipes.aero.colors.light.background,
    );
    expect(xp.colors.primary).not.toBe(windows("light").colors.primary);
    expect(aero.colors.primary).not.toBe(windows("light").colors.primary);
    // A light recipe keeps a readable on-colour pair on its whole fill family.
    platformRecipeNames.forEach((recipe) => {
      const colors = getPlatformRecipeTheme(recipe, "light").colors;
      (["primary", "primaryHover", "primaryActive"] as const).forEach(
        (fill) => {
          expect(
            contrastRatio(colors.primaryForeground, colors[fill]),
            `${recipe} ${fill}`,
          ).toBeGreaterThanOrEqual(4.5);
        },
      );
    });
  });

  it("resolves a fresh theme without mutating the base", () => {
    const base = getTheme("dark");
    const before = { ...base.colors };
    const theme = getPlatformRecipeTheme("aero", "dark");
    expect(theme).not.toBe(base);
    expect(base.colors).toEqual(before);
    expect(getPlatformRecipeTheme("xp", "light")).not.toBe(getTheme("light"));
  });
});
