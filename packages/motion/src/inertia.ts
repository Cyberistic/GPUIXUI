/**
 * Momentum (inertia) decay with optional hard bounds.
 *
 * Borrowed from `gpui-ce-motion`'s `Inertia` (MIT OR Apache-2.0). Exponential
 * deceleration toward the projected rest position `value + velocity * tau`,
 * clamped to `[min, max]` when bounds are configured. The first slice clamps at
 * a bound with zero velocity; the boundary spring from the source is deferred.
 */

/** Time constant (seconds) plus optional hard bounds. */
export interface Inertia {
  readonly tau: number;
  readonly min: number | null;
  readonly max: number | null;
}

/** A sampled point on the inertial trajectory. */
export interface InertiaSample {
  readonly value: number;
  readonly velocity: number;
  readonly settled: boolean;
}

const DEFAULT_TAU_MS = 350;
const REST_SPEED = 0.001;

/**
 * Builds inertia from a time constant (ms) and optional bounds. Non-finite or
 * non-positive `tauMs` falls back to 350 ms; inverted bounds are swapped.
 */
export const inertia = (
  tauMs = DEFAULT_TAU_MS,
  bounds?: { readonly min?: number; readonly max?: number },
): Inertia => {
  const tau =
    Number.isFinite(tauMs) && tauMs > 0 ? tauMs / 1000 : DEFAULT_TAU_MS / 1000;
  let min = bounds?.min;
  let max = bounds?.max;
  if (min !== undefined && !Number.isFinite(min)) min = undefined;
  if (max !== undefined && !Number.isFinite(max)) max = undefined;
  if (min !== undefined && max !== undefined && min > max) {
    [min, max] = [max, min];
  }
  return { tau, min: min ?? null, max: max ?? null };
};

const clamp = (value: number, inertia: Inertia): number => {
  if (inertia.min !== null && value < inertia.min) return inertia.min;
  if (inertia.max !== null && value > inertia.max) return inertia.max;
  return value;
};

/** The resting position an inertial release would settle on, clamped to bounds. */
export const project = (
  inertia: Inertia,
  position: number,
  velocity: number,
): number => clamp(position + velocity * inertia.tau, inertia);

/**
 * Samples exponential deceleration at an explicit elapsed time. The trajectory
 * approaches {@link project} and clamps to bounds with zero velocity. A `NaN`
 * elapsed time reads as the release frame, so a clock the caller could not read
 * never reaches the formulas.
 */
export const sampleInertia = (
  inertia: Inertia,
  from: number,
  velocity: number,
  elapsedMs: number,
): InertiaSample => {
  const t = (Number.isNaN(elapsedMs) ? 0 : Math.max(elapsedMs, 0)) / 1000;
  const decay = Math.exp(-t / inertia.tau);
  const rest = from + velocity * inertia.tau;
  const value = clamp(from + (rest - from) * (1 - decay), inertia);
  const outVelocity = velocity * decay;
  const atBound =
    (inertia.min !== null && value <= inertia.min) ||
    (inertia.max !== null && value >= inertia.max);
  const settled = atBound || Math.abs(outVelocity) <= REST_SPEED;
  return { value, velocity: atBound ? 0 : outVelocity, settled };
};
