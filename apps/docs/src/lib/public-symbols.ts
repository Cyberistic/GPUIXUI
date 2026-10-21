/**
 * The public symbol index.
 *
 * The reference page answers two questions: *which specifier do I import* and
 * *what does it give me*. The first is the packages' `exports` maps; the second
 * is the source behind them. This module owns the shape of that second answer
 * and the rules that assemble it, so the page renders one table and the test
 * checks one model.
 *
 * Pure: `public-symbols-source.ts` reads the workspace and hands the symbols
 * over. The page never imports a package, and nothing here touches the disk.
 */

/** How a published symbol is declared. */
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

/** The kinds a reader scans for, in the order the page groups them. */
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

/** One published symbol. */
export interface PublicSymbol {
  /** The name a consumer imports. */
  readonly name: string;
  readonly kind: PublicSymbolKind;
  /** The file that declares it, relative to the repository root. */
  readonly module: string;
  /** The first sentence of its doc comment, when it has one. */
  readonly summary: string;
}

/** One published module: an entry point and the symbols behind it. */
export interface PublishedModule {
  /** The import specifier, e.g. `@gpuixui/components/card`. */
  readonly specifier: string;
  /** The package that publishes it. */
  readonly packageName: string;
  /** The file it resolves to, relative to the repository root. */
  readonly module: string;
  readonly symbols: ReadonlyArray<PublicSymbol>;
}

/** A workspace package, as the index sees it. */
export interface WorkspacePackage {
  /** The directory under `packages/`. */
  readonly dir: string;
  /** The published name, e.g. `@gpuixui/tokens`. */
  readonly name: string;
  readonly description: string;
}

/** A symbol with the specifiers that publish it. */
export interface PublicSymbolRow extends PublicSymbol {
  /** Every specifier a consumer can import the symbol from. */
  readonly specifiers: ReadonlyArray<string>;
}

/** The symbols one package declares. */
export interface PublicSymbolPackage {
  readonly name: string;
  readonly description: string;
  readonly symbols: ReadonlyArray<PublicSymbolRow>;
}

/** The whole index, grouped by the package that declares the symbols. */
export interface PublicSymbolIndex {
  readonly packages: ReadonlyArray<PublicSymbolPackage>;
  /** How many distinct symbols the index holds. */
  readonly count: number;
}

/**
 * A PascalCase name is a component in this workspace.
 *
 * Every component in `packages/primitives` and `packages/components` is a
 * PascalCase export, and the only other PascalCase exports are schemas and
 * constants declared in `.ts` modules, which the source reader classifies from
 * the declaration itself.
 */
export const isComponentName = (name: string): boolean =>
  /^[A-Z][A-Za-z0-9]*$/.test(name);

/** A `useX` name is a hook by the React convention the packages follow. */
export const isHookName = (name: string): boolean => /^use[A-Z]/.test(name);

/**
 * The package a module belongs to, by its path.
 *
 * A module under `packages/<dir>/` belongs to that package; a module reached
 * through a workspace dependency keeps its own package, which is the point: a
 * symbol re-exported by `@gpuixui/primitives/core` is still a tokens symbol.
 */
export const packageOfModule = (
  module: string,
  packages: ReadonlyArray<WorkspacePackage>,
): WorkspacePackage | undefined =>
  packages.find((pkg) => module.startsWith(`packages/${pkg.dir}/`));

/**
 * The index, one row per symbol.
 *
 * A symbol published by several specifiers — the package root re-exports every
 * module, and each module is also its own entry point — is one row, not
 * several: the reader asks "what is `Alert`", not "how many times is `Alert`
 * is exported". The specifiers are listed on the row instead.
 */
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

/**
 * The rows a reader's query keeps.
 *
 * Every whitespace-separated term must appear in the row, so `filled hover`
 * finds `filledHover` and `tokens color` narrows the list to that package —
 * the same rule the component index uses.
 */
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
