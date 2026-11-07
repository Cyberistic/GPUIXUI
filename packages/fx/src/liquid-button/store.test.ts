import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Option from "effect/Option";
import * as TestClock from "effect/testing/TestClock";
import { makeLiquidStore } from "./store.js";

const box = Option.some({ x: 0, y: 0, width: 200, height: 40 });

const at = (x: number) => Option.some({ x, y: 20 });

const measured = Effect.gen(function* () {
  const store = yield* makeLiquidStore;
  yield* store.measure(box);
  return store;
});

describe("LiquidStore", () => {
  it.effect("starts with no box and no flood", () =>
    Effect.gen(function* () {
      const store = yield* makeLiquidStore;

      expect(Option.isNone(store.local.read().box)).toBe(true);
      expect(Option.isNone(store.local.read().flood)).toBe(true);
    }),
  );

  it.effect("floods in from the edge the pointer entered by", () =>
    Effect.gen(function* () {
      const left = yield* measured;
      yield* left.move(at(40), false);

      expect(Option.getOrUndefined(left.local.read().flood)).toEqual({
        entry: "left",
        drain: "left",
        filled: true,
        run: 0,
      });

      const right = yield* measured;
      yield* right.move(at(160), false);
      expect(Option.getOrUndefined(right.local.read().flood)?.entry).toBe(
        "right",
      );
    }),
  );

  it.effect("drains toward the edge the pointer left through", () =>
    Effect.gen(function* () {
      const store = yield* measured;
      yield* store.move(at(160), false);

      yield* store.leave(Option.none(), false, 200);

      expect(Option.getOrUndefined(store.local.read().flood)).toMatchObject({
        entry: "right",
        drain: "right",
        filled: false,
      });
    }),
  );

  it.effect("keeps a filled flood when the pointer moves inside it", () =>
    Effect.gen(function* () {
      const store = yield* measured;
      yield* store.move(at(40), false);

      let signals = 0;
      const unsubscribe = store.local.subscribe(() => {
        signals += 1;
      });
      yield* store.move(at(90), false);
      yield* store.move(at(180), false);
      unsubscribe();

      expect(signals).toBe(0);
      expect(Option.getOrUndefined(store.local.read().flood)?.run).toBe(0);
    }),
  );

  it.effect("removes the layer one window after the drain starts", () =>
    Effect.gen(function* () {
      const store = yield* measured;
      yield* store.move(at(40), false);
      yield* store.leave(Option.none(), false, 200);

      yield* TestClock.adjust("199 millis");
      expect(Option.isSome(store.local.read().flood)).toBe(true);

      yield* TestClock.adjust("1 millis");
      expect(Option.isNone(store.local.read().flood)).toBe(true);
    }),
  );

  it.effect("a new entry cancels the drain it interrupted", () =>
    Effect.gen(function* () {
      const store = yield* measured;
      yield* store.move(at(40), false);
      yield* store.leave(Option.none(), false, 200);
      yield* TestClock.adjust("150 millis");

      yield* store.move(at(160), false);
      yield* TestClock.adjust("100 millis");

      expect(Option.getOrUndefined(store.local.read().flood)).toMatchObject({
        entry: "right",
        filled: true,
        run: 1,
      });
    }),
  );

  it.effect("an inert control floods nothing and drops what it wore", () =>
    Effect.gen(function* () {
      const store = yield* measured;
      yield* store.move(at(40), false);
      yield* store.clear;

      expect(Option.isNone(store.local.read().flood)).toBe(true);

      yield* store.move(at(40), true);
      expect(Option.isNone(store.local.read().flood)).toBe(true);
    }),
  );

  it.effect("a level change retimes the drain it finds running", () =>
    Effect.gen(function* () {
      const store = yield* measured;
      yield* store.move(at(40), false);
      yield* store.leave(Option.none(), false, 200);
      yield* TestClock.adjust("150 millis");

      yield* store.retime(600);
      yield* TestClock.adjust("300 millis");
      expect(Option.isSome(store.local.read().flood)).toBe(true);

      yield* TestClock.adjust("300 millis");
      expect(Option.isNone(store.local.read().flood)).toBe(true);
    }),
  );

  it.effect("a retime with no drain running starts nothing", () =>
    Effect.gen(function* () {
      const store = yield* measured;
      yield* store.move(at(40), false);
      yield* store.retime(200);

      yield* TestClock.adjust("1 second");
      expect(Option.getOrUndefined(store.local.read().flood)).toMatchObject({
        filled: true,
      });
    }),
  );
});
