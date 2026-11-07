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

interface DocumentedImport {
  readonly page: string;
  readonly specifier: string;
  readonly names: ReadonlyArray<string>;
}

const IMPORT =
  /import\s+(\{[^}]*\}|\w+)\s+from\s+"(@gpuixui\/components\/[^"]+)"/g;

const NAME =
  /(?:^|,)\s*(?:type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?/g;

const importedNames = (clause: string): ReadonlyArray<string> =>
  Arr.fromIterable(
    pipe(clause, Str.replace(/[{}]/g, ""), (source) => source.matchAll(NAME)),
  ).flatMap((match) =>
    (match[2] ?? match[1] !== undefined) ? [match[2] ?? match[1] ?? ""] : [],
  );

const pages: ReadonlyArray<string> = Arr.filter(
  readdirSync(fileURLToPath(docsRoot)),
  (file) => file.endsWith(".mdx"),
);

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

const Manifest = Schema.Struct({
  exports: Schema.Record(Schema.String, Schema.String),
});

const { exports: exportsTargets } = Schema.decodeUnknownSync(
  Schema.fromJsonString(Manifest),
)(readFileSync(new URL("package.json", packageRoot), "utf8"));

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

interface ResolvedImport extends DocumentedImport {
  readonly target: string;
  readonly path: string;
}

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
