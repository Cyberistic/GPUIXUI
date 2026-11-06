import type { Smoke } from "@gpuixui/testing";

type Bounds = Smoke.Bounds;

export const REFLOW_IDS = {
  probe: "reflow-probe",
  rightAnchor: "reflow-right-anchor",
  rightPanel: "reflow-right-panel",
  bottomAnchor: "reflow-bottom-anchor",
  bottomPanel: "reflow-bottom-panel",
  popoverTrigger: "reflow-popover-trigger",
  popoverPanel: "reflow-popover-panel",
} as const;

export const REFLOW_SIDE_GAP = 6;

export const REFLOW_ANCHOR = { width: 160, height: 40 } as const;

export const REFLOW_PANEL = { width: 140, height: 72 } as const;

export const REFLOW_INSET = 40;

export const REFLOW_TOP = 120;

export const REFLOW_POPOVER_INSET = 240;

export const REFLOW_MIN_TRAVEL = 100;

export const reflowAnchorLeft = (width: number): number =>
  width - REFLOW_ANCHOR.width - REFLOW_INSET;

export const reflowAnchorTop = (height: number): number =>
  height - REFLOW_ANCHOR.height - REFLOW_INSET;

export interface ReflowOffset {
  readonly dx: number;
  readonly dy: number;
}

export const reflowOffset = (anchor: Bounds, panel: Bounds): ReflowOffset => ({
  dx: panel.x - anchor.x,
  dy: panel.y - anchor.y,
});

export const sameOffset = (
  left: ReflowOffset,
  right: ReflowOffset,
  slack = 1,
): boolean =>
  Math.abs(left.dx - right.dx) <= slack &&
  Math.abs(left.dy - right.dy) <= slack;

export const trailingGap = (anchor: Bounds, panel: Bounds): number =>
  anchor.x - (panel.x + panel.width);

export const REFLOW_CHECKS = 27;
