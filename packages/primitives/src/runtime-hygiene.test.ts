/**
 * Every runtime suite states the contract it guards, and no scratch probe
 * pretends to be one.
 *
 * The bug this guards (plan `390`): `runtime/__probe.runtime.test.tsx` was
 * committed by `f51c5568` while the degraded artifact was being diagnosed. It
 * was a diagnostic, not a test — one case failed asserting the opposite of the
 * contract and two passed by asserting that a real interaction reports nothing
 * — and it was the only runtime file without the file-level comment that says
 * what is being proven (`AGENTS.md` §3: state the bug guarded in the header).
 *
 * The rule is file-level on purpose: what a runtime suite proves is a claim
 * about the native runtime, and a reader (or the next agent) must be able to
 * see that claim without reverse-engineering 600 lines of assertions.
 */

import { Effect, FileSystem, Path, pipe } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import type { PlatformError } from "effect/PlatformError";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

/** A runtime suite, its source, and the first line it actually starts with. */
interface RuntimeSuite {
  readonly name: string;
  readonly text: string;
  readonly firstLine: string;
}

/** Read one file under `runtime/`. */
const readRuntimeFile = (
  name: string,
): Effect.Effect<string, PlatformError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.readFileString(
      path.join(import.meta.dirname, "..", "runtime", name),
    );
  });

/** The suites under `runtime/`. */
const scan = (): Effect.Effect<ReadonlyArray<RuntimeSuite>, PlatformError> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    const directory = path.join(import.meta.dirname, "..", "runtime");
    const entries = yield* fs.readDirectory(directory);
    const suites = Arr.filter(entries, Str.endsWith(".runtime.test.tsx"));
    return yield* Effect.forEach(
      suites,
      (name) =>
        Effect.map(fs.readFileString(path.join(directory, name)), (text) => ({
          name,
          text,
          firstLine: pipe(
            Str.split(text, "\n"),
            Arr.findFirst((line) => Str.isNonEmpty(Str.trim(line))),
            Option.getOrElse(() => ""),
          ),
        })),
      { concurrency: 8 },
    );
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

/** The fixture, whose exports every suite waits through. */
const readFixture = (): Effect.Effect<string, PlatformError> =>
  readRuntimeFile("fixture.tsx").pipe(
    Effect.provide(NodeFileSystem.layer),
    Effect.provide(NodePath.layer),
  );

const sorted = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.sort(values, Order.String);

describe("runtime suite hygiene", () => {
  it("opens every runtime suite with the contract it guards", async () => {
    const suites = await Effect.runPromise(scan());
    // Liveness: a scan that silently finds nothing would pass every rule.
    expect(suites.length).toBeGreaterThan(30);
    const headerless = pipe(
      suites,
      Arr.filter((suite) => !Str.startsWith("/**")(Str.trim(suite.firstLine))),
      Arr.map((suite) => suite.name),
      sorted,
    );
    expect(headerless).toStrictEqual([]);
  });

  it("has no scratch probe pretending to be a suite", async () => {
    const suites = await Effect.runPromise(scan());
    const probes = pipe(
      suites,
      Arr.map((suite) => suite.name),
      Arr.filter(Str.startsWith("__")),
      sorted,
    );
    expect(probes).toStrictEqual([]);
  });

  /**
   * **The bug this guards (plan `693`).** `fixture.tsx` exported `settleFocus()`,
   * a fixed 120 ms sleep standing in for the native-focus tracker's sample. Under
   * load the sleep elapsed before the paint (plan `691` measured 2–3 failing
   * cases in two of three full runs), so a suite could fail a green component.
   * `awaitFrame` polls the frame instead; nothing may reintroduce the sleep.
   */
  it("offers no fixed focus sleep, so a paint waits on the frame", async () => {
    const suites = await Effect.runPromise(scan());
    // Liveness: a scan that finds nothing would pass every rule.
    expect(suites.length).toBeGreaterThan(30);
    const fixture = await Effect.runPromise(readFixture());
    const fixtureOffersSleep =
      Str.includes("settleFocus")(fixture) ||
      Str.includes("FOCUS_SETTLE_MS")(fixture);
    const sleepers = pipe(
      suites,
      Arr.filter((suite) => Str.includes("settleFocus")(suite.text)),
      Arr.map((suite) => suite.name),
      sorted,
    );
    expect({ fixtureOffersSleep, sleepers }).toStrictEqual({
      fixtureOffersSleep: false,
      sleepers: [],
    });
  });
});
