import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { GpuixRenderer } from "@gpuix/native";
import { AutomationError } from "@gpuix/native/automation";
import type { App } from "@gpuix/native/automation";
import { Pixels, Smoke } from "@gpuixui/testing";
import { testIdOf, type LiveNode } from "./tree.js";

export type LiveRenderer = Pick<
  GpuixRenderer,
  | "getFocusedElementId"
  | "focusElement"
  | "focusNext"
  | "blur"
  | "getPaintedText"
  | "getSelectedText"
  | "clearSelection"
  | "simulateKeyUp"
  | "registerFont"
  | "scrollToItem"
  | "getListScrollTop"
  | "getWindowSize"
  | "zoomWindow"
  | "activateWindow"
>;

export type LiveFontRegistrar = Pick<GpuixRenderer, "registerFont">;

export interface LiveHostOptions {
  readonly app: App;
  readonly renderer: LiveRenderer;

  readonly capturePath: (name: string) => string;

  readonly readCapture: (
    name: string,
  ) => Effect.Effect<Uint8Array, Smoke.SmokeHostError>;

  readonly inflate: (bytes: Uint8Array) => Uint8Array;
}

const raw = <A>(run: () => Promise<A>): Effect.Effect<A, unknown> =>
  Effect.tryPromise({ try: run, catch: (cause) => cause });

const sync = <A>(run: () => A): Effect.Effect<A, unknown> =>
  Effect.try({ try: run, catch: (cause) => cause });

const named = <A>(
  verb: string,
  effect: Effect.Effect<A, unknown>,
): Effect.Effect<A, Smoke.SmokeHostError> =>
  Effect.mapError(effect, (cause) => new Smoke.SmokeHostError({ verb, cause }));

const call = <A>(
  verb: string,
  run: () => Promise<A>,
): Effect.Effect<A, Smoke.SmokeHostError> => named(verb, raw(run));

const isUnpainted = (cause: unknown): boolean =>
  cause instanceof AutomationError && cause.code === "NotFound";

const treeOf = (
  app: App,
): Effect.Effect<Option.Option<LiveNode>, Smoke.SmokeHostError> =>
  call("getTree", () => app.call("getTree", {})).pipe(
    Effect.map((result) => Option.fromNullishOr(result.tree)),
  );

export const fontInstaller =
  (registrar: LiveFontRegistrar): Smoke.AsyncSmokeHost["registerFont"] =>
  (bytes) =>
    named(
      "registerFont",
      sync(() => registrar.registerFont(Buffer.from(bytes))),
    );

export interface PressableLocator {
  readonly click: (options: {
    readonly button?: number;
    readonly modifiers?: string;
  }) => Promise<void>;
}

export interface TextLocator {
  readonly getByText: (text: string) => {
    readonly click: () => Promise<void>;
  };
}

export const textPress = (app: TextLocator, text: string): Promise<void> =>
  app.getByText(text).click();

export const rightPress = (locator: PressableLocator): Promise<void> =>
  locator.click({ button: 2 });

export const modifiedPress = (
  locator: PressableLocator,
  modifiers: ReadonlyArray<Smoke.PointerModifier>,
): Promise<void> =>
  locator.click({ modifiers: Smoke.formatModifiers(modifiers) });

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
    activateWindow: () =>
      named(
        "activateWindow",
        sync(() => renderer.activateWindow()),
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
    clickText: (text) => call(`clickText ${text}`, () => textPress(app, text)),
    rightClick: (testId) =>
      call(`rightClick ${testId}`, () => rightPress(at(testId))),
    clickWith: (testId, modifiers) =>
      call(`clickWith ${testId}`, () => modifiedPress(at(testId), modifiers)),
    hover: (testId) => call(`hover ${testId}`, () => at(testId).hover()),
    hoverAt: (testId, offset) =>
      Effect.gen(function* () {
        const box = yield* call(`hoverAt ${testId}`, () => at(testId).bounds());
        yield* call(`hoverAt ${testId}`, () =>
          app.mouse.move({ x: box.x + offset.x, y: box.y + offset.y }),
        );
      }),
    clickAt: (testId, offset) =>
      Effect.gen(function* () {
        const box = yield* call(`clickAt ${testId}`, () => at(testId).bounds());
        const point = { x: box.x + offset.x, y: box.y + offset.y };

        yield* call(`clickAt ${testId}`, () => app.mouse.move(point));
        yield* call(`clickAt ${testId}`, () => app.mouse.click(point));
      }),
    drag: (testId, deltaX, deltaY, options) =>
      call(`drag ${testId}`, () => at(testId).dragBy(deltaX, deltaY, options)),

    wheel: (testId, deltaX, deltaY) =>
      call(`wheel ${testId}`, () => at(testId).wheel(deltaX, deltaY)),

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

    keyDown: (keystroke, isHeld) =>
      call(`keyDown ${keystroke} held=${isHeld}`, () =>
        app.call("keyDown", { key: keystroke, isHeld }),
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
    blur: () =>
      named(
        "blur",
        sync(() => renderer.blur()),
      ),
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
