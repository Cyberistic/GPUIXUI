/**
 * How far a magnetic surface follows the pointer.
 *
 * A magnet moves the thing under the cursor toward the cursor. The runtime has
 * no `transform` (upstream issue #102), so the pull is a relative `left`/`top`
 * offset on the content plate: the surface's own box stays where it was laid
 * out, and only the content travels. Keeping the hit box still is not a
 * compromise — a control whose box followed the pointer would move out from
 * under the cursor, leave it, snap back and flicker.
 *
 * The pull is a share of the pointer's distance from the surface's centre,
 * capped at a few pixels, so a wide card and a small button feel the same.
 * All of it is arithmetic over two boxes, so it is checked without a window.
 */

import type { MotionStyle } from "@gpuix/react";

/** A point in window coordinates, as a pointer event reports it. */
export interface MagneticPointer {
  readonly x: number;
  readonly y: number;
}

/** A border box in window coordinates, as `onLayout` reports it. */
export interface MagneticBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The offset a pull paints. */
export interface MagneticPull {
  readonly left: number;
  readonly top: number;
}

/** The default share of the pointer's distance from the centre a pull covers. */
export const magneticStrength = 0.35;

/** The default furthest a plate travels, in pixels. */
export const magneticReach = 12;

/** The offset at rest: a surface whose pointer is gone, or that never felt one. */
export const magneticRest: MagneticPull = { left: 0, top: 0 };

/** `value` when it is a usable number at or above `low`, else `fallback`. */
const usable = (value: number, low: number, fallback: number): number =>
  Number.isFinite(value) && value >= low ? value : fallback;

/** `value` held between `low` and `high`. */
const between = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

/** A distance as a tenth of a pixel: the runtime paints no finer, and rounding keeps a held pointer still. */
const tenth = (value: number): number => Math.round(value * 10) / 10;

/**
 * The offset a pointer at `pointer` pulls `box` by.
 *
 * The pointer is measured from the box's centre, scaled by `strength` (clamped
 * to `0…1`) and capped at `maxOffset` on each axis independently, so a pointer
 * past the bottom-right corner moves the plate diagonally to the reach and no
 * further. Either axis may be `0` — a pointer on the centre line moves the plate
 * on the other axis only. A strength or reach that is not a usable number falls
 * back to the house values instead of reaching the runtime as `NaN`.
 */
export const magneticPull = (
  pointer: MagneticPointer,
  box: MagneticBox,
  strength: number = magneticStrength,
  maxOffset: number = magneticReach,
): MagneticPull => {
  const share = between(usable(strength, 0, magneticStrength), 0, 1);
  const reach = usable(maxOffset, 0, magneticReach);
  const left = between(
    (pointer.x - (box.x + box.width / 2)) * share,
    -reach,
    reach,
  );
  const top = between(
    (pointer.y - (box.y + box.height / 2)) * share,
    -reach,
    reach,
  );
  return { left: tenth(left), top: tenth(top) };
};

/** The two frames a plate paints for one pull. */
export const magneticFrames = (pull: MagneticPull): MotionStyle => ({
  left: pull.left,
  top: pull.top,
});

/** Whether two pulls paint the same offset, so a repeated pointer move re-renders nothing. */
export const samePull = (a: MagneticPull, b: MagneticPull): boolean =>
  a.left === b.left && a.top === b.top;
