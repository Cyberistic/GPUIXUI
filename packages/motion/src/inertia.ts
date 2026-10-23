/**
 * Momentum (inertia) decay with optional hard bounds.
 *
 * Borrowed from `gpui-ce-motion`'s `Inertia` (MIT OR Apache-2.0). Exponential
 * deceleration toward the projected rest position `value + velocity * tau`,
 * clamped to `[min, max]` when bounds are configured. A bound is a wall a coast
 * stops at only while it is moving into it: a release *on* a wall with its
 * velocity pointing back into the range is the start of a journey, not the end
 * of one, so it travels inward instead of reporting itself settled at the
 * release frame. The boundary spring from the source is deferred.
 *
 * `Inertia` is structural, so a caller may build one without {@link inertia}:
 * the samplers repair what they are handed — a time constant that cannot run
 * takes the house 350 ms, a bound that cannot be read is dropped and an inverted
 * pair is swapped, and a non-finite position or velocity reads as a standstill.
 * Without that, `tau: NaN` answered `NaN` from {@link project} and a coast never
 * settled, painting `NaN` into every frame. A rest the arithmetic cannot
 * represent is no journey either: the coast settles on the nearest finite
 * destination (a wall in the direction it was thrown, or the release frame) in
 * the frame it is released, because an overflowed travel times a zero decay is
 * `NaN`, and `Infinity` is painted as nothing.
 */

import {
  DEFAULT_TAU_MS,
  boundsOf,
  tauOf,
  type Bounds,
} from "./inertia-read.js";

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

const REST_SPEED = 0.001;

const clampTo = (value: number, { min, max }: Bounds): number => {
  if (min !== null && value < min) return min;
  if (max !== null && value > max) return max;
  return value;
};

/**
 * The destination a release settles on — always a number the runtime can paint.
 *
 * A projection that overflows still knows which way it went, so a wall in that
 * direction is a destination the coast can travel to (it is finite). Without one
 * there is no representable rest at all, and `Infinity` is not a frame: the
 * runtime paints a non-finite inset as nothing, so the coast has nowhere to go
 * but where it was released.
 */
const destinationOf = (
  start: number,
  speed: number,
  tau: number,
  limits: Bounds,
): number => {
  const rest = start + speed * tau;
  if (Number.isFinite(rest)) return clampTo(rest, limits);
  return (rest > 0 ? limits.max : limits.min) ?? clampTo(start, limits);
};

/**
 * Builds inertia from a time constant (ms) and optional bounds. Non-finite or
 * non-positive `tauMs` falls back to 350 ms; inverted bounds are swapped.
 */
export const inertia = (
  tauMs = DEFAULT_TAU_MS,
  bounds?: { readonly min?: number; readonly max?: number },
): Inertia => {
  const limits = boundsOf(bounds?.min ?? null, bounds?.max ?? null);
  return { tau: tauOf(tauMs / 1000), min: limits.min, max: limits.max };
};

/** A number the formula can read, or the standstill it means. */
const finiteOr = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

/** The resting position an inertial release would settle on, clamped to bounds. */
export const project = (
  inertia: Inertia,
  position: number,
  velocity: number,
): number =>
  destinationOf(
    finiteOr(position, 0),
    finiteOr(velocity, 0),
    tauOf(inertia.tau),
    boundsOf(inertia.min, inertia.max),
  );

/**
 * Samples exponential deceleration at an explicit elapsed time. The trajectory
 * approaches {@link project} and clamps to bounds with zero velocity. A `NaN`
 * elapsed time reads as the release frame, so a clock the caller could not read
 * never reaches the formulas.
 *
 * A bound is a wall, and it stops a coast only when the coast is moving into it:
 * a surface released *on* a wall with its velocity pointing back into its range
 * is at the start of a journey, not the end of one. Reading the position alone
 * reported that release as settled, and `MotionValue` finished the run at the
 * projected rest on the far side — a teleport across the whole range.
 */
export const sampleInertia = (
  inertia: Inertia,
  from: number,
  velocity: number,
  elapsedMs: number,
): InertiaSample => {
  const t = (Number.isNaN(elapsedMs) ? 0 : Math.max(elapsedMs, 0)) / 1000;
  const position = finiteOr(from, 0);
  const speed = finiteOr(velocity, 0);
  const tau = tauOf(inertia.tau);
  const limits = boundsOf(inertia.min, inertia.max);
  const rest = position + speed * tau;
  if (!Number.isFinite(rest)) {
    // The rest this release is heading for is not a number the runtime can
    // paint, so the journey is not one it can run: the coast lands on the
    // nearest representable destination in the release frame, the way a
    // standstill does, instead of taking an overflowed travel times a zero
    // decay into a `NaN` frame that never settles.
    return {
      value: destinationOf(position, speed, tau, limits),
      velocity: 0,
      settled: true,
    };
  }
  const decay = Math.exp(-t / tau);
  const value = clampTo(position + (rest - position) * (1 - decay), limits);
  const outVelocity = speed * decay;
  const intoWall =
    (limits.min !== null && value <= limits.min && outVelocity <= 0) ||
    (limits.max !== null && value >= limits.max && outVelocity >= 0);
  const settled = intoWall || Math.abs(outVelocity) <= REST_SPEED;
  return { value, velocity: intoWall ? 0 : outVelocity, settled };
};
