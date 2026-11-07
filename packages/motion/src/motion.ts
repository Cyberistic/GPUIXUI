import { easeOut, type Easing } from "./easing.js";
import { sameInertia } from "./inertia-read.js";
import { sampleInertia, type Inertia, project } from "./inertia.js";
import { eased, mix } from "./progress.js";
import { sampleSpring, springPhysics, type SpringPhysics } from "./spring.js";

export type Transition =
  | { readonly kind: "instant" }
  | {
      readonly kind: "tween";
      readonly durationMs: number;
      readonly easing: Easing;
    }
  | { readonly kind: "spring"; readonly physics: SpringPhysics };

export interface MotionFrame {
  readonly value: number;
  readonly velocity: number;
  readonly active: boolean;

  readonly complete: boolean;
}

type Mode =
  | { readonly kind: "transition"; readonly transition: Transition }
  | { readonly kind: "inertia"; readonly inertia: Inertia };

export const DEFAULT_TWEEN_MS = 300;

export const instant: Transition = { kind: "instant" };

const runDurationMs = (durationMs: number): number =>
  Number.isFinite(durationMs) && durationMs <= Number.MAX_SAFE_INTEGER
    ? Math.max(durationMs, 0)
    : DEFAULT_TWEEN_MS;

export const tween = (
  durationMs = DEFAULT_TWEEN_MS,
  easing: Easing = easeOut,
): Transition => ({
  kind: "tween",
  durationMs: runDurationMs(durationMs),
  easing,
});

export const springTransition = (physics: SpringPhysics): Transition => ({
  kind: "spring",
  physics,
});

const houseTransition: Transition = tween();

const isTransition = (value: unknown): value is Transition => {
  if (typeof value !== "object" || value === null) return false;
  if (!("kind" in value)) return false;
  return (
    value.kind === "instant" ||
    value.kind === "tween" ||
    value.kind === "spring"
  );
};

const transitionOf = (declaration: Transition | null | undefined): Transition =>
  isTransition(declaration) ? declaration : houseTransition;

const easingEquals = (left: Easing, right: Easing): boolean => left === right;

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

  get current(): number {
    return this.value;
  }

  get speed(): number {
    return this.velocity;
  }

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
