import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import { frontmatter, frontmatterValue } from "./component-index";
import { curatedTwinOf } from "./curated-twins";
import { normalisedName } from "./page-dependencies";
import { readPackagePages } from "./page-dependencies-source";
import {
  indexJson,
  itemJson,
  importsOf,
  itemName,
  type RegistryItem,
  type RegistryItemFile,
} from "./registry";

/**
 * The registry, read from the component pages and their sources.
 *
 * A component page is the one place its title, description and module are
 * stated; the module's own relative imports are the list of files an install
 * needs. Both are read at build time and served as JSON, so the registry cannot
 * describe a component the documentation does not, or install a file the
 * repository does not ship.
 *
 * Node-only: this reads the workspace at build time, and the browser bundle
 * never sees it.
 */

/** One served component page, before its module is resolved. */
interface ServedPage {
  readonly url: string;
  /** Repository-relative page, e.g. `packages/components/docs/accordion.mdx`. */
  readonly file: string;
  readonly slug: string;
  /** The page the site writes, or one a package ships. */
  readonly origin: "site" | "package";
}

/**
 * The component pages the site actually serves.
 *
 * A curated page keeps the URL of the package page it shadows, so it is the
 * page the registry reads; a package URL a curated page replaces is a redirect
 * and is dropped (`curated-twins.ts`). The icon set documents a component too,
 * but it ships no per-item source, so its collection is not a registry lane.
 */
const servedPages = (root: string): ReadonlyArray<ServedPage> => {
  const curated = readdirSync(join(root, "apps/docs/content/docs/components"))
    .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
    .map((name) => {
      const slug = basename(name, ".mdx");
      return {
        url: `/docs/components/${slug}`,
        file: `apps/docs/content/docs/components/${name}`,
        slug,
        origin: "site" as const,
      };
    });

  const packaged = packageCollections
    .filter((collection) => collection.origin !== "icons")
    .flatMap((collection) =>
      collectionPages(root, collection)
        .filter((name) => name !== "index.mdx")
        .map((name) => {
          const slug = name.replace(/\.mdx$/, "");
          return {
            url: `${collection.route}/${slug}`,
            file: `${collection.dir}/${name}`,
            slug,
            origin: "package" as const,
          };
        }),
    );

  const seen = new Set(curated.map((page) => page.url));
  return [
    ...curated,
    ...packaged.filter(
      (page) => !seen.has(page.url) && curatedTwinOf(page.url) === undefined,
    ),
  ];
};

/** A path with the repository's separators, as a registry path is written. */
const repoRelative = (root: string, path: string): string =>
  relative(root, path).replaceAll("\\", "/");

/** Every source file a package ships, repository-relative. */
const sourceFiles = (
  root: string,
  packageName: string,
): ReadonlyArray<string> =>
  (function walk(directory: string): ReadonlyArray<string> {
    if (!existsSync(directory)) return [];
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return walk(path);
      return /\.tsx?$/.test(entry.name) &&
        !/\.(?:test|example)\.tsx?$/.test(entry.name)
        ? [repoRelative(root, path)]
        : [];
    });
  })(join(root, "packages", packageName, "src"));

/** The shallowest file whose name is the page's, which is the component itself. */
const byStem = (
  files: ReadonlyArray<string>,
  slug: string,
): string | undefined =>
  files
    .filter(
      (path) =>
        normalisedName(basename(path).replace(/\.tsx?$/, "")) ===
        normalisedName(slug),
    )
    .toSorted(
      (left, right) =>
        left.split("/").length - right.split("/").length ||
        left.localeCompare(right),
    )[0];

/** The package a module belongs to, e.g. `components`. */
const packageOf = (module: string): string | undefined =>
  /^packages\/([^/]+)\/src\//.exec(module)?.[1];

/** A curated page names its module; a package page's module is resolved for it. */
const moduleOf = (
  root: string,
  page: ServedPage,
  read: (path: string) => string,
  resolved: ReadonlyMap<string, string>,
): string | undefined => {
  if (page.origin === "site") {
    const named = /<ComponentSource\b[^>]*\bfile="([^"]+)"/.exec(
      read(page.file),
    )?.[1];
    return named !== undefined && /^packages\/[^/]+\/src\/.+\.tsx?$/.test(named)
      ? named
      : undefined;
  }

  const packageName = page.file.split("/")[1] ?? "";
  return (
    byStem(sourceFiles(root, packageName), page.slug) ?? resolved.get(page.url)
  );
};

/** The page's title and description, from the frontmatter it renders. */
const metadataOf = (
  source: string,
): { readonly title: string; readonly description: string } => {
  const head = frontmatter(source);
  return {
    title: frontmatterValue(head, "title") ?? "",
    description: frontmatterValue(head, "description") ?? "",
  };
};

/** A relative specifier resolved to the file TypeScript compiles it to. */
const resolveImport = (from: string, specifier: string): string | undefined => {
  if (!specifier.startsWith(".")) return undefined;
  const base = join(dirname(from), specifier.replace(/\.jsx?$/, ""));
  return [".ts", ".tsx", "/index.ts", "/index.tsx"]
    .map((suffix) => base + suffix)
    .find(existsSync);
};

/** The module and every same-package file its relative imports need. */
const closureOf = (
  root: string,
  module: string,
  read: (path: string) => string,
): ReadonlyArray<string> => {
  const packageDir = `packages/${packageOf(module) ?? ""}/src/`;
  const found = new Set<string>();

  const visit = (path: string): void => {
    const key = repoRelative(root, path);
    if (found.has(key)) return;
    found.add(key);
    for (const specifier of importsOf(read(key))) {
      const imported = resolveImport(path, specifier);
      if (
        imported !== undefined &&
        repoRelative(root, imported).startsWith(packageDir)
      )
        visit(imported);
    }
  };

  visit(join(root, module));
  return [...found].toSorted();
};

/** The shadcn file entry for one repository path. */
const fileEntry = (
  path: string,
  content: string,
  packageName: string,
): RegistryItemFile => ({
  path,
  target: `@ui/${path.slice(`packages/${packageName}/src/`.length)}`,
  type: path.endsWith(".tsx") ? "registry:component" : "registry:lib",
  content,
});

/** One served page whose module resolved to a package. */
interface ResolvedPage {
  readonly page: ServedPage;
  readonly module: string;
  readonly packageName: string;
}

/** The repository root, without its trailing separator. */
const rootOf = (root: string | URL): string =>
  (typeof root === "string" ? root : fileURLToPath(root)).replace(/\/+$/, "");

/** A reader that reads each file once. */
const reader = (repo: string): ((path: string) => string) => {
  const texts = new Map<string, string>();
  return (path) => {
    const cached = texts.get(path);
    if (cached !== undefined) return cached;
    const source = readFileSync(join(repo, path), "utf8");
    texts.set(path, source);
    return source;
  };
};

/**
 * The served pages whose module resolved, and the package pages that did not.
 *
 * A page this site writes for a pattern rather than a library component (its
 * source block names a file under `apps/docs`) is not an item and is not a
 * failure; a package page with no module is, and is reported.
 */
const resolvedPages = (
  repo: string,
  read: (path: string) => string,
): {
  readonly pages: ReadonlyArray<ResolvedPage>;
  readonly unresolved: ReadonlyArray<string>;
} => {
  const resolved = new Map(
    readPackagePages(repo).flatMap((page) =>
      page.module === undefined ? [] : [[page.url, page.module] as const],
    ),
  );

  return servedPages(repo).reduce<{
    pages: ResolvedPage[];
    unresolved: string[];
  }>(
    (index, page) => {
      const module = moduleOf(repo, page, read, resolved);
      const packageName = module === undefined ? undefined : packageOf(module);
      if (module === undefined || packageName === undefined) {
        return page.origin === "package"
          ? { ...index, unresolved: [...index.unresolved, page.url] }
          : index;
      }
      return {
        ...index,
        pages: [...index.pages, { page, module, packageName }],
      };
    },
    { pages: [], unresolved: [] },
  );
};

/** Every item, in page order, and the pages no module resolved for. */
export const readRegistry = (
  root: string | URL,
): {
  readonly index: string;
  readonly items: ReadonlyArray<{
    readonly name: string;
    readonly json: string;
  }>;
  readonly unresolved: ReadonlyArray<string>;
} => {
  const repo = rootOf(root);
  const read = reader(repo);
  const { pages, unresolved } = resolvedPages(repo, read);

  const items = pages.map(({ page, module, packageName }): RegistryItem => {
    const { title, description } = metadataOf(read(page.file));
    return {
      name: itemName(packageName, page.slug),
      url: page.url,
      title,
      description,
      type: "registry:component",
      files: closureOf(repo, module, read).map((path) =>
        fileEntry(path, read(path), packageName),
      ),
    };
  });

  return {
    items: items.map((item) => ({ name: item.name, json: itemJson(item) })),
    index: indexJson(items),
    unresolved,
  };
};

/** The machine paths the registry serves: the index and one document per item. */
export const registryPaths = (root: string | URL): ReadonlyArray<string> => {
  const repo = rootOf(root);
  return [
    "/registry.json",
    ...resolvedPages(repo, reader(repo)).pages.map(
      ({ page, packageName }) => `/${itemName(packageName, page.slug)}.json`,
    ),
  ].toSorted();
};
