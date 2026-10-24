/**
 * Guards the design-system inventory the way `packages/primitives/src/
 * inventory.test.ts` guards the Tier 1 rows: `COMPONENTS.md` is the status a
 * release is judged on, so a row that says `done` while naming no proof is a
 * claim no one can check.
 *
 * Four drifts fail here: a row that loses a column (the table has four, and the
 * docs site reads this file), a status outside the vocabulary, a `done` row
 * whose notes do not name a test file that exists, and a row that prints a
 * denominator the sweeps no longer walk. The fix for the third is to name the
 * file that proves the claim — never to soften the row's wording; the fourth is
 * the count section at the bottom of this file.
 *
 * A citation may be a bare filename or a path, so the check walks each package
 * rather than assuming the file sits in its root or in `src/`: a proof at
 * `src/components/RadioGroup.test.tsx` cited as `RadioGroup.test.tsx` used to
 * read as missing, although the file was there.
 *
 * `node:fs` is deliberate, as in `docs.test.ts`: this checks the repository's
 * own Markdown, and the package keeps zero runtime dependencies.
 */
import { existsSync, readdirSync, readFileSync, type Dirent } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditTheme } from "./audit.js";
import { brandText } from "./brand-text.js";
import { contrastFloorsFor, contrastRatio } from "./contrast.js";
import { highlightSurfaces } from "./highlight.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import { statusTone, statusTones } from "./styles.js";
import { highContrastThemes, platformTheme, themes } from "./theme.js";

/** The tokens package's own test files, and the repository root. */
const packageSource = new URL("./", import.meta.url);
const repository = new URL("../../../", import.meta.url);

/** Where a cited test file may live: a workspace package's `src`, or the root. */
const packageDirs: ReadonlyArray<string> = [
  ...readdirSync(new URL("packages/", repository)).map(
    (name) => `packages/${name}`,
  ),
  ...readdirSync(new URL("apps/", repository)).map((name) => `apps/${name}`),
];

const components = readFileSync(
  new URL("../../../COMPONENTS.md", import.meta.url),
  "utf8",
);

/** The two pages that teach the gate's order beside the inventory. */
const pages: ReadonlyArray<{ readonly name: string; readonly text: string }> = [
  {
    name: "docs/tokens.md",
    text: readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ),
  },
  {
    name: "docs/design-system.md",
    text: readFileSync(
      new URL("../../../docs/design-system.md", import.meta.url),
      "utf8",
    ),
  },
];

/** The `## Design system` section, found by its heading rather than by a phrase. */
const section =
  components
    .split(/^## /m)
    .find((part) => part.startsWith("Design system\n")) ?? "";

interface Row {
  readonly capability: string;
  readonly status: string;
  readonly notes: string;
  /** The table's cells, including the empty ones either side of the row. */
  readonly cells: number;
}

const rows: ReadonlyArray<Row> = section
  .split("\n")
  .filter((line) => line.startsWith("|") && !line.includes("---"))
  .slice(1) // the header
  .map((line): Row => {
    const cells = line.split("|");
    return {
      capability: (cells[1] ?? "").trim(),
      status: (cells[2] ?? "").trim(),
      notes: (cells[4] ?? "").trim(),
      cells: cells.length,
    };
  });

/** The status vocabulary the file declares at the top. */
const vocabulary = /^(todo|wip|done\b.*|blocked\b.*|unsupported\b.*)$/;

/** Whether `value` is a workspace test file the inventory may cite. */
const isTestFile = (value: string): boolean =>
  value.endsWith(".test.ts") || value.endsWith(".test.tsx");

/**
 * Every test file in a workspace directory, as a package-relative path.
 *
 * `node_modules`, `dist` and dot directories are skipped so the walk never
 * descends into an installed package or a build. Symlinked directories are not
 * followed, which keeps the read-only `references` clone out of the index.
 */
const walkTests = (dir: URL, prefix: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry: Dirent) => {
    if (
      entry.name.startsWith(".") ||
      entry.name === "node_modules" ||
      entry.name === "dist"
    ) {
      return [];
    }
    const path = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      return walkTests(new URL(`${entry.name}/`, dir), path);
    }
    return isTestFile(entry.name) ? [path] : [];
  });

const workspaceTests: ReadonlyArray<string> = packageDirs.flatMap((dir) => {
  const root = new URL(`${dir}/`, repository);
  return existsSync(root) ? walkTests(root, dir) : [];
});

/** The `*.test.ts(x)` files a row's notes name. */
const cited = (notes: string): ReadonlyArray<string> =>
  notes.match(/[\w@/.-]+\.test\.tsx?/g) ?? [];

/**
 * Whether a cited file exists in the workspace.
 *
 * A citation may be a bare filename, so it matches a test at any depth of a
 * package — a proof lives beside its source (`src/components/RadioGroup.test.tsx`)
 * and a row names the file, not its path. A citation may also be a path from
 * the repository root, which the legacy candidates still resolve.
 */
const resolves = (path: string): boolean =>
  workspaceTests.some((file) => file === path || file.endsWith(`/${path}`)) ||
  [
    `./${path}`,
    path,
    ...packageDirs.flatMap((dir) => [`${dir}/${path}`, `${dir}/src/${path}`]),
  ].some(
    (candidate) =>
      existsSync(new URL(candidate, packageSource)) ||
      existsSync(new URL(candidate, repository)),
  );

describe("design-system inventory", () => {
  it("reads the table it guards", () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it("keeps four columns on every row", () => {
    const malformed = rows
      .filter((row) => row.cells !== 6)
      .map((row) => row.capability);

    expect(malformed).toEqual([]);
  });

  it("uses the declared status vocabulary", () => {
    const unknown = rows
      .filter((row) => !vocabulary.test(row.status))
      .map((row) => `${row.capability}: ${row.status}`);

    expect(unknown).toEqual([]);
  });

  it("names an existing test file for every done row", () => {
    const unproven = rows
      .filter((row) => row.status.startsWith("done"))
      .filter((row) => {
        const files = cited(row.notes);
        return files.length === 0 || !files.every(resolves);
      })
      .map((row) => row.capability);

    expect(unproven).toEqual([]);
  });

  it("cannot name a landed target size as remaining", () => {
    // The bug this guards: the Target sizes row kept saying `Rating`'s padded
    // star box was remaining after `ratingStarClass` adopted `min-target`, so a
    // reader was sent to work that had already shipped. One direction reads the
    // row, the other reads the recipe the row describes.
    const targetSizes = rows.find((row) => row.capability === "Target sizes");
    const recipe = readFileSync(
      new URL("../../primitives/src/recipe/index.ts", import.meta.url),
      "utf8",
    );
    const star = recipe.slice(
      recipe.indexOf("export const ratingStarClass"),
      recipe.indexOf("export const ratingGroupClass"),
    );

    const remaining = targetSizes?.notes.split("Remaining:").at(1) ?? "";
    // Read the recipe's class strings whole rather than one hard-coded line:
    // the star box may gain a utility (the `relative` wrapper the glyph's
    // clipping needs) without the guard mistaking a new class order for a lost
    // floor, while losing `min-target` still fails.
    const starClasses = (star.match(/"[^"]*"/g) ?? []).join(" ");

    expect(remaining).not.toContain("Rating");
    expect(starClasses).toContain("min-target");
  });
});

/**
 * Guards the denominator the table's rows print. Every sweep a row describes
 * measures one list — the four built-in themes, a light and a dark theme per
 * platform style and per authored look — so a row that says its suite holds that
 * set prints the list's length. The Omarchy look made it eighteen while the
 * cells kept sixteen: the pages were corrected and the table, whose cells read as
 * present-tense test descriptions, still sent a reader to a sweep of a set that
 * no longer exists. The number here is the list's length, and the brand's tint
 * figures are the sweep the pages print, so a new style or a new status tone
 * fails until every row counts it.
 */
describe("the style count the rows print", () => {
  const styles = [
    ...Object.values(themes),
    ...Object.values(highContrastThemes),
    ...platformNames.flatMap((name) => [
      platformTheme(themes.light, name),
      platformTheme(themes.dark, name),
    ]),
    ...retroNames.flatMap((look) => [
      retroTheme(themes.light, look),
      retroTheme(themes.dark, look),
    ]),
  ];
  const all = styles.length;

  /**
   * Each style's shared brand on the four message tints, at that style's floor.
   * `brand-text.test.ts` prints the failing share on the token pages; the Brand
   * text row prints the same pair, so the two are counted once here.
   */
  const tintPlacements = styles.flatMap((theme) => {
    const floor = contrastFloorsFor(theme).secondary;
    const shared = brandText(theme);
    return statusTones.map((tone) => ({
      floor,
      ratio: contrastRatio(shared, statusTone(theme, tone).background),
    }));
  });
  const buried = tintPlacements.filter(
    ({ floor, ratio }) => ratio === undefined || ratio < floor,
  ).length;

  /** The rows that claim the swept set, and the count each one prints. */
  const claims: ReadonlyArray<readonly [string, string]> = [
    ["Syntax palette", `in each of the ${all} styles`],
    [
      "Scale order",
      `holds all ${all} shipped, high-contrast, platform and authored themes`,
    ],
    ["Token numbers", `holds all ${all} shipped, platform and authored themes`],
    ["Contrast contract", `holds all ${all} themes`],
    ["Brand text", `the rest of the ${all} shipped styles`],
    [
      "Brand text",
      `**${buried} of the ${tintPlacements.length}** tint placements across the ${all} styles`,
    ],
    ["Brand text", `clears all ${tintPlacements.length} placements`],
    [
      "Brand text",
      `holds all ${all} shipped, high-contrast, platform and authored themes`,
    ],
    ["Brand text", `over the ${all} × ${statusTones.length} placements`],
    [
      "Find highlights",
      `the ${all * highlightSurfaces.length}-placement sweep`,
    ],
    [
      "Native text hosts",
      `holds all ${all} shipped, high-contrast, platform and authored themes`,
    ],
    [
      "Colour grammar",
      `from all ${all} shipped, high-contrast, platform and authored themes`,
    ],
  ];

  it("derives the set the sweeps walk", () => {
    // The list is built the way the page's guard builds it; this case ties it to
    // the named groups so a list that stopped iterating cannot agree with itself.
    expect(all).toBe(
      Object.values(themes).length +
        Object.values(highContrastThemes).length +
        platformNames.length * 2 +
        retroNames.length * 2,
    );
    expect(new Set(styles.map((style) => style.name)).size).toBe(all);
    expect(tintPlacements.length).toBe(all * statusTones.length);
  });

  it("prints that count in every row that claims the set", () => {
    // A removed or renamed row fails by name rather than passing on an empty
    // string, and a stale denominator fails with both numbers in the message.
    const missing = claims
      .filter(([capability, phrase]) => {
        const row = rows.find((entry) => entry.capability === capability);
        return row === undefined || !row.notes.includes(phrase);
      })
      .map(([capability, phrase]) => `${capability}: ${phrase}`);

    expect(missing).toEqual([]);
  });
});

describe("citation resolution", () => {
  it("resolves a filename that sits below a package's src", () => {
    const nested = workspaceTests.find((file) => file.split("/").length > 4);
    expect(nested).toBeDefined();
    expect(resolves(nested?.split("/").at(-1) ?? "")).toBe(true);
  });

  it("reports a file the workspace does not contain", () => {
    expect(resolves("vanished-protocol.test.ts")).toBe(false);
  });
});

/**
 * Guards the **position** each surface gives a report in the gate.
 *
 * The gate grew from two reports to fourteen, and the rows kept the places they
 * were written at: `selection` was still "its fifth", `indicators` "its seventh
 * contract", the disabled fade "the gate's ninth report" and the keyboard dim
 * "its tenth" — in the table and on both pages — while `auditTheme` returns
 * them tenth, eleventh, thirteenth and fourteenth. A reader following an
 * ordinal is sent to the wrong check, and the count word beside `audit.syntax`
 * said eleven for a gate that runs fourteen.
 *
 * The order is read from `auditTheme`'s own keys rather than remembered, so a
 * report inserted ahead of another moves every ordinal after it and the claim
 * fails instead of ageing. Extending the two word lists is deliberate: a
 * fifteenth report should force this file to be read.
 */
describe("the position each surface gives a report in the gate", () => {
  const reports = Object.keys(auditTheme(themes.light)).filter(
    (key) => key !== "passed",
  );
  const ordinals = [
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
    "eleventh",
    "twelfth",
    "thirteenth",
    "fourteenth",
  ] as const;
  const cardinals = [
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
    "thirteen",
    "fourteen",
  ] as const;

  const ordinal = (report: string): string =>
    ordinals[reports.indexOf(report)] ?? "unlisted";

  /** One row's sentence about where its report sits, as the row prints it. */
  const claims: ReadonlyArray<{
    readonly capability: string;
    readonly report: string;
    readonly phrase: (word: string) => string;
  }> = [
    {
      capability: "Token numbers",
      report: "invalidNumbers",
      phrase: (word) => `as its ${word} report`,
    },
    {
      capability: "Text selection wash",
      report: "selection",
      phrase: (word) => `includes the report as its ${word}`,
    },
    {
      capability: "Indicator marks",
      report: "indicators",
      phrase: (word) => `as its ${word} contract`,
    },
    {
      capability: "Contrast contract",
      report: "disabledFade",
      phrase: (word) => `the gate's ${word} report (\`audit.disabledFade\`)`,
    },
    {
      capability: "Keyboard focus dim",
      report: "keyboardDim",
      phrase: (word) => `the gate's ${word} report`,
    },
  ];

  it("reads an order that covers every report and every word", () => {
    expect(reports).toHaveLength(ordinals.length);
    expect(cardinals[reports.length]).toBeDefined();
    expect(claims.filter(({ report }) => !reports.includes(report))).toEqual(
      [],
    );
  });

  it("prints the position the gate returns each report at", () => {
    const stale = claims.flatMap(({ capability, report, phrase }) => {
      const row = rows.find((entry) => entry.capability === capability);
      const wanted = phrase(ordinal(report));
      return row !== undefined && row.notes.includes(wanted)
        ? []
        : [`${capability}: ${wanted}`];
    });

    expect(stale).toEqual([]);
  });

  it("counts the reports the gate returns, beside `audit.syntax`", () => {
    const row = rows.find((entry) => entry.capability === "Syntax palette");
    const count = cardinals[reports.length] ?? `${reports.length}`;

    expect(row?.notes).toContain(`\`audit.syntax\` (${count} reports)`);
  });

  it("agrees on the keyboard dim's place on the pages that teach it", () => {
    // A page wraps its prose, so the sentence is read across a line break.
    const wanted = `the gate's ${ordinal("keyboardDim")} report (\`audit.keyboardDim\`)`;
    const silent = pages
      .filter(({ text }) => !text.replace(/\s+/g, " ").includes(wanted))
      .map(({ name }) => `${name}: ${wanted}`);

    expect(silent).toEqual([]);
  });
});

/**
 * Guards the rule the `Syntax palette` row teaches about a brand's palette.
 *
 * The row said a brand "replaces the table whole" and that the host "would
 * otherwise paint its own colour for that token" — false once `syntaxColors`
 * completed a stored palette: `syntaxPalette` keeps every token the brand names
 * as a colour and answers the shipped table for each one it does not, so a host
 * is always handed a complete table. The report is the other half: the gate
 * still refuses a token the store lost, and the row must say both rather than
 * sending a reader to a host default that no longer happens.
 */
describe("the Syntax palette row", () => {
  const source = readFileSync(new URL("./syntax.ts", import.meta.url), "utf8");
  const notes = rows.find(
    (entry) => entry.capability === "Syntax palette",
  )?.notes;

  it("teaches the palette rule the paint follows", () => {
    const code = source.replace(/\s+/g, " ");

    expect(code).toContain("syntaxPalette(theme.syntax, table)");
    expect(code).toContain("namesColour(value)");
    expect(notes).toContain("token by token");
    expect(notes).not.toContain("replaces the table whole");
    expect(notes).not.toContain(
      "would otherwise paint its own colour for that token",
    );
  });
});

/**
 * Guards the **case count** each row prints for its suite.
 *
 * A row that says "(13 cases)" is telling a reader how much of the contract the
 * file holds, and three had aged: `syntax.test.ts` printed 13 while it ran 22,
 * `apply-style.test.ts` printed 8 while it ran 10, and `incomplete.test.ts`
 * printed 8 while it ran 80. The count is read from the file rather than
 * remembered, the rule `highlight.test.ts`'s own row already follows — so a case
 * added to one of these suites moves the row or fails this check by name.
 */
describe("the case count a row prints for its suite", () => {
  const claims = rows.flatMap((row) =>
    [...row.notes.matchAll(/`([\w./-]+\.test\.tsx?)` \((\d+) cases?\)/g)].map(
      (match) => ({
        row: row.capability,
        file: match[1] ?? "",
        printed: Number(match[2]),
      }),
    ),
  );

  it("finds the counts the table prints", () => {
    // A regex that stops matching would pass the case below on an empty list.
    expect(claims.length).toBeGreaterThan(5);
  });

  it("is the count the file runs", () => {
    const stale = claims.flatMap(({ row, file, printed }) => {
      const path = new URL(`./${file}`, import.meta.url);
      if (!existsSync(path)) {
        return [`${row}: ${file} is not a file in this package`];
      }
      const cases = readFileSync(path, "utf8").match(/\bit\(/g)?.length ?? 0;
      return cases === printed
        ? []
        : [`${row}: ${file} prints ${printed}, runs ${cases}`];
    });

    expect(stale).toEqual([]);
  });
});
