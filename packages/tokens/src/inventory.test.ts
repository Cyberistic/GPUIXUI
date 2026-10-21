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
