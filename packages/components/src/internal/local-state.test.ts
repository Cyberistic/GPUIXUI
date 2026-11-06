import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as TestClock from "effect/testing/TestClock";
import { makeLocalState } from "./local-state.js";

describe("LocalState", () => {
  it.effect("reads the state it was created with", () =>
    Effect.gen(function* () {
      const local = yield* makeLocalState("first");

      expect(local.read()).toBe("first");
    }),
  );

  it.effect("signals a subscriber in the write's turn", () =>
    Effect.gen(function* () {
      const local = yield* makeLocalState("first");
      const seen: Array<string> = [];
      local.subscribe(() => seen.push(local.read()));

      yield* local.write("second");

      expect(seen).toEqual(["second"]);
    }),
  );

  it.effect("stops notifying a subscriber that left", () =>
    Effect.gen(function* () {
      const local = yield* makeLocalState("first");
      let notified = 0;
      const unsubscribe = local.subscribe(() => {
        notified += 1;
      });
      yield* local.write("second");
      const afterSubscribing = notified;

      unsubscribe();
      yield* local.write("third");

      expect(notified).toBe(afterSubscribing);
    }),
  );

  it.effect("replaces the timer it was running", () =>
    Effect.gen(function* () {
      const local = yield* makeLocalState(0);
      yield* local.after(100, local.write(1));
      yield* local.after(50, local.write(2));

      yield* TestClock.adjust("50 millis");
      expect(local.read()).toBe(2);
      expect(local.running()).toBe(false);

      yield* TestClock.adjust("100 millis");
      expect(local.read()).toBe(2);
    }),
  );

  it.effect("reads whether the timer is still to fire", () =>
    Effect.gen(function* () {
      const local = yield* makeLocalState(0);
      expect(local.running()).toBe(false);

      yield* local.after(100, local.write(1));
      expect(local.running()).toBe(true);

      yield* TestClock.adjust("100 millis");
      expect(local.read()).toBe(1);
      expect(local.running()).toBe(false);
    }),
  );

  it.effect("cancels the work a component started", () =>
    Effect.gen(function* () {
      const local = yield* makeLocalState(0);
      yield* local.after(100, local.write(1));

      yield* local.cancel;
      expect(local.running()).toBe(false);
      yield* TestClock.adjust("100 millis");

      expect(local.read()).toBe(0);
    }),
  );
});
