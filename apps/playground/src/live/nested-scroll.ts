/**
 * The `nested-scroll-lifecycle` fixture: a scroller inside a scroller.
 *
 * A dock's pane list sits inside the workspace's own scroller, a dialog body's
 * list sits inside the page's scroll root, and a settings form scrolls in a
 * panel that scrolls in the window. Whether the wheel stops at the inner
 * scroller, chains to the outer one at its end, or bubbles its `onScroll` to an
 * ancestor handler decides whether a panel needs a wheel guard — and nothing has
 * measured it.
 *
 * The geometry is a premise the probe's checks rest on: the inner scroller must
 * be **wholly inside** the outer one's viewport, the filler row the outer-only
 * wheel aims at must sit **below** the inner (so that wheel cannot reach it),
 * and both scrollers must have somewhere to travel. `nested-scroll.test.ts`
 * holds those, so a layout that stopped exercising the nesting fails before a
 * window opens.
 */

/** The outer scroller: the page or workspace a pane's scroller sits in. */
export const OUTER_VIEWPORT = { width: 420, height: 260 } as const;

/** The inner scroller: the pane's own list. */
export const INNER_VIEWPORT = { width: 320, height: 140 } as const;

/** The inner list's rows: enough to overflow its 140px viewport. */
export const INNER_ROWS = 12;
export const INNER_ROW_HEIGHT = 40;

/** The rows below the inner scroller: the outer's own travel. */
export const FILLER_ROWS = 6;
export const FILLER_ROW_HEIGHT = 80;

/** The offset a scroller clamps at, given its viewport and content sizes. */
export const scrollMax = (viewport: number, content: number): number =>
  viewport - content;

export const INNER_CONTENT = INNER_ROWS * INNER_ROW_HEIGHT;
export const INNER_MAX = scrollMax(INNER_VIEWPORT.height, INNER_CONTENT);

/** The outer content starts with the inner scroller, then the filler rows. */
export const INNER_TOP = 0;
export const OUTER_CONTENT =
  INNER_TOP + INNER_VIEWPORT.height + FILLER_ROWS * FILLER_ROW_HEIGHT;
export const OUTER_MAX = scrollMax(OUTER_VIEWPORT.height, OUTER_CONTENT);

/** The first wheel: it moves the inner and stops short of its end. */
export const INNER_STEP = -100;

/**
 * The filler row an outer-only wheel aims at.
 *
 * Row 0 starts where the inner scroller ends, so its painted centre is inside
 * the outer viewport at rest but never over the inner — the wheel would
 * otherwise hit the inner instead.
 */
export const OUTER_ONLY_ROW = 0;

/** A filler row's top edge inside the outer's content, at rest. */
export const fillerTop = (row: number): number =>
  INNER_TOP + INNER_VIEWPORT.height + row * FILLER_ROW_HEIGHT;

/** The top edge of the inner list's `row` inside the inner's content. */
export const innerRowTop = (row: number): number => row * INNER_ROW_HEIGHT;
