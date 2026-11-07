import * as Arr from "effect/Array";
import { nextSize } from "../panels/resize.js";

export const COLUMN_RESIZE = {
  name: 160,

  status: 100,
  size: 80,

  min: 120,
  max: 360,

  divider: 6,

  viewport: 300,
  viewportHeight: 200,
  rows: 12,
  rowHeight: 28,

  control: 90,
} as const;

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

export const COLUMN_RESIZE_ROWS: ReadonlyArray<number> = Arr.range(
  0,
  COLUMN_RESIZE.rows - 1,
);

export const DRAG_STEPS = 8;

export const CONTROL_MOVES = 1;

export const resizedWidth = (start: number, pointerDelta: number): number =>
  nextSize({
    start,
    pointerDelta,
    min: COLUMN_RESIZE.min,
    max: COLUMN_RESIZE.max,
  });

export const resizeContentWidth = (name: number): number =>
  name + COLUMN_RESIZE.divider + COLUMN_RESIZE.status + COLUMN_RESIZE.size;

export const movedPastDivider = (pressX: number, x: number): boolean =>
  x > pressX + COLUMN_RESIZE.divider / 2;

export interface ColumnResizeState {
  readonly width: number;

  readonly control: number;

  readonly moves: number;

  readonly outside: number;

  readonly controlMoves: number;
}

export const columnResizeReadout = (state: ColumnResizeState): string =>
  `w=${state.width} ctrl=${state.control} moves=${state.moves} outside=${state.outside} ctrlMoves=${state.controlMoves}`;
