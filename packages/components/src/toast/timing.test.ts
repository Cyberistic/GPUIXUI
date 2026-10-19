/**
 * Toast progress arithmetic.
 *
 * The bug this guards: a progress bar that divides by a zero total paints `NaN`,
 * and one that keeps ticking through a hover/focus hold contradicts the toast's
 * own pause contract. The bar's percentage and its tick are therefore pure.
 */

import { describe, expect, it } from "vitest";
import {
  clampRemaining,
  PROGRESS_TICK_MS,
  progressPercent,
  tickTiming,
  type ToastTiming,
} from "./timing.js";

const timing = (remainingMs: number, paused = false): ToastTiming => ({
  id: "1",
  totalMs: 1000,
  remainingMs,
  paused,
});

describe("toast timing", () => {
  it("maps the remaining time to the bar's percentage", () => {
    expect(progressPercent(timing(1000))).toBe(100);
    expect(progressPercent(timing(500))).toBe(50);
    expect(progressPercent(timing(0))).toBe(0);
  });

  it("clamps a remaining value into the timing's range", () => {
    expect(clampRemaining(1000, -1)).toBe(0);
    expect(clampRemaining(1000, 1200)).toBe(1000);
    expect(progressPercent(timing(1200))).toBe(100);
  });

  it("draws no bar for a zero total instead of NaN", () => {
    expect(
      progressPercent({ id: "1", totalMs: 0, remainingMs: 0, paused: false }),
    ).toBe(0);
  });

  it("subtracts one visual tick while the clock runs", () => {
    expect(PROGRESS_TICK_MS).toBe(100);
    expect(tickTiming(timing(1000)).remainingMs).toBe(1000 - PROGRESS_TICK_MS);
  });

  it("returns the same timing while paused", () => {
    const paused = timing(600, true);
    expect(tickTiming(paused)).toBe(paused);
  });

  it("stops a final tick at zero", () => {
    expect(tickTiming(timing(40)).remainingMs).toBe(0);
  });
});
