import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Schema from "effect/Schema";

type RendererState = "available" | "unsupported-host" | "missing";

const supportedHosts: ReadonlyArray<string> = [
  "darwin-arm64",
  "linux-x64",
  "win32-x64",
  "win32-arm64",
];

const host = `${process.platform}-${process.arch}`;

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
