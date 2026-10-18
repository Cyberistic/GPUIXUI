/**
 * A package manifest must declare every module its source imports (plan `348`).
 *
 * `@gpuixui/primitives` and `@gpuixui/icons` both import `effect` at runtime —
 * `core/selection.ts` maps with `effect/Array`, `registry.ts` builds the icon
 * registry with `effect/Record` — but both manifests listed it only under
 * `devDependencies`. Inside the workspace that resolves anyway (the dev
 * dependency is hoisted); a consumer who installs the package gets no `effect`
 * and the first import fails. The docs site found the primitives half from the
 * manifests (its plan `428`); this guard covers both packages, because both are
 * owned by this workstream and the alternative is the same scanner twice
 * (precedent: `docs-theme-paths.test.ts`, plan `333`).
 */

import { Effect, FileSystem, Path, pipe } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import type { PlatformError } from "effect/PlatformError";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import * as Str from "effect/String";

/** The packages this workstream owns; both ship runtime `effect` imports. */
const PACKAGES = ["primitives", "icons"] as const;

/** The dependency maps a manifest may declare a runtime module in. */
class PackageManifest extends Schema.Class<PackageManifest>("PackageManifest")({
  dependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  peerDependencies: Schema.optional(
    Schema.Record(Schema.String, Schema.String),
  ),
}) {}

const decodeManifest = Schema.decodeUnknownEffect(
  Schema.fromJsonString(PackageManifest),
);

/** `from "x"` and side-effect `import "x"`. */
const SPECIFIER = /\b(?:from|import)\s+"([^"]+)"/g;

/** Comments mention specifiers in prose; only code is scanned. */
const COMMENTS = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;

/** A compiled source file, excluding the `.test` suites and test harnesses. */
const isShippedSource = (file: string): boolean =>
  /\.(ts|tsx)$/.test(file) &&
  !/\.test\.tsx?$/.test(file) &&
  !Arr.some(Str.split(file, "/"), (segment) => segment === "testing");

/** `@scope/pkg/sub` → `@scope/pkg`; `pkg/sub` → `pkg`; builtins and paths → none. */
const packageOf = (specifier: string): Option.Option<string> =>
  Str.startsWith(".")(specifier) || Str.startsWith("node:")(specifier)
    ? Option.none()
    : Str.startsWith("@")(specifier)
      ? Option.some(pipe(Str.split(specifier, "/"), Arr.take(2), Arr.join("/")))
      : Option.some(
          pipe(
            specifier,
            Str.split("/"),
            Arr.head,
            Option.getOrElse(() => specifier),
          ),
        );

/** Every file under a path, recursively. */
const filesUnder = (
  path: Path.Path,
  fs: FileSystem.FileSystem,
  root: string,
): Effect.Effect<ReadonlyArray<string>, PlatformError> =>
  Effect.gen(function* () {
    const info = yield* fs.stat(root);
    if (info.type === "File") return [root];
    const entries = yield* fs.readDirectory(root);
    const children = yield* Effect.forEach(
      entries,
      (entry) => filesUnder(path, fs, path.join(root, entry)),
      { concurrency: 8 },
    );
    return Arr.flatten(children);
  });

interface ScannedImport {
  readonly module: string;
  readonly file: string;
}

/** What one package declares, and every bare module its shipped source imports. */
interface Scan {
  readonly declared: ReadonlyArray<string>;
  readonly imports: ReadonlyArray<ScannedImport>;
}

const scanPackage = (
  name: string,
): Effect.Effect<Scan, PlatformError | Schema.SchemaError> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    const directory = path.join(
      import.meta.dirname,
      "..",
      "..",
      "..",
      "packages",
      name,
    );
    const manifest = yield* decodeManifest(
      yield* fs.readFileString(path.join(directory, "package.json")),
    );
    const declared = pipe(
      Arr.appendAll(
        R.keys(manifest.dependencies ?? {}),
        R.keys(manifest.peerDependencies ?? {}),
      ),
      Arr.dedupe,
    );

    const files = yield* filesUnder(path, fs, path.join(directory, "src"));
    const shipped = Arr.filter(files, isShippedSource);
    const imports = yield* Effect.forEach(
      shipped,
      (file) =>
        Effect.map(fs.readFileString(file), (text) =>
          pipe(
            text,
            Str.replace(COMMENTS, ""),
            (code) => Arr.fromIterable(code.matchAll(SPECIFIER)),
            Arr.map((match) => Option.fromNullishOr(match[1])),
            Arr.getSomes,
            Arr.map((specifier) =>
              Option.map(packageOf(specifier), (module) => ({
                module,
                file: path.relative(directory, file),
              })),
            ),
            Arr.getSomes,
          ),
        ),
      { concurrency: 8 },
    );

    return { declared, imports: Arr.flatten(imports) };
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

describe("package manifests", () => {
  it.each(PACKAGES)(
    "@gpuixui/%s declares every module its shipped source imports",
    async (name) => {
      const { declared, imports } = await Effect.runPromise(scanPackage(name));
      const undeclared = pipe(
        imports,
        Arr.filter((entry) => !Arr.contains(declared, entry.module)),
        Arr.map((entry) => `${name}: ${entry.module} (${entry.file})`),
        Arr.dedupe,
        (entries) => Arr.sort(entries, Order.String),
      );
      expect(undeclared).toStrictEqual([]);
    },
  );

  it("scans the real imports of both packages", async () => {
    const scans = await Effect.runPromise(
      Effect.forEach(
        PACKAGES,
        (name) => Effect.map(scanPackage(name), (scan) => ({ name, ...scan })),
        { concurrency: 2 },
      ),
    );
    const total = Arr.reduce(
      scans,
      0,
      (sum, scan) => sum + scan.imports.length,
    );
    expect(total).toBeGreaterThan(50);
    Arr.forEach(scans, (scan) => {
      expect(
        Arr.filter(scan.imports, (entry) => entry.module === "effect").length,
      ).toBeGreaterThan(0);
      expect(
        Arr.filter(scan.imports, (entry) => entry.module === "@gpuixui/tokens")
          .length,
      ).toBeGreaterThan(0);
    });
  });
});
