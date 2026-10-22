/**
 * The rating contract.
 *
 * The guarded defects: an arrow wrapping from five stars to one (a rating is not
 * a radio group), an arrow clearing a rated value (zero is the clear key's job),
 * a rating that cannot be cleared at all, and a `max` that is zero or fractional
 * turning the tab stop into a star that does not exist.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  clampRating,
  decideRating,
  pointerRating,
  ratingTabStop,
  starCount,
  starFill,
  starState,
} from "./rating.js";

describe("starCount", () => {
  it("reads a count it cannot lay out as one star", () => {
    // The bug guarded: `Infinity` reached `Arr.range(1, max)` in the paint,
    // whose `new Array(Infinity)` throws `RangeError: Invalid array length`
    // and takes the render with it.
    expect(starCount(Number.POSITIVE_INFINITY)).toBe(1);
    expect(starCount(Number.NEGATIVE_INFINITY)).toBe(1);
    expect(starCount(Number.NaN)).toBe(1);
    expect(starCount(0)).toBe(1);
    expect(starCount(-4)).toBe(1);
    expect(starCount(3.7)).toBe(3);
    expect(starCount(5)).toBe(5);
  });
});

describe("clampRating", () => {
  it("keeps a rating inside 0..max and drops fractions", () => {
    expect(clampRating(3, 5)).toBe(3);
    expect(clampRating(-1, 5)).toBe(0);
    expect(clampRating(9, 5)).toBe(5);
    expect(clampRating(2.7, 5)).toBe(2);
  });

  it("paints the stars a whole-star score has fully earned", () => {
    // Whole stars do not round: 4.9 is not five filled stars, because the
    // caller's score never reached five. Halves take the finer rule below.
    expect(clampRating(4.9, 5)).toBe(4);
    expect(clampRating(4.9, 5, true)).toBe(5);
  });

  it("snaps a half score to the nearest half place", () => {
    // The bug guarded: a stored 4.4 rendered as four stars while the caller's
    // own readout said 4.4, so a half score read as the star below it.
    expect(clampRating(4.4, 5, true)).toBe(4.5);
    expect(clampRating(4.2, 5, true)).toBe(4);
    expect(clampRating(9, 5, true)).toBe(5);
    expect(clampRating(-1, 5, true)).toBe(0);
    expect(clampRating(3.5, 5, true)).toBe(3.5);
  });

  it("reads an unreadable value as unrated", () => {
    expect(clampRating(Number.NaN, 5)).toBe(0);
    expect(clampRating(Number.NaN, 5, true)).toBe(0);
  });

  it("treats a zero or fractional max as one star, not as a broken group", () => {
    expect(clampRating(3, 0)).toBe(1);
    expect(clampRating(3, 2.5)).toBe(2);
  });
});

describe("starFill and starState", () => {
  it("fills whole, half and empty stars from one score", () => {
    expect(Arr.range(1, 5).map((index) => starFill(index, 3.5))).toStrictEqual([
      1, 1, 1, 0.5, 0,
    ]);
    expect(Arr.range(1, 5).map((index) => starState(index, 3.5))).toStrictEqual(
      ["checked", "checked", "checked", "half", "unchecked"],
    );
  });

  it("never fills past a star or before it", () => {
    expect(starFill(4, 0)).toBe(0);
    expect(starFill(1, 9)).toBe(1);
    expect(starState(5, 5)).toBe("checked");
  });
});

describe("decideRating", () => {
  it("steps with the arrows from unrated", () => {
    expect(decideRating(0, 5, "right")).toStrictEqual(Option.some(1));
    expect(decideRating(0, 5, "left")).toStrictEqual(Option.some(0));
  });

  it("steps in halves when the score is half precision", () => {
    // The bug guarded: an arrow on a half score jumped a whole star, so a
    // reader at 3.5 could not reach 4 without skipping the half it held.
    expect(decideRating(3.5, 5, "right", true)).toStrictEqual(Option.some(4));
    expect(decideRating(3.5, 5, "left", true)).toStrictEqual(Option.some(3));
    expect(decideRating(0, 5, "right", true)).toStrictEqual(Option.some(0.5));
    expect(decideRating(5, 5, "right", true)).toStrictEqual(Option.some(5));
  });

  it("clamps at the ends instead of wrapping", () => {
    // The bug guarded: a radio-group move wraps 5 → 1, which for a rating reads
    // as "you just lost your five stars".
    expect(decideRating(5, 5, "right")).toStrictEqual(Option.some(5));
    expect(decideRating(1, 5, "left")).toStrictEqual(Option.some(1));
  });

  it("never clears a rated value with an arrow — zero is explicit", () => {
    // The bug guarded: ArrowLeft at one star went to 0, so a reader nudging the
    // arrow lost the rating the page says only Delete clears.
    expect(decideRating(1, 5, "left")).toStrictEqual(Option.some(1));
    expect(decideRating(1, 5, "down")).toStrictEqual(Option.some(1));
    expect(decideRating(0.5, 5, "left", true)).toStrictEqual(Option.some(0.5));
    // ...while an unrated rating is still reached only from zero's own end.
    expect(decideRating(0, 5, "left")).toStrictEqual(Option.some(0));
    expect(decideRating(0, 5, "right")).toStrictEqual(Option.some(1));
  });

  it("jumps to the ends with Home and End", () => {
    expect(decideRating(3, 5, "home")).toStrictEqual(Option.some(1));
    expect(decideRating(3, 5, "home", true)).toStrictEqual(Option.some(0.5));
    expect(decideRating(3, 5, "end")).toStrictEqual(Option.some(5));
  });

  it("clears with Delete and Backspace — the only way back to unrated", () => {
    expect(decideRating(4, 5, "delete")).toStrictEqual(Option.some(0));
    expect(decideRating(3.5, 5, "backspace", true)).toStrictEqual(
      Option.some(0),
    );
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

  it("holds a half score on the star a press would complete", () => {
    expect(ratingTabStop(3.5, 5, true)).toBe(4);
    expect(ratingTabStop(0.5, 5, true)).toBe(1);
    expect(ratingTabStop(5, 5, true)).toBe(5);
  });
});

describe("pointerRating", () => {
  const box = Option.some({ x: 100, width: 24 });

  it("reads the half a press lands in", () => {
    expect(pointerRating(4, Option.some(106), box, true)).toBe(3.5);
    expect(pointerRating(4, Option.some(118), box, true)).toBe(4);
  });

  it("keeps the whole star without halves, a position or a measured box", () => {
    // The bug guarded: a press the renderer could not measure folded to the
    // half below the star, so a plain click lost the star it hit.
    expect(pointerRating(4, Option.some(106), box, false)).toBe(4);
    expect(pointerRating(4, Option.none(), box, true)).toBe(4);
    expect(pointerRating(4, Option.some(106), Option.none(), true)).toBe(4);
    expect(
      pointerRating(4, Option.some(106), Option.some({ x: 0, width: 0 }), true),
    ).toBe(4);
  });

  it("never aims below the first half star", () => {
    expect(pointerRating(1, Option.some(101), box, true)).toBe(0.5);
  });
});
