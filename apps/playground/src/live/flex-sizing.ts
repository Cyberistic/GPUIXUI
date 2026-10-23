/**
 * The flex sizing rules every `flex-1`, `shrink-0` and truncating label rests
 * on, asked one question per rule.
 *
 * `StyleDesc` declares `flexGrow`, `flexShrink`, `flexBasis`, `minWidth` and
 * `maxWidth`, and `@gpuixui/tw` compiles `flex-1` to exactly
 * `{ flexGrow: 1, flexShrink: 1, flexBasis: 0 }` — but no proof painted one:
 * the headless `layout-flex` measures explicit widths and gaps, and the live
 * layout probes measure ratios, panel widths and text truncation. So the rules a
 * split pane, a data table's columns and a truncating label compose against were
 * the typings' claim, not a measured one.
 *
 * The arithmetic lives here, once, so the window probe, the headless scenario
 * and the README section cannot disagree about it: a definite item keeps its
 * width while a grower takes the leftover, two `flexBasis: 0` growers whose
 * content fits split that leftover evenly, an auto basis grows from its content,
 * a grower whose content is wider than its share keeps its content and the rest
 * of the row goes to the other, an over-full row shrinks the items that may
 * shrink, a flex item's automatic minimum is its content unless `minWidth: 0`
 * lifts it, `maxWidth` stops a grower, and `alignSelf` overrides a column's
 * stretch.
 *
 * The fourth rule is the one a window taught: `flexBasis: 0` does **not**
 * override the automatic minimum, so `flex-1` is not an equal split when one
 * column holds a run wider than its share. A column that must shrink below its
 * content declares `minWidth: 0` — the same rule the lifted row measures.
 */

/** The ids the window and the renderer report, one per painted box. */
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

/** The width of the rows that measure growing and shrinking. */
export const FLEX_ROW_WIDTH = 400;

/** The stretch of the rows that measure shrinking. */
export const FLEX_NARROW_WIDTH = 300;

/** The definite item that never grows or shrinks in a row. */
export const FLEX_FIXED_WIDTH = 120;

/** The width an over-full item asks for before the row shrinks it. */
export const FLEX_ASKED_WIDTH = 320;

/** The content width of the short grower, well under any share of a row. */
export const FLEX_SHORT_CONTENT = 20;

/** The content width of a grower that still fits inside its equal share. */
export const FLEX_FIT_CONTENT = 60;

/** The content width of the long grower, too wide for a `flexBasis: 0` share. */
export const FLEX_LONG_CONTENT = 160;

/** The content width that outgrows its `flexBasis: 0` share. */
export const FLEX_OVER_CONTENT = 200;

/** The row a flex item's automatic minimum is measured in. */
export const FLEX_FLOOR_ROW_WIDTH = 200;

/** The content a floor row's item cannot fit. */
export const FLEX_FLOOR_CONTENT = 300;

/** The cap a grower is clamped to. */
export const FLEX_MAX_WIDTH = 120;

/** The column the four `alignSelf` values are measured in. */
export const FLEX_ALIGN_COLUMN_WIDTH = 300;

/** The width of each `alignSelf` item's own content. */
export const FLEX_ALIGN_CONTENT = 60;

/** The free width a row has once its definite items have taken theirs. */
export const leftover = (row: number, taken: number): number => row - taken;

/** The width each of `shares` equal growers takes of the leftover. */
export const equalShares = (
  row: number,
  taken: number,
  shares: number,
): number => leftover(row, taken) / shares;

/** The width one auto-basis grower takes: its content plus a free share. */
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

/**
 * The width one of two `flexBasis: 0` growers takes when the other holds
 * content wider than its share: the floored item keeps its content and the rest
 * of the row goes to the other.
 */
export const shareNextToContent = (
  row: number,
  taken: number,
  content: number,
): number => leftover(row, taken) - content;

/** One box's expected width and the rule it proves. */
export interface FlexWidthExpectation {
  readonly id: string;
  readonly width: number;
}

/** What each width must paint, derived from the constants above. */
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

/** Where one `alignSelf` item must sit, measured from its column's left edge. */
export interface FlexAlignExpectation {
  readonly id: string;
  readonly x: number;
}

/** The three positions `alignSelf` can place a content-width item at. */
export const FLEX_ALIGN_CASES: ReadonlyArray<FlexAlignExpectation> = [
  { id: FLEX_IDS.alignStart, x: 0 },
  {
    id: FLEX_IDS.alignCenter,
    x: (FLEX_ALIGN_COLUMN_WIDTH - FLEX_ALIGN_CONTENT) / 2,
  },
  { id: FLEX_IDS.alignEnd, x: FLEX_ALIGN_COLUMN_WIDTH - FLEX_ALIGN_CONTENT },
];

/**
 * The checks the probe asserts: one per width, one per `alignSelf` position,
 * plus the grower's edge, the overflow and the two floor reads.
 */
export const FLEX_CHECKS =
  FLEX_WIDTH_CASES.length + FLEX_ALIGN_CASES.length + 3;
