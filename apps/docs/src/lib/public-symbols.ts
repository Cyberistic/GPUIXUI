import { curatedTwinOf } from "./curated-twins";

export type PublicSymbolKind =
  | "component"
  | "hook"
  | "function"
  | "class"
  | "constant"
  | "interface"
  | "type"
  | "enum"
  | "namespace"
  | "external";

export const publicSymbolKinds: ReadonlyArray<PublicSymbolKind> = [
  "component",
  "hook",
  "function",
  "class",
  "interface",
  "type",
  "enum",
  "namespace",
  "constant",
  "external",
];

export interface PublicSymbol {
  readonly name: string;
  readonly kind: PublicSymbolKind;

  readonly module: string;

  readonly summary: string;
}

export interface PublishedModule {
  readonly specifier: string;

  readonly packageName: string;

  readonly module: string;
  readonly symbols: ReadonlyArray<PublicSymbol>;
}

export interface WorkspacePackage {
  readonly dir: string;

  readonly name: string;
  readonly description: string;
}

export interface PublicSymbolRow extends PublicSymbol {
  readonly specifiers: ReadonlyArray<string>;
}

export interface PublicSymbolPackage {
  readonly name: string;
  readonly description: string;
  readonly symbols: ReadonlyArray<PublicSymbolRow>;
}

export interface PublicSymbolIndex {
  readonly packages: ReadonlyArray<PublicSymbolPackage>;

  readonly count: number;
}

export interface DocsCollection {
  readonly dir: string;

  readonly route: string;
}

export const docsUrlFor = (
  module: string,
  collections: ReadonlyArray<DocsCollection>,
  pages: ReadonlyArray<{ readonly url: string }>,
): string | undefined => {
  const file = /^packages\/([^/]+)\/(.+)$/.exec(module);
  if (file === null) return undefined;
  const [, packageName, rest] = file;
  if (packageName === undefined || rest === undefined) return undefined;

  const collection = collections.find(
    (candidate) => candidate.dir === `packages/${packageName}/docs`,
  );
  if (collection === undefined) return undefined;

  const base = rest
    .split("/")
    .at(-1)
    ?.replace(/\.(?:tsx|ts)$/, "");
  if (base === undefined || base === "" || base === "index") return undefined;

  const url = `${collection.route}/${kebabCase(base)}`;

  const curated = curatedTwinOf(url);
  if (curated !== undefined) return curated;
  return pages.some((page) => page.url === url) ? url : undefined;
};

const kebabCase = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

export const isComponentName = (name: string): boolean =>
  /^[A-Z][A-Za-z0-9]*$/.test(name);

export const isHookName = (name: string): boolean => /^use[A-Z]/.test(name);

export const packageOfModule = (
  module: string,
  packages: ReadonlyArray<WorkspacePackage>,
): WorkspacePackage | undefined =>
  packages.find((pkg) => module.startsWith(`packages/${pkg.dir}/`));

export const buildSymbolIndex = (
  packages: ReadonlyArray<WorkspacePackage>,
  modules: ReadonlyArray<PublishedModule>,
): PublicSymbolIndex => {
  const rows = modules
    .flatMap((module) =>
      module.symbols.map((symbol) => ({
        symbol,
        specifier: module.specifier,
      })),
    )
    .reduce(
      (acc, { symbol, specifier }) => {
        const key = `${symbol.module}${symbol.name}`;
        const existing = acc.get(key);
        acc.set(key, {
          symbol,
          specifiers:
            existing === undefined
              ? [specifier]
              : [...existing.specifiers, specifier],
        });
        return acc;
      },
      new Map<
        string,
        {
          readonly symbol: PublicSymbol;
          readonly specifiers: ReadonlyArray<string>;
        }
      >(),
    );

  const grouped = [...rows.values()].reduce((acc, { symbol, specifiers }) => {
    const owner = packageOfModule(symbol.module, packages);
    const group = owner?.name ?? symbol.module;
    const row: PublicSymbolRow = {
      ...symbol,
      specifiers: [...new Set(specifiers)].toSorted((left, right) =>
        left.localeCompare(right),
      ),
    };
    return acc.set(group, [...(acc.get(group) ?? []), row]);
  }, new Map<string, ReadonlyArray<PublicSymbolRow>>());

  const published = packages.flatMap((pkg) => {
    const symbols = grouped.get(pkg.name);
    return symbols === undefined
      ? []
      : [
          {
            name: pkg.name,
            description: pkg.description,
            symbols: symbols.toSorted((left, right) =>
              left.name.localeCompare(right.name),
            ),
          },
        ];
  });

  return {
    packages: published,
    count: rows.size,
  };
};

export const filterSymbols = (
  packages: ReadonlyArray<PublicSymbolPackage>,
  query: string,
): ReadonlyArray<PublicSymbolPackage> => {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);
  if (terms.length === 0) return packages;

  return packages
    .map((pkg) => ({
      ...pkg,
      symbols: pkg.symbols.filter((row) => {
        const haystack =
          `${row.name} ${row.kind} ${row.module} ${row.summary} ${row.specifiers.join(" ")}`.toLowerCase();
        return terms.every((term) => haystack.includes(term));
      }),
    }))
    .filter((pkg) => pkg.symbols.length > 0);
};
