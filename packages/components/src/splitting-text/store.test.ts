/**
 * The reveal's split store, without a renderer.
 *
 * The bugs these guard: a phrase re-split on every render (a fresh array of
 * units for a headline that did not change), and a changed phrase keeping the
 * units of the one before it — the keys are what the runtime remounts on, so a
 * stale split paints the previous headline.
 */

import { describe, expect, it } from "vitest";
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
  it("splits the phrase it mounts with", () => {
    const store = makeSplittingStore(phrase);
    try {
      expect(store.read().text).toBe(phrase.text);
      expect(store.read().units).toBe(unitsOf(phrase.text).length);
      expect(
        store.read().lines.flatMap((line) => line.units.map((u) => u.text)),
      ).toEqual(unitsOf(phrase.text));
    } finally {
      store.stop();
    }
  });

  it("keeps the split for an unchanged phrase and its settings", () => {
    // The bug this guards: a render recomputed the whole reveal, so a character
    // split of a long headline allocated a new unit array per paint.
    const store = makeSplittingStore(phrase);
    try {
      const held = store.read();
      store.show({ ...phrase });
      expect(store.read()).toBe(held);
    } finally {
      store.stop();
    }
  });

  it("re-splits when the phrase changes", () => {
    const store = makeSplittingStore(phrase);
    try {
      store.show({ ...phrase, text: "Ship" });

      expect(store.read().text).toBe("Ship");
      expect(store.read().units).toBe(1);
    } finally {
      store.stop();
    }
  });

  it("re-splits when the split mode changes", () => {
    // The bug this guards: the mode is a prop like the phrase, and a store that
    // compared only the text kept a word split under a character request.
    const store = makeSplittingStore(phrase);
    try {
      store.show({ ...phrase, split: "characters" });

      expect(store.read().mode).toBe("characters");
      expect(store.read().units).toBe(phrase.text.length);
    } finally {
      store.stop();
    }
  });

  it("re-splits when the stagger changes", () => {
    const store = makeSplittingStore(phrase);
    try {
      store.show({ ...phrase, stepMs: 80 });

      expect(store.read().lines[0]?.units[1]?.delayMs).toBe(80);
    } finally {
      store.stop();
    }
  });
});
