/**
 * Guards the ported closed-form spring: it reaches the exact target at rest, is
 * finite under non-finite physics, keeps velocity across a retarget, and the
 * over-damped branch never overshoots. Reverting `sample_spring_value` (the
 * open-gpui formulas) fails every assertion here.
 *
 * The regression it also guards: the formulas added a displacement, so two
 * finite endpoints whose difference overflows (`-1.7e308` → `1.7e308`) made
 * every answer `NaN` and the sanitiser painted the target on the first sample.
 */
import { describe, expect, it } from "vitest";
import {
  atRest,
  layoutSpring,
  retarget,
  sampleSpring,
  springPhysics,
  type SpringPhysics,
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

  it("travels between two readable endpoints whose difference it cannot hold", () => {
    // The bug this guards: `from - target` is `-Infinity` for two finite
    // endpoints, so every formula answered `NaN` and the sanitiser replaced the
    // whole journey with the target — a surface that snapped to its resting
    // frame in the first sample. The response is linear, so the sampler reads
    // it against a scaled run instead, which is also the oracle here.
    const from = -1.7e308;
    const target = 1.7e308;
    const middle = sampleSpring(layoutSpring, from, target, 0, 90);
    expect(Number.isFinite(middle.value)).toBe(true);
    expect(middle.value).toBeGreaterThan(from);
    expect(middle.value).toBeLessThan(target);
    expect(middle.settled).toBe(false);
    expect(middle.value / 1e308).toBeCloseTo(
      sampleSpring(layoutSpring, -1.7, 1.7, 0, 90).value,
      9,
    );

    const back = sampleSpring(layoutSpring, 1.7e308, -1.7e308, 0, 90);
    expect(back.value).toBeGreaterThan(-1.7e308);
    expect(back.value).toBeLessThan(1.7e308);
    expect(back.settled).toBe(false);

    const done = sampleSpring(layoutSpring, from, target, 0, 60_000);
    expect(done.settled).toBe(true);
    expect(done.value).toBe(target);
  });
});

describe("atRest", () => {
  it("is within restDelta and restSpeed only when both hold", () => {
    expect(atRest(layoutSpring, 1, 1.0005, 0)).toBe(true);
    expect(atRest(layoutSpring, 1, 1.05, 0)).toBe(false);
    expect(atRest(layoutSpring, 1, 1, 0.5)).toBe(false);
  });
});

/**
 * `SpringPhysics` is structural, so a caller may hand the sampler a physics it
 * cannot read. The samplers repair what they are handed — the way
 * `sampleInertia` repairs an `Inertia` — so a hand-built spring travels,
 * settles and lands on its target instead of jumping there or never resting.
 */
describe("a spring built by hand", () => {
  const handBuilt = (overrides: Partial<SpringPhysics>): SpringPhysics => ({
    mass: overrides.mass ?? layoutSpring.mass,
    stiffness: overrides.stiffness ?? layoutSpring.stiffness,
    damping: overrides.damping ?? layoutSpring.damping,
    restDelta: overrides.restDelta ?? layoutSpring.restDelta,
    restSpeed: overrides.restSpeed ?? layoutSpring.restSpeed,
  });

  it("settles a run whose rest threshold cannot be read", () => {
    // `Math.abs(value - target) <= NaN` is false, so the run converged on the
    // target and never reported itself at rest: a driver waiting for the
    // spring to settle sampled it for the life of the tree.
    const unreadable = handBuilt({ restDelta: Number.NaN });
    const done = sampleSpring(unreadable, 0, 1, 0, 2000);

    expect(done.settled).toBe(true);
    expect(done.value).toBe(1);
    expect(done.velocity).toBe(0);
  });

  it("travels to the target when a physics field cannot be read", () => {
    // A `NaN` damping or stiffness made every formula answer `NaN`, and the
    // sanitiser turned that into the target: the surface jumped to its resting
    // frame instead of moving there.
    [
      handBuilt({ mass: Number.NaN }),
      handBuilt({ stiffness: Number.NaN }),
      handBuilt({ damping: Number.NaN }),
    ].forEach((unreadable) => {
      const middle = sampleSpring(unreadable, 0, 1, 0, 90);

      expect(middle.value).toBeGreaterThan(0);
      expect(middle.value).toBeLessThan(1);

      const done = sampleSpring(unreadable, 0, 1, 0, 2000);
      expect(done.settled).toBe(true);
      expect(done.value).toBe(1);
    });
  });

  it("reads the rest rule with a threshold it can read", () => {
    expect(atRest(handBuilt({ restDelta: Number.NaN }), 1, 1, 0)).toBe(true);
    expect(atRest(handBuilt({ restSpeed: Number.NaN }), 1, 1, 0)).toBe(true);
  });

  it("reads a declaration that carries no physics as the house spring", () => {
    // `SpringPhysicsParams` is all-optional and `Transition` is structural, so a
    // spring decoded from storage can arrive with no physics object at all.
    // Reading `.mass` off nothing threw a `TypeError` out of the frame loop.
    // @ts-expect-error — a physics a store wrote as `null`.
    expect(springPhysics(null)).toEqual(springPhysics());
    // @ts-expect-error — the same absent physics reaching the rest rule.
    expect(atRest(undefined, 1, 1, 0)).toBe(true);

    // @ts-expect-error — the same absent physics reaching a sample.
    const middle = sampleSpring(undefined, 0, 1, 0, 90);
    expect(middle.value).toBeGreaterThan(0);
    expect(middle.value).toBeLessThan(1);
    // @ts-expect-error — the same absent physics reaching a settled sample.
    expect(sampleSpring(undefined, 0, 1, 0, 2000).settled).toBe(true);
  });

  it("samples as the constructor's own physics does", () => {
    const readable = {
      stiffness: 120,
      damping: 14,
      mass: 2,
      restDelta: 0.002,
      restSpeed: 0.02,
    };
    expect(sampleSpring(handBuilt(readable), 0, 1, 0, 90)).toEqual(
      sampleSpring(springPhysics(readable), 0, 1, 0, 90),
    );
  });

  it("takes the house default for a field it cannot read", () => {
    const houseDamping = springPhysics({
      stiffness: 120,
      mass: 2,
      restDelta: 0.002,
      restSpeed: 0.02,
    });
    expect(
      sampleSpring(
        handBuilt({
          stiffness: 120,
          damping: Number.NaN,
          mass: 2,
          restDelta: 0.002,
          restSpeed: 0.02,
        }),
        0,
        1,
        0,
        90,
      ),
    ).toEqual(sampleSpring(houseDamping, 0, 1, 0, 90));
  });
});
