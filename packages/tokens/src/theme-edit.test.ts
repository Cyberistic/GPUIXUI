/**
 * Guards the defect plan 727 fixes: `themeOverrides(base, theme)` is relative to
 * that exact base, but the four documents describing the inverse corrected only
 * the mode (“choose a base of the theme's mode”). A Windows application that
 * stored `{ radius: { md: 8 } }` and replayed it on `getTheme("light")` silently
 * painted the identity's radii (`sm` 4 / `xl` 12 against Windows 2 / 8), its
 * border colour and its type — and `themeFailures` returned `[]` for both
 * themes, so nothing anywhere reported the regression.
 *
 * The rule is the base, not its mode. `themeEdit(choice, edited)` resolves the
 * choice before it diffs, so the artifact cannot name a base it was not measured
 * against, and `applyThemeEdit` replays it. The second case pins the hazard
 * itself: it fails if the stored pair stops carrying the base, and its replay
 * half fails if the pair stops reproducing the edit.
 */
import { describe, expect, it } from "vitest";
import {
  applyThemeEdit,
  extendTheme,
  getPlatformRecipeTheme,
  getPlatformTheme,
  getTheme,
  platformNames,
  platformRecipeNames,
  resolveThemeChoice,
  themeChoiceFromParams,
  themeChoiceParams,
  themeContrasts,
  themeEdit,
  themeFailures,
  themeModes,
  type Theme,
  type ThemeChoice,
  type ThemeEdit,
} from "./index.js";
import {
  exportedBaseChoice,
  exportedPlatformEdit,
  exportedPlatformTheme,
} from "./theme-diff.example.js";

/** The stored pair, failing the test on the cross-mode absence. */
const editOf = (choice: ThemeChoice, edited: Theme): ThemeEdit => {
  const edit = themeEdit(choice, edited);
  if (edit === undefined) {
    throw new Error(`themeEdit returned undefined for ${edited.name}`);
  }
  return edit;
};

describe("a stored edit records its base", () => {
  it("reproduces an edit through its choice for every shipped base", () => {
    const pairs: ReadonlyArray<readonly [ThemeChoice, Theme]> = [
      ...themeModes.flatMap((mode) =>
        themeContrasts.flatMap((contrast) =>
          platformNames.map((platform): readonly [ThemeChoice, Theme] => [
            { mode, contrast, platform },
            getPlatformTheme(platform, mode, contrast),
          ]),
        ),
      ),
      ...themeModes.flatMap((mode) =>
        themeContrasts.flatMap((contrast) =>
          platformRecipeNames.map((recipe): readonly [ThemeChoice, Theme] => [
            { mode, contrast, recipe },
            getPlatformRecipeTheme(recipe, mode, contrast),
          ]),
        ),
      ),
    ];

    expect(pairs).toHaveLength(24);
    pairs.forEach(([choice, base]) => {
      // The choice names the base itself, or the pair would store a different one.
      expect(resolveThemeChoice(choice), base.name).toEqual(base);

      const edited = extendTheme(base, { radius: { md: 8 } });
      expect(applyThemeEdit(editOf(choice, edited)), base.name).toEqual(edited);
    });
  });

  it("keeps the base the diff alone loses, silently", () => {
    const base = getPlatformTheme("win32", "light");
    const edited = extendTheme(base, { radius: { md: 8 } });
    const stored = editOf({ mode: "light", platform: "win32" }, edited);

    // The diff is one step, so nothing in it records which base it belongs to.
    expect(stored.overrides).toEqual({ radius: { md: 8 } });

    const replayedOnIdentity = extendTheme(getTheme("light"), stored.overrides);
    expect(replayedOnIdentity.radius.sm).not.toBe(edited.radius.sm);
    expect(replayedOnIdentity.radius.xl).not.toBe(edited.radius.xl);
    expect(replayedOnIdentity.colors.border).not.toBe(edited.colors.border);

    // Neither theme is invalid: the wrong base is a silent look regression.
    expect(themeFailures(replayedOnIdentity)).toEqual([]);
    expect(themeFailures(edited)).toEqual([]);

    expect(applyThemeEdit(stored)).toEqual(edited);
  });

  it("returns undefined across modes", () => {
    expect(themeEdit({ mode: "light" }, getTheme("dark"))).toBeUndefined();
  });

  it("records a base its choice reaches through a density", () => {
    const choice = {
      mode: "light",
      platform: "darwin",
      density: "spacious",
    } as const;
    const base = resolveThemeChoice(choice);
    expect(base.density.name).toBe("spacious");

    const edited = extendTheme(base, { radius: { md: 8 } });
    const stored = editOf(choice, edited);

    // The density is the base's, so it is not part of the edit.
    expect(stored.overrides).toEqual({ radius: { md: 8 } });
    expect(applyThemeEdit(stored)).toEqual(edited);
  });

  it("survives the shareable URL codec", () => {
    const choice = { mode: "dark", contrast: "high", recipe: "aero" } as const;
    const edited = extendTheme(resolveThemeChoice(choice), {
      radius: { md: 8 },
    });
    const stored = editOf(choice, edited);

    const params = new URLSearchParams();
    themeChoiceParams(stored.base).forEach(([key, value]) => {
      params.set(key, value);
    });
    expect(params.get("contrast")).toBe("high");
    expect(params.get("recipe")).toBe("aero");

    const decoded: ThemeEdit = {
      base: themeChoiceFromParams(params),
      overrides: stored.overrides,
    };
    expect(applyThemeEdit(decoded)).toEqual(edited);
  });

  it("runs the documented example", () => {
    const stored = exportedPlatformEdit;
    if (stored === undefined) {
      throw new Error("the example's same-mode edit must be storable");
    }
    expect(stored.base).toEqual(exportedBaseChoice);
    expect(applyThemeEdit(stored)).toEqual(exportedPlatformTheme);
  });
});
