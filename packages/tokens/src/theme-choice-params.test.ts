/**
 * Guards the gap plan 529 closes: `ThemeChoice` documents "a shareable URL" as a
 * place a choice arrives from, but nothing in the package read or wrote one.
 * Every consumer retyped the five query keys and the guard each used, and the
 * one shipped toggle (`apps/docs/src/platform/platform.ts`) read only `platform`
 * while plan 380's recipe, contrast and density axes had no URL form at all — so
 * a shared link could not carry the theme the toggle resolves.
 *
 * The cases below hold the two properties a hand-written parser never had: an
 * unknown value is absent rather than an error, and the writer emits exactly the
 * axes whose omission would change the resolved theme. The full matrix is
 * round-tripped through a real `URLSearchParams`, which also proves the
 * structural `ThemeParamSource` the package depends on instead of the global.
 */

import { describe, expect, it } from "vitest";
import { platformRecipeNames } from "./platform-recipes.js";
import { platformNames } from "./platforms.js";
import { densityNames } from "./scale.js";
import { shippedThemes } from "./shipped-themes.js";
import {
  getPlatformTheme,
  themeContrasts,
  themeModes,
  type Theme,
} from "./theme.js";
import {
  resolveThemeChoice,
  themeChoiceFromParams,
  themeChoiceKeys,
  themeChoiceParams,
  type ThemeChoice,
} from "./theme-choice.js";

/** The documented clear-then-set pattern, applied to a real URL search object. */
const toSearch = (choice: ThemeChoice, search = ""): URLSearchParams => {
  const params = new URLSearchParams(search);
  themeChoiceKeys.forEach((key) => params.delete(key));
  themeChoiceParams(choice).forEach(([key, value]) => params.set(key, value));
  return params;
};

const resolve = (choice: ThemeChoice): Theme =>
  resolveThemeChoice(themeChoiceFromParams(toSearch(choice)));

describe("themeChoiceFromParams", () => {
  it("reads every axis the package owns", () => {
    const search = new URLSearchParams(
      "?mode=dark&contrast=high&platform=win32&recipe=aero&density=compact",
    );
    expect(themeChoiceFromParams(search)).toEqual({
      mode: "dark",
      contrast: "high",
      platform: "win32",
      recipe: "aero",
      density: "compact",
    });
  });

  it("treats an unknown value as absent", () => {
    const search = new URLSearchParams(
      "?mode=dusk&contrast=maximum&platform=window&recipe=omarchy&density=cosy&size=huge",
    );
    const choice = themeChoiceFromParams(search);
    themeChoiceKeys.forEach((key) => expect(choice[key], key).toBeUndefined());
    expect(resolveThemeChoice(choice)).toEqual(resolveThemeChoice({}));

    // A value that only differs by whitespace names no member either.
    expect(
      themeChoiceFromParams(new URLSearchParams("?mode=%20dark")).mode,
    ).toBe(undefined);
  });

  it("reads a default a hand-written link still carries", () => {
    const search = new URLSearchParams(
      "?platform=default&mode=light&contrast=default",
    );
    expect(themeChoiceFromParams(search)).toEqual({
      mode: "light",
      contrast: "default",
      platform: "default",
    });
    expect(resolveThemeChoice(themeChoiceFromParams(search))).toEqual(
      getPlatformTheme("default", "light", "default"),
    );
  });
});

describe("themeChoiceParams", () => {
  it("writes only the axes whose absence would change the theme", () => {
    expect(
      themeChoiceParams({
        mode: "light",
        contrast: "default",
        platform: "default",
      }),
    ).toEqual([]);
    expect(themeChoiceParams({ mode: "dark" })).toEqual([["mode", "dark"]]);
    expect(themeChoiceParams({ contrast: "high" })).toEqual([
      ["contrast", "high"],
    ]);
    expect(themeChoiceParams({ platform: "win32" })).toEqual([
      ["platform", "win32"],
    ]);
    expect(themeChoiceParams({ platform: "default" })).toEqual([]);

    // Every written axis is necessary: removing it changes the resolved theme.
    const entries = themeChoiceParams({
      mode: "dark",
      contrast: "high",
      platform: "win32",
      density: "compact",
    });
    const encoded = new URLSearchParams();
    themeChoiceParams({
      mode: "dark",
      contrast: "high",
      platform: "win32",
      density: "compact",
    }).forEach(([key, value]) => encoded.set(key, value));
    const decoded = themeChoiceFromParams(encoded);
    entries.forEach(([key]) => {
      const { [key]: removed, ...rest } = decoded;
      expect(removed, key).toBeDefined();
      expect(resolveThemeChoice(rest), key).not.toEqual(
        resolveThemeChoice(decoded),
      );
    });
  });

  it("lets a recipe suppress the platform it overrides", () => {
    expect(themeChoiceParams({ platform: "win32", recipe: "aero" })).toEqual([
      ["recipe", "aero"],
    ]);
    expect(resolveThemeChoice({ platform: "win32", recipe: "aero" })).toEqual(
      resolve({ recipe: "aero" }),
    );
  });

  it("writes a density on every platform, because the preset supplies the fallback", () => {
    shippedThemes
      .filter(({ theme }) => theme.contrast === "default")
      .forEach(({ theme }) => {
        const entries = themeChoiceParams({
          platform: theme.name.startsWith("macOS") ? "darwin" : "win32",
          density: "spacious",
        });
        expect(entries.map(([key]) => key)).toContain("density");
      });

    // A density written beside macOS survives a later platform edit; omitting it
    // would silently take the new platform's preset instead.
    const edited = new URLSearchParams(
      toSearch({ platform: "darwin", density: "compact" }),
    );
    edited.set("platform", "win32");
    expect(resolveThemeChoice(themeChoiceFromParams(edited)).density.name).toBe(
      "compact",
    );
  });

  it("keeps the documented key order", () => {
    const keys = themeChoiceParams({
      mode: "dark",
      contrast: "high",
      platform: "win32",
      density: "compact",
    }).map(([key]) => key);
    const positions = keys.map((key) => themeChoiceKeys.indexOf(key));
    expect(positions).toEqual(
      positions.toSorted((left, right) => left - right),
    );
    expect(positions.every((position) => position >= 0)).toBe(true);
  });
});

describe("a choice through a real URL", () => {
  it("round-trips every shipped combination to the same theme", () => {
    const modes = [...themeModes, undefined] as const;
    const contrasts = [...themeContrasts, undefined] as const;
    const platforms = [...platformNames, undefined] as const;
    const recipes = [...platformRecipeNames, undefined] as const;
    const densities = [...densityNames, undefined] as const;

    modes.forEach((mode) =>
      contrasts.forEach((contrast) =>
        platforms.forEach((platform) =>
          recipes.forEach((recipe) =>
            densities.forEach((density) => {
              const choice: ThemeChoice = {
                mode,
                contrast,
                platform,
                recipe,
                density,
              };
              expect(resolve(choice), JSON.stringify(choice)).toEqual(
                resolveThemeChoice(choice),
              );
            }),
          ),
        ),
      ),
    );
  });

  it("cannot keep a stale axis beside a new choice", () => {
    const params = toSearch({ recipe: "xp" }, "?mode=dark&platform=win32");
    const choice = themeChoiceFromParams(params);

    expect(choice.mode).toBeUndefined();
    expect(choice.platform).toBeUndefined();
    expect(choice.recipe).toBe("xp");
    expect(resolveThemeChoice(choice)).toEqual(
      resolveThemeChoice({ recipe: "xp" }),
    );
  });
});
