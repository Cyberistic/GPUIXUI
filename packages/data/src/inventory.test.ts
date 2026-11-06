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

const packageRoot = new URL("../", import.meta.url);

const repoRoot = new URL("../../../", import.meta.url);

const read = (root: URL, path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const TEST_CASE = /^ {2}it\(/;

const countCases = (path: string): number =>
  read(packageRoot, path)
    .split("\n")
    .filter((line) => TEST_CASE.test(line)).length;

const inventory = read(repoRoot, ".agents/slop/COMPONENTS.md");

const dataRows = inventory
  .split("\n")
  .filter((line) => line.startsWith("| ") && line.includes("@gpuixui/data"));

const rowNamed = (name: string): string => {
  const found = inventory
    .split("\n")
    .find((line) => line.startsWith(`| ${name} |`));
  if (found === undefined) throw new Error(`no ${name} row in the inventory`);
  return found;
};

const row = (name: string): string => {
  const found = dataRows.find((line) => line.startsWith(`| ${name} |`));
  if (found === undefined)
    throw new Error(`no ${name} row under the data lane`);
  return found;
};

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

    expect(cases).toBeGreaterThan(20);
    expect(row("Tables")).toContain(
      `${cases} native behaviour cases mount the example`,
    );
  });

  it("holds every path-qualified count to the file it names", () => {
    const claims = dataRows.flatMap((line) =>
      pathClaims(line).map((claim) => ({ ...claim, line })),
    );

    expect(claims.length).toBeGreaterThanOrEqual(6);
    const stale = claims.filter(
      ({ path, cases }) => countCases(path) !== cases,
    );
    expect(stale.map(({ path, cases }) => `${path}: ${cases} printed`)).toEqual(
      [],
    );
  });

  it("prints the style set the washes are derived in", () => {
    expect(shippedStyles).toHaveLength(18);
    const selection = rowNamed("Row selection");
    expect(selection).toContain(`${shippedStyles.length} styles`);
    expect(selection).not.toContain("sixteen");
  });

  it("keeps the counts that were retracted out of the lane", () => {
    expect(row("Tables")).not.toMatch(/\b7 native behaviour cases/);
    expect(row("Tree views")).not.toMatch(
      /`src\/tree\/logic\.test\.ts` \(13 cases\)/,
    );
    expect(row("Tables")).not.toMatch(/\b6 cases/);
  });
});
