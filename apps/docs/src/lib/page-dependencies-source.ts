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
import { componentDocsRoute } from "./shared";

const stemOf = (path: string): string => normalisedName(basename(path, ".tsx"));

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

const subjectOf = (markdown: string): string | undefined => {
  const prose = markdown.replace(/^---\n[\s\S]*?\n---\n/, "");
  const opening = prose.split("\n\n")[0] ?? "";
  return /`([A-Za-z_][A-Za-z0-9_]*)`/.exec(opening)?.[1];
};

const importedNames = (
  markdown: string,
  specifier: string,
): ReadonlyArray<string> => {
  const fence = /```tsx\n([\s\S]*?)```/.exec(markdown)?.[1] ?? "";
  const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [
    ...fence.matchAll(
      new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*"${escaped}"`, "g"),
    ),
  ].flatMap((match) =>
    (match[1] ?? "")
      .split(",")
      .map(
        (name) =>
          name
            .trim()
            .split(/\s+as\s+/)[0]
            ?.trim() ?? "",
      )
      .filter((name) => name !== ""),
  );
};

const moduleFor = (
  root: string,
  collection: (typeof packageCollections)[number],
  page: string,
  symbols: ReturnType<typeof buildWorkspaceSymbolIndex>,
  markdown: string,
): string | undefined => {
  const published = symbols.packages.find(
    (entry) => entry.name === collection.packageName,
  )?.symbols;

  const wanted = normalisedName(page);
  const byStem = published?.find(
    (symbol) => normalisedName(symbol.name) === wanted,
  );
  if (byStem !== undefined && existsSync(join(root, byStem.module))) {
    return byStem.module;
  }

  const subject = subjectOf(markdown);
  const bySubject =
    subject === undefined
      ? undefined
      : published?.find((symbol) => symbol.name === subject);
  if (bySubject !== undefined && existsSync(join(root, bySubject.module))) {
    return bySubject.module;
  }

  const packageDir = collection.dir.replace(/\/docs(\/.*)?$/, "");
  const named = componentModules(root, packageDir)
    .filter((path) => stemOf(path) === wanted)
    .toSorted(
      (left, right) =>
        left.split("/").length - right.split("/").length ||
        left.localeCompare(right),
    );
  const found = named[0];
  if (found !== undefined) return relative(root, found);

  const imported = importedNames(markdown, collection.packageName).find(
    (name) => published?.some((symbol) => symbol.name === name),
  );
  const byImport = published?.find((symbol) => symbol.name === imported);
  return byImport === undefined ? undefined : byImport.module;
};

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

export interface PackagePageModule {
  readonly url: string;

  readonly module?: string;

  readonly writesDependencies: boolean;
}

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
          module: moduleFor(root, collection, page, symbols, markdown),
          writesDependencies: /^## Dependencies\s*$/m.test(markdown),
        };
      }),
  );
};

export interface CuratedPageModule {
  readonly url: string;

  readonly module?: string;

  readonly writesDependencies: boolean;
}

const curatedModule = (root: string, markdown: string): string | undefined => {
  const file = /<ComponentSource\b[^>]*\bfile="([^"]+)"/.exec(markdown)?.[1];
  return file !== undefined && existsSync(join(root, file)) ? file : undefined;
};

export const readCuratedPages = (
  root: string,
): ReadonlyArray<CuratedPageModule> =>
  readdirSync(join(root, "apps/docs/content/docs/components"))
    .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
    .toSorted()
    .map((name) => {
      const markdown = readFileSync(
        join(root, "apps/docs/content/docs/components", name),
        "utf8",
      );
      return {
        url: `${componentDocsRoute}/${name.replace(/\.mdx$/, "")}`,
        module: curatedModule(root, markdown),
        writesDependencies: /^## Dependencies\s*$/m.test(markdown),
      };
    });

export const readPageDependencies = (root: string): PageDependencyIndex => {
  const read = [...readPackagePages(root), ...readCuratedPages(root)].filter(
    (page) => !page.writesDependencies,
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
