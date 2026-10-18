/**
 * The composed examples are a public subpath, and the manifest must say so.
 *
 * The bug guarded (plan `388`): `examples/index.ts` was the playground's only
 * source for the fifteen composed screens, but the package exported only `.`,
 * `./core` and `./testing`, so the playground could not mount them through the
 * package boundary. A manifest entry that points at a missing file, or a
 * registry entry that is not a component, would fail the same way.
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as R from "effect/Record";
import { examples } from "../examples/index.js";

/** One `exports` target: a source-first package points both fields at source. */
class ExportTarget extends Schema.Class<ExportTarget>("ExportTarget")({
  types: Schema.optional(Schema.String),
  default: Schema.optional(Schema.String),
}) {}

class PackageManifest extends Schema.Class<PackageManifest>("PackageManifest")({
  exports: Schema.Record(Schema.String, ExportTarget),
}) {}

const decodeManifest = Schema.decodeUnknownEffect(
  Schema.fromJsonString(PackageManifest),
);

const readManifest = () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = path.join(import.meta.dirname, "..");
    const manifest = yield* decodeManifest(
      yield* fs.readFileString(path.join(root, "package.json")),
    );
    const target = yield* fs.exists(path.join(root, "examples", "index.ts"));
    return { manifest, target };
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

describe("examples subpath", () => {
  it("exports the registry from the manifest and its target exists", async () => {
    const { manifest, target } = await Effect.runPromise(readManifest());
    const entry = Option.getOrUndefined(R.get(manifest.exports, "./examples"));
    expect(entry).toBeDefined();
    expect(entry?.types).toBe("./examples/index.ts");
    expect(entry?.default).toBe("./examples/index.ts");
    expect(target).toBe(true);
  });

  it("registers a component for every example id", () => {
    const ids = R.keys(examples);
    expect(ids.length).toBeGreaterThan(0);
    expect(Arr.filter(ids, (id) => !P.isFunction(examples[id]))).toStrictEqual(
      [],
    );
  });
});
