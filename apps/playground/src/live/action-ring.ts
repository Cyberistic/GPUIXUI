/**
 * Where the shipped filled action's keyboard ring sits around its own fill.
 *
 * The tokens contract measures a ring's colour on the strip it surrounds, and
 * `focus-ring-offset` measured the runtime's `outlineOffset` on two plain
 * samples. Neither mounts the case the offset exists for: a **filled action**,
 * whose fill is the same `ring` role the outline paints, so a flush line is
 * drawn in the colour it is supposed to stand out from. This fixture names the
 * three points the probe samples on the shipped `Button` and the samples it
 * mounts, so the arithmetic is held without a window.
 *
 * The points come from `ring-offset.ts`: an outline's middle is `offset +
 * width / 2` outside the box, and a gap's middle is half the offset.
 */
import type { Point } from "./frame.js";

/** The page the three samples sit on. */
export const ACTION_RING_PROBE = "action-ring-probe";

/** The shipped actions the probe presses and tabs to, and the layout witness. */
export const ACTION_RING_PRIMARY = "action-ring-primary";
export const ACTION_RING_DANGER = "action-ring-danger";
export const ACTION_RING_NEIGHBOUR = "action-ring-neighbour";

/** A control's painted box, as `paintedBox` reports it. */
export interface ActionBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A point `distance` points inside the box's left edge, at the middle. */
export const insidePoint = (box: ActionBox, distance: number): Point => ({
  x: box.x + distance,
  y: box.y + box.height / 2,
});
