export const TRANSCRIPT_ROW_HEIGHT = 28;

export const TRANSCRIPT_START_ROWS = 12;

export const TRANSCRIPT_PAGE_ROWS = 2;

export const TRANSCRIPT_VIEWPORT_HEIGHT = 200;

export const TRANSCRIPT_TAIL_HEIGHT = 1;

export const TRANSCRIPT_THRESHOLD = 24;

export const contentHeight = (rows: number): number =>
  rows * TRANSCRIPT_ROW_HEIGHT + TRANSCRIPT_TAIL_HEIGHT;

export const scrollRange = (rows: number): number =>
  contentHeight(rows) - TRANSCRIPT_VIEWPORT_HEIGHT;

export const pageShift = (rows: number = TRANSCRIPT_PAGE_ROWS): number =>
  rows * TRANSCRIPT_ROW_HEIGHT;
