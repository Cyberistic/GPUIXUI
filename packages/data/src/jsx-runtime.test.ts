/**
 * The JSX runtime every published file is written for.
 *
 * The package compiles its JSX through `@gpuix/react` (`tsconfig.json`'s
 * `jsxImportSource`), but a consumer that compiles the files **from source**
 * with its own automatic runtime resolves every host element against that
 * runtime's props: `@gpuixui/docs` reported 68 `TS2322`/`TS2739` errors in this
 * package — `StyleDesc` where `CSSProperties` is expected, an `EventPayload`
 * React's `JSX.IntrinsicElements` cannot hold — in files no docs change touched.
 *
 * The `@jsxImportSource @gpuix/react` pragma pins each file's JSX to the runtime
 * it was written for, the way `@gpuixui/tokens`' `react.tsx` pins its own to
 * React, so a consumer's compiler setting cannot reinterpret a file the consumer
 * did not write. `src` and `examples` are both published (`examples/index.ts` is
 * the `./examples` export), so both are held.
 *
 * `node:fs` is the test-time repository boundary the package's other guards use;
 * runtime code stays on Effect's platform services.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);

/** The two published trees that render JSX. */
const roots = ["src", "examples"] as const;

const text = (file: string): string =>
  readFileSync(fileURLToPath(new URL(file, root)), "utf8");

/** The automatic runtime the package's compiler options name. */
const jsxRuntime = (config: string): Option.Option<string> =>
  Option.fromNullishOr(/^\s*"jsxImportSource":\s*"([^"]+)"/m.exec(config)?.[1]);

/** The runtime a file's opening line pins, when it pins one. */
const pinnedRuntime = (source: string): Option.Option<string> =>
  Option.flatMap(Arr.head(source.split("\n")), (line) =>
    Option.fromNullishOr(
      /^\/\*\* @jsxImportSource (\S+) \*\/$/.exec(line)?.[1],
    ),
  );

/**
 * The published `.tsx` files of one tree, relative to the package.
 *
 * A test file is compiled by its own package only, so it is never the JSX a
 * consumer's program sees; the files published under `src` and `examples` are.
 */
const publishedTsx = (tree: string): ReadonlyArray<string> =>
  Arr.filter(
    readdirSync(fileURLToPath(new URL(`${tree}/`, root)), {
      recursive: true,
      encoding: "utf8",
    }),
    (file) => Str.endsWith(".tsx")(file) && !Str.endsWith(".test.tsx")(file),
  );

/** Every published file, with the tree it sits in. */
const files = (): ReadonlyArray<readonly [string, string]> =>
  Arr.flatMap(roots, (tree) =>
    Arr.map(publishedTsx(tree), (file) => [tree, file] as const),
  );

/** The fault one file has, or none when it pins the runtime it should. */
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
    // A walk that read nothing would pass the case above for the wrong reason.
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
    // A file pinned to the browser's runtime is the defect, not an absence.
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
