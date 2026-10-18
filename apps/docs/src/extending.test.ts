import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

/**
 * Guards `/docs/extending` (plan 488).
 *
 * The bug this catches is the silent omission: `@gpuixui/primitives` publishes a
 * `core/` entry point whose whole purpose is to be extended, so a new decision
 * module, a renamed script or a moved include would leave the page describing a
 * layer that no longer matches the package — and the site would keep building.
 *
 * `node:fs`/`node:path` are deliberate, as in `content.test.ts` and
 * `pattern-pages.test.ts`: this is a browser app whose tests read the repository
 * directly, and the Effect runtime must not reach its bundle. Unknown files are
 * decoded with `Schema`, never cast.
 */

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const contentRoot = join(appRoot, "content", "docs");
const pagePath = join(contentRoot, "extending.mdx");

const page = readFileSync(pagePath, "utf8");

const Manifest = Schema.Struct({
  name: Schema.String,
  scripts: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
});

const workspaceScripts = new Map(
  ["apps", "packages", "examples"].flatMap((group) =>
    readdirSync(join(repoRoot, group), { withFileTypes: true }).flatMap(
      (entry) => {
        const manifest = join(repoRoot, group, entry.name, "package.json");
        if (!entry.isDirectory() || !existsSync(manifest)) return [];
        const parsed = Schema.decodeUnknownSync(
          Schema.fromJsonString(Manifest),
        )(readFileSync(manifest, "utf8"));
        return [
          [parsed.name, new Set(Object.keys(parsed.scripts ?? {}))] as const,
        ];
      },
    ),
  ),
);

const sortNames = (names: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.sort(names, Order.String);

/** The body of one `## ` section, up to the next heading. */
const section = (document: string, heading: string): string => {
  const start = document.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = document.indexOf("\n## ", start + heading.length);
  return document.slice(start, next === -1 ? undefined : next);
};

const headings = (document: string): ReadonlyArray<string> =>
  document
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice("## ".length).trim());

const includes = (document: string): ReadonlyArray<string> =>
  [
    ...document.matchAll(
      /<include\b[^>]*>\s*\n?\s*([^\s<][^\n<]*)\s*\n?\s*<\/include>/g,
    ),
  ].map((match) => (match[1] ?? "").trim());

/** Every `nub run --filter <package> <script>` claim on the page. */
const commands = (document: string): ReadonlyArray<[string, string]> =>
  [...document.matchAll(/nub run --filter (@?[\w/-]+) ([\w:-]+)/g)].map(
    (match) => [match[1] ?? "", match[2] ?? ""],
  );

const coreDirectory = join(repoRoot, "packages", "primitives", "src", "core");

/** Every real decision module: `index.ts` is the surface and tests are not API. */
const coreModules = sortNames(
  readdirSync(coreDirectory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".test.ts") &&
        entry.name !== "index.ts",
    )
    .map((entry) => entry.name),
);

const documentedModules = sortNames(
  [
    ...section(page, "The core modules").matchAll(/^\| `([\w.-]+\.ts)` \|/gm),
  ].map((match) => match[1] ?? ""),
);

const expectedIncludes = [
  "../../../../packages/primitives/src/core/index.ts",
  "../../../../packages/primitives/src/components/Toggle.tsx",
  "../../../../packages/tokens/src/brand-theme.example.ts",
];

const linkedFrom = [
  "architecture.mdx",
  "api-reference.mdx",
  "component-api.mdx",
];

describe("Extending page", () => {
  it("names every core module, and only real ones", () => {
    expect(coreModules.length).toBeGreaterThan(0);
    expect(documentedModules).toEqual(coreModules);
  });

  it("includes the real public surface and examples", () => {
    const broken = includes(page).filter(
      (path) => !existsSync(join(dirname(pagePath), path)),
    );
    const missing = expectedIncludes.filter(
      (path) => !includes(page).includes(path),
    );
    expect([...broken, ...missing]).toEqual([]);
  });

  it("keeps the promised sections", () => {
    const required = [
      "The two layers",
      "The core modules",
      "The public surface",
      "A worked component",
      "Where a decision goes",
      "A theme, not a rewrite",
      "Verify it",
      "Related",
    ];
    const present = headings(page);
    expect(required.filter((heading) => !present.includes(heading))).toEqual(
      [],
    );
  });

  it("names verification commands every package defines", () => {
    const claims = commands(page);
    expect(claims.length).toBeGreaterThan(0);
    const invented = claims
      .filter(
        ([packageName, script]) =>
          !workspaceScripts.get(packageName)?.has(script),
      )
      .map(([packageName, script]) => `${packageName} has no ${script} script`);
    expect(invented).toEqual([]);
  });

  it("only claims a core entry point the package publishes", () => {
    const manifest = Schema.decodeUnknownSync(
      Schema.fromJsonString(
        Schema.Struct({
          exports: Schema.Record(
            Schema.String,
            Schema.Union([
              Schema.String,
              Schema.Record(Schema.String, Schema.String),
            ]),
          ),
        }),
      ),
    )(
      readFileSync(
        join(repoRoot, "packages", "primitives", "package.json"),
        "utf8",
      ),
    );
    expect(Object.keys(manifest.exports)).toContain("./core");
    expect(page).toContain("@gpuixui/primitives/core");
  });

  it("is linked from the three pages that describe the layers", () => {
    const unlinked = linkedFrom.filter(
      (file) =>
        !readFileSync(join(contentRoot, file), "utf8").includes(
          "/docs/extending",
        ),
    );
    expect(unlinked).toEqual([]);
  });

  it("ships no placeholder prose", () => {
    expect(/\b(coming soon|TBD|TODO|FIXME)\b/i.test(page)).toBe(false);
  });
});
