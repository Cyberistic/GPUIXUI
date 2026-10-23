/**
 * The crop area's arithmetic: the hole, the mask it leaves, the handle that
 * drags it and the bounds every edge keeps.
 *
 * A crop is one rectangle in the frame's own points. The runtime has no mask
 * and no clip path, so the mask is four positioned bars around the hole — the
 * shape the playground's `crop-overlay` probe measured in a window. This module
 * keeps the geometry out of the component so a drag, a keyboard step and the
 * painted veil all read one rule.
 */

import { Match } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/** The four corners a crop can be resized from. */
export const CropCorner = Schema.Literals(["nw", "ne", "sw", "se"]);
/** The four corners a crop can be resized from. */
export type CropCorner = typeof CropCorner.Type;

/** The smallest side a crop may keep; a smaller hole cannot be grabbed. */
export const CROP_MIN_SIZE = 24;

/** A rectangle in the frame's points. */
export class CropRect extends Schema.Class<CropRect>("CropRect")({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
}) {
  /** The rectangle's right edge. */
  get right(): number {
    return this.x + this.width;
  }

  /** The rectangle's bottom edge. */
  get bottom(): number {
    return this.y + this.height;
  }
}

/** The frame a crop lives in. */
export interface CropBounds {
  readonly width: number;
  readonly height: number;
}

/** One side of the mask. */
export const CROP_BAR_SIDES = ["top", "right", "bottom", "left"] as const;
/** One side of the mask. */
export type CropBarSide = (typeof CROP_BAR_SIDES)[number];

/** A mask bar and its box. */
export interface CropBar {
  readonly side: CropBarSide;
  readonly box: CropRect;
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

/** A coordinate a pointer or key can move by; a non-finite one moves nothing. */
const delta = (value: number): number => (Number.isFinite(value) ? value : 0);

/** The minimum side a frame can actually offer. */
const floorOf = (bounds: CropBounds, min: number): number =>
  Math.max(
    0,
    Math.min(min, Math.max(0, bounds.width), Math.max(0, bounds.height)),
  );

/**
 * The crop a frame can hold: inside the bounds and at least the minimum side.
 *
 * A crop restored from storage may name a rectangle the frame it is shown in
 * cannot hold, so a component clamps before it paints rather than drawing a
 * hole outside the picture.
 */
export const clampCrop = (
  crop: CropRect,
  bounds: CropBounds,
  min: number = CROP_MIN_SIZE,
): CropRect => {
  const floor = floorOf(bounds, min);
  const width = clamp(crop.width, floor, Math.max(0, bounds.width));
  const height = clamp(crop.height, floor, Math.max(0, bounds.height));
  return new CropRect({
    x: clamp(crop.x, 0, Math.max(0, bounds.width - width)),
    y: clamp(crop.y, 0, Math.max(0, bounds.height - height)),
    width,
    height,
  });
};

/** The four bars a crop paints around its hole; a zero-side bar is dropped. */
export const cropBars = (
  crop: CropRect,
  bounds: CropBounds,
): ReadonlyArray<CropBar> => {
  const boxOf = (side: CropBarSide): CropRect =>
    Match.value(side).pipe(
      Match.when(
        "top",
        () => new CropRect({ x: 0, y: 0, width: bounds.width, height: crop.y }),
      ),
      Match.when(
        "bottom",
        () =>
          new CropRect({
            x: 0,
            y: crop.bottom,
            width: bounds.width,
            height: Math.max(0, bounds.height - crop.bottom),
          }),
      ),
      Match.when(
        "left",
        () =>
          new CropRect({ x: 0, y: crop.y, width: crop.x, height: crop.height }),
      ),
      Match.when(
        "right",
        () =>
          new CropRect({
            x: crop.right,
            y: crop.y,
            width: Math.max(0, bounds.width - crop.right),
            height: crop.height,
          }),
      ),
      Match.exhaustive,
    );
  const bars = CROP_BAR_SIDES.map((side) => ({ side, box: boxOf(side) }));
  return bars.filter(({ box }) => box.width > 0 && box.height > 0);
};

/** A corner handle's box, centred on the crop's corner. */
export const handleBox = (
  crop: CropRect,
  corner: CropCorner,
  size: number,
): CropRect => {
  const side = Math.max(1, size);
  const point = Match.value(corner).pipe(
    Match.when("nw", () => ({ x: crop.x, y: crop.y })),
    Match.when("ne", () => ({ x: crop.right, y: crop.y })),
    Match.when("sw", () => ({ x: crop.x, y: crop.bottom })),
    Match.when("se", () => ({ x: crop.right, y: crop.bottom })),
    Match.exhaustive,
  );
  return new CropRect({
    x: point.x - side / 2,
    y: point.y - side / 2,
    width: side,
    height: side,
  });
};

/** A crop resized by dragging one corner. */
export const resizeCrop = (
  crop: CropRect,
  corner: CropCorner,
  dx: number,
  dy: number,
  bounds: CropBounds,
  min: number = CROP_MIN_SIZE,
): CropRect => {
  const held = clampCrop(crop, bounds, min);
  const floor = floorOf(bounds, min);
  const movesLeft = corner === "nw" || corner === "sw";
  const movesTop = corner === "nw" || corner === "ne";
  const left = movesLeft
    ? clamp(held.x + delta(dx), 0, Math.max(0, held.right - floor))
    : held.x;
  const right = movesLeft
    ? held.right
    : clamp(held.right + delta(dx), held.x + floor, Math.max(0, bounds.width));
  const top = movesTop
    ? clamp(held.y + delta(dy), 0, Math.max(0, held.bottom - floor))
    : held.y;
  const bottom = movesTop
    ? held.bottom
    : clamp(
        held.bottom + delta(dy),
        held.y + floor,
        Math.max(0, bounds.height),
      );
  return new CropRect({
    x: left,
    y: top,
    width: Math.max(floor, right - left),
    height: Math.max(floor, bottom - top),
  });
};

/** A crop translated by dragging the picture inside the frame. */
export const moveCrop = (
  crop: CropRect,
  dx: number,
  dy: number,
  bounds: CropBounds,
): CropRect => {
  const held = clampCrop(crop, bounds);
  return new CropRect({
    x: clamp(held.x + delta(dx), 0, Math.max(0, bounds.width - held.width)),
    y: clamp(held.y + delta(dy), 0, Math.max(0, bounds.height - held.height)),
    width: held.width,
    height: held.height,
  });
};

/** The arrow key's delta along each axis. */
const keyDelta = (
  key: string,
  step: number,
): Option.Option<{ readonly dx: number; readonly dy: number }> =>
  Match.value(key).pipe(
    Match.when("left", () => Option.some({ dx: -step, dy: 0 })),
    Match.when("right", () => Option.some({ dx: step, dy: 0 })),
    Match.when("up", () => Option.some({ dx: 0, dy: -step })),
    Match.when("down", () => Option.some({ dx: 0, dy: step })),
    Match.orElse(() => Option.none()),
  );

/**
 * A crop resized from the keyboard; `None` for a key that is not an arrow.
 *
 * A negative step is read as its magnitude so a caller that forwards a computed
 * value cannot invert the arrow the reader pressed.
 */
export const keyboardCrop = (
  crop: CropRect,
  corner: CropCorner,
  key: string,
  step: number,
  bounds: CropBounds,
  min: number = CROP_MIN_SIZE,
): Option.Option<CropRect> => {
  const move = keyDelta(key, Math.abs(step));
  return Option.map(move, (delta) =>
    resizeCrop(crop, corner, delta.dx, delta.dy, bounds, min),
  );
};

/** A gesture in progress: what was pressed, where, and the crop it began on. */
export type CropGesture =
  | {
      readonly kind: "move";
      readonly start: CropRect;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly kind: "corner";
      readonly corner: CropCorner;
      readonly start: CropRect;
      readonly x: number;
      readonly y: number;
    };

/** The crop a gesture leaves when the pointer is at `at`. */
export const gestureCrop = (
  gesture: CropGesture,
  at: { readonly x: number; readonly y: number },
  bounds: CropBounds,
  min: number = CROP_MIN_SIZE,
): CropRect =>
  gesture.kind === "move"
    ? moveCrop(gesture.start, at.x - gesture.x, at.y - gesture.y, bounds)
    : resizeCrop(
        gesture.start,
        gesture.corner,
        at.x - gesture.x,
        at.y - gesture.y,
        bounds,
        min,
      );

/** A crop's bounds as the sentence a reader hears on its handle. */
export const cropLabel = (crop: CropRect): string =>
  `${Math.round(crop.x)}, ${Math.round(crop.y)}, ${Math.round(crop.width)} × ${Math.round(crop.height)}`;

/** The corner as the words a reader hears. */
export const cornerLabel = (corner: CropCorner): string =>
  Match.value(corner).pipe(
    Match.when("nw", () => "top left"),
    Match.when("ne", () => "top right"),
    Match.when("sw", () => "bottom left"),
    Match.when("se", () => "bottom right"),
    Match.exhaustive,
  );
