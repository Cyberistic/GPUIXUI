/**
 * Every exported value carries a TSDoc summary (plan `349`).
 *
 * The docs site builds its Values API from these packages' exported values and
 * their TSDoc, and twelve of them shipped without a summary — so the site
 * carried a docs-owned override table that it must delete the moment the source
 * documents the value (its own guard says so). A source scan found 36 in total,
 * the rest being render/internal seams that are exported module-level rather
 * than from the package root.
 *
 * This is a declaration scan, not a type-aware one: TypeScript 7.0.2 (the
 * pinned native compiler) no longer exposes the classic Program API at the
 * package root. A declaration is documented when the nearest preceding non-blank
 * line closes a block comment that opens with `/**`; a plain block comment is
 * not a summary. Both packages are scanned from one test for the same reason as
 * `package-manifest.test.ts` (plan `348`).
 */

import { Effect, FileSystem, Path, pipe } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import type { PlatformError } from "effect/PlatformError";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Str from "effect/String";

/** The packages this workstream owns. */
const PACKAGES = ["primitives", "icons"] as const;

/** `export const`, `export async function`, … — a value, not a type. */
const VALUE_DECLARATION =
  /^export\s+(?:async\s+)?(?:const|let|function|class|enum)\b/;

/** A compiled source file, excluding the `.test` suites and test harnesses. */
const isShippedSource = (file: string): boolean =>
  /\.(ts|tsx)$/.test(file) &&
  !/\.test\.tsx?$/.test(file) &&
  !Arr.some(Str.split(file, "/"), (segment) => segment === "testing");

/** Every file under a path, recursively. */
const filesUnder = (
  path: Path.Path,
  fs: FileSystem.FileSystem,
  root: string,
): Effect.Effect<ReadonlyArray<string>, PlatformError> =>
  Effect.gen(function* () {
    const info = yield* fs.stat(root);
    if (info.type === "File") return [root];
    const entries = yield* fs.readDirectory(root);
    const children = yield* Effect.forEach(
      entries,
      (entry) => filesUnder(path, fs, path.join(root, entry)),
      { concurrency: 8 },
    );
    return Arr.flatten(children);
  });

/** The index of the nearest non-blank line above `index`. */
const previousLine = (
  lines: ReadonlyArray<string>,
  index: number,
): Option.Option<number> =>
  Arr.findLastIndex(Arr.take(lines, index), (line) =>
    Str.isNonEmpty(Str.trim(line)),
  );

/** Whether a JSDoc block (not a plain block comment) precedes `index`. */
const hasSummary = (lines: ReadonlyArray<string>, index: number): boolean =>
  pipe(
    previousLine(lines, index),
    Option.filter((end) => Str.endsWith("*/")(Str.trim(lines[end] ?? ""))),
    Option.flatMap((end) =>
      Arr.findLastIndex(Arr.take(lines, end + 1), (line) =>
        Str.startsWith("/*")(Str.trim(line)),
      ),
    ),
    Option.exists((start) =>
      Str.startsWith("/**")(Str.trim(lines[start] ?? "")),
    ),
  );

/** The undocumented value declarations in one file. */
const undocumentedIn = (file: string, text: string): ReadonlyArray<string> => {
  const lines = Str.split(text, "\n");
  return pipe(
    lines,
    Arr.flatMap((line, index) =>
      VALUE_DECLARATION.test(line) && !hasSummary(lines, index)
        ? [`${file}:${index + 1}: ${Str.trim(line)}`]
        : [],
    ),
  );
};

const scanPackage = (
  name: string,
): Effect.Effect<ReadonlyArray<string>, PlatformError> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    const directory = path.join(
      import.meta.dirname,
      "..",
      "..",
      "..",
      "packages",
      name,
    );
    const files = yield* filesUnder(path, fs, path.join(directory, "src"));
    const shipped = Arr.filter(files, isShippedSource);
    const found = yield* Effect.forEach(
      shipped,
      (file) =>
        Effect.map(fs.readFileString(file), (text) =>
          undocumentedIn(path.relative(directory, file), text),
        ),
      { concurrency: 8 },
    );
    return Arr.flatten(found);
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

describe("exported values", () => {
  it("document every exported value in both packages", async () => {
    const found = Arr.flatten(
      await Effect.runPromise(
        Effect.forEach(PACKAGES, scanPackage, { concurrency: 2 }),
      ),
    );
    expect(Arr.sort(found, Order.String)).toStrictEqual([]);
  });
});
