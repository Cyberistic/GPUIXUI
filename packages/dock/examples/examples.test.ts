/**
 * The example registry's contract.
 *
 * The bugs these guard: an example file that no registry entry mounts (so the
 * screen a reader copies has never run), a registry entry with no file, and an
 * entry importing a symbol its file does not export.
 *
 * `node:fs` is a test-time repository read, the standing exception the data
 * package's own registry suite records: no runtime module here imports it.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const examplesDir = new URL("./", import.meta.url);
const registry = readFileSync(
  fileURLToPath(new URL("index.ts", examplesDir)),
  "utf8",
);

interface Row {
  readonly id: string;
  readonly symbol: string;
}

const sorted = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.sort(values, Order.String);

const idOf = (file: string): string => Str.replace(/\.example\.tsx$/, "")(file);

const imported: ReadonlyArray<Row> = Arr.filterMap(
  registry.split("\n"),
  (line) => {
    const match = /^import \{ (\w+) \} from "\.\/([\w-]+)\.example\.js";$/.exec(
      line,
    );
    if (match === null) return Result.failVoid;
    const [, symbol, id] = match;
    return symbol === undefined || id === undefined
      ? Result.failVoid
      : Result.succeed({ id, symbol });
  },
);

const registered: ReadonlyArray<string> = Arr.filterMap(
  registry.split("\n"),
  (line) => {
    const match = /^  "?([\w-]+)"?: \w+,$/.exec(line);
    return match === null || match[1] === undefined
      ? Result.failVoid
      : Result.succeed(match[1]);
  },
);

const files: ReadonlyArray<string> = Arr.filter(
  readdirSync(examplesDir),
  (name) => name.endsWith(".example.tsx"),
);

describe("the example registry", () => {
  it("registers every example file under its own name", () => {
    expect(sorted(registered)).toEqual(sorted(Arr.map(files, idOf)));
  });

  it("imports one symbol from every entry's file", () => {
    expect(sorted(Arr.map(imported, (row) => row.id))).toEqual(
      sorted(Arr.map(files, idOf)),
    );
  });

  it("names an exported symbol in every registered file", () => {
    const missing = Arr.filterMap(imported, (row) => {
      const source = readFileSync(
        fileURLToPath(new URL(`${row.id}.example.tsx`, examplesDir)),
        "utf8",
      );
      return source.includes(`export const ${row.symbol}`)
        ? Result.failVoid
        : Result.succeed(`${row.id}: ${row.symbol}`);
    });
    expect(missing).toEqual([]);
  });
});
