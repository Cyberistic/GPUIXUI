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

const entryArg = (): Option.Option<string> => {
  const index = process.argv.indexOf("--entry");
  return Option.map(
    Option.fromNullishOr(index === -1 ? undefined : process.argv[index + 1]),
    (value) => fileURLToPath(new URL(`../${value}`, import.meta.url)),
  );
};

const entry = Option.getOrElse(entryArg(), () =>
  fileURLToPath(new URL("../src/index.ts", import.meta.url)),
);
const surface = measurePackageSurface(entry);
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(surface, null, 2));
} else {
  report(surface);
}
if (process.argv.includes("--import") && !measureImport()) process.exitCode = 1;
