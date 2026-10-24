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
    ]).toEqual(["string", "background", 7.66, "Light · Windows XP (Luna)"]);
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

  it("merges a brand's palette token by token, and leaves an untouched theme absent", () => {
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
    // and the three pages that teach the palette must cite it with the readings
    // it printed rather than promise a measurement.
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

/**
 * Guards the table a stated-but-unshipped variant resolves.
 *
 * `syntaxColors` compared `theme.contrast === "high"`, so a theme restored from
 * storage with the variant this release does not carry (the upper-cased `HIGH`)
 * fell to the **default** palette: a code block in a high-contrast window was
 * highlighted with tokens designed for the default floors, and the report that
 * would have measured it was handed the same table. The variant is read through
 * the floors' own rule now, so a stated variant this release does not ship takes
 * the table designed for the strict floors.
 */
describe("a stored contrast variant", () => {
  // The fixture is the shape a store hands back: the strict `Theme` type made
  // these calls cast, which `AGENTS.md` §2 forbids.
  const stored = (contrast: unknown): SyntaxSource => ({
    ...lightTheme,
    contrast,
  });

  it("resolves the table designed for the strict floors", () => {
    expect(syntaxColors(stored("HIGH"))).toBe(highContrastLightSyntax);
    // The variant it actually is keeps the default table, so the case measures
    // the variant rather than the mode.
    expect(syntaxColors(stored("default"))).toBe(lightSyntax);
    expect(syntaxColors(stored(undefined))).toBe(lightSyntax);
  });
});

/**
 * Guards the table a stated-but-unshipped mode resolves.
 *
 * `syntaxColors` compared `theme.mode === "dark"`, so a theme restored from
 * storage with the upper-cased `Dark` handed its code blocks the **light**
 * palette on the dark fill a `<code>` host paints — measured, the light
 * `keyword` reads under the body floor there — and `syntaxFailures` was handed
 * the same table. The mode is read through `themeModeOf` now, which reads a
 * value this release does not ship from the page the theme carries.
 */
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
    // A stored theme that lost the field is read from its page too.
    expect(syntaxColors(stored(undefined, lightTheme))).toBe(lightSyntax);
  });

  it("measures the palette the code block will paint", () => {
    expect(syntaxFailures(stored("Dark", darkTheme))).toEqual([]);
    // The premise: the table a stated mode this release does not ship once
    // resolved is not the one the dark page clears.
    expect(
      syntaxFailures({ ...darkTheme, mode: "light" }).some(
        (failure) => failure.role === "keyword",
      ),
    ).toBe(true);
  });
});

/**
 * Guards the palette a store wrote short.
 *
 * `syntax` was a whole group: `extendTheme` copied the table the store wrote and
 * `syntaxColors` handed it to the native host as-is. A row saved by a release
 * that shipped fewer token types — or one whose field was cleared, which JSON
 * writes as `null` — reached a `<code>` host with keys missing, and the runtime
 * painted its own dark-designed colour for each one: the foreign palette this
 * seam exists to remove. The report refused it, but the paint had no such guard,
 * and `Theme.syntax` promised a complete table the value did not carry.
 *
 * The rule now matches every colour role: painting completes the table from the
 * shipped one for the theme's mode and variant, while the report keeps reading
 * the palette as the store wrote it and names the token that was lost.
 */
describe("a palette a store wrote short", () => {
  // The shape a store hands back, typed without a cast. `keyword` is the token
  // it named, `comment` one JSON wrote as `null`, `number` a cleared field, and
  // `string` a dialect the measurement cannot resolve.
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

    // The token it named is its own, and every token it lost is the dark table's
    // rather than a key the runtime would paint from its own palette.
    expect(restored.syntax?.keyword).toBe("#A7A9FF");
    expect(restored.syntax?.comment).toBe(darkSyntax.comment);
    expect(restored.syntax?.number).toBe(darkSyntax.number);
    // A named value is not rewritten by the paint: the report measures it.
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
    // The row a consumer audits: the theme it saved, with the palette its store
    // wrote — no cast, because the report takes the storage shape.
    const row = { ...darkTheme, syntax: stored.syntax };
    const lost = syntaxRoles.filter((role) => role !== "keyword");
    const reported = syntaxFailures(row).map(({ role }) => role);

    // The one token it named is measured; every token it did not name is
    // reported unmeasurable on both fills, so the gate names the palette.
    expect(reported.toSorted()).toEqual([...lost, ...lost].toSorted());
    // The paint completes it; the gate still refuses it.
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
    // The shipped themes keep resolving their table by mode and variant.
    expect(syntaxColors(darkTheme)).toBe(darkSyntax);
  });

  it("reads an authored override token by token", () => {
    // The type a brand writes: the tokens it repaints, not the whole table.
    const brand = extendTheme(darkTheme, { syntax: { keyword: "#C7CBFF" } });

    expect(brand.syntax?.keyword).toBe("#C7CBFF");
    expect(brand.syntax?.number).toBe(darkSyntax.number);
    expect(brand.syntax?.comment).toBe(darkSyntax.comment);
    expect(Object.keys(brand.syntax ?? {})).toHaveLength(syntaxRoles.length);
  });
});
