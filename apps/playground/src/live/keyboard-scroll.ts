import type { Theme } from "@gpuixui/tokens";

export const KEYBOARD_SCROLL_IDS = {
  before: "kscroll-before",
  vertical: "kscroll-vertical",
  field: "kscroll-field",
  horizontal: "kscroll-horizontal",
  inert: "kscroll-inert",
  after: "kscroll-after",
  readout: "kscroll-readout",
  value: "kscroll-value",
} as const;

export const VERTICAL_VIEWPORT = { width: 200, height: 160 } as const;
export const VERTICAL_ROWS = 11;
export const VERTICAL_ROW_HEIGHT = 40;

export const FIELD_SLOT = 40;
export const VERTICAL_CONTENT =
  VERTICAL_ROWS * VERTICAL_ROW_HEIGHT + FIELD_SLOT;

export const VERTICAL_MAX = VERTICAL_VIEWPORT.height - VERTICAL_CONTENT;

export const HORIZONTAL_VIEWPORT = { width: 320, height: 120 } as const;
export const HORIZONTAL_COLUMNS = 18;
export const HORIZONTAL_COLUMN_WIDTH = 80;
export const HORIZONTAL_CONTENT = HORIZONTAL_COLUMNS * HORIZONTAL_COLUMN_WIDTH;
export const HORIZONTAL_MAX = HORIZONTAL_VIEWPORT.width - HORIZONTAL_CONTENT;

export type ScrollAction =
  | "up"
  | "down"
  | "pageup"
  | "pagedown"
  | "left"
  | "right"
  | "home"
  | "end";

const MOVE: Readonly<
  Record<
    ScrollAction,
    { readonly direction: number; readonly size: "line" | "page" | "edge" }
  >
> = {
  up: { direction: 1, size: "line" },
  down: { direction: -1, size: "line" },
  pageup: { direction: 1, size: "page" },
  pagedown: { direction: -1, size: "page" },
  left: { direction: 1, size: "line" },
  right: { direction: -1, size: "line" },
  home: { direction: 0, size: "edge" },
  end: { direction: 0, size: "edge" },
};

export const lineStep = (theme: Theme): number => theme.density.rowHeight;

export const predictedOffset = (
  from: number,
  action: ScrollAction,
  line: number,
  page: number,
  max: number,
): number => {
  const move = MOVE[action];
  if (action === "home") return 0;
  if (action === "end") return max;
  const step = move.size === "page" ? page : line;
  return Math.max(max, Math.min(0, from + move.direction * step));
};

export const offsetText = (offset: {
  readonly x: number;
  readonly y: number;
}): string => `x=${offset.x} y=${offset.y}`;
