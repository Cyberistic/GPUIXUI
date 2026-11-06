import { Effect, pipe } from "effect";
import * as Option from "effect/Option";
import type { Smoke } from "@gpuixui/testing";

export const SHELL_LIST = "shell-nav-list";

const STEP = 400;
const MAX_STEPS = 40;

export const navId = (id: string): string => `nav-${id}`;

export const inside = (box: Smoke.Bounds, row: Smoke.Bounds): boolean =>
  row.y >= box.y && row.y + row.height <= box.y + box.height;

export const focusTo = (
  ctx: Smoke.SmokeContext,
  testId: string,
  remaining: number = 40,
  back: boolean = false,
): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    if (ctx.host.focused() === testId) return true;
    if (remaining <= 0) return false;
    if (back) {
      ctx.host.focusPrevious();
    } else {
      ctx.host.focusNext();
    }
    ctx.host.advance(16);
    return yield* focusTo(ctx, testId, remaining - 1, back);
  });

export const fillOf = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(ctx.host.paintedStyle(testId)),
    Option.flatMap((snapshot) => snapshot.backgroundColor),
  );

export const textOf = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<string> => Option.fromNullishOr(ctx.host.text(testId));

export const press = (ctx: Smoke.SmokeContext, testId: string): void => {
  ctx.host.click(testId);
  ctx.host.advance(16);
};

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
