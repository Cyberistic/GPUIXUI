import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Option from "effect/Option";
import * as TestClock from "effect/testing/TestClock";
import { makeRollingStore } from "./store.js";

const policy = { reduced: false, swapMs: 20 };

describe("RollingStore", () => {
  it.effect(
    "holds the outgoing value through the exit, then paints the pending one",
    () =>
      Effect.gen(function* () {
        const roll = yield* makeRollingStore("first");
        yield* roll.show("second", policy);
        expect(roll.local.read().shown).toBe("first");
        expect(roll.local.read().phase).toBe("leaving");

        yield* TestClock.adjust("20 millis");

        expect(roll.local.read().shown).toBe("second");
        expect(roll.local.read().phase).toBe("entering");
      }),
  );

  it.effect(
    "lands on the newest value without re-arming the exit it arrived in",
    () =>
      Effect.gen(function* () {
        const roll = yield* makeRollingStore("v1");
        yield* roll.show("v2", policy);
        yield* TestClock.adjust("8 millis");
        yield* roll.show("v3", policy);
        yield* TestClock.adjust("8 millis");
        yield* roll.show("v4", policy);

        yield* TestClock.adjust("4 millis");
        expect(roll.local.read().shown).toBe("v4");
        expect(roll.local.read().phase).toBe("entering");
      }),
  );

  it.effect("travels a value back when it returns mid-exit", () =>
    Effect.gen(function* () {
      const roll = yield* makeRollingStore("first");
      yield* roll.show("second", policy);
      expect(roll.local.read().phase).toBe("leaving");

      yield* roll.show("first", policy);

      expect(roll.local.read().phase).toBe("entering");
      expect(Option.isNone(roll.local.read().pending)).toBe(true);

      expect(roll.local.running()).toBe(false);
    }),
  );

  it.effect("paints a reduced value at once, with no window", () =>
    Effect.gen(function* () {
      const roll = yield* makeRollingStore("first");
      yield* roll.show("second", { ...policy, reduced: true });

      expect(roll.local.read().shown).toBe("second");
      expect(roll.local.read().phase).toBe("rest");
      expect(roll.local.running()).toBe(false);
    }),
  );

  it.effect("settles the entry only once the runtime reports it landed", () =>
    Effect.gen(function* () {
      const roll = yield* makeRollingStore("first");
      yield* roll.show("second", policy);
      yield* TestClock.adjust("20 millis");
      expect(roll.local.read().phase).toBe("entering");

      yield* roll.entered;

      expect(roll.local.read().phase).toBe("rest");
    }),
  );

  it.effect("stops the window when the component unmounts", () =>
    Effect.gen(function* () {
      const roll = yield* makeRollingStore("first");
      yield* roll.show("second", policy);
      yield* roll.local.cancel;

      yield* TestClock.adjust("20 millis");

      expect(roll.local.read().shown).toBe("first");
      expect(roll.local.read().phase).toBe("leaving");
    }),
  );

  it.effect("does not publish a swap for the value already on screen", () =>
    Effect.gen(function* () {
      const roll = yield* makeRollingStore("first");
      const before = roll.local.read();
      yield* roll.show("first", policy);
      expect(roll.local.read()).toBe(before);
    }),
  );
});
