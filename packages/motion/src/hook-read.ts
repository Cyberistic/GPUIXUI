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
import {
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
