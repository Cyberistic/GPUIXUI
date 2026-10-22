/**
 * Closed-form spring integration (under / critical / over-damped) for
 * layout-like UI motion.
 *
 * Ported from open-gpui `crates/motion/src/spring.rs` (Apache-2.0). Sampling is
 * velocity-aware and retargetable: re-seed `sampleSpring` with a prior sample's
 * value and velocity to change target without losing momentum.
 */

/** Sanitized spring physics parameters. */
export interface SpringPhysics {
  readonly mass: number;
  readonly stiffness: number;
  readonly damping: number;
  readonly restDelta: number;
  readonly restSpeed: number;
}

/** A sampled point on the spring trajectory. */
export interface SpringSample {
  readonly value: number;
  readonly velocity: number;
  readonly target: number;
  readonly settled: boolean;
}

/** Optional overrides for {@link springPhysics}. */
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

/** Sanitized spring physics from optional parameters. */
export const springPhysics = (
  params: SpringPhysicsParams = {},
): SpringPhysics => ({
  mass: sanitizePositive(params.mass, DEFAULT_MASS),
  stiffness: sanitizePositive(params.stiffness, DEFAULT_STIFFNESS),
  damping: sanitizeNonNegative(params.damping, DEFAULT_DAMPING),
  restDelta: sanitizePositive(params.restDelta, DEFAULT_REST_DELTA),
  restSpeed: sanitizePositive(params.restSpeed, DEFAULT_REST_SPEED),
});

/** Short, subtle affordance motion. */
export const affordanceSpring: SpringPhysics = springPhysics({
  stiffness: 320,
  damping: 34,
});

/** Committed layout motion such as collapse, expand, insert, or remove. */
export const layoutSpring: SpringPhysics = springPhysics({
  stiffness: 260,
  damping: 28,
});

/** Continuity motion for retargeted pane, divider, or zoom transitions. */
export const continuitySpring: SpringPhysics = springPhysics({
  stiffness: 190,
  damping: 23,
});

/** Whether the spring has reached its rest thresholds. */
export const atRest = (
  physics: SpringPhysics,
  value: number,
  target: number,
  velocity: number,
): boolean =>
  Math.abs(value - target) <= physics.restDelta &&
  Math.abs(velocity) <= physics.restSpeed;

/**
 * Re-seeds a running spring at a new target, keeping the sampled value and
 * velocity. Pair with {@link sampleSpring} at `elapsedMs = 0` to continue
 * seamlessly toward the new target.
 */
export const retarget = (
  sample: SpringSample,
  target: number,
): SpringSample => ({
  value: sample.value,
  velocity: sample.velocity,
  target: sanitizeNumber(target, sample.value),
  settled: false,
});

/**
 * Samples a spring at an explicit elapsed time, returning value and velocity.
 * Non-finite inputs are sanitized to sensible defaults: a `NaN` elapsed time is
 * the start of the run (`0`), while an infinity is the end of it.
 */
export const sampleSpring = (
  physics: SpringPhysics,
  from: number,
  target: number,
  velocity: number,
  elapsedMs: number,
): SpringSample => {
  const safeFrom = sanitizeNumber(from, 0);
  const safeTarget = sanitizeNumber(target, safeFrom);
  const safeVelocity = sanitizeNumber(velocity, 0);
  const t = (Number.isNaN(elapsedMs) ? 0 : Math.max(elapsedMs, 0)) / 1000;

  if (t === 0) {
    const settled = atRest(physics, safeFrom, safeTarget, safeVelocity);
    return {
      value: settled ? safeTarget : safeFrom,
      velocity: settled ? 0 : safeVelocity,
      target: safeTarget,
      settled,
    };
  }

  const displacement = safeFrom - safeTarget;
  const angularFrequency = Math.sqrt(physics.stiffness / physics.mass);
  const criticalDamping = 2 * Math.sqrt(physics.stiffness * physics.mass);
  const dampingRatio =
    criticalDamping > 0 ? physics.damping / criticalDamping : 1;

  const [sampledDisplacement, sampledVelocity] =
    dampingRatio < 1
      ? underdamped(
          displacement,
          safeVelocity,
          angularFrequency,
          dampingRatio,
          t,
        )
      : Math.abs(dampingRatio - 1) <= EPSILON
        ? criticallyDamped(displacement, safeVelocity, angularFrequency, t)
        : overdamped(
            displacement,
            safeVelocity,
            angularFrequency,
            dampingRatio,
            t,
          );

  const value = sanitizeNumber(safeTarget + sampledDisplacement, safeTarget);
  const outVelocity = sanitizeNumber(sampledVelocity, 0);
  if (atRest(physics, value, safeTarget, outVelocity)) {
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
