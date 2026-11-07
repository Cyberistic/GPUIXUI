import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

const CLOSED_SET = [
  "aria-label",
  "aria-description",
  "aria-id",
  "aria-expanded",
  "aria-selected",
  "aria-valuetext",
  "aria-level",
] as const;

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const isSource = (entry: string): boolean =>
  (Str.endsWith(".ts")(entry) || Str.endsWith(".tsx")(entry)) &&
  !Str.endsWith(".test.ts")(entry) &&
  !Str.endsWith(".test.tsx")(entry);

const sourceFiles = (): ReadonlyArray<readonly [string, string]> =>
  Arr.map(
    Arr.filter(
      readdirSync(new URL("../", import.meta.url), {
        recursive: true,
        encoding: "utf8",
      }),
      isSource,
    ),
    (entry) => [entry, read(`../${entry}`)] as const,
  );

const written = (source: string): ReadonlyArray<string> =>
  Arr.appendAll(
    Arr.map(
      Arr.fromIterable(source.matchAll(/aria-[a-z-]+(?==)/g)),
      (match) => match[0],
    ),
    Arr.map(
      Arr.fromIterable(source.matchAll(/"aria-[a-z-]+"(?=\s*:)/g)),
      (match) => Str.replaceAll('"', "")(match[1] ?? match[0]),
    ),
  );

describe("the aria set the grid writes", () => {
  it("writes only the attributes the runtime carries", () => {
    const offenders = Arr.flatMap(sourceFiles(), ([path, source]) =>
      Arr.filter(
        written(source),
        (name) => !Arr.contains(CLOSED_SET, name),
      ).map((name) => `${path}: ${name}`),
    );

    expect(offenders).toEqual([]);
  });

  it("is still the closed set the capability record publishes", () => {
    const record = readFileSync(
      new URL("../../../../docs/gpuix-capabilities.md", import.meta.url),
      "utf8",
    );
    const found = Arr.findFirst(Arr.fromIterable(record.split("\n")), (line) =>
      line.startsWith("| `role` and the `aria-*` subset"),
    );
    const row = Option.match(found, {
      onNone: () => "",
      onSome: (line) => line,
    });

    expect(row).not.toBe("");
    Arr.forEach(CLOSED_SET, (name) => {
      expect(row).toContain(`\`${name}\``);
    });
  });
});
