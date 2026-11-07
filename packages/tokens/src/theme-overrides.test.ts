import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { brandLightTheme, brandTheme } from "./brand-theme.example.js";
import {
  darkTheme,
  densityPresets,
  elevationLevels,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightElevation,
  lightTheme,
  platformNames,
  platformTheme,
  retroNames,
  retroTheme,
  syntaxColors,
  themeOverrides,
  themes,
  type Theme,
} from "./index.js";
import {
  reopenedBrand,
  reopenedOnNewerBase,
  savedBrandEdit,
} from "./theme-export.example.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");

const roundTrip = (theme: Theme, base: Theme): Theme =>
  extendTheme(base, themeOverrides(theme, base));

const shipped = [
  lightTheme,
  darkTheme,
  highContrastLightTheme,
  highContrastDarkTheme,
];

describe("an edit a consumer keeps", () => {
  it("is empty for a theme that is its base", () => {
    expect(shipped.map((theme) => themeOverrides(theme, theme))).toEqual([
      {},
      {},
      {},
      {},
    ]);
  });

  it("names only the groups and values a theme moved", () => {
    const diff = themeOverrides(brandLightTheme, lightTheme);

    expect(Object.keys(diff)).toEqual(["name", "colors"]);
    expect(diff).toEqual({
      name: "Acme Light",
      colors: {
        primary: "#6A45F0",

        ring: "#7A57FA",
      },
    });
    expect(roundTrip(brandLightTheme, lightTheme)).toEqual(brandLightTheme);
  });

  it("reproduces every shipped, platform, authored and brand theme", () => {
    const pairs: ReadonlyArray<{
      readonly base: Theme;
      readonly theme: Theme;
      readonly label: string;
    }> = [
      ...platformNames.flatMap((platform) =>
        shipped.map((base) => ({
          base,
          theme: platformTheme(base, platform),
          label: `${base.name} · ${platform}`,
        })),
      ),
      ...retroNames.flatMap((name) =>
        shipped.map((base) => ({
          base,
          theme: retroTheme(base, name),
          label: `${base.name} · ${name}`,
        })),
      ),
      { base: lightTheme, theme: brandLightTheme, label: "brand light" },
      { base: darkTheme, theme: brandTheme, label: "brand dark" },
    ];

    expect(pairs.filter(({ theme, base }) => theme !== base)).toHaveLength(
      pairs.length,
    );
    pairs.forEach(({ base, theme, label }) => {
      expect(roundTrip(theme, base), label).toEqual(theme);
    });
  });

  it("emits a preset as its whole box and an edited preset by its sizes", () => {
    const preset = extendTheme(lightTheme, { density: "spacious" });
    expect(themeOverrides(preset, lightTheme)).toEqual({
      density: densityPresets.spacious,
    });
    expect(roundTrip(preset, lightTheme)).toEqual(preset);

    const edited = extendTheme(lightTheme, {
      density: { controlHeight: { md: 40 }, rowHeight: 40 },
    });

    expect(themeOverrides(edited, lightTheme)).toEqual({
      density: { controlHeight: { md: 40 }, rowHeight: 40 },
    });
    expect(roundTrip(edited, lightTheme)).toEqual(edited);
  });

  it("carries a moved shadow role to every elevation level", () => {
    const assembled: Theme = {
      ...extendTheme(lightTheme, { colors: { shadow: "#00000033" } }),
      elevation: lightElevation,
    };

    expect(
      Object.keys(themeOverrides(assembled, lightTheme).elevation ?? {}),
    ).toEqual([...elevationLevels]);
    expect(roundTrip(assembled, lightTheme)).toEqual(assembled);
  });

  it("compares a code palette against the table the merge reads", () => {
    const base = extendTheme(lightTheme, { syntax: { keyword: "#B00020" } });
    const theme = extendTheme(base, {
      syntax: { keyword: "#B00020", string: "#1F6FEB" },
    });

    expect(themeOverrides(theme, base)).toEqual({
      syntax: { string: "#1F6FEB" },
    });

    const repeated = extendTheme(lightTheme, {
      syntax: syntaxColors(lightTheme),
    });
    expect(themeOverrides(repeated, lightTheme).syntax).toBeUndefined();
  });

  it("refuses a theme of another mode or contrast variant", () => {
    expect(() => themeOverrides(darkTheme, lightTheme)).toThrow(
      /is not an edit of/,
    );
    expect(() => themeOverrides(darkTheme, lightTheme)).toThrow(/restoreTheme/);
    expect(() => themeOverrides(highContrastLightTheme, lightTheme)).toThrow(
      /is not an edit of/,
    );
    expect(() => themeOverrides(lightTheme, lightTheme)).not.toThrow();
  });

  it("omits the one edit an override cannot express", () => {
    const base = platformTheme(darkTheme, "darwin");
    const theme = retroTheme(base, "aero");
    const diff = themeOverrides(theme, base);

    expect(theme.switch).toBeUndefined();
    expect(theme.switchMetrics).toBeUndefined();
    expect(diff.switch).toBeUndefined();
    expect(diff.switchMetrics).toBeUndefined();
    expect(extendTheme(base, diff).switch).toEqual(base.switch);
    expect(extendTheme(base, diff).switchMetrics).toEqual(base.switchMetrics);
  });

  it("executes the save-and-reopen route the example documents", () => {
    expect(reopenedBrand).toEqual(brandLightTheme);

    const newer = extendTheme(lightTheme, { colors: { card: "#FDFDFE" } });
    expect(savedBrandEdit.colors?.card).toBeUndefined();
    expect(reopenedOnNewerBase(newer).colors.card).toBe("#FDFDFE");
    expect(reopenedOnNewerBase(newer).colors.primary).toBe("#6A45F0");
    expect(reopenedOnNewerBase(themes.dark)).toEqual(
      extendTheme(themes.dark, savedBrandEdit),
    );
  });

  it("teaches the export where the extension mechanism is read", () => {
    const tokens = read("../../../docs/tokens.md");
    const design = read("../../../docs/design-system.md");
    const readme = read("../README.md");
    const inventory = read("../../../.agents/slop/COMPONENTS.md");

    expect(tokens).toContain("#### Exporting an edit");
    expect(tokens).toContain("themeOverrides(theme, base)");
    expect(tokens).toContain("restates every inherited elevation level");
    expect(tokens).toContain("the one edit an override cannot express");
    expect(design).toContain("themeOverrides(theme, base)");
    expect(readme).toContain("themeOverrides(theme, base)");
    expect(inventory).toContain("themeOverrides(theme, base)");
  });
});
