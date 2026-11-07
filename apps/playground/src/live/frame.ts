import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

export interface Point {
  readonly x: number;
  readonly y: number;
}

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

export const framePoint = (point: Point, scale: number): Point => ({
  x: Math.round(point.x * scale),
  y: Math.round(point.y * scale),
});

export const COLOUR_TOLERANCE = 8;

export const colourAt = (
  frame: Pixels.Pixels,
  point: Point,
  scale: number,
): Option.Option<Pixels.Rgba> => {
  const at = framePoint(point, scale);
  return Option.fromNullishOr(Pixels.pixelAt(frame, at.x, at.y));
};

export const differs = (
  left: Pixels.Rgba,
  right: Pixels.Rgba,
  tolerance = COLOUR_TOLERANCE,
): boolean =>
  Math.abs(left.r - right.r) > tolerance ||
  Math.abs(left.g - right.g) > tolerance ||
  Math.abs(left.b - right.b) > tolerance;

export const distanceFrom = (
  sample: Pixels.Rgba,
  reference: Pixels.Rgba,
): number =>
  Math.abs(sample.r - reference.r) +
  Math.abs(sample.g - reference.g) +
  Math.abs(sample.b - reference.b);

export const describeColour = (colour: Pixels.Rgba): string =>
  `rgba(${colour.r}, ${colour.g}, ${colour.b}, ${colour.a})`;
