import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);

const roots = ["src", "examples"] as const;

const text = (file: string): string =>
  readFileSync(fileURLToPath(new URL(file, root)), "utf8");

const jsxRuntime = (config: string): Option.Option<string> =>
  Option.fromNullishOr(/^\s*"jsxImportSource":\s*"([^"]+)"/m.exec(config)?.[1]);

const pinnedRuntime = (source: string): Option.Option<string> =>
  Option.flatMap(Arr.head(source.split("\n")), (line) =>
    Option.fromNullishOr(
      /^\/\*\* @jsxImportSource (\S+) \*\/$/.exec(line)?.[1],
    ),
  );

const publishedTsx = (tree: string): ReadonlyArray<string> =>
  Arr.filter(
    readdirSync(fileURLToPath(new URL(`${tree}/`, root)), {
      recursive: true,
      encoding: "utf8",
    }),
    (file) => Str.endsWith(".tsx")(file) && !Str.endsWith(".test.tsx")(file),
  );

const files = (): ReadonlyArray<readonly [string, string]> =>
  Arr.flatMap(roots, (tree) =>
    Arr.map(publishedTsx(tree), (file) => [tree, file] as const),
  );

const pinFault = (
  name: string,
  source: string,
  runtime: string,
): Result.Result<string, void> =>
  Option.match(pinnedRuntime(source), {
    onNone: () => Result.succeed(`${name}: pins no JSX runtime`),
    onSome: (pinned) =>
      pinned === runtime
        ? Result.failVoid
        : Result.succeed(`${name}: pins ${pinned}, not ${runtime}`),
  });

describe("the JSX runtime a published file is written for", () => {
  it("pins every published file to the runtime the package compiles with", () => {
    const faults = Option.match(jsxRuntime(text("tsconfig.json")), {
      onNone: () => ["tsconfig declares no jsxImportSource"],
      onSome: (runtime) =>
        Arr.filterMap(files(), ([tree, file]) =>
          pinFault(`${tree}/${file}`, text(`${tree}/${file}`), runtime),
        ),
    });
    expect(faults).toEqual([]);
  });

  it("walks the two trees the package publishes", () => {
    expect(Arr.map(roots, (tree) => publishedTsx(tree).length > 0)).toEqual([
      true,
      true,
    ]);
    expect(files().length).toBeGreaterThan(30);
    expect(files()).toContainEqual(["src", "table/table.tsx"]);
    expect(files()).toContainEqual(["examples", "table.example.tsx"]);
  });

  it("reads the pragma only off the first line, and refuses another runtime", () => {
    expect(
      pinnedRuntime("/** @jsxImportSource @gpuix/react */\nimport x;"),
    ).toEqual(Option.some("@gpuix/react"));
    expect(pinnedRuntime("/** @jsxImportSource react */\nimport x;")).toEqual(
      Option.some("react"),
    );
    expect(
      pinnedRuntime("import x;\n/** @jsxImportSource @gpuix/react */"),
    ).toEqual(Option.none());
    expect(pinnedRuntime("import x;")).toEqual(Option.none());

    expect(
      pinFault(
        "probe.tsx",
        "/** @jsxImportSource react */\nimport x;",
        "@gpuix/react",
      ),
    ).toEqual(Result.succeed("probe.tsx: pins react, not @gpuix/react"));
    expect(pinFault("probe.tsx", "import x;", "@gpuix/react")).toEqual(
      Result.succeed("probe.tsx: pins no JSX runtime"),
    );
    expect(
      pinFault(
        "probe.tsx",
        "/** @jsxImportSource @gpuix/react */\n",
        "@gpuix/react",
      ),
    ).toEqual(Result.failVoid);
  });
});
