/**
 * The two time seams a React event handler reads.
 *
 * A menu key handler needs "now" before its next render, and the type-ahead
 * window measures elapsed time; `Clock.monotonicTimeNanos` keeps the source of
 * time Effect's clock instead of `Date.now`, and `runSync` is the boundary that
 * makes it available to a React event (the same boundary rule as the toast
 * provider's runtime).
 *
 * A hover delay is the other seam: it is often derived rather than written —
 * `reduced ? 0 : config.delay` is `NaN` until its configuration arrives, and a
 * wait computed from a rate is infinite when the rate is zero — and both reach
 * `setTimeout`, which answers a delay it cannot read with its one-millisecond
 * floor. A surface asked to wait forever therefore opened at once.
 */

import { Effect } from "effect";
import * as Clock from "effect/Clock";

/** The monotonic clock in nanoseconds. */
export const monotonicNanos = (): bigint =>
  Effect.runSync(Clock.monotonicTimeNanos);

/** The delay `value` names, or `fallback` when it is not a finite number. */
export const hoverDelay = (value: number, fallback: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : fallback;
