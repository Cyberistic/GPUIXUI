/**
 * One owner for a shadow's geometry (plan 099).
 *
 * `@gpuixui/tokens` owns the two runtime-shaped helpers — `focusRing` and
 * `elevationShadow`. D17 and plan 021 deleted the primitives package's local
 * copies, but `core/selection.ts` kept one: the same ring, written out by hand
 * (guarded here, deleted by plan 099). A second declaration is a silent drift
 * path — a change to the helper would have to be mirrored by hand — so this
 * guard fails by file and line when a source file builds a shadow instead of
 * naming a helper.
 *
 * The theme fixture is the one place that declares a theme's shadow values, so
 * its literals are read separately to prove the pattern still detects them; a
 * guard whose walker found no files would otherwise pass by doing nothing.
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import type { PlatformError } from "effect/PlatformError";

/** Any of the geometry/colour keys a custom `BoxShadow` is built from. */
const SHADOW = /(spreadRadius|blurRadius|offsetX|offsetY)\s*:/;

const FIXTURE = ["src", "core", "testing", "theme.fixture.ts"] as const;

const at = (segments: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    return path.join(import.meta.dirname, "..", "..", ...segments);
  }).pipe(Effect.provide(NodePath.layer));

const readText = (segments: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.readFileString(yield* at(segments));
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

/** Every source file under `segments`, skipping tests and the theme fixtures. */
const sources = (
  segments: ReadonlyArray<string>,
): Effect.Effect<ReadonlyArray<ReadonlyArray<string>>, PlatformError> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const entries = yield* fs.readDirectory(yield* at(segments));
    const found = yield* Effect.forEach(
      entries,
      (entry) =>
        Effect.gen(function* () {
          const info = yield* fs.stat(yield* at([...segments, entry]));
          const path = [...segments, entry];
          if (info.type === "Directory") {
            return entry === "testing" ? [] : yield* sources(path);
          }
          const isSource =
            (Str.endsWith(".ts")(entry) || Str.endsWith(".tsx")(entry)) &&
            !Str.endsWith(".test.ts")(entry) &&
            !Str.endsWith(".test.tsx")(entry);
          return isSource ? [path] : [];
        }),
      { concurrency: 8 },
    );
    return Arr.flatten(found);
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

/** The hand-built shadows in one file, as `file: line` strings. */
const shadowLines = (
  path: ReadonlyArray<string>,
): Effect.Effect<ReadonlyArray<string>, PlatformError> =>
  Effect.map(readText(path), (body) =>
    Arr.map(
      Arr.filter(Str.split(body, "\n"), (line) => SHADOW.test(line)),
      (line) => `${path.join("/")}: ${Str.trim(line)}`,
    ),
  );

describe("the tokens helpers are the only shadow source", () => {
  it("no source file builds a shadow geometry", async () => {
    const files = await Effect.runPromise(sources(["src"]));
    // Liveness: the walk really read the package, not an empty directory.
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContainEqual(["src", "index.ts"]);
    const hits = await Effect.runPromise(
      Effect.forEach(files, shadowLines, { concurrency: 8 }),
    );
    expect(Arr.flatten(hits)).toStrictEqual([]);
  });

  it("the pattern still finds the fixture's own shadow literals", async () => {
    const hits = await Effect.runPromise(shadowLines([...FIXTURE]));
    expect(hits.length).toBeGreaterThan(0);
  });
});
