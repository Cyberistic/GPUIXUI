/**
 * Guards the defect plan 082 fixed: `primary` is painted as text by the Link
 * variant and the `primary` text tone, but the contract measured it only as a
 * fill. macOS light measured 4.21:1 on the canvas and 3.44:1 on the pressed
 * wash, macOS dark 3.82:1 on card/popover and 2.84:1 on `active`, Linux light
 * 3.51:1, Linux dark 4.08:1, Windows light 4.30:1 and high-contrast dark
 * 6.94:1 under the AAA floor — every suite stayed green because no pair named
 * brand-toned text. `primaryText` is the readable tonality; the contract holds
 * it on the plain surfaces, the quiet panel, the two washes a link paints and,
 * since plan 314, the `accent`/`selected` fills a link sits on inside a row.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  colorRoles,
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  themeContrastFailures,
  type Theme,
} from "./index.js";
import { primaryTextStyles } from "./primary-text.example.js";

const surfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

const themes: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

const primaryTextPairs = contrastPairs.filter(
  ([foreground]) => foreground === "primaryText",
);

const opaqueHex = /^#[0-9A-F]{6}$/;

describe("brand-toned text", () => {
  it("documents one pair per painted surface, so a theme cannot pass vacuously", () => {
    expect(
      primaryTextPairs.map(([, background]) => background).toSorted(),
    ).toEqual([...surfaces].toSorted());
  });

  it("is a public role", () => {
    expect(colorRoles).toContain("primaryText");
  });

  it("clears the declared floor on every shipped theme", () => {
    themes.forEach(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].secondary;
      primaryTextPairs.forEach(([foreground, background]) => {
        expect(
          contrastRatio(theme.colors[foreground], theme.colors[background]),
          `${label}: ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("keeps the role opaque, so the checker can measure it", () => {
    themes.forEach(([label, theme]) => {
      expect(theme.colors.primaryText, label).toMatch(opaqueHex);
    });
  });

  it("is required: the fill it replaced still fails as text", () => {
    const macosLight = getPlatformTheme("darwin", "light");
    const macosDark = getPlatformTheme("darwin", "dark");

    expect(
      contrastRatio(macosLight.colors.primary, macosLight.colors.background),
    ).toBeLessThan(4.5);
    expect(
      contrastRatio(macosLight.colors.primary, macosLight.colors.active),
    ).toBeLessThan(4.5);
    expect(
      contrastRatio(macosDark.colors.primary, macosDark.colors.card),
    ).toBeLessThan(4.5);
    expect(
      contrastRatio(macosDark.colors.primary, macosDark.colors.active),
    ).toBeLessThan(4.5);
    expect(
      contrastRatio(macosLight.colors.primaryText, macosLight.colors.active),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(macosDark.colors.primaryText, macosDark.colors.active),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("names the surface when a theme regresses to the old fill value", () => {
    const regressed = extendTheme(getPlatformTheme("darwin", "dark"), {
      // The pre-082 text colour: the platform accent, which is a fill.
      colors: { primaryText: "#0A84FF" },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, wash }) =>
        foreground === "primaryText" && wash === undefined,
    );

    expect(failures.map(({ background }) => background).toSorted()).toEqual([
      "accent",
      "active",
      "card",
      "destructiveSoft",
      "hover",
      "infoSoft",
      "muted",
      "popover",
      "selected",
      "successSoft",
      "warningSoft",
    ]);
    expect(
      failures.every(
        ({ pairClass, floor }) => pairClass === "secondary" && floor === 4.5,
      ),
    ).toBe(true);
  });

  it("runs the documented example against the role it teaches", () => {
    const theme = getTheme("light");
    const styles = primaryTextStyles(theme);

    expect(styles.link.color).toBe(theme.colors.primaryText);
    expect(styles.link.color).not.toBe(theme.colors.primary);
    expect(styles.hovered).toEqual({
      backgroundColor: theme.colors.hover,
      color: theme.colors.primaryText,
    });
    expect(styles.pressed).toEqual({
      backgroundColor: theme.colors.active,
      color: theme.colors.primaryText,
    });
    expect(styles.icon).toEqual({
      width: theme.iconSize.md,
      height: theme.iconSize.md,
      color: theme.colors.primaryText,
    });
  });
});
