/**
 * Guards the design-system inventory the way `packages/primitives/src/
 * inventory.test.ts` guards the Tier 1 rows: `COMPONENTS.md` is the status a
 * release is judged on, so a row that says `done` while naming no proof is a
 * claim no one can check.
 *
 * Three drifts fail here: a row that loses a column (the table has four, and
 * the docs site reads this file), a status outside the vocabulary, and a `done`
 * row whose notes do not name a test file that exists. The fix for the last is
 * to name the file that proves the claim — never to soften the row's wording.
 *
 * `node:fs` is deliberate, as in `docs.test.ts`: this checks the repository's
 * own Markdown, and the package keeps zero runtime dependencies.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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

/** The `*.test.ts(x)` files a row's notes name. */
const cited = (notes: string): ReadonlyArray<string> =>
  notes.match(/[\w@/.-]+\.test\.tsx?/g) ?? [];

/** Whether a cited path exists in this package, a sibling package, or the root. */
const resolves = (path: string): boolean =>
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
});
