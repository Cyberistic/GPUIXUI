import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditTheme } from "./audit.js";
import { contrastFloorsFor, contrastRatio } from "./contrast.js";
import { nativeTextFills, nativeTextTheme } from "./native-text.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import {
  darkSyntax,
  highContrastDarkSyntax,
  highContrastLightSyntax,
  lightSyntax,
  syntaxColors,
  syntaxFailures,
  syntaxRoleFloors,
  syntaxRoles,
  syntaxSurfaces,
  type StoredSyntax,
  type SyntaxColors,
  type SyntaxSource,
} from "./syntax.js";
import {
  houseAudit,
  housePalette,
  houseSyntaxLook,
  houseSyntaxLookTheme,
  houseSyntaxTheme,
  syntaxReport,
} from "./syntax.example.js";
import {
  applyStyle,
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  platformTheme,
  restoreTheme,
  themes,
  type StoredTheme,
  type Theme,
} from "./theme.js";

const shippedThemes = [
  lightTheme,
  darkTheme,
  highContrastLightTheme,
  highContrastDarkTheme,
] as const;

const platformThemes = platformNames
  .filter((name) => name !== "default")
  .flatMap((name) => [
    platformTheme(themes.light, name),
    platformTheme(themes.dark, name),
  ]);

const lookThemes = retroNames.flatMap((name) => [
  retroTheme(themes.light, name),
  retroTheme(themes.dark, name),
]);

const everyTheme: ReadonlyArray<Theme> = [
  ...shippedThemes,
  ...platformThemes,
  ...lookThemes,
];

const tables: ReadonlyArray<readonly [string, typeof lightSyntax]> = [
  ["light", lightSyntax],
  ["dark", darkSyntax],
  ["high-contrast light", highContrastLightSyntax],
  ["high-contrast dark", highContrastDarkSyntax],
];

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("the syntax palette", () => {
  it("paints a colour for every token type, and no token the runtime cannot read", () => {
    const roles = [...syntaxRoles].toSorted();

    tables.forEach(([name, table]) => {
      expect(Object.keys(table).toSorted(), name).toEqual(roles);
      expect(
        Object.values(table).every((value) => /^#[0-9A-F]{6}$/i.test(value)),
        name,
      ).toBe(true);
    });

    expect(new Set(syntaxRoles).size).toBe(syntaxRoles.length);
  });

  it("holds every token to its floor on every fill a host paints", () => {
    expect(syntaxSurfaces).toEqual(nativeTextFills);

    const failing = everyTheme.flatMap((theme) =>
      syntaxFailures(theme).map(
        ({ role, surface, ratio }) =>
          `${theme.name} ${role} on ${surface}: ${ratio}`,
      ),
    );

    expect(failing).toEqual([]);

    expect(syntaxRoles.length * syntaxSurfaces.length * everyTheme.length).toBe(
      24 * 2 * 16,
    );
  });

  it("prints the tightest token, computed from the tables and the fills", () => {
    const cells = everyTheme.flatMap((theme) =>
      syntaxRoles.flatMap((role) =>
        syntaxSurfaces.map((surface) => ({
          theme: theme.name,
          role,
          surface,
          ratio: contrastRatio(
            syntaxColors(theme)[role],
            theme.colors[surface],
          ),
        })),
      ),
    );

    const code = cells.filter(({ role }) => role !== "comment");
    const tightest = code.reduce((worst, cell) =>
      (cell.ratio ?? 1) < (worst.ratio ?? 1) ? cell : worst,
    );

    expect([
      tightest.role,
      tightest.surface,
      Number((tightest.ratio ?? 0).toFixed(2)),
      tightest.theme,
    ]).toEqual(["string", "background", 7.66, "Light · Windows XP (Luna)"]);
  });

  it("holds a comment to the quiet floor, and the high-contrast tables to AAA", () => {
    const floors = contrastFloorsFor(lightTheme);
    const high = contrastFloorsFor(highContrastLightTheme);

    expect(floors.secondary).toBe(4.5);
    expect(high.secondary).toBe(7);

    const quiet = contrastRatio(
      lightSyntax.comment,
      lightTheme.colors.background,
    );
    expect(quiet).toBeGreaterThanOrEqual(floors.secondary);
    expect(quiet).toBeLessThan(floors.body);
    expect(
      contrastRatio(
        highContrastLightSyntax.comment,
        highContrastLightTheme.colors.background,
      ),
    ).toBeGreaterThanOrEqual(high.secondary);
    expect(syntaxRoles.filter((role) => role !== "comment")).toEqual(
      syntaxRoles.filter((role) => syntaxRoleFloors[role] === "body"),
    );
    expect(syntaxRoleFloors.comment).toBe("secondary");
  });

  it("resolves a table by mode and contrast variant", () => {
    expect(syntaxColors(lightTheme)).toBe(lightSyntax);
    expect(syntaxColors(darkTheme)).toBe(darkSyntax);
    expect(syntaxColors(highContrastLightTheme)).toBe(highContrastLightSyntax);
    expect(syntaxColors(highContrastDarkTheme)).toBe(highContrastDarkSyntax);

    expect(syntaxColors(houseSyntaxTheme)).toBe(houseSyntaxTheme.syntax);
  });

  it("merges a brand's palette token by token, and leaves an untouched theme absent", () => {
    const brand = extendTheme(lightTheme, {
      syntax: { ...syntaxColors(lightTheme), keyword: "#7A1F5C" },
    });

    expect(brand.syntax?.keyword).toBe("#7A1F5C");
    expect(brand.syntax?.number).toBe(lightSyntax.number);
    expect(syntaxColors(brand).string).toBe(lightSyntax.string);

    expect(extendTheme(lightTheme, {}).syntax).toBeUndefined();
    expect(lightTheme.syntax).toBeUndefined();

    const darkBrand = extendTheme(darkTheme, {
      syntax: { ...syntaxColors(darkTheme), keyword: "#C7CBFF" },
    });
    expect(darkBrand.syntax?.number).toBe(darkSyntax.number);
  });

  it("reports a token that vanishes into the page", () => {
    const vanishes = extendTheme(lightTheme, {
      syntax: {
        ...syntaxColors(lightTheme),
        keyword: lightTheme.colors.background,
      },
    });
    const audit = auditTheme(vanishes);

    expect(
      syntaxFailures(vanishes).map(({ role, surface }) => `${role}/${surface}`),
    ).toEqual(["keyword/input", "keyword/background"]);
    expect(audit.passed).toBe(false);

    expect(audit.contrast).toEqual([]);
    expect(audit.decorative).toEqual([]);
    expect(audit.syntax.map(({ role }) => role)).toEqual([
      "keyword",
      "keyword",
    ]);
  });

  it("reports a token it cannot measure rather than counting it as a pass", () => {
    const named = extendTheme(lightTheme, {
      syntax: { ...syntaxColors(lightTheme), keyword: "oklch(0.4 0.16 280)" },
    });
    const reported = syntaxFailures(named).filter(
      ({ role }) => role === "keyword",
    );

    expect(reported).toHaveLength(2);
    expect(reported.every(({ ratio }) => ratio === undefined)).toBe(true);
  });

  it("reports an absent fill rather than crashing on a stored theme", () => {
    const reported = syntaxFailures({ mode: "light", colors: {} });

    expect(reported).toHaveLength(syntaxRoles.length * syntaxSurfaces.length);
    expect(reported.every(({ ratio }) => ratio === undefined)).toBe(true);
  });

  it("follows a look's own palette under the palette rule", () => {
    const light = houseSyntaxLookTheme("light");
    const dark = houseSyntaxLookTheme("dark");
    const high = applyStyle(highContrastLightTheme, houseSyntaxLook);
    expect(syntaxColors(light).keyword).toBe("#4A2A7A");

    expect(syntaxColors(dark).keyword).toBe(darkSyntax.keyword);

    expect(syntaxColors(high).keyword).toBe(highContrastLightSyntax.keyword);
    expect(syntaxColors(high).comment).toBe(highContrastLightSyntax.comment);
  });

  it("hands the palette to the painter the code block now resolves", () => {
    expect(nativeTextTheme(lightTheme).syntax).toBe(lightSyntax);
    expect(nativeTextTheme(darkTheme, "background").syntax).toBe(darkSyntax);

    const seam = read("./native-text.ts");
    expect(seam).toContain("syntax: syntaxColors(theme)");
    const codeBlock = read("../../components/src/code-block.tsx");
    expect(codeBlock).toContain("syntaxColors(theme)");
    expect(codeBlock).toContain("bg-background");
    const tokenize = read("../../components/src/code-block/tokenize.ts");
    expect(tokenize).toContain("tokenRole");

    expect(syntaxSurfaces).toContain("background");
  });

  it("prints the paint the window measured, not only the host object", () => {
    const catalogue = read("../../../docs/tokens.md");
    const inventory = read("../../../.agents/slop/COMPONENTS.md");
    const probe = read("../../../apps/playground/README.md");
    const measured = probe.slice(probe.indexOf("### `syntax-palette`"));
    expect(measured).not.toBe("");

    expect(read("../../../apps/playground/src/live/registry.ts")).toContain(
      '"syntax-palette"',
    );

    const block = (label: string) => {
      const line = measured
        .split("\n")
        .find((text) => text.startsWith(`| ${label} |`));
      const found = /`(#[0-9A-Fa-f]{6})`[^|]*\| \*\*(\d+)\*\*/.exec(line ?? "");
      expect(line, label).toBeDefined();
      expect(found, label).not.toBeNull();
      return { keyword: found?.[1] ?? "", pixels: Number(found?.[2]) };
    };

    const light = block("light fill");
    const dark = block("dark fill");
    const control = block("dark fill, no `syntax`");

    expect(light.keyword).toBe(lightSyntax.keyword);
    expect(dark.keyword).toBe(darkSyntax.keyword);
    expect([lightSyntax.keyword, darkSyntax.keyword]).not.toContain(
      control.keyword,
    );

    const paletteStart = catalogue.indexOf("## Syntax palette");
    const palette = catalogue.slice(
      paletteStart,
      catalogue.indexOf("\n## ", paletteStart),
    );
    const adoptionStart = palette.indexOf("**Adoption.**");
    const adoption = palette.slice(adoptionStart);
    const row =
      inventory
        .split("\n")
        .find((text) => text.startsWith("| Syntax palette |")) ?? "";

    const pages = [
      ["docs/tokens.md", adoption],
      [".agents/slop/COMPONENTS.md", row],
      ["packages/tokens/README.md", read("../README.md")],
    ] as const;
    const readings = [light, dark, control];

    pages.forEach(([page, text]) => {
      expect(text, page).toContain("syntax-palette");
      expect(text, page).toContain("29");
      readings.forEach(({ keyword, pixels }) => {
        expect(text, page).toContain(keyword);
        expect(text, page).toContain(String(pixels));
      });

      expect(text, page).not.toContain("not yet measured in a window");
      expect(text, page).not.toContain("recorded in `.agents/slop/TODO.md`");
    });
  });

  it("executes the documented brand, whose two tokens keep every other key", () => {
    expect(housePalette.keyword).toBe("#7A1F5C");
    expect(housePalette.string).toBe("#0B5E4A");
    expect(housePalette.number).toBe(lightSyntax.number);
    expect(syntaxReport(houseSyntaxTheme)).toEqual([]);
    expect(houseAudit.syntax).toEqual([]);
    expect(houseAudit.passed).toBe(true);
  });

  it("says the palette the native hosts paint is this package's", () => {
    const row =
      read("../../../.agents/slop/COMPONENTS.md")
        .split("\n")
        .find((line) => line.startsWith("| Native text hosts |")) ?? "";

    expect(row).toContain("`syntaxColors(theme)`");
    expect(row).not.toContain("the syntax palette stay the runtime's");
    expect(row).not.toContain(
      "the syntax palette, gutters, diff paddings and table column minima stay",
    );

    expect(nativeTextTheme(lightTheme).syntax).toEqual(
      syntaxColors(lightTheme),
    );
  });
});

describe("a stored contrast variant", () => {
  const stored = (contrast: unknown): SyntaxSource => ({
    ...lightTheme,
    contrast,
  });

  it("resolves the table designed for the strict floors", () => {
    expect(syntaxColors(stored("HIGH"))).toBe(highContrastLightSyntax);

    expect(syntaxColors(stored("default"))).toBe(lightSyntax);
    expect(syntaxColors(stored(undefined))).toBe(lightSyntax);
  });
});

describe("a stored theme mode", () => {
  const stored = (mode: unknown, base: Theme): SyntaxSource => ({
    ...base,
    mode,
  });

  it("resolves the palette its page implies", () => {
    expect(syntaxColors(stored("Dark", darkTheme))).toBe(darkSyntax);
    expect(syntaxColors(stored("LIGHT", lightTheme))).toBe(lightSyntax);
    expect(syntaxColors(stored("Dark", highContrastDarkTheme))).toBe(
      highContrastDarkSyntax,
    );

    expect(syntaxColors(stored(undefined, lightTheme))).toBe(lightSyntax);
  });

  it("measures the palette the code block will paint", () => {
    expect(syntaxFailures(stored("Dark", darkTheme))).toEqual([]);

    expect(
      syntaxFailures({ ...darkTheme, mode: "light" }).some(
        (failure) => failure.role === "keyword",
      ),
    ).toBe(true);
  });
});

describe("a palette a store wrote short", () => {
  const stored: StoredTheme = {
    mode: "dark",
    syntax: {
      keyword: "#A7A9FF",
      comment: null,
      number: "",
      string: "oklch(0.7 0.14 150)",
    },
  };

  it("completes the table a restored theme paints", () => {
    const restored = restoreTheme(stored);

    expect(restored.syntax?.keyword).toBe("#A7A9FF");
    expect(restored.syntax?.comment).toBe(darkSyntax.comment);
    expect(restored.syntax?.number).toBe(darkSyntax.number);

    expect(restored.syntax?.string).toBe("oklch(0.7 0.14 150)");
    expect(Object.keys(restored.syntax ?? {}).toSorted()).toEqual(
      [...syntaxRoles].toSorted(),
    );
  });

  it("completes the palette the native host is handed", () => {
    const host = nativeTextTheme({ ...darkTheme, syntax: stored.syntax });

    expect(host.syntax.keyword).toBe("#A7A9FF");
    expect(host.syntax.comment).toBe(darkSyntax.comment);
    expect(syntaxRoles.every((role) => host.syntax[role] !== undefined)).toBe(
      true,
    );
  });

  it("still reports every token the store lost", () => {
    const row = { ...darkTheme, syntax: stored.syntax };
    const lost = syntaxRoles.filter((role) => role !== "keyword");
    const reported = syntaxFailures(row).map(({ role }) => role);

    expect(reported.toSorted()).toEqual([...lost, ...lost].toSorted());

    expect(restoreTheme(stored).syntax?.comment).toBe(darkSyntax.comment);
    expect(auditTheme(row).passed).toBe(false);
    expect(new Set(auditTheme(row).syntax.map(({ role }) => role))).toEqual(
      new Set(lost),
    );
  });

  it("hands a complete palette back as the object it is", () => {
    const authored: SyntaxColors = { ...darkSyntax, keyword: "#C7CBFF" };
    const complete: StoredSyntax = authored;

    expect(syntaxColors({ mode: "dark", syntax: authored })).toBe(authored);
    expect(syntaxColors({ mode: "dark", syntax: complete })).toBe(complete);

    expect(syntaxColors(darkTheme)).toBe(darkSyntax);
  });

  it("reads an authored override token by token", () => {
    const brand = extendTheme(darkTheme, { syntax: { keyword: "#C7CBFF" } });

    expect(brand.syntax?.keyword).toBe("#C7CBFF");
    expect(brand.syntax?.number).toBe(darkSyntax.number);
    expect(brand.syntax?.comment).toBe(darkSyntax.comment);
    expect(Object.keys(brand.syntax ?? {})).toHaveLength(syntaxRoles.length);
  });
});
