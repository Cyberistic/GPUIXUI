import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const PACKAGES: ReadonlyArray<{ readonly name: string; readonly root: URL }> = [
  { name: "components", root: new URL("../", import.meta.url) },
  { name: "editor", root: new URL("../../editor/", import.meta.url) },
  { name: "media", root: new URL("../../media/", import.meta.url) },
];

const text = (root: URL, file: string): string =>
  readFileSync(fileURLToPath(new URL(file, root)), "utf8");

const jsxRuntime = (config: string): Option.Option<string> =>
  Option.fromNullishOr(/^\s*"jsxImportSource":\s*"([^"]+)"/m.exec(config)?.[1]);

const pinnedRuntime = (source: string): Option.Option<string> =>
  Option.flatMap(Arr.head(Str.split("\n")(source)), (line) =>
    Option.fromNullishOr(
      /^\/\*\* @jsxImportSource (\S+) \*\/$/.exec(line)?.[1],
    ),
  );

const publishedTsx = (root: URL): ReadonlyArray<string> =>
  Arr.flatMap(["src", "examples"], (tree) =>
    Arr.filter(
      readdirSync(fileURLToPath(new URL(`${tree}/`, root)), {
        recursive: true,
        encoding: "utf8",
      }).map((file) => `${tree}/${file}`),
      (file) => Str.endsWith(".tsx")(file) && !Str.endsWith(".test.tsx")(file),
    ),
  );

const pinFault = (
  root: URL,
  file: string,
  runtime: string,
): Result.Result<string, void> =>
  Option.match(pinnedRuntime(text(root, file)), {
    onNone: () => Result.succeed(`${file}: pins no JSX runtime`),
    onSome: (name) =>
      name === runtime
        ? Result.failVoid
        : Result.succeed(`${file}: pins ${name}, not ${runtime}`),
  });

describe("the JSX runtime a published file is written for", () => {
  it("pins every published file to the runtime its package compiles with", () => {
    const faults = Arr.flatMap(PACKAGES, ({ name, root }) =>
      Option.match(jsxRuntime(text(root, "tsconfig.json")), {
        onNone: () => [`${name}: tsconfig declares no jsxImportSource`],
        onSome: (runtime) =>
          Arr.filterMap(publishedTsx(root), (file) =>
            pinFault(root, file, runtime),
          ),
      }),
    );
    expect(faults).toEqual([]);
  });

  it("walks the published files of all three packages", () => {
    expect(
      Arr.map(PACKAGES, ({ root }) => publishedTsx(root).length > 0),
    ).toEqual([true, true, true]);
  });

  it("reads the pragma only off the first line", () => {
    expect(
      pinnedRuntime("/** @jsxImportSource @gpuix/react */\nimport x;"),
    ).toEqual(Option.some("@gpuix/react"));
    expect(
      pinnedRuntime("import x;\n/** @jsxImportSource @gpuix/react */"),
    ).toEqual(Option.none());
    expect(pinnedRuntime("import x;")).toEqual(Option.none());
  });
});
