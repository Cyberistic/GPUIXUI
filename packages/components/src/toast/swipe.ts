/**
 * The swipe's decision, without a pointer.
 *
 * A horizontal drag either dismisses or springs back. The card follows the
 * pointer on the `left` axis only — the runtime has no `transform`, and one
 * axis is what a bottom-corner stack can travel without covering the page.
 *
 * Distance is the first rule; velocity is the second, because a quick flick
 * from a reader who knows what they are doing should not have to cover the
 * whole threshold. Both are measured from the press, not from the previous
 * move, so a slow drag that reverses cannot collect a speed it never had.
 *
 * The gesture's model — distance or flick, then a spring-back — follows Base
 * UI's `ToastRoot` (v1.9.0); the numbers, the one-axis constraint and this
 * module are ours (`LICENSES/base-ui.md`).
 */

/** How far a card must travel before the release dismisses it, in pixels. */
export const SWIPE_THRESHOLD = 40;

/** The shortest flick the velocity rule may dismiss, in pixels. */
export const SWIPE_MIN_TRAVEL = 12;

/** The release speed that dismisses under the distance threshold, px/ms. */
export const SWIPE_VELOCITY = 0.5;

/** The edge a dismissed card travels toward. */
export type SwipeEdge = "left" | "right";

/**
 * The edge a gesture dismisses toward, or no edge for a snap-back.
 *
 * A number the pointer payload cannot supply (`NaN`, an infinity) is no
 * dismissal: a card must not fly off because a measurement failed. Elapsed time
 * is floored at one millisecond so a same-frame release is a very fast flick
 * rather than an infinite speed.
 */
export const swipeEdge = (
  dx: number,
  elapsedMs: number,
): SwipeEdge | undefined => {
  if (!Number.isFinite(dx) || !Number.isFinite(elapsedMs)) return undefined;
  const travel = Math.abs(dx);
  if (travel === 0) return undefined;
  const speed = travel / Math.max(1, elapsedMs);
  const flicked = travel >= SWIPE_MIN_TRAVEL && speed >= SWIPE_VELOCITY;
  if (travel < SWIPE_THRESHOLD && !flicked) return undefined;
  return dx < 0 ? "left" : "right";
};
