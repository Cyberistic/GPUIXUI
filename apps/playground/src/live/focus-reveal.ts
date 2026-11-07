import * as Option from "effect/Option";

export const FOCUS_REVEAL_IDS = {
  probe: "focus-reveal-probe",
  before: "focus-reveal-before",
  form: "focus-reveal-form",
  roving: "focus-reveal-roving",
  readout: "focus-reveal-readout",
} as const;

export const FOCUS_REVEAL_PANE = { width: 200, height: 120 } as const;

export const FOCUS_REVEAL_ROWS = 9;
export const FOCUS_REVEAL_ROW = 40;
export const FOCUS_REVEAL_CONTENT = FOCUS_REVEAL_ROWS * FOCUS_REVEAL_ROW;

export const FOCUS_REVEAL_END = FOCUS_REVEAL_PANE.height - FOCUS_REVEAL_CONTENT;

export const FOCUS_REVEAL_BELOW = 3;

export const FOCUS_REVEAL_LAST = FOCUS_REVEAL_ROWS - 1;

export const FOCUS_REVEAL_MARK = "#FF3B30";

export const formRowId = (index: number): string =>
  `focus-reveal-form-${index}`;
export const rovingRowId = (index: number): string =>
  `focus-reveal-roving-${index}`;

export const rowTop = (index: number): number => index * FOCUS_REVEAL_ROW;

export const rowBottom = (index: number): number =>
  rowTop(index) + FOCUS_REVEAL_ROW;

const clampOffset = (offset: number): number =>
  Math.max(FOCUS_REVEAL_END, Math.min(0, offset));

export const revealOffset = (
  index: number,
  current: number,
): Option.Option<number> => {
  const above = rowTop(index) + current;
  const below = rowBottom(index) + current - FOCUS_REVEAL_PANE.height;
  const shift = above < 0 ? above : below > 0 ? below : 0;
  return shift === 0
    ? Option.none()
    : Option.some(clampOffset(current - shift));
};

export const insidePane = (
  row: { readonly y: number; readonly height: number },
  pane: { readonly y: number; readonly height: number },
  slack = 1,
): boolean =>
  row.y >= pane.y - slack && row.y + row.height <= pane.y + pane.height + slack;

export const focusRevealReadout = (cursor: number, keys: number): string =>
  `cursor=${cursor} keys=${keys}`;

export const FOCUS_REVEAL_CHECKS =
  1 + 2 + 1 + 2 + 3 + 2 + 2 + 6 + 1 + 1 + 2 + 7 + 6 + 3 + 5;
