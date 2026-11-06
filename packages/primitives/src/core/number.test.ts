import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  clampNumeric,
  commitNumberDraft,
  decideNumberKey,
  displayNumber,
  formatNumber,
  initNumberDraft,
  normalizeNumberRange,
  numberDisplay,
  numberDraftText,
  parseNumberText,
  parseNumericText,
  SCRUB_PIXELS_PER_STEP,
  SHIFT_SCRUB_SCALE,
  scrubNumber,
  stepNumber,
  syncNumberDraft,
  withNumberDraftText,
  withNumberDraftValue,
  type NumberRange,
  type ParseValue,
} from "./number.js";

const RANGE: NumberRange = { min: 0, max: 100, step: 1 };

const UNBOUNDED: NumberRange = { step: 1 };

const grouped: ParseValue = (text) => {
  const cleaned = text.replaceAll(",", "");
  return /^[+-]?\d+(?:\.\d+)?$/.test(cleaned)
    ? Option.some(Number(cleaned))
    : Option.none();
};

const commaDecimal: ParseValue = (text) => {
  const cleaned = text.replace(",", ".");
  return /^[+-]?\d+(?:\.\d+)?$/.test(cleaned)
    ? Option.some(Number(cleaned))
    : Option.none();
};

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
    expect(parseNumericText("1,5")).toStrictEqual(Option.none());
    expect(parseNumericText("0x10")).toStrictEqual(Option.none());
    expect(parseNumericText("Infinity")).toStrictEqual(Option.none());
  });
});

describe("parseNumberText", () => {
  it("reads the format a caller's formatValue painted", () => {
    expect(parseNumberText("1,234", grouped)).toStrictEqual(Option.some(1234));
    expect(parseNumberText("1,5", commaDecimal)).toStrictEqual(
      Option.some(1.5),
    );
    expect(parseNumberText("1,2345", grouped)).toStrictEqual(
      Option.some(12345),
    );
  });

  it("still reads decimal text the caller's parser declines", () => {
    expect(parseNumberText("12", grouped)).toStrictEqual(Option.some(12));
    expect(parseNumberText(" -.5 ", grouped)).toStrictEqual(Option.some(-0.5));
    expect(parseNumberText("12", commaDecimal)).toStrictEqual(Option.some(12));
  });

  it("keeps an empty field empty whatever a parser answers", () => {
    const always: ParseValue = () => Option.some(0);
    expect(parseNumberText("", always)).toStrictEqual(Option.none());
    expect(parseNumberText("   ", always)).toStrictEqual(Option.none());
  });

  it("does not let a parser hand the field an unpaintable number", () => {
    const broken: ParseValue = () => Option.some(Number.NaN);
    expect(parseNumberText("12", broken)).toStrictEqual(Option.some(12));
    expect(parseNumberText("twelve", broken)).toStrictEqual(Option.none());
    expect(
      parseNumberText("twelve", () => Option.some(Number.POSITIVE_INFINITY)),
    ).toStrictEqual(Option.none());
  });
});

describe("normalizeNumberRange", () => {
  it("reads an inverted pair as the range it means", () => {
    expect(normalizeNumberRange({ min: 100, max: 0, step: 2 })).toStrictEqual({
      min: 0,
      max: 100,
      step: 2,
    });
    expect(clampNumeric(50, { min: 100, max: 0, step: 1 })).toBe(50);
    expect(stepNumber(50, { min: 100, max: 0, step: 1 }, 1)).toBe(51);
  });

  it("still drops a bound it cannot lay out", () => {
    expect(
      normalizeNumberRange({ min: Number.NaN, max: 10, step: 1 }),
    ).toStrictEqual({
      min: undefined,
      max: 10,
      step: 1,
    });
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
    expect(clampNumeric(Number.NaN, RANGE)).toBe(0);
    expect(clampNumeric(Number.POSITIVE_INFINITY, RANGE)).toBe(0);
    expect(clampNumeric(Number.NaN, { step: 1 })).toBe(0);
    expect(clampNumeric(Number.NaN, { step: 1, max: 5 })).toBe(5);
  });

  it("does not treat a bound it cannot lay out as a bound", () => {
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

    expect(formatNumber(1.23456789, 40)).toHaveLength(22);
  });

  it("does not sign a value that rounds to zero", () => {
    expect(formatNumber(-0.004, 2)).toBe("0.00");
    expect(formatNumber(-0.0001)).toBe("0");
    expect(formatNumber(-0.4)).toBe("0");
    expect(formatNumber(-1.5, 2)).toBe("-1.50");
    expect(formatNumber(-0.5)).toBe("-1");
    expect(formatNumber(-0.04)).toBe("0");
  });

  it("keeps its fixed decimals past the exponential bound", () => {
    expect(formatNumber(1e21)).toBe("1000000000000000000000");
    expect(formatNumber(1.5e21, 2)).toBe("1500000000000000000000.00");
    expect(formatNumber(-1e21)).toBe("-1000000000000000000000");
    expect(formatNumber(1e-7, 8)).toBe("0.00000010");
  });
});

describe("numberDisplay", () => {
  it("paints the caller's format when it says something", () => {
    const grouped = (value: number): string => value.toLocaleString("en-US");
    expect(numberDisplay(1234, 2, grouped)).toBe("1,234");

    expect(numberDisplay(42, undefined, () => " 42 ")).toBe(" 42 ");
  });

  it("paints the value it holds when the caller's format says nothing", () => {
    expect(numberDisplay(5, undefined, () => "")).toBe("5");
    expect(numberDisplay(5, undefined, () => "   ")).toBe("5");
    expect(numberDisplay(1.5, 2, () => "")).toBe("1.50");
    expect(numberDisplay(-0.25, undefined, () => "\t")).toBe("-0.25");

    expect(numberDisplay(7, 1)).toBe("7.0");
  });
});

describe("displayNumber", () => {
  it("paints the value's own decimals when no precision is asked for", () => {
    expect(displayNumber(1.5)).toBe("1.5");
    expect(displayNumber(2.5)).toBe("2.5");
    expect(displayNumber(-0.25)).toBe("-0.25");
    expect(displayNumber(2)).toBe("2");
    expect(displayNumber(0)).toBe("0");
  });

  it("paints the double it holds, tail and all, unless a precision says otherwise", () => {
    expect(displayNumber(0.1 + 0.2)).toBe("0.30000000000000004");
    expect(displayNumber(0.1 + 0.2, 3)).toBe("0.300");
  });

  it("keeps a fixed precision the caller asked for", () => {
    expect(displayNumber(1.5, 2)).toBe("1.50");
    expect(displayNumber(1.5, 0)).toBe("2");
    expect(displayNumber(-1.5, 2)).toBe("-1.50");
  });

  it("paints the value's own decimals for a precision a store did not carry", () => {
    expect(displayNumber(1.5, null)).toBe("1.5");
    expect(displayNumber(2.5, null)).toBe("2.5");
    expect(displayNumber(1.5, "2")).toBe("1.5");
    expect(displayNumber(1.5, Number.NaN)).toBe("1.5");

    expect(displayNumber(1.5)).toBe("1.5");
  });

  it("expands the exponent a shortest text uses", () => {
    expect(displayNumber(1e21)).toBe("1000000000000000000000");
    expect(displayNumber(-2.5e-7)).toBe("-0.00000025");
    expect(displayNumber(1.5e-9)).toBe("0.0000000015");
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
    expect(stepNumber(Number.NaN, RANGE, 1)).toBe(1);
    expect(stepNumber(-5, { step: 1, min: 0 }, 1)).toBe(1);
    expect(stepNumber(140, { step: 1, max: 100 }, -1)).toBe(99);
  });

  it("treats a step it cannot lay out as one", () => {
    expect(stepNumber(5, { step: Number.NaN }, 1)).toBe(6);
    expect(stepNumber(5, { step: Number.POSITIVE_INFINITY }, -1)).toBe(4);
  });
});

describe("scrubNumber", () => {
  it("moves one step per four pixels, raising the value on an upward drag", () => {
    expect(SCRUB_PIXELS_PER_STEP).toBe(4);
    expect(scrubNumber(50, 4, RANGE)).toBe(51);
    expect(scrubNumber(50, -4, RANGE)).toBe(49);
    expect(scrubNumber(50, 40, RANGE)).toBe(60);
    expect(scrubNumber(50, -40, RANGE)).toBe(40);
  });

  it("answers a travel the same either side of the half step", () => {
    expect(scrubNumber(50, 6, RANGE)).toBe(52);
    expect(scrubNumber(50, -6, RANGE)).toBe(48);
  });

  it("keeps a click a click", () => {
    expect(scrubNumber(50, 1, RANGE)).toBe(50);
    expect(scrubNumber(50, 0, RANGE)).toBe(50);
  });

  it("clamps at both bounds", () => {
    expect(scrubNumber(95, 40, RANGE)).toBe(100);
    expect(scrubNumber(5, -40, RANGE)).toBe(0);
  });

  it("keeps a decimal step free of binary noise", () => {
    expect(scrubNumber(0.2, 4, { step: 0.1 })).toBe(0.3);
    expect(scrubNumber(0.2, -8, { step: 0.1 })).toBe(0);
  });

  it("leaves the value alone when the travel cannot be measured", () => {
    expect(scrubNumber(50, Number.NaN, RANGE)).toBe(50);
    expect(scrubNumber(50, Number.POSITIVE_INFINITY, RANGE)).toBe(50);
  });

  it("falls back to the house scale when the scale cannot be laid out", () => {
    expect(scrubNumber(50, 4, RANGE, Number.NaN)).toBe(51);
    expect(scrubNumber(50, 4, RANGE, 0)).toBe(51);
    expect(scrubNumber(50, 8, RANGE, 8)).toBe(51);
  });

  it("multiplies the counted steps by a held modifier's scale", () => {
    expect(SHIFT_SCRUB_SCALE).toBe(10);
    expect(
      scrubNumber(50, 8, RANGE, SCRUB_PIXELS_PER_STEP, SHIFT_SCRUB_SCALE),
    ).toBe(70);
    expect(
      scrubNumber(50, -8, RANGE, SCRUB_PIXELS_PER_STEP, SHIFT_SCRUB_SCALE),
    ).toBe(30);

    expect(scrubNumber(50, 8, RANGE, SCRUB_PIXELS_PER_STEP, Number.NaN)).toBe(
      52,
    );
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
    expect(decideNumberKey(50, RANGE, "right")).toStrictEqual(Option.none());
    expect(decideNumberKey(50, RANGE, "left")).toStrictEqual(Option.none());
  });

  it("jumps only to a bound the field actually has", () => {
    expect(decideNumberKey(50, RANGE, "home")).toStrictEqual(Option.some(0));
    expect(decideNumberKey(50, RANGE, "end")).toStrictEqual(Option.some(100));

    expect(decideNumberKey(50, { step: 1 }, "end")).toStrictEqual(
      Option.none(),
    );
    expect(decideNumberKey(50, { step: 1 }, "home")).toStrictEqual(
      Option.none(),
    );
  });

  it("reads the bounds the range actually has, not the raw pair", () => {
    const inverted: NumberRange = { min: 100, max: 0, step: 1 };
    expect(decideNumberKey(50, inverted, "home")).toStrictEqual(Option.some(0));
    expect(decideNumberKey(50, inverted, "end")).toStrictEqual(
      Option.some(100),
    );
    expect(
      decideNumberKey(50, { min: Number.NaN, step: 1 }, "home"),
    ).toStrictEqual(Option.none());
    expect(
      decideNumberKey(50, { max: Number.NaN, step: 1 }, "end"),
    ).toStrictEqual(Option.none());
    expect(
      decideNumberKey(
        50,
        { min: Number.POSITIVE_INFINITY, max: 10, step: 1 },
        "end",
      ),
    ).toStrictEqual(Option.some(10));
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

  it("shows the value again once an edit that made a number is committed", () => {
    const draft = withNumberDraftValue(
      withNumberDraftText(initNumberDraft(Option.none(), false), "1."),
    );
    expect(numberDraftText(commitNumberDraft(draft), 1, display)).toBe("1");
  });

  it("leaves an empty field empty instead of showing the zero its state starts from", () => {
    const untouched = initNumberDraft(Option.none(), false);
    expect(numberDraftText(commitNumberDraft(untouched), 0, display)).toBe("");

    const garbage = withNumberDraftText(untouched, "abc");
    expect(numberDraftText(commitNumberDraft(garbage), 0, display)).toBe("");
  });

  it("keeps the last number when a field that had one is cleared", () => {
    const valued = initNumberDraft(Option.none(), true);
    const cleared = withNumberDraftText(valued, "");
    expect(numberDraftText(commitNumberDraft(cleared), 5, display)).toBe("5");
    expect(numberDraftText(cleared, 5, display)).toBe("");
  });

  it("keeps the draft while the owner's value does not move", () => {
    const draft = withNumberDraftText(
      initNumberDraft(Option.some(0), true),
      "1.",
    );
    expect(syncNumberDraft(draft, Option.some(0), RANGE)).toStrictEqual(
      Option.none(),
    );
  });

  it("keeps the draft while it still means the value the owner pushed", () => {
    const draft = withNumberDraftText(
      initNumberDraft(Option.some(0), true),
      "1.",
    );
    const folded = syncNumberDraft(draft, Option.some(1), RANGE);
    expect(Option.getOrElse(folded, () => draft).text).toStrictEqual(
      Option.some("1."),
    );
  });

  it("keeps a grouped draft while it means the value the owner echoes", () => {
    const draft = withNumberDraftText(
      initNumberDraft(Option.some(1234), true),
      "1,2345",
    );
    const folded = syncNumberDraft(
      draft,
      Option.some(12345),
      UNBOUNDED,
      grouped,
    );
    expect(Option.getOrElse(folded, () => draft).text).toStrictEqual(
      Option.some("1,2345"),
    );

    const decimal = syncNumberDraft(draft, Option.some(12345), UNBOUNDED);
    expect(Option.getOrElse(decimal, () => draft).text).toStrictEqual(
      Option.none(),
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
    const draft = initNumberDraft(Option.some(Number.NaN), true);
    expect(
      syncNumberDraft(draft, Option.some(Number.NaN), RANGE),
    ).toStrictEqual(Option.none());
  });
});
