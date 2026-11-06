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

export const STAGE_TARGET = "data-charts-core";

export const STAGE_MARKER = "chart-donut";

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
