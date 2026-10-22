/**
 * Reading the box an `onLayout` event carries.
 *
 * The runtime reports an element's border box after its first paint and again
 * whenever its size changes — `x` and `y` in window coordinates, `width` and
 * `height` in pixels — on the same event channel as every other host event. This
 * is the one place that turns that payload into numbers, so a component that
 * measures itself cannot read a click as a layout or accept half a box.
 */

import type { EventPayload } from "@gpuix/react";
import * as Option from "effect/Option";

/** A border box in window coordinates, as `onLayout` reports it. */
export interface MeasuredBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The box an `onLayout` event carries, `None` for any other event or a missing side. */
export const measuredBox = (event: EventPayload): Option.Option<MeasuredBox> =>
  Option.all({
    x: Option.fromNullishOr(event.x),
    y: Option.fromNullishOr(event.y),
    width: Option.fromNullishOr(event.width),
    height: Option.fromNullishOr(event.height),
  });

/** A point in window coordinates, as a pointer event reports it. */
export interface MeasuredPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * The point a pointer event carries.
 *
 * `measuredBox` deliberately refuses this payload — a move has a position and no
 * size — so a component that reads where the pointer is takes both halves from
 * here rather than accepting half a layout as a pointer.
 */
export const measuredPoint = (
  event: EventPayload,
): Option.Option<MeasuredPoint> =>
  Option.all({
    x: Option.fromNullishOr(event.x),
    y: Option.fromNullishOr(event.y),
  });
