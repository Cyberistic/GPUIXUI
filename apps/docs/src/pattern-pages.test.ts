import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

/**
 * Guards the pattern pages (plan 427, Part D).
 *
 * A pattern is a real composition, not a component demo: it must say what task
 * it solves, which parts it composes, who owns the state, what was verified and
 * where its source is. The failure this catches is the empty promise — a page
 * that reads well, links nowhere, and shows no runnable source — plus a
 * verification claim naming a command that no example package defines.
 *
 * `node:fs` and `node:path` are deliberate here, as in `content.test.ts` and
 * `component-truth.test.ts`: this is a browser app whose tests read the content
 * tree directly, and the Effect runtime must not reach its bundle. Unknown
 * files are decoded with `Schema`, not cast.
 */
const patternsDirectory = fileURLToPath(
  new URL("../content/docs/patterns/", import.meta.url),
);
const examplesDirectory = fileURLToPath(
  new URL("../../../examples/", import.meta.url),
);
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const ExampleManifest = Schema.Struct({
  name: Schema.String,
  scripts: Schema.Record(Schema.String, Schema.String),
});
const Sidebar = Schema.Struct({ pages: Schema.Array(Schema.String) });

const readManifest = (path: string) =>
  Schema.decodeUnknownSync(Schema.fromJsonString(ExampleManifest))(
    readFileSync(path, "utf8"),
  );

const readSidebar = (path: string) =>
  Schema.decodeUnknownSync(Schema.fromJsonString(Sidebar))(
    readFileSync(path, "utf8"),
  );

const pages = readdirSync(patternsDirectory)
  .filter((file) => file.endsWith(".mdx") && file !== "index.mdx")
  .map((file) => ({
    slug: file.slice(0, -".mdx".length),
    body: readFileSync(join(patternsDirectory, file), "utf8"),
  }));

const sections = [
  "The task",
  "Composition",
  "State",
  "What is verified",
  "Source",
  "Related",
] as const;

const headings = (document: string): ReadonlyArray<string> =>
  document
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice("## ".length).trim());

/** Paired `<include>` tags whose body names a file relative to the page. */
const includes = (page: string): ReadonlyArray<string> =>
  [
    ...page.matchAll(
      /<include\b[^>]*>\s*\n?\s*([^\s<][^\n<]*)\s*\n?\s*<\/include>/g,
    ),
  ].map((match) => (match[1] ?? "").trim());

/** Every `nub run --filter <package> <script>` claim on a page. */
const commands = (page: string): ReadonlyArray<[string, string]> =>
  [...page.matchAll(/nub run --filter (@?[\w/-]+) ([\w:-]+)/g)].map((match) => [
    match[1] ?? "",
    match[2] ?? "",
  ]);

const exampleScripts = new Map(
  readdirSync(examplesDirectory).flatMap((name) => {
    const manifest = join(examplesDirectory, name, "package.json");
    if (!existsSync(manifest)) return [];
    const parsed = readManifest(manifest);
    return [[parsed.name, new Set(Object.keys(parsed.scripts))] as const];
  }),
);

const index = readFileSync(join(patternsDirectory, "index.mdx"), "utf8");

describe("pattern pages", () => {
  it("has at least one real pattern, so the guard cannot pass on an empty directory", () => {
    expect(pages.length).toBeGreaterThan(0);
    expect(exampleScripts.size).toBeGreaterThan(0);
  });

  it("carries every section the pattern contract requires", () => {
    const missing = pages.flatMap(({ slug, body }) => {
      const pageHeadings = headings(body);
      return sections
        .filter((section) => !pageHeadings.includes(section))
        .map((section) => `${slug}: missing "## ${section}"`);
    });
    expect(missing).toEqual([]);
  });

  it("includes real source files that exist", () => {
    const broken = pages.flatMap(({ slug, body }) =>
      includes(body)
        .filter((path) => !existsSync(join(patternsDirectory, path)))
        .map((path) => `${slug}: missing ${path}`),
    );
    const sourceless = pages
      .filter(({ body }) => includes(body).length === 0)
      .map(({ slug }) => `${slug}: no <include>`);
    expect([...broken, ...sourceless]).toEqual([]);
  });

  it("names verification commands that an example package really defines", () => {
    const invented = pages.flatMap(({ slug, body }) =>
      commands(body)
        .filter(
          ([packageName, script]) =>
            !exampleScripts.get(packageName)?.has(script),
        )
        .map(
          ([packageName, script]) =>
            `${slug}: ${packageName} has no ${script} script`,
        ),
    );
    expect(invented).toEqual([]);
  });

  it("is listed in the sidebar and linked from the patterns index", () => {
    const sidebar = readSidebar(join(patternsDirectory, "meta.json"));
    const missing = pages.flatMap(({ slug }) => [
      ...(sidebar.pages.includes(slug) ? [] : [`sidebar: ${slug}`]),
      ...(index.includes(`/docs/patterns/${slug}`) ? [] : [`index: ${slug}`]),
    ]);
    expect(missing).toEqual([]);
  });

  it("ships no placeholder prose", () => {
    const placeholder = /\b(coming soon|TBD|TODO|FIXME)\b/i;
    const found = pages
      .filter(({ body }) => placeholder.test(body))
      .map(({ slug }) => slug);
    expect(found).toEqual([]);
  });

  it("keeps every include inside the repository", () => {
    const outside = pages.flatMap(({ slug, body }) =>
      includes(body)
        .filter((path) => !join(patternsDirectory, path).startsWith(repoRoot))
        .map((path) => `${slug}: ${path} escapes the repository`),
    );
    expect(outside).toEqual([]);
  });
});
