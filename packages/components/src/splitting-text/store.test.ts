/**
 * The reveal's split store, without a renderer.
 *
 * The bugs these guard: a phrase re-split on every render (a fresh array of
 * units for a headline that did not change), and a changed phrase keeping the
 * units of the one before it — the keys are what the runtime remounts on, so a
 * stale split paints the previous headline.
 */

import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { makeSplittingStore, type SplitInput } from "./store.js";

const phrase: SplitInput = {
  text: "Ship it now",
  split: "words",
  stepMs: undefined,
  from: "start",
};

const unitsOf = (text: string): ReadonlyArray<string> =>
  text.split(/\s+/).filter((unit) => unit !== "");

describe("SplittingStore", () => {
  it.effect("splits the phrase it mounts with", () =>
    Effect.gen(function* () {
      const store = yield* makeSplittingStore(phrase);
      expect(store.local.read().text).toBe(phrase.text);
      expect(store.local.read().units).toBe(unitsOf(phrase.text).length);
      expect(
        store.local
          .read()
          .lines.flatMap((line) => line.units.map((unit) => unit.text)),
      ).toEqual(unitsOf(phrase.text));
    }),
  );

  it.effect("keeps the split for an unchanged phrase and its settings", () =>
    Effect.gen(function* () {
      // The bug this guards: a render recomputed the whole reveal, so a character
      // split of a long headline allocated a new unit array per paint.
      const store = yield* makeSplittingStore(phrase);
      const held = store.local.read();
      yield* store.show({ ...phrase });
      expect(store.local.read()).toBe(held);
    }),
  );

  it.effect("re-splits when the phrase changes", () =>
    Effect.gen(function* () {
      const store = yield* makeSplittingStore(phrase);
      yield* store.show({ ...phrase, text: "Ship" });

      expect(store.local.read().text).toBe("Ship");
      expect(store.local.read().units).toBe(1);
    }),
  );

  it.effect("re-splits when the split mode changes", () =>
    Effect.gen(function* () {
      // The bug this guards: the mode is a prop like the phrase, and a store that
      // compared only the text kept a word split under a character request.
      const store = yield* makeSplittingStore(phrase);
      yield* store.show({ ...phrase, split: "characters" });

      expect(store.local.read().mode).toBe("characters");
      expect(store.local.read().units).toBe(phrase.text.length);
    }),
  );

  it.effect("re-splits when the stagger changes", () =>
    Effect.gen(function* () {
      const store = yield* makeSplittingStore(phrase);
      yield* store.show({ ...phrase, stepMs: 80 });

      expect(store.local.read().lines[0]?.units[1]?.delayMs).toBe(80);
    }),
  );
});
