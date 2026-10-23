/**
 * The crop area's arithmetic: the hole, the mask it leaves, the handle that
 * drags it, the bounds every edge keeps and the ratio a resize preserves.
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

/** A corner handle's default side in points. */
export const CROP_HANDLE_SIZE = 10;

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

/**
 * Whether two rectangles paint the same hole.
 *
 * A gesture reports through `onChange`, and a drag held past the frame's edge
 * asks for the rectangle already on screen once per delivered move. Comparing
 * here is what lets a component stay silent when there is nothing to change.
 */
export const sameCrop = Schema.toEquivalence(CropRect);

/**
 * Whether a pointer payload names the primary press a gesture may begin on.
 *
 * The runtime reports which button went down (0 is the primary one). A
 * secondary press on the picture is the reader asking for a context menu, not
 * a drag: beginning a gesture on it would move or resize the hole, and a
 * release delivered outside the frame would leave that gesture armed for the
 * next plain hover. A payload that names no button is a primary press — the
 * only one a gesture begins on.
 */
export const isPrimaryPress = (button: number | null | undefined): boolean =>
  button === undefined || button === null || button === 0;

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

/**
 * The minimum side a frame can actually offer. A minimum that cannot be laid
 * out (a stored preference: not finite, or not positive) reads as the default,
 * so it cannot poison every side the clamp multiplies it into or let a hole
 * shrink until no corner is left to grab.
 */
const floorOf = (bounds: CropBounds, min: number): number =>
  Math.max(
    0,
    Math.min(
      Number.isFinite(min) && min > 0 ? min : CROP_MIN_SIZE,
      Math.max(0, bounds.width),
      Math.max(0, bounds.height),
    ),
  );

/** A caller's ratio (width / height), when it names a shape a crop can keep. */
const ratioOf = (ratio: number | undefined): Option.Option<number> =>
  typeof ratio === "number" && Number.isFinite(ratio) && ratio > 0
    ? Option.some(ratio)
    : Option.none();

/**
 * A rectangle reshaped to `ratio` around the corner that stays put.
 *
 * The moving corner's larger movement drives the width, so a vertical drag
 * resizes a locked square as surely as a horizontal one. A frame that cannot
 * hold a minimum-sized hole at the ratio leaves the rectangle free rather than
 * painting a hole too thin to grab.
 */
const fitRatio = (
  rect: CropRect,
  start: CropRect,
  corner: CropCorner,
  bounds: CropBounds,
  min: number,
  ratio: number,
): CropRect => {
  const maxW = Math.max(0, bounds.width);
  const maxH = Math.max(0, bounds.height);
  const floor = floorOf(bounds, min);
  const minWidth = Math.max(floor, floor * ratio);
  const minHeight = minWidth / ratio;
  if (minWidth > maxW || minHeight > maxH) {
    return rect;
  }
  const across = rect.width - start.width;
  const down = (rect.height - start.height) * ratio;
  const wanted =
    start.width + (Math.abs(across) >= Math.abs(down) ? across : down);
  let width = Math.max(minWidth, wanted);
  let height = width / ratio;
  if (height > maxH) {
    height = maxH;
    width = height * ratio;
  }
  if (width > maxW) {
    width = maxW;
    height = width / ratio;
  }
  const anchor = Match.value(corner).pipe(
    Match.when("se", () => ({ x: rect.x, y: rect.y })),
    Match.when("nw", () => ({ x: rect.right, y: rect.bottom })),
    Match.when("ne", () => ({ x: rect.x, y: rect.bottom })),
    Match.when("sw", () => ({ x: rect.right, y: rect.y })),
    Match.exhaustive,
  );
  const movesLeft = corner === "nw" || corner === "sw";
  const movesTop = corner === "nw" || corner === "ne";
  return new CropRect({
    x: clamp(movesLeft ? anchor.x - width : anchor.x, 0, maxW - width),
    y: clamp(movesTop ? anchor.y - height : anchor.y, 0, maxH - height),
    width,
    height,
  });
};

/**
 * The crop a frame can hold: inside the bounds, at least the minimum side and,
 * when the caller names one, on its aspect ratio.
 *
 * A crop restored from storage may name a rectangle the frame it is shown in
 * cannot hold, so a component clamps before it paints rather than drawing a
 * hole outside the picture. A ratio that cannot be read leaves the rectangle
 * free, the same rule the other stored values follow.
 */
export const clampCrop = (
  crop: CropRect,
  bounds: CropBounds,
  min: number = CROP_MIN_SIZE,
  aspectRatio?: number,
): CropRect => {
  const floor = floorOf(bounds, min);
  // A restored rectangle may carry a field that cannot be laid out (a ratio
  // over a frame that never arrived). A coordinate reads from the origin and a
  // side from the floor, so the hole is still painted and still grabbable.
  const side = (value: number): number =>
    Number.isFinite(value) ? value : floor;
  const point = (value: number): number => (Number.isFinite(value) ? value : 0);
  const width = clamp(side(crop.width), floor, Math.max(0, bounds.width));
  const height = clamp(side(crop.height), floor, Math.max(0, bounds.height));
  const free = new CropRect({
    x: clamp(point(crop.x), 0, Math.max(0, bounds.width - width)),
    y: clamp(point(crop.y), 0, Math.max(0, bounds.height - height)),
    width,
    height,
  });
  return Option.match(ratioOf(aspectRatio), {
    onNone: () => free,
    onSome: (ratio) => fitRatio(free, free, "se", bounds, min, ratio),
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

/** One rule-of-thirds guide inside the hole. */
export interface CropGuide {
  /** `v1`/`v2` are the vertical thirds; `h1`/`h2` the horizontal ones. */
  readonly name: "v1" | "v2" | "h1" | "h2";
  readonly box: CropRect;
}

/**
 * The four rule-of-thirds guides inside a hole.
 *
 * They are thin boxes inside the crop, not lines the runtime draws: the mask's
 * bars sit around the hole, and a guide is the same absolute box one point wide.
 */
export const cropGuides = (crop: CropRect): ReadonlyArray<CropGuide> => {
  const thirdW = crop.width / 3;
  const thirdH = crop.height / 3;
  return [
    {
      name: "v1",
      box: new CropRect({
        x: crop.x + thirdW,
        y: crop.y,
        width: 1,
        height: crop.height,
      }),
    },
    {
      name: "v2",
      box: new CropRect({
        x: crop.x + thirdW * 2,
        y: crop.y,
        width: 1,
        height: crop.height,
      }),
    },
    {
      name: "h1",
      box: new CropRect({
        x: crop.x,
        y: crop.y + thirdH,
        width: crop.width,
        height: 1,
      }),
    },
    {
      name: "h2",
      box: new CropRect({
        x: crop.x,
        y: crop.y + thirdH * 2,
        width: crop.width,
        height: 1,
      }),
    },
  ];
};

/**
 * A corner handle's box, centred on the crop's corner. A side that cannot be
 * laid out (not finite, or not positive) reads as {@link CROP_HANDLE_SIZE}, so
 * a stored preference never paints a one-point box no pointer can grab.
 */
export const handleBox = (
  crop: CropRect,
  corner: CropCorner,
  size: number,
): CropRect => {
  const side = Number.isFinite(size) && size > 0 ? size : CROP_HANDLE_SIZE;
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
  aspectRatio?: number,
): CropRect => {
  const held = clampCrop(crop, bounds, min, aspectRatio);
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
  const free = new CropRect({
    x: left,
    y: top,
    width: Math.max(floor, right - left),
    height: Math.max(floor, bottom - top),
  });
  return Option.match(ratioOf(aspectRatio), {
    onNone: () => free,
    onSome: (ratio) => fitRatio(free, held, corner, bounds, min, ratio),
  });
};

/**
 * A crop translated by dragging the picture inside the frame.
 *
 * A move translates the hole and never reshapes it, so the caller's minimum
 * travels with it: a hole `minSize` allowed below the default stays the size it
 * was, on the pointer path and the keyboard path alike.
 */
export const moveCrop = (
  crop: CropRect,
  dx: number,
  dy: number,
  bounds: CropBounds,
  min: number = CROP_MIN_SIZE,
): CropRect => {
  const held = clampCrop(crop, bounds, min);
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
  aspectRatio?: number,
): Option.Option<CropRect> => {
  const move = keyDelta(key, Math.abs(step));
  return Option.map(move, (delta) =>
    resizeCrop(crop, corner, delta.dx, delta.dy, bounds, min, aspectRatio),
  );
};

/**
 * A crop moved from the keyboard; `None` for a key that is not an arrow.
 *
 * A move keeps the hole's shape, so the ratio a resize would keep is held here
 * too; the step reads a negative value as its magnitude like the resize path.
 * The caller's minimum travels with it: a hole the caller allowed to be smaller
 * than the default must not grow on a move.
 */
export const keyboardMove = (
  crop: CropRect,
  key: string,
  step: number,
  bounds: CropBounds,
  min: number = CROP_MIN_SIZE,
): Option.Option<CropRect> =>
  Option.map(keyDelta(key, Math.abs(step)), (delta) =>
    moveCrop(crop, delta.dx, delta.dy, bounds, min),
  );

/** The modifiers a handle's key payload may carry. */
export interface CropModifiers {
  readonly shift?: boolean;
  readonly alt?: boolean;
}

/** The step an arrow takes: 1 point, or 8 while Shift is held. */
export const cropKeyStep = (
  modifiers: CropModifiers | null | undefined,
): number => (modifiers?.shift === true ? 8 : 1);

/**
 * The crop a focused handle's key asks for.
 *
 * A plain arrow resizes the handle's corner; an arrow with **Alt** moves the
 * whole hole, so a reader who cannot drag can also place the crop, not only
 * size it. `None` for a key that is not an arrow.
 */
export const cropKey = (
  crop: CropRect,
  corner: CropCorner,
  key: string,
  modifiers: CropModifiers | null | undefined,
  bounds: CropBounds,
  min: number = CROP_MIN_SIZE,
  aspectRatio?: number,
): Option.Option<CropRect> =>
  modifiers?.alt === true
    ? keyboardMove(crop, key, cropKeyStep(modifiers), bounds, min)
    : keyboardCrop(
        crop,
        corner,
        key,
        cropKeyStep(modifiers),
        bounds,
        min,
        aspectRatio,
      );

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
  aspectRatio?: number,
): CropRect =>
  gesture.kind === "move"
    ? moveCrop(gesture.start, at.x - gesture.x, at.y - gesture.y, bounds, min)
    : resizeCrop(
        gesture.start,
        gesture.corner,
        at.x - gesture.x,
        at.y - gesture.y,
        bounds,
        min,
        aspectRatio,
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

/**
 * The resize cursor a corner points along.
 *
 * A double arrow names the diagonal a corner drags on, so the two corners on
 * one diagonal share it: `nw`/`se` drag the top-left-to-bottom-right axis and
 * `ne`/`sw` the other. One cursor for all four points across the wrong diagonal
 * on half of them.
 */
export const cornerCursor = (
  corner: CropCorner,
): "nwse-resize" | "nesw-resize" =>
  Match.value(corner).pipe(
    Match.when("nw", () => "nwse-resize" as const),
    Match.when("se", () => "nwse-resize" as const),
    Match.when("ne", () => "nesw-resize" as const),
    Match.when("sw", () => "nesw-resize" as const),
    Match.exhaustive,
  );
