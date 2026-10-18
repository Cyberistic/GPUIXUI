import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Schema from "effect/Schema";
import { afterAll, describe, expect, it } from "vitest";
import { valueExports } from "./lib/api-values.generated";
import {
  deriveValueExports,
  ENTRIES,
  EXCLUDED_ENTRIES,
  indexProblems,
  renderGeneratedModule,
} from "./lib/api-values";

/**
 * Guards the generated value index (plan 490). The bug it exists for: a helper,
 * hook or `*Meta` record could be added to a package's public entry and reach no
 * documentation at all, because the component pages only generate props and
 * `/docs/extending` includes the `core/` source rather than indexing it.
 *
 * Three failures are worse than a stale table and are asserted directly: an
 * export with no doc comment (undocumented), a source change that was never
 * regenerated (stale), and a package that is neither indexed nor excluded
 * (unclassified). `node:fs` is deliberate at this vitest boundary, as in
 * `content-references.test.ts`.
 */
const root = fileURLToPath(new URL("../../../", import.meta.url));
const contentRoot = fileURLToPath(new URL("../content/docs/", import.meta.url));

const FIXTURE_INDEX = "packages/fixture/src/index.ts";
const FIXTURE_VALUES = "packages/fixture/src/values.ts";
const fixtureEntries = [{ package: "@gpuixui/fixture", entry: FIXTURE_INDEX }];

const FIXTURE_VALUES_SOURCE = [
  "/** A helper worth importing. */",
  "export const helper = () => 1;",
  "",
  "export const undocumented = 1;",
  "",
  "/** A record of the widget. */",
  'export const widgetMeta = { name: "Widget" };',
  "",
  "/** A hook. */",
  "export const useWidget = () => 1;",
  "",
  "/** Renders a widget. */",
  "export const Widget = () => null;",
  "",
].join("\n");

const FIXTURE_SOURCES: Readonly<Record<string, string>> = {
  "packages/fixture/package.json": '{\n  "name": "@gpuixui/fixture"\n}\n',
  [FIXTURE_INDEX]: [
    'export * from "./values.js";',
    'export { helper as renamed } from "./values.js";',
    "",
  ].join("\n"),
  [FIXTURE_VALUES]: FIXTURE_VALUES_SOURCE,
};

const roots: string[] = [];

const makeRoot = (files: Readonly<Record<string, string>>): string => {
  const created = mkdtempSync(join(tmpdir(), "api-values-"));
  roots.push(created);
  Object.entries(files).forEach(([path, body]) => {
    const target = join(created, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
  });
  return created;
};

afterAll(() => {
  roots.forEach((created) => rmSync(created, { recursive: true, force: true }));
});

const fixtureProblems = (
  files: Readonly<Record<string, string>>,
  overrides: Partial<Parameters<typeof indexProblems>[0]> = {},
) => {
  const fixtureRoot = makeRoot(files);
  const values = deriveValueExports({
    root: fixtureRoot,
    entries: fixtureEntries,
  });
  return indexProblems({
    root: fixtureRoot,
    values,
    generated: values,
    entries: fixtureEntries,
    excluded: [],
    internal: {},
    summaries: {},
    ...overrides,
  });
};

describe("the committed value index", () => {
  it("is current, fully documented and explicitly classified", () => {
    const values = deriveValueExports({ root });
    expect(indexProblems({ root, values, generated: valueExports })).toEqual(
      [],
    );
  });

  it("is exactly what the writer produces, so the file is not hand-edited", () => {
    const committed = readFileSync(
      join(root, "apps/docs/src/lib/api-values.generated.ts"),
      "utf8",
    );
    expect(committed).toBe(renderGeneratedModule(deriveValueExports({ root })));
  });

  it("indexes a real entry and records a reason for every exclusion", () => {
    expect(ENTRIES.length).toBeGreaterThan(0);
    ENTRIES.forEach((entry) => {
      expect(
        readFileSync(join(root, entry.entry), "utf8").length,
      ).toBeGreaterThan(0);
    });
    EXCLUDED_ENTRIES.forEach((entry) => {
      expect(entry.reason.length).toBeGreaterThan(20);
    });
  });
});

describe("the derivation", () => {
  it("reads a declaration's summary, kind and alias through its entry", () => {
    const fixtureRoot = makeRoot(FIXTURE_SOURCES);
    const values = deriveValueExports({
      root: fixtureRoot,
      entries: fixtureEntries,
    });
    const byName = new Map(values.map((value) => [value.name, value]));
    expect(byName.get("helper")).toMatchObject({
      kind: "function",
      summary: "A helper worth importing.",
      source: FIXTURE_VALUES,
    });
    expect(byName.get("renamed")).toMatchObject({
      kind: "function",
      summary: "A helper worth importing.",
    });
    expect(byName.get("widgetMeta")?.kind).toBe("record");
    expect(byName.get("useWidget")?.kind).toBe("hook");
  });

  it("does not index a component as a value", () => {
    const fixtureRoot = makeRoot(FIXTURE_SOURCES);
    const names = deriveValueExports({
      root: fixtureRoot,
      entries: fixtureEntries,
    }).map((value) => value.name);
    expect(names).not.toContain("Widget");
  });
});

describe("the guard", () => {
  it("fails on an export with no doc comment", () => {
    const problems = fixtureProblems(FIXTURE_SOURCES);
    expect(
      problems.some((problem) =>
        problem.startsWith("undocumented export undocumented"),
      ),
    ).toBe(true);
  });

  it("passes once the export is documented", () => {
    const documented = {
      ...FIXTURE_SOURCES,
      [FIXTURE_VALUES]: FIXTURE_VALUES_SOURCE.replace(
        "export const undocumented = 1;",
        "/** Now documented. */\nexport const undocumented = 1;",
      ),
    };
    expect(fixtureProblems(documented)).toEqual([]);
  });

  it("fails when the committed index is stale", () => {
    const fixtureRoot = makeRoot(FIXTURE_SOURCES);
    const values = deriveValueExports({
      root: fixtureRoot,
      entries: fixtureEntries,
    });
    const problems = indexProblems({
      root: fixtureRoot,
      values,
      generated: values.slice(0, -1),
      entries: fixtureEntries,
      excluded: [],
      internal: {},
      summaries: {},
    });
    expect(problems.some((problem) => problem.includes("is stale"))).toBe(true);
  });

  it("fails when a classification names nothing", () => {
    const problems = fixtureProblems(FIXTURE_SOURCES, {
      internal: { "@gpuixui/fixture#gone": "a stale reason" },
    });
    expect(
      problems.some((problem) =>
        problem.includes("INTERNAL_EXPORTS names @gpuixui/fixture#gone"),
      ),
    ).toBe(true);
  });

  it("fails when a package is neither indexed nor excluded", () => {
    const problems = fixtureProblems(FIXTURE_SOURCES, {
      entries: [],
      values: [],
      generated: [],
    });
    expect(
      problems.some((problem) =>
        problem.includes("package @gpuixui/fixture is neither indexed"),
      ),
    ).toBe(true);
  });
});

describe("the page", () => {
  const page = readFileSync(join(contentRoot, "api-values.mdx"), "utf8");
  const meta = Schema.decodeUnknownSync(
    Schema.fromJsonString(
      Schema.Struct({ pages: Schema.Array(Schema.String) }),
    ),
  )(readFileSync(join(contentRoot, "meta.json"), "utf8"));

  it("renders the generated index and names the regeneration command", () => {
    expect(page).toContain("<ValueIndex />");
    expect(page).toContain("nub run --filter docs api:values");
  });

  it("sends the reader to the pages it deliberately does not replace", () => {
    [
      "/docs/api-reference",
      "/docs/theming",
      "/docs/tokens-api",
      "/docs/extending",
    ].forEach((href) => {
      expect(page).toContain(`](${href})`);
    });
  });

  it("is ordered in the sidebar", () => {
    expect(meta.pages).toContain("api-values");
  });
});
