/**
 * The share a progress bar paints.
 *
 * The bug these guard: a `max` the bar cannot divide by silently shrank the
 * value (a stored `max: 0` or text would make every share infinite or `NaN`),
 * and a stored `null`/text `value` painted an empty determinate bar instead of
 * the indeterminate one the prop documents.
 */

import { describe, expect, it } from "vitest";
import { progressShare } from "./logic.js";

describe("progressShare", () => {
  it("states the value as a share of the caller's maximum", () => {
    expect(progressShare(30, 120)).toBe(25);
    expect(progressShare(0, 100)).toBe(0);
    expect(progressShare(150, 200)).toBe(75);
  });

  it("clamps a value outside the scale it was stated in", () => {
    expect(progressShare(150, 100)).toBe(100);
    expect(progressShare(-20, 100)).toBe(0);
  });

  it("reads a value the bar cannot measure as an indeterminate bar", () => {
    expect(progressShare(undefined, 100)).toBeUndefined();
    expect(progressShare(null, 100)).toBeUndefined();
    expect(progressShare(Number.NaN, 100)).toBeUndefined();
    expect(progressShare("42", 100)).toBeUndefined();
  });

  it("falls back to the documented scale for a maximum it cannot divide by", () => {
    expect(progressShare(25, 0)).toBe(25);
    expect(progressShare(25, -10)).toBe(25);
    expect(progressShare(25, "200")).toBe(25);
    expect(progressShare(25, Number.POSITIVE_INFINITY)).toBe(25);
  });
});
