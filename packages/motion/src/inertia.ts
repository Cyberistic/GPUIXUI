import { DEFAULT_TAU_MS, inertiaOf, type Bounds } from "./inertia-read.js";

export interface Inertia {
  readonly tau: number;
  readonly min: number | null;
  readonly max: number | null;
}

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

export const inertia = (
  tauMs = DEFAULT_TAU_MS,
  bounds?: { readonly min?: number; readonly max?: number },
): Inertia =>
  inertiaOf({
    tau: tauMs / 1000,
    min: bounds?.min ?? null,
    max: bounds?.max ?? null,
  });

const finiteOr = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

export const project = (
  inertia: Inertia,
  position: number,
  velocity: number,
): number => {
  const read = inertiaOf(inertia);
  return destinationOf(
    finiteOr(position, 0),
    finiteOr(velocity, 0),
    read.tau,
    read,
  );
};

export const sampleInertia = (
  inertia: Inertia,
  from: number,
  velocity: number,
  elapsedMs: number,
): InertiaSample => {
  const t = (Number.isNaN(elapsedMs) ? 0 : Math.max(elapsedMs, 0)) / 1000;
  const position = finiteOr(from, 0);
  const speed = finiteOr(velocity, 0);
  const read = inertiaOf(inertia);
  const tau = read.tau;
  const rest = position + speed * tau;
  if (!Number.isFinite(rest)) {
    return {
      value: destinationOf(position, speed, tau, read),
      velocity: 0,
      settled: true,
    };
  }
  const decay = Math.exp(-t / tau);
  const value = clampTo(position + (rest - position) * (1 - decay), read);
  const outVelocity = speed * decay;
  const intoWall =
    (read.min !== null && value <= read.min && outVelocity <= 0) ||
    (read.max !== null && value >= read.max && outVelocity >= 0);
  const settled = intoWall || Math.abs(outVelocity) <= REST_SPEED;
  return { value, velocity: intoWall ? 0 : outVelocity, settled };
};
