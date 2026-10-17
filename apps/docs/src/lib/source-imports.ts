import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * The component page's dependency list, derived from the component's real entry
 * file (plan 428). This is a vitest-only boundary like `source-exports.ts`:
 * synchronous `fs`, `path` and a native `sort` are deliberate here because the
 * browser bundle never imports this module and must not pull in `effect`.
 */

/** Peer modules every component has, stated once by the page block instead. */
const peers: ReadonlySet<string> = new Set(["react", "@gpuix/react"]);

const isPeer = (specifier: string): boolean =>
  peers.has(specifier) || specifier.startsWith("react/");

/**
 * Every module specifier a source file imports or re-exports. Anchored to the
 * start of an `import` / `export` statement, so a `from "…"` inside a comment or
 * a string is not a dependency; multi-line import lists are read.
 */
export const importSpecifiers = (source: string): ReadonlyArray<string> =>
  [
    ...source.matchAll(
      /(?:^|\n)\s*(?:import|export)\s+(?:[^;]*?\sfrom\s*)?"([^"]+)"/g,
    ),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

/**
 * The non-relative modules a component needs at runtime: GPUix subpaths and
 * Effect modules. React and `@gpuix/react` are the package's peers and are
 * excluded so the page does not repeat them on every component.
 */
export const runtimeModules = (
  specifiers: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  specifiers.filter(
    (specifier) => !specifier.startsWith(".") && !isPeer(specifier),
  );

/**
 * Resolve a relative specifier to a repo-relative `.tsx`/`.ts` path, so a
 * caller can tell a composed component from a private helper. Returns `null`
 * when the target does not exist — a broken import is `tsc`'s failure, not a
 * dependency.
 */
export const resolveLocalModule = (
  from: string,
  specifier: string,
  root: string,
): string | null => {
  const base = join(dirname(from), specifier.replace(/\.js$/, ""));
  const candidates = [
    `${base}.tsx`,
    `${base}.ts`,
    join(base, "index.tsx"),
    join(base, "index.ts"),
  ];
  return candidates.find((path) => existsSync(join(root, path))) ?? null;
};

/**
 * The dependency list a record must carry: its entry file's runtime modules
 * plus the slug of every delivered record it imports. Sorted and deduplicated,
 * so the record and the derived list compare with `toEqual`.
 */
export const derivedDependencies = (
  sourcePath: string,
  root: string,
  slugBySourcePath: ReadonlyMap<string, string>,
): ReadonlyArray<string> => {
  const specifiers = importSpecifiers(
    readFileSync(join(root, sourcePath), "utf8"),
  );
  const composed = specifiers
    .filter((specifier) => specifier.startsWith("."))
    .flatMap((specifier) => {
      const resolved = resolveLocalModule(sourcePath, specifier, root);
      const slug =
        resolved === null ? undefined : slugBySourcePath.get(resolved);
      return slug === undefined ? [] : [slug];
    });
  return [...new Set([...runtimeModules(specifiers), ...composed])].sort();
};
