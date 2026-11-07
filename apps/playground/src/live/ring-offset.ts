import type { Point } from "./frame.js";

export const RING_OFFSET = 2;

export interface RingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const leftOf = (box: RingBox, distance: number): Point => ({
  x: box.x - distance,
  y: box.y + box.height / 2,
});

export const bandPoint = (box: RingBox, offset: number, width: number): Point =>
  leftOf(box, offset + width / 2);
