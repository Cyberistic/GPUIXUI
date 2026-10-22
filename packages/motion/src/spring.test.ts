/**
 * Guards the ported closed-form spring: it reaches the exact target at rest, is
 * finite under non-finite physics, keeps velocity across a retarget, and the
 * over-damped branch never overshoots. Reverting `sample_spring_value` (the
 * open-gpui formulas) fails every assertion here.
 */
import { describe, expect, it } from "vitest";
import {
  atRest,
  layoutSpring,
  retarget,
  sampleSpring,
  springPhysics,
} from "./spring.js";

describe("sampleSpring", () => {
  it("starts active at zero and reaches the exact target at rest", () => {
    const start = sampleSpring(layoutSpring, 0, 1, 0, 0);
    expect(start.value).toBe(0);
    expect(start.velocity).toBe(0);
    expect(start.settled).toBe(false);

    const midpoint = sampleSpring(layoutSpring, 0, 1, 0, 90);
    expect(midpoint.value).toBeGreaterThan(0);
    expect(midpoint.value).toBeLessThan(1.1);

    const complete = sampleSpring(layoutSpring, 0, 1, 0, 2000);
    expect(complete.settled).toBe(true);
    expect(complete.value).toBe(1);
    expect(complete.velocity).toBe(0);
  });

  it("retarget keeps the sampled value and velocity", () => {
    const sampled = sampleSpring(layoutSpring, 0, 1, 0, 80);
    expect(sampled.velocity).not.toBe(0);

    const reseeded = retarget(sampled, 2);
    expect(reseeded.value).toBe(sampled.value);
    expect(reseeded.velocity).toBe(sampled.velocity);
    expect(reseeded.target).toBe(2);
    expect(reseeded.settled).toBe(false);
  });

  it("settles a tiny delta using rest thresholds without oscillating", () => {
    const sample = sampleSpring(layoutSpring, 10, 10.0001, 0, 600);
    expect(sample.settled).toBe(true);
    expect(sample.value).toBe(10.0001);
  });

  it("sanitizes non-finite physics to finite samples", () => {
    const physics = springPhysics({
      mass: Number.NaN,
      stiffness: -1,
      damping: Number.POSITIVE_INFINITY,
    });
    const sample = sampleSpring(physics, 0, 1, Number.NaN, 80);
    expect(Number.isFinite(sample.value)).toBe(true);
    expect(Number.isFinite(sample.velocity)).toBe(true);
  });

  it("reads a non-finite elapsed time as the start of the run", () => {
    // `Math.max(NaN, 0)` is `NaN`, so a caller passing a clock it could not read
    // used to get a `NaN` sample through every formula instead of a start frame.
    const start = sampleSpring(layoutSpring, 0, 1, 0, 0);
    expect(sampleSpring(layoutSpring, 0, 1, 0, Number.NaN)).toEqual(start);
    expect(
      sampleSpring(layoutSpring, 0, 1, 0, Number.POSITIVE_INFINITY),
    ).toEqual(sampleSpring(layoutSpring, 0, 1, 0, 2000));
  });

  it("over-damped springs converge without overshoot", () => {
    const overdamped = springPhysics({ stiffness: 100, damping: 40, mass: 1 });
    const samples = [16, 80, 400, 5000].map(
      (ms) => sampleSpring(overdamped, 0, 1, 0, ms).value,
    );
    samples.forEach((value) => expect(value).toBeLessThanOrEqual(1));
    expect(samples[samples.length - 1]).toBe(1);
  });
});

describe("atRest", () => {
  it("is within restDelta and restSpeed only when both hold", () => {
    expect(atRest(layoutSpring, 1, 1.0005, 0)).toBe(true);
    expect(atRest(layoutSpring, 1, 1.05, 0)).toBe(false);
    expect(atRest(layoutSpring, 1, 1, 0.5)).toBe(false);
  });
});
