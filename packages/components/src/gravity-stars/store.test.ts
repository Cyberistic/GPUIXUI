/**
 * The gravity field store, without a renderer.
 *
 * The bugs these guard: a repeated layout report restarting a field the runtime
 * is already falling; a star that never hands its approach over to the plunge
 * (it stays lit at the well); and a star that stops after one fall because its
 * plunge never reborns it onto the edge as a fresh lap.
 */

import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { gravityLifeOf } from "./logic.js";
import { makeGravityStore } from "./store.js";

const box = (width: number, height: number) =>
  Option.some({ x: 0, y: 0, width, height });

describe("GravityStore", () => {
  it.effect("holds the box it measured", () =>
    Effect.gen(function* () {
      const store = yield* makeGravityStore;
      yield* store.measure(box(300, 200));

      expect(Option.getOrUndefined(store.local.read().box)).toEqual({
        width: 300,
        height: 200,
      });
    }),
  );

  it.effect("writes nothing when the same size is reported again", () =>
    Effect.gen(function* () {
      const store = yield* makeGravityStore;
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

  it.effect("hands an approach over to the plunge, then to the next lap", () =>
    Effect.gen(function* () {
      const store = yield* makeGravityStore;
      const life = () => gravityLifeOf(store.local.read().lives, "4");

      yield* store.advance("4");
      expect(life()).toEqual({ lap: 0, landing: true });

      yield* store.advance("4");
      expect(life()).toEqual({ lap: 1, landing: false });
    }),
  );

  it.effect("advances only the star whose tween completed", () =>
    Effect.gen(function* () {
      const store = yield* makeGravityStore;
      yield* store.advance("4");

      const lives = store.local.read().lives;
      expect(gravityLifeOf(lives, "5")).toEqual({ lap: 0, landing: false });
      expect(gravityLifeOf(lives, "4")).toEqual({ lap: 0, landing: true });
    }),
  );
});
