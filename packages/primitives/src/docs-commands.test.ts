/**
 * The package must not teach a command that runs the whole live suite.
 *
 * **The bug guarded (plan `700`).** `docs/surface.mdx` told an executor to run
 * `nub run --filter @gpuixui/primitives test:runtime -- --run <file>`. Measured
 * on `nub v0.9.6` with this vitest: everything after the extra `--` reaches the
 * runner verbatim, so the file is not a filter and all 61 runtime files run —
 * a "scoped" verification that pays for the merge gate and proves the wrong
 * scope. The form without the second `--` runs the named file.
 *
 * A page is copyable documentation: a wrong command silently wastes a run and
 * teaches the wrong habit. Both directions are held — the old pattern fails by
 * page and line, and removing the corrected line fails the vacuity check.
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Str from "effect/String";

/** The hand-off that makes a file argument vanish: `test:runtime -- --run …`. */
const UNFILTERED = /test:runtime.*\s--\s+--/;

const readText = (relative: string) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.readFileString(
      path.join(import.meta.dirname, "..", relative),
    );
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

const readDocs = Effect.gen(function* () {
  const path = yield* Path.Path;
  const fs = yield* FileSystem.FileSystem;
  const directory = path.join(import.meta.dirname, "..", "docs");
  const files = yield* fs.readDirectory(directory);
  return yield* Effect.forEach(
    Arr.filter(files, Str.endsWith(".mdx")),
    (file) =>
      Effect.map(fs.readFileString(path.join(directory, file)), (body) => ({
        file,
        body,
      })),
    { concurrency: 8 },
  );
}).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

/** Every line that teaches the unfiltered form, with page and 1-based line. */
const offenders = (
  documents: ReadonlyArray<{ readonly file: string; readonly body: string }>,
): ReadonlyArray<string> =>
  Arr.flatMap(documents, ({ file, body }) =>
    Arr.flatMap(Str.split(body, "\n"), (line, index) =>
      UNFILTERED.test(line) ? [`${file}:${index + 1} ${line.trim()}`] : [],
    ),
  );

describe("the package's verification commands", () => {
  it("never teach the double-dash hand-off that hides the file filter", async () => {
    const pages = await Effect.runPromise(readDocs);
    const readme = await Effect.runPromise(readText("README.md"));
    expect(pages.length).toBeGreaterThan(0);
    expect(
      offenders([...pages, { file: "README.md", body: readme }]),
    ).toStrictEqual([]);
  });

  it("keeps the scoped runtime example in the Surface page", async () => {
    const surface = await Effect.runPromise(readText("docs/surface.mdx"));
    expect(surface).toContain(
      "nub run --filter @gpuixui/primitives test:runtime runtime/surface.runtime.test.tsx",
    );
  });
});
