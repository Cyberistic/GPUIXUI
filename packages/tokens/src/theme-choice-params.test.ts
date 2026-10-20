/**
 * Guards the gap plan 529 closes: `ThemeChoice` documents "a shareable URL" as a
 * place a choice arrives from, but nothing in the package read or wrote one.
 * Every consumer retyped the five query keys and the guard each used, and the
 * one shipped toggle (`apps/docs/src/platform/platform.ts`) read only `platform`
 * while plan 380's recipe, contrast and density axes had no URL form at all — so
 * a shared link could not carry the theme the toggle resolves.
 *
 * The cases below hold the two properties a hand-written parser never had: an
 * unknown value is absent rather than an error, and the writer omits only an
 * axis whose fallback is global (a light mode, a default contrast, the
 * `default` platform). Density is the exception: it is written as the preset
 * the choice resolves to, because the fallback belongs to the platform or
 * recipe, so a link without it changes meaning when the platform axis is
 * edited. Plan 755 closes the last case of that rule: a row that omits the
 * axis used to write no density at all, so the canonical link for
 * `{ platform: "darwin" }` lost its `compact` as soon as a reader switched the
 * link to Windows. The full matrix is round-tripped through a real
 * `URLSearchParams`, which also proves the structural `ThemeParamSource` the
 * package depends on instead of the global.
 */

import { describe, expect, it } from "vitest";
import { platformRecipeNames } from "./platform-recipes.js";
import { platformNames } from "./platforms.js";
import { densityNames } from "./scale.js";
import { shippedThemes, type ShippedTheme } from "./shipped-themes.js";
import {
  getPlatformTheme,
  themeContrasts,
  themeModes,
  type Theme,
} from "./theme.js";
import { canonicalLink } from "./theme-choice.example.js";
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

/** The choice that selects one shipped entry's axis, and nothing else. */
const axisOf = (entry: ShippedTheme): ThemeChoice =>
  entry.source === "platform"
    ? { platform: entry.platform }
    : entry.source === "recipe"
      ? { recipe: entry.recipe }
      : {};

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
  it("omits the axes with a global fallback and writes the resolved density", () => {
    expect(
      themeChoiceParams({
        mode: "light",
        contrast: "default",
        platform: "default",
      }),
    ).toEqual([["density", "comfortable"]]);
    expect(themeChoiceParams({ mode: "dark" })).toEqual([
      ["mode", "dark"],
      ["density", "comfortable"],
    ]);
    expect(themeChoiceParams({ contrast: "high" })).toEqual([
      ["contrast", "high"],
      ["density", "comfortable"],
    ]);
    expect(themeChoiceParams({ platform: "win32" })).toEqual([
      ["platform", "win32"],
      ["density", "comfortable"],
    ]);

    // Every axis this row writes is necessary: removing it changes the theme.
    const entries = themeChoiceParams({
      mode: "dark",
      contrast: "high",
      platform: "win32",
      density: "compact",
    });
    const encoded = new URLSearchParams();
    entries.forEach(([key, value]) => encoded.set(key, value));
    const decoded = themeChoiceFromParams(encoded);
    entries.forEach(([key]) => {
      const { [key]: removed, ...rest } = decoded;
      expect(removed, key).toBeDefined();
      expect(resolveThemeChoice(rest), key).not.toEqual(
        resolveThemeChoice(decoded),
      );
    });
  });

  it("writes the density a choice omits", () => {
    expect(canonicalLink).toContainEqual(["density", "compact"]);
    expect(canonicalLink).toEqual(themeChoiceParams({ platform: "darwin" }));
    expect(themeChoiceParams({ platform: "darwin" })).toContainEqual([
      "density",
      "compact",
    ]);
    expect(themeChoiceParams({})).toContainEqual(["density", "comfortable"]);
    expect(themeChoiceParams({ recipe: "aero" })).toContainEqual([
      "density",
      resolveThemeChoice({ recipe: "aero" }).density.name,
    ]);

    // The rule's own example: the macOS link keeps its compact when a reader
    // edits the platform axis, because the density travels with the link.
    const edited = new URLSearchParams(toSearch({ platform: "darwin" }));
    edited.set("platform", "win32");
    expect(resolveThemeChoice(themeChoiceFromParams(edited)).density.name).toBe(
      "compact",
    );
  });

  it("lets a recipe suppress the platform it overrides", () => {
    expect(themeChoiceParams({ platform: "win32", recipe: "aero" })).toEqual([
      ["recipe", "aero"],
      ["density", resolveThemeChoice({ recipe: "aero" }).density.name],
    ]);
    expect(resolveThemeChoice({ platform: "win32", recipe: "aero" })).toEqual(
      resolve({ recipe: "aero" }),
    );
  });

  it("writes a density for every shipped axis, even where the preset already names it", () => {
    shippedThemes
      .filter(({ theme }) => theme.contrast === "default")
      .forEach((entry) => {
        const axis = axisOf(entry);
        const withDensity: ThemeChoice = { ...axis, density: "spacious" };

        // Written for every axis, the one whose preset already decides it
        // included (macOS is `compact`).
        expect(
          themeChoiceParams(withDensity).map(([key]) => key),
          entry.theme.name,
        ).toContain("density");

        // No shipped style's preset is spacious, so the axis alone resolves to
        // another density and the round trip proves the written one reaches
        // the theme.
        expect(
          resolveThemeChoice(themeChoiceFromParams(toSearch(axis))).density
            .name,
          `${entry.theme.name} (axis only)`,
        ).not.toBe("spacious");
        expect(
          resolveThemeChoice(themeChoiceFromParams(toSearch(withDensity)))
            .density.name,
          entry.theme.name,
        ).toBe("spacious");
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

  it("is deliberately not minimal for density", () => {
    const macos: ThemeChoice = { platform: "darwin", density: "compact" };

    // Removing the density resolves the same theme *today*…
    expect(resolveThemeChoice({ platform: "darwin" })).toEqual(
      resolveThemeChoice(macos),
    );

    // …but it is still written, because the fallback belongs to the platform:
    // the same link edited to Windows would otherwise change its density.
    expect(themeChoiceParams(macos)).toContainEqual(["density", "compact"]);
    // A row that never named the axis writes the preset it resolves to.
    expect(themeChoiceParams({ platform: "darwin" })).toContainEqual([
      "density",
      "compact",
    ]);
  });

  it("is canonical: re-encoding a decoded link writes the same link", () => {
    shippedThemes
      .filter(({ theme }) => theme.contrast === "default")
      .forEach((entry) => {
        const choice: ThemeChoice = { ...axisOf(entry), density: "compact" };
        const params = toSearch(choice);
        expect(
          themeChoiceParams(themeChoiceFromParams(params)),
          entry.theme.name,
        ).toEqual(themeChoiceParams(choice));
      });
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
