/**
 * Capture provenance for the native frames the docs publish — plan `564`.
 *
 * A frame is only publishable with a sidecar that names the run that produced
 * it (docs plan `412` §5). The sidecar is written from the report, never from
 * a clock read after the fact, and only for a run where every selected
 * scenario passed: a red run must not leave a caption describing its frames.
 */
import { Effect, FileSystem, Option, Path } from "effect";
import * as DateTime from "effect/DateTime";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import * as Arr from "effect/Array";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";
import type * as PlatformError from "effect/PlatformError";
import { Report, type Smoke } from "@gpuixui/testing";

/** The docs' published sidecar shape. `kind` is omitted for a still. */
export class CaptureProvenance extends Schema.Class<CaptureProvenance>(
  "CaptureProvenance",
)({
  platform: Schema.NonEmptyString,
  gpuixVersion: Schema.NonEmptyString,
  commit: Schema.NonEmptyString,
  command: Schema.NonEmptyString,
  capturedAt: Schema.NonEmptyString,
}) {}

/** The five facts a run knows before the report adds its start time. */
export interface CaptureFacts {
  readonly platform: string;
  readonly gpuixVersion: string;
  readonly commit: string;
  readonly command: string;
}

/** Encodes the sidecar through its schema (EF-19). */
export const captureJson = (provenance: CaptureProvenance): string =>
  Schema.encodeSync(Schema.fromJsonString(CaptureProvenance))(provenance);

/** The reproducible command recorded in the caption, never raw argv. */
export const captureCommand = (
  directory: string,
  only: ReadonlyArray<string>,
): string =>
  Arr.join(
    Arr.appendAll(
      [
        "nub apps/playground/dist/smoke/run.js",
        `--capture ${Str.replace(/\/+$/, "")(directory)}`,
      ],
      Arr.match(only, {
        onEmpty: () => [],
        onNonEmpty: (ids) => [`--only ${Arr.join(ids, ",")}`],
      }),
    ),
    " ",
  );

/** One scenario's frame in the capture directory. */
export const captureFile = (
  path: Path.Path,
  directory: string,
  id: string,
): string => path.join(directory, `${id}.png`);

/** A git command's output as a commit, or `None` when it printed nothing. */
export const commitOf = (output: string): Option.Option<string> =>
  Option.filter(Option.some(Str.trim(output)), Str.isNonEmpty);

/**
 * The commit the capture ran at, read from git — never guessed.
 *
 * The spawner is a parameter so the rule is testable without a process, and so
 * the CLI keeps the only real one at its boundary.
 */
export const readCommit = (
  spawner: ChildProcessSpawner.ChildProcessSpawner["Service"],
): Effect.Effect<Option.Option<string>> =>
  spawner
    .string(ChildProcess.make("git", ["rev-parse", "--short", "HEAD"]))
    .pipe(Effect.option, Effect.map(Option.flatMap(commitOf)));

/** An epoch millisecond as ISO 8601, or `None` for an invalid one. */
const dateTimeIso = (millis: number): Option.Option<string> =>
  Option.map(DateTime.make(millis), DateTime.formatIso);

/**
 * The sidecar for a run, or `None` when it must not be published.
 *
 * `capturedAt` is the report's start: it is the time the frames belong to, and
 * a later clock read would caption a re-run it did not observe.
 */
export const captureProvenance = (
  report: Smoke.SmokeReport,
  facts: CaptureFacts,
): Option.Option<CaptureProvenance> =>
  Report.passed(report)
    ? Option.map(dateTimeIso(report.startedAt), (capturedAt) =>
        CaptureProvenance.make({ ...facts, capturedAt }),
      )
    : Option.none();

/** Writes `<directory>/provenance.json`, creating the directory. */
export const writeProvenance = (
  directory: string,
  provenance: CaptureProvenance,
): Effect.Effect<
  void,
  PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    yield* fileSystem.makeDirectory(directory, { recursive: true });
    yield* fileSystem.writeFileString(
      path.join(directory, "provenance.json"),
      captureJson(provenance),
    );
  });

/**
 * Removes the previous run's frames and sidecar before a new capture.
 *
 * A capture directory belongs to one run: a sidecar names the frames it
 * describes, so a frame from an earlier selection must not survive beside a
 * fresh caption. Only PNGs and the sidecar are removed; anything else in the
 * directory is the caller's.
 */
export const clearCapture = (
  directory: string,
): Effect.Effect<
  void,
  PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    if (!(yield* fileSystem.exists(directory))) return;
    const entries = yield* fileSystem.readDirectory(directory);
    const stale = Arr.append(
      Arr.filter(entries, (entry) => Str.endsWith(".png")(entry)),
      "provenance.json",
    );
    yield* Effect.forEach(
      stale,
      (entry) =>
        Effect.gen(function* () {
          const file = path.join(directory, entry);
          if (yield* fileSystem.exists(file)) {
            yield* fileSystem.remove(file);
          }
        }),
      { concurrency: 1 },
    );
  });
