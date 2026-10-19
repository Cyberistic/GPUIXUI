/**
 * Packaging checks for the published subpaths.
 *
 * Guards the plan 336 bug: `docs/field.mdx` documents
 * `@gpuixui/components/validation/logic`, but the `./*` export maps it to
 * `src/validation/logic.tsx` while the module is `.ts`, so a consumer following
 * the docs gets `ERR_MODULE_NOT_FOUND`.
 *
 * Plan 338 added the rest: the `./*` wildcard made `internal/button`,
 * `menu/item` and even `runtime.test` importable, and mapped `.ts` modules to a
 * non-existent `.tsx`, so the package had no enumerable public surface. The
 * checks below hold the explicit map to the source: every target exists, every
 * public module has one entry, and nothing private is addressable. The last
 * check guards the same class of drift at the package root: a public module that
 * never reaches `src/index.ts`.
 *
 * `node:fs` is test-time only, like `inventory.test.ts`; no runtime source
 * imports it.
 *
 * Plan 380 added the last check: the JSX-runtime shim that makes the package
 * loadable from source (`src/internal/jsx-runtime.ts`) carries a copy of the
 * installed declaration's intrinsic map, and that copy must not drift.
 *
 * Plan 676 adds the load itself: every specifier the export map publishes is
 * imported through the package name, because a target that exists can still
 * throw at import time (a broken top-level import, a missing conditional
 * export, a circular initialisation).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);
const srcRoot = new URL("src/", packageRoot);

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8");

const sorted = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.sort(values, Order.String);

const Manifest = Schema.Struct({
  exports: Schema.Record(Schema.String, Schema.String),
});

/** The package's export map, decoded rather than read through `any`. */
const exportsMap = (): Readonly<Record<string, string>> =>
  Schema.decodeUnknownSync(Schema.fromJsonString(Manifest))(
    read("package.json"),
  ).exports;

/** Every `@gpuixui/components/...` specifier the docs or examples show. */
const documentedSpecifiers = (): ReadonlyArray<string> => {
  const files = [
    ...Arr.map(
      readdirSync(fileURLToPath(new URL("docs/", packageRoot))),
      (file) => `docs/${file}`,
    ),
    ...Arr.map(
      Arr.filter(
        readdirSync(fileURLToPath(new URL("examples/", packageRoot))),
        (file) => file.endsWith(".example.tsx"),
      ),
      (file) => `examples/${file}`,
    ),
  ];
  return sorted(
    Arr.dedupe(
      Arr.flatMap(files, (file) =>
        Arr.map(
          Arr.fromIterable(
            read(file).matchAll(/@gpuixui\/components(?:\/[\w/-]+)?/g),
          ),
          (match) => match[0],
        ),
      ),
    ),
  );
};

/** Every specifier the export map publishes, through the package name. */
const publishedSpecifiers = (): ReadonlyArray<string> =>
  sorted(
    Arr.map(Object.keys(exportsMap()), (key) =>
      key === "."
        ? "@gpuixui/components"
        : `@gpuixui/components/${key.slice(2)}`,
    ),
  );

/** `None` when `specifier` loads, `Some` with the reason when it does not. */
const loadFailure = (specifier: string): Effect.Effect<Option.Option<string>> =>
  Effect.tryPromise({
    try: () => import(specifier),
    catch: (cause) => `${specifier}: ${String(cause)}`,
  }).pipe(
    Effect.match({
      onFailure: (message) => Option.some(message),
      onSuccess: () => Option.none<string>(),
    }),
  );

/** The public modules: the `src/*.tsx` files that are not tests. */
const publicModules = (): ReadonlyArray<string> =>
  sorted(
    Arr.map(
      Arr.filter(
        readdirSync(fileURLToPath(srcRoot)),
        (file) =>
          file.endsWith(".tsx") &&
          !file.endsWith(".test.tsx") &&
          file !== "index.tsx",
      ),
      (file) => file.slice(0, -".tsx".length),
    ),
  );

/** A target the package is allowed to publish: the root, a root module, or the one logic module. */
const isPublicTarget = (target: string): boolean =>
  target === "./src/index.ts" ||
  target === "./src/validation/logic.ts" ||
  (/^\.\/src\/[^/]+\.tsx$/.test(target) && !target.includes(".test."));

/** The entries of an `interface IntrinsicElements { ... }` block, normalised. */
const intrinsicEntries = (text: string): ReadonlyArray<string> =>
  Arr.map(
    Arr.filter(
      Arr.map(
        (
          /interface IntrinsicElements \{([\s\S]*?)\n\}/.exec(text)?.[1] ?? ""
        ).split("\n"),
        (line) => line.trim().replace(/;$/, ""),
      ),
      (line) => line.length > 0,
    ),
    (line) => line,
  );

/** The JSX-runtime shim pairs, with the declaration each one mirrors. */
const jsxRuntimePairs: ReadonlyArray<readonly [string, string]> = [
  ["node_modules/@gpuix/react/jsx-runtime.d.ts", "src/internal/jsx-runtime.ts"],
  [
    "node_modules/@gpuix/react/jsx-dev-runtime.d.ts",
    "src/internal/jsx-dev-runtime.ts",
  ],
];

describe("package exports", () => {
  it("resolves every documented subpath to a file that exists", () => {
    const problems = Arr.filterMap(documentedSpecifiers(), (specifier) => {
      const resolved = fileURLToPath(import.meta.resolve(specifier));
      return existsSync(resolved)
        ? Result.failVoid
        : Result.succeed(`${specifier} -> ${resolved}`);
    });

    expect(sorted(problems)).toEqual([]);
  });

  it("loads every published entry point", async () => {
    // The test harness is the runtime boundary (EF-21).
    const failures = await Effect.runPromise(
      Effect.map(
        Effect.forEach(publishedSpecifiers(), loadFailure, {
          concurrency: "unbounded",
        }),
        Arr.getSomes,
      ),
    );

    expect(failures).toEqual([]);
  });

  it("points every export at a file that exists", () => {
    const problems = Arr.filterMap(
      Object.entries(exportsMap()),
      ([key, target]) => {
        const resolved = fileURLToPath(new URL(target, packageRoot));
        return existsSync(resolved)
          ? Result.failVoid
          : Result.succeed(`${key} -> ${target}`);
      },
    );

    expect(sorted(problems)).toEqual([]);
  });

  it("gives every public module exactly one export entry", () => {
    const exports = exportsMap();
    const missing = Arr.filter(
      publicModules(),
      (stem) => exports[`./${stem}`] !== `./src/${stem}.tsx`,
    );

    expect(sorted(missing)).toEqual([]);
  });

  it("publishes no internal module, test module or undocumented deep path", () => {
    const privateTargets = Arr.filter(
      Arr.map(Object.entries(exportsMap()), ([key, target]) => ({
        key,
        target,
      })),
      ({ target }) => !isPublicTarget(target),
    );

    expect(privateTargets).toEqual([]);
  });

  it("refuses to resolve an internal, test or missing deep path", () => {
    const privateSpecifiers = [
      "@gpuixui/components/internal/button",
      "@gpuixui/components/menu/item",
      "@gpuixui/components/runtime.test",
      "@gpuixui/components/toast/store",
    ];
    const resolvable = Arr.filter(privateSpecifiers, (specifier) => {
      try {
        import.meta.resolve(specifier);
        return true;
      } catch {
        return false;
      }
    });

    expect(resolvable).toEqual([]);
  });

  it("re-exports every public module from the package root", () => {
    const index = read("src/index.ts");
    const missing = Arr.filter(
      publicModules(),
      (stem) => !index.includes(`export * from "./${stem}.js"`),
    );

    expect(sorted(missing)).toEqual([]);
  });

  it("keeps the JSX runtime shim level with the installed declaration", () => {
    const drifted = Arr.filterMap(jsxRuntimePairs, ([declaration, shim]) => {
      const expected = intrinsicEntries(read(declaration));
      const actual = intrinsicEntries(read(shim));
      const same =
        Arr.length(expected) === Arr.length(actual) &&
        Arr.every(Arr.zip(expected, actual), ([left, right]) => left === right);
      return same
        ? Result.failVoid
        : Result.succeed(`${shim} differs from ${declaration}`);
    });

    expect(drifted).toEqual([]);
  });
});
