import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { samePoint } from "./logic.js";
import { makeMagneticStore, type MagneticFollower } from "./store.js";

const point = (x: number, y: number) => Option.some({ x, y });

describe("MagneticStore", () => {
  it.effect("starts at rest", () =>
    Effect.gen(function* () {
      const store = yield* makeMagneticStore;

      expect(Option.isNone(store.local.read())).toBe(true);
    }),
  );

  it.effect("follows a point and holds it", () =>
    Effect.gen(function* () {
      const store = yield* makeMagneticStore;
      yield* store.follow(point(12, 4));

      const held = store.local.read();
      expect(Option.getOrUndefined(held)).toEqual({ x: 12, y: 4 });
    }),
  );

  it.effect("ignores a move the payload cannot locate", () =>
    Effect.gen(function* () {
      const store = yield* makeMagneticStore;
      yield* store.follow(point(12, 4));
      yield* store.follow(Option.none());

      expect(Option.getOrUndefined(store.local.read())).toEqual({
        x: 12,
        y: 4,
      });
    }),
  );

  it.effect("signals once for a fresh point and not for a repeat", () =>
    Effect.gen(function* () {
      const store = yield* makeMagneticStore;

      let signals = 0;
      const unsubscribe = store.local.subscribe(() => {
        signals += 1;
      });
      yield* store.follow(point(12, 4));
      yield* store.follow(point(12, 4));
      yield* store.follow(point(12, 5));
      unsubscribe();
      yield* store.follow(point(12, 6));

      expect(signals).toBe(2);
    }),
  );

  it.effect("releases the pointer it held", () =>
    Effect.gen(function* () {
      const store = yield* makeMagneticStore;
      yield* store.follow(point(12, 4));
      yield* store.release;

      const released: MagneticFollower = store.local.read();
      expect(Option.isNone(released)).toBe(true);
    }),
  );

  it.effect("reads the same point as the same lean", () =>
    Effect.gen(function* () {
      const store = yield* makeMagneticStore;
      yield* store.follow(point(12, 4));

      const held = store.local.read();
      expect(
        Option.exists(held, (current) => samePoint(current, { x: 12, y: 4 })),
      ).toBe(true);
    }),
  );
});
