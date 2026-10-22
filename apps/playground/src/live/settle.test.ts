/**
 * Guards the bounded poll every live probe waits on a settled paint with.
 *
 * A probe's evidence is only as good as the frame it read. Two failures this
 * helper exists to prevent, and both are cheap to reintroduce:
 *
 * 1. **An endless poll.** A surface that never dismisses would hang the release
 *    gate instead of failing it, so the helper must give up and report the value
 *    it last read — which is what the assertion then names.
 * 2. **A poll that returns the value it was waiting to leave.** A poll written as
 *    "read, sleep, return the read" reports the mid-tween frame it was supposed
 *    to skip; the tab pill measured `49.5` against `110` that way.
 */
import { describe, expect, it } from "@effect/vitest";
import { Duration, Effect, Ref } from "effect";
import { settleNumber, settleUntil } from "./settle.js";

/** A read that yields the next value of `values`, repeating the last one. */
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
      // Three reads: two zeros, then the one that held.
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
      // The first read is the mid-tween value; the poll must not return it.
      expect(settled).not.toBe(49.5);
    }),
  );

  it.effect("reports a number that never rests instead of hanging", () =>
    Effect.gen(function* () {
      // Each attempt is a pair of reads, so four attempts spend seven reads and
      // hand the last one to the assertion — the gate fails with a number, not
      // with a hang.
      const feed = yield* reads([1, 2, 3, 4, 5, 6, 7, 8]);
      const settled = yield* settleNumber(feed.read, 4, Duration.zero);
      expect(settled).toBe(7);
      expect(yield* feed.count).toBe(7);
    }),
  );

  it.effect("never treats a missing box as resting", () =>
    Effect.gen(function* () {
      // `NaN` is what `boxAxis` reports for an element that paints nothing, and
      // `Math.abs(NaN - NaN) <= 0.5` is false: the poll spends its attempts and
      // hands `NaN` to the assertion, which fails by name.
      const feed = yield* reads([Number.NaN]);
      const settled = yield* settleNumber(feed.read, 3, Duration.zero);
      expect(Number.isNaN(settled)).toBe(true);
      expect(yield* feed.count).toBe(5);
    }),
  );
});
