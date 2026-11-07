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
  type Transition,
} from "./motion.js";
import { layoutSpring, springPhysics, type SpringPhysics } from "./spring.js";

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

  it("tweens between two finite endpoints the difference cannot represent", () => {
    const value = new MotionValue(-1e308);
    value.animate(1e308, tween(100, linear));

    const first = value.sample(0);
    expect(first.value).toBe(-1e308);
    const half = value.sample(50);
    expect(Number.isFinite(half.value)).toBe(true);
    expect(half.value).toBe(0);
    expect(Number.isFinite(half.velocity)).toBe(true);

    const done = value.sample(100);
    expect(done.value).toBe(1e308);
    expect(done.complete).toBe(true);
  });

  it("springs between two finite endpoints the difference cannot represent", () => {
    const value = new MotionValue(-1.7e308);
    value.animate(1.7e308, springTransition(layoutSpring));

    const middle = value.sample(90);
    expect(Number.isFinite(middle.value)).toBe(true);
    expect(middle.value).toBeGreaterThan(-1.7e308);
    expect(middle.value).toBeLessThan(1.7e308);
    expect(middle.active).toBe(true);
    expect(middle.complete).toBe(false);
  });

  it("coasts under inertia toward the projected rest position", () => {
    const value = new MotionValue(0);
    value.coast(inertia(350), 100);

    const sample = value.sample(350);
    expect(sample.value).toBeCloseTo(35 * (1 - Math.E ** -1), 3);
    expect(sample.active).toBe(true);
  });

  it("settles a coast whose inertia has no usable time constant", () => {
    const value = new MotionValue(0);
    value.coast({ tau: Number.NaN, min: null, max: null }, 100);

    const done = value.sample(4_500);
    expect(Number.isFinite(done.value)).toBe(true);
    expect(done.value).toBeCloseTo(35, 3);
    expect(done.active).toBe(false);
    expect(done.complete).toBe(true);
  });

  it("settles a coast whose declaration carries no inertia", () => {
    const value = new MotionValue(0);
    // @ts-expect-error — an inertia a store wrote as `null`.
    value.coast(null, 100);

    const done = value.sample(4_500);
    expect(done.value).toBeCloseTo(35, 3);
    expect(done.active).toBe(false);
    expect(done.complete).toBe(true);
  });

  it("settles a coast whose projected rest overflows", () => {
    const value = new MotionValue(1e308);
    value.coast(inertia(1e308, { max: 100 }), 1e308);

    const release = value.sample(0);
    expect(release.value).toBe(100);
    expect(release.active).toBe(false);
    expect(release.complete).toBe(true);

    const later = value.sample(1_000);
    expect(later.value).toBe(100);
    expect(later.complete).toBe(false);
  });

  it("settles a coast whose time constant no clock can reach", () => {
    const value = new MotionValue(0);
    value.coast(inertia(1e300), 400);

    const done = value.sample(10_000);
    expect(done.value).toBeCloseTo(140, 5);
    expect(done.velocity).toBe(0);
    expect(done.active).toBe(false);
    expect(done.complete).toBe(true);
  });

  it("keeps a coast released on a wall travelling back into its range", () => {
    const value = new MotionValue(20);
    value.coast(inertia(350, { min: 0, max: 20 }), -100);

    const release = value.sample(0);
    expect(release.value).toBe(20);
    expect(release.active).toBe(true);
    expect(release.complete).toBe(false);

    const moved = value.sample(100);
    expect(moved.value).toBeLessThan(20);
    expect(moved.value).toBeGreaterThan(0);
  });

  it("falls back from a tween duration that cannot run", () => {
    const declared = tween(Number.NaN, linear);
    expect(declared.kind === "tween" && declared.durationMs).toBe(
      DEFAULT_TWEEN_MS,
    );
    const unreachable = tween(1e300, linear);
    expect(unreachable.kind === "tween" && unreachable.durationMs).toBe(
      DEFAULT_TWEEN_MS,
    );

    const reachable = tween(1e12, linear);
    expect(reachable.kind === "tween" && reachable.durationMs).toBe(1e12);

    [Number.NaN, Number.POSITIVE_INFINITY, 1e300].forEach((durationMs) => {
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
    const value = new MotionValue(0);
    value.animate(1, tween(100, linear));
    expect(value.sample(50).value).toBeCloseTo(0.5, 5);

    value.animate(1, tween(100, linear));
    const done = value.sample(100);
    expect(done.value).toBe(1);
    expect(done.complete).toBe(true);
  });

  it("restarts from the presentation when the transition changes", () => {
    const value = new MotionValue(0);
    value.animate(1, tween(100, linear));
    expect(value.sample(50).value).toBeCloseTo(0.5, 5);

    value.animate(1, tween(200, linear));
    expect(value.sample(150).value).toBeCloseTo(0.75, 5);
  });

  it("does not restart a run for a re-declared duration it cannot read", () => {
    const unreadable = (): Transition => ({
      kind: "tween",
      durationMs: Number.NaN,
      easing: linear,
    });
    const value = new MotionValue(0);
    value.animate(1, unreadable());
    expect(value.sample(150).value).toBeCloseTo(0.5, 5);

    value.animate(1, unreadable());
    const done = value.sample(300);
    expect(done.value).toBe(1);
    expect(done.complete).toBe(true);
  });

  it("animates from a declaration that carries no transition", () => {
    // @ts-expect-error — a stored declaration can arrive as `null`.
    const absent: Transition = null;
    const value = new MotionValue(0);
    value.animate(1, absent);

    expect(value.sample(DEFAULT_TWEEN_MS / 2).value).toBeCloseTo(
      easeOut(0.5),
      5,
    );
    const done = value.sample(DEFAULT_TWEEN_MS);
    expect(done.value).toBe(1);
    expect(done.active).toBe(false);
    expect(done.complete).toBe(true);
  });

  it("runs a declaration whose kind the package does not name as the house tween", () => {
    // @ts-expect-error — a stored kind the library did not type-check.
    const unknown: Transition = { kind: "decoded" };
    const value = new MotionValue(0);
    value.animate(1, unknown);

    expect(value.sample(DEFAULT_TWEEN_MS / 2).value).toBeCloseTo(
      easeOut(0.5),
      5,
    );
    expect(value.sample(DEFAULT_TWEEN_MS).value).toBe(1);
  });

  it("does not restart a coast for a re-declared inertia", () => {
    const value = new MotionValue(0);
    value.coast(inertia(350), 400);
    const quarter = value.sample(100);
    expect(quarter.value).toBeCloseTo(140 * (1 - Math.E ** -0.285714), 3);

    value.coast(inertia(350), 400);

    expect(value.sample(200).value).toBeCloseTo(
      140 * (1 - Math.E ** -0.571428),
      3,
    );

    const done = value.sample(5_000);
    expect(done.value).toBeCloseTo(140, 3);
    expect(done.active).toBe(false);
    expect(done.complete).toBe(true);
  });

  it("stays at rest when the same release is re-declared after it settled", () => {
    const value = new MotionValue(0);
    value.coast(inertia(350), 400);
    expect(value.sample(5_000).value).toBeCloseTo(140, 3);

    value.coast(inertia(350), 400);
    const after = value.sample(5_100);
    expect(after.value).toBeCloseTo(140, 3);
    expect(after.active).toBe(false);
  });

  it("starts a new coast after a set, even with the same release", () => {
    const value = new MotionValue(0);
    value.coast(inertia(350), 400);
    expect(value.sample(5_000).value).toBeCloseTo(140, 3);

    value.set(80);
    value.coast(inertia(350), 400);
    const after = value.sample(5_100);
    expect(after.active).toBe(true);

    expect(after.value).toBeCloseTo(80 + 140 * (1 - Math.E ** -0.285714), 3);
  });

  it("starts a new coast when the release velocity changes", () => {
    const value = new MotionValue(0);
    value.coast(inertia(350), 400);
    const quarter = value.sample(100);

    value.coast(inertia(350), 700);
    expect(value.sample(200).value).toBeCloseTo(
      quarter.value + 245 * (1 - Math.E ** -0.285714),
      3,
    );
  });

  it("starts a new coast when the inertia it reads changes", () => {
    const value = new MotionValue(0);
    value.coast(inertia(350), 400);
    const quarter = value.sample(100);

    value.coast(inertia(700), 400);
    expect(value.sample(200).value).toBeCloseTo(
      quarter.value + 280 * (1 - Math.E ** -0.142857),
      3,
    );
  });

  it("completes a spring whose physics cannot be read", () => {
    const value = new MotionValue(0);
    value.animate(
      1,
      springTransition({
        mass: 1,
        stiffness: 260,
        damping: 28,
        restDelta: Number.NaN,
        restSpeed: 0.01,
      }),
    );

    const done = value.sample(2000);
    expect(done.value).toBe(1);
    expect(done.active).toBe(false);
    expect(done.complete).toBe(true);
  });

  it("animates a spring declaration that carries no physics", () => {
    const value = new MotionValue(0);
    // @ts-expect-error — a spring declaration a store wrote without its physics.
    value.animate(1, { kind: "spring" });

    const middle = value.sample(90);
    expect(middle.value).toBeGreaterThan(0);
    expect(middle.value).toBeLessThan(1);

    const done = value.sample(2000);
    expect(done.value).toBe(1);
    expect(done.active).toBe(false);
    expect(done.complete).toBe(true);
  });

  it("paints no NaN for a curve that cannot read the frame", () => {
    const value = new MotionValue(0);
    value.animate(
      1,
      tween(100, () => Number.NaN),
    );

    const middle = value.sample(50);
    expect(Number.isFinite(middle.value)).toBe(true);
    expect(middle.value).toBeCloseTo(0.5, 5);

    const done = value.sample(100);
    expect(done.value).toBe(1);
    expect(done.complete).toBe(true);
  });
});

describe("transitionEquals", () => {
  it("compares by structure, not identity", () => {
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

  it("compares a tween by the duration the sampler runs", () => {
    const unreadable = (durationMs: number): Transition => ({
      kind: "tween",
      durationMs,
      easing: linear,
    });

    expect(
      transitionEquals(unreadable(Number.NaN), unreadable(Number.NaN)),
    ).toBe(true);
    expect(transitionEquals(unreadable(Number.NaN), tween(300, linear))).toBe(
      true,
    );
    expect(
      transitionEquals(
        unreadable(Number.POSITIVE_INFINITY),
        tween(300, linear),
      ),
    ).toBe(true);

    expect(transitionEquals(tween(0, linear), tween(-20, linear))).toBe(true);

    expect(transitionEquals(tween(300, linear), tween(200, linear))).toBe(
      false,
    );
  });

  it("compares a declaration that carries no transition as the house run", () => {
    // @ts-expect-error — a stored declaration can arrive as `null`.
    const absent: Transition = null;
    // @ts-expect-error — the same absence, from a missing field.
    const missing: Transition = undefined;

    expect(transitionEquals(tween(), absent)).toBe(true);
    expect(transitionEquals(absent, tween())).toBe(true);
    expect(transitionEquals(absent, missing)).toBe(true);

    expect(transitionEquals(instant, absent)).toBe(false);
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

  it("compares a spring by the physics the sampler reads", () => {
    const unreadable = (damping: number): SpringPhysics => ({
      mass: 1,
      stiffness: 260,
      damping,
      restDelta: 0.001,
      restSpeed: 0.01,
    });

    expect(
      transitionEquals(
        springTransition(unreadable(Number.NaN)),
        springTransition(unreadable(Number.NaN)),
      ),
    ).toBe(true);
    expect(
      transitionEquals(
        springTransition(unreadable(Number.NaN)),
        springTransition(unreadable(28)),
      ),
    ).toBe(true);
    expect(
      transitionEquals(
        springTransition(unreadable(Number.NaN)),
        springTransition(unreadable(40)),
      ),
    ).toBe(false);
  });
});
