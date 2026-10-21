/**
 * Guards the authored looks.
 *
 * The defect this closes: the only way to ship a look that was not one of the
 * four platform names was `extendTheme` one value at a time, so the two most
 * recognisable desktop looks could only be reached by copying twenty roles out
 * of prose. `retroStyles` is the same data shape as `platformStyles` and
 * `applyStyle` is the one merge rule, so a look is data a consumer can read,
 * edit and ship — without `platformNames` growing a value, because that list is
 * the persisted key a consumer stores and the docs toggle offers.
 *
 * The second thing held here is honesty: the palettes are authored (no
 * Microsoft artwork, no bundled face), neither era had a dark mode so both dark
 * editions are invented, and every one of the four themes has to clear the same
 * contrast and decorative contracts as the built-in and platform themes.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { invalidColorRoles } from "./color.js";
import {
  contrastFailures,
  contrastFloors,
  contrastPairs,
  contrastRatio,
} from "./contrast.js";
import { decorativeFailures } from "./decorative.js";
import { elevationWithTint } from "./elevation.js";
import { platformNames, platformStyles, systemUiFont } from "./platforms.js";
import { resolveRetroBrand } from "./retro.example.js";
import { isRetroName, retroNames, retroStyles, retroTheme } from "./retro.js";
import { densityPresets } from "./scale.js";
import {
  highContrastDarkTheme,
  highContrastLightTheme,
  platformTheme,
  themeContrasts,
  themeModes,
  themes,
} from "./theme.js";

const looks = retroNames;

/** Every authored theme: both looks, both modes. */
const retroThemes = looks.flatMap((name) =>
  themeModes.map((mode) => ({
    label: `${name} ${mode}`,
    name,
    mode,
    theme: retroTheme(themes[mode], name),
    base: themes[mode],
  })),
);

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("retroStyles", () => {
  it("describes every authored look, and nothing else", () => {
    expect(Object.keys(retroStyles).toSorted()).toEqual(looks.toSorted());
  });

  it("narrows a stored look name to the ones it ships", () => {
    looks.forEach((name) => expect(isRetroName(name)).toBe(true));
    // A stored value is `unknown`: a renamed look, a different case or a number
    // must not reach `retroStyles[name]` as `undefined`.
    ["Luna", "aero ", "", "win32", 7, null].forEach((value) =>
      expect(isRetroName(value), String(value)).toBe(false),
    );
  });

  it("keeps the platform axis as it is", () => {
    // A look is not a platform: the persisted key and the docs toggle offer the
    // four operating systems, and a look is applied by name instead.
    looks.forEach((name) => expect(platformNames).not.toContain(name));
  });

  it("names a sentinel UI face, one mono family and a full radius scale", () => {
    looks.forEach((name) => {
      const style = retroStyles[name];
      expect(style.sans, name).toBe(systemUiFont);
      expect(style.mono, name).not.toContain(",");
      expect(style.radius.full, name).toBeGreaterThan(99);
      expect(densityPresets[style.density], name).toBeDefined();
      expect(themeContrasts, name).toContain(style.contrast);
    });
  });

  it("names no role as undefined", () => {
    const empty = looks.flatMap((name) =>
      themeModes.flatMap((mode) =>
        Object.entries(retroStyles[name].colors[mode])
          .filter(([, value]) => value === undefined)
          .map(([role]) => `${name} ${mode} ${role}`),
      ),
    );
    expect(empty).toEqual([]);
  });

  it("paints each era as its own look, not a renamed platform", () => {
    themeModes.forEach((mode) => {
      const painted = looks.map((name) => retroTheme(themes[mode], name));
      const windows = platformTheme(themes[mode], "win32");
      const backgrounds = [...painted, windows].map(
        (theme) => theme.colors.background,
      );
      const primaries = [...painted, windows].map(
        (theme) => theme.colors.primary,
      );
      expect(new Set(backgrounds).size, mode).toBe(backgrounds.length);
      expect(new Set(primaries).size, mode).toBe(primaries.length);
      expect(retroTheme(themes[mode], "luna").radius.md, mode).toBeLessThan(
        retroTheme(themes[mode], "aero").radius.md,
      );
    });
  });
});

describe("retroTheme", () => {
  it("repaints, re-shapes and re-types without touching the base", () => {
    retroThemes.forEach(({ label, name, theme, base }) => {
      const style = retroStyles[name];
      expect(theme.mode, label).toBe(base.mode);
      expect(theme.name, label).toContain(style.label);
      expect(theme.typography.mono, label).toBe(style.mono);
      expect(theme.typography.sans, label).toBe(systemUiFont);
      expect(theme.colors.background, label).toBe(
        style.colors[base.mode].background,
      );
      expect(theme.radius.md, label).toBe(style.radius.md);
      expect(theme.density.name, label).toBe(style.density);
      // Untouched groups stay the base theme's: a look changes chrome, shape
      // and type, not the spacing scale or the shadow design. Elevation keeps
      // the base geometry, restated in the look's own `shadow` role — that is
      // how a look that carries its own tint owns its shadows.
      expect(theme.spacing, label).toEqual(base.spacing);
      expect(theme.elevation, label).toEqual(
        elevationWithTint(base.elevation, theme.colors.shadow),
      );
      expect(theme.borderWidth, label).toEqual(base.borderWidth);
      expect(theme.iconSize, label).toEqual(base.iconSize);
      expect(theme.typography.body, label).toEqual(base.typography.body);
    });
  });

  it("keeps every role a component reads", () => {
    retroThemes.forEach(({ label, theme, base }) => {
      expect(Object.keys(theme.colors).toSorted(), label).toEqual(
        Object.keys(base.colors).toSorted(),
      );
      expect(Object.keys(theme.radius).toSorted(), label).toEqual(
        Object.keys(base.radius).toSorted(),
      );
      expect(invalidColorRoles(theme), label).toEqual([]);
    });
  });

  it("inherits a role the look does not author", () => {
    retroThemes.forEach(({ label, theme, base }) => {
      expect(theme.colors.destructive, label).toBe(base.colors.destructive);
      expect(theme.colors.overlay, label).toBe(base.colors.overlay);
    });
  });

  it("leaves the base theme untouched", () => {
    const before = JSON.stringify(themes);
    looks.forEach((name) => retroTheme(themes.light, name));
    expect(JSON.stringify(themes)).toBe(before);
  });

  it("keeps a high-contrast base's colours and takes the rest", () => {
    looks.forEach((name) => {
      const themed = retroTheme(highContrastDarkTheme, name);
      expect(themed.contrast, name).toBe("high");
      expect(themed.colors, name).toEqual(highContrastDarkTheme.colors);
      expect(themed.radius, name).toEqual(retroStyles[name].radius);
      expect(themed.density.name, name).toBe(retroStyles[name].density);
      expect(retroTheme(highContrastLightTheme, name).colors, name).toEqual(
        highContrastLightTheme.colors,
      );
    });
  });

  it("ships a dark edition for an era that had none", () => {
    // Neither Luna nor Aero shipped a dark mode; these are authored for the
    // library, so each must exist for both modes and be a real second palette.
    const overBlack = (color: string | undefined): number =>
      contrastRatio(color ?? "#FFFFFF", "#000000") ?? 0;
    looks.forEach((name) => {
      const { light, dark } = retroStyles[name].colors;
      expect(light.background, name).toBeDefined();
      expect(dark.background, name).toBeDefined();
      expect(dark.background, name).not.toBe(light.background);
      expect(dark.primary, name).not.toBe(light.primary);
      expect(overBlack(dark.background), name).toBeLessThan(
        overBlack(light.background),
      );
    });
  });
});

describe("authored look contrast", () => {
  retroThemes.forEach(({ label, theme }) => {
    contrastPairs.forEach(({ foreground, background, floor }) => {
      it(`${label}: ${foreground} on ${background} meets ${contrastFloors[floor]}:1`, () => {
        expect(
          contrastRatio(theme.colors[foreground], theme.colors[background]),
          `${label} ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(contrastFloors[floor]);
      });
    });

    it(`${label}: every decorative surface is visible`, () => {
      expect(decorativeFailures(theme)).toEqual([]);
    });
  });
});

describe("editing an authored look", () => {
  it("keeps the era's other values and overrides only what it names", () => {
    themeModes.forEach((mode) => {
      const brand = resolveRetroBrand(mode);
      const aero = retroTheme(themes[mode], "aero");
      expect(brand.name).toBe("Aero brand");
      expect(brand.colors.primary).toBe("#0F5E8C");
      expect(brand.colors.card).toBe(aero.colors.card);
      expect(brand.radius.md).toBe(6);
      expect(brand.radius.sm).toBe(aero.radius.sm);
      expect(brand.density.name).toBe(aero.density.name);
      expect(brand.typography.mono).toBe(aero.typography.mono);
    });
  });

  it("stays readable in both modes", () => {
    // The brand owns its on-colour and its accent family, so the audit the
    // library publishes passes on the result.
    themeModes.forEach((mode) => {
      expect(invalidColorRoles(resolveRetroBrand(mode)), mode).toEqual([]);
      expect(contrastFailures(resolveRetroBrand(mode)), mode).toEqual([]);
      expect(decorativeFailures(resolveRetroBrand(mode)), mode).toEqual([]);
    });
  });
});

/**
 * Guards the prose the provenance and the contract live in. A look that is
 * documented as a platform, or with invented dark palettes presented as
 * historical, sends a consumer looking for a toggle entry that does not exist
 * and copies colours the era never used.
 */
describe("retro documentation", () => {
  const inventoryRow = (): Record<string, string> => {
    const row = read("../../../COMPONENTS.md")
      .split("\n")
      .find((line) => line.startsWith("| Retro looks |"));
    return row === undefined ? {} : { "COMPONENTS.md": row };
  };

  const surfaces = (): Record<string, string> => ({
    "docs/tokens.md": read("../../../docs/tokens.md"),
    "docs/design-system.md": read("../../../docs/design-system.md"),
    "README.md": read("../README.md"),
    ...inventoryRow(),
  });

  it("records the looks in the inventory", () => {
    expect(Object.keys(inventoryRow())).toEqual(["COMPONENTS.md"]);
  });

  it("names the table and the resolver in every surface", () => {
    const silent = Object.entries(surfaces())
      .filter(
        ([, text]) =>
          !text.includes("retroStyles") || !text.includes("retroTheme"),
      )
      .map(([name]) => name);
    expect(silent).toEqual([]);
  });

  it("says the looks are not platform names", () => {
    // Emphasis markers and line wrapping are formatting, not meaning.
    const plain = (text: string): string =>
      text.replaceAll("*", "").replace(/\s+/g, " ");
    const vague = Object.entries(surfaces())
      .filter(
        ([, text]) => !/not (a platform|platform names)/i.test(plain(text)),
      )
      .map(([name]) => name);
    expect(vague).toEqual([]);
  });

  it("says both dark editions are authored, not historical", () => {
    const unprovenanced = Object.entries(surfaces())
      .filter(
        ([, text]) =>
          !/dark (editions?|sets?|modes?)/i.test(text) ||
          !/invented|authored/i.test(text),
      )
      .map(([name]) => name);
    expect(unprovenanced).toEqual([]);
  });

  it("names the contract the looks are held to", () => {
    const vague = Object.entries(surfaces())
      .filter(
        ([, text]) =>
          !text.includes("contrastFailures") ||
          !text.includes("decorativeFailures") ||
          !text.includes("retro.test.ts"),
      )
      .map(([name]) => name);
    expect(vague).toEqual([]);
  });

  it("prints each look's radius and density as the table carries them", () => {
    const catalogue = read("../../../docs/tokens.md");
    const wrong = looks
      .map((name) => {
        const style = retroStyles[name];
        const row = catalogue
          .split("\n")
          .find((line) => line.startsWith(`| \`${name}\``));
        const expected = [
          style.mono,
          `radius.md ${style.radius.md}`,
          style.density,
        ];
        return row !== undefined &&
          expected.every((value) => row.includes(value))
          ? []
          : [name];
      })
      .flat();
    expect(wrong).toEqual([]);
  });
});

describe("platformStyles unchanged", () => {
  it("still has one style per platform name", () => {
    expect(Object.keys(platformStyles).toSorted()).toEqual(
      platformNames.toSorted(),
    );
  });
});
