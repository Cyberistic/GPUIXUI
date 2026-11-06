import { mix } from "./progress.js";

export interface SpringPhysics {
  readonly mass: number;
  readonly stiffness: number;
  readonly damping: number;
  readonly restDelta: number;
  readonly restSpeed: number;
}

export interface SpringSample {
  readonly value: number;
  readonly velocity: number;
  readonly target: number;
  readonly settled: boolean;
}

export interface SpringPhysicsParams {
  readonly mass?: number;
  readonly stiffness?: number;
  readonly damping?: number;
  readonly restDelta?: number;
  readonly restSpeed?: number;
}

const DEFAULT_MASS = 1;
const DEFAULT_STIFFNESS = 260;
const DEFAULT_DAMPING = 28;
const DEFAULT_REST_DELTA = 0.001;
const DEFAULT_REST_SPEED = 0.01;
const MIN_POSITIVE = 1e-6;
const MAX_PHYSICS_VALUE = 1e6;
const EPSILON = 1.192_092_9e-7;

const sanitizeNumber = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isFinite(value) ? value : fallback;

const sanitizePositive = (
  value: number | undefined,
  fallback: number,
): number =>
  value !== undefined && Number.isFinite(value) && value > 0
    ? Math.min(Math.max(value, MIN_POSITIVE), MAX_PHYSICS_VALUE)
    : fallback;

const sanitizeNonNegative = (
  value: number | undefined,
  fallback: number,
): number =>
  value !== undefined && Number.isFinite(value) && value >= 0
    ? Math.min(value, MAX_PHYSICS_VALUE)
    : fallback;

const physicsOf = (
  fields: SpringPhysicsParams | null | undefined,
): SpringPhysics => ({
  mass: sanitizePositive(fields?.mass, DEFAULT_MASS),
  stiffness: sanitizePositive(fields?.stiffness, DEFAULT_STIFFNESS),
  damping: sanitizeNonNegative(fields?.damping, DEFAULT_DAMPING),
  restDelta: sanitizePositive(fields?.restDelta, DEFAULT_REST_DELTA),
  restSpeed: sanitizePositive(fields?.restSpeed, DEFAULT_REST_SPEED),
});

export const springPhysics = (
  params: SpringPhysicsParams = {},
): SpringPhysics => physicsOf(params);

export const affordanceSpring: SpringPhysics = springPhysics({
  stiffness: 320,
  damping: 34,
});

export const layoutSpring: SpringPhysics = springPhysics({
  stiffness: 260,
  damping: 28,
});

export const continuitySpring: SpringPhysics = springPhysics({
  stiffness: 190,
  damping: 23,
});

const withinRest = (
  rest: SpringPhysics,
  value: number,
  target: number,
  velocity: number,
): boolean =>
  Math.abs(value - target) <= rest.restDelta &&
  Math.abs(velocity) <= rest.restSpeed;

export const atRest = (
  physics: SpringPhysics,
  value: number,
  target: number,
  velocity: number,
): boolean => withinRest(physicsOf(physics), value, target, velocity);

export const retarget = (
  sample: SpringSample | null | undefined,
  target: number,
): SpringSample => {
  const value = sanitizeNumber(sample?.value, 0);
  return {
    value,
    velocity: sanitizeNumber(sample?.velocity, 0),
    target: sanitizeNumber(target, value),
    settled: false,
  };
};

export const sampleSpring = (
  physics: SpringPhysics,
  from: number,
  target: number,
  velocity: number,
  elapsedMs: number,
): SpringSample => {
  const rest = physicsOf(physics);
  const safeFrom = sanitizeNumber(from, 0);
  const safeTarget = sanitizeNumber(target, safeFrom);
  const safeVelocity = sanitizeNumber(velocity, 0);
  const t = (Number.isNaN(elapsedMs) ? 0 : Math.max(elapsedMs, 0)) / 1000;

  if (t === 0) {
    const settled = withinRest(rest, safeFrom, safeTarget, safeVelocity);
    return {
      value: settled ? safeTarget : safeFrom,
      velocity: settled ? 0 : safeVelocity,
      target: safeTarget,
      settled,
    };
  }

  const angularFrequency = Math.sqrt(rest.stiffness / rest.mass);
  const criticalDamping = 2 * Math.sqrt(rest.stiffness * rest.mass);
  const dampingRatio = criticalDamping > 0 ? rest.damping / criticalDamping : 1;
  const regime = (
    displacement: number,
    speed: number,
  ): readonly [number, number] =>
    dampingRatio < 1
      ? underdamped(displacement, speed, angularFrequency, dampingRatio, t)
      : Math.abs(dampingRatio - 1) <= EPSILON
        ? criticallyDamped(displacement, speed, angularFrequency, t)
        : overdamped(displacement, speed, angularFrequency, dampingRatio, t);

  const displacement = safeFrom - safeTarget;
  let value: number;
  let outVelocity: number;
  if (Number.isFinite(displacement)) {
    const [sampledDisplacement, sampledVelocity] = regime(
      displacement,
      safeVelocity,
    );
    value = safeTarget + sampledDisplacement;
    outVelocity = sampledVelocity;
  } else {
    const scale = Math.max(Math.abs(safeFrom), Math.abs(safeTarget));
    const [position, positionSpeed] = regime(1, 0);
    const [response, responseSpeed] = regime(0, 1);
    value = mix(safeFrom, safeTarget, 1 - position) + response * safeVelocity;
    outVelocity =
      scale *
      (positionSpeed * (safeFrom / scale - safeTarget / scale) +
        responseSpeed * (safeVelocity / scale));
  }
  value = sanitizeNumber(value, safeTarget);
  outVelocity = sanitizeNumber(outVelocity, 0);
  if (withinRest(rest, value, safeTarget, outVelocity)) {
    return {
      value: safeTarget,
      velocity: 0,
      target: safeTarget,
      settled: true,
    };
  }
  return {
    value,
    velocity: outVelocity,
    target: safeTarget,
    settled: false,
  };
};

const underdamped = (
  displacement: number,
  velocity: number,
  angularFrequency: number,
  dampingRatio: number,
  time: number,
): readonly [number, number] => {
  const dampedFrequency =
    angularFrequency * Math.sqrt(1 - dampingRatio * dampingRatio);
  if (dampedFrequency <= MIN_POSITIVE) {
    return criticallyDamped(displacement, velocity, angularFrequency, time);
  }

  const decay = Math.exp(-dampingRatio * angularFrequency * time);
  const sin = Math.sin(dampedFrequency * time);
  const cos = Math.cos(dampedFrequency * time);
  const a = displacement;
  const b =
    (velocity + dampingRatio * angularFrequency * displacement) /
    dampedFrequency;
  const oscillation = a * cos + b * sin;
  const sampledDisplacement = decay * oscillation;
  const sampledVelocity =
    decay *
    (-a * dampedFrequency * sin +
      b * dampedFrequency * cos -
      dampingRatio * angularFrequency * oscillation);
  return [sampledDisplacement, sampledVelocity];
};

const criticallyDamped = (
  displacement: number,
  velocity: number,
  angularFrequency: number,
  time: number,
): readonly [number, number] => {
  const decay = Math.exp(-angularFrequency * time);
  const c = velocity + angularFrequency * displacement;
  const displacementTerm = displacement + c * time;
  return [
    decay * displacementTerm,
    decay * (c - angularFrequency * displacementTerm),
  ];
};

const overdamped = (
  displacement: number,
  velocity: number,
  angularFrequency: number,
  dampingRatio: number,
  time: number,
): readonly [number, number] => {
  const ratioDelta = Math.sqrt(dampingRatio * dampingRatio - 1);
  const r1 = -angularFrequency * (dampingRatio - ratioDelta);
  const r2 = -angularFrequency * (dampingRatio + ratioDelta);
  if (Math.abs(r1 - r2) <= MIN_POSITIVE) {
    return criticallyDamped(displacement, velocity, angularFrequency, time);
  }
  const c1 = (velocity - r2 * displacement) / (r1 - r2);
  const c2 = displacement - c1;
  const e1 = Math.exp(r1 * time);
  const e2 = Math.exp(r2 * time);
  return [c1 * e1 + c2 * e2, c1 * r1 * e1 + c2 * r2 * e2];
};
