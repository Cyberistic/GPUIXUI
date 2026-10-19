/**
 * A cap that cannot be counted must not hide the list. The bugs these guard:
 * `Math.max(0, NaN)` propagated `NaN`, and `Arr.take(list, NaN)` returned
 * nothing, so a malformed cap read as "show no entries".
 */

import { describe, expect, it } from "vitest";
import { wholeCap } from "./count.js";

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
