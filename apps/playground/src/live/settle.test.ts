import { describe, expect, it } from "@effect/vitest";
import { Duration, Effect, Ref } from "effect";
import { settleNumber, settleUntil } from "./settle.js";

const reads = (values: ReadonlyArray<number>) =>
  Effect.gen(function* () {
    const cursor = yield* Ref.make(0);
    return {
      read: Effect.gen(function* () {
        const index = yield* Ref.get(cursor);
        yield* Ref.update(cursor, (at) => at + 1);
        return values[Math.min(index, values.length - 1)] ?? 0;
      }),
      count: Ref.get(cursor),
    };
  });

describe("settleUntil", () => {
  it.effect("returns the value whose state holds", () =>
    Effect.gen(function* () {
      const feed = yield* reads([0, 0, 1, 1]);
      const settled = yield* settleUntil(
        feed.read,
        (value) => value === 1,
        5,
        Duration.zero,
      );
      expect(settled).toBe(1);

      expect(yield* feed.count).toBe(3);
    }),
  );

  it.effect(
    "gives up on a state that never arrives and reports the last read",
    () =>
      Effect.gen(function* () {
        const feed = yield* reads([7]);
        const settled = yield* settleUntil(
          feed.read,
          (value) => value === 1,
          3,
          Duration.zero,
        );
        expect(settled).toBe(7);
        expect(yield* feed.count).toBe(3);
      }),
  );

  it.effect("spends one read when the state already holds", () =>
    Effect.gen(function* () {
      const feed = yield* reads([2]);
      const settled = yield* settleUntil(
        feed.read,
        (value) => value === 2,
        50,
        Duration.zero,
      );
      expect(settled).toBe(2);
      expect(yield* feed.count).toBe(1);
    }),
  );
});

describe("settleNumber", () => {
  it.effect("waits for a moving number to rest", () =>
    Effect.gen(function* () {
      const feed = yield* reads([49.5, 80, 110, 110]);
      const settled = yield* settleNumber(feed.read, 6, Duration.zero);
      expect(settled).toBe(110);

      expect(settled).not.toBe(49.5);
    }),
  );

  it.effect("reports a number that never rests instead of hanging", () =>
    Effect.gen(function* () {
      const feed = yield* reads([1, 2, 3, 4, 5, 6, 7, 8]);
      const settled = yield* settleNumber(feed.read, 4, Duration.zero);
      expect(settled).toBe(7);
      expect(yield* feed.count).toBe(7);
    }),
  );

  it.effect("never treats a missing box as resting", () =>
    Effect.gen(function* () {
      const feed = yield* reads([Number.NaN]);
      const settled = yield* settleNumber(feed.read, 3, Duration.zero);
      expect(Number.isNaN(settled)).toBe(true);
      expect(yield* feed.count).toBe(5);
    }),
  );
});
