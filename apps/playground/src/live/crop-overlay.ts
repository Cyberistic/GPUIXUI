import { Match } from "effect";
import * as Arr from "effect/Array";
import { blend, alphaOf, type Theme } from "@gpuixui/tokens";

export const CROP_IMAGE_WIDTH = 240;
export const CROP_IMAGE_HEIGHT = 160;

export const CROP_IMAGE = { r: 0x34, g: 0xc7, b: 0x59 } as const;

export const CROP_IMAGE_HEX = `#${Arr.join(
  Arr.map([CROP_IMAGE.r, CROP_IMAGE.g, CROP_IMAGE.b], (channel) =>
    channel.toString(16).padStart(2, "0"),
  ),
  "",
)}`.toUpperCase();

export interface CropRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const CROP_OPENING: CropRect = { x: 60, y: 40, width: 100, height: 70 };

export const CROP_MIN = 24;

export const CROP_HANDLE = 10;

export const CROP_OUTSIDE_POINT = {
  x: CROP_IMAGE_WIDTH - 20,
  y: CROP_IMAGE_HEIGHT - 20,
} as const;

export const CROP_IDS = {
  probe: "crop-probe",
  frame: "crop-frame",
  image: "crop-image",
  handle: "crop-handle",
  readout: "crop-readout",
  bar: (side: CropBarSide): string => `crop-bar-${side}`,
} as const;

export const CROP_BAR_SIDES = ["top", "right", "bottom", "left"] as const;

export type CropBarSide = (typeof CROP_BAR_SIDES)[number];

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

export const cropBars = (crop: CropRect): ReadonlyArray<CropBar> =>
  Arr.filter(
    Arr.map(CROP_BAR_SIDES, (side) => ({ side, box: sideBox(crop, side) })),
    (bar) => bar.box.width > 0 && bar.box.height > 0,
  );

export const cropHandleBox = (crop: CropRect): CropRect => ({
  x: crop.x + crop.width - CROP_HANDLE / 2,
  y: crop.y + crop.height - CROP_HANDLE / 2,
  width: CROP_HANDLE,
  height: CROP_HANDLE,
});

export const cropCentre = (crop: CropRect): { x: number; y: number } => ({
  x: crop.x + crop.width / 2,
  y: crop.y + crop.height / 2,
});

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

const usableDelta = (delta: number): number =>
  Number.isFinite(delta) ? delta : 0;

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

export const cropMaskColour = (theme: Theme): string => theme.colors.overlay;

export const cropHandleColour = (theme: Theme): string =>
  theme.colors.destructive;

export const cropMaskPaint = (theme: Theme): string => {
  const veil = cropMaskColour(theme);
  return blend(CROP_IMAGE_HEX, veil, alphaOf(veil));
};

export interface CropState {
  readonly crop: CropRect;

  readonly moves: number;

  readonly framePresses: number;

  readonly imagePresses: number;
}

export const cropReadout = (state: CropState): string =>
  `${cropPrefix(state.crop)} moves=${state.moves} ` +
  `frame=${state.framePresses} image=${state.imagePresses}`;

export const cropPrefix = (crop: CropRect): string =>
  `crop=${crop.x},${crop.y},${crop.width},${crop.height}`;

export const CROP_CHECKS = 37;

export interface CropBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const sameBox = (measured: CropBox, wanted: CropBox): boolean =>
  Math.abs(measured.x - wanted.x) <= 1 &&
  Math.abs(measured.y - wanted.y) <= 1 &&
  Math.abs(measured.width - wanted.width) <= 1 &&
  Math.abs(measured.height - wanted.height) <= 1;

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
