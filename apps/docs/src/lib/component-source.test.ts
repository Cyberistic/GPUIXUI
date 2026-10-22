import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { componentSources } from "../components/docs/sources";

/**
 * The "Component source" accordion, held to the registry it reads.
 *
 * A page names a key into `componentSources`, and MDX does not typecheck that
 * prop: the Dropdown menu page passed `dropdown-menu-demo`, a demo key rather
 * than a source key, so the accordion under Installation rendered a code block
 * with no code — the one part of a page that shows the reader the shipping
 * implementation was empty, and the build stayed green.
 *
 * Three things have to agree: the key a page names is registered, the file the
 * page labels the accordion with is the file the registry imports, and the file
 * exists in the workspace. The registry is also read from the other side, so a
 * key no page uses is not shipped dead.
 *
 * `node:fs` is the test's own read of checked-in files, not runtime I/O.
 */

const docsDir = new URL("../../content/docs/components/", import.meta.url);
const repo = new URL("../../../../", import.meta.url);
const sourceRegistry = new URL(
  "../../src/components/docs/sources.ts",
  import.meta.url,
);

/** Every curated page that shows a component's source. */
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

/** The registry as `key → repository-relative path`, read from its imports. */
const registryPaths = (): ReadonlyMap<string, string> => {
  const body = readFileSync(sourceRegistry, "utf8");
  return new Map(
    [...body.matchAll(/^import (\w+) from "([^"]+)\?raw";$/gm)].flatMap(
      (match) => {
        const [key, specifier] = [match[1], match[2]];
        if (key === undefined || specifier === undefined) return [];
        // A registry import is relative to the registry file itself, so the
        // module URL resolves it; the `?raw` query is not part of the path.
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
    expect(paths.size).toBeGreaterThanOrEqual(4);
  });

  it("name a registered source on every page", () => {
    const missing = mentions()
      .filter(({ name }) => !(name in componentSources))
      .map(({ page, name }) => `${page}: no source named "${name}"`);

    expect(missing).toEqual([]);
  });

  it("label the file the registry actually imports", () => {
    const paths = registryPaths();
    const mismatched = mentions().flatMap(({ page, name, file }) => {
      const registered = paths.get(name);
      return registered === file
        ? []
        : [`${page}: "${name}" prints ${file}, the registry imports ${registered ?? "nothing"}`];
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
