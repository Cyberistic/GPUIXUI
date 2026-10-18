/**
 * The inventory check.
 *
 * This suite fails when a component is marked `done` without a native behaviour
 * test, when a docs page or example named by a record does not exist, when a
 * `COMPONENTS.md` row disagrees with the record's status or GPUix support, when a
 * finished Tier 2 row has no record, when two records claim the same name or
 * docs page, when one Tier 2 component has two rows (a stray `todo` copy beneath
 * the real one used to hide there), when a row's stated native test count
 * disagrees with the behaviour suite (plan 139), and when a docs page's
 * "Verification" line states a count the suite does not have (plan 333). It is
 * the automated form of plan 117 §1.
 *
 * The `documented API` block guards the plan 337 drift: a parts table naming a
 * part the package does not export, a landed component still listed as planned,
 * and a page that drops its limitations section. Plan 383 adds the page-level
 * half: every component page has an `## API` section naming every part in its
 * §8 row, so the props are documented where the reader looks.
 *
 * The date picker landed in plan 119, so every Tier 2 row now has a record.
 * `node:fs` is used here only because this is a test-time repository check —
 * plan 117 §3 authorises it, and nothing in the component runtime imports it.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import * as Result from "effect/Result";
import { describe, expect, it } from "vitest";
import { examples } from "../examples/index.js";
import { inventory, type ComponentMeta } from "./inventory.js";

const packageRoot = new URL("../", import.meta.url);
const repoRoot = new URL("../../../", import.meta.url);

const fileExists = (relative: string): boolean =>
  existsSync(fileURLToPath(new URL(relative, packageRoot)));

interface Row {
  readonly name: string;
  readonly status: string;
  readonly support: string;
  readonly notes: string;
}

/** One case in a behaviour suite: the suite convention is two spaces and `it(`. */
const TEST_CASE = /^ {2}it\(/;

/** The cases a behaviour suite declares, by that convention. */
const countBehaviourTests = (relative: string): number =>
  Arr.length(
    Arr.filter(
      readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8").split(
        "\n",
      ),
      (line) => TEST_CASE.test(line),
    ),
  );

/** The rows of one tier's `COMPONENTS.md` table, parsed from its markdown. */
const tierRows = (tier: number): ReadonlyArray<Row> => {
  const markdown = readFileSync(
    fileURLToPath(new URL("COMPONENTS.md", repoRoot)),
    "utf8",
  );
  const marker = `## Tier ${tier}`;
  const start = markdown.indexOf(marker);
  if (start < 0) return [];
  const next = markdown.indexOf("\n## ", start + marker.length);
  const end = next < 0 ? markdown.length : next;

  return Arr.flatMap(markdown.slice(start, end).split("\n"), (line) => {
    if (!line.startsWith("|")) return [];
    const cells = Arr.map(line.split("|").slice(1, -1), (cell) => cell.trim());
    if (cells.length < 3) return [];
    const name = cells[0] ?? "";
    if (name === "Component" || name.startsWith("---") || name === "")
      return [];
    return [
      {
        name,
        status: cells[1] ?? "",
        support: cells[2] ?? "",
        notes: cells[3] ?? "",
      },
    ];
  });
};

const duplicates = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.filter(values, (value, index) => values.indexOf(value) !== index);

/** The basenames of the example modules on disk, without the suffix. */
const exampleModules = (): ReadonlyArray<string> =>
  Arr.sort(
    Arr.map(
      Arr.filter(
        readdirSync(fileURLToPath(new URL("examples/", packageRoot))),
        (file) => file.endsWith(".example.tsx"),
      ),
      (file) => file.slice(0, -".example.tsx".length),
    ),
    Order.String,
  );

describe("inventory", () => {
  it("names files that exist", () => {
    const problems = Arr.flatMap(inventory, (meta) =>
      Arr.filter(
        [meta.docs, meta.example, meta.testFile],
        (path) => !fileExists(path),
      ).map((path) => `${meta.name}: missing ${path}`),
    );

    expect(problems).toEqual([]);
  });

  it("registers every example, with a page and a record for each entry", () => {
    const registered = R.keys(examples);
    const modules = exampleModules();
    const problems = [
      ...Arr.map(
        Arr.filter(modules, (id) => !R.has(examples, id)),
        (id) => `${id}: example module is not registered`,
      ),
      ...Arr.map(
        Arr.filter(registered, (id) => !Arr.contains(modules, id)),
        (id) => `${id}: registry entry has no example module`,
      ),
      ...Arr.map(
        Arr.filter(registered, (id) => !fileExists(`docs/${id}.mdx`)),
        (id) => `${id}: registry entry has no docs page`,
      ),
      ...Arr.map(
        Arr.filter(
          registered,
          (id) =>
            !Arr.some(
              inventory,
              (meta) => meta.example === `examples/${id}.example.tsx`,
            ),
        ),
        (id) => `${id}: no inventory record names this example`,
      ),
    ];

    expect(problems).toEqual([]);
  });

  it("has a behaviour test for every component marked done", () => {
    const problems = Arr.filter(
      Arr.filter(inventory, (meta) => meta.status === "done"),
      (meta) =>
        !meta.testFile.startsWith("src/behaviour/") ||
        !meta.testFile.endsWith(".test.tsx"),
    ).map((meta) => `${meta.name}: done without a behaviour test`);

    expect(problems).toEqual([]);
  });

  it("agrees with its COMPONENTS.md row", () => {
    const problems = Arr.flatMap(inventory, (meta) => {
      const rows = tierRows(meta.tier);
      const row = Arr.findFirst(
        rows,
        (candidate) => candidate.name === meta.name,
      );
      return Option.match(row, {
        onNone: () => [`${meta.name}: no COMPONENTS.md row`],
        onSome: (found) => {
          if (found.status !== meta.status) {
            return [
              `${meta.name}: row says ${found.status}, record says ${meta.status}`,
            ];
          }
          if (found.support !== meta.gpuixSupport) {
            return [
              `${meta.name}: row says support ${found.support}, record says ${meta.gpuixSupport}`,
            ];
          }
          return [];
        },
      });
    });

    expect(problems).toEqual([]);
  });

  it("has a record for every Tier 2 row that is no longer todo", () => {
    const problems = Arr.filter(
      Arr.filter(tierRows(2), (row) => row.status !== "todo"),
      (row) => !Arr.some(inventory, (meta) => meta.name === row.name),
    ).map(
      (row) => `${row.name}: row is ${row.status} with no inventory record`,
    );

    expect(problems).toEqual([]);
  });

  it("has no duplicate names, docs pages or examples", () => {
    expect([
      ...duplicates(inventory.map((meta) => meta.name)),
      ...duplicates(inventory.map((meta) => meta.docs)),
      ...duplicates(inventory.map((meta) => meta.example)),
    ]).toEqual([]);
  });

  it("has no duplicate row names in any tier", () => {
    const names = Arr.flatMap([1, 2, 3, 4, 5], (tier) =>
      Arr.map(tierRows(tier), (row) => row.name),
    );

    expect(duplicates(names)).toEqual([]);
  });

  it("states the real native test count in every done row", () => {
    const problems = Arr.flatMap(
      Arr.filter(inventory, (meta: ComponentMeta) => meta.status === "done"),
      (meta: ComponentMeta) => {
        const row = Arr.findFirst(
          tierRows(meta.tier),
          (candidate) => candidate.name === meta.name,
        );
        return Option.match(row, {
          onNone: () => [`${meta.name}: no COMPONENTS.md row`],
          onSome: (found) => {
            const claimed = Option.flatMap(
              Option.fromNullishOr(
                /(\d+) native behaviour tests/.exec(found.notes),
              ),
              (match) => Option.fromNullishOr(match[1]),
            );
            const actual = countBehaviourTests(meta.testFile);
            return Option.match(claimed, {
              onNone: () => [
                `${meta.name}: row does not state a native test count`,
              ],
              onSome: (count) =>
                count === String(actual)
                  ? []
                  : [`${meta.name}: row says ${count}, suite has ${actual}`],
            });
          },
        });
      },
    );

    expect(problems).toEqual([]);
  });

  it("states the real native test count in every docs verification line", () => {
    // Every page must carry exactly one canonical line, so a page cannot opt
    // out of the check by wording its verification differently (plan 335).
    // The closing backtick is consumed by `\S*`: a backtick inside a regex
    // literal would open a template quote for `scripts/check-tests.ts`'s
    // scanner, which then loses this test's asserts.
    const stated =
      /src\/behaviour\/([\w-]+)\.test\.tsx\S* runs in the real GPUix renderer \((\d+) tests?\)/g;
    const problems = Arr.flatMap(inventory, (meta: ComponentMeta) => {
      const page = readFileSync(
        fileURLToPath(new URL(meta.docs, packageRoot)),
        "utf8",
      );
      const matches = Arr.fromIterable(page.matchAll(stated));
      if (Arr.length(matches) !== 1) {
        return [
          `${meta.name}: expected one verification line, found ${Arr.length(matches)}`,
        ];
      }
      const match = matches[0];
      const stem = match?.[1];
      const claimed = match?.[2];
      if (stem === undefined || claimed === undefined) return [];
      const file = `${stem}.test.tsx`;
      if (`src/behaviour/${file}` !== meta.testFile) {
        return [
          `${meta.name}: verification names ${file}, record says ${meta.testFile}`,
        ];
      }
      const actual = countBehaviourTests(meta.testFile);
      return String(actual) === claimed
        ? []
        : [`${meta.name}: ${file} says ${claimed}, suite has ${actual}`];
    });

    expect(problems).toEqual([]);
  });

  it("records limitations as an explicit array", () => {
    const problems = Arr.filter(
      inventory,
      (meta) => !Array.isArray(meta.limitations),
    ).map((meta) => `${meta.name}: limitations is not an array`);

    expect(problems).toEqual([]);
  });
});

describe("component API contract", () => {
  const contract = (): string =>
    readFileSync(
      fileURLToPath(new URL("docs/component-api.md", repoRoot)),
      "utf8",
    );

  it("documents the six rules and the controlled/uncontrolled names", () => {
    const markdown = contract();
    Arr.forEach(
      [
        "## 1. Compound parts",
        "## 2. Controlled and uncontrolled",
        "## 3. State-aware styling",
        "## 4. Keyboard",
        "## 5. Accessibility",
        "## 6. Translation table",
      ],
      (heading) => expect(markdown).toContain(heading),
    );
    expect(markdown).toContain(
      "| `.value(v)` / `.default_value(v)` | `value` / `defaultValue` |",
    );
    expect(markdown).toContain("| `.on_value_change(f)` | `onValueChange` |");
  });

  it("lists every implemented component in the parts tables", () => {
    const markdown = contract();
    const missing = Arr.filter(
      inventory,
      (meta) => !markdown.includes(`| ${meta.name} |`),
    ).map((meta) => meta.name);

    expect(missing).toEqual([]);
  });
});

describe("documented API", () => {
  const contract = (): string =>
    readFileSync(
      fileURLToPath(new URL("docs/component-api.md", repoRoot)),
      "utf8",
    );

  /** `markdown` from `mark` to the next `## ` heading; `""` when absent. */
  const section = (markdown: string, mark: string): string => {
    const start = markdown.indexOf(mark);
    if (start < 0) return "";
    const end = markdown.indexOf("\n## ", start + mark.length);
    return end < 0 ? markdown.slice(start) : markdown.slice(start, end);
  };

  /** The body rows of every table in `markdown`, as trimmed cells. */
  const tableRows = (markdown: string): ReadonlyArray<ReadonlyArray<string>> =>
    Arr.filterMap(markdown.split("\n"), (line) => {
      if (!line.startsWith("|")) return Result.failVoid;
      const cells = Arr.map(line.split("|").slice(1, -1), (cell) =>
        cell.trim(),
      );
      const first = cells[0] ?? "";
      return cells.length < 2 ||
        first === "" ||
        first === "Component" ||
        first.startsWith("---")
        ? Result.failVoid
        : Result.succeed(cells);
    });

  /** The part identifiers in a `Parts` cell; a wildcard is not an export. */
  const partsOf = (cell: string): ReadonlyArray<string> =>
    Arr.filterMap(Arr.fromIterable(cell.matchAll(/`([^`]+)`/g)), (match) => {
      const name = match[1] ?? "";
      return /^[A-Za-z][A-Za-z0-9]*$/.test(name)
        ? Result.succeed(name)
        : Result.failVoid;
    });

  it("exports every part the parts tables name", async () => {
    // The root namespace is the arbiter because `exports.test.ts` holds every
    // public module to `src/index.ts`, so anything a module exports is here.
    const publicApi: Record<string, unknown> = await import("./index.js");
    const rows = tableRows(section(contract(), "## 8. Parts by component"));

    const problems = Arr.flatMap(rows, (cells) => {
      const [name, parts = ""] = cells;
      if (name === undefined) return [];
      const meta = Arr.findFirst(inventory, (entry) => entry.name === name);
      return Option.match(meta, {
        onNone: () => [],
        onSome: (found) =>
          Arr.map(
            Arr.filter(partsOf(parts), (part) => !(part in publicApi)),
            (part) => `${found.name}: documents ${part}, which is not exported`,
          ),
      });
    });

    expect(problems).toEqual([]);
  });

  it("does not plan a component that has landed", () => {
    // The block is bold text, not a heading; it ends at the next `## ` section.
    const planned = Arr.map(
      tableRows(section(contract(), "Planned Tier 2 additions")),
      (cells) => cells[0] ?? "",
    );
    const landed = Arr.filter(
      Arr.filter(inventory, (meta) => meta.status === "done"),
      (meta) => Arr.some(planned, (name) => name === meta.name),
    ).map((meta) => `${meta.name}: listed as planned and in the inventory`);

    expect(landed).toEqual([]);
  });

  it("gives every implemented component a limitations heading", () => {
    const LIMITATIONS = /^##+ .*[Ll]imitation/m;
    const missing = Arr.filterMap(inventory, (meta) => {
      const page = readFileSync(
        fileURLToPath(new URL(meta.docs, packageRoot)),
        "utf8",
      );
      return LIMITATIONS.test(page)
        ? Result.failVoid
        : Result.succeed(
            `${meta.name}: ${meta.docs} has no limitations section`,
          );
    });

    expect(missing).toEqual([]);
  });

  it("documents every part in its page's API section", () => {
    // The §8 parts table is the author's list of what a component owns, so a
    // page that omits one leaves the reader to find it in the source (plan 383).
    const rows = tableRows(section(contract(), "## 8. Parts by component"));
    const problems = Arr.flatMap(inventory, (meta: ComponentMeta) => {
      const page = readFileSync(
        fileURLToPath(new URL(meta.docs, packageRoot)),
        "utf8",
      );
      const api = section(page, "## API");
      if (api === "") return [`${meta.name}: ${meta.docs} has no API section`];
      const row = Arr.findFirst(rows, (cells) => cells[0] === meta.name);
      const parts = Option.match(row, {
        onNone: () => [],
        onSome: (cells) => partsOf(cells[1] ?? ""),
      });
      return Arr.map(
        Arr.filter(parts, (part) => !api.includes(`\`${part}\``)),
        (part) => `${meta.name}: ${meta.docs} does not document ${part}`,
      );
    });

    expect(problems).toEqual([]);
  });
});
