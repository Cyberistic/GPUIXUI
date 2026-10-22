/**
 * Which way a liquid fill floods a control, and the frames it paints.
 *
 * The runtime has no `transform` (upstream issue #102), so the flood is not a
 * scaled blob: it is an absolutely positioned layer whose `left` and `width`
 * tween together. Entering from the left edge means the layer is born with no
 * width at `left: 0` and grows to the control's width; entering from the right
 * means it is born at `left: width` and grows leftward as its `left` falls to
 * zero. Leaving drains it the same way: the layer's `left` runs to the edge the
 * pointer left through while its `width` falls to nothing, so the fill empties
 * out of that side instead of blinking away.
 *
 * A pointer that is not over the control when it enters — a keyboard focus, a
 * programmatic hover — has no side to enter from, so the nearest half decides.
 * All of it is arithmetic over a measured box, so it is checked without a window.
 */

import type { MotionStyle } from "@gpuix/react";

/** The side a flood enters or drains through. */
export type LiquidEdge = "left" | "right";

/** The share of the label's ink a flood carries. */
export const liquidOpacity = 0.16;

/**
 * The side a pointer at `pointerX` belongs to: the half of `box` it is on.
 *
 * A pointer inside the left half enters from the left, and one past either edge
 * belongs to the side it went through — so a pointer that has already left the
 * control still names the edge it left by.
 */
export const liquidEdge = (
  pointerX: number,
  box: { readonly x: number; readonly width: number },
): LiquidEdge => (pointerX < box.x + box.width / 2 ? "left" : "right");

/** The measured width a fill can span; an absent or negative one spans nothing. */
const span = (full: number): number =>
  Number.isFinite(full) && full > 0 ? full : 0;

/** The frame a flood paints while it is empty at `edge`. */
export const liquidEmpty = (edge: LiquidEdge, full: number): MotionStyle =>
  edge === "left" ? { left: 0, width: 0 } : { left: span(full), width: 0 };

/** The frame a flood paints once it covers the control. */
export const liquidAcross = (full: number): MotionStyle => ({
  left: 0,
  width: span(full),
});

/** The frame a flood at `edge` paints: empty at that edge, or filled across. */
export const liquidFrame = (
  edge: LiquidEdge,
  full: number,
  filled: boolean,
): MotionStyle => (filled ? liquidAcross(full) : liquidEmpty(edge, full));
