/**
 * Guards the defect plan 545 fixes: `applyPlatformStyle` named its result
 * `${palette.name} · ${label}`, and a same-level base keeps its own name, so
 * applying the style a theme already carried appended the label again —
 * `"Light · Windows · Windows"` — for a palette the package does not ship.
 * Every other field of the second application was already equal to the first.
 *
 * This file fails without the fix: case 1 reports the doubled label at every
 * mode and contrast, and case 5 reports it on the deprecated bridge.
 */

import { describe, expect, it } from "vitest";
import { contosoDensityPlatformStyle } from "./platform-extension.example.js";
import { platformRecipes } from "./platform-recipes.js";
import { platformStyles } from "./platforms.js";
import {
  applyPlatformStyle,
  createTheme,
  getTheme,
  platformTheme,
  themeContrasts,
  themeModes,
} from "./theme.js";

/** Every style a consumer can apply, keyed for a labelled failure. */
const appliedStyles = [
  ...Object.entries(platformStyles).map(
    ([name, style]) => [`style:${name}`, style] as const,
  ),
  ...Object.entries(platformRecipes).map(
    ([name, style]) => [`recipe:${name}`, style] as const,
  ),
];

describe("a style applied a second time", () => {
  it("returns the same theme, name included, for every shipped style", () => {
    appliedStyles.forEach(([label, style]) => {
      themeModes.forEach((mode) => {
        themeContrasts.forEach((contrast) => {
          const once = applyPlatformStyle(getTheme(mode, contrast), style);
          const twice = applyPlatformStyle(once, style);
          expect(twice, `${label} ${mode} ${contrast}`).toEqual(once);
        });
      });
    });
  });

  it("returns the same theme for the documented copied style", () => {
    const once = applyPlatformStyle(
      getTheme("light"),
      contosoDensityPlatformStyle,
    );

    expect(once.name).toBe("Light · Contoso desktop");
    expect(applyPlatformStyle(once, contosoDensityPlatformStyle)).toEqual(once);
  });

  it("keeps a brand name and appends the label once", () => {
    const brand = createTheme({ mode: "light", name: "Acme" });
    const once = applyPlatformStyle(brand, platformStyles.win32);

    expect(once.name).toBe("Acme · Windows");
    expect(applyPlatformStyle(once, platformStyles.win32)).toEqual(once);
    expect(brand.name).toBe("Acme");
  });

  it("appends a different style's label once and keeps the composition", () => {
    const identity = getTheme("light");
    const mac = applyPlatformStyle(identity, platformStyles.darwin);
    const win = applyPlatformStyle(identity, platformStyles.win32);
    const overMac = applyPlatformStyle(win, platformStyles.darwin);

    // A style names only the roles it owns (plan 374), so the second label
    // records the composition instead of replacing the first.
    expect(overMac.name).toBe("Light · Windows · macOS");
    expect(applyPlatformStyle(overMac, platformStyles.darwin)).toEqual(overMac);

    const back = applyPlatformStyle(overMac, platformStyles.win32);
    expect(back.name).toBe("Light · Windows · macOS · Windows");
    expect(applyPlatformStyle(back, platformStyles.win32)).toEqual(back);
    expect(mac.name).toBe("Light · macOS");
  });

  it("is idempotent on the deprecated font bridge too", () => {
    const once = platformTheme(getTheme("dark"), "win32");

    expect(once.name).toBe("Dark · Windows");
    expect(platformTheme(once, "win32")).toEqual(once);
  });
});
