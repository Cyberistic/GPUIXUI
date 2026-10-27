/**
 * The React↔Effect seam, without a component.
 *
 * The bugs these guard: a store that writes state React never hears about until
 * a later turn (the component would paint the value it first read, one frame
 * behind the handler), a timer that replaces another but leaves both running (a
 * roll would settle on the value of the window before it), and work a component
 * started that outlives the component — the timer behind a roll would fire into
 * an unmounted tree.
 */

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

      // No flush between the write and the read: `useSyncExternalStore` reads
      // its snapshot as soon as the handler that wrote returns. It is the
      // snapshot the subscriber reads, so the initial value is not replayed.
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

      // The first window was replaced, not joined: only the second lands, and
      // it lands on its own deadline.
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
