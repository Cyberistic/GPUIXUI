/**
 * `NumberField`'s text and step rules.
 *
 * The guarded defects are the ones a hand-rolled number field ships: a comma
 * decimal silently read as a thousands separator, `"0x10"` read as 16, a step of
 * 0 freezing the arrows, a draft that outlives the value it belongs to (plan
 * `325`), and a documented step for a key the native editor consumes instead
 * (plan `338`).
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  clampNumeric,
  decideNumberKey,
  draftApplies,
  formatNumber,
  normalizeNumberRange,
  parseNumericText,
  stepNumber,
  type NumberDraft,
  type NumberRange,
} from "./number.js";

const RANGE: NumberRange = { min: 0, max: 100, step: 1 };

describe("normalizeNumberRange", () => {
  it("ignores a bound that is not a number, so the field stays usable", () => {
    // The bug guarded (plan 371): a computed `min` of NaN was clamped into, so
    // the field painted "NaN" and every step was suppressed by the no-op guard.
    expect(
      normalizeNumberRange({ min: Number.NaN, max: 9, step: 1 }),
    ).toStrictEqual({
      min: undefined,
      max: 9,
      step: 1,
    });
    expect(
      normalizeNumberRange({ min: 1, max: Number.POSITIVE_INFINITY, step: 1 }),
    ).toStrictEqual({ min: 1, max: undefined, step: 1 });
  });

  it("swaps an inverted pair, like every other value control", () => {
    expect(normalizeNumberRange({ min: 100, max: 0, step: 1 })).toStrictEqual({
      min: 0,
      max: 100,
      step: 1,
    });
  });

  it("gives a step that cannot move the value a usable one", () => {
    expect(normalizeNumberRange({ step: 0 }).step).toBe(1);
    expect(normalizeNumberRange({ step: -2 }).step).toBe(1);
    expect(normalizeNumberRange({ step: Number.POSITIVE_INFINITY }).step).toBe(
      1,
    );
    expect(normalizeNumberRange({ step: Number.NaN }).step).toBe(1);
  });
});

describe("parseNumericText", () => {
  it("reads decimal notation, including a leading dot and an exponent", () => {
    expect(parseNumericText("12")).toStrictEqual(Option.some(12));
    expect(parseNumericText("1.5")).toStrictEqual(Option.some(1.5));
    expect(parseNumericText(".5")).toStrictEqual(Option.some(0.5));
    expect(parseNumericText("1.")).toStrictEqual(Option.some(1));
    expect(parseNumericText("-2")).toStrictEqual(Option.some(-2));
    expect(parseNumericText("1e3")).toStrictEqual(Option.some(1000));
    expect(parseNumericText(" 4 ")).toStrictEqual(Option.some(4));
  });

  it("does not invent a number out of an empty field or a sign", () => {
    expect(parseNumericText("")).toStrictEqual(Option.none());
    expect(parseNumericText("   ")).toStrictEqual(Option.none());
    expect(parseNumericText("-")).toStrictEqual(Option.none());
    expect(parseNumericText(".")).toStrictEqual(Option.none());
  });

  it("rejects a locale decimal, hex and Infinity instead of guessing", () => {
    // The bugs guarded: Number("1,5") is NaN but Number("0x10") is 16 and
    // Number("Infinity") is Infinity — neither belongs in a number field.
    expect(parseNumericText("1,5")).toStrictEqual(Option.none());
    expect(parseNumericText("0x10")).toStrictEqual(Option.none());
    expect(parseNumericText("Infinity")).toStrictEqual(Option.none());
  });
});

describe("clampNumeric", () => {
  it("clamps to whichever bounds exist", () => {
    expect(clampNumeric(-5, RANGE)).toBe(0);
    expect(clampNumeric(140, RANGE)).toBe(100);
    expect(clampNumeric(-5, { step: 1, min: 0 })).toBe(0);
    expect(clampNumeric(140, { step: 1, max: 100 })).toBe(100);
    expect(clampNumeric(-5, { step: 1 })).toBe(-5);
  });

  it("ignores a bound it cannot read instead of clamping to NaN", () => {
    expect(clampNumeric(5, { step: 1, min: Number.NaN })).toBe(5);
    expect(clampNumeric(5, { step: 1, max: Number.NaN })).toBe(5);
  });

  it("clamps into the swapped range of an inverted pair", () => {
    // The bug guarded (plan 371): `min=100 max=0` collapsed to `max`, so a
    // field holding 150 painted 0 instead of its own upper bound.
    const inverted = { step: 1, min: 100, max: 0 } as const;
    expect(clampNumeric(150, inverted)).toBe(100);
    expect(clampNumeric(-5, inverted)).toBe(0);
  });

  it("reads a value that is not a number as a finite one", () => {
    // The bug guarded (plan 392): a controlled `value={NaN}` went straight to
    // the paint as "NaN", a bound did not help (Math.max(10, NaN) is NaN), and
    // an unbounded infinity painted "Infinity". The rule is the one a slider
    // already follows: an unknown value reads as the floor, an infinity as the
    // bound on its own side.
    expect(clampNumeric(Number.NaN, { step: 1 })).toBe(0);
    expect(clampNumeric(Number.NaN, { step: 1, min: 10, max: 20 })).toBe(10);
    expect(
      clampNumeric(Number.POSITIVE_INFINITY, { step: 1, min: 0, max: 100 }),
    ).toBe(100);
    expect(
      clampNumeric(Number.NEGATIVE_INFINITY, { step: 1, min: 0, max: 100 }),
    ).toBe(0);
    expect(clampNumeric(Number.POSITIVE_INFINITY, { step: 1 })).toBe(0);
    expect(clampNumeric(Number.NEGATIVE_INFINITY, { step: 1 })).toBe(0);
    expect(clampNumeric(Number.NEGATIVE_INFINITY, { step: 1, max: -10 })).toBe(
      -10,
    );
  });
});

describe("formatNumber", () => {
  it("uses fixed decimals and never a separator", () => {
    expect(formatNumber(12)).toBe("12");
    expect(formatNumber(1.234, 2)).toBe("1.23");
    expect(formatNumber(1000, 0)).toBe("1000");
  });

  it("keeps a nonsensical precision from throwing", () => {
    expect(formatNumber(1.6, -1)).toBe("2");
    // toFixed accepts at most 20 decimals; a larger precision is clamped, not
    // handed to the runtime to fail on.
    expect(formatNumber(1.23456789, 40)).toHaveLength(22);
  });

  it("treats a precision that is not a number as zero decimals", () => {
    // The bug guarded (plan 392): `precision={Infinity}` reached the 20-decimal
    // ceiling and painted "1.25000000000000000000"; a precision is either a
    // usable decimal count or the documented default of 0.
    expect(formatNumber(1.25, Number.POSITIVE_INFINITY)).toBe("1");
    expect(formatNumber(1.25, Number.NEGATIVE_INFINITY)).toBe("1");
    expect(formatNumber(1.25, Number.NaN)).toBe("1");
  });
});

describe("stepNumber", () => {
  it("moves by steps and clamps at the ends", () => {
    expect(stepNumber(10, RANGE, 1)).toBe(11);
    expect(stepNumber(10, RANGE, -10)).toBe(0);
    expect(stepNumber(100, RANGE, 1)).toBe(100);
  });

  it("treats a zero step as one, so the arrows never freeze", () => {
    expect(stepNumber(10, { step: 0 }, 1)).toBe(11);
  });

  it("treats an unreadable step as one instead of reporting Infinity", () => {
    // The bug guarded (plan 371): an infinite step painted "Infinity" and
    // reported it to the parent on the first ArrowUp.
    expect(stepNumber(5, { step: Number.POSITIVE_INFINITY }, 1)).toBe(6);
    expect(stepNumber(5, { step: Number.NaN }, 1)).toBe(6);
  });

  it("keeps a decimal step exact instead of binary noise", () => {
    // The bug guarded: 0.2 + 0.1 is 0.30000000000000004, and a field that
    // reports that while painting "0.3" hands its consumer a different number
    // from the one on screen (plan 077).
    expect(stepNumber(0.2, { step: 0.1 }, 1)).toBe(0.3);
    expect(stepNumber(1.1, { step: 0.1 }, 1)).toBe(1.2);
    expect(stepNumber(-0.2, { step: 0.1 }, -1)).toBe(-0.3);
  });

  it("keeps the precision the user typed", () => {
    expect(stepNumber(1.234, { step: 1 }, 1)).toBe(2.234);
  });

  it("trims after clamping, so a bound is still exact", () => {
    expect(stepNumber(0.2, { step: 0.1, max: 0.3 }, 1)).toBe(0.3);
  });

  it("starts from the value the field paints", () => {
    // The bug guarded (plan 392): the base was the raw prop, so a base outside
    // the range could not move in either direction (`150` under `max=100` gave
    // 100 for both `+1` and `-1`) and a `NaN` base stayed `NaN`, freezing the
    // arrows. A step starts at the clamped value (plan 362's component rule).
    expect(stepNumber(150, RANGE, -1)).toBe(99);
    expect(stepNumber(Number.NaN, { step: 1 }, 1)).toBe(1);
    expect(stepNumber(Number.POSITIVE_INFINITY, RANGE, -1)).toBe(99);
  });
});

describe("decideNumberKey", () => {
  it("steps with the arrows and pages with PageUp/PageDown", () => {
    expect(decideNumberKey(50, RANGE, "up")).toStrictEqual(Option.some(51));
    expect(decideNumberKey(50, RANGE, "down")).toStrictEqual(Option.some(49));
    expect(decideNumberKey(50, RANGE, "pageup")).toStrictEqual(Option.some(60));
    expect(decideNumberKey(50, RANGE, "pagedown")).toStrictEqual(
      Option.some(40),
    );
  });

  it("leaves the caret keys to the native editor", () => {
    // Measured (plan 338): the editor consumes these key downs to move the
    // caret, so the handler never sees them. Answering them here would advertise
    // a step that cannot fire — and re-add one the day the runtime dispatches
    // them, stealing the caret.
    expect(decideNumberKey(50, RANGE, "left")).toStrictEqual(Option.none());
    expect(decideNumberKey(50, RANGE, "right")).toStrictEqual(Option.none());
    expect(decideNumberKey(50, RANGE, "home")).toStrictEqual(Option.none());
    expect(decideNumberKey(50, RANGE, "end")).toStrictEqual(Option.none());
  });

  it("leaves an unrelated key alone", () => {
    expect(decideNumberKey(50, RANGE, "a")).toStrictEqual(Option.none());
    expect(decideNumberKey(50, RANGE, "enter")).toStrictEqual(Option.none());
  });
});

describe("draftApplies", () => {
  const draft = (
    text: string,
    base: number,
    reported: Option.Option<number>,
  ): NumberDraft => ({ text, base, reported });

  it("keeps the draft while the parent has not moved", () => {
    expect(draftApplies(draft("1.", 1, Option.some(1)), 1)).toBe(true);
  });

  it("keeps the draft the parent accepted", () => {
    // The user typed 123 and the parent made it the value: the text must stay.
    expect(draftApplies(draft("123", 12, Option.some(123)), 123)).toBe(true);
  });

  it("drops the draft when the parent chose another value", () => {
    // The bug guarded (plan 325): a reset to 5 must replace the stale "123".
    expect(draftApplies(draft("123", 12, Option.some(123)), 5)).toBe(false);
  });

  it("drops a draft with no reported value on an external change", () => {
    expect(draftApplies(draft("-", 4, Option.none()), 4)).toBe(true);
    expect(draftApplies(draft("-", 4, Option.none()), 9)).toBe(false);
  });
});
