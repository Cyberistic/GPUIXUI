import { Duration, Effect } from "effect";

export const PAINT_POLL = Duration.millis(40);

export const PAINT_ATTEMPTS = 50;

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
