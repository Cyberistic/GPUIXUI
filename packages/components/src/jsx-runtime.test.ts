/**
 * The JSX runtime every published file of this lane is written for.
 *
 * Three packages compile their JSX through `@gpuix/react` — each `tsconfig.json`
 * says so — but a consumer that compiles them **from source** with its own
 * automatic runtime resolves every host element in these files against that
 * runtime's element props. The docs site does exactly that, so a `StyleDesc`, an
 * `EventPayload` or an `Instance` reached React's `JSX.IntrinsicElements` and the
 * site's type check reported `TS2322`/`TS2739` errors in files no docs change
 * touched. The `@jsxImportSource @gpuix/react` pragma pins each file's JSX to the
 * runtime it was written for.
 *
 * `@gpuixui/primitives`, `@gpuixui/icons` and `@gpuixui/data` hold the same rule
 * for their own files; `packages/dock`, `files` and `shell` are recorded in
 * `TODO.md` as their owners' work, so this walk covers the three packages this
 * lane writes.
 *
 * `node:fs` is the test-time repository boundary `docs.test.ts` already uses.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

/** The packages whose published JSX this lane writes. */
const PACKAGES: ReadonlyArray<{ readonly name: string; readonly root: URL }> = [
  { name: "components", root: new URL("../", import.meta.url) },
  { name: "editor", root: new URL("../../editor/", import.meta.url) },
  { name: "media", root: new URL("../../media/", import.meta.url) },
];

const text = (root: URL, file: string): string =>
  readFileSync(fileURLToPath(new URL(file, root)), "utf8");

/** The automatic runtime a package's compiler options name. */
const jsxRuntime = (config: string): Option.Option<string> =>
  Option.fromNullishOr(/^\s*"jsxImportSource":\s*"([^"]+)"/m.exec(config)?.[1]);

/** The runtime a file's opening line pins, when it pins one. */
const pinnedRuntime = (source: string): Option.Option<string> =>
  Option.flatMap(Arr.head(Str.split("\n")(source)), (line) =>
    Option.fromNullishOr(
      /^\/\*\* @jsxImportSource (\S+) \*\/$/.exec(line)?.[1],
    ),
  );

/**
 * The published `.tsx` files of a package, relative to it.
 *
 * A test file is compiled by its own package only, so it is never the JSX a
 * consumer's program sees. Both trees a package exports are: `src` (the `.`
 * entry) and `examples` (the `./examples` entry).
 */
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

/** The fault one file has, or none when it pins the runtime it should. */
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
    // A walk that read nothing would pass the case above for the wrong reason.
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
