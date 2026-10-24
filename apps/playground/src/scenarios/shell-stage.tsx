/**
 * `shell-stage-scroll` — the bottom of a tall scenario can be reached.
 *
 * The shell's stage is a scrolling box (`overflow: "scroll"`, `minHeight: 0`)
 * for the same reason the sidebar is: the tallest scenario the registry paints
 * is taller than the window, and a stage that clipped instead of scrolling would
 * hide everything past the fold with no way to reach it. The sidebar's scroller
 * has a regression guard (`shell-navigation`); the stage's had none. What makes
 * the box scroll was measured by removing it: **`overflow: "scroll"`** is the
 * declaration the probe depends on (without it the stage reports no scroll
 * offset at all), while dropping `minHeight: 0` still scrolls, because a scroll
 * container's automatic minimum size is already zero.
 *
 * `data-charts-core` is the tall entry, measured rather than assumed: of the
 * registry's views it is the one whose content exceeds the stage (its charts
 * stack to ~916px in a 714px stage). Measured on 0.11.0 (offscreen renderer):
 *
 *   - the app opens on a scenario that fits, and the stage's offset is `0, 0`;
 *   - pressing that entry's row mounts it, and its **last** chart — the donut at
 *     the bottom of the column — starts outside the stage's box;
 *   - wheeling over the stage scrolls it to the end (offset `-202` here), and
 *     the donut ends inside the stage's box while the painted content moved up.
 */
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { App } from "../app.js";
import { scenarios } from "./index.js";
import {
  SHELL_LIST,
  inside,
  navId,
  press,
  revealRow,
  scrollToEnd,
} from "./shell-nav.js";
import type { ScenarioBody } from "../types.js";

/** The tall entry the registry paints, and its view's bottom-most marker. */
export const STAGE_TARGET = "data-charts-core";
/** The last chart in that view's column. */
export const STAGE_MARKER = "chart-donut";
/** The stage's own scroller. */
export const STAGE = "app-stage";

export const shellStageScenario: ScenarioBody = {
  view: () => <App list={scenarios} />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const target = yield* ctx.expectSome(
        "the tall entry is in the registry",
        Arr.findFirst(scenarios, (scenario) => scenario.id === STAGE_TARGET),
      );

      const atRest = yield* ctx.expectSome(
        "the stage reports a scroll offset",
        Option.fromNullishOr(ctx.host.scrollOffset(STAGE)),
      );
      yield* ctx.expectEqual("the stage starts at the top", atRest.y, 0);

      yield* ctx.expectSome(
        "the entry a press opens is on screen",
        yield* revealRow(ctx, SHELL_LIST, navId(target.id)),
      );
      press(ctx, navId(target.id));

      const stage = yield* ctx.expectSome(
        "the stage paints a box",
        Option.fromNullishOr(ctx.host.bounds(STAGE)),
      );
      const above = yield* ctx.expectSome(
        "the pressed scenario paints its last chart",
        Option.fromNullishOr(ctx.host.bounds(STAGE_MARKER)),
      );
      yield* ctx.expectEqual(
        "the scenario is taller than the stage",
        inside(stage, above),
        false,
      );

      const scrolled = yield* ctx.expectSome(
        "the stage still reports an offset after the wheel",
        yield* scrollToEnd(ctx, STAGE),
      );
      yield* ctx.expectEqual(
        "the wheel scrolled the stage",
        scrolled.y < 0,
        true,
      );

      const below = yield* ctx.expectSome(
        "the last chart is still painted at the end",
        Option.fromNullishOr(ctx.host.bounds(STAGE_MARKER)),
      );
      yield* ctx.expectEqual(
        "the bottom of the scenario is inside the stage",
        inside(stage, below),
        true,
      );
      yield* ctx.expectEqual(
        "the last chart moved up",
        below.y < above.y,
        true,
      );
    }),
};
