/**
 * Guards the capture sidecar — plan `564`.
 *
 * The bug these catch: a frame published with a caption from a different run
 * (wrong commit, wrong time, raw argv), a red run leaving a sidecar that
 * describes frames it did not produce, and a capture that keeps writing into
 * the gitignored `.artifacts` directory.
 */
import { describe, expect, it } from "@effect/vitest";
import { DateTime, Effect, FileSystem, Option, Path, Schema } from "effect";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Smoke } from "@gpuixui/testing";
import {
  CaptureProvenance,
  captureCommand,
  captureFile,
  captureJson,
  captureProvenance,
  clearProvenance,
  commitOf,
  writeProvenance,
} from "./capture.js";

const startedAt = 1_764_000_000_000;

const scenario = (outcome: "passed" | "failed") =>
  new Smoke.ScenarioResult({
    id: "layout-flex",
    title: "Layout",
    capability: "layout",
    durationMs: 1,
    checks: [
      new Smoke.CheckResult({
        label: "a row lays out",
        outcome:
          outcome === "passed"
            ? new Smoke.Passed({})
            : new Smoke.Failed({ detail: "expected 1, got 2" }),
      }),
    ],
  });

const report = (
  scenarios: ReadonlyArray<Smoke.ScenarioResult>,
): Smoke.SmokeReport =>
  new Smoke.SmokeReport({
    host: "gpuix TestRenderer darwin-x64",
    startedAt,
    durationMs: 1,
    scenarios,
    capabilities: [],
  });

const facts = {
  platform: "darwin-x64",
  gpuixVersion: "0.10.0",
  commit: "965fc69",
  command: "nub apps/playground/dist/smoke/run.js --capture out",
};

/** The sidecar under test; a failed run yields a sentinel the assertions catch. */
const provenanceOf = (value: Smoke.SmokeReport): CaptureProvenance =>
  Option.match(captureProvenance(value, facts), {
    onNone: () => CaptureProvenance.make({ ...facts, capturedAt: "none" }),
    onSome: (provenance) => provenance,
  });

const isoOf = (millis: number): string =>
  Option.match(DateTime.make(millis), {
    onNone: () => "invalid",
    onSome: DateTime.formatIso,
  });

describe("captureCommand", () => {
  it("normalises the directory and the selected ids, never raw argv", () => {
    expect(
      captureCommand("out/", ["theme-color-roles", "theme-type-and-shadow"]),
    ).toBe(
      "nub apps/playground/dist/smoke/run.js --capture out --only theme-color-roles,theme-type-and-shadow",
    );
    expect(captureCommand("out", [])).toBe(
      "nub apps/playground/dist/smoke/run.js --capture out",
    );
  });
});

describe("commitOf", () => {
  it("trims a git answer and rejects an empty one", () => {
    expect(commitOf(" 965fc69\n")).toEqual(Option.some("965fc69"));
    expect(commitOf("\n")).toEqual(Option.none());
  });
});

describe("captureProvenance", () => {
  it("publishes only a run where every scenario passed", () => {
    expect(
      Option.isSome(captureProvenance(report([scenario("passed")]), facts)),
    ).toBe(true);
    expect(
      Option.isSome(captureProvenance(report([scenario("failed")]), facts)),
    ).toBe(false);
    expect(Option.isSome(captureProvenance(report([]), facts))).toBe(false);
  });

  it("takes its timestamp from the report, not from a later clock read", () => {
    expect(provenanceOf(report([scenario("passed")])).capturedAt).toBe(
      isoOf(startedAt),
    );
    expect(isoOf(startedAt)).not.toBe(isoOf(startedAt + 60_000));
  });

  it("writes exactly the five published fields", () => {
    const provenance = provenanceOf(report([scenario("passed")]));
    const json = Schema.decodeUnknownSync(
      Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)),
    )(captureJson(provenance));
    expect(Arr.sort(R.keys(json), Order.String)).toEqual([
      "capturedAt",
      "command",
      "commit",
      "gpuixVersion",
      "platform",
    ]);
    const decoded = Schema.decodeUnknownSync(
      Schema.fromJsonString(CaptureProvenance),
    )(captureJson(provenance));
    expect(decoded.commit).toBe("965fc69");
  });
});

describe("the capture directory", () => {
  it.effect("writes a decodable sidecar beside the frames", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const directory = yield* fileSystem.makeTempDirectoryScoped();
        const provenance = provenanceOf(report([scenario("passed")]));

        yield* writeProvenance(directory, provenance);

        const file = path.join(directory, "provenance.json");
        expect(yield* fileSystem.exists(file)).toBe(true);
        const decoded = Schema.decodeUnknownSync(
          Schema.fromJsonString(CaptureProvenance),
        )(yield* fileSystem.readFileString(file));
        expect(decoded.commit).toBe("965fc69");
        expect(decoded.capturedAt).toBe(provenance.capturedAt);
        expect(captureFile(path, directory, "layout-flex")).toBe(
          path.join(directory, "layout-flex.png"),
        );
      }).pipe(
        Effect.provide(NodeFileSystem.layer),
        Effect.provide(NodePath.layer),
      ),
    ),
  );

  it.effect(
    "clears a previous sidecar before a new run can replace its frames",
    () =>
      Effect.scoped(
        Effect.gen(function* () {
          const fileSystem = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          const directory = yield* fileSystem.makeTempDirectoryScoped();
          yield* writeProvenance(
            directory,
            provenanceOf(report([scenario("passed")])),
          );

          yield* clearProvenance(directory);

          expect(
            yield* fileSystem.exists(path.join(directory, "provenance.json")),
          ).toBe(false);
          // Clearing again is a no-op, not a failure.
          yield* clearProvenance(directory);
        }).pipe(
          Effect.provide(NodeFileSystem.layer),
          Effect.provide(NodePath.layer),
        ),
      ),
  );
});
