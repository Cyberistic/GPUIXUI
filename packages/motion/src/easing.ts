import { clamp01 } from "./progress.js";
import { isMotionEasingName, type MotionEasingName } from "./timing.js";

export type Easing = (t: number) => number;

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

const namedCurves: Readonly<Record<MotionEasingName, Easing>> = {
  linear: (t) => clamp01(t),
  ease: bezier(0.25, 0.1, 0.25, 1),
  easeIn: bezier(0.42, 0, 1, 1),
  easeOut: bezier(0, 0, 0.58, 1),
  easeInOut: bezier(0.42, 0, 0.58, 1),
};

export const linear: Easing = namedCurves.linear;

export const ease: Easing = namedCurves.ease;

export const easeIn: Easing = namedCurves.easeIn;

export const easeOut: Easing = namedCurves.easeOut;

export const easeInOut: Easing = namedCurves.easeInOut;

export const motionCurve = (name: unknown): Easing =>
  isMotionEasingName(name) ? namedCurves[name] : linear;

export const circIn: Easing = (t) => {
  const u = clamp01(t);
  return 1 - Math.sqrt(Math.max(1 - u * u, 0));
};

export const circOut: Easing = (t) => {
  const u = clamp01(t);
  return Math.sqrt(Math.max(1 - (u - 1) * (u - 1), 0));
};

export const circInOut: Easing = (t) =>
  clamp01(t) < 0.5
    ? circIn(clamp01(t) * 2) / 2
    : 0.5 + circOut(clamp01(t) * 2 - 1) / 2;

export const backOut: Easing = (t) => {
  const u = clamp01(t) - 1;
  return 1 + 2.70158 * u * u * u + 1.70158 * u * u;
};

export const backIn: Easing = (t) => 1 - backOut(1 - clamp01(t));

export const backInOut: Easing = (t) =>
  clamp01(t) < 0.5
    ? backIn(clamp01(t) * 2) / 2
    : 0.5 + backOut(clamp01(t) * 2 - 1) / 2;

export const anticipate: Easing = (t) => {
  const u = clamp01(t);
  if (u < 0.5) return backIn(u * 2) / 2;
  if (u === 1) return 1;
  return 1 - 0.5 * 2 ** (-20 * (u - 0.5));
};
