import type { Inertia } from "./inertia.js";
import { sameInertia } from "./inertia-read.js";
import { easeOut, type Easing } from "./easing.js";
import { isCurve } from "./progress.js";
import {
  DEFAULT_TWEEN_MS,
  transitionEquals,
  type MotionFrame,
  type Transition,
} from "./motion.js";

export const retainTransition = (
  previous: Transition,
  next: Transition,
): Transition => (transitionEquals(previous, next) ? previous : next);

export interface CoastDeclaration {
  readonly inertia: Inertia;
  readonly velocity: number;
}

export interface TweenSpec {
  readonly durationMs?: number | null;

  readonly easing?: unknown;
}

export const tweenSpecOf = (
  spec: TweenSpec | null | undefined,
): { readonly durationMs: number; readonly easing: Easing } => {
  const easing = spec?.easing;
  return {
    durationMs: spec?.durationMs ?? DEFAULT_TWEEN_MS,
    easing: isCurve(easing) ? easing : easeOut,
  };
};

const releaseOf = (velocity: number): number =>
  Number.isFinite(velocity) ? velocity : 0;

export const sameCoast = (
  left: CoastDeclaration,
  right: CoastDeclaration,
): boolean =>
  releaseOf(left.velocity) === releaseOf(right.velocity) &&
  sameInertia(left.inertia, right.inertia);

export const retainCoast = (
  previous: CoastDeclaration,
  next: CoastDeclaration,
): CoastDeclaration => (sameCoast(previous, next) ? previous : next);

export const sameFrame = (left: MotionFrame, right: MotionFrame): boolean =>
  left.value === right.value &&
  left.velocity === right.velocity &&
  left.complete === right.complete;
