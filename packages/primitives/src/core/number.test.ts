/**
 * `NumberField`'s text and step rules.
 *
 * The guarded defects are the ones a hand-rolled number field ships: a comma
 * decimal silently read as a thousands separator, `"0x10"` read as 16, a field
 * with no maximum jumping to an invented one on End, and a step of 0 freezing
 * the arrows.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  clampNumeric,
  commitNumberDraft,
  decideNumberKey,
  formatNumber,
  initNumberDraft,
  numberDraftText,
  parseNumericText,
  stepNumber,
  syncNumberDraft,
  withNumberDraftText,
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

  it("reads a value it cannot paint as the nearest bound", () => {
    // The bug guarded: `Math.min`/`Math.max` pass `NaN` straight through, so a
    // controlled field painted "NaN" and its arrows moved nothing. A slider
    // already reads an unknown position as `min` (`core/value.ts`), and this is
    // the same rule for a typed value.
    expect(clampNumeric(Number.NaN, RANGE)).toBe(0);
    expect(clampNumeric(Number.POSITIVE_INFINITY, RANGE)).toBe(0);
    expect(clampNumeric(Number.NaN, { step: 1 })).toBe(0);
    expect(clampNumeric(Number.NaN, { step: 1, max: 5 })).toBe(5);
  });

  it("does not treat a bound it cannot lay out as a bound", () => {
    // A `max` of `NaN` used to poison every clamp: `Math.min(NaN, value)` is
    // `NaN`, so the field lost the value it was given.
    expect(clampNumeric(50, { step: 1, max: Number.NaN })).toBe(50);
    expect(clampNumeric(50, { step: 1, min: Number.NEGATIVE_INFINITY })).toBe(
      50,
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

  it("does not sign a value that rounds to zero", () => {
    // The bug guarded: `(-0.004).toFixed(2)` is `-0.00`, so a field with
    // `precision={2}` painted a negative number that means zero. The sign
    // belongs to the value, not to the rounding.
    expect(formatNumber(-0.004, 2)).toBe("0.00");
    expect(formatNumber(-0.0001)).toBe("0");
    expect(formatNumber(-0.4)).toBe("0");
    expect(formatNumber(-1.5, 2)).toBe("-1.50");
    expect(formatNumber(-0.5)).toBe("-1");
    expect(formatNumber(-0.04)).toBe("0");
  });

  it("keeps its fixed decimals past the exponential bound", () => {
    // The bug guarded: `toFixed` switches to the exponential form at 1e21, so a
    // value the parser accepts ("1e21") committed as "1e+21" under a promise of
    // fixed decimals. Every double that large is an integer.
    expect(formatNumber(1e21)).toBe("1000000000000000000000");
    expect(formatNumber(1.5e21, 2)).toBe("1500000000000000000000.00");
    expect(formatNumber(-1e21)).toBe("-1000000000000000000000");
    expect(formatNumber(1e-7, 8)).toBe("0.00000010");
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

  it("keeps a decimal step free of binary noise", () => {
    // The bug: `0.2 + 0.1` is 0.30000000000000004, which a controlled field
    // then reports and a form submits. The step lands on the decimal.
    expect(stepNumber(0.2, { step: 0.1 }, 1)).toBe(0.3);
    expect(stepNumber(0.05, { step: 0.1 }, 1)).toBe(0.15);
    expect(stepNumber(1.1, { step: 0.2 }, 1)).toBe(1.3);
    const tenSteps = Arr.reduce(Arr.range(1, 10), 0, (value) =>
      stepNumber(value, { step: 0.1 }, 1),
    );
    expect(tenSteps).toBe(1);
  });

  it("does not round away an integer step at a large magnitude", () => {
    expect(stepNumber(1e15, { step: 1 }, 1)).toBe(1_000_000_000_000_001);
  });

  it("steps from the value it paints when that value is not a number", () => {
    // The bug guarded: `NaN + 1` is `NaN`, so the arrow moved nothing. The
    // field paints a bound for such a value, and the move has to start there —
    // including a value the owner left outside the range before it shrank.
    expect(stepNumber(Number.NaN, RANGE, 1)).toBe(1);
    expect(stepNumber(-5, { step: 1, min: 0 }, 1)).toBe(1);
    expect(stepNumber(140, { step: 1, max: 100 }, -1)).toBe(99);
  });

  it("treats a step it cannot lay out as one", () => {
    expect(stepNumber(5, { step: Number.NaN }, 1)).toBe(6);
    expect(stepNumber(5, { step: Number.POSITIVE_INFINITY }, -1)).toBe(4);
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

  it("leaves the caret keys to the host's text field", () => {
    // The bug guarded: left and right moved the caret in the host's field, and
    // the field changed its value while the caret moved — a number a user
    // could not edit, because the caret could never cross a digit.
    expect(decideNumberKey(50, RANGE, "right")).toStrictEqual(Option.none());
    expect(decideNumberKey(50, RANGE, "left")).toStrictEqual(Option.none());
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

describe("the draft a number field keeps", () => {
  const display = (value: number): string => String(value);

  it("shows nothing until the field has a value or the user types", () => {
    const empty = initNumberDraft(Option.none(), false);
    expect(numberDraftText(empty, 0, display)).toBe("");
    const withDefault = initNumberDraft(Option.none(), true);
    expect(numberDraftText(withDefault, 5, display)).toBe("5");
    const controlled = initNumberDraft(Option.some(7), false);
    expect(numberDraftText(controlled, 7, display)).toBe("7");
  });

  it("keeps the raw text of an edit in progress", () => {
    const draft = withNumberDraftText(
      initNumberDraft(Option.none(), false),
      "1.",
    );
    expect(numberDraftText(draft, 1, display)).toBe("1.");
  });

  it("shows the value again once the edit is committed", () => {
    const draft = withNumberDraftText(
      initNumberDraft(Option.none(), false),
      "1.",
    );
    expect(numberDraftText(commitNumberDraft(draft), 1, display)).toBe("1");
  });

  it("keeps the draft while the owner's value does not move", () => {
    // The owner's value is the user's to type into; a re-render must not take
    // the text away.
    const draft = withNumberDraftText(
      initNumberDraft(Option.some(0), true),
      "1.",
    );
    expect(syncNumberDraft(draft, Option.some(0), RANGE)).toStrictEqual(
      Option.none(),
    );
  });

  it("keeps the draft while it still means the value the owner pushed", () => {
    // The bug guarded: the owner's echo of the user's own edit used to throw
    // the draft away, so `1.` became `1` under the caret.
    const draft = withNumberDraftText(
      initNumberDraft(Option.some(0), true),
      "1.",
    );
    const folded = syncNumberDraft(draft, Option.some(1), RANGE);
    expect(Option.getOrElse(folded, () => draft).text).toStrictEqual(
      Option.some("1."),
    );
  });

  it("drops the draft when the owner pushes a value it does not mean", () => {
    const draft = withNumberDraftText(
      initNumberDraft(Option.some(0), true),
      "12",
    );
    const folded = syncNumberDraft(draft, Option.some(99), RANGE);
    const next = Option.getOrElse(folded, () => draft);
    expect(next.text).toStrictEqual(Option.none());
    expect(numberDraftText(next, 99, display)).toBe("99");
  });

  it("shows a value that arrives after the field was mounted", () => {
    // The bug guarded: a field that mounted empty and was given a value later
    // kept showing nothing — the value was dropped on the floor.
    const draft = initNumberDraft(Option.none(), false);
    const folded = syncNumberDraft(draft, Option.some(5), RANGE);
    const next = Option.getOrElse(folded, () => draft);
    expect(numberDraftText(next, 5, display)).toBe("5");
  });

  it("never folds an owner's value that did not move into the draft", () => {
    const draft = initNumberDraft(Option.none(), false);
    expect(syncNumberDraft(draft, Option.none(), RANGE)).toStrictEqual(
      Option.none(),
    );
  });

  it("does not fold a value that never equals itself", () => {
    // The bug guarded: the owner's value was compared with `===` and `NaN`
    // never equals itself, so the draft folded on every render and called
    // `setDraft` each time — React threw "Too many re-renders" and the field
    // never painted. `Object.is` is the identity reading: `NaN` has not moved.
    const draft = initNumberDraft(Option.some(Number.NaN), true);
    expect(
      syncNumberDraft(draft, Option.some(Number.NaN), RANGE),
    ).toStrictEqual(Option.none());
  });
});
