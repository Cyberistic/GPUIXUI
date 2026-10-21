/**
 * The live host: `AsyncSmokeHost` over a real window's automation API.
 *
 * A window is driven through `@gpuix/native/automation`, whose calls are
 * promises. Every verb is lifted with `Effect.tryPromise` and named, so a
 * protocol failure reads as `click save: ...` instead of as a missing element.
 *
 * Focus and paint come from the **renderer** the runner created
 * (`getFocusedElementId`, `getAutomationTree`) rather than from the protocol:
 * the protocol addresses elements, but only the renderer knows which one the
 * window focused and how it is named in the tree.
 */
import { Effect } from "effect";
import * as Option from "effect/Option";
import type { GpuixRenderer } from "@gpuix/native";
import { AutomationError } from "@gpuix/native/automation";
import type { App } from "@gpuix/native/automation";
import { Pixels, Smoke } from "@gpuixui/testing";
import { testIdOf, type LiveNode } from "./tree.js";

/** The renderer surface a live host reads; nothing else is needed. */
export type LiveRenderer = Pick<
  GpuixRenderer,
  "getFocusedElementId" | "focusElement" | "focusNext" | "getPaintedText"
>;

/** What the host needs from the runner. */
export interface LiveHostOptions {
  readonly app: App;
  readonly renderer: LiveRenderer;
  /** Resolves a capture name into an absolute path inside the run's artifacts. */
  readonly capturePath: (name: string) => string;
  /** Reads a capture's PNG bytes; the runner owns the filesystem effect. */
  readonly readCapture: (
    name: string,
  ) => Effect.Effect<Uint8Array, Smoke.SmokeHostError>;
  /** Inflates a PNG's compressed data; the runner injects the platform's zlib. */
  readonly inflate: (bytes: Uint8Array) => Uint8Array;
}

/** Lifts a protocol call, keeping the cause for the verb that names it. */
const raw = <A>(run: () => Promise<A>): Effect.Effect<A, unknown> =>
  Effect.tryPromise({ try: run, catch: (cause) => cause });

const sync = <A>(run: () => A): Effect.Effect<A, unknown> =>
  Effect.try({ try: run, catch: (cause) => cause });

/** Names a failure by the verb that broke. */
const named = <A>(
  verb: string,
  effect: Effect.Effect<A, unknown>,
): Effect.Effect<A, Smoke.SmokeHostError> =>
  Effect.mapError(effect, (cause) => new Smoke.SmokeHostError({ verb, cause }));

const call = <A>(
  verb: string,
  run: () => Promise<A>,
): Effect.Effect<A, Smoke.SmokeHostError> => named(verb, raw(run));

/** The protocol's "exists but never painted" answer; every other failure is real. */
const isUnpainted = (cause: unknown): boolean =>
  cause instanceof AutomationError && cause.code === "NotFound";

/** The tree the automation protocol reports, or `None` before the first frame. */
const treeOf = (
  app: App,
): Effect.Effect<Option.Option<LiveNode>, Smoke.SmokeHostError> =>
  call("getTree", () => app.call("getTree", {})).pipe(
    Effect.map((result) => Option.fromNullishOr(result.tree)),
  );

/** An `AsyncSmokeHost` over a connected window. */
export const createLiveHost = ({
  app,
  renderer,
  capturePath,
  readCapture,
  inflate,
}: LiveHostOptions): Smoke.AsyncSmokeHost => {
  const at = (testId: string) => app.getByTestId(testId);

  return {
    text: (testId) => call(`text ${testId}`, () => at(testId).textContent()),
    paintedText: () =>
      named(
        "getPaintedText",
        sync(() => renderer.getPaintedText()),
      ),
    bounds: (testId) =>
      Effect.gen(function* () {
        const bounds = yield* raw(() => at(testId).bounds()).pipe(
          Effect.catchIf(isUnpainted, () => Effect.succeed(null)),
          (effect) => named(`bounds ${testId}`, effect),
        );
        return bounds;
      }),
    focused: () =>
      Effect.gen(function* () {
        const id = yield* named(
          "getFocusedElementId",
          sync(() => renderer.getFocusedElementId()),
        );
        if (id === null) return null;
        const tree = yield* treeOf(app);
        return Option.getOrNull(
          Option.flatMap(tree, (node) => testIdOf(node, id)),
        );
      }),
    click: (testId) => call(`click ${testId}`, () => at(testId).click()),
    key: (keystroke) =>
      call(`key ${keystroke}`, () =>
        app.call("keystrokes", { keys: keystroke }),
      ),
    focusNext: () =>
      named(
        "focusNext",
        sync(() => renderer.focusNext()),
      ),
    focusElement: (testId) =>
      Effect.gen(function* () {
        const node = yield* call(`focusElement ${testId}`, () =>
          at(testId).element(),
        );
        yield* named(
          `focusElement ${testId}`,
          sync(() => renderer.focusElement(node.id)),
        );
      }),
    waitFor: (testId) =>
      call(`waitFor ${testId}`, () => at(testId).waitFor()).pipe(Effect.asVoid),
    capture: (name) =>
      call(`capture ${name}`, () =>
        app.screenshot({ path: capturePath(name) }),
      ).pipe(Effect.asVoid),
    pixels: (name) =>
      Effect.gen(function* () {
        const bytes = yield* readCapture(name);
        const frame = Pixels.decodePng(bytes, inflate);
        if (frame instanceof Pixels.PngDecodeError) {
          return yield* Effect.fail(
            new Smoke.SmokeHostError({ verb: `pixels ${name}`, cause: frame }),
          );
        }
        return frame;
      }),
  };
};
