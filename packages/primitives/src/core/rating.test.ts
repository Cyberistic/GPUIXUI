/**
 * The rating contract.
 *
 * The guarded defects: an arrow wrapping from five stars to one (a rating is not
 * a radio group), a rating that cannot be cleared at all, and a `max` that is
 * zero or fractional turning the tab stop into a star that does not exist.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { clampRating, decideRating, ratingTabStop } from "./rating.js";

describe("clampRating", () => {
  it("keeps a rating inside 0..max and drops fractions", () => {
    expect(clampRating(3, 5)).toBe(3);
    expect(clampRating(-1, 5)).toBe(0);
    expect(clampRating(9, 5)).toBe(5);
    expect(clampRating(2.7, 5)).toBe(2);
  });

  it("reads an unreadable value as unrated", () => {
    expect(clampRating(Number.NaN, 5)).toBe(0);
  });

  it("treats a zero or fractional max as one star, not as a broken group", () => {
    expect(clampRating(3, 0)).toBe(1);
    expect(clampRating(3, 2.5)).toBe(2);
  });
});

describe("decideRating", () => {
  it("steps with the arrows from unrated", () => {
    expect(decideRating(0, 5, "right")).toStrictEqual(Option.some(1));
    expect(decideRating(0, 5, "left")).toStrictEqual(Option.some(0));
  });

  it("clamps at the ends instead of wrapping", () => {
    // The bug guarded: a radio-group move wraps 5 → 1, which for a rating reads
    // as "you just lost your five stars".
    expect(decideRating(5, 5, "right")).toStrictEqual(Option.some(5));
    expect(decideRating(1, 5, "left")).toStrictEqual(Option.some(0));
  });

  it("jumps to the ends with Home and End", () => {
    expect(decideRating(3, 5, "home")).toStrictEqual(Option.some(1));
    expect(decideRating(3, 5, "end")).toStrictEqual(Option.some(5));
  });

  it("clears with Delete and Backspace — the only way back to unrated", () => {
    expect(decideRating(4, 5, "delete")).toStrictEqual(Option.some(0));
    expect(decideRating(4, 5, "backspace")).toStrictEqual(Option.some(0));
  });

  it("leaves an unrelated key alone", () => {
    expect(decideRating(3, 5, "a")).toStrictEqual(Option.none());
    expect(decideRating(3, 5, "enter")).toStrictEqual(Option.none());
  });
});

describe("ratingTabStop", () => {
  it("puts the tab stop on the rating, or on the first star when unrated", () => {
    expect(ratingTabStop(3, 5)).toBe(3);
    expect(ratingTabStop(0, 5)).toBe(1);
    expect(ratingTabStop(9, 5)).toBe(5);
    expect(ratingTabStop(0, 0)).toBe(1);
  });
});
