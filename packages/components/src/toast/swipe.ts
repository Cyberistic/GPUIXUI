export const SWIPE_THRESHOLD = 40;

export const SWIPE_MIN_TRAVEL = 12;

export const SWIPE_VELOCITY = 0.5;

export type SwipeEdge = "left" | "right";

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
