/**
 * Guards the extension contract: overrides merge without mutating the base,
 * typography merges field by field, elevation replaces whole levels, and a
 * theme can never change its mode through an override.
 */
import { describe, expect, it } from "vitest";
import { brandLightTheme, brandTheme } from "./brand-theme.example.js";
import { resolveTheme } from "./high-contrast.example.js";
import { densityPresets, type BoxShadow } from "./index.js";
import {
  createTheme,
  darkTheme,
  extendTheme,
  getTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  highContrastThemes,
  lightTheme,
  themes,
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
    const shadow: BoxShadow = {
      offsetX: 0,
      offsetY: 2,
      blurRadius: 4,
      spreadRadius: 0,
      color: "#000000",
    };
    const custom = extendTheme(lightTheme, { elevation: { md: [shadow] } });
    expect(custom.elevation.md).toEqual([shadow]);
    expect(custom.elevation.sm).toBe(lightTheme.elevation.sm);
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
});

describe("createTheme", () => {
  it("builds the matching built-in theme by default", () => {
    const created = createTheme({ mode: "dark" });
    expect(created).not.toBe(darkTheme);
    expect(created).toEqual(darkTheme);
  });

  it("applies the name override", () => {
    expect(createTheme({ mode: "dark", name: "Acme" }).name).toBe("Acme");
    expect(createTheme({ mode: "light" }).name).toBe("Light");
  });
});

describe("brand example", () => {
  it("extends the dark theme with a brand palette and compact density", () => {
    expect(brandTheme.mode).toBe("dark");
    expect(brandTheme.name).toBe("Acme");
    expect(brandTheme.colors.primary).toBe("#7C5CFF");
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
});
