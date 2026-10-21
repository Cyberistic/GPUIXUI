/**
 * The native-renderer guard (plan 117 §5a–5b).
 *
 * The measured fact this file exists for: `@gpuix/native` resolves its binding
 * eagerly, so a **static** `import "@gpuix/react/testing"` throws on a host with
 * no published binding and the whole test file fails to load — `describe.skipIf`
 * never gets the chance to decide. The guard therefore loads the testing entry
 * through a lifted dynamic import, so it runs on every host and reports which of
 * three worlds it is in:
 *
 * - `available`        the binding loads and the real test renderer exists
 * - `unsupported-host` this platform/arch has no published binding
 * - `missing`          a supported host that cannot load it — a real failure
 *
 * Evidence for `unsupported-host` (measured on 0.11.0, 2026-10-21):
 * `@gpuix/native@0.11.0` publishes `-darwin-arm64`, `-linux-x64-gnu`,
 * `-win32-x64-msvc` and `-win32-arm64-msvc` only, and the failure chain on this
 * Intel Mac names `@gpuix/native-darwin-x64` and
 * `./gpuix-native.darwin-x64.node`. `TODO.md` → Blockers, ADR 0001/0002.
 */

import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Schema from "effect/Schema";

/** Where this host sits relative to the native test renderer. */
type RendererState = "available" | "unsupported-host" | "missing";

/** The `platform-arch` of every host GPUix publishes a binding for. */
const supportedHosts: ReadonlyArray<string> = [
  "darwin-arm64",
  "linux-x64",
  "win32-x64",
  "win32-arm64",
];

/** The host, in the form the list above uses. */
const host = `${process.platform}-${process.arch}`;

/** The binding is not loadable here, with the reason the loader gave. */
class NativeRendererUnavailable extends Schema.TaggedError<NativeRendererUnavailable>()(
  "NativeRendererUnavailable",
  { host: Schema.String, reason: Schema.String },
) {}

const loadTesting = Effect.tryPromise({
  try: () => import("@gpuix/react/testing"),
  catch: (cause) =>
    new NativeRendererUnavailable({ host, reason: String(cause) }),
});

const rendererState: Effect.Effect<RendererState> = loadTesting.pipe(
  Effect.match({
    onSuccess: (module): RendererState =>
      module.hasNativeTestRenderer ? "available" : "missing",
    onFailure: (): RendererState => "unsupported-host",
  }),
);

const rendererReason: Effect.Effect<string> = loadTesting.pipe(
  Effect.match({
    onSuccess: () => "",
    onFailure: (error) => error.reason,
  }),
);

describe("the GPUix native test renderer", () => {
  it.effect("is available, or the host is one GPUix does not publish for", () =>
    Effect.gen(function* () {
      const state = yield* rendererState;
      // A supported host that cannot load the renderer is a failure, never a
      // skip: that is the whole point of this file.
      expect(state === "available" || !supportedHosts.includes(host)).toBe(
        true,
      );
      expect(state).not.toBe("missing");
    }),
  );

  it.effect(
    "reports the missing binding rather than an unrelated failure",
    () =>
      Effect.gen(function* () {
        const state = yield* rendererState;
        if (state === "available") return;
        const reason = yield* rendererReason;
        expect(reason).toContain("native");
      }),
  );
});
