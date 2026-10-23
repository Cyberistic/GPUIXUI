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
import { eased, mix } from "./progress.js";
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
 * The duration a tween runs for, read from a declared one.
 *
 * A duration the sampler cannot read (`NaN`, an infinity) divides the elapsed
 * time into `NaN`, so the sample is `NaN` and the run never reports completion —
 * a surface that hands the runtime a `NaN` inset. It falls back to
 * {@link DEFAULT_TWEEN_MS} the way every other unusable timing in the package
 * does, and a zero or negative one is no duration at all (an instant
 * assignment). The declared transition, the sampler and the equality check all
 * read this one value, so a hand-built tween cannot sample differently from the
 * duration it compares by.
 */
const runDurationMs = (durationMs: number): number =>
  Number.isFinite(durationMs) ? Math.max(durationMs, 0) : DEFAULT_TWEEN_MS;

/** A duration/easing tween. A duration that cannot run uses the house default. */
export const tween = (
  durationMs = DEFAULT_TWEEN_MS,
  easing: Easing = easeOut,
): Transition => ({
  kind: "tween",
  durationMs: runDurationMs(durationMs),
  easing,
});

/** A velocity-aware spring. */
export const springTransition = (physics: SpringPhysics): Transition => ({
  kind: "spring",
  physics,
});

/** The run a caller who names no transition gets: the house tween. */
const houseTransition: Transition = tween();

/** Whether a value names one of the three runs this package samples. */
const isTransition = (value: unknown): value is Transition => {
  if (typeof value !== "object" || value === null) return false;
  if (!("kind" in value)) return false;
  return (
    value.kind === "instant" ||
    value.kind === "tween" ||
    value.kind === "spring"
  );
};

/**
 * The declaration a sampler runs, read from a value a caller may have stored.
 *
 * `Transition` is exported and structural, so a config decoded from storage can
 * arrive with **no object at all** — JSON has no `undefined`, so a field the
 * config never carried comes back as `null` — and a hand-built release can name
 * a run the package does not know. `animate` stored it and the frame loop read
 * `.kind` off nothing, throwing `TypeError` out of a sampler. It is read as the
 * declaration a caller who names none gets: the house {@link tween}.
 */
const transitionOf = (declaration: Transition | null | undefined): Transition =>
  isTransition(declaration) ? declaration : houseTransition;

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

/**
 * Structural equality so a re-declared transition does not restart a run.
 *
 * A tween is compared by the duration the sampler runs and a spring by the
 * physics it samples, so a hand-built declaration whose unreadable field the
 * sampler repairs reads equal to the repair it performs. A declaration that
 * carries no run at all is read as the one `animate` runs by default, so it
 * compares equal to that instead of throwing. `Easing` is a caller's function,
 * so its identity is the only rule available for it.
 */
export const transitionEquals = (
  left: Transition,
  right: Transition,
): boolean => {
  const a = transitionOf(left);
  const b = transitionOf(right);
  if (a.kind !== b.kind) return false;
  if (a.kind === "instant") return true;
  if (a.kind === "tween" && b.kind === "tween") {
    return (
      runDurationMs(a.durationMs) === runDurationMs(b.durationMs) &&
      easingEquals(a.easing, b.easing)
    );
  }
  return (
    a.kind === "spring" &&
    b.kind === "spring" &&
    physicsEquals(a.physics, b.physics)
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

  /**
   * Assigns a value and cancels animation without momentum.
   *
   * The retired declaration goes with the run: a coast released afterwards
   * starts from this value even when its release speed and inertia match the
   * last gesture, because the coast still on screen is no longer this one.
   */
  set(value: number): void {
    const safe = finite(value, this.value);
    this.value = safe;
    this.velocity = 0;
    this.initialVelocity = 0;
    this.from = safe;
    this.target = safe;
    this.mode = { kind: "transition", transition: instant };
    this.active = false;
    this.completed = false;
  }

  /**
   * Retargets from the current presentation; identical declarations are a no-op.
   *
   * A declaration the caller cannot read — a stored one the config did not
   * carry, or a kind this package does not sample — is the run a caller who
   * names none gets ({@link tween}), so it cannot reach the frame loop as
   * `.kind` on nothing.
   */
  animate(target: number, transition: Transition = tween()): void {
    const safeTarget = finite(target, this.target);
    const declared = transitionOf(transition);
    if (
      this.mode.kind === "transition" &&
      this.target === safeTarget &&
      transitionEquals(this.mode.transition, declared)
    ) {
      return;
    }
    this.from = this.value;
    this.initialVelocity = this.velocity;
    this.target = safeTarget;
    this.mode = { kind: "transition", transition: declared };
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
   * or `animate`. A declaration that carries no inertia object at all is the
   * house coast, because `Inertia` is structural and a stored config may not
   * have decoded.
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
      const durationSec = runDurationMs(transition.durationMs) / 1000;
      if (durationSec <= 0 || t >= durationSec) {
        this.finish();
        return;
      }
      const progress = eased(transition.easing, t / durationSec);
      this.value = mix(this.from, this.target, progress);
      this.velocity = finite((this.target - this.from) / durationSec, 0);
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
