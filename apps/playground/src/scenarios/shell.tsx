import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Smoke } from "@gpuixui/testing";
import { App } from "../app.js";
import { scenarios } from "./index.js";
import type { ScenarioBody } from "../types.js";

const bounds = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<Smoke.Bounds> => Option.fromNullishOr(ctx.host.bounds(testId));

const offset = (ctx: Smoke.SmokeContext): Option.Option<Smoke.Offset> =>
  Option.fromNullishOr(ctx.host.scrollOffset("shell-nav-list"));

const STEP = 600;
const MAX_STEPS = 40;

const scrollToEnd = (
  ctx: Smoke.SmokeContext,
  previous: Option.Option<Smoke.Offset>,
  remaining: number,
): Effect.Effect<Option.Option<Smoke.Offset>> =>
  remaining <= 0
    ? Effect.succeed(previous)
    : Effect.gen(function* () {
        ctx.host.wheel("shell-nav-list", 0, -STEP);
        ctx.host.advance(50);
        const current = offset(ctx);
        const stable = Option.exists(previous, (before) =>
          Option.exists(current, (after) => after.y === before.y),
        );
        return stable
          ? current
          : yield* scrollToEnd(ctx, current, remaining - 1);
      });

export const shellNavigationScenario: ScenarioBody = {
  view: () => <App list={scenarios} />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const last = yield* ctx.expectSome(
        "the registry has a last scenario",
        Arr.last(scenarios),
      );
      const lastId = `nav-${last.id}`;

      const list = yield* ctx.expectSome(
        "the sidebar list is painted",
        bounds(ctx, "shell-nav-list"),
      );
      const before = yield* ctx.expectSome(
        "the last scenario is in the list",
        bounds(ctx, lastId),
      );
      yield* ctx.expectEqual(
        "the list starts at the top",
        Option.getOrElse(
          Option.map(
            Option.fromNullishOr(ctx.host.scrollOffset("shell-nav-list")),
            (offset) => offset.y,
          ),
          () => -1,
        ),
        0,
      );

      yield* scrollToEnd(ctx, Option.none(), MAX_STEPS);

      const scrolled = yield* ctx.expectSome(
        "the list reports a scroll offset",
        offset(ctx),
      );
      yield* ctx.expectEqual(
        "the wheel scrolled the list",
        scrolled.y < 0,
        true,
      );

      const after = yield* ctx.expectSome(
        "the last scenario after scrolling",
        bounds(ctx, lastId),
      );
      yield* ctx.expectEqual(
        "the last scenario moved up",
        after.y < before.y,
        true,
      );
      yield* ctx.expectEqual(
        "the last scenario is inside the list's bounds",
        after.y >= list.y && after.y + after.height <= list.y + list.height,
        true,
      );
    }),
};
