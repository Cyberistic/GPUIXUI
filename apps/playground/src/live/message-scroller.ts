/**
 * The geometry the `message-scroller-lifecycle` probe paints.
 *
 * Kept native-free, like `expand-fixture.ts`, so the probe's premise is
 * testable on a host with no binding: a transcript only proves follow-the-tail
 * if its content actually overflows the viewport, and an append only proves a
 * yank if it moves the tail further than the component's at-end band.
 * `message-scroller.test.ts` guards these numbers.
 */

/** One transcript row's height, in pixels. */
export const TRANSCRIPT_ROW_HEIGHT = 28;
/** Rows present at mount; together they overflow `TRANSCRIPT_VIEWPORT_HEIGHT`. */
export const TRANSCRIPT_START_ROWS = 12;
/** Rows one "page" appends. */
export const TRANSCRIPT_PAGE_ROWS = 2;
/** The bounded viewport, in pixels. */
export const TRANSCRIPT_VIEWPORT_HEIGHT = 200;
/** The 1px tail sentinel the pin rule measures from. */
export const TRANSCRIPT_TAIL_HEIGHT = 1;
/** The at-end band: rows closer than this count as seen. */
export const TRANSCRIPT_THRESHOLD = 24;

/** The transcript's content height at a row count. */
export const contentHeight = (rows: number): number =>
  rows * TRANSCRIPT_ROW_HEIGHT + TRANSCRIPT_TAIL_HEIGHT;

/** How far the viewport can travel from its top to its end. */
export const scrollRange = (rows: number): number =>
  contentHeight(rows) - TRANSCRIPT_VIEWPORT_HEIGHT;

/** The distance one appended page adds below the viewport's content. */
export const pageShift = (rows: number = TRANSCRIPT_PAGE_ROWS): number =>
  rows * TRANSCRIPT_ROW_HEIGHT;
