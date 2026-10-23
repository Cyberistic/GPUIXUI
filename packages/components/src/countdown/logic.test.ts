/**
 * Countdown formatting.
 *
 * The bug these guard: a countdown that rounds a partial second up, a negative
 * remainder that renders "-1:59", capped hours after a day, days appearing when
 * they were not asked for, and a remainder the clock cannot read (`NaN` from a
 * deadline that never decoded, an infinity) painted as the literal word `NaN`.
 */

import { describe, expect, it } from "vitest";
import { breakdown, formatCountdown, readableRemaining } from "./logic.js";

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

  it("floors a partial second instead of rounding", () => {
    expect(formatCountdown(59_999)).toBe("00:59");
  });

  it("renders the last second of a day", () => {
    expect(formatCountdown(86_399_000)).toBe("23:59:59");
  });

  it("reads a remaining time it cannot paint as no time left", () => {
    // A deadline is arithmetic over a timestamp the application decoded, so a
    // field that never arrived reaches the clock as `NaN`, and an absent bound
    // as an infinity. None of them can be laid out as clock text.
    expect(breakdown(Number.NaN)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
    expect(formatCountdown(Number.NaN)).toBe("00:00");
    expect(formatCountdown(Number.POSITIVE_INFINITY)).toBe("00:00");
    expect(formatCountdown(Number.NEGATIVE_INFINITY)).toBe("00:00");
    expect(formatCountdown(Number.NaN, { showDays: true })).toBe("00:00");
  });
});

describe("readableRemaining", () => {
  it("keeps a finite duration and floors it at zero", () => {
    expect(readableRemaining(90_000)).toBe(90_000);
    expect(readableRemaining(0)).toBe(0);
    expect(readableRemaining(-5)).toBe(0);
  });

  it("reads an unreadable duration as no time left", () => {
    expect(readableRemaining(Number.NaN)).toBe(0);
    expect(readableRemaining(Number.POSITIVE_INFINITY)).toBe(0);
    expect(readableRemaining(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});
