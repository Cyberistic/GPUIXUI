import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { publishedNames } from "./doc-snippets.test-util";

/**
 * The install block, held to the workspace it tells a reader to install from.
 *
 * `<Install packageName="…" importName="…" />` writes a `nub add` command and an
 * `import { … } from "…"` line as strings, and MDX does not check either prop:
 * a renamed package or a misspelled export would render a command that cannot
 * resolve and an import that cannot compile, on the one section a reader follows
 * first. The page-snippet walk only reads fenced code, so the props were the one
 * copyable thing on a page nothing resolved.
 *
 * `node:fs` is the test's own read of checked-in files, not runtime I/O.
 */

const dir = new URL("../../content/docs/", import.meta.url);

/** Every install block the site writes, with the page it is on. */
const blocks = (): ReadonlyArray<{
  readonly page: string;
  readonly packageName: string;
  readonly importName: string;
}> =>
  readdirSync(dir, { encoding: "utf8", recursive: true })
    .filter((name) => name.endsWith(".mdx"))
    .flatMap((page) =>
      [
        ...readFileSync(new URL(page, dir), "utf8").matchAll(
          /<Install\s+packageName="([^"]+)"\s+importName="([^"]+)"/g,
        ),
      ].flatMap((match) => {
        const [packageName, importName] = [match[1], match[2]];
        return packageName === undefined || importName === undefined
          ? []
          : [{ page, packageName, importName }];
      }),
    );

describe("the install blocks", () => {
  it("find a block on every page that walks a reader through installing", () => {
    // A silent zero would pass every case below without reading a page.
    expect(blocks().length).toBeGreaterThanOrEqual(6);
    expect(new Set(blocks().map((block) => block.page)).size).toBeGreaterThanOrEqual(6);
  });

  it("name a package the workspace publishes", { timeout: 20_000 }, () => {
    const published = publishedNames();

    expect(
      blocks()
        .filter((block) => !published.has(block.packageName))
        .map((block) => `${block.page}: ${block.packageName} is not an entry point`),
    ).toEqual([]);
  });

  it("import a symbol the package exports from its root", { timeout: 20_000 }, () => {
    const published = publishedNames();

    expect(
      blocks().flatMap((block) => {
        const exported = published.get(block.packageName) ?? new Set<string>();
        return exported.has(block.importName)
          ? []
          : [
              `${block.page}: ${block.packageName} does not export ${block.importName}`,
            ];
      }),
    ).toEqual([]);
  });
});
