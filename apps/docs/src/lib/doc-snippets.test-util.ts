import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildWorkspaceSymbolIndex, repoRoot } from "./public-symbols-source";

/**
 * The pieces a docs guard needs to hold a page's snippets to the workspace.
 *
 * The installation, getting-started and introduction pages all print code a
 * reader copies, and each guard used to re-read the files and rebuild the
 * symbol index on its own. One parse keeps the rules identical: an import is
 * resolved against the entry point's own source, never against a list.
 */

/** A repository file, read from the root the symbol index walks. */
export const readRepo = (path: string): string =>
  readFileSync(join(repoRoot, path), "utf8");

export interface NamedImport {
  readonly specifier: string;
  readonly names: ReadonlyArray<string>;
}

/** The page's fenced TypeScript snippets, in reading order. */
export const typescriptSnippets = (page: string): ReadonlyArray<string> =>
  [...page.matchAll(/```tsx\n([\s\S]*?)```/g)].map((match) => match[1] ?? "");

/** Every named import the snippets write, in page order. */
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
          .filter((name) => name !== ""),
      }),
    ),
  );

/** The names each published entry point exports, read from the package source. */
export const publishedNames = (): ReadonlyMap<string, ReadonlySet<string>> =>
  buildWorkspaceSymbolIndex(repoRoot)
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

/**
 * Every import a page writes that its entry point does not export.
 *
 * Only `@gpuixui/*` is resolved: `@gpuix/react` and React itself are not this
 * workspace's packages.
 */
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
