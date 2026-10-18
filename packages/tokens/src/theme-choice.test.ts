/**
 * Guards the composition plan 380 ships: every persisted theme choice has to
 * agree on the precedence between its axes, and the theme alone cannot carry
 * that knowledge.
 *
 * The three wrong branches these cases can fail on:
 *
 * - applying the stored density **before** the platform style, which reverts it
 *   to the platform's own preset (macOS is `compact`), so a reader who chose
 *   spacious gets compact;
 * - falling back to a hardcoded `comfortable` for an unknown density, which
 *   turns a macOS workspace comfortable because a settings row went stale;
 * - treating a stored `platform` as authoritative when a `recipe` is also
 *   present, so a Windows XP page resolves to macOS.
 *
 * The file also imports `theme-choice.example.ts`, so the documented call is
 * executed (plan 350).
 */

import { describe, expect, it } from "vitest";
import { themeColorFailures, themeContrastFailures } from "./contrast.js";
import { themeMetricFailures } from "./metrics.js";
import {
  getPlatformRecipeTheme,
  platformRecipeNames,
  platformRecipes,
} from "./platform-recipes.js";
import { platformNames, platformStyles } from "./platforms.js";
import { densityNames } from "./scale.js";
import {
  getPlatformTheme,
  getTheme,
  themeContrasts,
  themeModes,
  type Theme,
} from "./theme.js";
import { resolveThemeChoice } from "./theme-choice.js";
import { resolvedChoice, storedChoice } from "./theme-choice.example.js";
import { themeWithDensity } from "./persisted-choices.example.js";

/** Every check a resolved theme must pass, named for the failing axis. */
const failuresOf = (theme: Theme, where: string): ReadonlyArray<string> => [
  ...themeContrastFailures(theme).map(
    (failure) =>
      `${where}: contrast ${failure.foreground} on ${failure.background} (${failure.ratio.toFixed(3)}:1 < ${failure.floor}:1)`,
  ),
  ...themeMetricFailures(theme).map(
    (failure) => `${where}: metric ${failure.group}.${failure.member}`,
  ),
  ...themeColorFailures(theme).map(
    (failure) => `${where}: colour ${failure.role} = ${failure.value}`,
  ),
];

/** The six shipped style axes: four platforms and two recipes. */
const shippedAxes = [
  ...platformNames.map((platform) => ({
    label: platform,
    platform,
    recipe: undefined,
  })),
  ...platformRecipeNames.map((recipe) => ({
    label: recipe,
    platform: undefined,
    recipe,
  })),
];

describe("resolveThemeChoice", () => {
  it("resolves every shipped axis combination to a theme all three checks accept", () => {
    const failures = themeModes.flatMap((mode) =>
      themeContrasts.flatMap((contrast) =>
        shippedAxes.flatMap(({ label, platform, recipe }) =>
          densityNames.flatMap((density) => {
            const where = `${mode}/${contrast} ${label} ${density}`;
            const theme = resolveThemeChoice({
              mode,
              contrast,
              platform,
              recipe,
              density,
            });
            expect(theme.mode, where).toBe(mode);
            expect(theme.contrast, where).toBe(contrast);
            expect(theme.density.name, where).toBe(density);
            return failuresOf(theme, where);
          }),
        ),
      ),
    );
    expect(failures).toEqual([]);
  });

  it("keeps a stored density over the platform's own preset", () => {
    // macOS carries `compact`; the identity carries `comfortable`.
    expect(
      resolveThemeChoice({ mode: "light", platform: "darwin" }).density.name,
    ).toBe("compact");

    const stored = resolveThemeChoice({
      mode: "light",
      platform: "darwin",
      density: "spacious",
    });

    expect(stored.density.name).toBe("spacious");
    expect(stored.density.rowHeight).toBe(36);
    // The platform's shape survives the density override: macOS ships radius.lg
    // 10 and Menlo, the identity 8 and the host's mono.
    expect(stored.radius.lg).toBe(10);
    expect(stored.typography.mono).toBe(platformStyles.darwin.types.mono);
  });

  it("keeps the resolved preset for an unknown density", () => {
    expect(
      resolveThemeChoice({
        mode: "light",
        platform: "darwin",
        density: "dense",
      }).density.name,
    ).toBe("compact");
    // The same rule for a density applied to an already-resolved theme; a
    // hardcoded `comfortable` fallback would fail here.
    expect(
      themeWithDensity(getPlatformTheme("darwin", "light"), "dense").density
        .name,
    ).toBe("compact");
  });

  it("resolves a recipe over a stray platform key", () => {
    const xp = resolveThemeChoice({
      mode: "light",
      recipe: "xp",
      platform: "darwin",
    });

    expect(xp.colors.primary).toBe(platformRecipes.xp.colors.light.primary);
    expect(xp.colors.primary).not.toBe(
      platformStyles.darwin.colors.light.primary,
    );
    expect(xp.name).toContain("Windows XP");

    platformRecipeNames.forEach((recipe) => {
      themeModes.forEach((mode) => {
        expect(
          resolveThemeChoice({ mode, recipe }).colors.primary,
          `${recipe} ${mode}`,
        ).toBe(getPlatformRecipeTheme(recipe, mode).colors.primary);
      });
    });
  });

  it("falls back to the identity for an unknown platform or recipe", () => {
    const identity = getTheme("light");
    const theme = resolveThemeChoice({
      mode: "light",
      platform: "beos",
      recipe: "aqua",
    });

    expect(theme.name).toBe(identity.name);
    expect(theme.colors).toEqual(identity.colors);
    expect(theme.density).toEqual(identity.density);
  });

  it("falls back to the readable defaults for an unknown mode or contrast", () => {
    const theme = resolveThemeChoice({ mode: "sepia", contrast: "ultra" });

    expect(theme.name).toBe(getTheme("light").name);
    expect(theme.mode).toBe("light");
    expect(theme.contrast).toBe("default");
  });

  it("treats an absent or undefined axis as the default", () => {
    const empty = resolveThemeChoice({});
    const undef = resolveThemeChoice({
      mode: undefined,
      contrast: undefined,
      platform: undefined,
      recipe: undefined,
      density: undefined,
    });

    expect(empty.name).toBe(getTheme("light").name);
    expect(empty.density.name).toBe("comfortable");
    expect(undef.name).toBe(empty.name);
    expect(undef.density.name).toBe(empty.density.name);
  });

  it("runs the documented settings row", () => {
    expect(storedChoice.platform).toBe("win32");
    expect(resolvedChoice.mode).toBe("dark");
    expect(resolvedChoice.contrast).toBe("high");
    expect(resolvedChoice.name).toContain("Windows");
    // Windows ships `comfortable`, so the stored `compact` is observable.
    expect(resolvedChoice.density.name).toBe("compact");
    expect(resolvedChoice.radius.md).toBe(
      platformStyles.win32.structure.radius?.md,
    );
    expect(themeContrastFailures(resolvedChoice)).toEqual([]);
  });
});
