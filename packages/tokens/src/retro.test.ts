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
import {
  isRetroName,
  retroNames,
  retroStyles,
  retroTheme,
  type RetroName,
} from "./retro.js";
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

    ["Luna", "aero ", "", "win32", 7, null].forEach((value) =>
      expect(isRetroName(value), String(value)).toBe(false),
    );
  });

  it("refuses a stored look its resolver cannot find", () => {
    const stored = JSON.parse('"aqua"') as RetroName;

    expect(() => retroTheme(themes.light, stored)).toThrow(
      /`aqua` is not an authored look/,
    );
    expect(() => retroTheme(themes.light, stored)).toThrow(/isRetroName/);

    looks.forEach((name) =>
      expect(retroTheme(themes.light, name).mode).toBe("light"),
    );
  });

  it("paints Omarchy with its own palette, square geometry and mono face", () => {
    const style = retroStyles.omarchy;
    expect(style.label).toBe("Omarchy");
    expect(style.mono).toBe("JetBrains Mono");
    expect(style.radius).toEqual({
      none: 0,
      sm: 1,
      md: 2,
      lg: 3,
      xl: 4,
      full: 9999,
    });
    expect(style.density).toBe("compact");

    expect(style.colors.dark.background).toBe("#1A1B26");
    expect(style.colors.dark.primary).toBe("#7AA2F7");
    expect(style.colors.dark.foreground).toBe("#C0CAF5");
    expect(style.colors.dark.selected).toBe("#292E42");

    expect(style.colors.light.background).toBe("#FFFCF0");
    expect(style.colors.light.primary).toBe("#205EA6");
  });

  it("keeps the platform axis as it is", () => {
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

  it("paints each look as its own, not a renamed platform", () => {
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
    retroThemes.forEach(({ label, name, theme, base }) => {
      if (name !== "omarchy") {
        expect(theme.colors.destructive, label).toBe(base.colors.destructive);
      }
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

  it("ships both editions as a real second palette", () => {
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

      expect(brand.colors.primary).toBe(
        mode === "dark" ? "#4FA9E0" : "#0F5E8C",
      );
      expect(brand.colors.primaryForeground).toBe(
        mode === "dark" ? "#06222F" : "#FFFFFF",
      );
      expect(brand.colors.card).toBe(aero.colors.card);
      expect(brand.radius.md).toBe(6);
      expect(brand.radius.sm).toBe(aero.radius.sm);
      expect(brand.density.name).toBe(aero.density.name);
      expect(brand.typography.mono).toBe(aero.typography.mono);
    });
  });

  it("stays readable in both modes", () => {
    themeModes.forEach((mode) => {
      expect(invalidColorRoles(resolveRetroBrand(mode)), mode).toEqual([]);
      expect(contrastFailures(resolveRetroBrand(mode)), mode).toEqual([]);
      expect(decorativeFailures(resolveRetroBrand(mode)), mode).toEqual([]);
    });
  });
});

describe("retro documentation", () => {
  const inventoryRow = (): Record<string, string> => {
    const row = read("../../../.agents/slop/COMPONENTS.md")
      .split("\n")
      .find((line) => line.startsWith("| Retro looks |"));
    return row === undefined ? {} : { ".agents/slop/COMPONENTS.md": row };
  };

  const surfaces = (): Record<string, string> => ({
    "docs/tokens.md": read("../../../docs/tokens.md"),
    "docs/design-system.md": read("../../../docs/design-system.md"),
    "README.md": read("../README.md"),
    ...inventoryRow(),
  });

  it("records the looks in the inventory", () => {
    expect(Object.keys(inventoryRow())).toEqual([".agents/slop/COMPONENTS.md"]);
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
    const plain = (text: string): string =>
      text.replaceAll("*", "").replace(/\s+/g, " ");
    const vague = Object.entries(surfaces())
      .filter(
        ([, text]) => !/not (a platform|platform names)/i.test(plain(text)),
      )
      .map(([name]) => name);
    expect(vague).toEqual([]);
  });

  it("keeps the invented dark editions with the era that invented them", () => {
    const everyLookInvented = Object.entries(surfaces())
      .filter(([, text]) =>
        /their (?:dark )?(?:editions?|sets?|modes?) (?:are|is) invented/i.test(
          text,
        ),
      )
      .map(([name]) => name);
    expect(everyLookInvented).toEqual([]);
    const provenanced = Object.entries(surfaces())
      .filter(
        ([, text]) =>
          !/omarchy/i.test(text) ||
          !/(colors\.toml|tokyo night|flexoki)/i.test(text),
      )
      .map(([name]) => name);
    expect(provenanced).toEqual([]);
    const unscoped = Object.entries(surfaces())
      .filter(
        ([, text]) =>
          !/dark (?:editions?|sets?|modes?)/i.test(text) ||
          !/invented|authored/i.test(text) ||
          !/neither[^.]{0,40}era[^.]{0,80}dark\s+mode/i.test(text),
      )
      .map(([name]) => name);
    expect(unscoped).toEqual([]);
  });

  it("names every look in the inventory row and the README table", () => {
    const unnamed = looks
      .map((name) => retroStyles[name].label)
      .filter(
        (label) =>
          !(inventoryRow()[".agents/slop/COMPONENTS.md"] ?? "").includes(label),
      );
    expect(unnamed).toEqual([]);
    const readme = read("../README.md");
    const missing = looks
      .map((name) => `| \`${name}\` (`)
      .filter((cell) => !readme.includes(cell));
    expect(missing).toEqual([]);
  });

  it("states the look and theme counts the tables carry", () => {
    const numberWords = [
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
    ];
    const spelled = (count: number): string =>
      numberWords[count] ?? String(count);
    const lookCount = spelled(looks.length);
    const themeCount = spelled(looks.length * themeModes.length);
    const claimed = (text: string, pattern: RegExp): ReadonlyArray<string> =>
      [...text.matchAll(pattern)]
        .map((match) => match[1] ?? "")
        .filter((word) => word !== "")
        .map((word) => word.toLowerCase());
    const looksClaimed = (text: string): ReadonlyArray<string> =>
      claimed(
        text,
        /\b(both|one|two|three|four|five|six|seven|eight|nine|ten|\d+) (?:authored )?looks\b/gi,
      );
    const themesClaimed = (text: string): ReadonlyArray<string> =>
      claimed(
        text,
        /\ball (one|two|three|four|five|six|seven|eight|nine|ten|\d+) themes\b/gi,
      );
    const wrong = Object.entries(surfaces()).flatMap(([name, text]) => [
      ...looksClaimed(text)
        .filter((word) => word !== lookCount)
        .map((word) => `${name}: ${word} looks`),
      ...themesClaimed(text)
        .filter((word) => word !== themeCount)
        .map((word) => `${name}: ${word} themes`),
    ]);
    expect(wrong).toEqual([]);
    const silent = Object.entries(surfaces())
      .filter(
        ([, text]) =>
          looksClaimed(text).length === 0 && themesClaimed(text).length === 0,
      )
      .map(([name]) => name);
    expect(silent).toEqual([]);
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

  it("prints each look's family, radius and density as the table carries them", () => {
    const catalogue = read("../../../docs/tokens.md");
    const missing = looks
      .map((name) => {
        const style = retroStyles[name];
        return `| \`${name}\` — ${style.label} | \`${style.mono}\` | ${style.radius.md} | \`${style.density}\` |`;
      })
      .filter((row) => !catalogue.includes(row));
    expect(missing).toEqual([]);
  });
});

describe("platformStyles unchanged", () => {
  it("still has one style per platform name", () => {
    expect(Object.keys(platformStyles).toSorted()).toEqual(
      platformNames.toSorted(),
    );
  });
});
