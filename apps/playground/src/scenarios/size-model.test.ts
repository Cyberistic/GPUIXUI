/**
 * Guards the size-constraint model (plan `825`).
 *
 * The bug being guarded: the shipped components rely on `minWidth`/`maxWidth`/
 * `minHeight`/`maxHeight` and `"100%"` in 20+ call sites and no scenario reads
 * any of them, so a runtime that dropped the constraints would pass. These
 * tests pin the two rules the probe compares against — CSS precedence (the
 * minimum wins when both apply) and percentage resolution — so a wrong
 * expectation fails the model instead of the frame check, and the frame check
 * stays about the runtime.
 */
import { describe, expect, it } from "vitest";
import { constrained, percentOf, percentStyle } from "./size-model.js";

describe("the size-constraint model", () => {
  it("constrains a declared size inside its range", () => {
    expect(constrained(100, 200, 400)).toBe(200);
    expect(constrained(400, 100, 240)).toBe(240);
    expect(constrained(220, 100, 300)).toBe(220);
  });

  it("gives the minimum precedence when min exceeds max", () => {
    expect(constrained(200, 300, 260)).toBe(300);
    // The opposite rule (max last) would give 260: this guard names the rule.
    expect(constrained(200, 300, 260)).not.toBe(260);
  });

  it("resolves a percentage against the parent", () => {
    expect(percentOf(300, 0.5)).toBe(150);
    expect(percentOf(300, 1)).toBe(300);
    expect(percentOf(200, 0.25)).toBe(50);
  });

  it("writes the percentage the fixture declares", () => {
    expect(percentStyle(0.5)).toBe("50%");
    expect(percentStyle(1)).toBe("100%");
  });
});
