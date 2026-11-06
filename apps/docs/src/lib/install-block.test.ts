import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { publishedNames } from "./doc-snippets.test-util";

const dir = new URL("../../content/docs/", import.meta.url);

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
    expect(blocks().length).toBeGreaterThanOrEqual(6);
    expect(
      new Set(blocks().map((block) => block.page)).size,
    ).toBeGreaterThanOrEqual(6);
  });

  it("name a package the workspace publishes", { timeout: 20_000 }, () => {
    const published = publishedNames();

    expect(
      blocks()
        .filter((block) => !published.has(block.packageName))
        .map(
          (block) =>
            `${block.page}: ${block.packageName} is not an entry point`,
        ),
    ).toEqual([]);
  });

  it(
    "import a symbol the package exports from its root",
    { timeout: 20_000 },
    () => {
      const published = publishedNames();

      expect(
        blocks().flatMap((block) => {
          const exported =
            published.get(block.packageName) ?? new Set<string>();
          return exported.has(block.importName)
            ? []
            : [
                `${block.page}: ${block.packageName} does not export ${block.importName}`,
              ];
        }),
      ).toEqual([]);
    },
  );
});
