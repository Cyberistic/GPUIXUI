/**
 * Guards the pages against denying the validation announcement.
 *
 * The bug guarded (plan `812`): every value-bearing control paints `invalid`,
 * but none of them reached the accessibility tree — 0.10.0 has no
 * `aria-invalid`, and the package's description channel (plan `810`) carried
 * only `unavailable`/`read only`. Three pages had promoted the defect to a
 * documented limitation: `input.mdx` said `invalid` was "not an announced
 * error", `label.mdx` said it "is not announced by itself", and `rating.mdx`
 * said "Validation is paint only". Measured on the release-tag build, an
 * invalid `Input`, `Select`, `CheckboxGroup`, `RadioGroup` and `OTPField` all
 * reported `description: undefined`.
 *
 * The rule is not "never mention paint": `invalid` still paints the boundary and
 * the pages say so. The rule is that no page may claim the state is unannounced,
 * and the capability table must keep naming `invalid` as what the missing
 * attribute is replaced with.
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Str from "effect/String";

/** Claims that a failed validation reaches no assistive technology. */
const DENIES_ANNOUNCEMENT = [
  "not an announced",
  "is not announced by itself",
  "Validation is paint only",
] as const;

/** The pages that document the prop, so this guard cannot go vacuous. */
const MIN_DOCUMENTING_PAGES = 10;

const read = (directory: string, file: string) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.readFileString(path.join(directory, file));
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

const readDocs = Effect.gen(function* () {
  const path = yield* Path.Path;
  const fs = yield* FileSystem.FileSystem;
  const directory = path.join(import.meta.dirname, "..", "docs");
  const files = yield* fs.readDirectory(directory);
  return yield* Effect.forEach(
    Arr.filter(files, Str.endsWith(".mdx")),
    (file) =>
      Effect.map(
        fs.readFileString(path.join(directory, file)),
        (body) => ({ file, body }) as const,
      ),
    { concurrency: 8 },
  );
}).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

/** Every withdrawn claim, with its page and 1-based line number. */
const denials = (
  pages: ReadonlyArray<{ readonly file: string; readonly body: string }>,
): ReadonlyArray<string> =>
  Arr.flatMap(pages, ({ file, body }) =>
    Arr.flatMap(Str.split(body, "\n"), (line, index) =>
      Arr.some(DENIES_ANNOUNCEMENT, (claim) => Str.includes(claim)(line))
        ? [`${file}:${index + 1} ${line.trim()}`]
        : [],
    ),
  );

describe("the validation announcement", () => {
  it("is not denied by any component page", async () => {
    const pages = await Effect.runPromise(readDocs);
    expect(denials(pages)).toStrictEqual([]);
  });

  it("is documented on every page that documents `invalid`", async () => {
    const pages = await Effect.runPromise(readDocs);
    const documenting = Arr.filter(pages, ({ body }) =>
      Str.includes("| `invalid` |")(body),
    );
    expect(Arr.length(documenting)).toBeGreaterThanOrEqual(
      MIN_DOCUMENTING_PAGES,
    );
    const silent = Arr.filter(
      documenting,
      ({ body }) =>
        !Str.includes("`invalid`")(body) || !Str.includes("`812`")(body),
    );
    expect(Arr.map(silent, ({ file }) => file)).toStrictEqual([]);
  });

  it("is named by the capability table", async () => {
    const doc = await Effect.runPromise(
      Effect.gen(function* () {
        const path = yield* Path.Path;
        return yield* read(
          path.join(import.meta.dirname, "..", "..", "..", "docs"),
          "gpuix-capabilities.md",
        );
      }).pipe(Effect.provide(NodePath.layer)),
    );
    expect(doc).toContain("`unavailable`/`read only`/`invalid`");
    expect(doc).toContain("plan `812`");
  });
});
