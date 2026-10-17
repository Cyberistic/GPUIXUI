/**
 * The live host: `@gpuixui/testing`'s async smoke verbs over the automation API.
 *
 * A real window is driven through `@gpuix/native/automation`, whose calls are
 * promises. Every verb is lifted with `Effect.tryPromise`, so a protocol failure
 * names the call that broke instead of surfacing as a missing element or a
 * silent pass (`Smoke.SmokeHostError`).
 *
 * Only the verbs the protocol exposes are implemented — see
 * `Smoke.AsyncSmokeHost`. Style reports, the accessibility dump and list
 * anchors are deliberately absent: those assertions belong to the
 * `TestRenderer` suite, which can observe them.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { GpuixRenderer } from "@gpuix/native";
import type { App, Locator } from "@gpuix/native/automation";
import { Smoke } from "@gpuixui/testing";
import { testIdOf } from "./focus.js";
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

/** A `Smoke.AsyncSmokeHost` over a connected automation `App`. */
export const createHost = (
  app: App,
  renderer: Pick<GpuixRenderer, "getFocusedElementId">,
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
        onSome: () => verb(`bounds ${testId}`, () => at(app, testId).bounds()),
      });
    }),
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
  keyDown: (testId, key) =>
    verb(`keyDown ${testId} ${key}`, () =>
      idOf(app, testId).then((elementId) =>
        app.call("keyDown", { key, elementId }).then(() => undefined),
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
  screenshot: (path) =>
    verb(`screenshot ${path}`, () =>
      app.screenshot({ path }).then(() => undefined),
    ),
  pauseMotion: () => verb("pauseMotion", () => app.clock.pause()),
  fastForwardMotion: (ms) =>
    verb(`fastForwardMotion ${ms}`, () => app.clock.fastForward(ms)),
});
