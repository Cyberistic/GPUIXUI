/**
 * A bounded wait for a real-time UI change, for the scenarios that assert on a
 * JavaScript timer rather than on the frozen motion clock.
 *
 * The scenario still asserts with `expectContains`; this helper only gives a
 * slow host time to deliver the frame. A timeout is not a pass — the following
 * assertion fails with the measured readout, which is why the helper survives
 * with `Effect.orElseSucceed` instead of dying.
 */
import { Effect, Schedule } from "effect";
import * as Str from "effect/String";
import type { Smoke } from "@gpuixui/testing";

/** Resolves once `testId`'s text contains `needle`, or after two seconds. */
export const awaitReadout = (
  ctx: Smoke.SmokeContext,
  testId: string,
  needle: string,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    // A React state update from a timer needs a frame; advancing zero does not
    // move the frozen motion clock, it only runs the dispatcher.
    ctx.host.advance(0);
    const current = ctx.host.text(testId);
    if (current !== null && Str.includes(needle)(current)) return;
    return yield* Effect.fail(needle);
  }).pipe(
    Effect.retry(
      Schedule.spaced("50 millis").pipe(
        Schedule.upTo({ duration: "2 seconds" }),
      ),
    ),
    Effect.orElseSucceed(() => undefined),
  );
