/**
 * The verbs the playground shell's own probes share.
 *
 * Both probes mount the real `App` and have to do two things no component probe
 * does: address a sidebar row (`nav-<id>`) and put it **on screen** before
 * pressing it. The renderer resolves a press by hit-testing the window, so a row
 * scrolled out of the list is a press on whatever is painted there instead —
 * and it keeps a scroll offset **per `testId`**, which survives the next mount,
 * so a list another scenario left scrolled can hold the row anywhere.
 */
import { Effect, pipe } from "effect";
import * as Option from "effect/Option";
import type { Smoke } from "@gpuixui/testing";

/** The sidebar's scroller, whose offset is per `testId`. */
export const SHELL_LIST = "shell-nav-list";

/** One wheel's reach, and the most a reveal will take. */
const STEP = 400;
const MAX_STEPS = 40;

/** The `testId` a registry id's sidebar row carries. */
export const navId = (id: string): string => `nav-${id}`;

/** Whether `row` sits wholly inside `box`, so a press can hit it. */
export const inside = (box: Smoke.Bounds, row: Smoke.Bounds): boolean =>
  row.y >= box.y && row.y + row.height <= box.y + box.height;

/** The fill the runtime reports for `testId`, or none when it is not painted. */
export const fillOf = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(ctx.host.paintedStyle(testId)),
    Option.flatMap((snapshot) => snapshot.backgroundColor),
  );

/** The text `testId` paints, or none when it is not painted. */
export const textOf = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<string> => Option.fromNullishOr(ctx.host.text(testId));

/** Presses `testId` and lets the commit paint before the next read. */
export const press = (ctx: Smoke.SmokeContext, testId: string): void => {
  ctx.host.click(testId);
  ctx.host.advance(16);
};

/**
 * Wheels `scrollerId` until `rowId` is inside it, and answers the row's box.
 *
 * The wheel's direction follows where the row is: a **positive** `deltaY`
 * scrolls up, the opposite of the DOM. Nothing moves when the row is already in
 * view, so revealing a visible row costs no gesture.
 */
export const revealRow = (
  ctx: Smoke.SmokeContext,
  scrollerId: string,
  rowId: string,
  remaining: number = MAX_STEPS,
): Effect.Effect<Option.Option<Smoke.Bounds>> =>
  Effect.gen(function* () {
    const box = Option.fromNullishOr(ctx.host.bounds(scrollerId));
    const row = Option.fromNullishOr(ctx.host.bounds(rowId));
    if (Option.isNone(box) || Option.isNone(row)) return row;
    if (remaining <= 0 || inside(box.value, row.value)) return row;
    ctx.host.wheel(scrollerId, 0, row.value.y < box.value.y ? STEP : -STEP);
    ctx.host.advance(50);
    return yield* revealRow(ctx, scrollerId, rowId, remaining - 1);
  });

/**
 * Wheels `scrollerId` to its end, and answers the offset it stopped at.
 *
 * The same loop `shell-navigation` uses for the sidebar: one wheel per step
 * until the offset repeats, so a longer list cannot outrun the guard.
 */
export const scrollToEnd = (
  ctx: Smoke.SmokeContext,
  scrollerId: string,
  remaining: number = MAX_STEPS,
): Effect.Effect<Option.Option<Smoke.Offset>> => {
  const offset = (): Option.Option<Smoke.Offset> =>
    Option.fromNullishOr(ctx.host.scrollOffset(scrollerId));
  const step = (
    previous: Option.Option<Smoke.Offset>,
    left: number,
  ): Effect.Effect<Option.Option<Smoke.Offset>> =>
    Effect.gen(function* () {
      if (left <= 0) return previous;
      ctx.host.wheel(scrollerId, 0, -STEP);
      ctx.host.advance(50);
      const current = offset();
      const stable = Option.exists(previous, (before) =>
        Option.exists(current, (after) => after.y === before.y),
      );
      return stable ? current : yield* step(current, left - 1);
    });
  return step(offset(), remaining);
};
