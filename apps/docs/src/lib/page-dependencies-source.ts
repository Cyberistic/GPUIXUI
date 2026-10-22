import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import {
  collectDependencies,
  normalisedName,
  type PageDependencyIndex,
} from "./page-dependencies";
import { buildWorkspaceSymbolIndex } from "./public-symbols-source";

/**
 * The packages each package page's component imports, read from the workspace.
 *
 * A page documents one component; the component's own module is the honest
 * source for what it needs. The page stem names the component (`otp-field` →
 * `OTPField`, `grid` → the `Grid` that lives in `Stack.tsx`), so the public
 * symbol index resolves it first and a file whose stem matches the page is the
 * fallback for a family that publishes no symbol under its own name (`chat`).
 *
 * A page that writes its own `## Dependencies` section is skipped rather than
 * contradicted. A page that resolves to no module is reported, not guessed:
 * the site's guard fails until the page has a source to read.
 *
 * Node-only: this runs inside the Vite plugin, once, at build time.
 */

/** A file's name without its extension, to compare against a page stem. */
const stemOf = (path: string): string => normalisedName(basename(path, ".tsx"));

/** Every source file a package's component could live in. */
const componentModules = (
  root: string,
  packageDir: string,
): ReadonlyArray<string> =>
  (function walk(directory: string): ReadonlyArray<string> {
    if (!existsSync(directory)) return [];
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return walk(path);
      return entry.name.endsWith(".tsx") &&
        !/\.(?:test|example)\.tsx$/.test(entry.name)
        ? [path]
        : [];
    });
  })(join(root, packageDir, "src"));

/** The module a page documents, from the published symbol or its file name. */
const moduleFor = (
  root: string,
  collection: (typeof packageCollections)[number],
  page: string,
  symbols: ReturnType<typeof buildWorkspaceSymbolIndex>,
): string | undefined => {
  const wanted = normalisedName(page);
  const published = symbols.packages
    .find((entry) => entry.name === collection.packageName)
    ?.symbols.find((symbol) => normalisedName(symbol.name) === wanted);
  if (published !== undefined && existsSync(join(root, published.module))) {
    return published.module;
  }

  const named = componentModules(root, collection.dir.replace(/\/docs$/, ""))
    .filter((path) => stemOf(path) === wanted)
    .toSorted(
      (left, right) =>
        left.split("/").length - right.split("/").length ||
        left.localeCompare(right),
    );
  const found = named[0];
  return found === undefined ? undefined : relative(root, found);
};

/** The specifiers a module imports, in the order the file declares them. */
const importsOf = (path: string): ReadonlyArray<string> => {
  const source = readFileSync(path, "utf8");
  const patterns = [
    /\bfrom\s+"([^"]+)"/g,
    /\bimport\s+"([^"]+)"/g,
    /\bfrom\s+'([^']+)'/g,
    /\bimport\s+'([^']+)'/g,
  ];
  return patterns.flatMap((pattern) =>
    [...source.matchAll(pattern)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    ),
  );
};

/** A page a package ships, and the module it documents. */
export interface PackagePageModule {
  /** The URL the page renders at. */
  readonly url: string;
  /** The component's module, repository-relative; absent when nothing resolved. */
  readonly module?: string;
  /** The page writes its own `## Dependencies`, so the generated strip stays off. */
  readonly writesDependencies: boolean;
}

/**
 * Every page the packages ship, and the module each documents.
 *
 * Two readers want this inventory: the dependency strip (which skips a page
 * that lists its own packages) and the source block (which does not care — the
 * implementation is worth showing either way). Reading it once keeps both
 * from resolving a page differently.
 */
export const readPackagePages = (
  root: string,
): ReadonlyArray<PackagePageModule> => {
  const symbols = buildWorkspaceSymbolIndex(root);
  return packageCollections.flatMap((collection) =>
    collectionPages(root, collection)
      .filter((name) => name !== "index.mdx")
      .toSorted()
      .map((file) => {
        const page = basename(file, ".mdx");
        const markdown = readFileSync(join(root, collection.dir, file), "utf8");
        return {
          url: `${collection.route}/${page}`,
          module: moduleFor(root, collection, page, symbols),
          writesDependencies: /^## Dependencies\s*$/m.test(markdown),
        };
      }),
  );
};

/** The whole index, for the plugin's virtual module and the guard. */
export const readPageDependencies = (root: string): PageDependencyIndex => {
  const read = readPackagePages(root).flatMap((page) =>
    page.writesDependencies ? [] : [page],
  );

  return read.reduce<{
    pages: Record<string, PageDependencyIndex["pages"][string]>;
    unresolved: string[];
  }>(
    (index, page) => {
      if (page.module === undefined) {
        return { ...index, unresolved: [...index.unresolved, page.url] };
      }
      return {
        ...index,
        pages: {
          ...index.pages,
          [page.url]: {
            module: page.module,
            dependencies: collectDependencies(
              importsOf(join(root, page.module)),
            ),
          },
        },
      };
    },
    { pages: {}, unresolved: [] },
  );
};

/**
 * Every package page's module, including one that lists its own packages.
 *
 * The source block reads this: the implementation is the page's subject whether
 * or not the page chose to write its dependency list by hand.
 */
export const readPageModules = (
  root: string,
): {
  readonly pages: ReadonlyArray<{
    readonly url: string;
    readonly module: string;
  }>;
  readonly unresolved: ReadonlyArray<string>;
} =>
  readPackagePages(root).reduce<{
    pages: Array<{ url: string; module: string }>;
    unresolved: string[];
  }>(
    (index, page) =>
      page.module === undefined
        ? { ...index, unresolved: [...index.unresolved, page.url] }
        : {
            ...index,
            pages: [...index.pages, { url: page.url, module: page.module }],
          },
    { pages: [], unresolved: [] },
  );
