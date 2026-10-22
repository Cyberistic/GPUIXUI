/**
 * Reading a logical point out of a captured frame.
 *
 * A window is captured at its display's scale factor (900x520 arrives as
 * 1800x1040), so a probe converts a logical point instead of assuming a
 * monitor. The helpers live here rather than in one probe's fixture because a
 * second and third probe read a frame the same way: the backdrop, the chart and
 * the fade all sample a named point in the window.
 */
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

/** A logical point in the window. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * The capture's device scale.
 *
 * A non-integral or inconsistent ratio is `None`: a capture that is not the
 * window's box cannot be sampled at a logical point.
 */
export const captureScale = (
  frame: { readonly width: number; readonly height: number },
  size: { readonly width: number; readonly height: number },
): Option.Option<number> => {
  const horizontal = frame.width / size.width;
  const vertical = frame.height / size.height;
  return Number.isInteger(horizontal) &&
    horizontal > 0 &&
    horizontal === vertical
    ? Option.some(horizontal)
    : Option.none();
};

/** A logical point in the capture's pixels. */
export const framePoint = (point: Point, scale: number): Point => ({
  x: Math.round(point.x * scale),
  y: Math.round(point.y * scale),
});

/**
 * How far two colours may differ on one channel and still be the same paint.
 *
 * Not zero: a shadow, a border and a glyph all land on a fractional boundary
 * somewhere, and an antialiased sample is the same paint as its solid core.
 * Wider than the largest rounding a composite makes (the 2% steps the token
 * derivations take are 3–5 bytes) and narrower than the gap between two roles.
 */
export const COLOUR_TOLERANCE = 8;

/** The colour at a logical point, or `None` when it is outside the capture. */
export const colourAt = (
  frame: Pixels.Pixels,
  point: Point,
  scale: number,
): Option.Option<Pixels.Rgba> => {
  const at = framePoint(point, scale);
  return Option.fromNullishOr(Pixels.pixelAt(frame, at.x, at.y));
};

/** Whether two colours differ by more than `tolerance` on any channel. */
export const differs = (
  left: Pixels.Rgba,
  right: Pixels.Rgba,
  tolerance = COLOUR_TOLERANCE,
): boolean =>
  Math.abs(left.r - right.r) > tolerance ||
  Math.abs(left.g - right.g) > tolerance ||
  Math.abs(left.b - right.b) > tolerance;

/** How far a sample sits from a reference colour, summed over its channels. */
export const distanceFrom = (
  sample: Pixels.Rgba,
  reference: Pixels.Rgba,
): number =>
  Math.abs(sample.r - reference.r) +
  Math.abs(sample.g - reference.g) +
  Math.abs(sample.b - reference.b);

/** A pixel in one line, so a failed assertion prints the colour it read. */
export const describeColour = (colour: Pixels.Rgba): string =>
  `rgba(${colour.r}, ${colour.g}, ${colour.b}, ${colour.a})`;
