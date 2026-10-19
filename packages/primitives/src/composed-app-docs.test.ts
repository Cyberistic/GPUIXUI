/**
 * The composed-app ledger must match its suite (plan `608`).
 *
 * The bug this guards: `COMPONENTS.md` and `examples/basic-app/README.md` kept
 * two claims that later measurements disproved — that the suite had 6 tests,
 * that a field mounted after the first render cannot take `autoFocus` (plan
 * `584`), and that only 6 of 7 cases pass because of the published box model
 * (plan `598` made it 7/7). A reader uses these passages to decide what is
 * done, so a stale claim is a real defect in the ledger.
 */

import { Effect, FileSystem, Option, Path, pipe } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Str from "effect/String";

const read = (...segments: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    return yield* fileSystem.readFileString(
      path.join(import.meta.dirname, "..", "..", "..", ...segments),
    );
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

/** The lines of a paragraph starting at `start`, up to the next blank line. */
const paragraph = (text: string, start: string): Option.Option<string> =>
  pipe(
    Str.split("\n")(text),
    Arr.findFirstIndex((line) => Str.startsWith(start)(line)),
    Option.map((index) =>
      pipe(
        Arr.drop(Str.split("\n")(text), index),
        Arr.takeWhile((line) => Str.isNonEmpty(line)),
        Arr.join("\n"),
      ),
    ),
  );

const CASE = /^it\s*\(/;

const scan = Effect.gen(function* () {
  const runtime = yield* read(
    "examples",
    "basic-app",
    "runtime",
    "app.runtime.test.tsx",
  );
  const readme = yield* read("examples", "basic-app", "README.md");
  const components = yield* read("COMPONENTS.md");
  const cases = Arr.length(
    Arr.filter(Str.split("\n")(runtime), (line) => CASE.test(line)),
  );
  const row = pipe(
    Str.split("\n")(readme),
    Arr.findFirst((line) => Str.includes("**this composition**")(line)),
    Option.getOrElse(() => ""),
  );
  return {
    cases,
    row,
    readmeNote: Option.getOrElse(
      paragraph(readme, "One measured fact"),
      () => "",
    ),
    composed: Option.getOrElse(
      paragraph(components, "**Composed app (327):**"),
      () => "",
    ),
  };
}).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

const FALSE_AUTOFOCUS = /does not receive\s+`?autoFocus|initial mount only/i;
const PARTIAL_PASS = /\b(\d+) of the (\d+) pass\b/;

describe("the composed-app ledger", () => {
  it("states the app runtime suite's real case count", async () => {
    const { cases, row, composed } = await Effect.runPromise(scan);
    expect(cases).toBeGreaterThan(0);
    expect(
      Str.includes(`(${cases} cases)`)(row),
      `README: the composition row must say "(${cases} cases)"; the runtime file has ${cases} case declarations`,
    ).toBe(true);
    expect(
      Str.includes(`${cases} tests`)(composed),
      `COMPONENTS.md: the Composed app paragraph must say "${cases} tests"`,
    ).toBe(true);
  });

  it("does not repeat the autoFocus limitation in the inventory", async () => {
    const { composed } = await Effect.runPromise(scan);
    expect(
      composed.match(FALSE_AUTOFOCUS)?.[0],
      "COMPONENTS.md still claims a later-mounted field cannot take autoFocus; plan 584 measured that it can",
    ).toBeUndefined();
    expect(
      Str.includes("plan `584`")(composed),
      "COMPONENTS.md must record the measured autoFocus rule and its plan",
    ).toBe(true);
  });

  it("does not repeat the autoFocus limitation in the app README", async () => {
    const { readmeNote } = await Effect.runPromise(scan);
    expect(
      readmeNote.match(FALSE_AUTOFOCUS)?.[0],
      "examples/basic-app/README.md still claims a later-mounted field cannot take autoFocus",
    ).toBeUndefined();
    expect(
      Str.includes("plan `584`")(readmeNote),
      "the app README must record where the autoFocus fact was measured",
    ).toBe(true);
  });

  it("does not claim a partial pass the runtime no longer has", async () => {
    const { row, composed } = await Effect.runPromise(scan);
    const claim = row.match(PARTIAL_PASS);
    expect(
      claim === null || claim[1] === claim[2],
      `README: a partial pass must name the failing case and why; found "${claim?.[0] ?? ""}"`,
    ).toBe(true);
    expect(
      Str.includes("6 of the 7")(composed),
      "COMPONENTS.md still records the pre-598 6/7 result",
    ).toBe(false);
  });
});
