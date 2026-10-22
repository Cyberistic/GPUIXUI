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
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { GpuixRenderer } from "@gpuix/native";
import { AutomationError } from "@gpuix/native/automation";
import type { App } from "@gpuix/native/automation";
import { Pixels, Smoke } from "@gpuixui/testing";
import { testIdOf, type LiveNode } from "./tree.js";

/** The renderer surface a live host reads; nothing else is needed. */
export type LiveRenderer = Pick<
  GpuixRenderer,
  | "getFocusedElementId"
  | "focusElement"
  | "focusNext"
  | "getPaintedText"
  | "getSelectedText"
  | "clearSelection"
  | "simulateKeyUp"
  | "registerFont"
  | "scrollToItem"
  | "getListScrollTop"
  | "getWindowSize"
  | "zoomWindow"
>;

/**
 * The renderer surface that installs a font file, unnamed so a fake can stand in
 * for a real renderer in a unit test.
 */
export type LiveFontRegistrar = Pick<GpuixRenderer, "registerFont">;

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

/**
 * Installs a font file in a renderer, after the first paint.
 *
 * The renderer takes a Node `Buffer`; a probe names bytes, so the conversion
 * lives here at the platform boundary and the probe stays platform-free.
 */
export const fontInstaller =
  (registrar: LiveFontRegistrar): Smoke.AsyncSmokeHost["registerFont"] =>
  (bytes) =>
    named(
      "registerFont",
      sync(() => registrar.registerFont(Buffer.from(bytes))),
    );

/**
 * The locator surface a right press needs, named so a fake can stand in for the
 * automation protocol in a unit test.
 */
export interface PressableLocator {
  readonly click: (options: { readonly button: number }) => Promise<void>;
}

/**
 * Presses a locator's element with the right button.
 *
 * The button number is the whole contract: a primary press (0) fires `onClick`
 * and never `onAuxClick`, so a context menu would silently never open — the
 * failure mode this verb exists to make measurable.
 */
export const rightPress = (locator: PressableLocator): Promise<void> =>
  locator.click({ button: 2 });

/**
 * Reads the renderer's `[itemIndex, offsetInItem, viewportHeight]` anchor.
 *
 * A tuple is a positional shape, so a short one is not an anchor: returning
 * `null` keeps a probe from asserting an index the runtime never reported.
 */
export const listAnchorOf = (
  anchor: ReadonlyArray<number> | null,
): Smoke.ListAnchor | null =>
  Option.match(Option.fromNullishOr(anchor), {
    onNone: () => null,
    onSome: (values) =>
      Option.match(
        Option.all([
          Arr.get(values, 0),
          Arr.get(values, 1),
          Arr.get(values, 2),
        ]),
        {
          onNone: () => null,
          onSome: ([itemIndex, offsetInItem, viewportHeight]) => ({
            itemIndex,
            offsetInItem,
            viewportHeight,
          }),
        },
      ),
  });

/**
 * A window size read back from the renderer, or `None` when it cannot lay out.
 *
 * `getWindowSize` used to answer a hardcoded 800x600, so the number is a
 * boundary rather than a fact: a zero, negative or non-finite dimension is not
 * a window a probe can assert a layout against, and reporting it as missing is
 * better than measuring against a size the renderer never laid out.
 */
export const windowSizeOf = (
  raw: Option.Option<{ readonly width: number; readonly height: number }>,
): Option.Option<Smoke.Size> =>
  Option.map(
    Option.filter(
      raw,
      (size) =>
        Number.isFinite(size.width) &&
        size.width > 0 &&
        Number.isFinite(size.height) &&
        size.height > 0,
    ),
    (size) => ({ width: size.width, height: size.height }),
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
    /**
     * The renderer's own paintable size. A probe compares it with the app's
     * `useWindowSize()` readout and with the box a flexible pane paints, so a
     * hardcoded answer from the binding fails the layout check instead of
     * passing as a plausible number.
     */
    windowSize: () =>
      Effect.gen(function* () {
        const raw = yield* named(
          "getWindowSize",
          sync(() => renderer.getWindowSize()),
        );
        return yield* Option.match(windowSizeOf(Option.fromNullishOr(raw)), {
          onNone: () =>
            Effect.fail(
              new Smoke.SmokeHostError({
                verb: "getWindowSize",
                cause: "the renderer reported no paintable size",
              }),
            ),
          onSome: (size) => Effect.succeed(size),
        });
      }),
    zoomWindow: () =>
      named(
        "zoomWindow",
        sync(() => renderer.zoomWindow()),
      ),
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
    rightClick: (testId) =>
      call(`rightClick ${testId}`, () => rightPress(at(testId))),
    hover: (testId) => call(`hover ${testId}`, () => at(testId).hover()),
    drag: (testId, deltaX, deltaY) =>
      call(`drag ${testId}`, () => at(testId).dragBy(deltaX, deltaY)),
    /**
     * The protocol's locator aims one wheel event at the element's painted
     * centre, which is the hit-tested path a pointer takes. `app.call` would
     * need window coordinates the probe does not know; the locator resolves
     * them from the last frame.
     */
    wheel: (testId, deltaX, deltaY) =>
      call(`wheel ${testId}`, () => at(testId).wheel(deltaX, deltaY)),
    /** The renderer's scroll pair for the element the locator names, or `null`. */
    scrollOffset: (testId) =>
      Effect.gen(function* () {
        const node = yield* call(`scrollOffset ${testId}`, () =>
          at(testId).element(),
        );
        const result = yield* call(`scrollOffset ${testId}`, () =>
          app.call("getScrollOffset", { elementId: node.id }),
        );
        return Option.match(Option.fromNullishOr(result.offset), {
          onNone: () => null,
          onSome: ([x, y]) => ({ x, y }),
        });
      }),
    scrollToItem: (testId, index, offsetInItem) =>
      Effect.gen(function* () {
        const node = yield* call(`scrollToItem ${testId}`, () =>
          at(testId).element(),
        );
        yield* named(
          `scrollToItem ${testId}`,
          sync(() => renderer.scrollToItem(node.id, index, offsetInItem)),
        );
      }),
    listAnchor: (testId) =>
      Effect.gen(function* () {
        const node = yield* call(`listAnchor ${testId}`, () =>
          at(testId).element(),
        );
        const anchor = yield* named(
          `listAnchor ${testId}`,
          sync(() => renderer.getListScrollTop(node.id)),
        );
        return listAnchorOf(anchor);
      }),
    key: (keystroke) =>
      call(`key ${keystroke}`, () =>
        app.call("keystrokes", { keys: keystroke }),
      ),
    selectedText: () =>
      named(
        "getSelectedText",
        sync(() => renderer.getSelectedText()),
      ),
    clearSelection: () =>
      named(
        "clearSelection",
        sync(() => renderer.clearSelection()),
      ),
    keyUp: (keystroke) =>
      named(
        `keyUp ${keystroke}`,
        sync(() => renderer.simulateKeyUp(keystroke)),
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
    registerFont: fontInstaller(renderer),
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
    clockPause: () =>
      call("clockPause", () => app.clock.pause()).pipe(
        Effect.mapError(
          (cause) => new Smoke.SmokeHostError({ verb: "clockPause", cause }),
        ),
      ),
    clockFastForward: (deltaMs) =>
      call("clockFastForward", () => app.clock.fastForward(deltaMs)).pipe(
        Effect.mapError(
          (cause) =>
            new Smoke.SmokeHostError({ verb: "clockFastForward", cause }),
        ),
      ),
    clockResume: () =>
      call("clockResume", () => app.clock.resume()).pipe(
        Effect.mapError(
          (cause) => new Smoke.SmokeHostError({ verb: "clockResume", cause }),
        ),
      ),
  };
};
