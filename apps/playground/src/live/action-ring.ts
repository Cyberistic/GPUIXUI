import type { Point } from "./frame.js";

export const ACTION_RING_PROBE = "action-ring-probe";

export const ACTION_RING_PRIMARY = "action-ring-primary";
export const ACTION_RING_DANGER = "action-ring-danger";
export const ACTION_RING_NEIGHBOUR = "action-ring-neighbour";

export interface ActionBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const insidePoint = (box: ActionBox, distance: number): Point => ({
  x: box.x + distance,
  y: box.y + box.height / 2,
});
