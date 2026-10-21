import { readFileSync } from "node:fs";
import {
  auditTheme,
  colorRoles,
  colorVisionDeficiencies,
  contrastFloors,
  contrastRatio,
  createTheme,
  indicatorFailures,
  isThemeMode,
  retroStyles,
  themes,
  type Theme,
} from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { lookLabel, lookOrder, resolvePlatformTheme } from "./platform";

/**
 * The two theming pages state facts about `@gpuixui/tokens` that the package
 * changes.
 *
 * Both drifted once: `/docs/themes` printed "24 role pairs" after the contrast
 * table grew to 28, `/docs/theming`'s brand snippet painted the dark
 * theme's near-black label on a violet fill — 4.24:1, under the 4.5:1 floor the
 * package's own contract enforces — and the same page printed "47 semantic
 * roles" as a literal. A reader copying that snippet shipped the
 * defect the docs describe how to avoid.
 *
 * A page cannot drift again: the pair count is interpolated from
 * `contrastPairs` in the page itself, so it has no number to fall behind, the
 * colour-role count is interpolated from `colorRoles`, and the brand snippet is
 * measured here.
 */

const page = (name: string): string =>
  readFileSync(new URL(`../../content/docs/${name}`, import.meta.url), "utf8");

/** The page prints a word, not a digit, so the count reads as prose. */
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
  "eleven",
  "twelve",
];

/** The `## Contrast` section of a page, without its following siblings. */
const section = (body: string, heading: string): string => {
  const start = body.indexOf(`## ${heading}`);
  const end = body.indexOf("\n## ", start + 1);
  return start === -1 ? "" : body.slice(start, end === -1 ? undefined : end);
};

/** One brand snippet on the page, resolved from what the page writes. */
interface BrandSnippet {
  /** The mode the snippet's `createTheme` starts from. */
  readonly mode: Theme["mode"];
  /** The fill the snippet overrides. */
  readonly fill: string;
  /** The on-colour the snippet pairs with that fill. */
  readonly label: string;
  /** The theme the snippet produces. */
  readonly theme: Theme;
}

/**
 * Every brand snippet the page shows, resolved exactly as written — the
 * snippet is what a reader copies, so the guard executes the page rather than
 * a copy of its values.
 */
const brandSnippets = (body: string): ReadonlyArray<BrandSnippet> =>
  body
    .split("```")
    .filter((fence) => fence.includes("createTheme({"))
    .flatMap((fence) => {
      const mode = /mode: "(\w+)"/.exec(fence)?.[1];
      if (!isThemeMode(mode)) return [];
      const written = Object.fromEntries(
        [...fence.matchAll(/(\w+): "(#[0-9A-Fa-f]{6})"/g)].flatMap((match) =>
          match[1] === undefined || match[2] === undefined
            ? []
            : [[match[1], match[2]]],
        ),
      );
      const fill = written.primary;
      const label = written.primaryForeground;
      if (fill === undefined || label === undefined) return [];
      return [
        { mode, fill, label, theme: createTheme({ mode, colors: written }) },
      ];
    });

describe("the theme page", () => {
  it("derives the contrast pair count instead of printing one", () => {
    const audit = section(page("themes.mdx"), "The theme audit");

    expect(audit).toContain("contrastPairs.length");
    expect(audit).not.toMatch(/\b\d+ role pairs\b/);
  });

  it("imports the count it derives", () => {
    const tokensImport = page("themes.mdx")
      .split("\n")
      .find(
        (line) =>
          line.startsWith("import ") && line.includes("@gpuixui/tokens"),
      );

    expect(tokensImport).toContain("contrastPairs");
    // The pressable rule's floor is read from the token, never printed.
    expect(tokensImport).toContain("targetSize");
    expect(page("themes.mdx")).toContain("{targetSize.minimum}");
  });

  it("describes the whole audit the readout runs, not only its contrast half", () => {
    // The editor printed `contrastFailures` alone while `auditTheme` reported
    // three failures, so a reader whose divider vanished or whose role painted
    // black read a passing line. The page has to describe the readout it has.
    const audit = section(page("themes.mdx"), "The theme audit");

    // The printed word is derived from the gate's own keys, so a tenth report
    // cannot land while the page still promises nine.
    const reports = Object.keys(auditTheme(themes.light)).filter(
      (key) => key !== "passed",
    );
    expect(audit).toContain(
      `${numberWords[reports.length]} independent failures`,
    );
    expect(audit).toContain("auditTheme");
    expect(audit).toContain("invalidNumbers");
    expect(audit).toContain("invalidShadowColors");
    expect(audit).toContain("decorativeFailures");
    expect(audit).toContain("seriesFailures");
    expect(audit).toContain("seriesDeficiencyFloor");
    expect(audit).toContain("colorVisionDeficiencies");
    expect(
      colorVisionDeficiencies.filter(
        (deficiency) => !audit.includes(deficiency),
      ),
    ).toEqual([]);
    expect(audit).toContain("selectionFailures");
    expect(audit).toContain("indicatorFailures");
    expect(audit).toContain("disabledFadeFailures");
    expect(audit).toContain("cannot paint");
    expect(audit).toContain("localStorage");
  });
});

describe("the theming page's indicator marks", () => {
  it("describes the contract a mark is held to, not only its colours", () => {
    // A mark is neither text nor a boundary, so the page has to name the report
    // and the floor that measure it — otherwise a reader painting a bar in
    // `primary` has only the contrast table to reason about, and it is silent.
    const marks = section(page("theming.mdx"), "Indicator marks");

    expect(marks).toContain("indicatorRoles");
    expect(marks).toContain("indicatorSurfaces");
    expect(marks).toContain("indicatorFailures");
    expect(marks).toContain(`${contrastFloors.boundary}:1`);
    expect(marks).toContain("statusTone");
  });
});

describe("the theme page's copy-theme note", () => {
  it("names every report the audit folds, so a consumer can run one of them alone", () => {
    // The note is the list a consumer starts from. `auditTheme` returned six
    // reports while the note named four helpers, and the indicator report then
    // arrived without a name here; a reader looking for the role, shadow or
    // mark check had to find it in the package.
    const note = section(page("themes.mdx"), "Copy theme");

    expect(
      [
        "auditTheme",
        "invalidColorRoles",
        "invalidShadowColors",
        "invalidNumbers",
        "contrastFailures",
        "decorativeFailures",
        "seriesFailures",
        "selectionFailures",
        "indicatorFailures",
        "disabledFadeFailures",
      ].filter((name) => !note.includes(name)),
    ).toEqual([]);
  });
});

describe("the theming page's role count", () => {
  it("derives the number of colour roles instead of printing one", () => {
    const body = page("theming.mdx");

    expect(body).toMatch(
      /import \{[^}]*\bcolorRoles\b[^}]*\} from "@gpuixui\/tokens";/,
    );
    expect(body).toContain("{colorRoles.length} semantic roles");
    expect(body).toContain("There are {colorRoles.length} of them");
    // A printed count is the defect this guards: it cannot follow the package.
    expect(body).not.toMatch(/\b\d+ semantic roles\b/);
    expect(body).not.toMatch(/There are \d+ of them/);
  });
});

describe("the theming page's brand snippets", () => {
  const snippets = brandSnippets(page("theming.mdx"));
  const dark = snippets.find((snippet) => snippet.mode === "dark");
  const light = snippets.find((snippet) => snippet.mode === "light");

  it("owns the on-colour of the fill it overrides, per mode", () => {
    // A fill and its label are one pair, and the pair is mode-specific: a fill
    // light enough to be found as a mark in a dark theme cannot carry white
    // text, so the two modes need two values rather than one shared label.
    expect(snippets.length).toBeGreaterThanOrEqual(2);
    expect(dark).toBeDefined();
    expect(light).toBeDefined();
  });

  it("paints each label at the package's secondary-text floor", () => {
    const missed = snippets.flatMap(({ mode, fill, label }) => {
      const measured = contrastRatio(label, fill);
      return measured !== undefined && measured >= contrastFloors.secondary
        ? []
        : [`${mode}: ${label} on ${fill} is ${measured ?? "unmeasurable"}`];
    });

    expect(missed).toEqual([]);
  });

  it("paints a fill a reader can find as a mark, not only read under text", () => {
    // A primary is also the role a progress fill and a spinner dot paint, so
    // the label pair alone let the documented brand ship a fill that vanished
    // into the dark card: `#6A45F0` carried white text at 5.6:1 and measured
    // 2.66:1 as a mark on the card. The mark contract is what sees both jobs.
    const missed = snippets.flatMap(({ mode, theme }) =>
      indicatorFailures(theme).map(
        (failure) =>
          `${mode}: mark ${failure.role} on ${failure.surface} is ${
            failure.ratio ?? "unmeasurable"
          }:1 (needs ${failure.floor}:1)`,
      ),
    );

    expect(missed).toEqual([]);
  });

  it("passes the one gate the package runs on its own themes", () => {
    const failed = snippets.flatMap(({ mode, theme }) => {
      const audit = auditTheme(theme);
      const counts = [
        ...audit.invalidRoles.map((failure) => `role ${failure.role}`),
        ...audit.invalidShadows.map((failure) => `shadow ${failure.level}`),
        ...audit.contrast.map(
          (failure) => `contrast ${failure.foreground}/${failure.background}`,
        ),
        ...audit.decorative.map(
          (failure) => `decorative ${failure.role} on ${failure.over}`,
        ),
        ...audit.selection.map(
          (failure) => `selection ${failure.kind} ${failure.background}`,
        ),
        ...audit.indicators.map(
          (failure) => `mark ${failure.role}/${failure.surface}`,
        ),
      ];
      return audit.passed
        ? []
        : [
            `${mode}: ${counts.join(", ") || "series"} — ${[
              audit.series.surfaces.length,
              audit.series.distinctness.length,
              audit.series.deficiencies.length,
            ].join("/")} series findings`,
          ];
    });

    expect(failed).toEqual([]);
  });

  it("says why a brand owns two values rather than one", () => {
    const override = section(page("theming.mdx"), "Override a theme");

    expect(override).toContain("indicatorFailures");
    expect(override).toContain("spinner");
    expect(override).toContain("brand-theme.example.ts");
  });
});

describe("the theming page's data series", () => {
  const body = page("theming.mdx");
  const series = section(body, "Data series");

  it("mounts the generated swatches", () => {
    expect(series).toContain("<SeriesSwatches />");
    expect(body).toContain(
      'import { colorRoles, seriesColors, themes } from "@gpuixui/tokens";',
    );
  });

  it("derives the scale's length instead of printing it", () => {
    expect(series).toContain("{seriesColors(themes.dark).length}");
    // A printed count is the defect the role count already guards against.
    expect(series).not.toMatch(/scale of \d+ colours/);
  });

  it("states the three contracts the scale is held to, and the reason it exists", () => {
    // The section is why a component has no hex of its own: a role carries
    // status, the series carries identity, and the scale is measured — against
    // its plot surface, against itself, and against each colour-vision
    // deficiency, which is the contract a full-colour distance cannot replace.
    expect(series).toContain("seriesSurfaces");
    expect(series).toContain("seriesDistinctnessFloor");
    expect(series).toContain("seriesDeficiencyFloor");
    expect(series).toContain("colorVisionDeficiencies");
    expect(series).toContain("seriesFailures");
    expect(series).toContain("identity");
  });

  it("names every deficiency the package measures the scale against", () => {
    // A deficiency added to the package without a sentence here would be a
    // contract the page claims the reader is protected from and never mentions.
    expect(
      colorVisionDeficiencies.filter(
        (deficiency) => !section(body, "Data series").includes(deficiency),
      ),
    ).toEqual([]);
  });

  it("sits with the colour roles rather than in the platform section", () => {
    const colours = body.indexOf("## Colour roles");
    const builtIn = body.indexOf("## Built-in themes");
    const start = body.indexOf("## Data series");

    expect(start).toBeGreaterThan(colours);
    expect(start).toBeLessThan(builtIn);
  });
});

describe("the theming page's look picker", () => {
  const picker = section(page("theming.mdx"), "The look picker");

  /** The prose with its line wrapping flattened: a label is one sentence, not two lines. */
  const flat = (text: string): string => text.replace(/\s+/g, " ");

  it("offers every look the switch offers, by the library's label", () => {
    // The page names the control the reader sees; a look added to the library
    // without a sentence here would be a switch position the docs never
    // explain.
    expect(
      lookOrder.filter((look) => !flat(picker).includes(lookLabel(look))),
    ).toEqual([]);
  });

  it("writes the look to the URL and says it is not a platform", () => {
    expect(picker).toContain("look=luna");
    expect(flat(picker)).toContain("not a fifth platform");
    expect(picker).toContain("retroStyles");
    expect(picker).toContain("applyStyle");
  });

  it("describes the styles the library ships, not ones the site invented", () => {
    // The look's label comes from `retroStyles`; quoting a different name here
    // would document a style that does not exist.
    expect(resolvePlatformTheme("default", "dark", "luna").name).toContain(
      retroStyles.luna.label,
    );
    expect(flat(page("theming.mdx"))).toContain(retroStyles.aero.label);
  });
});

/** One row of `/docs/theming`'s colour-role table: role, light cell, dark cell. */
interface RoleRow {
  readonly role: string;
  readonly light: string;
  readonly dark: string;
}

/**
 * The role rows the page prints, read the way a reader reads them. Each cell is
 * the theme's own value interpolated at render time, so a palette edit reaches
 * the page instead of leaving the previous hex in the table.
 */
const colourRows = (body: string): ReadonlyArray<RoleRow> =>
  section(body, "Colour roles")
    .split("\n")
    .flatMap((line) => {
      const match =
        /^\|\s*`([A-Za-z]+)`\s*\|\s*\{themes\.light\.colors\.([A-Za-z]+)\}\s*\|\s*\{themes\.dark\.colors\.([A-Za-z]+)\}\s*\|/.exec(
          line,
        );
      const [, role, light, dark] = match ?? [];
      return role === undefined || light === undefined || dark === undefined
        ? []
        : [{ role, light, dark }];
    });

describe("the theming page's colour-role table", () => {
  it("prints the palette the package ships, from the package itself", () => {
    // A palette edit is exactly when a hand-written table rots, and the table
    // taught the previous `accent` and `borderStrong` shades after the palettes
    // moved. Each cell now interpolates the role it names, so the guard holds
    // the page to the shape rather than to a copy of the values: a cell that
    // prints a literal, or names a different role in its light and dark cells,
    // fails here.
    const rows = colourRows(page("theming.mdx"));
    const roles = new Set<string>(colorRoles);

    expect(rows.length).toBeGreaterThanOrEqual(12);

    const mismatched = rows.flatMap((row) => [
      ...(roles.has(row.role) ? [] : [`${row.role}: is not a colour role`]),
      ...(row.light === row.role
        ? []
        : [`${row.role}: the light cell reads ${row.light}`]),
      ...(row.dark === row.role
        ? []
        : [`${row.role}: the dark cell reads ${row.dark}`]),
    ]);

    expect(mismatched).toEqual([]);
    // No literal can return to the light or dark column: the values are the
    // theme's, so there is nothing here to fall behind.
    expect(section(page("theming.mdx"), "Colour roles")).not.toMatch(
      /#[0-9A-Fa-f]{6}/,
    );
  });
});
