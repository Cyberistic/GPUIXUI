/**
 * Countdown formatting.
 *
 * The bug these guard: a countdown that rounds a partial second up, a negative
 * remainder that renders "-1:59", capped hours after a day, and days appearing
 * when they were not asked for; and a non-finite remainder that painted
 * `NaN:NaN` instead of the settled clock (plan 650).
 */

import { describe, expect, it } from "vitest";
import { breakdown, formatCountdown } from "./logic.js";

describe("breakdown", () => {
  it("splits a duration into whole units", () => {
    expect(breakdown(90_000)).toEqual({
      days: 0,
      hours: 0,
      minutes: 1,
      seconds: 30,
    });
  });

  it("floors partial seconds", () => {
    expect(breakdown(59_999).seconds).toBe(59);
  });

  it("clamps negatives to zero", () => {
    expect(breakdown(-5_000)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("splits a non-finite duration into zero units", () => {
    // The bug this guards (plan 650): `Math.max(0, NaN)` is NaN, so every unit
    // came back NaN and the clock painted `NaN:NaN`.
    expect(breakdown(Number.NaN)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });
});

describe("formatCountdown", () => {
  it("renders MM:SS under an hour", () => {
    expect(formatCountdown(90_000)).toBe("01:30");
  });

  it("renders uncapped hours once there is one", () => {
    expect(formatCountdown(90_000_000)).toBe("25:00:00");
  });

  it("adds the day prefix only when asked and only with a full day", () => {
    expect(formatCountdown(90_000_000, { showDays: true })).toBe("1d 01:00:00");
    expect(formatCountdown(3_600_000, { showDays: true })).toBe("01:00:00");
  });

  it("renders 00:00 at and below zero", () => {
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(-1)).toBe("00:00");
  });

  it("reads a non-finite duration as the settled clock text", () => {
    // The bug this guards (plan 650): the text was `NaN:NaN`, and
    // `Infinityd Infinity:NaN:NaN` with days shown.
    expect(formatCountdown(Number.NaN)).toBe("00:00");
    expect(formatCountdown(Number.POSITIVE_INFINITY)).toBe("00:00");
    expect(formatCountdown(Number.NEGATIVE_INFINITY, { showDays: true })).toBe(
      "00:00",
    );
  });

  it("floors a partial second instead of rounding", () => {
    expect(formatCountdown(59_999)).toBe("00:59");
  });

  it("renders the last second of a day", () => {
    expect(formatCountdown(86_399_000)).toBe("23:59:59");
  });
});
