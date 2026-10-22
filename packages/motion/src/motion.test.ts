/**
 * Guards the retained `MotionValue` entry point: springs and tweens reach the
 * exact target, reduced motion returns the target immediately, a spring
 * retarget keeps velocity, and an inertial coast decays toward its projected
 * rest. Reverting the sample dispatch fails these assertions.
 */
import { describe, expect, it } from "vitest";
import { easeOut, linear } from "./easing.js";
import { inertia } from "./inertia.js";
import {
  DEFAULT_TWEEN_MS,
  MotionValue,
  instant,
  springTransition,
  transitionEquals,
  tween,
} from "./motion.js";
import { layoutSpring, springPhysics } from "./spring.js";

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

  it("falls back from a tween duration that cannot run", () => {
    // A `NaN` duration divides the clock into `NaN`: every sample is `NaN` (the
    // runtime paints a null inset) and the run never reports completion, so the
    // hook would churn frames forever. Infinity never completes either. Both
    // take the house duration, which the declared transition carries.
    const declared = tween(Number.NaN, linear);
    expect(declared.kind === "tween" && declared.durationMs).toBe(
      DEFAULT_TWEEN_MS,
    );

    [Number.NaN, Number.POSITIVE_INFINITY].forEach((durationMs) => {
      const value = new MotionValue(0);
      value.animate(1, tween(durationMs, linear));
      expect(value.sample(DEFAULT_TWEEN_MS / 2).value).toBeCloseTo(0.5, 5);
      const done = value.sample(DEFAULT_TWEEN_MS);
      expect(done.value).toBe(1);
      expect(done.active).toBe(false);
      expect(done.complete).toBe(true);
    });
  });

  it("does not restart a run for a re-declared transition", () => {
    // The README promises structural equality so a render that builds
    // `tween(100, linear)` again does not re-arm the tween. Without the guard
    // the start moved to the latest sample and the run never reached its end.
    const value = new MotionValue(0);
    value.animate(1, tween(100, linear));
    expect(value.sample(50).value).toBeCloseTo(0.5, 5);

    value.animate(1, tween(100, linear));
    const done = value.sample(100);
    expect(done.value).toBe(1);
    expect(done.complete).toBe(true);
  });

  it("restarts from the presentation when the transition changes", () => {
    // A slower tween is a new declaration, so it starts where the surface is.
    const value = new MotionValue(0);
    value.animate(1, tween(100, linear));
    expect(value.sample(50).value).toBeCloseTo(0.5, 5);

    value.animate(1, tween(200, linear));
    expect(value.sample(150).value).toBeCloseTo(0.75, 5);
  });
});

describe("transitionEquals", () => {
  it("compares by structure, not identity", () => {
    // The whole retarget rule rests on this: two equal declarations must not
    // restart a run, and a changed one must.
    expect(transitionEquals(tween(100, linear), tween(100, linear))).toBe(true);
    expect(transitionEquals(tween(100, linear), tween(120, linear))).toBe(
      false,
    );
    expect(transitionEquals(tween(100, linear), tween(100, easeOut))).toBe(
      false,
    );
    expect(transitionEquals(instant, instant)).toBe(true);
    expect(transitionEquals(instant, tween())).toBe(false);
  });

  it("compares a spring by every physics field", () => {
    const physics = springPhysics({ stiffness: 200, damping: 20 });
    expect(
      transitionEquals(
        springTransition(physics),
        springTransition(springPhysics({ stiffness: 200, damping: 20 })),
      ),
    ).toBe(true);
    expect(
      transitionEquals(
        springTransition(physics),
        springTransition(springPhysics({ stiffness: 201, damping: 20 })),
      ),
    ).toBe(false);
    expect(
      transitionEquals(
        springTransition(physics),
        springTransition(
          springPhysics({ stiffness: 200, damping: 20, mass: 2 }),
        ),
      ),
    ).toBe(false);
  });
});
