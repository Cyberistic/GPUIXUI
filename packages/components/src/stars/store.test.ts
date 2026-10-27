/**
 * The stars field store, without a renderer.
 *
 * The bugs these guard: a repeated layout report churning a field the runtime is
 * already tweening, and a twinkle that cannot turn around — a star handed one
 * target and never the other stays lit at its peak, so `turn` has to be the
 * other end of the light each time it runs.
 */

import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { directionOf } from "./logic.js";
import { makeStarsStore } from "./store.js";

const box = (width: number, height: number) =>
  Option.some({ x: 0, y: 0, width, height });

describe("StarsStore", () => {
  it.effect("holds the box it measured", () =>
    Effect.gen(function* () {
      const store = yield* makeStarsStore;
      yield* store.measure(box(300, 200));

      expect(Option.getOrUndefined(store.local.read().box)).toEqual({
        width: 300,
        height: 200,
      });
    }),
  );

  it.effect("writes nothing when the same size is reported again", () =>
    Effect.gen(function* () {
      const store = yield* makeStarsStore;
      yield* store.measure(box(300, 200));

      let signals = 0;
      const unsubscribe = store.local.subscribe(() => {
        signals += 1;
      });
      yield* store.measure(box(300, 200));
      unsubscribe();

      expect(signals).toBe(0);
    }),
  );

  it.effect("re-draws for a new size", () =>
    Effect.gen(function* () {
      const store = yield* makeStarsStore;
      yield* store.measure(box(300, 200));
      yield* store.measure(box(360, 240));

      expect(Option.getOrUndefined(store.local.read().box)).toEqual({
        width: 360,
        height: 240,
      });
    }),
  );

  it.effect("turns a star around on every completion", () =>
    Effect.gen(function* () {
      const store = yield* makeStarsStore;
      const direction = () => directionOf(store.local.read().directions, "3");

      expect(direction()).toBe(1);
      yield* store.turn("3");
      expect(direction()).toBe(-1);
      yield* store.turn("3");
      expect(direction()).toBe(1);
    }),
  );

  it.effect("turns only the star whose tween completed", () =>
    Effect.gen(function* () {
      const store = yield* makeStarsStore;
      yield* store.turn("3");

      const directions = store.local.read().directions;
      expect(directionOf(directions, "2")).toBe(1);
      expect(directionOf(directions, "3")).toBe(-1);
    }),
  );
});
