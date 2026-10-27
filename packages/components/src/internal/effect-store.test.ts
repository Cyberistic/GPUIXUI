/**
 * The store seam, without a component.
 *
 * The bugs these guard: a store that writes state React never hears about (the
 * component would paint the value it first read), a subscription that keeps
 * notifying after its component unsubscribed, and work a component started that
 * outlives the component — the timer behind a roll would fire into an unmounted
 * tree.
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { makeEffectStore } from "./effect-store.js";

/** Let the runtime deliver a publish to a subscriber. */
const flush = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

describe("EffectStore", () => {
  it("reads the state it was created with", () => {
    const store = makeEffectStore("first");
    try {
      expect(store.read()).toBe("first");
    } finally {
      store.stop();
    }
  });

  it("tells a subscriber what the state became", async () => {
    const store = makeEffectStore("first");
    try {
      const seen: Array<string> = [];
      store.subscribe(() => seen.push(store.read()));

      store.set("second");
      await flush();

      expect(seen).toEqual(["first", "second"]);
    } finally {
      store.stop();
    }
  });

  it("stops notifying a subscriber that left", async () => {
    const store = makeEffectStore("first");
    try {
      let notified = 0;
      const unsubscribe = store.subscribe(() => {
        notified += 1;
      });
      await flush();
      const afterSubscribing = notified;

      unsubscribe();
      store.set("second");
      await flush();

      expect(notified).toBe(afterSubscribing);
    } finally {
      store.stop();
    }
  });

  it("interrupts the work a component started", async () => {
    const store = makeEffectStore(0);
    try {
      let reached = false;
      store.fork(
        Effect.sleep("50 millis").pipe(
          Effect.andThen(
            Effect.sync(() => {
              reached = true;
            }),
          ),
        ),
      );

      store.stop();
      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(reached).toBe(false);
    } finally {
      store.stop();
    }
  });
});
