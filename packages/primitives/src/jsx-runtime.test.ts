/**
 * The JSX runtime every published file is written for.
 *
 * Both packages compile their JSX through `@gpuix/react` — each `tsconfig.json`
 * says so — but a consumer that compiles them **from source** with its own
 * automatic runtime resolves every host element in these files against that
 * runtime's element props. The docs site does exactly that, through one
 * type-only import of `SelectOption`: measured on `8009bf47`, `@gpuixui/docs`'
 * type check reported **164** `TS2322` errors, every one of them a `StyleDesc`,
 * `EventPayload` or `Instance` that React's `JSX.IntrinsicElements` cannot hold,
 * in files no docs change touched.
 *
 * The `@jsxImportSource @gpuix/react` pragma pins each file's JSX to the runtime
 * it was written for, the way `@gpuixui/tokens`' `react.tsx` pins its own to
 * React — so a consumer's compiler setting cannot reinterpret a file the
 * consumer did not write.
 *
 * `node:fs` is the test-time repository boundary `docs.test.ts` already uses; the
 * package's runtime code stays on Effect's platform services.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

/** The two packages in this workstream that publish files rendering JSX. */
const PACKAGES: ReadonlyArray<{ readonly name: string; readonly root: URL }> = [
  { name: "primitives", root: new URL("../", import.meta.url) },
  { name: "icons", root: new URL("../../icons/", import.meta.url) },
];

const text = (root: URL, file: string): string =>
  readFileSync(fileURLToPath(new URL(file, root)), "utf8");

/** The automatic runtime a package's compiler options name. */
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
 * The published `.tsx` files of a package, relative to it.
 *
 * A test file is compiled by its own package only, so it is never the JSX a
 * consumer's program sees; the files published under `src` are. The walk starts
 * there, so a package-manager tree or a build output is never read.
 */
const publishedTsx = (root: URL): ReadonlyArray<string> =>
  Arr.filter(
    readdirSync(fileURLToPath(new URL("src/", root)), {
      recursive: true,
      encoding: "utf8",
    }),
    (file) => Str.endsWith(".tsx")(file) && !Str.endsWith(".test.tsx")(file),
  );

/** The fault one file has, or none when it pins the runtime it should. */
const pinFault = (
  root: URL,
  file: string,
  runtime: string,
): Result.Result<string, void> =>
  Option.match(pinnedRuntime(text(root, `src/${file}`)), {
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

  it("walks the published files of both packages", () => {
    // A walk that read nothing would pass the case above for the wrong reason.
    expect(
      Arr.map(PACKAGES, ({ root }) => publishedTsx(root).length > 0),
    ).toEqual([true, true]);
  });

  it("reads the pragma only off the first line", () => {
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
  });
});
