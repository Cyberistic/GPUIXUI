/**
 * TimePicker's clock arithmetic.
 *
 * The bugs this suite guards: a canonical parser that accepted `9:30`; a
 * formatter that dropped the leading zero; minute arithmetic that did not carry
 * at the hour or wrap at midnight; an out-of-range segment that was stored
 * instead of clamped; and a `minuteStep` of zero that made arrow keys a no-op.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  addMinutes,
  clampSegment,
  composeIsoTime,
  digitsOf,
  formatIsoTime,
  normalizeStep,
  padSegment,
  parseIsoTime,
  parseSegment,
  type TimeOfDay,
} from "./time.js";

const t = (hours: number, minutes: number): TimeOfDay => ({ hours, minutes });

describe("TimePicker clock", () => {
  it("parses only canonical HH:mm", () => {
    expect(Option.getOrNull(parseIsoTime("00:00"))).toEqual(t(0, 0));
    expect(Option.getOrNull(parseIsoTime("09:05"))).toEqual(t(9, 5));
    expect(Option.getOrNull(parseIsoTime("23:59"))).toEqual(t(23, 59));

    ["9:30", "24:00", "12:60", "", "12:5", "12:005"].forEach((value) => {
      expect(Option.isNone(parseIsoTime(value))).toBe(true);
    });
  });

  it("formats with both parts padded and round-trips every minute", () => {
    expect(formatIsoTime(t(0, 0))).toBe("00:00");
    expect(formatIsoTime(t(9, 5))).toBe("09:05");

    const mismatched = Arr.filter(Arr.range(0, 1439), (total) => {
      const time = t(Math.floor(total / 60), total % 60);
      return !Option.exists(
        parseIsoTime(formatIsoTime(time)),
        (parsed) =>
          parsed.hours === time.hours && parsed.minutes === time.minutes,
      );
    });

    expect(mismatched).toEqual([]);
  });

  it("carries forward across the hour", () => {
    expect(addMinutes(t(9, 59), 1)).toEqual(t(10, 0));
  });

  it("carries backward across the hour", () => {
    expect(addMinutes(t(10, 0), -1)).toEqual(t(9, 59));
  });

  it("wraps across midnight in both directions", () => {
    expect(addMinutes(t(23, 59), 1)).toEqual(t(0, 0));
    expect(addMinutes(t(0, 0), -1)).toEqual(t(23, 59));
  });

  it("is total over a whole day either way", () => {
    expect(addMinutes(t(8, 15), 1440)).toEqual(t(8, 15));
    expect(addMinutes(t(8, 15), -1500)).toEqual(t(7, 15));
  });

  it("keeps a strict segment parser", () => {
    expect(Option.getOrNull(parseSegment("9", 23))).toBe(9);
    expect(Option.getOrNull(parseSegment("09", 23))).toBe(9);
    expect(Option.getOrNull(parseSegment("23", 23))).toBe(23);

    ["", "1a", " 9", "123", "24"].forEach((text) => {
      expect(Option.isNone(parseSegment(text, 23))).toBe(true);
    });
  });

  it("clamps an out-of-range segment instead of storing it", () => {
    expect(Option.getOrNull(clampSegment("99", 23))).toBe(23);
    expect(Option.getOrNull(clampSegment("99", 59))).toBe(59);
    expect(Option.getOrNull(clampSegment("09", 23))).toBe(9);

    ["", "a", "9a", " 9"].forEach((text) => {
      expect(Option.isNone(clampSegment(text, 59))).toBe(true);
    });
  });

  it("pads a segment to two digits", () => {
    expect(padSegment(0)).toBe("00");
    expect(padSegment(9)).toBe("09");
    expect(padSegment(23)).toBe("23");
  });

  it("normalises a step into 1..59", () => {
    expect(normalizeStep(undefined)).toBe(1);
    expect(normalizeStep(0)).toBe(1);
    expect(normalizeStep(-3)).toBe(1);
    expect(normalizeStep(Number.NaN)).toBe(1);
    expect(normalizeStep(90)).toBe(59);
    expect(normalizeStep(5.7)).toBe(5);
  });

  it("keeps only the last two digits of an edit", () => {
    expect(digitsOf("09")).toBe("09");
    expect(digitsOf("0a9")).toBe("09");
    expect(digitsOf("092")).toBe("92");
    expect(digitsOf("ab")).toBe("");
  });

  it("composes a value only from a real segment pair", () => {
    expect(Option.getOrNull(composeIsoTime("", ""))).toBeNull();
    expect(Option.getOrNull(composeIsoTime("9", ""))).toBe("09:00");
    expect(Option.getOrNull(composeIsoTime("", "0"))).toBe("00:00");
    expect(Option.getOrNull(composeIsoTime("9", "45"))).toBe("09:45");
    expect(Option.isNone(composeIsoTime("9a", "45"))).toBe(true);
  });
});
