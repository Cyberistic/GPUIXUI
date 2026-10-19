import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Reads the `@gpuixui/*` imports a page shows in a fenced code block, and the
 * names a package module really exports (plan 577).
 *
 * A fence is text, so nothing else in the build sees it: `tsc` does not read
 * it, `<include>` points at the real file, and `auto-type-table` reads the real
 * type. A renamed module or export therefore ships a copyable example that
 * fails for the reader. The site test resolves each specifier through the
 * package's `exports` map and checks each name against this scanner.
 *
 * `node:fs`/`node:path` are deliberate: this is a vitest boundary like
 * `source-imports.ts`, and the browser bundle never imports it.
 */

export interface CodeImport {
  readonly specifier: string;
  readonly names: ReadonlyArray<string>;
}

const fence = /```[^\n]*\n([\s\S]*?)```/g;

const statement =
  /(?:^|\n)\s*import\s+(?:type\s+)?(?:[A-Za-z0-9_$]+\s*(?:,\s*)?)?(?:\{([^}]*)\}|\*\s+as\s+[A-Za-z0-9_$]+)?\s*(?:from\s*)?["']([^"']+)["']/g;

/**
 * The named imports of every fenced block, in source order. Prose is ignored:
 * a sentence may name a module, but it is not something a reader copies.
 * Default and namespace imports are not checked because no page uses one to
 * reach a named export; a namespace import is still returned so the specifier
 * is resolved.
 */
export const importsInCodeFences = (
  markdown: string,
): ReadonlyArray<CodeImport> =>
  [...markdown.matchAll(fence)].flatMap((block) => {
    const body = block[1] ?? "";
    return [...body.matchAll(statement)].flatMap((match) => {
      const specifier = match[2];
      if (specifier === undefined) return [];
      const names = (match[1] ?? "").split(",").flatMap((part) => {
        const name = part
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/)[0];
        return name !== undefined && /^[A-Za-z0-9_$]+$/.test(name)
          ? [name]
          : [];
      });
      return [{ specifier, names }];
    });
  });

const declarations =
  /export\s+(?:async\s+)?(?:function|const|let|var|class|type|interface|enum)\s+([A-Za-z0-9_$]+)/g;
const lists = /export\s+(?:type\s+)?\{([^}]+)\}/g;
const namespaces = /export\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from/g;
const stars = /export\s+\*\s+from\s+["']([^"']+)["']/g;

/** The names one source file declares, without following re-exports. */
export const directExports = (source: string): ReadonlySet<string> => {
  const names = new Set<string>();
  for (const match of source.matchAll(declarations)) {
    if (match[1] !== undefined) names.add(match[1]);
  }
  for (const match of source.matchAll(lists)) {
    for (const part of (match[1] ?? "").split(",")) {
      const name = part.trim().split(/\s+as\s+/)[1] ?? part.trim();
      if (/^[A-Za-z0-9_$]+$/.test(name)) names.add(name);
    }
  }
  for (const match of source.matchAll(namespaces)) {
    if (match[1] !== undefined) names.add(match[1]);
  }
  if (/export\s+default\b/.test(source)) names.add("default");
  return names;
};

const resolveRelative = (from: string, specifier: string): string | null => {
  const base = join(dirname(from), specifier.replace(/\.js$/, ""));
  return (
    [
      `${base}.tsx`,
      `${base}.ts`,
      join(base, "index.tsx"),
      join(base, "index.ts"),
    ]
      .filter(existsSync)
      .at(0) ?? null
  );
};

/**
 * Every name a module exports, following `export * from` recursively so a
 * barrel such as `packages/components/src/index.ts` answers for its parts.
 * `visited` terminates a cycle; a missing re-export target contributes nothing
 * (the module-resolution check in the test reports the broken specifier).
 */
export const exportsOfModule = (
  file: string,
  visited: ReadonlySet<string> = new Set(),
): ReadonlySet<string> => {
  if (visited.has(file) || !existsSync(file)) return new Set();
  const next = new Set([...visited, file]);
  const source = readFileSync(file, "utf8");
  const names = new Set(directExports(source));
  for (const match of source.matchAll(stars)) {
    const target =
      match[1] === undefined ? null : resolveRelative(file, match[1]);
    if (target === null) continue;
    for (const name of exportsOfModule(target, next)) names.add(name);
  }
  return names;
};
