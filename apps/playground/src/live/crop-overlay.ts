/**
 * The `crop-overlay` probe's fixture: a crop frame, its mask, and the drag a
 * corner handle owns.
 *
 * Tier 5's **Crop area** row rests on what a window can paint, and until this
 * probe only the *paint under* the crop was measured (`image-fit` settles
 * `objectFit`, so the bitmap inside a frame is a real crop). Three questions
 * were open, and they are the ones a crop component asks before it exists:
 *
 * 1. **Is a mask paintable?** The runtime has no `clip-path` and no mask, and
 *    `<svg source>` paints one tint, so the only honest mask is four veil bars
 *    around the hole. The probe reads each bar's own pixels out of the frame —
 *    a bar that paints under the bitmap, or not at all, cannot pass.
 * 2. **Does a bar swallow the press?** A mask covers the picture, so a bar that
 *    takes the pointer would make the picture unreachable. Every bar declares
 *    `pointerEvents: "none"`; the probe presses one and reads which layer
 *    beneath it heard the press.
 * 3. **Can a corner handle drag the hole, and does it clamp?** A press arms the
 *    pointer capture only for an element listening to `onMouseDown` *and*
 *    `onMouseMove` (`pointer-capture`), and the handle moves as the crop grows.
 *    The probe drags it to both bounds and reads the drawn hole and its bars.
 *
 * The arithmetic lives here so the view, the probe's checks, the README's table
 * and the unit test read one source. Kept native-free, as every fixture is.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";
import { blend, alphaOf, type Theme } from "@gpuixui/tokens";

/** The bitmap's size: the frame's box, so the picture is painted 1:1. */
export const CROP_IMAGE_WIDTH = 240;
export const CROP_IMAGE_HEIGHT = 160;

/** The bitmap's one colour, so a pixel inside the hole is unambiguous. */
export const CROP_IMAGE = { r: 0x34, g: 0xc7, b: 0x59 } as const;

/** The bitmap as `#rrggbb`, for a sampled pixel to be compared with. */
export const CROP_IMAGE_HEX = `#${Arr.join(
  Arr.map([CROP_IMAGE.r, CROP_IMAGE.g, CROP_IMAGE.b], (channel) =>
    channel.toString(16).padStart(2, "0"),
  ),
  "",
)}`.toUpperCase();

/** A rectangle in the frame's own coordinates. */
export interface CropRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The hole the frame opens with. */
export const CROP_OPENING: CropRect = { x: 60, y: 40, width: 100, height: 70 };

/** The smallest side a drag may leave: a hole narrower than this is a miss. */
export const CROP_MIN = 24;

/** The corner handle's side; it straddles the hole's bottom-right corner. */
export const CROP_HANDLE = 10;

/** A point the frame and the bars share, read from the fixture rather than typed. */
export const CROP_OUTSIDE_POINT = {
  x: CROP_IMAGE_WIDTH - 20,
  y: CROP_IMAGE_HEIGHT - 20,
} as const;

/** The `testId`s the view and the steps share. */
export const CROP_IDS = {
  probe: "crop-probe",
  frame: "crop-frame",
  image: "crop-image",
  handle: "crop-handle",
  readout: "crop-readout",
  bar: (side: CropBarSide): string => `crop-bar-${side}`,
} as const;

/** The four bars, in the order a mask is painted. */
export const CROP_BAR_SIDES = ["top", "right", "bottom", "left"] as const;

/** One side of the mask. */
export type CropBarSide = (typeof CROP_BAR_SIDES)[number];

/** One bar and the box it paints. */
export interface CropBar {
  readonly side: CropBarSide;
  readonly box: CropRect;
}

const sideBox = (crop: CropRect, side: CropBarSide): CropRect =>
  Match.value(side).pipe(
    Match.when("top", () => ({
      x: 0,
      y: 0,
      width: CROP_IMAGE_WIDTH,
      height: crop.y,
    })),
    Match.when("bottom", () => ({
      x: 0,
      y: crop.y + crop.height,
      width: CROP_IMAGE_WIDTH,
      height: CROP_IMAGE_HEIGHT - (crop.y + crop.height),
    })),
    Match.when("left", () => ({
      x: 0,
      y: crop.y,
      width: crop.x,
      height: crop.height,
    })),
    Match.when("right", () => ({
      x: crop.x + crop.width,
      y: crop.y,
      width: CROP_IMAGE_WIDTH - (crop.x + crop.width),
      height: crop.height,
    })),
    Match.exhaustive,
  );

/**
 * The four bars a crop paints around its hole, each with the box it covers.
 *
 * A bar with a zero side is not painted at all — a hole at the frame's edge has
 * no bar outside it — so a probe must read the list rather than a fixed four.
 */
export const cropBars = (crop: CropRect): ReadonlyArray<CropBar> =>
  Arr.filter(
    Arr.map(CROP_BAR_SIDES, (side) => ({ side, box: sideBox(crop, side) })),
    (bar) => bar.box.width > 0 && bar.box.height > 0,
  );

/** The handle's box: centred on the hole's bottom-right corner. */
export const cropHandleBox = (crop: CropRect): CropRect => ({
  x: crop.x + crop.width - CROP_HANDLE / 2,
  y: crop.y + crop.height - CROP_HANDLE / 2,
  width: CROP_HANDLE,
  height: CROP_HANDLE,
});

/** The hole's centre, where the bitmap must show through. */
export const cropCentre = (crop: CropRect): { x: number; y: number } => ({
  x: crop.x + crop.width / 2,
  y: crop.y + crop.height / 2,
});

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

/** A pointer delta a drag can use: a non-finite one moves nothing. */
const usableDelta = (delta: number): number =>
  Number.isFinite(delta) ? delta : 0;

/**
 * The hole a drag of the bottom-right handle leaves.
 *
 * The hole grows toward the frame's edges and never past them, and never
 * narrows below {@link CROP_MIN}. A bounding box constrains a crop this way;
 * the drag itself is the caller's.
 */
export const draggedCrop = (
  crop: CropRect,
  dx: number,
  dy: number,
): CropRect => ({
  x: crop.x,
  y: crop.y,
  width: clamp(
    crop.width + usableDelta(dx),
    CROP_MIN,
    CROP_IMAGE_WIDTH - crop.x,
  ),
  height: clamp(
    crop.height + usableDelta(dy),
    CROP_MIN,
    CROP_IMAGE_HEIGHT - crop.y,
  ),
});

/** The mask's colour as the theme paints it: the veil role. */
export const cropMaskColour = (theme: Theme): string => theme.colors.overlay;

/** The handle's colour, a role the mask cannot hide. */
export const cropHandleColour = (theme: Theme): string =>
  theme.colors.destructive;

/**
 * The colour the mask leaves in the frame.
 *
 * The bars are translucent, so the pixel a reader sees is the veil composited
 * over the bitmap — the same derivation the find wash uses. A bar painted
 * beneath the picture would leave {@link CROP_IMAGE_HEX} there instead.
 */
export const cropMaskPaint = (theme: Theme): string => {
  const veil = cropMaskColour(theme);
  return blend(CROP_IMAGE_HEX, veil, alphaOf(veil));
};

/** What the probe's readout prints, so every check reads one line. */
export interface CropState {
  readonly crop: CropRect;
  /** Moves the handle heard while it was pressed. */
  readonly moves: number;
  /** Presses the frame itself heard. */
  readonly framePresses: number;
  /** Presses the bitmap heard. */
  readonly imagePresses: number;
}

/** The `key=value` line the checks read the crop's state from. */
export const cropReadout = (state: CropState): string =>
  `${cropPrefix(state.crop)} moves=${state.moves} ` +
  `frame=${state.framePresses} image=${state.imagePresses}`;

/** The hole alone, for a check that holds the geometry but not the counters. */
export const cropPrefix = (crop: CropRect): string =>
  `crop=${crop.x},${crop.y},${crop.width},${crop.height}`;

/** The checks the probe asserts, so its documentation cannot drift. */
export const CROP_CHECKS = 37;

/** A logical box, as `Smoke.Bounds` reports one. */
export interface CropBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Whether a reported box is the one the fixture paints, within a pixel. */
export const sameBox = (measured: CropBox, wanted: CropBox): boolean =>
  Math.abs(measured.x - wanted.x) <= 1 &&
  Math.abs(measured.y - wanted.y) <= 1 &&
  Math.abs(measured.width - wanted.width) <= 1 &&
  Math.abs(measured.height - wanted.height) <= 1;

/**
 * The bitmap as straight RGBA: one solid run, so a hole's pixel cannot be an
 * antialiased edge of a band.
 */
export const cropPixels = (): Uint8Array =>
  Uint8Array.from(
    Arr.flatten(
      Arr.makeBy(CROP_IMAGE_WIDTH * CROP_IMAGE_HEIGHT, () => [
        CROP_IMAGE.r,
        CROP_IMAGE.g,
        CROP_IMAGE.b,
        0xff,
      ]),
    ),
  );
