/**
 * Guards the retained `MotionValue` entry point: springs and tweens reach the
 * exact target, reduced motion returns the target immediately, a spring
 * retarget keeps velocity, and an inertial coast decays toward its projected
 * rest. Reverting the sample dispatch fails these assertions.
 */
import { describe, expect, it } from "vitest";
import { linear } from "./easing.js";
import { inertia } from "./inertia.js";
import { MotionValue, springTransition, tween } from "./motion.js";
import { layoutSpring } from "./spring.js";

describe("MotionValue", () => {
  it("springs reach the exact target and report completion", () => {
    const value = new MotionValue(0);
    value.animate(1, springTransition(layoutSpring));

    expect(value.sample(0).value).toBe(0);
    const done = value.sample(2000);
    expect(done.value).toBe(1);
    expect(done.velocity).toBe(0);
    expect(done.active).toBe(false);
    expect(done.complete).toBe(true);
  });

  it("returns the target immediately under reduced motion", () => {
    const value = new MotionValue(0);
    value.animate(1, springTransition(layoutSpring));

    const done = value.sample(16, true);
    expect(done.value).toBe(1);
    expect(done.velocity).toBe(0);
    expect(done.active).toBe(false);
    expect(done.complete).toBe(true);
  });

  it("keeps velocity when a spring target changes mid-flight", () => {
    const value = new MotionValue(0);
    const spring = springTransition(layoutSpring);

    value.animate(1, spring);
    const first = value.sample(80);
    expect(first.velocity).not.toBe(0);

    value.animate(2, spring);
    const reseeded = value.sample(80);
    expect(reseeded.value).toBe(first.value);
    expect(reseeded.velocity).toBe(first.velocity);
  });

  it("tweens linearly to the target and completes", () => {
    const value = new MotionValue(0);
    value.animate(1, tween(100, linear));

    expect(value.sample(50).value).toBeCloseTo(0.5, 5);
    const done = value.sample(100);
    expect(done.value).toBe(1);
    expect(done.complete).toBe(true);
  });

  it("coasts under inertia toward the projected rest position", () => {
    const value = new MotionValue(0);
    value.coast(inertia(350), 100);

    const sample = value.sample(350);
    expect(sample.value).toBeCloseTo(35 * (1 - Math.E ** -1), 3);
    expect(sample.active).toBe(true);
  });
});
