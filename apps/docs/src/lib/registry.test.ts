import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import { curatedTwinOf } from "./curated-twins";
import { readRegistry } from "./registry-source";

/**
 * The shadcn registry, held to the pages and files it claims.
 *
 * Bug guarded: the registry is generated from a filesystem walk, and a walk
 * that runs from the wrong directory (or a resolver that loses an import)
 * still produces valid JSON — it just installs one file with dangling relative
 * imports. So the test derives the served pages from disk on its own, demands
 * one item per page, and checks every file and every relative import an item
 * ships. It fails with an empty or partial generator.
 */

const root = fileURLToPath(new URL("../../../../", import.meta.url));

interface Page {
  readonly url: string;
  readonly file: string;
}

/** The component pages this site writes, minus a pattern page with no library source. */
const sitePages = (): ReadonlyArray<Page> =>
  readdirSync(join(root, "apps/docs/content/docs/components"))
    .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
    .flatMap((name) => {
      const file = `apps/docs/content/docs/components/${name}`;
      const source = readFileSync(join(root, file), "utf8");
      const module = /<ComponentSource\b[^>]*\bfile="([^"]+)"/.exec(
        source,
      )?.[1];
      return module?.startsWith("packages/") === true
        ? [{ url: `/docs/components/${basename(name, ".mdx")}`, file }]
        : [];
    });

/** The package pages the site serves, after a curated page's shadow and redirects. */
const packagePages = (): ReadonlyArray<Page> =>
  packageCollections
    .filter((collection) => collection.origin !== "icons")
    .flatMap((collection) =>
      collectionPages(root, collection)
        .filter((name) => name !== "index.mdx")
        .map((name) => ({
          url: `${collection.route}/${name.replace(/\.mdx$/, "")}`,
          file: `${collection.dir}/${name}`,
        })),
    );

/** Every page the site serves, in the precedence the site uses. */
const servedPages = (): ReadonlyArray<Page> => {
  const site = sitePages();
  const urls = new Set(site.map((page) => page.url));
  return [
    ...site,
    ...packagePages().filter(
      (page) => !urls.has(page.url) && curatedTwinOf(page.url) === undefined,
    ),
  ];
};

const registry = readRegistry(root);
const index = JSON.parse(registry.index) as {
  name: string;
  homepage: string;
  items: ReadonlyArray<{
    name: string;
    type: string;
    title: string;
    description: string;
    author: string;
    files: ReadonlyArray<{ path: string; target: string; type: string }>;
    meta: { url: string };
  }>;
};
const items = registry.items.map(
  (item) =>
    JSON.parse(item.json) as {
      name: string;
      type: string;
      title: string;
      description: string;
      author: string;
      dependencies: ReadonlyArray<string>;
      files: ReadonlyArray<{
        path: string;
        target: string;
        type: string;
        content: string;
      }>;
      meta: { url: string };
    },
);

/** A relative import resolved the way the generator claims it can resolve. */
const resolved = (from: string, specifier: string): string | undefined => {
  const base = join(root, dirname(from), specifier.replace(/\.jsx?$/, ""));
  return [".ts", ".tsx", "/index.ts", "/index.tsx"]
    .map((suffix) => join(base + suffix))
    .find(existsSync);
};

describe("the shadcn registry", () => {
  it("names every component page the site serves, once", () => {
    expect(registry.unresolved).toEqual([]);
    expect(items.length).toBeGreaterThan(100);
    expect(index.items.map((item) => item.meta.url).toSorted()).toEqual(
      servedPages()
        .map((page) => page.url)
        .toSorted(),
    );
    expect(new Set(index.items.map((item) => item.name)).size).toBe(
      items.length,
    );
  });

  it("installs the files the repository ships, byte for byte", () => {
    const files = items.flatMap((item) =>
      item.files.map((file) => ({ file, item: item.name })),
    );

    expect(files.length).toBeGreaterThan(items.length);
    expect(
      files.filter(
        ({ file }) =>
          !existsSync(join(root, file.path)) ||
          readFileSync(join(root, file.path), "utf8") !== file.content,
      ),
    ).toEqual([]);
  });

  it("ships every same-package module a file imports", () => {
    // The install is a directory of files, not a package; a relative import the
    // item omits is a build error the CLI cannot see.
    const broken = items.flatMap((item) => {
      const shipped = new Set(item.files.map((file) => file.path));
      const packageDir = item.files[0]?.path.split("/").slice(0, 4).join("/");
      return item.files.flatMap((file) =>
        [...file.content.matchAll(/\bfrom\s+["']([^"']+)["']/g)].flatMap(
          (match) => {
            const specifier = match[1] ?? "";
            const path =
              specifier.startsWith(".") && packageDir !== undefined
                ? resolved(file.path, specifier)
                : undefined;
            const relative = path?.slice(root.length + 1);
            return relative !== undefined &&
              relative.startsWith(`${packageDir}/`) &&
              !shipped.has(relative)
              ? [`${item.name}: ${file.path} imports ${specifier}`]
              : [];
          },
        ),
      );
    });

    expect(broken).toEqual([]);
  });

  it("ships the part files a component imports, not just its entry module", () => {
    // A closure read from the wrong directory still emits the entry module and
    // valid JSON; the install then fails on the first relative import.
    const shipped = (name: string): ReadonlyArray<string> =>
      items
        .find((item) => item.name === name)
        ?.files.map((file) => file.path) ?? [];

    expect(shipped("components-accordion")).toContain(
      "packages/components/src/accordion/logic.ts",
    );
    expect(shipped("components-accordion")).toContain(
      "packages/components/src/internal/theme.ts",
    );
    expect(shipped("primitives-button")).toContain(
      "packages/primitives/src/core/theme.ts",
    );
  });

  it("declares dependencies the workspace's manifests declare", () => {
    // The scan reads source text; a doc comment that said "import … from"
    // once became a dependency named `stay`. Every declared name must be a
    // package the workspace already pins.
    const rootManifest = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as {
      workspaces: { catalog: Readonly<Record<string, string>> };
    };
    const manifests = readdirSync(join(root, "packages"), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => {
        const path = join(root, "packages", entry.name, "package.json");
        return existsSync(path)
          ? [
              JSON.parse(readFileSync(path, "utf8")) as {
                dependencies?: Readonly<Record<string, string>>;
                devDependencies?: Readonly<Record<string, string>>;
              },
            ]
          : [];
      });
    const known = new Set([
      ...Object.keys(rootManifest.workspaces.catalog),
      ...manifests.flatMap((manifest) => [
        ...Object.keys(manifest.dependencies ?? {}),
        ...Object.keys(manifest.devDependencies ?? {}),
      ]),
    ]);

    expect(
      items.flatMap((item) =>
        item.dependencies
          .filter((dependency) => !known.has(dependency))
          .map((dependency) => `${item.name}: ${dependency}`),
      ),
    ).toEqual([]);
  });

  it("keeps content out of the index and in each item", () => {
    const listed = (item: (typeof items)[number]) => ({
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      author: item.author,
      files: item.files.map((file) => ({
        path: file.path,
        target: file.target,
        type: file.type,
      })),
      meta: item.meta,
    });

    expect(
      index.items.flatMap((item) =>
        item.files.filter((file) => "content" in file),
      ),
    ).toEqual([]);
    expect(
      items.flatMap((item) => item.files.filter((file) => file.content === "")),
    ).toEqual([]);
    expect(index.items).toEqual(items.map(listed));
  });

  it("serves each item at a flat, unique root address", () => {
    const names = items.map((item) => item.name);
    expect(
      names.filter((name) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)),
    ).toEqual([]);
    expect(new Set(names).size).toBe(names.length);
    expect(index.name).toBe("gpuixui");
    expect(index.homepage).toBe("https://gpuixui.sudokw.com/");
  });
});
