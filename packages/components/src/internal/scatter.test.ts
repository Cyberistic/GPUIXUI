/**
 * The shared arithmetic of a scattered field.
 *
 * The bugs these guard: a field that reshuffles between mounts (a hash that is
 * not stable); a count or a size the runtime cannot paint reaching the tree
 * (every piece is its own native tween); an inverted size pair painting a
 * negative range; a motion time so short it is a jitter or so long the field
 * looks frozen; and a broken seed, which is not a layout at all.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  countOf,
  durationOf,
  paintable,
  seedOf,
  seededUnit,
  sizeRangeOf,
  tenth,
} from "./scatter.js";

describe("seededUnit", () => {
  it("is stable for one seed and slot, and differs across both", () => {
    expect(seededUnit(7, 3, 1)).toBe(seededUnit(7, 3, 1));
    expect(seededUnit(7, 3, 1)).not.toBe(seededUnit(7, 3, 2));
    expect(seededUnit(7, 3, 1)).not.toBe(seededUnit(8, 3, 1));
  });

  it("stays in the unit interval across seeds, indices and slots", () => {
    const values = Array.from({ length: 200 }, (_, index) => index).map(
      (index) => seededUnit(index % 7, index, index % 6),
    );
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});

describe("the field's policy", () => {
  it("clamps the count", () => {
    expect(countOf(Option.none(), 24, 120)).toBe(24);
    expect(countOf(Option.some(6), 24, 120)).toBe(6);
    expect(countOf(Option.some(0), 24, 120)).toBe(0);
    expect(countOf(Option.some(1_000), 24, 120)).toBe(120);
    // An unreadable or negative request is not a smaller field.
    expect(countOf(Option.some(Number.NaN), 24, 120)).toBe(24);
    expect(countOf(Option.some(-4), 24, 120)).toBe(24);
  });

  it("reads an inverted size range low-to-high and an unreadable one as the house pair", () => {
    expect(sizeRangeOf(Option.none(), Option.none(), 2, 5)).toEqual({
      min: 2,
      max: 5,
    });
    expect(sizeRangeOf(Option.some(9), Option.some(3), 2, 5)).toEqual({
      min: 3,
      max: 9,
    });
    // A piece smaller than a pixel cannot be seen, so it is the house size.
    expect(sizeRangeOf(Option.some(0), Option.some(Number.NaN), 2, 5)).toEqual({
      min: 2,
      max: 5,
    });
  });

  it("holds a motion time between a jitter and a stare", () => {
    expect(durationOf(Option.none(), 14_000, 320, 120_000)).toBe(14_000);
    expect(durationOf(Option.some(319), 14_000, 320, 120_000)).toBe(14_000);
    expect(durationOf(Option.some(2_000.4), 14_000, 320, 120_000)).toBe(2_000);
    expect(durationOf(Option.some(10_000_000), 14_000, 320, 120_000)).toBe(
      120_000,
    );
  });

  it("reads an unreadable seed as the house one", () => {
    expect(seedOf(Option.none())).toBe(1);
    expect(seedOf(Option.some(Number.NaN))).toBe(1);
    expect(seedOf(Option.some(42))).toBe(42);
  });

  it("rounds to the finest paint and refuses a size the runtime cannot lay out", () => {
    expect(tenth(12.345)).toBe(12.3);
    expect(paintable(1)).toBe(true);
    expect(paintable(0)).toBe(false);
    expect(paintable(Number.NaN)).toBe(false);
  });
});
