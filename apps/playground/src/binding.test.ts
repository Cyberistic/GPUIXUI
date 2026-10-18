/**
 * Guards the provenance of the native evidence — plan `529`.
 *
 * Every report claims which GPUix source it proves. If the label falls back to
 * a bare version, or the pin drifts from the installed package, a report can
 * again pass off a `main`-derived binding as the published release.
 */
import { describe, expect, it } from "@effect/vitest";
import { Effect, FileSystem, Path, Schema } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { bindingPin, hostLabel } from "./binding.js";

const Installed = Schema.Struct({
  name: Schema.String,
  version: Schema.String,
});

const decodeInstalled = Schema.decodeUnknownEffect(
  Schema.fromJsonString(Installed),
);

describe("hostLabel", () => {
  it("names the GPUix and zed commits, not only the package version", () => {
    const label = hostLabel("TestRenderer", "darwin", "x64");
    expect(label).toContain("9fcd6288");
    expect(label).toContain("81c99f81");
    expect(label).toContain("TestRenderer darwin-x64");
  });
});

describe("bindingPin", () => {
  it.effect("matches the installed @gpuix/native version", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const loader = new URL(import.meta.resolve(bindingPin.package));
      const file = yield* path.fromFileUrl(new URL("./package.json", loader));
      const installed = yield* decodeInstalled(
        yield* fileSystem.readFileString(file),
      );
      expect(installed.name).toBe(bindingPin.package);
      expect(installed.version).toBe(bindingPin.version);
    }).pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.provide(NodePath.layer),
    ),
  );
});
