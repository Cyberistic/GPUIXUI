/**
 * Runtime preflight for the native smoke suite.
 *
 * The package never names a `@gpuix/*` module: the caller supplies the loader,
 * so a host with no native binding gets a typed `RuntimeUnsupported` value
 * instead of a crash. `@gpuixui/testing` is the platform-free half of the
 * suite; the app owns the native half.
 */
import { Effect, Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

/** The native binding loaded on this host. */
export class RuntimeReady extends Schema.Class<RuntimeReady>("RuntimeReady")({
  _tag: Schema.tag("RuntimeReady"),
  platform: Schema.String,
  arch: Schema.String,
  detail: Schema.String,
}) {}

/** The native binding could not be loaded on this host. */
export class RuntimeUnsupported extends Schema.Class<RuntimeUnsupported>(
  "RuntimeUnsupported",
)({
  _tag: Schema.tag("RuntimeUnsupported"),
  platform: Schema.String,
  arch: Schema.String,
  reason: Schema.String,
  hint: Schema.String,
}) {}

/** The outcome of the preflight, discriminated by `_tag`. */
export const RuntimeStatus = Schema.Union([
  RuntimeReady,
  RuntimeUnsupported,
]).pipe(Schema.toTaggedUnion("_tag"));
/** The outcome of the preflight, discriminated by `_tag`. */
export type RuntimeStatus = typeof RuntimeStatus.Type;

const DARWIN_ARM64 =
  "support is expected on Apple Silicon; a failure means the install is " +
  "broken — reinstall `@gpuix/native` at the exact version of `@gpuix/react`.";
const DARWIN_X64 =
  "GPUix 0.10.0 publishes no darwin-x64 binding (targets: darwin-arm64, " +
  "linux-x64, win32-x64). Run the smoke suite on an Apple Silicon Mac, x64 " +
  "Linux or x64 Windows.";
const LINUX_X64 =
  "the native binding loads, but `TestRenderer`/`createTestRoot` are macOS " +
  "and Windows only (no wgpu read-back): live-app smoke only.";
const WINDOWS =
  "Windows publishes x64 and arm64 bindings and `TestRenderer` works there: " +
  "this is a supported host for the whole suite.";
const UNKNOWN_TARGET =
  "no published binding for this target; `@gpuix/native` `napi.targets` " +
  "lists darwin-arm64, linux-x64, win32-x64 and win32-arm64.";

/** Pure. Maps a platform/arch pair to the actionable remedy. Never throws. */
export const bindingHint = (platform: string, arch: string): string =>
  Match.value({ platform, arch }).pipe(
    Match.when({ platform: "darwin", arch: "arm64" }, () => DARWIN_ARM64),
    Match.when({ platform: "darwin", arch: "x64" }, () => DARWIN_X64),
    Match.when({ platform: "linux", arch: "x64" }, () => LINUX_X64),
    Match.when({ platform: "win32" }, () => WINDOWS),
    Match.orElse(() => UNKNOWN_TARGET),
  );

const firstLine = (text: string): string =>
  pipe(
    Str.split("\n")(text),
    Arr.head,
    Option.getOrElse(() => text),
    Str.trim,
  );

const reasonOf = (cause: unknown): string =>
  Match.value(cause).pipe(
    Match.when(P.isError, (error) => firstLine(error.message)),
    Match.orElse(() => "the native loader rejected without an Error"),
  );

/** What the caller supplies: the host identity and the module to load. */
export interface DetectRuntimeInput {
  readonly platform: string;
  readonly arch: string;
  readonly load: () => Promise<unknown>;
}

/**
 * Loads the caller's binding and reports the outcome.
 *
 * Never fails: a rejecting loader is data (`RuntimeUnsupported`), not a defect,
 * so the suite can explain an unsupported host instead of crashing.
 */
export const detectRuntime = (
  input: DetectRuntimeInput,
): Effect.Effect<RuntimeStatus> =>
  Effect.tryPromise({
    try: () => input.load(),
    catch: reasonOf,
  }).pipe(
    Effect.match({
      onFailure: (reason) =>
        new RuntimeUnsupported({
          platform: input.platform,
          arch: input.arch,
          reason,
          hint: bindingHint(input.platform, input.arch),
        }),
      onSuccess: () =>
        new RuntimeReady({
          platform: input.platform,
          arch: input.arch,
          detail: "binding loaded",
        }),
    }),
  );
