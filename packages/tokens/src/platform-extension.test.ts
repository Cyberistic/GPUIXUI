/**
 * Bug guarded: a copied `PlatformStyle` could not carry its own type scale,
 * spacing, border widths, icon/avatar sizes or component dimensions, so the file
 * a consumer was told to own held only part of the look (plan 389). Every
 * numeric group was reachable through `extendTheme` but not through the platform
 * style `applyPlatformStyle` resolves, which is the copy-and-own path the
 * reference teaches.
 *
 * The shipped styles omit every new field, so these cases also prove the
 * addition moves no shipped value.
 */

import { describe, expect, it } from "vitest";
import {
  applyPlatformStyle,
  extendTheme,
  getTheme,
  type Theme,
} from "./theme.js";
import { themeFailures } from "./theme-check.js";
import { platformStyles } from "./platforms.js";
import {
  getPlatformRecipeTheme,
  platformRecipeNames,
} from "./platform-recipes.js";
import { densityPresets } from "./scale.js";
import { shippedThemes } from "./shipped-themes.js";
import { textRoles } from "./typography.js";
import type { PlatformStyle } from "./platform-types.js";
import { contosoDensityPlatformStyle } from "./platform-extension.example.js";

/** A style naming every numeric group, to prove each one crosses the boundary. */
const extended: PlatformStyle = {
  types: { label: "Extended", sans: ".SystemUIFont", mono: "Consolas" },
  structure: {
    typography: {
      code: { fontSize: 12, lineHeight: 18, fontWeight: 600 },
    },
    density: { preset: "compact", rowHeight: 30 },
    spacing: { md: 10 },
    borderWidth: { strong: 3 },
    iconSize: { md: 18 },
    avatarSize: { sm: 28 },
    dimensions: { overlayWidth: 240 },
  },
  colors: { light: {}, dark: {} },
  elevation: { light: {}, dark: {} },
};

const resolved = (theme: Theme) => ({
  code: theme.typography.code,
  densityName: theme.density.name,
  rowHeight: theme.density.rowHeight,
  spacingMd: theme.spacing.md,
  borderStrong: theme.borderWidth.strong,
  iconMd: theme.iconSize.md,
  avatarSm: theme.avatarSize.sm,
  overlayWidth: theme.dimensions.overlayWidth,
});

describe("a platform style's numeric groups", () => {
  it("applies every group the style names", () => {
    const base = getTheme("dark");
    const themed = applyPlatformStyle(base, extended);

    expect(resolved(themed)).toEqual({
      code: { fontSize: 12, lineHeight: 18, fontWeight: 600 },
      densityName: "compact",
      rowHeight: 30,
      spacingMd: 10,
      borderStrong: 3,
      iconMd: 18,
      avatarSm: 28,
      overlayWidth: 240,
    });
    expect(resolved(themed)).not.toEqual(resolved(base));
  });

  it("inherits a group the style omits", () => {
    const base = getTheme("light");
    const themed = applyPlatformStyle(base, {
      ...extended,
      structure: { spacing: { md: 10 } },
    });

    expect(themed.spacing.md).toBe(10);
    expect(themed.density).toEqual(base.density);
    expect(themed.iconSize).toEqual(base.iconSize);
    expect(themed.avatarSize).toEqual(base.avatarSize);
    expect(themed.dimensions).toEqual(base.dimensions);
    expect(themed.borderWidth).toEqual(base.borderWidth);
    expect(themed.typography).toEqual({
      ...base.typography,
      sans: extended.types.sans,
      mono: extended.types.mono,
    });
  });

  it("treats an explicit undefined as omitted, like every other merge", () => {
    const base = getTheme("light");
    const themed = applyPlatformStyle(base, {
      ...extended,
      structure: { borderWidth: { thin: undefined, strong: 3 } },
    });

    expect(themed.borderWidth.thin).toBe(base.borderWidth.thin);
    expect(themed.borderWidth.strong).toBe(3);
  });

  it("applies the numeric groups at high contrast too", () => {
    const base = getTheme("light", "high");
    const themed = applyPlatformStyle(base, extended, "high");

    expect(resolved(themed)).toMatchObject({
      densityName: "compact",
      rowHeight: 30,
      spacingMd: 10,
      iconMd: 18,
      avatarSm: 28,
      overlayWidth: 240,
    });
    // The AAA colour set wins: the style names no colour.
    expect(themed.colors).toEqual(base.colors);
    expect(themed.contrast).toBe("high");
  });

  it("keeps each family in `types`, never in the type roles", () => {
    const themed = applyPlatformStyle(getTheme("dark"), extended);

    expect(themed.typography.sans).toBe(extended.types.sans);
    expect(themed.typography.mono).toBe(extended.types.mono);
  });

  it("holds the copied example to the total check in both modes", () => {
    (["light", "dark"] as const).forEach((mode) => {
      const theme = applyPlatformStyle(
        getTheme(mode),
        contosoDensityPlatformStyle,
      );
      expect(themeFailures(theme), mode).toEqual([]);
      expect(theme.typography.code.fontSize).toBe(12);
      expect(theme.dimensions.overlayWidth).toBe(240);
      expect(theme.density.name).toBe("compact");
      expect(theme.density.rowHeight).toBe(30);
    });
  });

  it("resolves the copied example's density over every base preset", () => {
    (["compact", "comfortable", "spacious"] as const).forEach((preset) => {
      const base = extendTheme(getTheme("light"), { density: preset });
      const themed = applyPlatformStyle(base, contosoDensityPlatformStyle);
      expect(themeFailures(themed), preset).toEqual([]);
      expect(themed.density.name, preset).toBe("compact");
      expect(themed.density.rowHeight, preset).toBe(30);
      expect(themed.density.controlHeight, preset).toEqual(
        densityPresets.compact.controlHeight,
      );
    });
  });

  it("moves no shipped style's numeric group", () => {
    shippedThemes.forEach(({ theme }) => {
      const identity = getTheme(theme.mode, theme.contrast);
      expect(theme.spacing, theme.name).toEqual(identity.spacing);
      expect(theme.borderWidth, theme.name).toEqual(identity.borderWidth);
      expect(theme.iconSize, theme.name).toEqual(identity.iconSize);
      expect(theme.avatarSize, theme.name).toEqual(identity.avatarSize);
      expect(theme.dimensions, theme.name).toEqual(identity.dimensions);
      textRoles.forEach((role) => {
        expect(theme.typography[role], `${theme.name} ${role}`).toEqual(
          identity.typography[role],
        );
      });
    });
  });

  it("applies the numeric groups over a shipped recipe", () => {
    platformRecipeNames.forEach((recipe) => {
      const base = getPlatformRecipeTheme(recipe, "dark");
      const themed = applyPlatformStyle(base, contosoDensityPlatformStyle);

      expect(themed.iconSize.md).toBe(18);
      expect(themed.typography.code.fontSize).toBe(12);
      expect(themed.dimensions.overlayWidth).toBe(240);
      expect(themed.density.name).toBe("compact");
      expect(themed.density.rowHeight).toBe(30);
      // The style names no colour, so the recipe's palette stays.
      expect(themed.colors).toEqual(base.colors);
      expect(themeFailures(themed), recipe).toEqual([]);
    });
  });

  it("exposes the shipped styles as the copy source", () => {
    const groups = [
      "typography",
      "spacing",
      "borderWidth",
      "iconSize",
      "avatarSize",
      "dimensions",
    ] as const;
    Object.values(platformStyles).forEach((style) => {
      groups.forEach((group) => {
        expect(style.structure[group]).toBeUndefined();
      });
    });
  });
});
