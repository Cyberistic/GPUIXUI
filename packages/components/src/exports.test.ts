/**
 * Every import a docs page shows must actually resolve.
 *
 * The bug this guards: `docs/field.mdx` told a reader to write
 * `import { validate } from "@gpuixui/components/validation/logic"`, but the
 * package's exports map only had `"./*": "./src/*.tsx"`, so that specifier
 * pointed at `src/validation/logic.tsx` — a file that has never existed. A
 * consumer copying the snippet got a module-not-found error, and nothing in the
 * suite noticed because no test read a documented specifier.
 *
 * The check runs the contract a consumer runs: it resolves each
 * `@gpuixui/components/...` specifier through the package's real `exports` map,
 * loads the resolved file, and asserts every name the snippet imports is
 * exported. A moved module, a renamed part or an unwritable subpath fails it.
 *
 * `node:fs` is a test-time repository check, the same standing exception
 * `inventory.test.ts` records (plan 117 §3): no runtime module imports it.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);
const docsRoot = new URL("../docs/", import.meta.url);

/** One `import { … } from "@gpuixui/components/x"` a docs page shows. */
interface DocumentedImport {
  readonly page: string;
  readonly specifier: string;
  readonly names: ReadonlyArray<string>;
}

/** `import { A, B as C } from "…"`, or `import Thing from "…"`. */
const IMPORT =
  /import\s+(\{[^}]*\}|\w+)\s+from\s+"(@gpuixui\/components\/[^"]+)"/g;

/**
 * `{ A, B as C }` → `A`, `C`; a default import → its identifier. The local name
 * is what has to exist on the module, so an alias takes the alias.
 */
const NAME =
  /(?:^|,)\s*(?:type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?/g;

const importedNames = (clause: string): ReadonlyArray<string> =>
  Arr.fromIterable(
    pipe(clause, Str.replace(/[{}]/g, ""), (source) => source.matchAll(NAME)),
  ).flatMap((match) =>
    (match[2] ?? match[1] !== undefined) ? [match[2] ?? match[1] ?? ""] : [],
  );

/** The docs pages, in directory order. */
const pages: ReadonlyArray<string> = Arr.filter(
  readdirSync(fileURLToPath(docsRoot)),
  (file) => file.endsWith(".mdx"),
);

/** The imports one page shows. */
const importsIn = (page: string): ReadonlyArray<DocumentedImport> => {
  const source = readFileSync(new URL(page, docsRoot), "utf8");
  const matches: ReadonlyArray<RegExpMatchArray> = Arr.fromIterable(
    source.matchAll(IMPORT),
  );
  return Arr.map(matches, (match) => ({
    page,
    specifier: match[2] ?? "",
    names: importedNames(match[1] ?? ""),
  }));
};

const documentedImports: ReadonlyArray<DocumentedImport> = Arr.flatMap(
  pages,
  importsIn,
);

/** A package manifest as this check reads it: the export map's targets. */
const Manifest = Schema.Struct({
  exports: Schema.Record(Schema.String, Schema.String),
});

/** The `exports` targets the map declares, keyed by subpath. */
const { exports: exportsTargets } = Schema.decodeUnknownSync(
  Schema.fromJsonString(Manifest),
)(readFileSync(new URL("package.json", packageRoot), "utf8"));

/** The file a documented specifier resolves to, `None` when no key matches. */
const resolveSpecifier = (
  specifier: string,
): Option.Option<{ readonly target: string; readonly path: string }> => {
  const subpath = `./${specifier.replace("@gpuixui/components/", "")}`;
  const exact = Option.fromNullishOr(exportsTargets[subpath]);
  const pattern = Option.map(
    Option.fromNullishOr(exportsTargets["./*"]),
    (value) => value.replace("*", subpath.replace("./", "")),
  );
  return Option.map(
    Option.orElse(exact, () => pattern),
    (target) => ({
      target,
      path: fileURLToPath(new URL(target, packageRoot)),
    }),
  );
};

/** One documented import with the file its specifier must point at. */
interface ResolvedImport extends DocumentedImport {
  readonly target: string;
  readonly path: string;
}

/** Every documented specifier and the file it must point at. */
const resolved: ReadonlyArray<ResolvedImport> = Arr.getSomes(
  Arr.map(documentedImports, ({ page, specifier }) =>
    Option.map(resolveSpecifier(specifier), (found) => ({
      page,
      specifier,
      names: [],
      ...found,
    })),
  ),
);

describe("documented imports", () => {
  it("finds the documentation's imports, so the checks below are not vacuous", () => {
    expect(Arr.length(documentedImports)).toBeGreaterThan(20);
    expect(Arr.length(resolved)).toBe(Arr.length(documentedImports));
  });

  it("resolves every documented specifier to a file that exists", () => {
    const missing = Arr.getSomes(
      Arr.map(documentedImports, ({ page, specifier }) =>
        Option.match(resolveSpecifier(specifier), {
          onNone: () => Option.some(`${page}: ${specifier} matches no export`),
          onSome: ({ target, path }) =>
            existsSync(path)
              ? Option.none()
              : Option.some(
                  `${page}: ${specifier} -> ${target} does not exist`,
                ),
        }),
      ),
    );

    expect(missing).toEqual([]);
  });

  it("loads every documented module and exports the names the page imports", async () => {
    const paths = Arr.dedupe(Arr.map(resolved, ({ path }) => path));
    const problems = await Promise.all(
      Arr.map(paths, async (path) => {
        // Import by file URL: the resolved file, not the specifier, so a broken
        // exports pattern cannot hide behind the test's own resolution.
        const loaded: Readonly<Record<string, unknown>> = await import(
          pathToFileURL(path).href
        );
        const imports = Arr.filter(documentedImports, ({ specifier }) =>
          Option.match(resolveSpecifier(specifier), {
            onNone: () => false,
            onSome: (found) => found.path === path,
          }),
        );
        return Arr.flatMap(imports, ({ page, specifier, names }) =>
          Arr.filter(names, (name) => !(name in loaded)).map(
            (name) => `${page}: ${specifier} does not export ${name}`,
          ),
        );
      }),
    );

    expect(problems.flat()).toEqual([]);
  });
});
