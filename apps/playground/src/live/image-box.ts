/**
 * The box an `<img>` paints, and what a style asks it to paint.
 *
 * An image preview is the one surface whose intrinsic ratio the runtime owns:
 * `@gpuix/native`'s `<img>` hands GPUI the decoded bitmap, and GPUI fills the
 * element's `aspect_ratio` from it once it loads — while this library's
 * `Box`/`aspectRatio` contract says a declared ratio owns the open axis. The two
 * meet on a thumbnail, a preview card or a crop area, and a window is the only
 * place to see which one wins: the layout report names the box that painted.
 *
 * The fixture uses the 8×8 data-URL PNG `content.ts` carries (its bytes are
 * held by `content.test.ts`), so the intrinsic ratio is exactly 1 and every
 * expectation below is arithmetic on that size.
 */

/** The ids the window reports, one per sizing rule. */
export const IMAGE_BOX_IDS = {
  intrinsic: "imagebox-intrinsic",
  ratio: "imagebox-ratio",
  width: "imagebox-width",
  both: "imagebox-both",
} as const;

/** The data URL's own edge, from `content.ts`'s 8×8 PNG. */
export const IMAGE_INTRINSIC_SIZE = 8;

/** The width every sized case asks for. */
export const IMAGE_WIDTH = 120;

/** The definite height the compensated case declares. */
export const IMAGE_HEIGHT = 60;

/** The ratio the ratio case declares, twice the bitmap's own 1. */
export const IMAGE_RATIO = 2;

/** One `<img>`'s painted box. */
export interface ImageBoxExpectation {
  readonly id: string;
  readonly width: number;
  readonly height: number;
}

/** The ratio the loaded bitmap carries: the data URL's PNG is square. */
export const IMAGE_BITMAP_RATIO = IMAGE_INTRINSIC_SIZE / IMAGE_INTRINSIC_SIZE;

/** The height a definite width gets from the bitmap's own ratio. */
export const heightAtBitmapRatio = (width: number): number =>
  width / IMAGE_BITMAP_RATIO;

/**
 * What each image paints.
 *
 * A style ratio of 2 would paint 120×60; the bitmap's own square ratio opts for
 * 120×120 instead, because the loaded image replaces the element's ratio. The
 * both-definite case is the compensation the runtime applies: it hands the
 * element the declared width ÷ height so the loaded bitmap cannot jump the box.
 */
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
