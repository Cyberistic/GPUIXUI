import type { MotionStyle } from "@gpuix/react";
import * as Option from "effect/Option";

export interface ZoomSize {
  readonly width: number;
  readonly height: number;
}

export interface ZoomSurface {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ZoomPointer {
  readonly x: number;
  readonly y: number;
}

export interface ZoomBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface ZoomGeometry {
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly scale: number;
}

export const imageZoomFrame: ZoomSize = { width: 240, height: 160 };

export const imageZoomScale = 1.6;

export const imageZoomMaxScale = 4;

export const zoomRest = (geometry: ZoomGeometry): ZoomBox => ({
  left: 0,
  top: 0,
  width: geometry.frameWidth,
  height: geometry.frameHeight,
});

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

const finite = (value: Option.Option<number>, fallback: number): number =>
  Option.match(value, {
    onNone: () => fallback,
    onSome: (number) => (Number.isFinite(number) ? number : fallback),
  });

const between = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

const tenth = (value: number): number => {
  const rounded = Math.round(value * 10) / 10;
  return rounded === 0 ? 0 : rounded;
};

export const zoomGeometry = (input: {
  readonly width: Option.Option<number>;
  readonly height: Option.Option<number>;
  readonly scale: Option.Option<number>;
}): ZoomGeometry => ({
  frameWidth: usable(input.width, 1, imageZoomFrame.width),
  frameHeight: usable(input.height, 1, imageZoomFrame.height),
  scale: between(finite(input.scale, imageZoomScale), 1, imageZoomMaxScale),
});

const fraction = (offset: number, size: number): number =>
  size > 0 ? between(offset / size, 0, 1) : 0.5;

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

export const zoomFrames = (box: ZoomBox): MotionStyle => ({
  left: box.left,
  top: box.top,
  width: box.width,
  height: box.height,
});

export const sameZoom = (a: ZoomBox, b: ZoomBox): boolean =>
  a.left === b.left &&
  a.top === b.top &&
  a.width === b.width &&
  a.height === b.height;

export const samePointer = (a: ZoomPointer, b: ZoomPointer): boolean =>
  a.x === b.x && a.y === b.y;
