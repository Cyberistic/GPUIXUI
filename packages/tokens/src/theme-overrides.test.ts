/**
 * Guards the export half of the theming extension mechanism.
 *
 * `extendTheme(base, overrides)` is how a brand is built; `themeOverrides(theme,
 * base)` is how an edit is **kept**. A consumer that lets a reader or a brand
 * editor change values resolves a `Theme`, and storing that whole theme pins
 * every role, step and metric it carries — so a palette or type fix in a later
 * release never reaches the brand. The gap this suite covers is that the
 * extension mechanism had no inverse: the only shape a consumer could hand back
 * was the complete theme, never the edit.
 *
 * The contract is a round trip — `extendTheme(base, themeOverrides(theme, base))`
 * reproduces `theme` — with three rules that make it exact: only what moved is
 * named, a density preset that changed is the whole box (a partial override
 * keeps the base's preset name), and a moved `shadow` role names every elevation
 * level (the merge restates inherited levels in the new tint). Two absences are
 * refused or documented rather than guessed: a theme of another mode or contrast
 * variant is refused, and an optional whole group the base carries and the theme
 * does not (`switch`, `switchMetrics`, `series`, `syntax`) cannot be expressed by
 * an override at all — an absent group means "keep the base's".
 */
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

/** The theme a saved edit reproduces over its base. */
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
    // The identity diff must name nothing: a settings panel that stores it
    // inherits every value of the release the reader is on.
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
        // Not `primaryForeground`: the brand names white and so does the light
        // base, so the diff leaves it out and the merge keeps the base's.
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

    // A pair has to be a real edit, so a diff that named nothing could not pass.
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
    // A partial override keeps the base's preset name, so the diff must not
    // name `density` as a whole box — and the sizes that did not move stay out.
    expect(themeOverrides(edited, lightTheme)).toEqual({
      density: { controlHeight: { md: 40 }, rowHeight: 40 },
    });
    expect(roundTrip(edited, lightTheme)).toEqual(edited);
  });

  it("carries a moved shadow role to every elevation level", () => {
    // A theme assembled from two sources: its shadow role moved while its
    // elevation scale stayed the library's own — the shape a store hands back
    // when one release changed the role and the saved theme kept its levels.
    // The merge retints every inherited level when `colors.shadow` moves, so a
    // diff that named only the role would shade this theme's scale in a tint it
    // never asked for.
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
    // A palette that repeats the base's resolved table is no edit: the merge
    // completes a stored palette token by token from that same table.
    const repeated = extendTheme(lightTheme, {
      syntax: syntaxColors(lightTheme),
    });
    expect(themeOverrides(repeated, lightTheme).syntax).toBeUndefined();
  });

  it("refuses a theme of another mode or contrast variant", () => {
    // A mode and a variant are what a theme's numbers mean, so diffing two of
    // them would reproduce a palette under a theme that still said the other
    // thing — the mix `restoreTheme` exists to prevent.
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
    // A look declared over a platform style clears the platform's own toggle,
    // and an override cannot say "none" — an absent group means "keep the
    // base's". The diff leaves both groups out and re-applying it keeps the
    // platform's paint, which is the documented limit rather than a claim.
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
    // The edit keeps exactly what the reader chose …
    expect(reopenedBrand).toEqual(brandLightTheme);
    // … and a later release's values reach every role it did not name, which a
    // whole-theme snapshot could not do.
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
    const inventory = read("../../../COMPONENTS.md");

    expect(tokens).toContain("#### Exporting an edit");
    expect(tokens).toContain("themeOverrides(theme, base)");
    expect(tokens).toContain("restates every inherited elevation level");
    expect(tokens).toContain("the one edit an override cannot express");
    expect(design).toContain("themeOverrides(theme, base)");
    expect(readme).toContain("themeOverrides(theme, base)");
    expect(inventory).toContain("themeOverrides(theme, base)");
  });
});
