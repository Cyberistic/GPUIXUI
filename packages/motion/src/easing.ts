/**
 * Easing curves for duration-based transitions.
 *
 * Every curve is a pure `(t: number) => number` over `t` clamped to `[0, 1]`,
 * and a progress it cannot read is the start of the run (`clamp01` in
 * `progress.ts`), so a failed reading paints the first frame instead of `NaN`.
 *
 * The five names `timing.ts` accepts are the **renderer's own curves**, not
 * lookalikes: the runtime resolves each name to a cubic Bezier
 * (`@gpuix/native@0.11.0`, `packages/native/src/motion.rs` → `ease`), so a
 * movement sampled here with `easeOut` must trace the same path as a tween the
 * runtime runs with `"easeOut"` beside it — two halves of one transition cannot
 * ease differently. {@link motionCurve} is that table and the named exports below
 * are its entries. The circular, overshooting and anticipating curves follow
 * `gpui-ce-motion`'s `Easing` (MIT OR Apache-2.0); `bezier` is a monotonic-time
 * cubic Bezier with the same control convention (`x` in `[0, 1]`, `y` may
 * overshoot).
 */

import { clamp01 } from "./progress.js";
import { isMotionEasingName, type MotionEasingName } from "./timing.js";

/** A unit-progress easing curve. */
export type Easing = (t: number) => number;

/**
 * A cubic Bezier easing from two control points.
 *
 * `x1` and `x2` are clamped to `[0, 1]`; `y1` and `y2` may overshoot. Returns
 * `linear` when any control is non-finite.
 */
export const bezier = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): Easing => {
  if (![x1, y1, x2, y2].every(Number.isFinite)) return linear;
  const cx1 = clamp01(x1);
  const cx2 = clamp01(x2);
  const x = (u: number) =>
    3 * (1 - u) * (1 - u) * u * cx1 + 3 * (1 - u) * u * u * cx2 + u * u * u;
  const y = (u: number) =>
    3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
  return (t) => {
    const target = clamp01(t);
    let low = 0;
    let high = 1;
    let u = target;
    for (let i = 0; i < 32; i += 1) {
      const actual = x(u);
      if (Math.abs(actual - target) < 1e-9) break;
      if (actual < target) low = u;
      else high = u;
      u = (low + high) / 2;
    }
    return y(u);
  };
};

/**
 * The runtime's own curve for each easing name it accepts.
 *
 * The control points are the binding's (`ease`, in
 * `packages/native/src/motion.rs` at `@gpuix/native@0.11.0`): `ease` is
 * `(0.25, 0.1, 0.25, 1)`, `easeIn` `(0.42, 0, 1, 1)`, `easeOut`
 * `(0, 0, 0.58, 1)` — the renderer's default — and `easeInOut`
 * `(0.42, 0, 0.58, 1)`. `linear` returns the progress itself, the one curve a
 * control-point pair cannot describe (a unit-control Bezier is a cubic, not the
 * identity).
 */
const namedCurves: Readonly<Record<MotionEasingName, Easing>> = {
  linear: (t) => clamp01(t),
  ease: bezier(0.25, 0.1, 0.25, 1),
  easeIn: bezier(0.42, 0, 1, 1),
  easeOut: bezier(0, 0, 0.58, 1),
  easeInOut: bezier(0.42, 0, 0.58, 1),
};

/** Constant-speed interpolation. */
export const linear: Easing = namedCurves.linear;

/** The runtime's `ease`: a gentle start and a decelerating finish. */
export const ease: Easing = namedCurves.ease;

/** The runtime's `easeIn`: accelerating, for a surface on its way out. */
export const easeIn: Easing = namedCurves.easeIn;

/** The runtime's `easeOut`: decelerating, for a surface arriving. */
export const easeOut: Easing = namedCurves.easeOut;

/** The runtime's `easeInOut`: both ends eased, between two resting states. */
export const easeInOut: Easing = namedCurves.easeInOut;

/**
 * The curve a runtime easing name stands for.
 *
 * This is the bridge between the two halves of one movement: `timing.ts` hands
 * the runtime a phase's **name** (`motionEasings`), while a value this package
 * samples needs a function. Reading the name here means both halves trace the
 * binding's curve rather than agreeing on a label.
 *
 * A name this release does not carry is the **linear** progress — the fallback
 * `eased` takes for a curve it cannot call. The runtime rejects a description
 * naming an easing it does not know, so there is no curve to imitate.
 */
export const motionCurve = (name: unknown): Easing =>
  isMotionEasingName(name) ? namedCurves[name] : linear;

/** Circular ease-in. */
export const circIn: Easing = (t) => {
  const u = clamp01(t);
  return 1 - Math.sqrt(Math.max(1 - u * u, 0));
};

/** Circular ease-out. */
export const circOut: Easing = (t) => {
  const u = clamp01(t);
  return Math.sqrt(Math.max(1 - (u - 1) * (u - 1), 0));
};

/** Circular ease-in-out. */
export const circInOut: Easing = (t) =>
  clamp01(t) < 0.5
    ? circIn(clamp01(t) * 2) / 2
    : 0.5 + circOut(clamp01(t) * 2 - 1) / 2;

/** Overshooting ease-out. */
export const backOut: Easing = (t) => {
  const u = clamp01(t) - 1;
  return 1 + 2.70158 * u * u * u + 1.70158 * u * u;
};

/** Overshooting ease-in. */
export const backIn: Easing = (t) => 1 - backOut(1 - clamp01(t));

/** Overshooting ease-in-out. */
export const backInOut: Easing = (t) =>
  clamp01(t) < 0.5
    ? backIn(clamp01(t) * 2) / 2
    : 0.5 + backOut(clamp01(t) * 2 - 1) / 2;

/**
 * Anticipation followed by exponential deceleration.
 *
 * The deceleration converges on 1 without reaching it (`0.99951` at the end), so
 * the end is written explicitly: a curve shapes the journey, and a frame that
 * ends a segment lands on the value it names.
 */
export const anticipate: Easing = (t) => {
  const u = clamp01(t);
  if (u < 0.5) return backIn(u * 2) / 2;
  if (u === 1) return 1;
  return 1 - 0.5 * 2 ** (-20 * (u - 0.5));
};
