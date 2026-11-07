import { schedulableSeconds } from "./duration.js";
import type { Inertia } from "./inertia.js";

export const DEFAULT_TAU_MS = 350;

export interface Bounds {
  readonly min: number | null;
  readonly max: number | null;
}

export const tauOf = (tau: number | undefined): number =>
  schedulableSeconds(tau) ?? DEFAULT_TAU_MS / 1000;

export const boundsOf = (min: number | null, max: number | null): Bounds => {
  const low = min !== null && Number.isFinite(min) ? min : null;
  const high = max !== null && Number.isFinite(max) ? max : null;
  return low !== null && high !== null && low > high
    ? { min: high, max: low }
    : { min: low, max: high };
};

export const inertiaOf = (fields: Inertia | null | undefined): Inertia => ({
  tau: tauOf(fields?.tau),
  ...boundsOf(fields?.min ?? null, fields?.max ?? null),
});

export const sameInertia = (left: Inertia, right: Inertia): boolean => {
  const a = inertiaOf(left);
  const b = inertiaOf(right);
  return a.tau === b.tau && a.min === b.min && a.max === b.max;
};
