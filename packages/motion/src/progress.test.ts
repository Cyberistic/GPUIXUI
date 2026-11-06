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
    expect(eased((t: number) => t * t, 0.5)).toBe(0.25);
    expect(eased((t: number) => 1 - t, 2)).toBe(0);
  });

  it("falls back to the linear progress for a curve that cannot read the frame", () => {
    expect(eased(() => Number.NaN, 0.5)).toBe(0.5);
    expect(eased(() => Number.POSITIVE_INFINITY, 0.25)).toBe(0.25);
    expect(eased(() => Number.NaN, Number.NaN)).toBe(0);
  });

  it("treats a value that is not a function as no curve", () => {
    expect(eased(undefined, 0.5)).toBe(0.5);
    expect(eased(null, 0.25)).toBe(0.25);
    expect(eased("easeOut", 0.5)).toBe(0.5);
  });
});
