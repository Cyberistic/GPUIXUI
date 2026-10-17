/**
 * One synchronous clock read for React event handlers.
 *
 * A menu key handler needs "now" before its next render, and the type-ahead
 * window measures elapsed time. `Clock.monotonicTimeNanos` keeps the source of
 * time Effect's clock instead of `Date.now`; `runSync` is the boundary that makes
 * it available to a React event (the same boundary rule as the toast provider's
 * runtime).
 */

import { Effect } from "effect";
import * as Clock from "effect/Clock";

/** The monotonic clock in nanoseconds. */
export const monotonicNanos = (): bigint =>
  Effect.runSync(Clock.monotonicTimeNanos);
