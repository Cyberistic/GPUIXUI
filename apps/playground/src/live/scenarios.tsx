/**
 * The live scenarios: the shipped playground driven in a real window.
 *
 * They are deliberately few. A live window proves that the core mechanisms
 * transfer out of the offscreen `TestRenderer`; it does not repeat the 56-check
 * suite, and it cannot assert colour, the accessibility dump or virtual-list
 * anchors — the automation protocol does not expose them (plan `189` §2).
 *
 * Each scenario provides its own view, which the runner mounts in the real
 * window under a keyed `Fragment` — the live twin of plan `182`'s isolation.
 */
import type { ReactNode } from "react";
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Smoke } from "@gpuixui/testing";
import { App } from "../app.js";
import { inputScenario } from "../scenarios/input.js";
import { panelScenario } from "../scenarios/panel.js";
import { scrollScenario } from "../scenarios/scroll.js";
import { scenarios } from "../scenarios/index.js";

/** Window size the runner opens. A check compares the shell against it. */
export const WINDOW = { width: 1100, height: 720 } as const;

/** Where the live run writes its screenshots, relative to the repo root. */
export const LIVE_ARTIFACTS = "apps/playground/.artifacts/live";

/** A live scenario: the async smoke scenario plus the view the window mounts. */
export interface LiveScenario extends Smoke.AsyncSmokeScenario {
  readonly view: () => ReactNode;
  /** The `testId` that proves the mount committed, when one does. */
  readonly ready?: string;
}

/**
 * Waits for the frame loop to commit the last input.
 *
 * The automation protocol has no frame boundary: `simulateClick` returns after
 * a tick, while React's commit lands on a later frame. Every live step settles
 * before reading, exactly as a human glance would.
 */
export const settle: Effect.Effect<void> = Effect.sleep(Duration.millis(120));

/** The registry title for `id`, so a live check never restates it. */
const titleOf = (id: string): string =>
  Option.getOrElse(
    Option.map(
      Arr.findFirst(scenarios, (candidate) => candidate.id === id),
      (candidate) => candidate.title,
    ),
    () => "none",
  );

type LiveContext = Smoke.SmokeContext<Smoke.AsyncSmokeHost>;

/** The text `testId` paints, or a failure naming the missing id. */
const textOf = (ctx: LiveContext, testId: string) =>
  Effect.gen(function* () {
    const text = yield* ctx.host.text(testId);
    return yield* ctx.expectSome(
      `${testId} is painted`,
      Option.fromNullishOr(text),
    );
  });

/** The offset `testId` reports, or a failure naming the missing id. */
const offsetOf = (ctx: LiveContext, testId: string) =>
  Effect.gen(function* () {
    const offset = yield* ctx.host.scrollOffset(testId);
    return yield* ctx.expectSome(
      `${testId} reports an offset`,
      Option.fromNullishOr(offset),
    );
  });

const shell: LiveScenario = {
  id: "live-shell",
  title: "Live shell: window, navigation and keyboard",
  capability: "layout",
  view: () => <App list={scenarios} />,
  ready: "app-shell",
  steps: (ctx) =>
    Effect.gen(function* () {
      const bounds = yield* ctx.host.bounds("app-shell");
      const box = yield* ctx.expectSome(
        "the shell is painted",
        Option.fromNullishOr(bounds),
      );
      yield* ctx.expectNear(
        "the shell fills the window width",
        box.width,
        WINDOW.width,
        1,
      );
      yield* ctx.expectNear(
        "the shell fills the window height",
        box.height,
        WINDOW.height,
        1,
      );

      yield* ctx.host.click("nav-text-native");
      yield* ctx.host.waitFor("text-plain");
      yield* settle;
      const clicked = yield* textOf(ctx, "stage-title");
      yield* ctx.expectEqual(
        "clicking an entry mounts its view",
        clicked,
        titleOf("text-native"),
      );
      const stage = yield* textOf(ctx, "app-shell");
      yield* ctx.expectContains(
        "the mounted view paints its own content",
        stage,
        "hello gpuix",
      );

      yield* ctx.host.keyDown("nav-input-edit", "enter");
      yield* ctx.host.waitFor("input-field");
      yield* settle;
      const entered = yield* textOf(ctx, "stage-title");
      yield* ctx.expectEqual(
        "Enter on a focused entry switches the stage",
        entered,
        titleOf("input-edit"),
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${shell.id}.png`);
    }),
};

const input: LiveScenario = {
  id: "live-input",
  title: "Live input: typing and submit in a real editor",
  capability: "input",
  view: inputScenario.view,
  ready: "input-field",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.host.click("input-field");
      yield* ctx.host.key("h i");
      yield* settle;
      const typed = yield* textOf(ctx, "input-readout");
      yield* ctx.expectContains(
        "typing reaches onChange in the live editor",
        typed,
        "value=hi",
      );

      yield* ctx.host.key("enter");
      yield* settle;
      const submitted = yield* textOf(ctx, "input-readout");
      yield* ctx.expectContains(
        "Enter reaches onSubmit",
        submitted,
        "submits=1",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${input.id}.png`);
    }),
};

const scroll: LiveScenario = {
  id: "live-scroll",
  title: "Live scroll: the wheel moves a live container",
  capability: "scroll",
  view: scrollScenario.view,
  ready: "scroll-view",
  steps: (ctx) =>
    Effect.gen(function* () {
      const before = yield* offsetOf(ctx, "scroll-view");
      yield* ctx.expectEqual("the container starts at the top", before.y, 0);

      yield* ctx.host.wheel("scroll-view", 0, -200);
      yield* settle;
      const after = yield* offsetOf(ctx, "scroll-view");
      yield* ctx.expectEqual(
        "a negative deltaY scrolls down",
        after.y < 0,
        true,
      );
      const readout = yield* textOf(ctx, "scroll-readout");
      yield* ctx.expectContains(
        "onScroll reports the delta",
        readout,
        "delta=-200",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${scroll.id}.png`);
    }),
};

const panel: LiveScenario = {
  id: "live-panel",
  title: "Live panel: pointer capture holds through a divider drag",
  capability: "panel",
  view: panelScenario.view,
  ready: "panel-divider",
  steps: (ctx) =>
    Effect.gen(function* () {
      const before = yield* textOf(ctx, "panel-readout");
      yield* ctx.expectContains("the split starts at 320", before, "split=320");

      yield* ctx.host.drag("panel-divider", 80, 0, 6);
      yield* settle;
      const grown = yield* textOf(ctx, "panel-readout");
      yield* ctx.expectContains(
        "the drag grew the pane by 80",
        grown,
        "split=400",
      );

      const pane = yield* ctx.host.bounds("panel-pane-a");
      const box = yield* ctx.expectSome(
        "pane A is painted",
        Option.fromNullishOr(pane),
      );
      yield* ctx.expectNear(
        "the measured pane matches the readout",
        box.width,
        400,
        2,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${panel.id}.png`);
    }),
};

/** The live suite, in run order. */
export const liveScenarios: ReadonlyArray<LiveScenario> = [
  shell,
  input,
  scroll,
  panel,
];
