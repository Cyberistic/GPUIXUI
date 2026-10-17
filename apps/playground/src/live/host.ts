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
import { Effect } from "effect";
import type { App, Locator } from "@gpuix/native/automation";
import { Smoke } from "@gpuixui/testing";

/** How long a live scenario waits for an element a click should have mounted. */
const WAIT_FOR_MS = 5_000;

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
export const createHost = (app: App): Smoke.AsyncSmokeHost => ({
  text: (testId) => verb(`text ${testId}`, () => at(app, testId).textContent()),
  paintedText: () =>
    verb("paintedText", () =>
      app.call("getPaintedText", {}).then((result) => result.text),
    ),
  bounds: (testId) => verb(`bounds ${testId}`, () => at(app, testId).bounds()),
  click: (testId) => verb(`click ${testId}`, () => at(app, testId).click()),
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
    verb(`drag ${testId}`, () =>
      at(app, testId).dragBy(deltaX, deltaY, { steps }),
    ),
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
