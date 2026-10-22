/**
 * Guards the progress rule every curve shares: a value that cannot be read is
 * the start of the run, and a curve that cannot read the frame it is handed
 * falls back to the linear progress instead of painting `NaN`.
 *
 * Reverting either branch fails a case here, and the three samplers that apply
 * a caller's curve (`sampleKeyframes`, `Sequence.sample` and
 * `MotionValue.sample`) are measured where they live.
 */
import { describe, expect, it } from "vitest";
import { clamp01, eased } from "./progress.js";

describe("clamp01", () => {
  it("reads a progress it cannot read as the start, and an infinity as its end", () => {
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(Number.NEGATIVE_INFINITY)).toBe(0);
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it("holds a readable progress inside [0, 1]", () => {
    expect(clamp01(-0.25)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(1.25)).toBe(1);
  });
});

describe("eased", () => {
  it("applies a curve to the clamped progress", () => {
    expect(eased((t) => t * t, 0.5)).toBe(0.25);
    expect(eased((t) => 1 - t, 2)).toBe(0);
  });

  it("falls back to the linear progress for a curve that cannot read the frame", () => {
    // A curve answering `NaN` (or an infinity) is not a curve: the caller's
    // frame is the unit progress itself, so the run still starts, ends and
    // completes where it said.
    expect(eased(() => Number.NaN, 0.5)).toBe(0.5);
    expect(eased(() => Number.POSITIVE_INFINITY, 0.25)).toBe(0.25);
    expect(eased(() => Number.NaN, Number.NaN)).toBe(0);
  });
});
