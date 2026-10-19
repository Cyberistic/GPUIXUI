/**
 * Bounds and positions that must survive a malformed number. The bugs these
 * guard: `Math.max(0, NaN)` propagated `NaN`, and `Arr.take(list, NaN)`
 * returned nothing, so a malformed cap read as "show no entries"; a fractional
 * list index named no entry, so a component painted its fallback while the
 * state claimed the fraction (plan 657).
 */

import { describe, expect, it } from "vitest";
import { wholeCap, wholeIndex } from "./count.js";

describe("wholeCap", () => {
  it("truncates a finite count and keeps the floor", () => {
    expect(wholeCap(3.9)).toBe(3);
    expect(wholeCap(-4)).toBe(0);
    expect(wholeCap(-4, 1)).toBe(1);
  });

  it("treats a non-finite count as no cap", () => {
    expect(wholeCap(Number.NaN)).toBe(Number.POSITIVE_INFINITY);
    expect(wholeCap(Number.NaN, 1)).toBe(Number.POSITIVE_INFINITY);
    expect(wholeCap(Number.NEGATIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
    expect(wholeCap(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("wholeIndex", () => {
  it("truncates a fractional index to the entry below it", () => {
    expect(wholeIndex(1.5, 3)).toBe(1);
    expect(wholeIndex(2.9, 3)).toBe(2);
  });

  it("clamps a finite index into the list", () => {
    expect(wholeIndex(-2, 3)).toBe(0);
    expect(wholeIndex(99, 3)).toBe(2);
  });

  it("starts a non-finite index at the first entry", () => {
    expect(wholeIndex(Number.NaN, 3)).toBe(0);
    expect(wholeIndex(Number.POSITIVE_INFINITY, 3)).toBe(0);
    expect(wholeIndex(Number.NEGATIVE_INFINITY, 3)).toBe(0);
  });

  it("reports zero for an empty list", () => {
    expect(wholeIndex(2, 0)).toBe(0);
  });
});
