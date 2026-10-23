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

/**
 * A payload number the runtime can paint.
 *
 * `onLayout`/pointer payloads are external input: a field that is not a finite
 * number is decoded as the absence it is, the same rule the motion samplers keep,
 * because `NaN` and an infinity reach an inset as a value the runtime draws as
 * nothing. A half a box is no box, and half a point is no point.
 */
const measurable = (value: number | undefined): Option.Option<number> =>
  Option.filter(Option.fromNullishOr(value), Number.isFinite);

/** The box an `onLayout` event carries, `None` for any other event, a missing side or one it cannot paint. */
export const measuredBox = (event: EventPayload): Option.Option<MeasuredBox> =>
  Option.all({
    x: measurable(event.x),
    y: measurable(event.y),
    width: measurable(event.width),
    height: measurable(event.height),
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
 * here rather than accepting half a layout as a pointer. An axis the payload
 * cannot locate is `None`, for the reason {@link measurable} gives.
 */
export const measuredPoint = (
  event: EventPayload,
): Option.Option<MeasuredPoint> =>
  Option.all({
    x: measurable(event.x),
    y: measurable(event.y),
  });
