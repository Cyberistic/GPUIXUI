/**
 * The live host: `@gpuixui/testing`'s async smoke verbs over the automation API.
 *
 * A real window is driven through `@gpuix/native/automation`, whose calls are
 * promises. Every verb is lifted with `Effect.tryPromise`, so a protocol failure
 * names the call that broke instead of surfacing as a missing element or a
 * silent pass (`Smoke.SmokeHostError`).
 *
 * The protocol has no focus, highlight or virtual-list verb, so those three
 * read the **renderer** this runner created (`getFocusedElementId`,
 * `focusNext`/`focusPrevious`, `getPaintedHighlights`,
 * `getListScrollTop`/`scrollToItem`) — plans `190`, `197` and `565`. Style and
 * accessibility stay absent because `GpuixRenderer` exposes no
 * such method; those assertions belong to the `TestRenderer` suite.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import type { GpuixRenderer } from "@gpuix/native";
import { AutomationError } from "@gpuix/native/automation";
import type { App, Locator } from "@gpuix/native/automation";
import { Smoke } from "@gpuixui/testing";
import { testIdOf } from "./focus.js";
import { countNodes } from "./tree.js";
import { selectionDrag } from "./selection.js";

/** How long a live scenario waits for an element a click should have mounted. */
const WAIT_FOR_MS = 5_000;

/**
 * One frame between a drag's events.
 *
 * A live drag that sends its moves back to back does **not** resize: the
 * component's press state has not committed when the next move arrives, so the
 * moves are ignored (measured: `split=320` uncapped vs `400` paced). Pacing each
 * move by a frame is what a real pointer does anyway.
 */
const DRAG_FRAME_MS = 40;

/** Moves in a synthetic drag when the caller does not choose. */
const DRAG_STEPS = 6;

/** Lifts one protocol call, naming the verb if it rejects. */
const verb = <A>(
  name: string,
  run: () => Promise<A>,
): Effect.Effect<A, Smoke.SmokeHostError> =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new Smoke.SmokeHostError({ verb: name, cause }),
  });

/** The element id behind a `testId`, so the id-addressed calls can run. */
const idOf = (app: App, testId: string): Promise<number> =>
  app
    .getByTestId(testId)
    .element()
    .then((node) => node.id);

const at = (app: App, testId: string): Locator => app.getByTestId(testId);

/**
 * The protocol's answer for an element that exists but never painted.
 *
 * A retained-but-unpainted node has no bounds (`<canvas>` is the measured
 * case), and the window's own `bounds` reports that as `NotFound` rather than
 * as a painted box. `SmokeHost.bounds` models "not painted" as `null`, so the
 * adapter converts exactly that answer and leaves every other failure typed.
 */
const isUnpainted = (cause: unknown): boolean =>
  cause instanceof AutomationError &&
  cause.code === "NotFound" &&
  cause.message === "Element has no painted bounds";

/** A raw overlay mode decoded at the boundary; `None` for an undocumented value. */
const decodeOverlayMode = (
  raw: string,
): Option.Option<Smoke.FrameOverlayMode> =>
  Schema.decodeUnknownOption(Smoke.FrameOverlayMode)(raw);

/** A `Smoke.AsyncSmokeHost` over a connected automation `App`. */
export const createHost = (
  app: App,
  renderer: Pick<
    GpuixRenderer,
    | "getFocusedElementId"
    | "focusNext"
    | "focusPrevious"
    | "getPaintedHighlights"
    | "getListScrollTop"
    | "scrollToItem"
    | "scrollIntoView"
    | "getWindowSize"
    | "zoomWindow"
    | "getDebugFrameOverlayStats"
    | "resetDebugFrameOverlayStats"
    | "getDebugFrameOverlay"
    | "setDebugFrameOverlay"
    | "cycleDebugFrameOverlay"
  >,
): Smoke.AsyncSmokeHost => ({
  text: (testId) => verb(`text ${testId}`, () => at(app, testId).textContent()),
  paintedText: () =>
    verb("paintedText", () =>
      app.call("getPaintedText", {}).then((result) => result.text),
    ),
  bounds: (testId) =>
    Effect.gen(function* () {
      const nodes = yield* verb(`bounds ${testId}`, () =>
        at(app, testId).all(),
      );
      return yield* Option.match(Arr.head(nodes), {
        onNone: () => Effect.succeed(null),
        onSome: () =>
          Effect.tryPromise({
            try: () => at(app, testId).bounds(),
            catch: (cause) => cause,
          }).pipe(
            Effect.catchIf(isUnpainted, () => Effect.succeed(null)),
            Effect.mapError(
              (cause) =>
                new Smoke.SmokeHostError({
                  verb: `bounds ${testId}`,
                  cause,
                }),
            ),
          ),
      });
    }),
  windowSize: () =>
    Effect.map(
      Effect.try({
        try: () => renderer.getWindowSize(),
        catch: (cause) =>
          new Smoke.SmokeHostError({ verb: "windowSize", cause }),
      }),
      (size) =>
        new Smoke.WindowSize({ width: size.width, height: size.height }),
    ),
  retainedNodes: () =>
    verb("retainedNodes", () =>
      app
        .call("getTree", {})
        .then((result) => countNodes(Option.fromNullishOr(result.tree))),
    ),
  zoomWindow: () =>
    Effect.try({
      try: () => renderer.zoomWindow(),
      catch: (cause) => new Smoke.SmokeHostError({ verb: "zoomWindow", cause }),
    }),
  frameStats: () =>
    Effect.map(
      Effect.try({
        try: () => renderer.getDebugFrameOverlayStats(),
        catch: (cause) =>
          new Smoke.SmokeHostError({ verb: "frameStats", cause }),
      }),
      (raw) => Schema.decodeUnknownSync(Smoke.FrameStats)(raw),
    ),
  resetFrameStats: () =>
    Effect.try({
      try: () => renderer.resetDebugFrameOverlayStats(),
      catch: (cause) =>
        new Smoke.SmokeHostError({ verb: "resetFrameStats", cause }),
    }),
  overlayMode: () =>
    Effect.map(
      Effect.try({
        try: () => renderer.getDebugFrameOverlay(),
        catch: (cause) =>
          new Smoke.SmokeHostError({ verb: "overlayMode", cause }),
      }),
      decodeOverlayMode,
    ),
  setOverlayMode: (mode) =>
    Effect.map(
      Effect.try({
        try: () => renderer.setDebugFrameOverlay(mode),
        catch: (cause) =>
          new Smoke.SmokeHostError({ verb: "setOverlayMode", cause }),
      }),
      decodeOverlayMode,
    ),
  cycleOverlayMode: () =>
    Effect.map(
      Effect.try({
        try: () => renderer.cycleDebugFrameOverlay(),
        catch: (cause) =>
          new Smoke.SmokeHostError({ verb: "cycleOverlayMode", cause }),
      }),
      decodeOverlayMode,
    ),
  focused: () =>
    Effect.gen(function* () {
      const id = yield* Effect.try({
        try: () => renderer.getFocusedElementId(),
        catch: (cause) => new Smoke.SmokeHostError({ verb: "focused", cause }),
      });
      return yield* Option.match(Option.fromNullishOr(id), {
        onNone: () => Effect.succeed(null),
        onSome: (elementId) =>
          Effect.map(
            verb(`focused tree ${elementId}`, () =>
              app
                .call("getTree", {})
                .then((result) => testIdOf(result.tree, elementId)),
            ),
            Option.getOrNull,
          ),
      });
    }),
  focusNext: () =>
    Effect.try({
      try: () => renderer.focusNext(),
      catch: (cause) => new Smoke.SmokeHostError({ verb: "focusNext", cause }),
    }),
  focusPrevious: () =>
    Effect.try({
      try: () => renderer.focusPrevious(),
      catch: (cause) =>
        new Smoke.SmokeHostError({ verb: "focusPrevious", cause }),
    }),
  selectText: (fromTestId, toTestId) =>
    Effect.gen(function* () {
      const from = yield* verb(`select ${fromTestId} bounds`, () =>
        at(app, fromTestId).bounds(),
      );
      const to = yield* verb(`select ${toTestId} bounds`, () =>
        at(app, toTestId).bounds(),
      );
      const points = yield* Option.match(
        Option.all({
          from: Option.fromNullishOr(from),
          to: Option.fromNullishOr(to),
        }),
        {
          onNone: () =>
            Effect.fail(
              new Smoke.SmokeHostError({
                verb: `select ${fromTestId} -> ${toTestId} bounds`,
                cause: "bounds missing",
              }),
            ),
          onSome: (bounds) =>
            Effect.succeed(selectionDrag(bounds.from, bounds.to)),
        },
      );
      yield* verb("select drag", () =>
        app.mouse.drag(points.start, points.end, { steps: 12 }),
      );
      yield* Effect.sleep(Duration.millis(DRAG_FRAME_MS));
      return yield* verb("select read", () =>
        app.call("getSelectedText", {}).then((result) => result.text),
      );
    }),
  selectedText: () =>
    verb("selectedText", () =>
      app.call("getSelectedText", {}).then((result) => result.text),
    ),
  clearSelection: () =>
    verb("clearSelection", () =>
      app.call("clearSelection", {}).then(() => undefined),
    ),
  click: (testId) => verb(`click ${testId}`, () => at(app, testId).click()),
  clickWindow: (x, y, modifiers) =>
    verb(`clickWindow ${x},${y}`, () =>
      app.mouse
        .click({ x, y }, modifiers === undefined ? undefined : { modifiers })
        .then(() => undefined),
    ),
  pressWindow: (x, y) =>
    verb(`pressWindow ${x},${y}`, () => app.mouse.down({ x, y })),
  movePointer: (x, y) =>
    verb(`movePointer ${x},${y}`, () =>
      app.mouse.move({ x, y }, { pressedButton: 0 }),
    ),
  releasePointer: (x, y) =>
    verb(`releasePointer ${x},${y}`, () => app.mouse.up({ x, y })),
  rightClick: (testId) =>
    verb(`rightClick ${testId}`, () =>
      app.mouse.click(at(app, testId), { button: 2 }),
    ),
  hover: (testId) => verb(`hover ${testId}`, () => at(app, testId).hover()),
  waitFor: (testId) =>
    verb(`waitFor ${testId}`, () =>
      at(app, testId)
        .waitFor({ timeoutMs: WAIT_FOR_MS })
        .then(() => undefined),
    ),
  key: (keystroke) =>
    verb(`key ${keystroke}`, () =>
      app.call("keystrokes", { keys: keystroke }).then(() => undefined),
    ),
  keyDown: (testId, key, isHeld) =>
    verb(`keyDown ${testId} ${key}`, () =>
      idOf(app, testId).then((elementId) =>
        app.call("keyDown", { key, elementId, isHeld }).then(() => undefined),
      ),
    ),
  keyUp: (testId, key) =>
    verb(`keyUp ${testId} ${key}`, () =>
      idOf(app, testId).then((elementId) =>
        app.call("keyUp", { key, elementId }).then(() => undefined),
      ),
    ),
  wheel: (testId, deltaX, deltaY) =>
    verb(`wheel ${testId}`, () => at(app, testId).wheel(deltaX, deltaY)),
  drag: (testId, deltaX, deltaY, steps) =>
    Effect.gen(function* () {
      const start = yield* verb(`drag ${testId} start`, () =>
        at(app, testId).center(),
      );
      const total = steps ?? DRAG_STEPS;
      yield* verb(`drag ${testId} down`, () => app.mouse.down(start));
      yield* Effect.forEach(
        Arr.range(1, total),
        (step) =>
          Effect.gen(function* () {
            yield* Effect.sleep(Duration.millis(DRAG_FRAME_MS));
            yield* verb(`drag ${testId} move`, () =>
              app.mouse.move(
                {
                  x: start.x + (deltaX * step) / total,
                  y: start.y + (deltaY * step) / total,
                },
                { pressedButton: 0 },
              ),
            );
          }),
        { concurrency: 1, discard: true },
      );
      yield* Effect.sleep(Duration.millis(DRAG_FRAME_MS));
      yield* verb(`drag ${testId} up`, () =>
        app.mouse.up({ x: start.x + deltaX, y: start.y + deltaY }),
      );
    }),
  scrollOffset: (testId) =>
    verb(`scrollOffset ${testId}`, () =>
      idOf(app, testId).then((elementId) =>
        app
          .call("getScrollOffset", { elementId })
          .then((result) =>
            result.offset === null
              ? null
              : { x: result.offset[0], y: result.offset[1] },
          ),
      ),
    ),
  scrollIntoView: (testId) =>
    verb(`scrollIntoView ${testId}`, () =>
      idOf(app, testId).then((elementId) => {
        renderer.scrollIntoView(elementId);
      }),
    ),
  highlights: () =>
    Effect.try({
      try: () => Smoke.decodeHighlights(renderer.getPaintedHighlights()),
      catch: (cause) => new Smoke.SmokeHostError({ verb: "highlights", cause }),
    }),
  scrollToItem: (testId, index, offsetInItem) =>
    verb(`scrollToItem ${testId}`, () =>
      idOf(app, testId).then((elementId) => {
        renderer.scrollToItem(elementId, index, offsetInItem);
      }),
    ),
  listScrollTop: (testId) =>
    Effect.gen(function* () {
      const elementId = yield* verb(`listScrollTop ${testId} id`, () =>
        idOf(app, testId),
      );
      const raw = yield* Effect.try({
        try: () => renderer.getListScrollTop(elementId),
        catch: (cause) =>
          new Smoke.SmokeHostError({ verb: `listScrollTop ${testId}`, cause }),
      });
      return yield* Option.match(Option.fromNullishOr(raw), {
        onNone: () => Effect.succeed(null),
        onSome: (value) =>
          Option.match(Schema.decodeUnknownOption(Smoke.ListAnchor)(value), {
            onNone: () =>
              Effect.fail(
                new Smoke.SmokeHostError({
                  verb: `listScrollTop ${testId} shape`,
                  cause: value,
                }),
              ),
            onSome: Effect.succeed,
          }),
      });
    }),
  screenshot: (path) =>
    verb(`screenshot ${path}`, () =>
      app.screenshot({ path }).then(() => undefined),
    ),
  pauseMotion: () => verb("pauseMotion", () => app.clock.pause()),
  fastForwardMotion: (ms) =>
    verb(`fastForwardMotion ${ms}`, () => app.clock.fastForward(ms)),
});
