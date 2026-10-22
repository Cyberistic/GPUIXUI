/**
 * Guards momentum decay: exponential approach to the projected rest position,
 * and hard clamping to configured bounds with zero velocity. Reverting the
 * decay or clamp formula fails these assertions.
 */
import { describe, expect, it } from "vitest";
import { inertia, project, sampleInertia } from "./inertia.js";

describe("inertia", () => {
  it("projects the resting position and clamps to bounds", () => {
    const free = inertia(350);
    expect(project(free, 5, 100)).toBeCloseTo(40, 5);

    const bounded = inertia(350, { min: 0, max: 10 });
    expect(project(bounded, 5, 100)).toBe(10);
  });

  it("swaps inverted bounds", () => {
    const swapped = inertia(350, { min: 10, max: 0 });
    expect(swapped.min).toBe(0);
    expect(swapped.max).toBe(10);
  });

  it("decays exponentially from the initial velocity", () => {
    const sample = sampleInertia(inertia(350), 0, 100, 350);
    expect(sample.value).toBeCloseTo(35 * (1 - Math.E ** -1), 3);
    expect(sample.velocity).toBeCloseTo(100 * Math.E ** -1, 3);
    expect(sample.settled).toBe(false);
  });

  it("clamps to a bound and stops with zero velocity", () => {
    const bounded = inertia(350, { min: 0, max: 20 });
    const early = sampleInertia(bounded, 0, 100, 100);
    expect(early.value).toBeLessThan(20);

    const settled = sampleInertia(bounded, 0, 100, 2000);
    expect(settled.value).toBe(20);
    expect(settled.velocity).toBe(0);
    expect(settled.settled).toBe(true);
  });

  it("never exceeds its bounds at any sampled time", () => {
    const bounded = inertia(350, { min: 0, max: 20 });
    [0, 50, 150, 500, 1200, 3000].forEach((ms) => {
      const sample = sampleInertia(bounded, 0, 100, ms);
      expect(sample.value).toBeLessThanOrEqual(20);
      expect(sample.value).toBeGreaterThanOrEqual(0);
    });
  });

  it("reads a non-finite elapsed time as the start of the coast", () => {
    // `Math.max(NaN, 0)` is `NaN`, so a clock the caller could not read used to
    // return `NaN` from every field instead of the release frame.
    const release = sampleInertia(inertia(350), 0, 100, 0);
    expect(sampleInertia(inertia(350), 0, 100, Number.NaN)).toEqual(release);
  });
});
