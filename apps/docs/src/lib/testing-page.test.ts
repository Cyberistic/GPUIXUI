import { describe, expect, it } from "vitest";
import {
  namedImports,
  publishedNames,
  readRepo,
  typescriptSnippets,
  unresolvedImports,
} from "./doc-snippets.test-util";

/**
 * `/docs/testing` is the only page that documents `@gpuixui/testing`. The
 * package is not a dependency of the docs app, so nothing in the build would
 * notice if the page taught a namespace the package no longer projects, listed
 * a host verb the adapter does not have (or missed one it gained), printed a
 * command its manifest does not declare, or promised the harness returns the
 * exit code the playground owns.
 *
 * The page is held to the package's own source: the entry's namespaces, the two
 * host interfaces, the assertion set, the manifests' scripts, the runner's exit
 * codes and the sidebar it lives in.
 */

/** True when the value is a plain object, the shape a manifest or a meta file has. */
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * A repository JSON file, read as unknown.
 *
 * These are tracked manifests read by a Node-side guard, so the value is parsed
 * here and narrowed by the predicates below; no JSON reaches the site.
 */
const readJson = (path: string): unknown => JSON.parse(readRepo(path));

/** The scripts a manifest declares, or an empty map for a malformed manifest. */
const scriptsOf = (path: string): Readonly<Record<string, string>> => {
  const manifest = readJson(path);
  const scripts = isRecord(manifest) ? manifest["scripts"] : undefined;
  if (!isRecord(scripts)) return {};
  return Object.fromEntries(
    Object.entries(scripts).flatMap(([name, body]) =>
      typeof body === "string" ? [[name, body]] : [],
    ),
  );
};

/** The ordered page ids a Fumadocs `meta.json` lists, separators included. */
const sidebarPages = (path: string): ReadonlyArray<string> => {
  const meta = readJson(path);
  const pages = isRecord(meta) ? meta["pages"] : undefined;
  return Array.isArray(pages)
    ? pages.flatMap((page) => (typeof page === "string" ? [page] : []))
    : [];
};

const page = readRepo("apps/docs/content/docs/testing.mdx");
/** The page's prose with wrapping flattened, so a claim is not split by a line break. */
const pageText = page.replace(/\s+/g, " ");
const entry = readRepo("packages/testing/src/index.ts");
const smoke = readRepo("packages/testing/src/smoke.ts");
const report = readRepo("packages/testing/src/report.ts");
const pixels = readRepo("packages/testing/src/pixels.ts");
const runner = readRepo("apps/playground/src/smoke/run.ts");

/**
 * True when the page gives `name` a row of its own.
 *
 * A table row, not a passing mention: a verb named only inside a sentence is a
 * verb a reader cannot look up, and the sentence that mentions it can outlive
 * the row it replaced.
 */
const hasRow = (name: string): boolean => page.includes(`| \`${name}\` |`);

/** The page's table row for `name`, or an empty string when it has none. */
const rowOf = (name: string): string =>
  page.split("\n").find((line) => line.startsWith(`| \`${name}\` |`)) ?? "";

/** The names `pixels.ts` exports, which is what the `Pixels` namespace holds. */
const pixelExports = (): ReadonlyArray<string> =>
  [
    ...pixels.matchAll(/^export (?:class|const|function) ([A-Za-z0-9_]+)/gm),
  ].map((match) => match[1] ?? "");

/** The page's paint section, from its heading to the next one. */
const paintSection = (): string => {
  const start = pageText.indexOf("## Reading a frame");
  const end = pageText.indexOf("## Replaying a runtime");
  return start < 0 || end < start ? "" : pageText.slice(start, end);
};

/** The namespaces `export * as …` projects from the package root. */
const namespaces = (): ReadonlyArray<string> =>
  [...entry.matchAll(/^export \* as ([A-Za-z0-9_]+) from/gm)].map(
    (match) => match[1] ?? "",
  );

/** The members of one interface in `smoke.ts`. */
const interfaceVerbs = (name: string): ReadonlyArray<string> => {
  const start = smoke.indexOf(`export interface ${name}`);
  const body = smoke.slice(start, smoke.indexOf("\n}", start));
  return [...body.matchAll(/readonly\s+([A-Za-z0-9_]+)\s*:/g)].map(
    (match) => match[1] ?? "",
  );
};

/** The page's report table rows: the code and the exporter it names. */
const printedExitCodes = (): ReadonlyMap<string, string> =>
  new Map(
    [...page.matchAll(/^\| `(\d)` \| (.+?) \| /gm)].map((match) => [
      match[1] ?? "",
      match[2] ?? "",
    ]),
  );

/** The exit codes the playground's runner declares. */
const runnerExitCodes = (): ReadonlyMap<string, string> =>
  new Map(
    [...runner.matchAll(/\b(passed|failed|unverified): (\d+)/g)].map(
      (match) => [match[2] ?? "", match[1] ?? ""],
    ),
  );

/** The `nub run --filter <package> <script>` commands the page prints. */
const printedCommands = (): ReadonlyArray<{
  readonly packageName: string;
  readonly script: string;
}> =>
  [...page.matchAll(/nub run --filter (\S+) (\S+)/g)].map((match) => ({
    packageName: match[1] ?? "",
    script: (match[2] ?? "").replace(/[;)]?$/, ""),
  }));

/** The manifest a `--filter` name resolves to. */
const manifestOf = (packageName: string): string =>
  packageName === "playground"
    ? "apps/playground/package.json"
    : `packages/${packageName.replace(/^@gpuixui\//, "")}/package.json`;

describe("the testing page", () => {
  it("projects every namespace the package's entry does", () => {
    const projected = namespaces();
    // A floor, so a scan that stopped matching cannot pass.
    expect(projected.length).toBeGreaterThanOrEqual(6);
    expect(projected).toContain("Smoke");

    const undocumented = projected.filter((name) => !hasRow(name));
    expect(
      undocumented,
      "the page does not name these namespaces of @gpuixui/testing",
    ).toEqual([]);
  });

  it("documents every verb of the offscreen host", () => {
    // A verb is the only way a scenario reads a rendered fact: one the page
    // omits is a capability a contributor cannot discover.
    const verbs = interfaceVerbs("SmokeHost");
    expect(verbs.length).toBeGreaterThanOrEqual(21);
    expect(verbs).toContain("dragSelect");
    expect(verbs).toContain("paintedStyle");

    expect(verbs.filter((verb) => !hasRow(verb))).toEqual([]);
  });

  it("documents every verb of the window host", () => {
    const verbs = interfaceVerbs("AsyncSmokeHost");
    expect(verbs.length).toBeGreaterThanOrEqual(24);
    expect(verbs).toContain("keyUp");
    expect(verbs).toContain("pixels");

    expect(verbs.filter((verb) => !hasRow(verb))).toEqual([]);
  });

  it("prints every assertion a scenario writes", () => {
    const assertions = interfaceVerbs("Assertions");
    expect(assertions.length).toBeGreaterThanOrEqual(5);
    expect(assertions).toContain("expectSome");

    expect(assertions.filter((assertion) => !hasRow(assertion))).toEqual([]);
  });

  it("documents every export the Pixels namespace projects", () => {
    // The row is the namespace's index: a verb that landed without it is a
    // paint reader a probe author cannot find.
    const names = pixelExports();
    expect(names.length).toBeGreaterThanOrEqual(10);
    expect(names).toContain("countDifferingPixels");

    const row = rowOf("Pixels");
    expect(row, "the page has no Pixels row").not.toBe("");
    expect(names.filter((name) => !row.includes(`\`${name}\``))).toEqual([]);
  });

  it("teaches the comparison verbs by the answers the source returns", () => {
    // A probe compares two crops of one box, so the two rules it depends on are
    // read from the implementation: the clamp, and a different shape reading as
    // `null` rather than "nothing changed".
    expect(pixels).toContain("Math.max(region.x, 0)");
    expect(pixels).toContain(
      "if (left.width !== right.width || left.height !== right.height) return null;",
    );

    const section = paintSection();
    expect(section, "the page has no paint section").not.toBe("");
    expect(section).toContain("clamps it to the frame");
    expect(section).toContain("not the same shape");
    expect(section).toContain("`editor-overlay`");
  });

  it("resolves every import it prints against the package's own exports", () => {
    const imports = namedImports(typescriptSnippets(page));
    // Every snippet on the page imports the harness, or the scan missed them.
    expect(imports.length).toBeGreaterThanOrEqual(4);
    expect(unresolvedImports(imports, publishedNames())).toEqual([]);
  });

  it("teaches commands the manifests actually declare", () => {
    const commands = printedCommands();
    expect(commands.length).toBeGreaterThanOrEqual(3);

    const unresolved = commands.filter(
      ({ packageName, script }) =>
        scriptsOf(manifestOf(packageName))[script] === undefined,
    );
    expect(unresolved).toEqual([]);

    // The smoke command is the script that builds and runs the headless runner.
    expect(scriptsOf("apps/playground/package.json")["smoke"]).toContain(
      "dist/smoke/run.js",
    );
  });

  it("prints the exit codes the runner declares, with their owner", () => {
    // `@gpuixui/testing` answers 0 or 1; the unverified code belongs to the app.
    const declared = runnerExitCodes();
    expect([...declared.keys()].toSorted()).toEqual(["0", "1", "2"]);

    const printed = printedExitCodes();
    expect([...printed.keys()].toSorted()).toEqual([...declared.keys()]);
    expect(printed.get("0")).toContain("Report.exitCode");
    expect(printed.get("1")).toContain("Report.exitCode");
    expect(printed.get("2")).toContain("runner");

    // The report module really does answer only the first two.
    expect(report).toContain("): 0 | 1 =>");
  });

  it("says the harness is workspace-internal only while the package is", () => {
    const manifest = readJson("packages/testing/package.json");
    const isPrivate = isRecord(manifest) && manifest["private"] === true;
    expect(isPrivate).toBe(pageText.includes("workspace-internal"));
  });

  it("sits in the Contributing section of the sidebar", () => {
    const pages = sidebarPages("apps/docs/content/docs/meta.json");
    const section = pages.indexOf("---Contributing---");

    expect(section).toBeGreaterThanOrEqual(0);
    expect(pages.indexOf("testing")).toBeGreaterThan(section);
    expect(pages.indexOf("testing")).toBeLessThan(pages.indexOf("license"));
  });
});
