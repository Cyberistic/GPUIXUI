/**
 * The README's suite counts must be true (plan `588`).
 *
 * The bug this guards: the Verification section claimed "53 files, 753 tests"
 * offline and "46 files, 700 tests" runtime while the tree had 54 / 788 and
 * 49 / 717. A prose count only a full run knows goes stale silently, so the
 * README carries the **file** counts — which this test can prove — and no test
 * count at all. A new test file without a README update fails by value.
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import type { PlatformError } from "effect/PlatformError";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

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

/** The claim a README sentence makes, or `None` when the sentence is absent. */
const declared = (text: string, pattern: RegExp): Option.Option<number> =>
  Option.flatMap(Option.fromNullishOr(text.match(pattern)?.[1]), (value) =>
    Option.fromNullishOr(Number.parseInt(value, 10)),
  );

const scan = Effect.gen(function* () {
  const path = yield* Path.Path;
  const fs = yield* FileSystem.FileSystem;
  const packageRoot = path.join(import.meta.dirname, "..");
  const readme = yield* fs.readFileString(path.join(packageRoot, "README.md"));
  const source = yield* filesUnder(path, fs, path.join(packageRoot, "src"));
  const runtime = yield* filesUnder(
    path,
    fs,
    path.join(packageRoot, "runtime"),
  );
  const offlineTests = Arr.filter(
    source,
    (file) => Str.endsWith(".test.ts")(file) || Str.endsWith(".test.tsx")(file),
  );
  const runtimeTests = Arr.filter(runtime, Str.endsWith(".runtime.test.tsx"));
  return {
    readme,
    offline: declared(readme, /offline suite is\s+\*\*(\d+) test files\*\*/),
    runtime: declared(readme, /runtime suite is\s+\*\*(\d+) test files\*\*/),
    offlineCount: Arr.length(offlineTests),
    runtimeCount: Arr.length(runtimeTests),
  };
}).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

describe("the README's suite counts", () => {
  it("declares the real offline test-file count", async () => {
    const result = await Effect.runPromise(scan);
    expect(
      Option.getOrElse(result.offline, () => -1),
      "README: 'the offline suite is **N test files**'; run `nub run --filter @gpuixui/primitives test` and correct the number",
    ).toBe(result.offlineCount);
  });

  it("declares the real runtime test-file count", async () => {
    const result = await Effect.runPromise(scan);
    expect(
      Option.getOrElse(result.runtime, () => -1),
      "README: 'The runtime suite is **N test files**'; count `runtime/**/*.runtime.test.tsx` and correct the number",
    ).toBe(result.runtimeCount);
  });

  it("does not state a test count that only a full run knows", async () => {
    const { readme } = await Effect.runPromise(scan);
    expect(
      readme.match(/Measured[^\n]*\d+ tests?\b/)?.[0],
      "state the file count and point at TODO.md / the plan for run totals",
    ).toBeUndefined();
  });
});
