/**
 * Which native build this run is evidence for — plan `529`.
 *
 * A binding built from GPUix `main` looks like the release at runtime: the same
 * package version, the same JS. It is not the same Rust code, so the suite pins
 * the source it was built from (`bindingPin`), prints it in every report, and
 * refuses to run an artifact that carries a capability the pinned release does
 * not have (`provenanceIssue`).
 */
import { Effect, FileSystem, Option, Path } from "effect";
import { Binding } from "@gpuixui/testing";

/** The published release the suite claims to prove (`@gpuix/native@0.10.0`). */
export const bindingPin = new Binding.BindingPin({
  package: "@gpuix/native",
  version: "0.10.0",
  gpuix: "9fcd628863e354e9c58019fc3bf38981a1e64158",
  zed: "81c99f816b4a5f69d3c014774068034c24d1d7af",
  shaders: "runtime",
});

/** The report's `host` field: the suite, the platform and the binding source. */
export const hostLabel = (
  kind: "TestRenderer" | "live window",
  platform: string,
  arch: string,
): string =>
  `gpuix ${kind} ${platform}-${arch} ${Binding.describeBinding(bindingPin)}`;

/**
 * `Some(reason)` when the installed binding is not the pinned release.
 *
 * The artifact is a build product next to the package's loader; when it is
 * absent the platform-specific package is serving the binding, which is a
 * published build by construction.
 */
export const provenanceIssue = (
  platform: string,
  arch: string,
): Effect.Effect<
  Option.Option<string>,
  never,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const resolved = yield* Effect.try(
      () => new URL(import.meta.resolve(bindingPin.package)),
    ).pipe(Effect.option);
    const target = yield* Option.match(resolved, {
      onNone: () => Effect.succeed(Option.none<string>()),
      onSome: (loader) =>
        path
          .fromFileUrl(new URL(`gpuix-native.${platform}-${arch}.node`, loader))
          .pipe(Effect.option),
    });
    return yield* Option.match(target, {
      onNone: () => Effect.succeed(Option.none<string>()),
      onSome: (file) =>
        fileSystem
          .readFile(file)
          .pipe(
            Effect.option,
            Effect.map(
              Option.flatMap((bytes) =>
                Binding.fingerprintIssue(bytes, bindingPin),
              ),
            ),
          ),
    });
  });
