import { describe, expect, it } from "vitest";
import { knobAngle, knobDot, knobDrag, knobKey } from "./logic.js";

const range = { min: 0, max: 100, step: 5 };

describe("knob rules", () => {
  it("sweeps from lower left through the top to lower right", () => {
    expect(knobDot(0, range, 10)[0]).toBeLessThan(0);
    expect(knobDot(0, range, 10)[1]).toBeGreaterThan(0);
    expect(knobDot(50, range, 10)[0]).toBeCloseTo(0);
    expect(knobDot(50, range, 10)[1]).toBeCloseTo(-10);
    expect(knobDot(100, range, 10)[0]).toBeGreaterThan(0);
  });

  it("holds a value outside the range at the end stop", () => {
    expect(knobAngle(500, range)).toBe(knobAngle(100, range));
  });

  it("does not divide by an empty range", () => {
    expect(Number.isFinite(knobAngle(3, { min: 3, max: 3, step: 1 }))).toBe(
      true,
    );
  });

  it("steps with the keys and ignores the others", () => {
    expect(knobKey("up", 50, range)).toBe(55);
    expect(knobKey("left", 0, range)).toBe(0);
    expect(knobKey("end", 50, range)).toBe(100);
    expect(knobKey("a", 50, range)).toBeNull();
  });

  it("turns up as the pointer rises, on the step grid", () => {
    expect(knobDrag(50, 80, range)).toBe(100);
    expect(knobDrag(50, -32, range)).toBe(30);
    expect(knobDrag(50, 3, range)).toBe(50);
  });
});
