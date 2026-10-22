/**
 * The rotation's index rules, without a renderer.
 *
 * The bugs these guard: a rotation that runs past the end of a shortened list, a
 * negative or fractional index from a stored preference, and an empty list that
 * makes the phrase lookup throw.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { at, nextIndex, phraseAt } from "./logic.js";

describe("nextIndex", () => {
  it("wraps at the end of the list", () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
  });

  it("treats an empty list as index zero and normalises a broken one", () => {
    expect(nextIndex(0, 0)).toBe(0);
    expect(nextIndex(Number.NaN, 3)).toBe(1);
    expect(nextIndex(-1, 3)).toBe(0);
    expect(nextIndex(4.7, 3)).toBe(2);
  });
});

describe("at", () => {
  it("brings an index into range", () => {
    expect(at(0, 3)).toBe(0);
    expect(at(3, 3)).toBe(0);
    expect(at(-1, 3)).toBe(2);
    expect(at(7, 3)).toBe(1);
  });

  it("reads an empty list as zero and a broken index as the first", () => {
    expect(at(5, 0)).toBe(0);
    expect(at(Number.NaN, 3)).toBe(0);
  });
});

describe("phraseAt", () => {
  it("paints the phrase at the clamped index", () => {
    expect(phraseAt(["a", "b"], 3)).toEqual(Option.some("b"));
    expect(phraseAt(["a", "b"], -2)).toEqual(Option.some("a"));
  });

  it("has no phrase for an empty list", () => {
    expect(phraseAt([], 0)).toEqual(Option.none());
  });
});
