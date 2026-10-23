/**
 * Holds the data lane's printed case counts to the suites they name.
 *
 * The bug this guards: the Tier 3 `Tables` row still said "7 native behaviour
 * cases mount the example" while `src/behaviour/table.test.tsx` had grown to
 * **26**, and two path-qualified claims had drifted the same way —
 * `frozen-table.test.tsx` was printed as 6 with 5 shipped, and
 * `tree/logic.test.ts` as 13 with 15. A count is a promise a reader plans a
 * suite against, and a row that names a file should not be able to outlive it.
 *
 * Every number is read from the suite the row names, by the two-space `it(`
 * convention `@gpuixui/components`' inventory guard already applies. The sweep
 * covers every data-owned row in `COMPONENTS.md` (each names `@gpuixui/data`),
 * so a new path-qualified count joins the contract by being written down.
 *
 * `node:fs` is deliberate and test-only, the shape `readme.test.ts` and the
 * components package's own inventory guard use: this checks the repository's
 * files from a plain vitest suite, with no Effect runtime to provide a
 * `FileSystem` to.
 */

import {
  highContrastThemes,
  platformNames,
  platformTheme,
  retroNames,
  retroTheme,
  themes,
} from "@gpuixui/tokens";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** The package root, from a suite in `src/`. */
const packageRoot = new URL("../", import.meta.url);
/** The repository root, from a suite in `src/`. */
const repoRoot = new URL("../../../", import.meta.url);

const read = (root: URL, path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** One case in a suite: the repository convention is two spaces and `it(`. */
const TEST_CASE = /^ {2}it\(/;

/** The cases a suite declares, by that convention. */
const countCases = (path: string): number =>
  read(packageRoot, path)
    .split("\n")
    .filter((line) => TEST_CASE.test(line)).length;

const inventory = read(repoRoot, "COMPONENTS.md");

/** The inventory rows that own the data lane. */
const dataRows = inventory
  .split("\n")
  .filter((line) => line.startsWith("| ") && line.includes("@gpuixui/data"));

/** One row of the inventory by its first cell, wherever it sits. */
const rowNamed = (name: string): string => {
  const found = inventory
    .split("\n")
    .find((line) => line.startsWith(`| ${name} |`));
  if (found === undefined) throw new Error(`no ${name} row in the inventory`);
  return found;
};

/** One data row by its first cell, failing the case by name when it is gone. */
const row = (name: string): string => {
  const found = dataRows.find((line) => line.startsWith(`| ${name} |`));
  if (found === undefined)
    throw new Error(`no ${name} row under the data lane`);
  return found;
};

/** Every shipped, high-contrast, platform and authored style. */
const shippedStyles = [
  ...Object.values(themes),
  ...Object.values(highContrastThemes),
  ...platformNames.flatMap((platform) =>
    Object.values(themes).map((theme) => platformTheme(theme, platform)),
  ),
  ...retroNames.flatMap((look) =>
    Object.values(themes).map((theme) => retroTheme(theme, look)),
  ),
] as const;

/** A path-qualified count a row prints: `` `src/x.test.ts` (12 cases) ``. */
const pathClaims = (
  line: string,
): ReadonlyArray<{
  readonly path: string;
  readonly cases: number;
}> =>
  [...line.matchAll(/`(src\/[^`]+\.test\.tsx?)` \((\d+) cases\)/g)].map(
    ([, path, cases]) => ({ path: path ?? "", cases: Number(cases) }),
  );

describe("the data lane's printed case counts", () => {
  it("states the table suite the Tables row names", () => {
    const cases = countCases("src/behaviour/table.test.tsx");
    // A floor: a reader parsed from a renamed convention must not pass.
    expect(cases).toBeGreaterThan(20);
    expect(row("Tables")).toContain(
      `${cases} native behaviour cases mount the example`,
    );
  });

  it("holds every path-qualified count to the file it names", () => {
    const claims = dataRows.flatMap((line) =>
      pathClaims(line).map((claim) => ({ ...claim, line })),
    );
    // The rows route sort, selection, chart and tree claims through the same
    // form; a parse that stopped reading them must not pass.
    expect(claims.length).toBeGreaterThanOrEqual(6);
    const stale = claims.filter(
      ({ path, cases }) => countCases(path) !== cases,
    );
    expect(stale.map(({ path, cases }) => `${path}: ${cases} printed`)).toEqual(
      [],
    );
  });

  it("prints the virtual tree's suite count on its page", () => {
    const cases = countCases("src/behaviour/virtual-tree.test.tsx");
    expect(read(packageRoot, "docs/virtual-tree.mdx")).toContain(
      `${cases} tests`,
    );
  });

  it("prints the style set the washes are derived in", () => {
    // The `Row selection` row outlived Omarchy's two styles: the tokens suite
    // walks eighteen, while the row still told a reader sixteen. The count is
    // derived from the style table so a new style fails it before the row can
    // stay green on a set it no longer measures.
    expect(shippedStyles).toHaveLength(18);
    const selection = rowNamed("Row selection");
    expect(selection).toContain(`${shippedStyles.length} styles`);
    expect(selection).not.toContain("sixteen");
  });

  it("keeps the counts that were retracted out of the lane", () => {
    // The table suite's old count is checked only against the Tables row: `7`
    // is still correct for the expandable rows, so a whole-lane search would
    // forbid a true claim.
    expect(row("Tables")).not.toContain("7 native behaviour cases");
    expect(row("Tree views")).not.toContain(
      "`src/tree/logic.test.ts` (13 cases)",
    );
    expect(row("Tables")).not.toContain("frozen-table.test.tsx` (6 cases)");
  });
});
