/**
 * Every public component is rendered by at least one example (plan 374).
 *
 * The component bar is code + test + example + docs page + inventory row. The
 * example third was hand-maintained: `Tooltip` and the standalone `Checkbox`
 * shipped with a page, a runtime suite and an inventory row while no example
 * rendered them (the docs index pointed at screens that only used `InfoTip`
 * and `CheckboxGroup`). The other example-side guard (plan 092) compares the
 * registry to the screen list, which cannot see a component no example
 * mentions.
 *
 * This is a source scan, not a registry field: the example registry is consumed
 * by the native playground, so a runtime component must not have to name it.
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** Public exports that are host infrastructure, not a rendered component. */
const NOT_RENDERED: ReadonlyArray<string> = [
  /** An error class, thrown by `useTheme` outside a provider. */
  "MissingThemeProviderError",
  /** The host (or the test fixture) supplies it; see `docs/README.md`. */
  "ThemeProvider",
];

/** `export { A, B as C } from "./x.js"` — a value export block of the index. */
const EXPORT_BLOCK = /export\s*\{([^}]*)\}\s*from/g;

/** A component declared in the barrel itself (`export const X = …`). */
const EXPORT_DECLARATION =
  /^export\s+(?:const|function|class)\s+([A-Z][A-Za-z0-9]*)/gm;

/** A component is PascalCase; `labelledBy` and `useTheme` are helpers. */
const isPascalCase = (name: string): boolean =>
  /^[A-Z][A-Za-z0-9]*$/.test(name);

/** The name the consumer imports from one export specifier. */
const exportedName = (specifier: string): string =>
  Str.trim(Option.getOrElse(Arr.last(Str.split(specifier, " as ")), () => ""));

/** Every PascalCase value the component index exports. */
const componentNames = (source: string): ReadonlyArray<string> =>
  Arr.dedupe(
    Arr.appendAll(
      Arr.flatMap(Array.from(source.matchAll(EXPORT_BLOCK)), (match) =>
        Arr.filter(
          Arr.map(Str.split(match[1] ?? "", ","), exportedName),
          isPascalCase,
        ),
      ),
      Arr.map(
        Array.from(source.matchAll(EXPORT_DECLARATION)),
        (match) => match[1] ?? "",
      ),
    ),
  );

/** A rendered element, not an import: `<Button` must not match `<ButtonGroup`. */
const renders = (sources: string, name: string): boolean =>
  new RegExp(`<${name}(?=[\\s/>])`).test(sources);

const read = (relative: string) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    return yield* fileSystem.readFileString(
      path.join(import.meta.dirname, "..", relative),
    );
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

/** The source of every registered example module. */
const readExamples = () =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = path.join(import.meta.dirname, "..", "examples");
    const files = yield* fileSystem.readDirectory(root);
    return yield* Effect.forEach(
      Arr.filter(files, Str.endsWith(".example.tsx")),
      (file) => fileSystem.readFileString(path.join(root, file)),
      { concurrency: 8 },
    );
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

it("renders every public component in at least one example", async () => {
  const [index, examples] = await Effect.runPromise(
    Effect.all([read("src/components/index.ts"), readExamples()], {
      concurrency: 2,
    }),
  );
  const names = componentNames(index);
  expect(
    Arr.filter(NOT_RENDERED, (name) => !Arr.contains(names, name)),
    "a stale entry in the non-rendered allowlist",
  ).toStrictEqual([]);
  const sources = Arr.join(examples, "\n");
  const missing = Arr.filter(
    Arr.filter(names, (name) => !Arr.contains(NOT_RENDERED, name)),
    (name) => !renders(sources, name),
  );
  expect(missing, "a public component with no rendered example").toStrictEqual(
    [],
  );
});
