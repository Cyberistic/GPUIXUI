/**
 * Guards the syntax palette — the one native surface a reader spends time in.
 *
 * The bug: a `<code>` host highlights with the theme object's `syntax` field,
 * and this package shipped none, so a light theme's code block painted the
 * runtime's built-in **dark** palette. Nothing measured a token colour, so a
 * palette edit could have made a keyword vanish into the page with every report
 * empty — the host would have painted it, and no suite would have seen it.
 *
 * The contract: every token that names code is read at the body floor on both
 * fills a host paints, and a comment — an annotation about the code rather than
 * the code — at the secondary floor, which a high-contrast theme raises to 7:1
 * (hence a table per mode *and* variant). The cases below hold the tables, the
 * resolution, the brand merge, the style route, the two directions a failure can
 * take, and the painter that hands the palette to the runtime.
 *
 * `node:fs` is deliberate, as in `docs.test.ts`: the painter cases read the
 * package and component sources, and this package keeps zero runtime
 * dependencies by design.
 */

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
  themes,
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

/** Every theme the library ships: four base variants, each platform style, each look, both modes. */
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
      // A palette is complete rather than partial: the runtime's own fields are
      // optional, so a missing key would silently inherit the foreign colour the
      // seam exists to replace.
      expect(Object.keys(table).toSorted(), name).toEqual(roles);
      expect(
        Object.values(table).every((value) => /^#[0-9A-F]{6}$/i.test(value)),
        name,
      ).toBe(true);
    });
    // The list has no duplicate, which would make one key silently win.
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
    // The premise: 24 token types × 2 fills over the 14 shipped, platform and
    // look themes (four base variants, three platforms and two looks in both
    // modes). A sweep that measured nothing would otherwise pass.
    expect(syntaxRoles.length * syntaxSurfaces.length * everyTheme.length).toBe(
      24 * 2 * 14,
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
    // The comment is measured on the same fills but to the secondary floor, so
    // it is the quiet run rather than the tightest code ink.
    const code = cells.filter(({ role }) => role !== "comment");
    const tightest = code.reduce((worst, cell) =>
      (cell.ratio ?? 1) < (worst.ratio ?? 1) ? cell : worst,
    );

    expect([
      tightest.role,
      tightest.surface,
      Number((tightest.ratio ?? 0).toFixed(2)),
      tightest.theme,
    ]).toEqual(["keyword", "background", 7.22, "Dark · Linux"]);
  });

  it("holds a comment to the quiet floor, and the high-contrast tables to AAA", () => {
    const floors = contrastFloorsFor(lightTheme);
    const high = contrastFloorsFor(highContrastLightTheme);

    expect(floors.secondary).toBe(4.5);
    expect(high.secondary).toBe(7);
    // The quiet role is the one difference between the tables, and it is the
    // reason a comment is quiet rather than unreadable: the default table sits
    // at the secondary floor, the high-contrast one at AAA.
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
    // A theme that carries one owns it.
    expect(syntaxColors(houseSyntaxTheme)).toBe(houseSyntaxTheme.syntax);
  });

  it("replaces a brand's palette whole, and leaves an untouched theme absent", () => {
    const brand = extendTheme(lightTheme, {
      syntax: { ...syntaxColors(lightTheme), keyword: "#7A1F5C" },
    });

    expect(brand.syntax?.keyword).toBe("#7A1F5C");
    expect(brand.syntax?.number).toBe(lightSyntax.number);
    expect(syntaxColors(brand).string).toBe(lightSyntax.string);

    // A theme that names no palette stays without one, so the shipped themes keep
    // resolving their table and `extendTheme(base, {})` is still the base.
    expect(extendTheme(lightTheme, {}).syntax).toBeUndefined();
    expect(lightTheme.syntax).toBeUndefined();

    // The table a brand spreads is the one it keeps: a dark base's numbers, not
    // the light ones the base theme happens to be.
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
    // The other reports cannot see it: a token colour is not a semantic role, so
    // nothing else in the gate measures it.
    expect(audit.contrast).toEqual([]);
    expect(audit.decorative).toEqual([]);
    expect(audit.syntax.map(({ role }) => role)).toEqual([
      "keyword",
      "keyword",
    ]);
  });

  it("reports a token it cannot measure rather than counting it as a pass", () => {
    // `oklch()` paints — the runtime's parser accepts it — but the measurement
    // dialect does not resolve a perceptual colour space, so the contrast of
    // this token is unknown rather than fine.
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
    // A theme restored from storage can predate a surface role. Every placement
    // is then unmeasurable rather than skipped — a token nobody can verify is
    // not a pass — and the report still names every one of them.
    const reported = syntaxFailures({ mode: "light", colors: {} });

    expect(reported).toHaveLength(syntaxRoles.length * syntaxSurfaces.length);
    expect(reported.every(({ ratio }) => ratio === undefined)).toBe(true);
  });

  it("follows a look's own palette under the palette rule", () => {
    const light = houseSyntaxLookTheme("light");
    const dark = houseSyntaxLookTheme("dark");
    const high = applyStyle(highContrastLightTheme, houseSyntaxLook);
    expect(syntaxColors(light).keyword).toBe("#4A2A7A");
    // The look names a light palette only, so the dark edition resolves the
    // base's table rather than highlighting a dark page with light-theme inks.
    expect(syntaxColors(dark).keyword).toBe(darkSyntax.keyword);
    // A high-contrast base keeps its own palette: accessibility outranks a look.
    expect(syntaxColors(high).keyword).toBe(highContrastLightSyntax.keyword);
    expect(syntaxColors(high).comment).toBe(highContrastLightSyntax.comment);
  });

  it("hands the palette to the painter the code block now resolves", () => {
    expect(nativeTextTheme(lightTheme).syntax).toBe(lightSyntax);
    expect(nativeTextTheme(darkTheme, "background").syntax).toBe(darkSyntax);

    // The painter, read from source: the seam fills `syntax`, and a code block
    // resolves the same table directly and maps each token class to a role, so
    // shipping the palette reaches the block with no component-side table. A seam
    // that stopped filling it would put the runtime's own dark palette back.
    const seam = read("./native-text.ts");
    expect(seam).toContain("syntax: syntaxColors(theme)");
    const codeBlock = read("../../components/src/code-block.tsx");
    expect(codeBlock).toContain("syntaxColors(theme)");
    expect(codeBlock).toContain("bg-background");
    const tokenize = read("../../components/src/code-block/tokenize.ts");
    expect(tokenize).toContain("tokenRole");
    // And the fill the block paints is the one the contract measures.
    expect(syntaxSurfaces).toContain("background");
  });

  it("prints the paint the window measured, not only the host object", () => {
    // A host object carrying `syntax` is a source read: the runtime owns the
    // tokenizer and the paint, so a light block could still highlight for a dark
    // canvas with every case above green. The playground's probe is the paint,
    // and the two pages that teach the palette must cite it with the readings it
    // printed rather than promise a measurement.
    const catalogue = read("../../../docs/tokens.md");
    const inventory = read("../../../COMPONENTS.md");
    const probe = read("../../../apps/playground/README.md");
    const measured = probe.slice(probe.indexOf("### `syntax-palette`"));
    expect(measured).not.toBe("");

    // The id the pages cite is a registered scenario, so a renamed or deleted
    // probe cannot read as evidence.
    expect(read("../../../apps/playground/src/live/registry.ts")).toContain(
      '"syntax-palette"',
    );

    /** The probe's row for one block: the keyword it painted and its solid pixels. */
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
    // The table's colours are the tables' own, and the control is the runtime's
    // palette — a fallback that matched a shipped ink would prove nothing.
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
      ["COMPONENTS.md", row],
    ] as const;
    const readings = [light, dark, control];

    pages.forEach(([page, text]) => {
      expect(text, page).toContain("syntax-palette");
      expect(text, page).toContain("29");
      readings.forEach(({ keyword, pixels }) => {
        expect(text, page).toContain(keyword);
        expect(text, page).toContain(String(pixels));
      });
      // The retracted promise: the detail page and the inventory row used to
      // send a reader to a probe that had not run.
      expect(text, page).not.toContain("not yet measured in a window");
      expect(text, page).not.toContain("recorded in `TODO.md`");
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
    // The `Native text hosts` row said the syntax palette "stays the runtime's,
    // because no token exists for them" — written before this package shipped
    // one. `nativeTextTheme` hands `host.syntax` and the host paints those
    // colours, so a reader of the row skipped the palette the seam exists for
    // and believed a light theme's block was still the runtime's dark default.
    // What genuinely stays the runtime's is the tokenizer and the numbers around
    // the code, and the row names those instead.
    const row =
      read("../../../COMPONENTS.md")
        .split("\n")
        .find((line) => line.startsWith("| Native text hosts |")) ?? "";

    expect(row).toContain("`syntaxColors(theme)`");
    expect(row).not.toContain("the syntax palette stay the runtime's");
    expect(row).not.toContain(
      "the syntax palette, gutters, diff paddings and table column minima stay",
    );
    // The hand-off it names is the one the seam makes.
    expect(nativeTextTheme(lightTheme).syntax).toEqual(
      syntaxColors(lightTheme),
    );
  });
});
