export const IMAGE_BOX_IDS = {
  intrinsic: "imagebox-intrinsic",
  ratio: "imagebox-ratio",
  width: "imagebox-width",
  both: "imagebox-both",
} as const;

export const IMAGE_INTRINSIC_SIZE = 8;

export const IMAGE_WIDTH = 120;

export const IMAGE_HEIGHT = 60;

export const IMAGE_RATIO = 2;

export interface ImageBoxExpectation {
  readonly id: string;
  readonly width: number;
  readonly height: number;
}

export const IMAGE_BITMAP_RATIO = IMAGE_INTRINSIC_SIZE / IMAGE_INTRINSIC_SIZE;

export const heightAtBitmapRatio = (width: number): number =>
  width / IMAGE_BITMAP_RATIO;

export const IMAGE_BOX_CASES: ReadonlyArray<ImageBoxExpectation> = [
  {
    id: IMAGE_BOX_IDS.intrinsic,
    width: IMAGE_INTRINSIC_SIZE,
    height: IMAGE_INTRINSIC_SIZE,
  },
  {
    id: IMAGE_BOX_IDS.ratio,
    width: IMAGE_WIDTH,
    height: heightAtBitmapRatio(IMAGE_WIDTH),
  },
  {
    id: IMAGE_BOX_IDS.width,
    width: IMAGE_WIDTH,
    height: heightAtBitmapRatio(IMAGE_WIDTH),
  },
  {
    id: IMAGE_BOX_IDS.both,
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  },
];
