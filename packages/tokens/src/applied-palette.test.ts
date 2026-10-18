/**
 * Guards the defect plan 373 fixed: `applyPlatformStyle(highBase, style,
 * "default")` replaced only the colour roles a style names, so the roles it left
 * out stayed at the AAA level of the base. The returned theme declared
 * `default` but carried half an AAA palette, and the library's own checker
 * rejected it: light macOS `border` on `destructiveSoft` measured 1.0248:1,
 * Linux light 1.0162:1, Windows light 1.0133:1 on `infoSoft` and 1.0215:1 on
 * `destructiveSoft`, and Linux dark measured 1.0375:1 for `infoSoft` and
 * 1.0346:1 for `successSoft` on the card, popover and quiet panel. Asking for a
 * level now replaces the palette as a set, taking the unnamed roles from the
 * default-level identity of the same mode; a base already at that level keeps
 * its own colours and a consumer's edits.
 */
import { describe, expect, it } from "vitest";
import {
  applyPlatformStyle,
  extendTheme,
  getPlatformRecipeTheme,
  getPlatformTheme,
  getTheme,
  platformNames,
  platformRecipeNames,
  platformRecipes,
  platformStyles,
  themeChecks,
  themeFailures,
  themeModes,
  type PlatformStyle,
} from "./index.js";

const realPlatforms = platformNames.filter((name) => name !== "default");

describe("a forced default palette is whole", () => {
  it(`passes all ${themeChecks.length} checks for every shipped style`, () => {
    themeModes.forEach((mode) => {
      realPlatforms.forEach((platform) => {
        const theme = applyPlatformStyle(
          getTheme(mode, "high"),
          platformStyles[platform],
          "default",
        );

        expect(themeFailures(theme), `${mode}/${platform}`).toEqual([]);
      });
    });
  });

  it("takes the unnamed roles from the default palette of the same mode", () => {
    themeModes.forEach((mode) => {
      realPlatforms.forEach((platform) => {
        const theme = applyPlatformStyle(
          getTheme(mode, "high"),
          platformStyles[platform],
          "default",
        );
        expect(theme.colors, platform).toEqual(
          getPlatformTheme(platform, mode, "default").colors,
        );
      });
    });
  });

  it("keeps a same-level base's edits to roles the style does not name", () => {
    const brand = extendTheme(getTheme("dark"), {
      colors: { successSoft: "#123456" },
    });

    const themed = applyPlatformStyle(brand, platformStyles.linux);

    // Linux names no success soft role, so the base's own value survives.
    expect(themed.colors.successSoft).toBe("#123456");
    expect(themed.colors.successSoft).not.toBe(
      getTheme("dark").colors.successSoft,
    );
  });

  it("still applies the roles the style names", () => {
    const brand = extendTheme(getTheme("dark"), {
      colors: { background: "#101820" },
    });

    const themed = applyPlatformStyle(brand, platformStyles.linux);

    expect(themed.colors.background).toBe(
      platformStyles.linux.colors.dark.background,
    );
  });

  it("applies the same set-level replacement to a shipped recipe", () => {
    themeModes.forEach((mode) => {
      platformRecipeNames.forEach((recipe) => {
        const theme = applyPlatformStyle(
          getTheme(mode, "high"),
          platformRecipes[recipe],
          "default",
        );

        expect(themeFailures(theme), `${mode}/${recipe}`).toEqual([]);
        expect(theme.colors, recipe).toEqual(
          getPlatformRecipeTheme(recipe, mode, "default").colors,
        );
      });
    });
  });

  it("does not rebase when no colour applies", () => {
    const undefinedPrimary: PlatformStyle = {
      ...platformStyles.default,
      types: { ...platformStyles.default.types, label: "Undefined primary" },
      colors: { light: { primary: undefined }, dark: {} },
    };

    const themed = applyPlatformStyle(
      getTheme("light", "high"),
      undefinedPrimary,
      "default",
    );

    expect(themed.contrast).toBe("high");
    expect(themed.colors).toEqual(getTheme("light", "high").colors);
  });
});

describe("the shipped variants did not move", () => {
  it("keeps each style's own primary at default contrast", () => {
    themeModes.forEach((mode) => {
      realPlatforms.forEach((platform) => {
        const shipped = getPlatformTheme(platform, mode);
        expect(shipped.colors.primary, `${mode}/${platform}`).toBe(
          platformStyles[platform].colors[mode].primary,
        );
      });
    });
  });

  it("keeps the AAA palette at high contrast", () => {
    themeModes.forEach((mode) => {
      realPlatforms.forEach((platform) => {
        expect(getPlatformTheme(platform, mode, "high").colors).toEqual(
          getTheme(mode, "high").colors,
        );
      });
    });
  });
});
