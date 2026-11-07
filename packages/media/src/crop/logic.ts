import { Match } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export const CropCorner = Schema.Literals(["nw", "ne", "sw", "se"]);

export type CropCorner = typeof CropCorner.Type;

export const CROP_MIN_SIZE = 24;

export const CROP_HANDLE_SIZE = 10;

export class CropRect extends Schema.Class<CropRect>("CropRect")({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
}) {
  get right(): number {
    return this.x + this.width;
  }

  get bottom(): number {
    return this.y + this.height;
  }
}

export interface CropBounds {
  readonly width: number;
  readonly height: number;
}

export const sameCrop = Schema.toEquivalence(CropRect);

export const isPrimaryPress = (button: number | null | undefined): boolean =>
  button === undefined || button === null || button === 0;

export const CROP_BAR_SIDES = ["top", "right", "bottom", "left"] as const;

export type CropBarSide = (typeof CROP_BAR_SIDES)[number];

export interface CropBar {
  readonly side: CropBarSide;
  readonly box: CropRect;
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

const delta = (value: number): number => (Number.isFinite(value) ? value : 0);

const floorOf = (bounds: CropBounds, min: number): number =>
  Math.max(
    0,
    Math.min(
      Number.isFinite(min) && min > 0 ? min : CROP_MIN_SIZE,
      Math.max(0, bounds.width),
      Math.max(0, bounds.height),
    ),
  );

const ratioOf = (ratio: number | undefined): Option.Option<number> =>
  typeof ratio === "number" && Number.isFinite(ratio) && ratio > 0
    ? Option.some(ratio)
    : Option.none();

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
  const anchor = Match.value(corner).pipe(
    Match.when("se", () => ({ x: rect.x, y: rect.y })),
    Match.when("nw", () => ({ x: rect.right, y: rect.bottom })),
    Match.when("ne", () => ({ x: rect.x, y: rect.bottom })),
    Match.when("sw", () => ({ x: rect.right, y: rect.y })),
    Match.exhaustive,
  );
  const movesLeft = corner === "nw" || corner === "sw";
  const movesTop = corner === "nw" || corner === "ne";

  const roomW = movesLeft ? anchor.x : maxW - anchor.x;
  const roomH = movesTop ? anchor.y : maxH - anchor.y;
  const cap = Math.min(roomW, roomH * ratio);
  const width = Math.max(minWidth, Math.min(wanted, cap));
  const height = width / ratio;
  return new CropRect({
    x: clamp(movesLeft ? anchor.x - width : anchor.x, 0, maxW - width),
    y: clamp(movesTop ? anchor.y - height : anchor.y, 0, maxH - height),
    width,
    height,
  });
};

export const clampCrop = (
  crop: CropRect | null | undefined,
  bounds: CropBounds,
  min: number = CROP_MIN_SIZE,
  aspectRatio?: number,
): CropRect => {
  const floor = floorOf(bounds, min);
  const held = Option.getOrElse(
    Option.fromNullishOr(crop),
    () => new CropRect({ x: 0, y: 0, width: 0, height: 0 }),
  );

  const side = (value: number): number =>
    Number.isFinite(value) ? value : floor;
  const point = (value: number): number => (Number.isFinite(value) ? value : 0);
  const width = clamp(side(held.width), floor, Math.max(0, bounds.width));
  const height = clamp(side(held.height), floor, Math.max(0, bounds.height));
  const free = new CropRect({
    x: clamp(point(held.x), 0, Math.max(0, bounds.width - width)),
    y: clamp(point(held.y), 0, Math.max(0, bounds.height - height)),
    width,
    height,
  });
  return Option.match(ratioOf(aspectRatio), {
    onNone: () => free,
    onSome: (ratio) => fitRatio(free, free, "se", bounds, min, ratio),
  });
};

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

export interface CropGuide {
  readonly name: "v1" | "v2" | "h1" | "h2";
  readonly box: CropRect;
}

export const cropGuides = (crop: CropRect): ReadonlyArray<CropGuide> => {
  const thirdW = crop.width / 3;
  const thirdH = crop.height / 3;
  const lineW = Math.min(1, Math.max(0, crop.width));
  const lineH = Math.min(1, Math.max(0, crop.height));
  const vertical = (x: number): CropRect =>
    new CropRect({
      x: Math.min(crop.x + x, crop.right - lineW),
      y: crop.y,
      width: lineW,
      height: crop.height,
    });
  const horizontal = (y: number): CropRect =>
    new CropRect({
      x: crop.x,
      y: Math.min(crop.y + y, crop.bottom - lineH),
      width: crop.width,
      height: lineH,
    });
  return [
    { name: "v1", box: vertical(thirdW) },
    { name: "v2", box: vertical(thirdW * 2) },
    { name: "h1", box: horizontal(thirdH) },
    { name: "h2", box: horizontal(thirdH * 2) },
  ];
};

export const handleBox = (
  crop: CropRect,
  corner: CropCorner,
  size: number,
  bounds?: CropBounds,
): CropRect => {
  const side = Number.isFinite(size) && size > 0 ? size : CROP_HANDLE_SIZE;
  const point = Match.value(corner).pipe(
    Match.when("nw", () => ({ x: crop.x, y: crop.y })),
    Match.when("ne", () => ({ x: crop.right, y: crop.y })),
    Match.when("sw", () => ({ x: crop.x, y: crop.bottom })),
    Match.when("se", () => ({ x: crop.right, y: crop.bottom })),
    Match.exhaustive,
  );
  const inside = (value: number, extent: number): number =>
    clamp(value, 0, Math.max(0, extent - side));
  return new CropRect({
    x:
      bounds === undefined
        ? point.x - side / 2
        : inside(point.x - side / 2, bounds.width),
    y:
      bounds === undefined
        ? point.y - side / 2
        : inside(point.y - side / 2, bounds.height),
    width: side,
    height: side,
  });
};

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

export interface CropModifiers {
  readonly shift?: boolean;
  readonly alt?: boolean;
}

export const cropKeyStep = (
  modifiers: CropModifiers | null | undefined,
): number => (modifiers?.shift === true ? 8 : 1);

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

export const cropLabel = (crop: CropRect): string =>
  `${Math.round(crop.x)}, ${Math.round(crop.y)}, ${Math.round(crop.width)} × ${Math.round(crop.height)}`;

export const cornerLabel = (corner: CropCorner): string =>
  Match.value(corner).pipe(
    Match.when("nw", () => "top left"),
    Match.when("ne", () => "top right"),
    Match.when("sw", () => "bottom left"),
    Match.when("se", () => "bottom right"),
    Match.exhaustive,
  );

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
