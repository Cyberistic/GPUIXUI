import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { componentSources } from "../components/docs/sources";

const docsDir = new URL("../../content/docs/components/", import.meta.url);
const repo = new URL("../../../../", import.meta.url);
const sourceRegistry = new URL(
  "../../src/components/docs/sources.ts",
  import.meta.url,
);

const registry: Readonly<Record<string, string>> = componentSources;

const mentions = (): ReadonlyArray<{
  readonly page: string;
  readonly name: string;
  readonly file: string;
}> =>
  readdirSync(docsDir)
    .filter((page) => page.endsWith(".mdx"))
    .flatMap((page) =>
      [
        ...readFileSync(new URL(page, docsDir), "utf8").matchAll(
          /<ComponentSource\s+name="([^"]+)"\s+file="([^"]+)"/g,
        ),
      ].flatMap((match) => {
        const [name, file] = [match[1], match[2]];
        return name === undefined || file === undefined
          ? []
          : [{ page, name, file }];
      }),
    );

const registryPaths = (): ReadonlyMap<string, string> => {
  const body = readFileSync(sourceRegistry, "utf8");
  return new Map(
    [...body.matchAll(/^import (\w+) from "([^"]+)\?raw";$/gm)].flatMap(
      (match) => {
        const [key, specifier] = [match[1], match[2]];
        if (key === undefined || specifier === undefined) return [];

        const resolved = new URL(specifier, sourceRegistry);
        return [[key, resolved.pathname.slice(repo.pathname.length)] as const];
      },
    ),
  );
};

describe("the component source accordions", () => {
  it("read a registry that is not empty", () => {
    const paths = registryPaths();

    expect(paths.size).toBe(Object.keys(componentSources).length);
    expect(paths.size).toBeGreaterThanOrEqual(5);

    expect(
      Object.entries(componentSources)
        .filter(([, source]) => source.trim().length === 0)
        .map(([key]) => key),
    ).toEqual([]);
  });

  it("name a registered source on every page", () => {
    const missing = mentions()
      .filter(({ name }) => !(name in componentSources))
      .map(({ page, name }) => `${page}: no source named "${name}"`);

    expect(missing).toEqual([]);
  });

  it("label the file the registry actually imports", () => {
    const mismatched = mentions().flatMap(({ page, name, file }) => {
      const registered = registry[name];
      const printed = readFileSync(new URL(file, repo), "utf8");
      return registered === printed
        ? []
        : [
            `${page}: "${name}" prints ${file}, the registry holds ${
              registered === undefined ? "nothing" : "another file"
            }`,
          ];
    });

    expect(mismatched).toEqual([]);
  });

  it("ship a source no page mounts, so the registry cannot go stale", () => {
    const used = new Set(mentions().map(({ name }) => name));

    expect(
      Object.keys(componentSources).filter((key) => !used.has(key)),
    ).toEqual([]);
  });

  it("point at files that exist in the workspace", () => {
    const absent = mentions()
      .filter(({ file }) => !existsSync(new URL(file, repo)))
      .map(({ page, file }) => `${page}: ${file}`);

    expect(absent).toEqual([]);
  });
});
