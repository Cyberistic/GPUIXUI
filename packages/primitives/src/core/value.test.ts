/**
 * The value maths — the only part of a slider that can be proven without a
 * rendering runtime, and the part every value control shares.
 *
 * Each case guards a defect a slider can actually ship: a value that snaps to
 * binary-float noise, an unknown key treated as "stay", a pointer outside the
 * track reading as a real position, or a range slider whose ends cross and
 * report a [start, end] pair in the wrong order.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  clampValue,
  decideValueKey,
  fractionValue,
  moveSpanEnd,
  nearestEnd,
  normalizeRange,
  normalizeSpan,
  pointerValue,
  spanFrom,
  stepValue,
  valueFraction,
  valueStep,
  verticalPointerValue,
} from "./value.js";

const RANGE = { min: 0, max: 100, step: 1 } as const;
const BOX = { x: 100, width: 200 } as const;

describe("normalizeRange", () => {
  it("orders an inverted pair instead of painting backwards", () => {
    expect(normalizeRange({ min: 100, max: 0, step: 1 })).toStrictEqual({
      min: 0,
      max: 100,
      step: 1,
    });
  });

  it("treats a negative or unreadable step as continuous", () => {
    expect(normalizeRange({ min: 0, max: 1, step: -2 }).step).toBe(0);
    expect(normalizeRange({ min: 0, max: 1, step: Number.NaN }).step).toBe(0);
  });

  it("gives a non-finite bound a usable one rather than propagating NaN", () => {
    expect(normalizeRange({ min: Number.NaN, max: 0, step: 1 })).toStrictEqual({
      min: 0,
      max: 0,
      step: 1,
    });
  });
});

describe("clampValue", () => {
  it("clamps outside the range", () => {
    expect(clampValue(-5, RANGE)).toBe(0);
    expect(clampValue(140, RANGE)).toBe(100);
  });

  it("reads an unreadable value as the minimum, never as a full track", () => {
    expect(clampValue(Number.NaN, RANGE)).toBe(0);
  });

  it("snaps to the step measured from min", () => {
    expect(clampValue(37, { min: 0, max: 100, step: 10 })).toBe(40);
    expect(clampValue(3, { min: 1, max: 10, step: 2 })).toBe(3);
    expect(clampValue(4, { min: 1, max: 10, step: 2 })).toBe(5);
  });

  it("does not report the binary-float tail of a 0.1 step", () => {
    expect(clampValue(0.30000000000000004, { min: 0, max: 1, step: 0.1 })).toBe(
      0.3,
    );
  });

  it("snaps a quarter step", () => {
    expect(clampValue(0.3, { min: 0, max: 1, step: 0.25 })).toBe(0.25);
  });

  it("keeps the maximum reachable when the step does not divide the span", () => {
    // The bug guarded: with min 0, max 10 and step 3 the snap made the maximum
    // unreachable — the thumb stopped at 9 and the end of the track was a place
    // the control could not be taken to.
    const range = { min: 0, max: 10, step: 3 };
    expect(clampValue(10, range)).toBe(10);
    expect(clampValue(9.5, range)).toBe(9);
    expect(stepValue(9, range, 1)).toBe(10);
    expect(fractionValue(1, range)).toBe(10);
    expect(valueFraction(10, range)).toBe(1);
  });
});

describe("valueFraction / fractionValue", () => {
  it("maps a value to its position on the track", () => {
    expect(valueFraction(25, RANGE)).toBe(0.25);
    expect(valueFraction(-10, RANGE)).toBe(0);
    expect(valueFraction(500, RANGE)).toBe(1);
  });

  it("reads a zero-width range as empty instead of dividing by zero", () => {
    expect(valueFraction(5, { min: 5, max: 5, step: 0 })).toBe(0);
  });

  it("maps a fraction back to a value and clamps it", () => {
    expect(fractionValue(0.25, RANGE)).toBe(25);
    expect(fractionValue(-1, RANGE)).toBe(0);
    expect(fractionValue(2, RANGE)).toBe(100);
    expect(fractionValue(Number.NaN, RANGE)).toBe(0);
  });
});

describe("stepping", () => {
  it("uses the step, or a hundredth of a continuous range", () => {
    expect(valueStep(RANGE)).toBe(1);
    expect(valueStep({ min: 0, max: 50, step: 0 })).toBe(0.5);
  });

  it("moves by whole steps and clamps at the ends", () => {
    expect(stepValue(10, RANGE, 1)).toBe(11);
    expect(stepValue(0, RANGE, -1)).toBe(0);
    expect(stepValue(100, RANGE, 1)).toBe(100);
  });

  it("steps off an off-grid maximum onto the stop below it", () => {
    // The bug guarded: with min 0, max 10 and step 3 the maximum is a stop but
    // not a grid point. A move *down* from it measured the step from the
    // off-grid value — 10 - 3 = 7 snapped back to 6 — so the stop at 9 could be
    // reached with ArrowUp and never with ArrowDown. One step off a stop is the
    // neighbouring stop, not two.
    const range = { min: 0, max: 10, step: 3 };
    expect(stepValue(10, range, -1)).toBe(9);
    expect(stepValue(9, range, -1)).toBe(6);
    expect(stepValue(10, range, 1)).toBe(10);
    expect(stepValue(0, range, 1)).toBe(3);
  });

  it("keeps a fractional grid free of float drift when a move lands on it", () => {
    const range = { min: 0, max: 1, step: 0.1 };
    expect(stepValue(0.3, range, 1)).toBe(0.4);
    expect(stepValue(0.3, range, -1)).toBe(0.2);
  });
});

describe("decideValueKey", () => {
  it("moves one step with every arrow", () => {
    expect(decideValueKey(50, RANGE, "right")).toStrictEqual(Option.some(51));
    expect(decideValueKey(50, RANGE, "up")).toStrictEqual(Option.some(51));
    expect(decideValueKey(50, RANGE, "left")).toStrictEqual(Option.some(49));
    expect(decideValueKey(50, RANGE, "down")).toStrictEqual(Option.some(49));
  });

  it("jumps to the ends with Home and End", () => {
    expect(decideValueKey(50, RANGE, "home")).toStrictEqual(Option.some(0));
    expect(decideValueKey(50, RANGE, "end")).toStrictEqual(Option.some(100));
  });

  it("steps off an off-grid maximum in both directions", () => {
    // Same defect as `stepValue`'s case, through the key contract: End then
    // ArrowDown must land on the neighbouring stop, not skip it.
    const range = { min: 0, max: 10, step: 3 };
    expect(decideValueKey(10, range, "down")).toStrictEqual(Option.some(9));
    expect(decideValueKey(9, range, "up")).toStrictEqual(Option.some(10));
  });

  it("moves a page at a time", () => {
    expect(decideValueKey(50, RANGE, "pageup")).toStrictEqual(Option.some(60));
    expect(decideValueKey(50, RANGE, "pagedown", 5)).toStrictEqual(
      Option.some(45),
    );
  });

  it("leaves an unrelated key alone rather than treating it as stay", () => {
    expect(decideValueKey(50, RANGE, "a")).toStrictEqual(Option.none());
    expect(decideValueKey(50, RANGE, "enter")).toStrictEqual(Option.none());
  });
});

describe("pointerValue", () => {
  it("maps the inset span, so a thumb at either end is centred on it", () => {
    expect(pointerValue(108, BOX, RANGE, 8)).toBe(0);
    expect(pointerValue(200, BOX, RANGE, 8)).toBe(50);
    expect(pointerValue(292, BOX, RANGE, 8)).toBe(100);
  });

  it("clamps a pointer outside the track", () => {
    expect(pointerValue(0, BOX, RANGE, 8)).toBe(0);
    expect(pointerValue(500, BOX, RANGE, 8)).toBe(100);
  });

  it("reads a track no wider than its inset as the minimum", () => {
    expect(pointerValue(100, { x: 100, width: 8 }, RANGE, 8)).toBe(0);
  });
});

describe("verticalPointerValue", () => {
  // A vertical value runs **up**: the top of the track is the maximum. A
  // mapping that reused the horizontal arithmetic would turn the bar upside
  // down while every thumb position still looked plausible at the ends.
  const BOX = { y: 100, height: 200 } as const;

  it("maps the inset span from the bottom, so the top is the maximum", () => {
    expect(verticalPointerValue(292, BOX, RANGE, 8)).toBe(0);
    expect(verticalPointerValue(200, BOX, RANGE, 8)).toBe(50);
    expect(verticalPointerValue(108, BOX, RANGE, 8)).toBe(100);
  });

  it("clamps a pointer above or below the track", () => {
    expect(verticalPointerValue(0, BOX, RANGE, 8)).toBe(100);
    expect(verticalPointerValue(500, BOX, RANGE, 8)).toBe(0);
  });

  it("reads a track no taller than its inset as the minimum", () => {
    expect(verticalPointerValue(100, { y: 100, height: 8 }, RANGE, 8)).toBe(0);
  });

  it("reads a position that is not a number as the minimum", () => {
    expect(verticalPointerValue(Number.NaN, BOX, RANGE, 8)).toBe(0);
  });
});

describe("range spans", () => {
  it("orders and clamps the two ends", () => {
    expect(normalizeSpan({ start: 80, end: 20 }, RANGE)).toStrictEqual({
      start: 20,
      end: 80,
    });
    expect(normalizeSpan({ start: -10, end: 300 }, RANGE)).toStrictEqual({
      start: 0,
      end: 100,
    });
  });

  it("picks the nearer end to move", () => {
    const span = { start: 20, end: 60 };
    expect(nearestEnd(10, span)).toBe("start");
    expect(nearestEnd(90, span)).toBe("end");
    expect(nearestEnd(40, span)).toBe("start");
  });

  it("picks the end a value has passed, even when both thumbs coincide", () => {
    // The bug guarded: with both ends at 0 a click at 90 was a tie, so it
    // grabbed the start — which cannot move right — and nothing happened.
    expect(nearestEnd(90, { start: 0, end: 0 })).toBe("end");
    expect(nearestEnd(-5, { start: 0, end: 0 })).toBe("start");
  });

  it("refuses to let the start pass the end", () => {
    const span = { start: 20, end: 60 };
    expect(moveSpanEnd(span, "start", 90, RANGE)).toStrictEqual({
      start: 60,
      end: 60,
    });
  });

  it("refuses to let the end pass the start", () => {
    const span = { start: 20, end: 60 };
    expect(moveSpanEnd(span, "end", 5, RANGE)).toStrictEqual({
      start: 20,
      end: 20,
    });
  });

  it("moves an end that stays inside the span", () => {
    const span = { start: 20, end: 60 };
    expect(moveSpanEnd(span, "start", 35, RANGE)).toStrictEqual({
      start: 35,
      end: 60,
    });
    expect(moveSpanEnd(span, "end", 70, RANGE)).toStrictEqual({
      start: 20,
      end: 70,
    });
  });
});

describe("spanFrom", () => {
  it("draws a span on either side of the point a drag was pressed on", () => {
    // The bug guarded: both ends on one value is one point, so the press picked
    // the start and a drag to the right was the one move the start may not make
    // — the pair could only ever be pulled leftwards.
    expect(spanFrom(50, 80, RANGE)).toStrictEqual({ start: 50, end: 80 });
    expect(spanFrom(50, 20, RANGE)).toStrictEqual({ start: 20, end: 50 });
  });

  it("holds the point while the pointer returns to it", () => {
    expect(spanFrom(50, 50, RANGE)).toStrictEqual({ start: 50, end: 50 });
  });

  it("clamps both the point and the pointer into the range", () => {
    expect(spanFrom(50, 500, RANGE)).toStrictEqual({ start: 50, end: 100 });
    expect(spanFrom(50, -500, RANGE)).toStrictEqual({ start: 0, end: 50 });
    expect(spanFrom(500, 40, RANGE)).toStrictEqual({ start: 40, end: 100 });
  });

  it("lands on the grid the pointer's own value snapped to", () => {
    const range = { min: 0, max: 100, step: 5 } as const;
    expect(spanFrom(50, 83, range)).toStrictEqual({ start: 50, end: 85 });
  });
});
