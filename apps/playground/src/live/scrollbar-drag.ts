/**
 * Whether the runtime's own scrollbar thumb takes a **drag** — it does not.
 *
 * `scrollbar-thumb` measured what the thumb paints and `scroll-lifecycle` what
 * a wheel does; neither says whether a reader can grab the thumb. The answer is
 * a capability a workspace plan needs, because the runtime paints the thumb
 * itself: no recipe can add or change the gesture.
 *
 * The pinned binding's source states it — `renderer.rs`'s `scrollbar_overlay`
 * is a `canvas` with "no hitbox" and it "takes no input" — and this probe
 * measures the consequence in a window: a drag aimed at the thumb's centre and
 * a press on the track below it both leave the offset at zero, while the **same
 * drag** on a sibling React handle runs its eight moves and a wheel on the same
 * scroller moves it. The handle is the control that rules out a harness that
 * cannot drag at all.
 *
 * The thumb is not an element: it is painted inside the scroller, on its
 * trailing edge. So the drag is aimed from the **scroller's** centre plus an
 * offset (`AsyncSmokeHost.drag`'s option), computed from the rule
 * `scrollbar.ts` measured: a 160 px track over 700 px of content paints a 37 px
 * thumb starting at 0, twelve pixels thick and flush right.
 */
import * as Option from "effect/Option";
import { thumbOf, type ThumbBox } from "./scrollbar.js";

/** The ids the window reports. */
export const DRAG_IDS = {
  probe: "scrollbar-drag-probe",
  scroller: "scrollbar-drag",
  content: "scrollbar-drag-content",
  handle: "scrollbar-drag-handle",
  readout: "scrollbar-drag-readout",
} as const;

/** The box the scroller is given: the track the thumb is measured on. */
export const DRAG_VIEWPORT = { width: 200, height: 160 } as const;

/** The content's height: enough that the thumb is a small share of it. */
export const DRAG_CONTENT = 700;

/** The content fill, distinct from the thumb's tint and the page. */
export const DRAG_FILL = "#1E2A38";

/** The thumb's tint, so a band read can name the colour it counts. */
export const DRAG_TINT = "#00E0C6";

/** The thickness the caller asks for. */
export const DRAG_THICKNESS = 12;

/** The thumb at rest, from the rule the one-axis probe measured. */
export const DRAG_THUMB: ThumbBox = Option.getOrElse(
  thumbOf(DRAG_VIEWPORT.height, DRAG_CONTENT, 0),
  () => ({ start: 0, length: 0 }),
);

/** How far every drag below travels, in window pixels. */
export const DRAG_BY = 40;

/** The press aimed at the thumb's centre, in pixels from the scroller's centre. */
export const DRAG_GRAB = {
  x: DRAG_VIEWPORT.width / 2 - DRAG_THICKNESS / 2,
  y: DRAG_THUMB.start + DRAG_THUMB.length / 2 - DRAG_VIEWPORT.height / 2,
} as const;

/**
 * The press aimed at the track **below** the thumb: a browser pages on that
 * press, and the runtime's overlay has no hitbox for it either.
 */
export const DRAG_TRACK_GRAB = {
  x: DRAG_GRAB.x,
  y: DRAG_VIEWPORT.height / 2 - 40,
} as const;

/** The one wheel the probe sends, and the offset it must leave. */
export const DRAG_WHEEL = -100;

/** The thumb at a renderer offset (zero at the start, negative after). */
export const dragThumbAfter = (offset: number): ThumbBox =>
  Option.getOrElse(thumbOf(DRAG_VIEWPORT.height, DRAG_CONTENT, offset), () => ({
    start: 0,
    length: 0,
  }));

/** The right-hand strip every thumb read counts, in viewport coordinates. */
export const DRAG_BAND = {
  x: DRAG_VIEWPORT.width - DRAG_THICKNESS,
  y: 0,
  width: DRAG_THICKNESS,
  height: DRAG_VIEWPORT.height,
} as const;

/**
 * The checks the probe asserts:
 *
 * - the capture's device scale, the scroller's painted box, and the tint;
 * - at rest: the offset the renderer reports (an `expectSome` plus its two
 *   axes) and the thumb's tint, start and length;
 * - the thumb drag: the offset (the same shape) and that neither axis moved;
 * - the track press: the offset and that `y` did not move;
 * - the handle control: its readout before and after the same drag;
 * - the wheel: the offset it reports and the `y` it lands on;
 * - the thumb after the wheel: its tint, its start and its length.
 */
export const DRAG_CHECKS = 1 + 1 + 1 + 3 + 3 + 3 + 2 + 2 + 2 + 3;
