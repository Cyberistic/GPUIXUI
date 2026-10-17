/**
 * `shell-navigation` — the playground's own sidebar is usable.
 *
 * The registry **is** the sidebar, so a scenario the sidebar cannot reach is a
 * scenario the app cannot open. The list is taller than the 720px window, and
 * before this scenario the sidebar had no scroller: every entry past the fold
 * was painted outside the window and unreachable.
 *
 * It mounts the real `App` and proves the list is a scroll container, that the
 * wheel moves it, and that the last entry ends up inside the list's bounds —
 * the regression guard is the first step, which sees `offset.y = 0` and an
 * off-list last entry without the `overflowY`. The scroll is a loop until the
 * offset stops changing, so adding a scenario cannot break the guard.
 */
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Smoke } from "@gpuixui/testing";
import { App } from "../app.js";
import { scenarios } from "./index.js";
import type { PlaygroundScenario } from "../types.js";

const bounds = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<Smoke.Bounds> => Option.fromNullishOr(ctx.host.bounds(testId));

const offset = (ctx: Smoke.SmokeContext): Option.Option<Smoke.Offset> =>
  Option.fromNullishOr(ctx.host.scrollOffset("shell-nav-list"));

const STEP = 600;
const MAX_STEPS = 40;

/** Wheels to the end; stops as soon as an offset repeats. */
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

export const shellNavigationScenario: PlaygroundScenario = {
  id: "shell-navigation",
  title: "Playground shell: the scenario list scrolls",
  capability: "layout",
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
