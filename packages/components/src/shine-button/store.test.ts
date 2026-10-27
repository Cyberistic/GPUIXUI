/**
 * The sheen store, under `TestClock`.
 *
 * The bugs these guard: a band that never starts on a hover entry; a sweep that
 * outlives its window; a re-entry that reclaims the crossing already on screen
 * instead of starting a fresh one (the halves are keyed by `run`); and an inert
 * control that shines, including one disabled under a band already crossing.
 */

import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Option from "effect/Option";
import * as TestClock from "effect/testing/TestClock";
import { makeSheenStore } from "./store.js";

/** A store with a measured box, which is where a sweep can paint. */
const measured = Effect.gen(function* () {
  const store = yield* makeSheenStore;
  yield* store.measure(Option.some({ x: 0, y: 0, width: 200, height: 40 }));
  return store;
});

describe("SheenStore", () => {
  it.effect("starts still and unmeasured", () =>
    Effect.gen(function* () {
      const store = yield* makeSheenStore;

      expect(Option.isNone(store.local.read().box)).toBe(true);
      expect(store.local.read()).toMatchObject({ sweeping: false, run: 0 });
    }),
  );

  it.effect("sweeps on an entry and ends a window later", () =>
    Effect.gen(function* () {
      const store = yield* measured;
      yield* store.enter(false, 500);

      expect(store.local.read()).toMatchObject({ sweeping: true, run: 1 });

      yield* TestClock.adjust("499 millis");
      expect(store.local.read().sweeping).toBe(true);

      yield* TestClock.adjust("1 millis");
      expect(store.local.read().sweeping).toBe(false);
    }),
  );

  it.effect("re-entering starts a fresh crossing and its own window", () =>
    Effect.gen(function* () {
      const store = yield* measured;
      yield* store.enter(false, 500);
      yield* TestClock.adjust("250 millis");

      // The band already crossing must not be ended by the first window.
      yield* store.enter(false, 500);
      expect(store.local.read().run).toBe(2);

      yield* TestClock.adjust("300 millis");
      expect(store.local.read().sweeping).toBe(true);

      yield* TestClock.adjust("200 millis");
      expect(store.local.read().sweeping).toBe(false);
    }),
  );

  it.effect("an inert control starts no sweep and drops the one it wears", () =>
    Effect.gen(function* () {
      const store = yield* measured;
      yield* store.enter(false, 500);
      yield* store.clear;

      expect(store.local.read().sweeping).toBe(false);

      yield* store.enter(true, 500);
      expect(store.local.read()).toMatchObject({ sweeping: false, run: 1 });
    }),
  );
});
