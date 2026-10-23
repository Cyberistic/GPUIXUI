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
import { brandText } from "./brand-text.js";
import { contrastFloorsFor, contrastRatio } from "./contrast.js";
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
