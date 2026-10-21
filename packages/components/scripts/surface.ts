#!/usr/bin/env node
/**
 * Measure what `@gpuixui/components` costs to load.
 *
 *   nub run --filter @gpuixui/components measure:surface
 *   (cd packages/components && nub scripts/surface.ts --import)
 *
 * The first command prints the module graph the entry reaches; `--json` prints
 * the same measurement for a script to consume. `--import` adds the cold import
 * cost measured on this host: three fresh processes import the runtime alone and
 * three import the package entry, so the difference is the package's own surface
 * rather than the native binding every process pays for. It needs a supported
 * host, the same one `test:behaviour` needs, because the entry reaches
 * `@gpuix/react` and therefore the native binding.
 *
 * `src/surface.test.ts` is the gate; this command is how its budget is
 * regenerated and how the numbers in `README.md` were measured.
 *
 * Node's process API and `console` are deliberate here: this is a one-shot
 * repository report, not runtime code.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Str from "effect/String";
import type { Surface } from "../src/surface.js";
import { measurePackageSurface } from "./surface-io.js";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));

const kib = (bytes: number): string => `${Math.round(bytes / 1024)} KiB`;

const report = (surface: Surface): void => {
  const rows = Arr.map(
    surface.groups,
    (group) =>
      `${group.name.padEnd(24)} ${String(group.modules).padStart(3)} modules ${kib(group.bytes).padStart(9)}`,
  );
  const modules = Arr.length(surface.modules);
  const bytes = Arr.reduce(
    surface.modules,
    0,
    (total, module) => total + module.bytes,
  );
  console.log(rows.join("\n"));
  console.log(
    `${"total".padEnd(24)} ${String(modules).padStart(3)} modules ${kib(bytes).padStart(9)}`,
  );
  console.log(
    `direct imports: ${Arr.map(
      surface.dependencies,
      (entry) => `${entry.name} (${entry.imports})`,
    ).join(", ")}`,
  );
  for (const problem of Arr.appendAll(surface.unresolved, surface.unreadable)) {
    console.log(`problem: ${problem}`);
  }
};

const IMPORT = (specifier: string): string =>
  `const started = performance.now(); import(${JSON.stringify(specifier)}).then(() => console.log(Math.round(performance.now() - started)));`;

/** One cold import in a fresh process, in milliseconds. */
const coldImport = (specifier: string): Option.Option<number> => {
  const run = spawnSync("nub", ["-e", IMPORT(specifier)], {
    cwd: packageRoot,
    encoding: "utf8",
  });
  if (run.status !== 0) {
    console.error(run.stderr.trim() || run.stdout.trim());
    return Option.none();
  }
  const value = Number(Str.trim(run.stdout).split("\n").at(-1));
  return Number.isFinite(value) ? Option.some(value) : Option.none();
};

const median = (values: ReadonlyArray<number>): Option.Option<number> =>
  Arr.get(Arr.sort(values, Order.Number), Math.floor(Arr.length(values) / 2));

const RUNS = 3;

const samples = (specifier: string): ReadonlyArray<number> =>
  Arr.getSomes(Arr.makeBy(RUNS, () => coldImport(specifier)));

/** What a cold process pays, from the runtime alone to the whole barrel. */
const IMPORTS: ReadonlyArray<readonly [string, string]> = [
  ["runtime only", "@gpuix/react"],
  ["one family (badge)", "@gpuixui/components/badge"],
  ["the entry", "@gpuixui/components"],
];

const measureImport = (): boolean => {
  const measured = Arr.map(IMPORTS, ([label, specifier]) => ({
    label,
    values: samples(specifier),
  }));
  if (Arr.some(measured, (row) => Arr.length(row.values) === 0)) {
    console.error(
      "import cost: no sample. The entry reaches the native binding, so this needs a supported host (README §Commands).",
    );
    return false;
  }
  const lines = Arr.getSomes(
    Arr.map(measured, (row) =>
      Option.map(
        median(row.values),
        (value) => `${row.label}: ${value} ms (${row.values.join(", ")})`,
      ),
    ),
  );
  console.log(`\ncold import, ${RUNS} fresh processes each:`);
  console.log(lines.join("\n"));
  return true;
};

const surface = measurePackageSurface();
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(surface, null, 2));
} else {
  report(surface);
}
if (process.argv.includes("--import") && !measureImport()) process.exitCode = 1;
