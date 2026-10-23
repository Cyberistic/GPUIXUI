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

  it("coasts under inertia toward the projected rest position", () => {
    const value = new MotionValue(0);
    value.coast(inertia(350), 100);

    const sample = value.sample(350);
    expect(sample.value).toBeCloseTo(35 * (1 - Math.E ** -1), 3);
    expect(sample.active).toBe(true);
  });

  it("settles a coast whose inertia has no usable time constant", () => {
    // `Inertia` is structural, so a caller can hand `coast` a `tau` the decay
    // cannot read. The retained value used to take `NaN` as its target, paint
    // `NaN` every frame and never report completion.
    const value = new MotionValue(0);
    value.coast({ tau: Number.NaN, min: null, max: null }, 100);

    const done = value.sample(4_500);
    expect(Number.isFinite(done.value)).toBe(true);
    expect(done.value).toBeCloseTo(35, 3);
    expect(done.active).toBe(false);
    expect(done.complete).toBe(true);
  });

  it("settles a coast whose projected rest overflows", () => {
    // The release is readable, only its rest is not: the sampler's
    // `Infinity * 0` at the release frame answered `NaN`, so the value painted
    // a frame the runtime draws as nothing and churned a frame every 16 ms for
    // the life of the tree.
    const value = new MotionValue(1e308);
    value.coast(inertia(1e308, { max: 100 }), 1e308);

    const release = value.sample(0);
    expect(release.value).toBe(100);
    expect(release.active).toBe(false);
    expect(release.complete).toBe(true);

    // The next sample is the same resting frame, not another journey.
    const later = value.sample(1_000);
    expect(later.value).toBe(100);
    expect(later.complete).toBe(false);
  });

  it("keeps a coast released on a wall travelling back into its range", () => {
    // A drag released at the edge of its bounds with the velocity pointing back
    // inside: the sampler used to read "the value is at a bound" as "settled",
    // and the release sample finished the run at the projected rest on the
    // *other* side, so the surface teleported across the whole range.
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

  it("does not restart a run for a re-declared duration it cannot read", () => {
    // `Transition` is exported and structural, so a caller can build a tween
    // without `tween()`, and a duration computed before a measurement is often
    // `NaN`. The sampler repaired it to the house 300 ms, but the equality
    // check compared `NaN === NaN` — false — so every render re-armed the run
    // from the sample on screen and a surface that repainted crawled toward its
    // target instead of finishing. The check reads the duration the sampler
    // runs, the way it reads the physics a spring samples.
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

  it("does not restart a coast for a re-declared inertia", () => {
    // `useInertia(velocity, inertia())` builds its inertia inline, so every
    // render re-declares the same coast. Without the guard the run restarted
    // from the sample on screen with the full release velocity, so a surface
    // that re-rendered while coasting travelled past its projected rest and
    // never settled — the inertiatic twin of the re-declared tween rule.
    const value = new MotionValue(0);
    value.coast(inertia(350), 400);
    const quarter = value.sample(100);
    expect(quarter.value).toBeCloseTo(140 * (1 - Math.E ** -0.285714), 3);

    value.coast(inertia(350), 400);
    // The trajectory at 200 ms, not a fresh one launched from the 100 ms sample.
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
    // A parent that re-renders after the coast has come to rest must not fling
    // the value again: the projected rest is the presentation the reader sees.
    const value = new MotionValue(0);
    value.coast(inertia(350), 400);
    expect(value.sample(5_000).value).toBeCloseTo(140, 3);

    value.coast(inertia(350), 400);
    const after = value.sample(5_100);
    expect(after.value).toBeCloseTo(140, 3);
    expect(after.active).toBe(false);
  });

  it("starts a new coast after a set, even with the same release", () => {
    // The no-op is for the coast still on screen. `set` assigns a presentation
    // and cancels the run, so a release with the same speed afterwards is a new
    // gesture and starts from the value that was set. `set` used to leave the
    // retired coast's declaration behind, so the guard matched the idle mode and
    // the gesture never coasted at all.
    const value = new MotionValue(0);
    value.coast(inertia(350), 400);
    expect(value.sample(5_000).value).toBeCloseTo(140, 3);

    value.set(80);
    value.coast(inertia(350), 400);
    const after = value.sample(5_100);
    expect(after.active).toBe(true);
    // The set value plus the same 140-unit projection, a quarter of the way in.
    expect(after.value).toBeCloseTo(80 + 140 * (1 - Math.E ** -0.285714), 3);
  });

  it("starts a new coast when the release velocity changes", () => {
    // The no-op is for the *same* declaration. A faster release is a new
    // gesture, so it starts from the presentation on screen.
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
    // Two declarations the sampler reads differently are different runs: a
    // changed time constant is not the coast already in flight.
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
    // `SpringPhysics` is structural, so a caller can hand the transition a
    // physics the sampler cannot read. The retained value used to take the
    // unreadable rest threshold, so the run never settled and never reported
    // completion: a hook sampling it every frame churned for the life of the
    // tree, and the surface never reached its target.
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

  it("paints no NaN for a curve that cannot read the frame", () => {
    // `Easing` is a caller's function, so a curve can answer `NaN`. The value
    // used to take it straight into the frame — every sample of the run was
    // `NaN`, which the runtime paints as a null inset, so the surface vanished
    // for the whole journey. An unreadable frame is not a curve: the run falls
    // back to its own linear progress and still lands on the target.
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

  it("compares a tween by the duration the sampler runs", () => {
    // The twin of the spring case above. A hand-built tween's duration can be
    // `NaN` (arithmetic before a measurement) or a value that cannot run; the
    // sampler reads those as the house length and an instant assignment, so two
    // declarations that sample identically are the same run. Without this the
    // run was re-armed on every render and never reached its end.
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
    // A zero and a negative duration are both an instant assignment.
    expect(transitionEquals(tween(0, linear), tween(-20, linear))).toBe(true);
    // A runnable duration still tells two declarations apart.
    expect(transitionEquals(tween(300, linear), tween(200, linear))).toBe(
      false,
    );
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
    // `NaN` compares unequal to itself, so two declarations that differ only
    // in a field the sampler cannot read read as different — and a run that
    // never changed was restarted on every render.
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
