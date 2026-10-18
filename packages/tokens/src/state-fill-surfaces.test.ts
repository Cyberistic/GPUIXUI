/**
 * Guards the gap plan 309 closed: the contract measured what is painted *on* a
 * fill but never the fill itself against the surface behind it. The identity
 * light `muted`, `hover` and `secondary` were the same value (1.000:1), the
 * identity dark `hover` was its `muted` and `popover`, macOS light `selected`
 * was 1.021:1 on its own canvas and Linux light `accent` 1.001:1 on the quiet
 * panel — so a hovered row, a selected row or a neutral filled control in a
 * sidebar could have no visible shape at all.
 *
 * Plan 547 derives the fill list from `filledControlFamilies`: the hand list it
 * replaced omitted any family added to the index, so the fill-on-surface pairs
 * 309 introduced could skip a new family with every case green.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastRatio,
  extendTheme,
  filledControlFamilies,
  getPlatformTheme,
  highContrastThemes,
  stateFillRoles,
  stateFillSurfacePairs,
  stateFillSurfaces,
  themeContrastFailures,
  themes,
  type Theme,
} from "./index.js";

const shipped: ReadonlyArray<Theme> = shippedThemes.map(({ theme }) => theme);

describe("interactive fills on the surfaces they paint on", () => {
  it("measures every fill on the four surfaces it paints on", () => {
    expect(stateFillSurfacePairs).toHaveLength(
      stateFillRoles.length * stateFillSurfaces.length,
    );
    expect(
      stateFillSurfacePairs.map(([foreground, background]) => [
        foreground,
        background,
      ]),
    ).toEqual(
      stateFillRoles.flatMap((fill) =>
        stateFillSurfaces.map((surface) => [fill, surface]),
      ),
    );
    expect(stateFillSurfacePairs).toHaveLength(60);
  });

  it("derives every filled family's three fills from the family index", () => {
    expect(stateFillRoles).toEqual([
      ...filledControlFamilies.flatMap((family) => [
        family,
        `${family}Hover`,
        `${family}Active`,
      ]),
      "hover",
      "active",
      "selected",
    ]);
  });

  it("clears the surface floor on every shipped theme", () => {
    shipped.forEach((theme) => {
      stateFillSurfacePairs.forEach(([foreground, background]) => {
        expect(
          contrastRatio(theme.colors[foreground], theme.colors[background]),
          `${theme.name}: ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].surface);
      });
    });
  });

  it("states the identity light panel regression", () => {
    const theme = themes.light;
    expect(contrastRatio("#EEF1F5", "#EEF1F5")).toBe(1);
    const fills: ReadonlyArray<(typeof stateFillRoles)[number]> = [
      "hover",
      "secondary",
      "accent",
      "selected",
    ];
    fills.forEach((fill) => {
      expect(
        contrastRatio(theme.colors[fill], theme.colors.muted),
        `identity light: ${fill} on the quiet panel`,
      ).toBeGreaterThanOrEqual(contrastFloors.default.surface);
    });
  });

  it("states the identity dark menu regression", () => {
    const theme = themes.dark;
    expect(contrastRatio("#222730", "#222730")).toBe(1);
    (["muted", "popover"] as const).forEach((surface) => {
      expect(
        contrastRatio(theme.colors.hover, theme.colors[surface]),
        `identity dark: hover on ${surface}`,
      ).toBeGreaterThanOrEqual(contrastFloors.default.surface);
    });
  });

  it("states the macOS, Linux, Windows and AAA regressions", () => {
    const macos = getPlatformTheme("darwin", "light");
    const linux = getPlatformTheme("linux", "light");
    const windows = getPlatformTheme("win32", "light");
    const highDark = highContrastThemes.dark;

    expect(contrastRatio("#E7F1FF", "#F2F2F7")).toBeLessThan(
      contrastFloors.default.surface,
    );
    expect(contrastRatio("#E1ECFA", "#EBEBEA")).toBeLessThan(
      contrastFloors.default.surface,
    );
    expect(contrastRatio("#EDEDED", "#EDEDED")).toBe(1);
    expect(contrastRatio("#1C1547", "#1A1A1A")).toBeLessThan(
      contrastFloors.high.surface,
    );

    (["accent", "selected"] as const).forEach((fill) => {
      expect(
        contrastRatio(macos.colors[fill], macos.colors.background),
        `macOS light: ${fill} on the canvas`,
      ).toBeGreaterThanOrEqual(contrastFloors.default.surface);
      expect(
        contrastRatio(highDark.colors[fill], highDark.colors.muted),
        `AAA dark: ${fill} on the quiet panel`,
      ).toBeGreaterThanOrEqual(contrastFloors.high.surface);
    });
    expect(
      contrastRatio(linux.colors.accent, linux.colors.muted),
    ).toBeGreaterThanOrEqual(contrastFloors.default.surface);
    expect(
      contrastRatio(windows.colors.secondary, windows.colors.muted),
    ).toBeGreaterThanOrEqual(contrastFloors.default.surface);
  });

  it("reports an erased fill through the public checker", () => {
    const light = themes.light;
    const erasedLight = extendTheme(light, {
      colors: { muted: light.colors.hover },
    });
    expect(themeContrastFailures(erasedLight)).toContainEqual({
      foreground: "hover",
      background: "muted",
      pairClass: "surface",
      floor: contrastFloors.default.surface,
      ratio: 1,
    });

    const dark = themes.dark;
    const erasedDark = extendTheme(dark, {
      colors: { popover: dark.colors.hover },
    });
    expect(themeContrastFailures(erasedDark)).toContainEqual({
      foreground: "hover",
      background: "popover",
      pairClass: "surface",
      floor: contrastFloors.default.surface,
      ratio: 1,
    });
  });

  it("accepts a copied style that designs its own panel", () => {
    const designed = extendTheme(getPlatformTheme("darwin", "light"), {
      colors: { muted: "#F5F5F9" },
    });

    expect(themeContrastFailures(designed)).toEqual([]);
  });
});
