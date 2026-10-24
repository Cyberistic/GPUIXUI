/**
 * How a hook reads the motion it is handed.
 *
 * A hook re-renders for reasons that have nothing to do with motion, and the
 * forms this package documents — `springPhysics({ … })` beside a target,
 * `inertia()` inside a coast — build a new object on every render. Identity
 * cannot decide whether a run changed: the retained value already compares a
 * declaration by what a sample reads, so an effect keyed on identity restarts
 * the frame loop for a declaration that never moved. Each hook therefore retains
 * the declaration it runs with by value, and publishes a frame only when the
 * frame differs.
 *
 * Private to the package: `index.ts` does not re-export this module.
 */

import type { Inertia } from "./inertia.js";
import { sameInertia } from "./inertia-read.js";
import { easeOut, type Easing } from "./easing.js";
import {
  DEFAULT_TWEEN_MS,
  transitionEquals,
  type MotionFrame,
  type Transition,
} from "./motion.js";

/**
 * The transition a hook runs with.
 *
 * A re-declaration that means the same run keeps the declaration already
 * running, so the frame loop it drives is not re-armed by a render.
 */
export const retainTransition = (
  previous: Transition,
  next: Transition,
): Transition => (transitionEquals(previous, next) ? previous : next);

/** A coast a hook declares: the physics and the release velocity. */
export interface CoastDeclaration {
  readonly inertia: Inertia;
  readonly velocity: number;
}

/**
 * A tween as a caller — or a config it decoded — states it.
 *
 * The fields are what a stored setting has: JSON has no `undefined`, so a key a
 * record never carried reads back as `null`, and a release that renamed the
 * easing leaves a value that is not a curve. Both absences mean the documented
 * default, so a consumer passes its decoded record straight through.
 */
export interface TweenSpec {
  readonly durationMs?: number | null;
  readonly easing?: Easing | null;
}

/**
 * The tween a hook runs, read from a spec a caller may have stored.
 *
 * `useTransition`'s siblings all read the declaration they are handed — a
 * `Transition`, a `SpringPhysics`, an `Inertia` — and this one read `.durationMs`
 * off the spec object itself, so a config that decoded with **no spec at all**
 * (a field a record never carried) threw `TypeError: Cannot read properties of
 * null (reading 'durationMs')` out of the render that mounted the hook. A spec
 * the value does not name is the documented tween: the house 300 ms and
 * `easeOut`. A field the value does not name keeps its own default, and an
 * easing that is not a function is no curve — it takes `easeOut` rather than
 * reaching the sampler, which would fall back to the *linear* progress instead
 * of the curve the default names.
 */
export const tweenSpecOf = (
  spec: TweenSpec | null | undefined,
): { readonly durationMs: number; readonly easing: Easing } => {
  const easing = spec?.easing;
  return {
    durationMs: spec?.durationMs ?? DEFAULT_TWEEN_MS,
    easing: typeof easing === "function" ? easing : easeOut,
  };
};

/** The release velocity a coast runs with: one it cannot read is a standstill. */
const releaseOf = (velocity: number): number =>
  Number.isFinite(velocity) ? velocity : 0;

/** Whether two declarations are the coast a retained value runs. */
export const sameCoast = (
  left: CoastDeclaration,
  right: CoastDeclaration,
): boolean =>
  releaseOf(left.velocity) === releaseOf(right.velocity) &&
  sameInertia(left.inertia, right.inertia);

/** The coast a hook runs with: a re-declaration of the same gesture keeps it. */
export const retainCoast = (
  previous: CoastDeclaration,
  next: CoastDeclaration,
): CoastDeclaration => (sameCoast(previous, next) ? previous : next);

/**
 * Whether two frames paint the same thing.
 *
 * `complete` is a one-shot edge, so it makes a frame different even when the
 * value and the velocity did not move: publishing over it would swallow the one
 * report a caller gets that its run ended.
 */
export const sameFrame = (left: MotionFrame, right: MotionFrame): boolean =>
  left.value === right.value &&
  left.velocity === right.velocity &&
  left.complete === right.complete;
