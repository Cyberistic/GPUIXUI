export const FLEX_IDS = {
  growRow: "flex-grow-row",
  growFixed: "flex-grow-fixed",
  growFill: "flex-grow-fill",
  basisZeroRow: "flex-basis-zero-row",
  basisZeroFixed: "flex-basis-zero-fixed",
  basisZeroShort: "flex-basis-zero-short",
  basisZeroFit: "flex-basis-zero-fit",
  basisAutoRow: "flex-basis-auto-row",
  basisAutoFixed: "flex-basis-auto-fixed",
  basisAutoShort: "flex-basis-auto-short",
  basisAutoLong: "flex-basis-auto-long",
  overRow: "flex-over-row",
  overFixed: "flex-over-fixed",
  overShort: "flex-over-short",
  overItem: "flex-over-item",
  shrinkRow: "flex-shrink-row",
  shrinkFixed: "flex-shrink-fixed",
  shrinkItem: "flex-shrink-item",
  noShrinkRow: "flex-noshrink-row",
  noShrinkItem: "flex-noshrink-item",
  floorRow: "flex-floor-row",
  floorItem: "flex-floor-item",
  floorContent: "flex-floor-content",
  liftedRow: "flex-lifted-row",
  liftedItem: "flex-lifted-item",
  liftedContent: "flex-lifted-content",
  maxRow: "flex-max-row",
  maxFixed: "flex-max-fixed",
  maxGrow: "flex-max-grow",
  alignColumn: "flex-align-column",
  alignStart: "flex-align-start",
  alignCenter: "flex-align-center",
  alignEnd: "flex-align-end",
  alignStretch: "flex-align-stretch",
} as const;

export const FLEX_ROW_WIDTH = 400;

export const FLEX_NARROW_WIDTH = 300;

export const FLEX_FIXED_WIDTH = 120;

export const FLEX_ASKED_WIDTH = 320;

export const FLEX_SHORT_CONTENT = 20;

export const FLEX_FIT_CONTENT = 60;

export const FLEX_LONG_CONTENT = 160;

export const FLEX_OVER_CONTENT = 200;

export const FLEX_FLOOR_ROW_WIDTH = 200;

export const FLEX_FLOOR_CONTENT = 300;

export const FLEX_MAX_WIDTH = 120;

export const FLEX_ALIGN_COLUMN_WIDTH = 300;

export const FLEX_ALIGN_CONTENT = 60;

export const leftover = (row: number, taken: number): number => row - taken;

export const equalShares = (
  row: number,
  taken: number,
  shares: number,
): number => leftover(row, taken) / shares;

export const autoBasisShare = (
  row: number,
  taken: number,
  bases: ReadonlyArray<number>,
  index: number,
): number => {
  const content = bases.reduce((sum, base) => sum + base, 0);
  const free = leftover(row, taken) - content;
  return (bases[index] ?? 0) + free / bases.length;
};

export const shareNextToContent = (
  row: number,
  taken: number,
  content: number,
): number => leftover(row, taken) - content;

export interface FlexWidthExpectation {
  readonly id: string;
  readonly width: number;
}

export const FLEX_WIDTH_CASES: ReadonlyArray<FlexWidthExpectation> = [
  { id: FLEX_IDS.growFixed, width: FLEX_FIXED_WIDTH },
  { id: FLEX_IDS.growFill, width: leftover(FLEX_ROW_WIDTH, FLEX_FIXED_WIDTH) },
  { id: FLEX_IDS.basisZeroFixed, width: FLEX_FIXED_WIDTH },
  {
    id: FLEX_IDS.basisZeroShort,
    width: equalShares(FLEX_ROW_WIDTH, FLEX_FIXED_WIDTH, 2),
  },
  {
    id: FLEX_IDS.basisZeroFit,
    width: equalShares(FLEX_ROW_WIDTH, FLEX_FIXED_WIDTH, 2),
  },
  { id: FLEX_IDS.basisAutoFixed, width: FLEX_FIXED_WIDTH },
  {
    id: FLEX_IDS.basisAutoShort,
    width: autoBasisShare(
      FLEX_ROW_WIDTH,
      FLEX_FIXED_WIDTH,
      [FLEX_SHORT_CONTENT, FLEX_LONG_CONTENT],
      0,
    ),
  },
  {
    id: FLEX_IDS.basisAutoLong,
    width: autoBasisShare(
      FLEX_ROW_WIDTH,
      FLEX_FIXED_WIDTH,
      [FLEX_SHORT_CONTENT, FLEX_LONG_CONTENT],
      1,
    ),
  },
  { id: FLEX_IDS.overFixed, width: FLEX_FIXED_WIDTH },
  {
    id: FLEX_IDS.overShort,
    width: shareNextToContent(
      FLEX_ROW_WIDTH,
      FLEX_FIXED_WIDTH,
      FLEX_OVER_CONTENT,
    ),
  },
  { id: FLEX_IDS.overItem, width: FLEX_OVER_CONTENT },
  { id: FLEX_IDS.shrinkFixed, width: FLEX_FIXED_WIDTH },
  {
    id: FLEX_IDS.shrinkItem,
    width: leftover(FLEX_NARROW_WIDTH, FLEX_FIXED_WIDTH),
  },
  { id: FLEX_IDS.noShrinkItem, width: FLEX_ASKED_WIDTH },
  { id: FLEX_IDS.floorItem, width: FLEX_FLOOR_CONTENT },
  { id: FLEX_IDS.liftedItem, width: FLEX_FLOOR_ROW_WIDTH },
  { id: FLEX_IDS.maxGrow, width: FLEX_MAX_WIDTH },
  { id: FLEX_IDS.alignStart, width: FLEX_ALIGN_CONTENT },
  { id: FLEX_IDS.alignCenter, width: FLEX_ALIGN_CONTENT },
  { id: FLEX_IDS.alignEnd, width: FLEX_ALIGN_CONTENT },
  { id: FLEX_IDS.alignStretch, width: FLEX_ALIGN_COLUMN_WIDTH },
];

export interface FlexAlignExpectation {
  readonly id: string;
  readonly x: number;
}

export const FLEX_ALIGN_CASES: ReadonlyArray<FlexAlignExpectation> = [
  { id: FLEX_IDS.alignStart, x: 0 },
  {
    id: FLEX_IDS.alignCenter,
    x: (FLEX_ALIGN_COLUMN_WIDTH - FLEX_ALIGN_CONTENT) / 2,
  },
  { id: FLEX_IDS.alignEnd, x: FLEX_ALIGN_COLUMN_WIDTH - FLEX_ALIGN_CONTENT },
];

export const FLEX_CHECKS =
  FLEX_WIDTH_CASES.length + FLEX_ALIGN_CASES.length + 3;
