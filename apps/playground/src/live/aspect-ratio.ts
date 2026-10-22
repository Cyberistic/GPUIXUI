/**
 * The geometry a box with `aspectRatio` paints.
 *
 * `StyleDesc.aspectRatio` is declared as "width divided by height, applied to
 * whichever axis is not definite" and the library's `Box` hands it through, but
 * every proof so far is an offscreen style report: a window's renderer reports
 * no style, so only a painted box says which dimension the ratio actually
 * fills.
 *
 * The fixture asks one question per axis and one per container: a definite
 * width derives a height, a definite height derives a width, two definite
 * dimensions ignore the ratio, and a container's stretch makes the stretched
 * axis definite for the child. The arithmetic is one pair of functions so a
 * probe, a test and this file's prose cannot disagree about it.
 */

/** The ids the window reports, one per case. */
export const ASPECT_IDS = {
  width: "aspect-width",
  portrait: "aspect-portrait",
  height: "aspect-height",
  both: "aspect-both",
  column: "aspect-column",
  row: "aspect-row",
  columnParent: "aspect-column-parent",
  rowParent: "aspect-row-parent",
} as const;

/** The ratio the width and height cases ask for (width ÷ height). */
export const ASPECT_RATIO = 2;

/** The definite width of the width-derived box. */
export const ASPECT_WIDTH = 160;

/** The definite height of the height-derived box. */
export const ASPECT_HEIGHT = 60;

/** The definite width of the portrait box. */
export const ASPECT_PORTRAIT_WIDTH = 100;

/** A ratio below one: the box is taller than it is wide. */
export const ASPECT_PORTRAIT_RATIO = 0.5;

/** The width the column container gives its stretched child. */
export const ASPECT_COLUMN_WIDTH = 240;

/** The height the row container gives its stretched child. */
export const ASPECT_ROW_HEIGHT = 80;

/** The height a definite width implies for `ratio`. */
export const heightForWidth = (width: number, ratio: number): number =>
  width / ratio;

/** The width a definite height implies for `ratio`. */
export const widthForHeight = (height: number, ratio: number): number =>
  height * ratio;

/** One painted box's expected geometry. */
export interface AspectExpectation {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  /** The axis the ratio is expected to derive. */
  readonly derives: "width" | "height" | "neither";
}

/** What each box must paint, from the constants above. */
export const ASPECT_CASES: ReadonlyArray<AspectExpectation> = [
  {
    id: ASPECT_IDS.width,
    width: ASPECT_WIDTH,
    height: heightForWidth(ASPECT_WIDTH, ASPECT_RATIO),
    derives: "height",
  },
  {
    id: ASPECT_IDS.portrait,
    width: ASPECT_PORTRAIT_WIDTH,
    height: heightForWidth(ASPECT_PORTRAIT_WIDTH, ASPECT_PORTRAIT_RATIO),
    derives: "height",
  },
  {
    id: ASPECT_IDS.height,
    width: widthForHeight(ASPECT_HEIGHT, ASPECT_RATIO),
    height: ASPECT_HEIGHT,
    derives: "width",
  },
  {
    id: ASPECT_IDS.both,
    width: ASPECT_WIDTH,
    height: ASPECT_HEIGHT,
    derives: "neither",
  },
  {
    id: ASPECT_IDS.column,
    width: ASPECT_COLUMN_WIDTH,
    height: heightForWidth(ASPECT_COLUMN_WIDTH, ASPECT_RATIO),
    derives: "height",
  },
  {
    id: ASPECT_IDS.row,
    width: 0,
    height: ASPECT_ROW_HEIGHT,
    derives: "neither",
  },
];
