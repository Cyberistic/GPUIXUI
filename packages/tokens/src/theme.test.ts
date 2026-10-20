/**
 * Guards the extension contract: overrides merge without mutating the base,
 * typography merges field by field, elevation replaces whole levels, a theme can
 * never change its mode through an override, and every shipped theme carries
 * every group the others do. Also guards plan 304: `createTheme` starts from the
 * contrast variant it names — it used to relabel the default palette and then
 * fail the package's own checker.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { brandLightTheme, brandTheme } from "./brand-theme.example.js";
import { accessibleDarkTheme, resolveTheme } from "./high-contrast.example.js";
import { alpha, densityPresets, type ElevationShape } from "./index.js";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastRatio,
  createTheme,
  darkTheme,
  elevationShadow,
  extendTheme,
  getTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  highContrastThemes,
  lightTheme,
  themes,
  themeContrastFailures,
  themeFailures,
  type ThemeFailure,
} from "./index.js";

describe("built-in themes", () => {
  it("maps modes to the shipped themes", () => {
    expect(getTheme("light")).toBe(lightTheme);
    expect(getTheme("dark")).toBe(darkTheme);
    expect(themes.light).toBe(lightTheme);
    expect(themes.dark).toBe(darkTheme);
  });

  it("carries the matching mode", () => {
    expect(lightTheme.mode).toBe("light");
    expect(darkTheme.mode).toBe("dark");
  });

  it("declares the floor set it is designed against", () => {
    expect(lightTheme.contrast).toBe("default");
    expect(darkTheme.contrast).toBe("default");
  });
});

describe("high-contrast themes", () => {
  it("maps modes to the high-contrast themes", () => {
    expect(getTheme("light", "high")).toBe(highContrastLightTheme);
    expect(getTheme("dark", "high")).toBe(highContrastDarkTheme);
    expect(getTheme("light", "default")).toBe(lightTheme);
    expect(highContrastThemes.light).toBe(highContrastLightTheme);
    expect(highContrastThemes.dark).toBe(highContrastDarkTheme);
  });

  it("keeps the light/dark mode of its canvas", () => {
    expect(highContrastLightTheme.mode).toBe("light");
    expect(highContrastDarkTheme.mode).toBe("dark");
  });

  it("declares the high-contrast floors", () => {
    expect(highContrastLightTheme.contrast).toBe("high");
    expect(highContrastDarkTheme.contrast).toBe("high");
  });

  it("is named so a preview can label it", () => {
    expect(highContrastLightTheme.name).toBe("High contrast light");
    expect(highContrastDarkTheme.name).toBe("High contrast dark");
  });

  it("composes through the normal extension mechanism", () => {
    const custom = extendTheme(highContrastLightTheme, {
      colors: { primary: "#123456" },
      density: "compact",
    });
    expect(custom.mode).toBe("light");
    expect(custom.colors.primary).toBe("#123456");
    expect(custom.colors.background).toBe(
      highContrastLightTheme.colors.background,
    );
    expect(custom.density.name).toBe("compact");
  });

  it("is selected by the accessibility preference", () => {
    expect(resolveTheme("dark", true)).toBe(highContrastDarkTheme);
    expect(resolveTheme("dark", false)).toBe(darkTheme);
    expect(resolveTheme("light", true)).toBe(highContrastLightTheme);
  });
});

describe("extendTheme", () => {
  it("returns a new theme equal to the base when nothing is overridden", () => {
    const copy = extendTheme(darkTheme, {});
    expect(copy).not.toBe(darkTheme);
    expect(copy).toEqual(darkTheme);
  });

  it("applies a colour override and leaves the other roles alone", () => {
    const custom = createTheme({
      mode: "light",
      colors: { primary: "#123456" },
    });
    expect(custom.colors.primary).toBe("#123456");
    expect(custom.colors.background).toBe(lightTheme.colors.background);
    expect(lightTheme.colors.primary).not.toBe("#123456");
  });

  it("merges a text role field by field", () => {
    const custom = extendTheme(lightTheme, {
      typography: { body: { fontSize: 15 } },
    });
    expect(custom.typography.body.fontSize).toBe(15);
    expect(custom.typography.body.lineHeight).toBe(
      lightTheme.typography.body.lineHeight,
    );
    expect(custom.typography.body.fontWeight).toBe(
      lightTheme.typography.body.fontWeight,
    );
  });

  it("replaces a whole elevation level", () => {
    const shape: ElevationShape = {
      offsetX: 0,
      offsetY: 2,
      blurRadius: 4,
      spreadRadius: 0,
      alpha: 0.2,
    };
    const custom = extendTheme(lightTheme, { elevation: { md: [shape] } });
    expect(custom.elevation.md).toEqual([shape]);
    expect(custom.elevation.sm).toBe(lightTheme.elevation.sm);
    expect(elevationShadow(custom, "md")?.color).toBe(
      alpha(lightTheme.colors.shadow, 0.2),
    );
  });

  it("applies a density preset", () => {
    const custom = extendTheme(lightTheme, { density: "compact" });
    expect(custom.density).toEqual(densityPresets.compact);
  });

  it("keeps the base density name for a partial override", () => {
    const custom = extendTheme(lightTheme, { density: { rowHeight: 30 } });
    expect(custom.density.rowHeight).toBe(30);
    expect(custom.density.name).toBe("comfortable");
    expect(custom.density.controlHeight.md).toBe(
      densityPresets.comfortable.controlHeight.md,
    );
  });

  it("overrides one avatar diameter and keeps the others", () => {
    const custom = extendTheme(lightTheme, { avatarSize: { lg: 44 } });
    expect(custom.avatarSize.lg).toBe(44);
    expect(custom.avatarSize.md).toBe(lightTheme.avatarSize.md);
    expect(lightTheme.avatarSize.lg).toBe(40);
  });

  it("does not mutate the base theme", () => {
    const before = JSON.stringify(lightTheme);
    extendTheme(lightTheme, {
      name: "Changed",
      colors: { primary: "#000000" },
      radius: { md: 2 },
      density: "spacious",
      typography: { body: { fontSize: 99 } },
    });
    expect(JSON.stringify(lightTheme)).toBe(before);
  });

  it("never changes the mode of the base theme", () => {
    expect(extendTheme(darkTheme, { name: "Still dark" }).mode).toBe("dark");
    expect(extendTheme(lightTheme, { name: "Still light" }).mode).toBe("light");
  });

  it("keeps the base contrast level unless one is declared", () => {
    const accessible = extendTheme(highContrastLightTheme, {
      colors: { primary: "#123456" },
    });
    expect(accessible.contrast).toBe("high");
    expect(extendTheme(lightTheme, { contrast: "high" }).contrast).toBe("high");
  });
});

describe("createTheme", () => {
  it("builds the matching built-in theme by default", () => {
    const created = createTheme({ mode: "dark" });
    expect(created).not.toBe(darkTheme);
    expect(created).toEqual(darkTheme);
    expect(createTheme({ mode: "dark", contrast: "default" })).toEqual(
      darkTheme,
    );
  });

  it("applies the name override", () => {
    expect(createTheme({ mode: "dark", name: "Acme" }).name).toBe("Acme");
    expect(createTheme({ mode: "light" }).name).toBe("Light");
    expect(
      createTheme({ mode: "light", contrast: "high", name: "Acme AAA" }).name,
    ).toBe("Acme AAA");
  });

  it("starts from the contrast variant it names", () => {
    const light = createTheme({ mode: "light", contrast: "high" });
    const dark = createTheme({ mode: "dark", contrast: "high" });
    expect(light.colors).toEqual(highContrastLightTheme.colors);
    expect(light.name).toBe(highContrastLightTheme.name);
    expect(dark.colors).toEqual(highContrastDarkTheme.colors);
    expect(dark.name).toBe(highContrastDarkTheme.name);
    expect(accessibleDarkTheme.colors).toEqual(highContrastDarkTheme.colors);
  });

  it("rebuilds every shipped variant and holds it to its declared floors", () => {
    [themes, highContrastThemes].forEach((set) =>
      Object.values(set).forEach((base) => {
        const built = createTheme({
          mode: base.mode,
          contrast: base.contrast,
        });
        expect(built, base.name).toEqual(base);
        expect(themeContrastFailures(built), base.name).toEqual([]);
      }),
    );
  });

  it("merges an override onto the selected variant", () => {
    const custom = createTheme({
      mode: "dark",
      contrast: "high",
      colors: { primary: highContrastDarkTheme.colors.primary },
      density: "compact",
    });
    expect(custom.colors.background).toBe(
      highContrastDarkTheme.colors.background,
    );
    expect(custom.contrast).toBe("high");
    expect(custom.density.name).toBe("compact");
    expect(themeContrastFailures(custom)).toEqual([]);
  });
});

describe("theme completeness", () => {
  it("gives every shipped theme the same groups", () => {
    const reference = Object.keys(lightTheme).toSorted();
    shippedThemes.forEach(({ theme }) => {
      expect(Object.keys(theme).toSorted(), theme.name).toEqual(reference);
    });
    expect(reference).toContain("motion");
  });

  it("keeps every group through a real override", () => {
    const extended = extendTheme(lightTheme, {
      colors: { primary: "#123456" },
      motion: { fast: 100 },
    });
    expect(extended.colors.primary).toBe("#123456");
    expect(extended.motion.fast).toBe(100);
    expect(Object.keys(extended).toSorted()).toEqual(
      Object.keys(lightTheme).toSorted(),
    );
  });

  it("ships no stacking scale, because GPUix paints in tree order", () => {
    // `node:fs` is deliberate: this is a policy test over the package's own
    // source, and the package ships zero dependencies (see exports.test.ts).
    const source = readFileSync(new URL("./theme.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/z-?index/i);
  });
});

describe("brand example", () => {
  it("extends the dark theme with a brand palette and compact density", () => {
    expect(brandTheme.mode).toBe("dark");
    expect(brandTheme.name).toBe("Acme");
    expect(brandTheme.colors.primary).toBe("#9579FF");
    expect(brandTheme.colors.background).toBe(darkTheme.colors.background);
    expect(brandTheme.radius.md).toBe(8);
    expect(brandTheme.radius.lg).toBe(lightTheme.radius.lg);
    expect(brandTheme.density.name).toBe("compact");
  });

  it("builds the light variant independently", () => {
    expect(brandLightTheme.mode).toBe("light");
    expect(brandLightTheme.name).toBe("Acme Light");
    expect(brandLightTheme.colors.primary).toBe("#6A45F0");
  });

  it("holds the documented examples to the contrast contract", () => {
    expect(themeContrastFailures(brandTheme)).toEqual([]);
    expect(themeContrastFailures(brandLightTheme)).toEqual([]);
  });

  it("holds both documented examples to the total check", () => {
    expect(themeFailures(brandTheme)).toEqual([]);
    expect(themeFailures(brandLightTheme)).toEqual([]);
  });

  it("clears the native document's ink wash on the light brand's link", () => {
    const regressed = createTheme({
      mode: "light",
      name: "Acme Light",
      colors: {
        primary: "#6A45F0",
        primaryForeground: "#FFFFFF",
        primaryHover: "#5A38D8",
        primaryActive: "#4929B8",
        primaryText: "#5330C8",
        ring: "#7C5CFF",
      },
    });

    // The defect plan 745 fixes: the contrast half passes while the ink-washed
    // link misses the body floor the native-text check enforces.
    expect(themeContrastFailures(regressed)).toEqual([]);
    expect(
      themeFailures(regressed)
        .filter(
          (failure): failure is Extract<ThemeFailure, { kind: "nativeText" }> =>
            failure.kind === "nativeText",
        )
        .map(({ role, surface }) => `${role} on ${surface}`),
    ).toEqual([
      "primaryText on background",
      "primaryText on background",
      "primaryText on background",
    ]);
    expect(themeFailures(brandLightTheme)).toEqual([]);
  });

  it("keeps the brand's selected-option check on the fill it marks", () => {
    expect(
      Number(
        contrastRatio(
          brandTheme.colors.primary,
          brandTheme.colors.selected,
        ).toFixed(3),
      ),
    ).toBe(3.146);
    expect(
      contrastRatio(
        brandTheme.colors.primary,
        brandTheme.colors.selectedActive,
      ),
    ).toBeGreaterThanOrEqual(contrastFloors.default.mark);
  });

  it("quotes the shipped identity groove in its rationale", () => {
    // Plan 503 moved `track`; the example's rationale kept plan 347's figure.
    const source = readFileSync(
      new URL("./brand-theme.example.ts", import.meta.url),
      "utf8",
    );
    const groove = contrastRatio(
      brandTheme.colors.primary,
      darkTheme.colors.track,
    );
    expect(groove).toBeLessThan(contrastFloors.default.mark);
    expect(source).toContain(`leaves this fill at ${groove.toFixed(2)}:1`);
  });

  it("moves the whole brand family, not only the fill", () => {
    [brandTheme, brandLightTheme].forEach((theme) => {
      const base = theme.mode === "dark" ? darkTheme : lightTheme;
      (["primaryHover", "primaryActive", "primaryText"] as const).forEach(
        (role) => {
          expect(theme.colors[role], role).not.toBe(base.colors[role]);
        },
      );
      // A foreground may legitimately stay white, so the contract test above is
      // what holds it to the brand fill rather than an inequality against base.
      expect(theme.colors.primaryForeground).toMatch(/^#[0-9A-F]{6}$/);
    });
  });
});
