/**
 * One value callback name, enforced (plan 088).
 *
 * The accepted cross-package contract names `onValueChange` as the only value
 * callback. A control that reintroduces `onChange` teaches a second name for
 * the same thing — and our callback carries a value, not the host's event — so
 * the guard fails by file and line instead of trusting review to catch it.
 *
 * The host wiring is not affected: a component body writes
 * `onChange: (event) => …` inside a props object, never as a public
 * `readonly onChange?:` declaration. The patterns match the **identifier**
 * `onChange`, so a callback named after the state it reports — such as
 * `onScrollPositionChange` (plan 337) — is not a hit.
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Str from "effect/String";

const ROOT = ["src", "components"] as const;

interface Hit {
  readonly file: string;
  readonly line: string;
}

const at = (segments: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    return path.join(import.meta.dirname, "..", ...segments);
  }).pipe(Effect.provide(NodePath.layer));

const readDir = (segments: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.readDirectory(yield* at(segments));
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

const readText = (segments: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.readFileString(yield* at(segments));
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

/** Every line matching `pattern`, as `file: line` hits. */
const hitsIn = (
  segments: ReadonlyArray<string>,
  files: ReadonlyArray<string>,
  pattern: RegExp,
) =>
  Effect.gen(function* () {
    const bodies = yield* Effect.forEach(
      files,
      (file) =>
        Effect.map(readText([...segments, file]), (body) => ({
          file: [...segments, file].join("/"),
          lines: Str.split(body, "\n"),
        })),
      { concurrency: 8 },
    );
    return Arr.flatMap(bodies, ({ file, lines }) =>
      Arr.map(
        Arr.filter(lines, (line) => pattern.test(line)),
        (line) => ({ file, line }),
      ),
    );
  });

const describeHits = (hits: ReadonlyArray<Hit>) =>
  Arr.map(hits, (hit) => `${hit.file}: ${Str.trim(hit.line)}`);

describe("the value callback name", () => {
  it("no component declares a public `onChange` prop", async () => {
    const files = Arr.filter(
      await Effect.runPromise(readDir(ROOT)),
      Str.endsWith(".tsx"),
    );
    const hits = await Effect.runPromise(
      hitsIn(ROOT, files, /readonly onChange\??:/),
    );
    expect(describeHits(hits)).toStrictEqual([]);
  });

  it("no docs page or example calls a component's `onChange`", async () => {
    const [docs, examples] = await Effect.runPromise(
      Effect.all([readDir(["docs"]), readDir(["examples"])], {
        concurrency: 2,
      }),
    );
    const hits = await Effect.runPromise(
      Effect.all(
        [
          // A page may quote the GPUix host's own `onChange`; what it may not
          // do is document or call ours.
          hitsIn(
            ["docs"],
            Arr.filter(docs, Str.endsWith(".mdx")),
            /\bonChange=\{|\| `onChange` /,
          ),
          hitsIn(
            ["examples"],
            Arr.filter(examples, Str.endsWith(".tsx")),
            /\bonChange\b/,
          ),
        ],
        { concurrency: 2 },
      ),
    );
    expect(describeHits(Arr.flatten(hits))).toStrictEqual([]);
  });
});
