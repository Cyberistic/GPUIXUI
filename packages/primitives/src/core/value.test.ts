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
  spanAfterMove,
  stepValue,
  usableLength,
  valueFraction,
  valueStep,
} from "./value.js";

const RANGE = { min: 0, max: 100, step: 1 } as const;
const BOX = { x: 100, width: 200 } as const;

describe("usableLength", () => {
  it("keeps a finite, non-negative length, including zero", () => {
    expect(usableLength(24, 20)).toBe(24);
    expect(usableLength(0, 20)).toBe(0);
  });

  it("falls back for a length the runtime cannot paint", () => {
    // The bug guarded (plan 371): a computed `NaN` reaches layout, the runtime
    // drops the invalid length, and the mark paints at zero height.
    expect(usableLength(Number.NaN, 20)).toBe(20);
    expect(usableLength(Number.POSITIVE_INFINITY, 20)).toBe(20);
    expect(usableLength(-8, 20)).toBe(20);
    expect(usableLength(undefined, 20)).toBe(20);
  });
});

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

  it("clamps an infinity to the bound on its side", () => {
    // The bug guarded (plan 637): `Number.isFinite` sent every non-finite value
    // down the `NaN` branch, so `value={+Infinity}` painted the minimum — the
    // opposite of an out-of-range value, while `Progress`/`NumberField` already
    // clamped it to the maximum.
    expect(clampValue(Number.POSITIVE_INFINITY, RANGE)).toBe(100);
    expect(clampValue(Number.NEGATIVE_INFINITY, RANGE)).toBe(0);
    expect(
      clampValue(Number.POSITIVE_INFINITY, { min: 1, max: 10, step: 2 }),
    ).toBe(10);
    expect(
      clampValue(Number.NEGATIVE_INFINITY, { min: 1, max: 10, step: 2 }),
    ).toBe(1);
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

  it("maps an infinite value to its own end of the track", () => {
    // The bug guarded (plan 637): `valueFraction` inherited the old clamp's
    // minimum, and `fractionValue` treated `±Infinity` like `NaN`, so an
    // infinite value painted an empty track instead of a full one.
    expect(valueFraction(Number.POSITIVE_INFINITY, RANGE)).toBe(1);
    expect(valueFraction(Number.NEGATIVE_INFINITY, RANGE)).toBe(0);
    expect(fractionValue(Number.POSITIVE_INFINITY, RANGE)).toBe(100);
    expect(fractionValue(Number.NEGATIVE_INFINITY, RANGE)).toBe(0);
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
});

describe("a step that does not divide the span", () => {
  // The bug guarded (plan 331): `max` was only an upper bound, so a value of
  // 10 in a 0..10 range stepped by 3 snapped back to the last grid stop, 9 —
  // `value={max}` painted 90 % of the track, ArrowRight at 9 was stuck,
  // ArrowLeft from 10 jumped to 6, and a default RangeSlider never filled.
  const COARSE = { min: 0, max: 10, step: 3 } as const;

  it("makes the maximum a stop of its own", () => {
    expect(clampValue(10, COARSE)).toBe(10);
    expect(fractionValue(1, COARSE)).toBe(10);
    expect(valueFraction(10, COARSE)).toBe(1);
  });

  it("snaps to the nearest stop, with a tie going to the maximum", () => {
    expect(clampValue(8, COARSE)).toBe(9);
    expect(clampValue(9.4, COARSE)).toBe(9);
    expect(clampValue(9.5, COARSE)).toBe(10);
  });

  it("steps to the neighbour stop, not by raw arithmetic", () => {
    expect(stepValue(9, COARSE, 1)).toBe(10);
    expect(stepValue(10, COARSE, -1)).toBe(9);
    expect(decideValueKey(9, COARSE, "right")).toStrictEqual(Option.some(10));
    expect(decideValueKey(10, COARSE, "left")).toStrictEqual(Option.some(9));
  });

  it("keeps Home and End on the ends the track paints", () => {
    expect(decideValueKey(4, COARSE, "home")).toStrictEqual(Option.some(0));
    expect(decideValueKey(4, COARSE, "end")).toStrictEqual(Option.some(10));
  });

  it("includes the maximum for a decimal step that does not divide", () => {
    const thirds = { min: 0, max: 1, step: 0.3 } as const;
    expect(clampValue(1, thirds)).toBe(1);
    expect(stepValue(0.9, thirds, 1)).toBe(1);
    expect(stepValue(1, thirds, -1)).toBe(0.9);
    expect(clampValue(0.94, thirds)).toBe(0.9);
  });

  it("leaves a divisible range and a continuous range unchanged", () => {
    expect(clampValue(37, { min: 0, max: 100, step: 10 })).toBe(40);
    expect(stepValue(100, RANGE, -1)).toBe(99);
    expect(clampValue(37.5, { min: 0, max: 100, step: 0 })).toBe(37.5);
    expect(stepValue(37.5, { min: 0, max: 100, step: 0 }, 1)).toBe(38.5);
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

  it("clamps a pointer sent to infinity to the nearest end", () => {
    // The same rule as a pointer far outside the box (plan 637): infinity is a
    // position beyond the track, not an unreadable one.
    expect(pointerValue(Number.POSITIVE_INFINITY, BOX, RANGE, 8)).toBe(100);
    expect(pointerValue(Number.NEGATIVE_INFINITY, BOX, RANGE, 8)).toBe(0);
    expect(pointerValue(Number.NaN, BOX, RANGE, 8)).toBe(0);
  });

  it("reads a track no wider than its inset as the minimum", () => {
    expect(pointerValue(100, { x: 100, width: 8 }, RANGE, 8)).toBe(0);
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

  it("clamps an infinite end to its own bound", () => {
    // The bug guarded (plan 637): `RangeSlider value={[0, Infinity]}` normalised
    // to `[0, 0]`, so a promised full band painted at the start.
    expect(
      normalizeSpan({ start: 0, end: Number.POSITIVE_INFINITY }, RANGE),
    ).toStrictEqual({ start: 0, end: 100 });
    expect(
      normalizeSpan({ start: Number.NEGATIVE_INFINITY, end: 50 }, RANGE),
    ).toStrictEqual({ start: 0, end: 50 });
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

describe("spanAfterMove", () => {
  it("returns the current pair by identity when the move changes nothing", () => {
    // The bug guarded (plan 373): a fresh tuple for an unchanged gesture is
    // never Object.is-equal, so `useControlState` woke the parent on every
    // pointer move inside one stop and on an End already at the maximum.
    const atEnd = [20, 60] as const;
    expect(spanAfterMove(atEnd, "end", 60, RANGE)).toBe(atEnd);
    const atMin = [0, 60] as const;
    expect(spanAfterMove(atMin, "start", -10, RANGE)).toBe(atMin);
  });

  it("returns a moved pair, not the current one", () => {
    const current = [20, 60] as const;
    const next = spanAfterMove(current, "end", 90, RANGE);
    expect(next).toStrictEqual([20, 90]);
    expect(next).not.toBe(current);
  });

  it("reports the clamped pair when an end is pushed past the other", () => {
    expect(spanAfterMove([20, 60], "start", 95, RANGE)).toStrictEqual([60, 60]);
  });

  it("normalises a pair supplied out of order before deciding", () => {
    expect(spanAfterMove([60, 20], "end", 90, RANGE)).toStrictEqual([20, 90]);
  });
});
