/**
 * Where an outline sits around a control's border box.
 *
 * The runtime paints `outlineWidth` outside the border box after a gap of
 * `outlineOffset` points (`host.d.ts`), so a probe that samples the ring must
 * derive its point from both numbers: sampling the offset alone lands in the
 * gap, and sampling the width alone measures a ring drawn at the border.
 *
 * Pure point arithmetic, so a unit test can hold it without a window.
 */
import type { Point } from "./frame.js";

/**
 * The gap the probe paints between one sample's border box and its outline.
 *
 * Two points: the theme's `borderWidth.strong` is also two, so the gap and the
 * line are the same width and a frame that confuses them samples the wrong
 * band.
 */
export const RING_OFFSET = 2;

/** A control's painted box in the window, in logical points. */
export interface RingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * A point `distance` points outside the box's left edge, at the middle of the
 * edge where a rounded corner cannot bend the line.
 */
export const leftOf = (box: RingBox, distance: number): Point => ({
  x: box.x - distance,
  y: box.y + box.height / 2,
});

/**
 * The middle of the outline band: `offset` points out from the box, plus half
 * the line's width. A negative offset is a line drawn inside the box, which the
 * arithmetic follows.
 */
export const bandPoint = (box: RingBox, offset: number, width: number): Point =>
  leftOf(box, offset + width / 2);
