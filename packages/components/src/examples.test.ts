/**
 * The example registry's contract.
 *
 * `examples/index.ts` is the registry `apps/playground` mounts natively, and it
 * listed 24 of the 39 `*.example.tsx` files: every example the later Tier 2
 * waves landed was silently unplayable, while the docs pages (which read the
 * filesystem) kept listing all of them. Nothing failed, because no test read
 * the registry. This suite holds it to the directory in both directions: every
 * example file is registered under its own name, every entry names a file that
 * exists, and that file exports the symbol the entry imports.
 *
 * `node:fs` is a test-time repository read, the standing exception
 * `inventory.test.ts` records (plan 117 §3): no runtime module imports it.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const examplesDir = new URL("../examples/", import.meta.url);
const registry = readFileSync(
  fileURLToPath(new URL("index.ts", examplesDir)),
  "utf8",
);
const packageJson = readFileSync(
  fileURLToPath(new URL("../package.json", import.meta.url)),
  "utf8",
);

/** One registry row: the id, and the component symbol it maps to. */
interface Row {
  readonly id: string;
  readonly symbol: string;
}

const sorted = (ids: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.sort(ids, Order.String);

/** The id a file name stands for: `date-picker.example.tsx` → `date-picker`. */
const idOf = (file: string): string =>
  Str.replace(/\.example\.tsx$/, "")(file);

const lines = registry.split("\n");

/** `import { CardExample } from "./card.example.js";` */
const imported: ReadonlyArray<Row> = Arr.filterMap(lines, (line) => {
  const match =
    /^import \{ (\w+) \} from "\.\/([\w-]+)\.example\.js";$/.exec(line);
  if (match === null) return Result.failVoid;
  const [, symbol, id] = match;
  return symbol === undefined || id === undefined
    ? Result.failVoid
    : Result.succeed({ id, symbol });
});

/** `  card: CardExample,` or `  "date-picker": DatePickerExample,` */
const registered: ReadonlyArray<Row> = Arr.filterMap(lines, (line) => {
  const match = /^ {2}"?([\w-]+)"?: (\w+),$/.exec(line);
  if (match === null) return Result.failVoid;
  const [, id, symbol] = match;
  return id === undefined || symbol === undefined
    ? Result.failVoid
    : Result.succeed({ id, symbol });
});

const files = Arr.filter(readdirSync(examplesDir), Str.endsWith(".example.tsx"));
const ids = Arr.map(registered, (row) => row.id);

describe("the example registry", () => {
  it("registers every example file under its own name", () => {
    expect(sorted(ids)).toEqual(sorted(Arr.map(files, idOf)));
  });

  it("imports every registered id from the file of that name", () => {
    expect(sorted(Arr.map(imported, (row) => row.id))).toEqual(sorted(ids));
  });

  it("imports the symbol each entry registers", () => {
    Arr.forEach(registered, ({ id, symbol }) => {
      expect(imported).toContainEqual({ id, symbol });
    });
  });

  it("registers the symbol each example file exports", () => {
    Arr.forEach(registered, ({ id, symbol }) => {
      const source = readFileSync(
        fileURLToPath(new URL(`${id}.example.tsx`, examplesDir)),
        "utf8",
      );
      expect({ id, exports: source.includes(`export const ${symbol}`) }).toEqual(
        { id, exports: true },
      );
    });
  });

  it("registers each id once", () => {
    expect(Arr.length(Arr.dedupe(ids))).toBe(Arr.length(ids));
  });

  it("is published for the playground to import", () => {
    expect(packageJson).toContain('"./examples": "./examples/index.ts"');
  });
});
