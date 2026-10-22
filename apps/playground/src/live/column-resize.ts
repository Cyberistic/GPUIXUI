/**
 * The grid the `column-resize-lifecycle` probe drags, and the arithmetic a
 * resizable column owes.
 *
 * Tier 3's **resizable columns** row rests on the headless
 * `table-column-resize` scenario, where the pointer is synthesised; a reader
 * drags in a window, and the two lanes can disagree (a window delivered a press
 * and every move before React committed the press's render, which is why
 * `SplitPane` holds its press in a ref). This fixture holds the widths, the
 * clamp and the one spelling of the readout, so the probe's checks, its test
 * and the README read the same numbers.
 *
 * The clamp is `nextSize`, the split pane's arithmetic, rather than a second
 * copy of it: a column and a pane are the same drag against the same bounds.
 *
 * Kept native-free, as `table-columns.ts` is, so the premises the paint checks
 * rest on are testable on a host with no binding.
 */
import * as Arr from "effect/Array";
import { nextSize } from "../panels/resize.js";

/** The widths the grid opens with, and the bounds a drag may move one within. */
export const COLUMN_RESIZE = {
  /** The column the divider resizes. */
  name: 160,
  /** The columns after it, which must move with it. */
  status: 100,
  size: 80,
  /** The narrowest and widest the dragged column may become. */
  min: 120,
  max: 360,
  /** The divider's width: the element that arms the pointer capture. */
  divider: 6,
  /** The viewport the grid pans in, narrower than the content by 46 points. */
  viewport: 300,
  viewportHeight: 200,
  rows: 12,
  rowHeight: 28,
  /** The column a **move-only** divider sits beside — the negative control. */
  control: 90,
} as const;

/** The `testId`s the view and the steps share, so a probe cannot address a ghost. */
export const COLUMN_RESIZE_IDS = {
  probe: "resize-probe",
  grid: "resize-grid",
  readout: "resize-readout",
  header: "resize-header-name",
  divider: "resize-divider",
  statusHeader: "resize-header-status",
  cell: (row: number): string => `resize-cell-${row}`,
  controlHeader: "resize-control-header",
  controlDivider: "resize-control-divider",
} as const;

/** Every row index, in table order. */
export const COLUMN_RESIZE_ROWS: ReadonlyArray<number> = Arr.range(
  0,
  COLUMN_RESIZE.rows - 1,
);

/**
 * The moves one `drag` delivers between its press and its release.
 *
 * The automation client's `DragOptions.steps` default, which is what
 * `AsyncSmokeHost.drag` drives: one jump would prove nothing about per-move
 * commits, so every drag in a probe is eight moves. The divider counts the ones
 * it hears, so this is the number its readout prints.
 */
export const DRAG_STEPS = 8;

/**
 * The moves a divider that listens only to `mouseMove` hears of one drag.
 *
 * Measured: the press and the first move land while the pointer is still inside
 * the 6px box, and the remaining seven go to whatever the pointer is over,
 * because the runtime arms the capture only for an element that listens to both
 * `mouseDown` and `mouseMove` — the pair `pointer-capture` measured. A column
 * divider shipped without the press keeps one move of eight and never resizes.
 */
export const CONTROL_MOVES = 1;

/** The width the dragged column takes after a drag of `pointerDelta`. */
export const resizedWidth = (start: number, pointerDelta: number): number =>
  nextSize({
    start,
    pointerDelta,
    min: COLUMN_RESIZE.min,
    max: COLUMN_RESIZE.max,
  });

/** The content width the row and header share at `name`'s width. */
export const resizeContentWidth = (name: number): number =>
  name + COLUMN_RESIZE.divider + COLUMN_RESIZE.status + COLUMN_RESIZE.size;

/**
 * Whether a move landed outside the divider's own box.
 *
 * The probe presses the divider's painted centre and the box is
 * `divider` points wide, so the right edge sits `divider / 2` past the press
 * point. A captured drag keeps delivering moves to the divider after the pointer
 * leaves that box, which is the whole reason a divider must listen to both
 * `onMouseDown` and `onMouseMove`; counting the outside ones is what turns that
 * into a check.
 */
export const movedPastDivider = (pressX: number, x: number): boolean =>
  x > pressX + COLUMN_RESIZE.divider / 2;

/** What the grid's readout prints. */
export interface ColumnResizeState {
  /** The dragged column's current width. */
  readonly width: number;
  /** The move-only control's width, which a drag must not change. */
  readonly control: number;
  /** Moves the captured divider heard while pressed. */
  readonly moves: number;
  /** How many of those landed outside its own box. */
  readonly outside: number;
  /** Moves the move-only divider heard. */
  readonly controlMoves: number;
}

/** The readout's one spelling, shared by the view, the steps and the test. */
export const columnResizeReadout = (state: ColumnResizeState): string =>
  `w=${state.width} ctrl=${state.control} moves=${state.moves} outside=${state.outside} ctrlMoves=${state.controlMoves}`;
