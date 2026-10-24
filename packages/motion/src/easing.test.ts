/**
 * Guards the easing curves: the monotonic family stays monotonic, the
 * overshooting family overshoots by the expected sign, and the Bezier inversion
 * hits its endpoints. Reverting any curve's formula fails its assertion.
 */
import { describe, expect, it } from "vitest";
import {
  anticipate,
  backIn,
  backInOut,
  backOut,
  bezier,
  circIn,
  circInOut,
  circOut,
  ease,
  easeIn,
  easeInOut,
  easeOut,
  linear,
  motionCurve,
  type Easing,
} from "./easing.js";
import {
  motionEasingNames,
  motionEasings,
  type MotionCurve,
  type MotionEasingName,
  type MotionPhase,
} from "./timing.js";

const monotonic: readonly [string, Easing][] = [
  ["linear", linear],
  ["ease", ease],
  ["easeIn", easeIn],
  ["easeOut", easeOut],
  ["easeInOut", easeInOut],
  ["circIn", circIn],
  ["circOut", circOut],
  ["circInOut", circInOut],
];

describe("easing", () => {
  it.each(monotonic)("%s is monotonic on [0, 1]", (_name, easing) => {
    const step = 1 / 32;
    for (let i = 0; i < 32; i += 1) {
      expect(easing((i + 1) * step)).toBeGreaterThanOrEqual(easing(i * step));
    }
  });

  it("hits the 0/1 endpoints for the closed curves", () => {
    const closed: readonly Easing[] = [
      linear,
      ease,
      easeIn,
      easeOut,
      easeInOut,
      circIn,
      circOut,
      circInOut,
      backIn,
      backOut,
      backInOut,
      anticipate,
    ];
    closed.forEach((easing) => {
      expect(easing(0)).toBeCloseTo(0, 5);
      expect(easing(1)).toBeCloseTo(1, 5);
    });
  });

  it("samples the known midpoints", () => {
    expect(linear(0.5)).toBe(0.5);
    expect(ease(0.5)).toBeCloseTo(0.802403, 5);
    expect(easeIn(0.5)).toBeCloseTo(0.315357, 5);
    expect(easeOut(0.5)).toBeCloseTo(0.684643, 5);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 5);
    expect(circOut(0.5)).toBeCloseTo(Math.sqrt(0.75), 5);
  });

  it("traces the renderer's own curve for every easing name it accepts", () => {
    // The bug this guards: the named curves were cubic polynomials — `easeOut`
    // was `1 - (1 - t)³`, **0.875** at its midpoint — while the timing table
    // hands the runtime the *name* `"easeOut"`, which the binding resolves to
    // `cubic-bezier(0, 0, 0.58, 1)` and paints at **0.685** there. A movement
    // sampled in JavaScript beside a runtime tween of the same phase therefore
    // eased a different path, and neither surface showed which one was wrong.
    //
    // The oracle is the binding's own algorithm — `cubic_bezier` in
    // `packages/native/src/motion.rs` at `@gpuix/native@0.11.0`: 20 bisection
    // steps over the `x` control points, the `y` polynomial at the result,
    // clamped to [0, 1].
    const bindingSample = (t: number, a: number, b: number): number => {
      const c = 3 * a;
      const second = 3 * (b - a) - c;
      const first = 1 - c - second;
      return ((first * t + second) * t + c) * t;
    };
    const bindingEase = (
      progress: number,
      [x1, y1, x2, y2]: MotionCurve,
    ): number => {
      let low = 0;
      let high = 1;
      for (let step = 0; step < 20; step += 1) {
        const middle = (low + high) / 2;
        if (bindingSample(middle, x1, x2) < progress) low = middle;
        else high = middle;
      }
      return Math.min(
        1,
        Math.max(0, bindingSample((low + high) / 2, y1, y2)),
      );
    };

    /** The binding's control points, and `null` for the one name it does not
     *  resolve to a Bezier (`linear` returns the progress itself). */
    const controlPoints: Readonly<
      Record<MotionEasingName, MotionCurve | null>
    > = {
      linear: null,
      ease: [0.25, 0.1, 0.25, 1],
      easeIn: [0.42, 0, 1, 1],
      easeOut: [0, 0, 0.58, 1],
      easeInOut: [0.42, 0, 0.58, 1],
    };
    // Every name the grammar accepts has a curve, so a name added to the list
    // cannot reach `motionCurve` with no entry (the record's key type is the
    // union, and this holds the table and the list together at run time).
    expect(
      motionEasingNames.filter((name) => Object.hasOwn(controlPoints, name)),
    ).toEqual([...motionEasingNames]);

    const progresses = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];
    motionEasingNames.forEach((name) => {
      const points = controlPoints[name];
      const curve = motionCurve(name);
      progresses.forEach((progress) => {
        const expected =
          points === null ? progress : bindingEase(progress, points);
        expect(curve(progress), `${name} at ${progress}`).toBeCloseTo(
          expected,
          5,
        );
      });
    });
  });

  it("resolves a phase's name to the curve that name stands for", () => {
    // One home for the meaning of a name: the timing table publishes names for
    // the phases, and the curves are the same bindings rather than a second
    // table that agrees by hand.
    const phases: ReadonlyArray<MotionPhase> = ["enter", "exit", "standard"];
    const curves: Readonly<Record<MotionEasingName, Easing>> = {
      linear,
      ease,
      easeIn,
      easeOut,
      easeInOut,
    };
    phases.forEach((phase) => {
      expect(motionCurve(motionEasings[phase])).toBe(curves[motionEasings[phase]]);
    });
    // A name this release does not carry is the linear progress, the fallback
    // `eased` takes for a curve it cannot call.
    expect(motionCurve("easeOutBack")(0.5)).toBe(0.5);
    expect(motionCurve(undefined)(0.5)).toBe(0.5);
  });

  it("back and anticipate overshoot in the expected direction", () => {
    expect(backOut(0.5)).toBeGreaterThan(1);
    expect(backIn(0.5)).toBeLessThan(0);
    expect(anticipate(0.25)).toBeLessThan(0);
    expect(anticipate(0.75)).toBeGreaterThan(0.9);
  });

  it("bezier is the identity curve with unit controls", () => {
    const identity = bezier(0, 0, 1, 1);
    expect(identity(0)).toBeCloseTo(0, 5);
    expect(identity(0.5)).toBeCloseTo(0.5, 5);
    expect(identity(1)).toBeCloseTo(1, 5);
  });

  it("bezier falls back to linear for non-finite controls", () => {
    const fallback = bezier(Number.NaN, 0, 1, 1);
    expect(fallback(0.5)).toBe(0.5);
  });

  it("reads a progress it cannot read as the start of the run", () => {
    // Every curve promises a value over `t` clamped to `[0, 1]`, and the
    // package's totality rule is that a number a formula cannot read is
    // replaced before it arrives. `clamp01` let `NaN` through, so a presenter
    // whose progress read failed got `NaN` from every curve — a value the
    // runtime paints as nothing.
    const curves: readonly [string, Easing][] = [
      ...monotonic,
      ["backIn", backIn],
      ["backOut", backOut],
      ["backInOut", backInOut],
      ["anticipate", anticipate],
      ["bezier", bezier(0.4, 0, 0.2, 1)],
    ];
    curves.forEach(([name, easing]) => {
      expect(easing(Number.NaN), name).toBeCloseTo(0, 5);
      [Number.NEGATIVE_INFINITY, -1, 0, 0.5, 1, 2, Number.POSITIVE_INFINITY]
        .map(easing)
        .forEach((value) => expect(Number.isFinite(value), name).toBe(true));
    });
  });
});
