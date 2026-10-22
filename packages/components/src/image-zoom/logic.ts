/**
 * How an image zoom's frame, magnification and pan are computed.
 *
 * The runtime has no `transform` (upstream issue #102), so a zoom is not a
 * scaled layer: the image host is given a box and **scales its own buffer to
 * that box** (measured by the `chart-raster` probe), so growing `width` and
 * `height` magnifies the picture and moving `left`/`top` pans it. The frame
 * clips the result, so the reader sees a magnified window over the frame
 * rather than an oversized child spilling onto the page.
 *
 * Every value here is arithmetic over two boxes and a pointer, so the rules a
 * reader feels — the frame never moves, the picture under the pointer stays
 * under the pointer, an edge of the picture never leaves the frame — are
 * checked without a window.
 */

import type { MotionStyle } from "@gpuix/react";
import * as Option from "effect/Option";

/** A frame's size in pixels. */
export interface ZoomSize {
  readonly width: number;
  readonly height: number;
}

/** The frame's box in window coordinates, as `onLayout` reports it. */
export interface ZoomSurface {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A point in window coordinates, as a pointer event reports it. */
export interface ZoomPointer {
  readonly x: number;
  readonly y: number;
}

/** The box the image paints: its offset and its magnified size. */
export interface ZoomBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** The frame and magnification the zoom paints, with unusable values resolved. */
export interface ZoomGeometry {
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly scale: number;
}

/** The frame a caller gets when it names none: 240 × 160. */
export const imageZoomFrame: ZoomSize = { width: 240, height: 160 };

/** The default magnification. */
export const imageZoomScale = 1.6;

/** The furthest the picture is magnified: a 4× budget keeps the pan readable. */
export const imageZoomMaxScale = 4;

/** The box at rest: the picture covers the frame exactly, with no offset. */
export const zoomRest = (geometry: ZoomGeometry): ZoomBox => ({
  left: 0,
  top: 0,
  width: geometry.frameWidth,
  height: geometry.frameHeight,
});

/** The number `value` carries when it is at or above `low`, else `fallback`. */
const usable = (
  value: Option.Option<number>,
  low: number,
  fallback: number,
): number =>
  Option.match(value, {
    onNone: () => fallback,
    onSome: (number) =>
      Number.isFinite(number) && number >= low ? number : fallback,
  });

/** The number `value` carries when it is finite, else `fallback`. */
const finite = (value: Option.Option<number>, fallback: number): number =>
  Option.match(value, {
    onNone: () => fallback,
    onSome: (number) => (Number.isFinite(number) ? number : fallback),
  });

/** `value` held between `low` and `high`. */
const between = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

/** A length as a tenth of a pixel: the runtime paints no finer, and rounding keeps a held pointer still. */
const tenth = (value: number): number => {
  const rounded = Math.round(value * 10) / 10;
  return rounded === 0 ? 0 : rounded;
};

/**
 * A frame and magnification, with unusable values replaced.
 *
 * Each field is the prop's `Option`, so an absent prop and an unusable number
 * share one fallback. `width` and `height` below one pixel fall back to the house
 * frame rather than clipping the picture to nothing, and `scale` is held to
 * `1…4`: below one would shrink the picture away from its frame, so it becomes no
 * magnification at all, and a very large factor turns the pan into a hunt for
 * what moved. A `NaN` or an infinity falls back to {@link imageZoomScale}.
 */
export const zoomGeometry = (input: {
  readonly width: Option.Option<number>;
  readonly height: Option.Option<number>;
  readonly scale: Option.Option<number>;
}): ZoomGeometry => ({
  frameWidth: usable(input.width, 1, imageZoomFrame.width),
  frameHeight: usable(input.height, 1, imageZoomFrame.height),
  scale: between(finite(input.scale, imageZoomScale), 1, imageZoomMaxScale),
});

/** Where inside the frame the pointer is, as a share of each axis (`0…1`). */
const fraction = (offset: number, size: number): number =>
  size > 0 ? between(offset / size, 0, 1) : 0.5;

/**
 * The box a pointer over `frame` paints.
 *
 * The pointer's share of the frame is the share of the magnified picture that
 * stays under it, so the spot a reader points at does not drift while the
 * picture grows. The picture always covers the frame — a pointer on an edge pins
 * that edge of the picture to the frame's edge rather than revealing the page
 * behind it — and a point outside the frame is clamped to the nearest edge, so a
 * move the frame reports after the pointer has left cannot pan past the picture.
 */
export const zoomFollow = (
  geometry: ZoomGeometry,
  frame: ZoomSurface,
  pointer: ZoomPointer,
): ZoomBox => {
  const across = fraction(pointer.x - frame.x, frame.width);
  const down = fraction(pointer.y - frame.y, frame.height);
  const width = tenth(geometry.frameWidth * geometry.scale);
  const height = tenth(geometry.frameHeight * geometry.scale);

  return {
    left: tenth(-across * (width - geometry.frameWidth)),
    top: tenth(-down * (height - geometry.frameHeight)),
    width,
    height,
  };
};

/** The geometry a runtime `motion` target paints for one box. */
export const zoomFrames = (box: ZoomBox): MotionStyle => ({
  left: box.left,
  top: box.top,
  width: box.width,
  height: box.height,
});

/** Whether two boxes paint the same picture, so a repeated move re-renders nothing. */
export const sameZoom = (a: ZoomBox, b: ZoomBox): boolean =>
  a.left === b.left &&
  a.top === b.top &&
  a.width === b.width &&
  a.height === b.height;
