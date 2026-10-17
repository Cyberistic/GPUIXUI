/**
 * `NumberField`'s text and step rules.
 *
 * The guarded defects are the ones a hand-rolled number field ships: a comma
 * decimal silently read as a thousands separator, `"0x10"` read as 16, a field
 * with no maximum jumping to an invented one on End, and a step of 0 freezing
 * the arrows.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  clampNumeric,
  decideNumberKey,
  formatNumber,
  parseNumericText,
  stepNumber,
  type NumberRange,
} from "./number.js";

const RANGE: NumberRange = { min: 0, max: 100, step: 1 };

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
});

describe("decideNumberKey", () => {
  it("steps with the arrows and pages with PageUp/PageDown", () => {
    expect(decideNumberKey(50, RANGE, "up")).toStrictEqual(Option.some(51));
    expect(decideNumberKey(50, RANGE, "right")).toStrictEqual(Option.some(51));
    expect(decideNumberKey(50, RANGE, "down")).toStrictEqual(Option.some(49));
    expect(decideNumberKey(50, RANGE, "left")).toStrictEqual(Option.some(49));
    expect(decideNumberKey(50, RANGE, "pageup")).toStrictEqual(Option.some(60));
    expect(decideNumberKey(50, RANGE, "pagedown")).toStrictEqual(
      Option.some(40),
    );
  });

  it("jumps only to a bound the field actually has", () => {
    expect(decideNumberKey(50, RANGE, "home")).toStrictEqual(Option.some(0));
    expect(decideNumberKey(50, RANGE, "end")).toStrictEqual(Option.some(100));
    // The bug guarded: End in an unbounded field must do nothing rather than
    // jump to a number this component made up.
    expect(decideNumberKey(50, { step: 1 }, "end")).toStrictEqual(
      Option.none(),
    );
    expect(decideNumberKey(50, { step: 1 }, "home")).toStrictEqual(
      Option.none(),
    );
  });

  it("leaves an unrelated key alone", () => {
    expect(decideNumberKey(50, RANGE, "a")).toStrictEqual(Option.none());
    expect(decideNumberKey(50, RANGE, "enter")).toStrictEqual(Option.none());
  });
});
