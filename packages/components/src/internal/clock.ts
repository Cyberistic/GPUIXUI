import { Effect } from "effect";
import * as Clock from "effect/Clock";

export const monotonicNanos = (): bigint =>
  Effect.runSync(Clock.monotonicTimeNanos);

export const hoverDelay = (value: number, fallback: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : fallback;
