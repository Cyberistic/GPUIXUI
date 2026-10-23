/**
 * The arithmetic the `floating-reflow-lifecycle` probe reads a window with.
 *
 * `header-menu-lifecycle` measured an anchored surface following its anchor's
 * **paint-level** offset: a wheel moves the trigger, and the panel moves with it
 * in the same read. A layout reflow is a different event. A dock drags a
 * divider, a window zooms, a column hides — the anchor's box is laid out again
 * — and nothing had measured whether a panel that is already open is placed
 * again or stays on the pixels it entered at. That decides whether a pane must
 * dismiss its menus on resize, so the probe opens the three shapes a component
 * composes (a raw left-side layer, a raw bottom-anchored layer, and the shipped
 * `Popover` mounted open) and moves all three anchors by reflowing the window.
 *
 * The measurement is relative on purpose: a window reports no style, and the
 * absolute pixels differ per host, but the offset between an anchor and its
 * panel is the contract — `side` owns the horizontal relationship, `align` the
 * vertical one. Every anchor's `left`/`top` is derived from `useWindowSize`, so
 * a zoom moves it and the probe never writes a pixel the runtime did not lay
 * out.
 */
import type { Smoke } from "@gpuixui/testing";

type Bounds = Smoke.Bounds;

/** Every id the probe addresses in the window. */
export const REFLOW_IDS = {
  probe: "reflow-probe",
  rightAnchor: "reflow-right-anchor",
  rightPanel: "reflow-right-panel",
  bottomAnchor: "reflow-bottom-anchor",
  bottomPanel: "reflow-bottom-panel",
  popoverTrigger: "reflow-popover-trigger",
  popoverPanel: "reflow-popover-panel",
} as const;

/** The `sideOffset` the two raw layers ask for. */
export const REFLOW_SIDE_GAP = 6;

/** The anchor every layer points at: wide enough to read a box from. */
export const REFLOW_ANCHOR = { width: 160, height: 40 } as const;

/** The panel both raw layers paint, identical so the two cases compare. */
export const REFLOW_PANEL = { width: 140, height: 72 } as const;

/** How far the anchors sit from the window's right and bottom edges. */
export const REFLOW_INSET = 40;

/** The top anchor's distance from the window's top edge. */
export const REFLOW_TOP = 120;

/**
 * How far the popover's trigger sits left of the anchors it shares a column
 * with: it starts at the window's bottom edge, where a panel below it cannot
 * fit, so both of its offsets move when the window does.
 */
export const REFLOW_POPOVER_INSET = 240;

/**
 * The least a reflowed anchor must travel before the measurement counts.
 *
 * The window opens at 900×520 and `zoomWindow` takes it to 1680×923, so both
 * anchors move far more than this. A run where the zoom did nothing fails by
 * name rather than passing on an unchanged offset.
 */
export const REFLOW_MIN_TRAVEL = 100;

/** The top anchor's left edge in a window `width` wide. */
export const reflowAnchorLeft = (width: number): number =>
  width - REFLOW_ANCHOR.width - REFLOW_INSET;

/** The bottom anchor's top edge in a window `height` tall. */
export const reflowAnchorTop = (height: number): number =>
  height - REFLOW_ANCHOR.height - REFLOW_INSET;

/** One offset between a painted anchor and the panel it opened. */
export interface ReflowOffset {
  readonly dx: number;
  readonly dy: number;
}

/** The offset a panel keeps from its anchor, the number a reflow must not move. */
export const reflowOffset = (anchor: Bounds, panel: Bounds): ReflowOffset => ({
  dx: panel.x - anchor.x,
  dy: panel.y - anchor.y,
});

/** Whether two offsets are the same placement, to a point. */
export const sameOffset = (
  left: ReflowOffset,
  right: ReflowOffset,
  slack = 1,
): boolean =>
  Math.abs(left.dx - right.dx) <= slack &&
  Math.abs(left.dy - right.dy) <= slack;

/** The gap between a panel's trailing edge and the anchor it sits left of. */
export const trailingGap = (anchor: Bounds, panel: Bounds): number =>
  anchor.x - (panel.x + panel.width);

/**
 * The checks the probe asserts.
 *
 * Two anchors measured at rest and again after the zoom (painted + gap + top
 * alignment each), the shipped popover's offset before and after, and the
 * window's own pair on both sides of the zoom.
 */
export const REFLOW_CHECKS = 27;
