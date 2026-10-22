/**
 * The bounded poll a live probe waits on a settled paint with.
 *
 * A window's paint is a sequence of frames, not a value: a surface that fades
 * out stays mounted for its exit tween (`@gpuixui/motion`'s `slow` level is
 * 320ms, five times the runner's frame settle), a panel that enters travels a
 * few pixels before it rests, and the frame that carries the resting state
 * depends on the box's load. A fixed sleep therefore either races the paint or
 * pays the slowest tween on every probe.
 *
 * Polling keeps the check about the state a user is left with. It is always
 * **bounded**: an endless poll would turn a dead implementation into a hung
 * release gate, so the helper reports the last value it read and the assertion
 * after it fails on that value.
 */
import { Duration, Effect } from "effect";

/** How often a settled paint is re-read. */
export const PAINT_POLL = Duration.millis(40);

/** How many re-reads a probe spends before it reports the last one (~2s). */
export const PAINT_ATTEMPTS = 50;

/**
 * Re-reads `read` until `holds`, then returns the value it settled on.
 *
 * `holds` is the state the probe is waiting for, not its assertion: the check
 * that follows re-reads nothing and asserts the value returned here, so a
 * steady-state defect still fails — named by the value it settled on rather
 * than by a mid-tween one.
 */
export const settleUntil = <A, E>(
  read: Effect.Effect<A, E>,
  holds: (value: A) => boolean,
  attempts: number = PAINT_ATTEMPTS,
  every: Duration.Input = PAINT_POLL,
): Effect.Effect<A, E> =>
  Effect.gen(function* () {
    const value = yield* read;
    if (holds(value) || attempts <= 1) return value;
    yield* Effect.sleep(every);
    return yield* settleUntil(read, holds, attempts - 1, every);
  });

/**
 * Waits until a number stops changing, then returns the value it rests on.
 *
 * The tool for a box that animates: two consecutive reads within half a pixel
 * mean the transition has finished. A `NaN` read (an element that paints
 * nothing) never rests, so the poll gives up and the assertion reports `NaN`
 * instead of silently comparing a missing box with a real one.
 */
export const settleNumber = <E>(
  read: Effect.Effect<number, E>,
  attempts: number = PAINT_ATTEMPTS,
  every: Duration.Input = PAINT_POLL,
): Effect.Effect<number, E> =>
  Effect.gen(function* () {
    const first = yield* read;
    if (attempts <= 1) return first;
    yield* Effect.sleep(every);
    const second = yield* read;
    return Math.abs(second - first) <= 0.5
      ? second
      : yield* settleNumber(read, attempts - 1, every);
  });
