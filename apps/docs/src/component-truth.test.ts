import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { components } from "./component-meta/registry";

/**
 * Guards the Phase F truth pass over the component pages (plan 424).
 *
 * The failure mode is a page that still builds: a source file moved, a planned
 * package was renamed, or an author left "coming soon" in shipped prose. None of
 * those break MDX, the sidebar or the build, so nothing else notices.
 */
const pageDirectory = fileURLToPath(
  new URL("../content/docs/components/", import.meta.url),
);
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const pages = readdirSync(pageDirectory).filter(
  (file) => file.endsWith(".mdx") && file !== "index.mdx",
);

const readPage = (page: string): string =>
  readFileSync(join(pageDirectory, page), "utf8");

/** Repo-relative paths the prose names in backticks. */
const pathPattern = /`((?:packages|apps|examples|docs|LICENSES)\/[^`\s]+)`/g;

/**
 * A path that does not exist may still be an honest plan when the owning
 * directory's README registers it — that is the repository's rule for planned
 * files (`packages/README.md` lists `data-grid`).
 */
const registered = (path: string): boolean => {
  const [head, child] = path.split("/");
  const readme = join(repoRoot, head ?? "", "README.md");
  if (!existsSync(readme)) return false;
  const text = readFileSync(readme, "utf8");
  return text.includes(path) || (child !== undefined && text.includes(child));
};

const namedPaths = pages.flatMap((page) =>
  [...readPage(page).matchAll(pathPattern)].map((match) => ({
    page,
    path: match[1] ?? "",
  })),
);

const placeholder = /\b(coming soon|TBD|TODO|FIXME)\b/i;

const placeholderPages = pages.filter((page) =>
  placeholder.test(readPage(page)),
);

/** Every named export a package's source declares, across its `.ts(x)` files. */
const exportedNames = (directory: string, prefix = ""): ReadonlyArray<string> =>
  readdirSync(join(directory, prefix), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) return exportedNames(directory, path);
      if (!/\.tsx?$/.test(entry.name)) return [];
      const source = readFileSync(join(directory, path), "utf8");
      return [
        ...source.matchAll(
          /export\s+(?:interface|type|const|function|class)\s+([A-Za-z0-9_]+)/g,
        ),
      ].flatMap((match) => match[1] ?? []);
    },
  );

const packageExports: Readonly<Record<string, ReadonlyArray<string>>> = {
  primitives: exportedNames(join(repoRoot, "packages/primitives/src")),
  icons: exportedNames(join(repoRoot, "packages/icons/src")),
  components: exportedNames(join(repoRoot, "packages/components/src")),
};

/** The names a page imports from a GPUixUI package in its usage snippet. */
const pageImports = (
  page: string,
): ReadonlyArray<{
  readonly page: string;
  readonly package: string;
  readonly name: string;
}> => {
  const body = readPage(page);
  return [
    ...body.matchAll(/import\s+\{([^}]+)\}\s+from\s+"@gpuixui\/(\w+)"/g),
  ].flatMap((match) => {
    const packageName = match[2] ?? "";
    return (match[1] ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .map((name) => ({ page, package: packageName, name }));
  });
};

describe("component page truth", () => {
  it("covers every delivered component, so the guard cannot pass on an empty directory", () => {
    const delivered = components.filter(
      (component) => component.status !== "planned",
    ).length;
    expect(pages.length).toBe(delivered);
  });

  it("names only paths that exist or are registered as planned", () => {
    const missing = namedPaths
      .filter(
        ({ path }) => !existsSync(resolve(repoRoot, path)) && !registered(path),
      )
      .map(({ page, path }) => `${page}: missing ${path}`);
    expect(missing).toEqual([]);
  });

  it("ships no placeholder prose", () => {
    expect(placeholderPages).toEqual([]);
  });

  it("imports only names the packages actually export", () => {
    const missing = pages
      .flatMap(pageImports)
      .filter(
        ({ package: packageName, name }) =>
          !(packageExports[packageName] ?? []).includes(name),
      )
      .map(
        ({ page, package: packageName, name }) =>
          `${page}: ${name} is not exported by @gpuixui/${packageName}`,
      );
    expect(missing).toEqual([]);
  });
});
