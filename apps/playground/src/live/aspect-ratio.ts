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

export const ASPECT_RATIO = 2;

export const ASPECT_WIDTH = 160;

export const ASPECT_HEIGHT = 60;

export const ASPECT_PORTRAIT_WIDTH = 100;

export const ASPECT_PORTRAIT_RATIO = 0.5;

export const ASPECT_COLUMN_WIDTH = 240;

export const ASPECT_ROW_HEIGHT = 80;

export const heightForWidth = (width: number, ratio: number): number =>
  width / ratio;

export const widthForHeight = (height: number, ratio: number): number =>
  height * ratio;

export interface AspectExpectation {
  readonly id: string;
  readonly width: number;
  readonly height: number;

  readonly derives: "width" | "height" | "neither";
}

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
