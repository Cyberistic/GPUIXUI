/**
 * The crop area's geometry (plan `385`).
 *
 * A crop is a rectangle in the image's **layout box** — the runtime reports
 * `getElementBounds` for the box, not the fitted bitmap, so the app owns the
 * mapping from its own natural aspect ratio. Every rule here is pure so the
 * view, the steps and the unit tests share one definition of a move, a resize
 * and the four dimming masks.
 */
import * as Number from "effect/Number";

/** The corner a resize drag owns. */
export type Corner = "nw" | "ne" | "sw" | "se";

/** A crop selection in the stage's coordinate space. */
export interface CropRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The stage's box: the crop is clamped to it. */
export interface Stage {
  readonly width: number;
  readonly height: number;
}

/** The four regions outside the crop; each may have a zero dimension. */
export interface Masks {
  readonly top: CropRect;
  readonly left: CropRect;
  readonly right: CropRect;
  readonly bottom: CropRect;
}

/** The image and mask click counters a readout prints. */
export interface CropCounts {
  readonly image: number;
  readonly blocked: number;
}

/** How the bitmap is fitted inside the box. */
export type ObjectFit = "contain" | "cover";

/** Whether the masks block the pointer or let it reach the image plane. */
export type MaskMode = "none" | "auto";

const round = (value: number): number => Number.round(value, 0);

const inside = (value: number, min: number, max: number): number =>
  Number.clamp(value, { minimum: min, maximum: Number.max(min, max) });

/**
 * 60 % of the stage, centred. On a 320 × 200 stage this is exactly
 * `{ x: 64, y: 40, width: 192, height: 120 }`.
 */
export const initialCrop = (stage: Stage): CropRect => {
  const width = round(stage.width * 0.6);
  const height = round(stage.height * 0.6);
  return {
    x: round((stage.width - width) / 2),
    y: round((stage.height - height) / 2),
    width,
    height,
  };
};

/** Moves the rect by `(dx, dy)`, clamped to the stage; never resizes. */
export const moveCrop = (
  rect: CropRect,
  stage: Stage,
  dx: number,
  dy: number,
): CropRect => ({
  x: round(inside(rect.x + dx, 0, stage.width - rect.width)),
  y: round(inside(rect.y + dy, 0, stage.height - rect.height)),
  width: rect.width,
  height: rect.height,
});

/**
 * Drags `corner` by `(dx, dy)`. The opposite corner stays fixed; the dragged
 * edges clamp to the stage and to `minSize`.
 */
export const resizeCrop = (
  rect: CropRect,
  stage: Stage,
  corner: Corner,
  dx: number,
  dy: number,
  minSize: number,
): CropRect => {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  const movesLeft = corner === "nw" || corner === "sw";
  const movesRight = corner === "ne" || corner === "se";
  const movesTop = corner === "nw" || corner === "ne";
  const movesBottom = corner === "sw" || corner === "se";

  const x = movesLeft ? round(inside(rect.x + dx, 0, right - minSize)) : rect.x;
  const y = movesTop ? round(inside(rect.y + dy, 0, bottom - minSize)) : rect.y;
  const nextRight = movesRight
    ? round(inside(right + dx, rect.x + minSize, stage.width))
    : right;
  const nextBottom = movesBottom
    ? round(inside(bottom + dy, rect.y + minSize, stage.height))
    : bottom;

  return { x, y, width: nextRight - x, height: nextBottom - y };
};

/** The four regions outside the crop: the classic four-`div` dimming mask. */
export const maskRects = (rect: CropRect, stage: Stage): Masks => ({
  top: { x: 0, y: 0, width: stage.width, height: rect.y },
  left: { x: 0, y: rect.y, width: rect.x, height: rect.height },
  right: {
    x: rect.x + rect.width,
    y: rect.y,
    width: stage.width - (rect.x + rect.width),
    height: rect.height,
  },
  bottom: {
    x: 0,
    y: rect.y + rect.height,
    width: stage.width,
    height: stage.height - (rect.y + rect.height),
  },
});

/** A mask paints only when both dimensions are positive. */
export const paints = (rect: CropRect): boolean =>
  rect.width > 0 && rect.height > 0;

/** `x=64 y=40 w=192 h=120` */
export const describeRect = (rect: CropRect): string =>
  `x=${rect.x} y=${rect.y} w=${rect.width} h=${rect.height}`;

/** `x=64 y=40 w=192 h=120 fit=contain mask=none image=0 blocked=0` */
export const describeCrop = (
  rect: CropRect,
  fit: ObjectFit,
  mask: MaskMode,
  counts: CropCounts,
): string =>
  `${describeRect(rect)} fit=${fit} mask=${mask} image=${counts.image} blocked=${counts.blocked}`;
