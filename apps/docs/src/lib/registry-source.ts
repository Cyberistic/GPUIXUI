import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import { frontmatterField, frontmatterOf } from "./frontmatter";
import { curatedTwinOf } from "./curated-twins";
import { normalisedName } from "./page-dependencies";
import { readPackagePages } from "./page-dependencies-source";
import {
  indexJson,
  itemJson,
  importsOf,
  installTarget,
  itemName,
  packageOfModule,
  rewriteWorkspaceImports,
  runtimeItemAddress,
  runtimeItemName,
  type RegistryItem,
  type RegistryItemFile,
} from "./registry";

interface ServedPage {
  readonly url: string;

  readonly file: string;
  readonly slug: string;

  readonly origin: "site" | "package";
}

const servedPages = (root: string): ReadonlyArray<ServedPage> => {
  const curated = readdirSync(join(root, "apps/docs/content/docs/components"))
    .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
    .map((name) => {
      const slug = basename(name, ".mdx");
      return {
        url: `/components/${slug}`,
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

const repoRelative = (root: string, path: string): string =>
  relative(root, path).replaceAll("\\", "/");

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

const metadataOf = (
  source: string,
): { readonly title: string; readonly description: string } => {
  const head = frontmatterOf(source);
  return {
    title: frontmatterField(head, "title") ?? "",
    description: frontmatterField(head, "description") ?? "",
  };
};

interface ExportPattern {
  readonly pattern: string;
  readonly target: string;
}

const exportPatterns = (
  read: (path: string) => string,
  packageName: string,
): ReadonlyArray<ExportPattern> => {
  const manifest = JSON.parse(read(`packages/${packageName}/package.json`)) as {
    exports?: Readonly<
      Record<string, string | { default?: string; types?: string }>
    >;
  };
  return Object.entries(manifest.exports ?? {}).flatMap(([pattern, entry]) => {
    const target =
      typeof entry === "string" ? entry : (entry.default ?? entry.types);
    return target === undefined ? [] : [{ pattern, target }];
  });
};

const wildcardValue = (pattern: string, key: string): string | undefined => {
  const star = pattern.indexOf("*");
  if (star === -1) return undefined;
  const head = pattern.slice(0, star);
  const tail = pattern.slice(star + 1);
  return key.startsWith(head) && key.endsWith(tail)
    ? key.slice(head.length, key.length - tail.length)
    : undefined;
};

const workspaceModule = (
  read: (path: string) => string,
  specifier: string,
): string | undefined => {
  const [scope, packageName, ...subpath] = specifier.split("/");
  if (scope !== "@gpuixui" || packageName === undefined) return undefined;
  const key = subpath.length === 0 ? "." : `./${subpath.join("/")}`;
  const patterns = exportPatterns(read, packageName);
  const exact = patterns.find((entry) => entry.pattern === key);
  const wildcard = patterns.flatMap((entry) => {
    const star = wildcardValue(entry.pattern, key);
    return star === undefined ? [] : [{ ...entry, star }];
  })[0];
  const target =
    exact?.target ??
    (wildcard === undefined
      ? undefined
      : wildcard.target.replace("*", wildcard.star));
  return target === undefined
    ? undefined
    : `packages/${packageName}/${target.replace(/^\.\//, "")}`;
};

const resolveImport = (
  repo: string,
  read: (path: string) => string,
  from: string,
  specifier: string,
): string | undefined => {
  const workspace = workspaceModule(read, specifier);
  if (workspace !== undefined) return workspace;
  if (!specifier.startsWith(".")) return undefined;
  const base = join(repo, dirname(from), specifier.replace(/\.jsx?$/, ""));
  const found = [".ts", ".tsx", "/index.ts", "/index.tsx"]
    .map((suffix) => base + suffix)
    .find(existsSync);
  return found === undefined ? undefined : repoRelative(repo, found);
};

const closureOf = (
  repo: string,
  module: string,
  read: (path: string) => string,
): ReadonlyArray<string> => {
  const found = new Set<string>();

  const visit = (path: string): void => {
    if (found.has(path)) return;
    found.add(path);
    for (const specifier of importsOf(read(path))) {
      const imported = resolveImport(repo, read, path, specifier);
      if (imported !== undefined) visit(imported);
    }
  };

  visit(module);
  return [...found].toSorted();
};

const borrowedPackages = (
  read: (path: string) => string,
  own: string,
  files: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  [
    ...new Set(
      files.flatMap((path) =>
        importsOf(read(path)).flatMap((specifier) => {
          const imported = workspaceModule(read, specifier);
          const owner =
            imported === undefined ? undefined : packageOfModule(imported);
          return owner === undefined || owner === own ? [] : [owner];
        }),
      ),
    ),
  ].toSorted();

const fileEntry = (
  repo: string,
  path: string,
  read: (path: string) => string,
): RegistryItemFile => {
  const target = installTarget(path);
  return {
    path,
    target,
    type: path.endsWith(".tsx") ? "registry:component" : "registry:lib",
    content: rewriteWorkspaceImports(read(path), target, (specifier) => {
      const imported = resolveImport(repo, read, path, specifier);
      return imported === undefined ? undefined : installTarget(imported);
    }),
  };
};

interface ResolvedPage {
  readonly page: ServedPage;
  readonly module: string;
  readonly packageName: string;
}

const rootOf = (root: string | URL): string =>
  (typeof root === "string" ? root : fileURLToPath(root)).replace(/\/+$/, "");

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

const workspaceVersions = (
  repo: string,
  read: (path: string) => string,
): Readonly<Record<string, string>> => {
  const root = JSON.parse(read("package.json")) as {
    workspaces?: { catalog?: Readonly<Record<string, string>> };
  };
  const declared = readdirSync(join(repo, "packages"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const path = `packages/${entry.name}/package.json`;
      if (!existsSync(join(repo, path))) return [];
      const manifest = JSON.parse(read(path)) as {
        dependencies?: Readonly<Record<string, string>>;
        optionalDependencies?: Readonly<Record<string, string>>;
        peerDependencies?: Readonly<Record<string, string>>;
      };
      return [
        ...Object.entries(manifest.dependencies ?? {}),
        ...Object.entries(manifest.optionalDependencies ?? {}),
        ...Object.entries(manifest.peerDependencies ?? {}),
      ];
    });

  return {
    ...Object.fromEntries(
      declared.filter(
        ([, version]) =>
          !version.startsWith("catalog:") && !version.startsWith("workspace:"),
      ),
    ),
    ...root.workspaces?.catalog,
  };
};

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
      const packageName =
        module === undefined ? undefined : packageOfModule(module);
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

export interface RegistryDocument {
  readonly path: string;
  readonly json: string;
}

export const readRegistry = (
  root: string | URL,
): {
  readonly index: string;
  readonly items: ReadonlyArray<{
    readonly name: string;
    readonly json: string;
  }>;
  readonly documents: ReadonlyArray<RegistryDocument>;
  readonly unresolved: ReadonlyArray<string>;
} => {
  const repo = rootOf(root);
  const read = reader(repo);
  const versions = workspaceVersions(repo, read);
  const { pages, unresolved } = resolvedPages(repo, read);
  const closures = pages.map(({ module }) => closureOf(repo, module, read));

  const componentItems = pages.map(
    ({ page, packageName }, index): RegistryItem => {
      const { title, description } = metadataOf(read(page.file));
      const files = (closures[index] ?? []).filter(
        (path) => packageOfModule(path) === packageName,
      );
      return {
        name: itemName(packageName, page.slug),
        kind: "component",
        url: page.url,
        title,
        description,
        type: "registry:component",
        registryDependencies: borrowedPackages(read, packageName, files).map(
          runtimeItemAddress,
        ),
        files: files.map((path) => fileEntry(repo, path, read)),
      };
    },
  );

  const runtimeFiles = new Map<string, Set<string>>();
  pages.forEach(({ packageName }, index) => {
    for (const path of closures[index] ?? []) {
      const owner = packageOfModule(path);
      if (owner === undefined || owner === packageName) continue;
      const files = runtimeFiles.get(owner) ?? new Set<string>();
      files.add(path);
      runtimeFiles.set(owner, files);
    }
  });

  const runtimeItems = [...runtimeFiles.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([packageName, files]): RegistryItem => {
      const sorted = [...files].toSorted();
      return {
        name: runtimeItemName(packageName),
        kind: "runtime",
        url: "/registry",
        title: `Runtime: ${packageName}`,
        description: `The \`@gpuixui/${packageName}\` modules the component items import. Installed automatically with the component; not a component itself.`,
        type: "registry:lib",
        registryDependencies: borrowedPackages(read, packageName, sorted).map(
          runtimeItemAddress,
        ),
        files: sorted.map((path) => fileEntry(repo, path, read)),
      };
    });

  const items = [...componentItems, ...runtimeItems];

  const entries = items.map((item) => ({
    name: item.name,
    json: itemJson(item, versions),
  }));
  const index = indexJson(items);

  return {
    items: entries,
    index,
    documents: [
      { path: "/registry.json", json: index },
      ...entries.map((entry) => ({
        path: `/${entry.name}.json`,
        json: entry.json,
      })),
    ],
    unresolved,
  };
};

export const registryPaths = (root: string | URL): ReadonlyArray<string> =>
  readRegistry(root)
    .documents.map((document) => document.path)
    .toSorted();
