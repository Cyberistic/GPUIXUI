/**
 * A retained scalar motion value: the single entry point that samples a
 * spring, tween, or inertia trajectory from an explicit elapsed time.
 *
 * Borrowed from `gpui-ce-motion`'s `MotionValue` (MIT OR Apache-2.0), with the
 * spring physics from open-gpui. The caller owns the clock: pass a monotonic
 * elapsed time to {@link MotionValue.sample}; reduced motion completes
 * immediately at the target.
 */

import { easeOut, type Easing } from "./easing.js";
import { sameInertia } from "./inertia-read.js";
import { sampleInertia, type Inertia, project } from "./inertia.js";
import { eased } from "./progress.js";
import { sampleSpring, springPhysics, type SpringPhysics } from "./spring.js";

/** A duration/easing tween, spring, or immediate assignment. */
export type Transition =
  | { readonly kind: "instant" }
  | {
      readonly kind: "tween";
      readonly durationMs: number;
      readonly easing: Easing;
    }
  | { readonly kind: "spring"; readonly physics: SpringPhysics };

/** A sampled frame of a retained motion value. */
export interface MotionFrame {
  readonly value: number;
  readonly velocity: number;
  readonly active: boolean;
  /** A one-shot edge: true only on the sample that completes the run. */
  readonly complete: boolean;
}

type Mode =
  | { readonly kind: "transition"; readonly transition: Transition }
  | { readonly kind: "inertia"; readonly inertia: Inertia };

/** The GPUix runtime's default transition: 300 ms ease-out. */
export const DEFAULT_TWEEN_MS = 300;

/** Immediate assignment, also used under reduced motion. */
export const instant: Transition = { kind: "instant" };

/**
 * A tween duration that can run.
 *
 * A non-finite duration divides the elapsed time into `NaN`, so the sample is
 * `NaN` and the run never reports completion — a surface that hands the runtime
 * a `NaN` inset. It falls back to {@link DEFAULT_TWEEN_MS} the way every other
 * unusable timing in the package does.
 */
const tweenDurationMs = (durationMs: number): number =>
  Number.isFinite(durationMs) ? durationMs : DEFAULT_TWEEN_MS;

/** A duration/easing tween. A duration that cannot run uses the house default. */
export const tween = (
  durationMs = DEFAULT_TWEEN_MS,
  easing: Easing = easeOut,
): Transition => ({
  kind: "tween",
  durationMs: tweenDurationMs(durationMs),
  easing,
});

/** A velocity-aware spring. */
export const springTransition = (physics: SpringPhysics): Transition => ({
  kind: "spring",
  physics,
});

const easingEquals = (left: Easing, right: Easing): boolean => left === right;

/**
 * Whether two physics declarations mean the same run.
 *
 * The comparison reads the physics the sampler reads: two declarations that
 * differ only in a field the sampler cannot read (`NaN` compares unequal to
 * itself) sample identically, so treating them as different declarations would
 * restart a run that never changed.
 */
const physicsEquals = (left: SpringPhysics, right: SpringPhysics): boolean => {
  const a = springPhysics(left);
  const b = springPhysics(right);
  return (
    a.mass === b.mass &&
    a.stiffness === b.stiffness &&
    a.damping === b.damping &&
    a.restDelta === b.restDelta &&
    a.restSpeed === b.restSpeed
  );
};

/** Structural equality so a re-declared transition does not restart a run. */
export const transitionEquals = (
  left: Transition,
  right: Transition,
): boolean => {
  if (left.kind !== right.kind) return false;
  if (left.kind === "instant") return true;
  if (left.kind === "tween" && right.kind === "tween") {
    return (
      left.durationMs === right.durationMs &&
      easingEquals(left.easing, right.easing)
    );
  }
  return (
    left.kind === "spring" &&
    right.kind === "spring" &&
    physicsEquals(left.physics, right.physics)
  );
};

const finite = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

/**
 * A retained scalar motion value with no timers or observers. Feed its samples
 * into any numeric target (a GPUix `MotionStyle` field, a scrub value, or a
 * projection result).
 */
export class MotionValue {
  private value: number;
  private velocity: number;
  private from: number;
  private initialVelocity: number;
  private target: number;
  private mode: Mode;
  private startedMs: number;
  private lastMs: number;
  private active: boolean;
  private completed: boolean;

  constructor(initial: number) {
    const value = finite(initial, 0);
    this.value = value;
    this.velocity = 0;
    this.from = value;
    this.initialVelocity = 0;
    this.target = value;
    this.mode = { kind: "transition", transition: instant };
    this.startedMs = 0;
    this.lastMs = 0;
    this.active = false;
    this.completed = false;
  }

  /** Last sampled value. */
  get current(): number {
    return this.value;
  }

  /** Last sampled velocity. */
  get speed(): number {
    return this.velocity;
  }

  /** Assigns a value and cancels animation without momentum. */
  set(value: number): void {
    const safe = finite(value, this.value);
    this.value = safe;
    this.velocity = 0;
    this.from = safe;
    this.target = safe;
    this.active = false;
    this.completed = false;
  }

  /** Retargets from the current presentation; identical declarations are a no-op. */
  animate(target: number, transition: Transition = tween()): void {
    const safeTarget = finite(target, this.target);
    if (
      this.mode.kind === "transition" &&
      this.target === safeTarget &&
      transitionEquals(this.mode.transition, transition)
    ) {
      return;
    }
    this.from = this.value;
    this.initialVelocity = this.velocity;
    this.target = safeTarget;
    this.mode = { kind: "transition", transition };
    this.startedMs = this.lastMs;
    this.active = this.from !== safeTarget || this.velocity !== 0;
    this.completed = false;
  }

  /**
   * Starts exponential inertia from the last presentation. `velocity` overrides
   * the retained velocity, so a gesture can release with an explicit speed.
   *
   * The coast already in flight is that declaration: re-declaring the same
   * inertia with the same release velocity is a no-op, so a render that builds
   * `inertia()` again does not relaunch the run from the sample on screen with
   * the full speed it has since lost (which would overshoot its rest and never
   * settle). A new gesture — another release velocity, a changed time constant
   * or bound — starts from the presentation, and so does a `coast` after `set`
   * or `animate`.
   */
  coast(inertia: Inertia, velocity?: number): void {
    const release = finite(velocity ?? this.velocity, 0);
    if (
      this.mode.kind === "inertia" &&
      this.initialVelocity === release &&
      sameInertia(this.mode.inertia, inertia)
    ) {
      return;
    }
    this.from = this.value;
    this.initialVelocity = release;
    this.target = project(inertia, this.value, this.initialVelocity);
    this.mode = { kind: "inertia", inertia };
    this.startedMs = this.lastMs;
    this.active = this.from !== this.target || this.velocity !== 0;
    this.completed = false;
  }

  /**
   * Samples the retained motion at a monotonic elapsed time. Reduced motion
   * finishes immediately at the target (including inertia).
   */
  sample(elapsedMs: number, reducedMotion = false): MotionFrame {
    const now = Number.isFinite(elapsedMs)
      ? Math.max(elapsedMs, this.lastMs)
      : this.lastMs;
    if (this.active && reducedMotion) {
      this.finish();
    } else if (this.active) {
      this.advance(now);
    }
    this.lastMs = now;
    const frame: MotionFrame = {
      value: this.value,
      velocity: this.velocity,
      active: this.active,
      complete: this.completed,
    };
    this.completed = false;
    return frame;
  }

  private finish(): void {
    this.value = this.target;
    this.velocity = 0;
    this.completed = true;
    this.active = false;
  }

  private advance(now: number): void {
    const t = (now - this.startedMs) / 1000;
    if (this.mode.kind === "inertia") {
      const sample = sampleInertia(
        this.mode.inertia,
        this.from,
        this.initialVelocity,
        t * 1000,
      );
      this.value = sample.value;
      this.velocity = sample.velocity;
      if (sample.settled) this.finish();
      return;
    }

    const transition = this.mode.transition;
    if (transition.kind === "instant") {
      this.finish();
      return;
    }

    if (transition.kind === "tween") {
      const durationSec = tweenDurationMs(transition.durationMs) / 1000;
      if (durationSec <= 0 || t >= durationSec) {
        this.finish();
        return;
      }
      const progress = eased(transition.easing, t / durationSec);
      this.value = this.from + (this.target - this.from) * progress;
      this.velocity = (this.target - this.from) / durationSec;
      return;
    }

    const sample = sampleSpring(
      transition.physics,
      this.from,
      this.target,
      this.initialVelocity,
      t * 1000,
    );
    this.value = sample.value;
    this.velocity = sample.velocity;
    if (sample.settled) this.finish();
  }
}
