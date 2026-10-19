/**
 * The active slide index derived from the caller's value.
 *
 * The bug these guard: `Carousel` clamped `value` with only `Math.min`/
 * `Math.max`, so `1.5` or `NaN` reached the slides. No slide index compares
 * equal to a fraction, so every slide took the hidden style and the carousel
 * painted nothing; `NaN + 1` is still `NaN`, so stepping could not recover
 * (plan 619).
 */

import { describe, expect, it } from "vitest";
import { slideIndex } from "./logic.js";

describe("slideIndex", () => {
  it("truncates a fractional index to the slide below it", () => {
    expect(slideIndex(1.5, 3)).toBe(1);
    expect(slideIndex(2.9, 3)).toBe(2);
  });

  it("clamps a negative index to the first slide", () => {
    expect(slideIndex(-2, 3)).toBe(0);
  });

  it("clamps an index past the end to the last slide", () => {
    expect(slideIndex(99, 3)).toBe(2);
  });

  it("starts a non-finite index at the first slide", () => {
    expect(slideIndex(Number.NaN, 3)).toBe(0);
    expect(slideIndex(Number.POSITIVE_INFINITY, 3)).toBe(0);
    expect(slideIndex(Number.NEGATIVE_INFINITY, 3)).toBe(0);
  });

  it("reports zero when the track has no slides", () => {
    expect(slideIndex(2, 0)).toBe(0);
  });
});
