/**
 * Packaging checks for the published subpaths.
 *
 * Guards the plan 336 bug: `docs/field.mdx` documents
 * `@gpuixui/components/validation/logic`, but the `./*` export maps it to
 * `src/validation/logic.tsx` while the module is `.ts`, so a consumer following
 * the docs gets `ERR_MODULE_NOT_FOUND`. The second check guards the same class
 * of drift at the package root: a public module that never reaches
 * `src/index.ts`.
 *
 * `node:fs` is test-time only, like `inventory.test.ts`; no runtime source
 * imports it.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as Result from "effect/Result";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);
const srcRoot = new URL("src/", packageRoot);

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8");

const sorted = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.sort(values, Order.String);

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

  it("re-exports every public module from the package root", () => {
    const index = read("src/index.ts");
    const modules = Arr.filter(
      readdirSync(fileURLToPath(srcRoot)),
      (file) =>
        file.endsWith(".tsx") &&
        !file.endsWith(".test.tsx") &&
        file !== "index.tsx",
    );
    const missing = Arr.map(
      Arr.filter(
        modules,
        (file) => !index.includes(`export * from "./${file.slice(0, -4)}.js"`),
      ),
      (file) => file.slice(0, -4),
    );

    expect(sorted(missing)).toEqual([]);
  });
});
