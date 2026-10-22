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

/** A pixel in one line, so a failed assertion prints the colour it read. */
export const describeColour = (colour: Pixels.Rgba): string =>
  `rgba(${colour.r}, ${colour.g}, ${colour.b}, ${colour.a})`;
