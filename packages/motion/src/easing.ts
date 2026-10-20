/**
 * Easing curves for duration-based transitions.
 *
 * Every curve is a pure `(t: number) => number` over `t` clamped to `[0, 1]`.
 * The cubic / circular / back / anticipate curves follow `gpui-ce-motion`'s
 * `Easing` (MIT OR Apache-2.0); `bezier` is a monotonic-time cubic Bezier with
 * the same control convention (`x` in `[0, 1]`, `y` may overshoot).
 */

/** A unit-progress easing curve. */
export type Easing = (t: number) => number;

const clamp01 = (value: number): number =>
  value < 0 ? 0 : value > 1 ? 1 : value;

/** Constant-speed interpolation. */
export const linear: Easing = (t) => clamp01(t);

/** Cubic ease-in. */
export const easeIn: Easing = (t) => {
  const u = clamp01(t);
  return u * u * u;
};

/** Cubic ease-out. */
export const easeOut: Easing = (t) => {
  const u = clamp01(t);
  return 1 - (1 - u) * (1 - u) * (1 - u);
};

/** Cubic smoothstep: zero velocity at both endpoints. */
export const easeInOut: Easing = (t) => {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
};

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

/** Anticipation followed by exponential deceleration. */
export const anticipate: Easing = (t) => {
  const u = clamp01(t);
  if (u < 0.5) return backIn(u * 2) / 2;
  return 1 - 0.5 * 2 ** (-20 * (u - 0.5));
};

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
