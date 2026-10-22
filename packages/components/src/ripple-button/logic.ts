/**
 * Where a press starts a ripple, how far it reaches, and the circle it paints.
 *
 * The runtime has no `transform` (upstream issue #102), so a ripple is not a
 * scaled layer: it is a box whose `width`, `height`, `left`, `top` and
 * `borderRadius` grow together from the press point until the circle covers the
 * control. The arithmetic lives here, away from the renderer, so a corner press
 * and a keyboard activation are checked without a window.
 */

import type { EventPayload, MotionStyle } from "@gpuix/react";
import * as Option from "effect/Option";

/** A control's box in window coordinates, as `onLayout` reports it. */
export interface RippleBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A press point in the control's own coordinates. */
export interface RipplePoint {
  readonly x: number;
  readonly y: number;
}

/** The two frames a ripple runs between. */
export interface RippleFrames {
  readonly initial: MotionStyle;
  readonly animate: MotionStyle;
}

/** The share of the label's ink a newborn ripple carries before it fades. */
export const rippleOpacity = 0.28;

/**
 * The box an `onLayout` event carries, `None` for any other event or one
 * missing a side.
 */
export const measuredRippleBox = (
  event: EventPayload,
): Option.Option<RippleBox> =>
  Option.all({
    x: Option.fromNullishOr(event.x),
    y: Option.fromNullishOr(event.y),
    width: Option.fromNullishOr(event.width),
    height: Option.fromNullishOr(event.height),
  });

/**
 * Where a press starts the ripple.
 *
 * A pointer press reports its window position, re-expressed inside the control.
 * A keyboard activation reports none, so it ripples from the centre — the only
 * point that belongs to no pointer.
 */
export const ripplePoint = (event: EventPayload, box: RippleBox): RipplePoint =>
  Option.all({
    x: Option.fromNullishOr(event.x),
    y: Option.fromNullishOr(event.y),
  }).pipe(
    Option.map((point) => ({ x: point.x - box.x, y: point.y - box.y })),
    Option.getOrElse(() => ({ x: box.width / 2, y: box.height / 2 })),
  );

/**
 * The radius that reaches the farthest corner: a circle born at the press point
 * covers the whole control, so even a press in one corner fills it.
 */
export const rippleReach = (point: RipplePoint, box: RippleBox): number =>
  Math.ceil(
    Math.max(
      Math.hypot(point.x, point.y),
      Math.hypot(point.x - box.width, point.y),
      Math.hypot(point.x, point.y - box.height),
      Math.hypot(point.x - box.width, point.y - box.height),
    ),
  );

/**
 * The circle's two frames: nothing at the press point, then a full-grown disc
 * faded out. Both frames keep the disc centred on the point, so the box's left
 * and top move as the radius does.
 */
export const rippleFrames = (
  point: RipplePoint,
  reach: number,
): RippleFrames => ({
  initial: {
    width: 0,
    height: 0,
    left: point.x,
    top: point.y,
    borderRadius: 0,
    opacity: rippleOpacity,
  },
  animate: {
    width: reach * 2,
    height: reach * 2,
    left: point.x - reach,
    top: point.y - reach,
    borderRadius: reach,
    opacity: 0,
  },
});
