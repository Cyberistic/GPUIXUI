import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildWorkspaceSymbolIndex, repoRoot } from "./public-symbols-source";

export const readRepo = (path: string): string =>
  readFileSync(join(repoRoot, path), "utf8");

export interface NamedImport {
  readonly specifier: string;
  readonly names: ReadonlyArray<string>;
}

export const typescriptSnippets = (page: string): ReadonlyArray<string> =>
  [...page.matchAll(/```tsx?\n([\s\S]*?)```/g)].map((match) => match[1] ?? "");

export const namedImports = (
  snippets: ReadonlyArray<string>,
): ReadonlyArray<NamedImport> =>
  snippets.flatMap((snippet) =>
    [...snippet.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)"/g)].map(
      (match) => ({
        specifier: match[2] ?? "",
        names: (match[1] ?? "")
          .split(",")
          .map((name) => name.trim())

          .filter((name) => name !== "" && !name.startsWith("type ")),
      }),
    ),
  );

let publishedCache: ReadonlyMap<string, ReadonlySet<string>> | undefined;

export const publishedNames = (): ReadonlyMap<string, ReadonlySet<string>> => {
  publishedCache ??= buildWorkspaceSymbolIndex(repoRoot)
    .packages.flatMap((pkg) => pkg.symbols)
    .flatMap((symbol) =>
      symbol.specifiers.map((specifier) => ({
        specifier,
        name: symbol.name,
      })),
    )
    .reduce((bySpecifier, { specifier, name }) => {
      const names = bySpecifier.get(specifier) ?? new Set<string>();
      names.add(name);
      bySpecifier.set(specifier, names);
      return bySpecifier;
    }, new Map<string, Set<string>>());
  return publishedCache;
};

export const unresolvedImports = (
  imports: ReadonlyArray<NamedImport>,
  published: ReadonlyMap<string, ReadonlySet<string>> = publishedNames(),
): ReadonlyArray<string> =>
  imports.flatMap(({ names, specifier }) => {
    if (!specifier.startsWith("@gpuixui/")) return [];
    const available = published.get(specifier);
    if (available === undefined) {
      return [`${specifier} is not a published entry point`];
    }
    return names
      .filter((name) => !available.has(name))
      .map((name) => `${specifier} does not export ${name}`);
  });
