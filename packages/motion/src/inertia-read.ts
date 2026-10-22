/**
 * How an inertia declaration is read, and whether two mean the same coast.
 *
 * `Inertia` is structural, so every entry point repairs what it is handed. The
 * repairs live here rather than in `inertia.ts` because the retained value also
 * compares two declarations — by the physics a sample reads, not by object
 * identity — and a hook may build `inertia()` inline on every render.
 *
 * Private to the package: `index.ts` does not re-export this module.
 */

import type { Inertia } from "./inertia.js";

/** The house time constant, in milliseconds. */
export const DEFAULT_TAU_MS = 350;

/** The bounds a sample clamps to. */
export interface Bounds {
  readonly min: number | null;
  readonly max: number | null;
}

/** The time constant a sample can run with: the house one for a value it cannot. */
export const tauOf = (tau: number): number =>
  Number.isFinite(tau) && tau > 0 ? tau : DEFAULT_TAU_MS / 1000;

/** Bounds a sample can clamp to: unreadable ones dropped, an inverted pair swapped. */
export const boundsOf = (min: number | null, max: number | null): Bounds => {
  const low = min !== null && Number.isFinite(min) ? min : null;
  const high = max !== null && Number.isFinite(max) ? max : null;
  return low !== null && high !== null && low > high
    ? { min: high, max: low }
    : { min: low, max: high };
};

/**
 * Whether two inertia declarations are the same coast.
 *
 * Compares what a sample reads, so the two objects need not be the same one:
 * `{ tau: NaN }` and `{ tau: 350 }` are the house 350 ms, and a bound pair in
 * the other order is the same pair after the repair.
 */
export const sameInertia = (left: Inertia, right: Inertia): boolean => {
  const leftBounds = boundsOf(left.min, left.max);
  const rightBounds = boundsOf(right.min, right.max);
  return (
    tauOf(left.tau) === tauOf(right.tau) &&
    leftBounds.min === rightBounds.min &&
    leftBounds.max === rightBounds.max
  );
};
