/**
 * The manifest check: what the package imports is what the package declares.
 *
 * Guards the plan 338 gap — nothing tied `packages/components/package.json` to
 * the source. A component could import a package no consumer installs (and no
 * `nub install` provides), or reach across a boundary (`apps/*`, a specialised
 * package, `react-dom`) and every gate would stay green. The boundary itself is
 * plan 110 §2.
 *
 * `node:fs` is test-time only, like `inventory.test.ts`; no runtime source
 * imports it.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);
const srcRoot = fileURLToPath(new URL("src/", packageRoot));

const Manifest = Schema.Struct({
  dependencies: Schema.Record(Schema.String, Schema.String),
  peerDependencies: Schema.Record(Schema.String, Schema.String),
});

/** The packages a consumer of this package will actually have. */
const declared = (): ReadonlyArray<string> => {
  const manifest = Schema.decodeUnknownSync(Schema.fromJsonString(Manifest))(
    readFileSync(fileURLToPath(new URL("package.json", packageRoot)), "utf8"),
  );
  return [
    ...R.keys(manifest.dependencies),
    ...R.keys(manifest.peerDependencies),
  ];
};

/** A package name from a bare specifier: `@scope/name` or `name`. */
const packageName = (specifier: string): string =>
  specifier.startsWith("@")
    ? Arr.join(Arr.take(specifier.split("/"), 2), "/")
    : (specifier.split("/")[0] ?? specifier);

/** The runtime source files: everything under `src/` that is not a test or harness. */
const sources = (): ReadonlyArray<string> => {
  const files = Arr.filter(
    readdirSync(srcRoot, { recursive: true, withFileTypes: true }),
    (entry) =>
      entry.isFile() &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.includes(".test.") &&
      !entry.parentPath.includes("/src/behaviour") &&
      !entry.parentPath.includes("/src/perf"),
  );
  return Arr.map(files, (entry) => `${entry.parentPath}/${entry.name}`);
};

/** Every module specifier one source file imports. */
const importsOf = (file: string): ReadonlyArray<string> => {
  const source = readFileSync(file, "utf8");
  return [
    ...Arr.fromIterable(
      source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g),
    ),
    ...Arr.fromIterable(source.matchAll(/^\s*import\s+["']([^"']+)["']/gm)),
  ].map((match) => match[1] ?? "");
};

const bareImports = (): ReadonlyArray<string> =>
  Arr.dedupe(
    Arr.filter(
      Arr.flatMap(sources(), importsOf),
      (specifier) => specifier !== "" && !specifier.startsWith("."),
    ),
  );

const sorted = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.sort(values, Order.String);

describe("manifest", () => {
  it("declares every package the runtime imports", () => {
    const available = declared();
    const undeclared = Arr.filter(
      bareImports(),
      (specifier) => !Arr.contains(packageName(specifier))(available),
    );

    expect(sorted(undeclared)).toEqual([]);
  });

  it("keeps node built-ins out of runtime source", () => {
    const builtins = Arr.filter(bareImports(), (specifier) =>
      specifier.startsWith("node:"),
    );

    expect(sorted(builtins)).toEqual([]);
  });

  it("imports nothing across the package boundary", () => {
    const forbidden = Arr.filter(
      bareImports(),
      (specifier) =>
        specifier.startsWith("apps/") ||
        specifier === "react-dom" ||
        ["@gpuixui/data-grid", "@gpuixui/docking", "@gpuixui/editor"].some(
          (name) => packageName(specifier) === name,
        ),
    );

    expect(sorted(forbidden)).toEqual([]);
  });
});
