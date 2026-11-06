export const OUTER_VIEWPORT = { width: 380, height: 260 } as const;

export const INNER_VIEWPORT = { width: 320, height: 140 } as const;

export const INNER_ROWS = 12;
export const INNER_ROW_HEIGHT = 40;

export const FILLER_ROWS = 6;
export const FILLER_ROW_HEIGHT = 80;

export const scrollMax = (viewport: number, content: number): number =>
  viewport - content;

export const INNER_CONTENT = INNER_ROWS * INNER_ROW_HEIGHT;
export const INNER_MAX = scrollMax(INNER_VIEWPORT.height, INNER_CONTENT);

export const INNER_TOP = 0;
export const OUTER_CONTENT =
  INNER_TOP + INNER_VIEWPORT.height + FILLER_ROWS * FILLER_ROW_HEIGHT;
export const OUTER_MAX = scrollMax(OUTER_VIEWPORT.height, OUTER_CONTENT);

export const INNER_STEP = -100;

export const OUTER_ONLY_ROW = 0;

export const fillerTop = (row: number): number =>
  INNER_TOP + INNER_VIEWPORT.height + row * FILLER_ROW_HEIGHT;

export const innerRowTop = (row: number): number => row * INNER_ROW_HEIGHT;

export const PANE_PAGE_VIEWPORT = { width: 260, height: 220 } as const;
export const PANE_VIEWPORT = 140;
export const PANE_ROWS = 40;
export const PANE_ROW_HEIGHT = 28;
export const PANE_FILLER_ROWS = 4;
export const PANE_FILLER_HEIGHT = 60;

export const PANE_CONTENT =
  PANE_VIEWPORT + PANE_FILLER_ROWS * PANE_FILLER_HEIGHT;
export const PANE_PAGE_MAX = scrollMax(PANE_PAGE_VIEWPORT.height, PANE_CONTENT);

export const paneFillerTop = (row: number): number =>
  PANE_VIEWPORT + row * PANE_FILLER_HEIGHT;
