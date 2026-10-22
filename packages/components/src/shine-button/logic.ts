/**
 * How a sheen crosses a control.
 *
 * A sheen is a light that travels across a surface, and the runtime has no
 * `transform` (upstream issue #102) and a gradient takes exactly two stops
 * (`@gpuix/native@0.11.0`'s `LinearGradientBackground`), so it is painted as two
 * halves that move together: a lead half brightening from nothing to the ink,
 * and a trail half dimming back to nothing. Each half travels on `left`, the
 * inset axis, so the seam between them is the brightest line of the sheen.
 *
 * All of it is arithmetic over a measured width, so the sweep is checked without
 * a window.
 */

import type { LinearGradientBackground, MotionStyle } from "@gpuix/react";

/** Which half of the sheen an element paints. */
export type SheenHalf = "lead" | "trail";

/** The share of the label's ink the brightest line carries. */
export const sheenOpacity = 0.2;

/** The two frames one half runs between. */
export interface SheenFrames {
  readonly initial: MotionStyle;
  readonly animate: MotionStyle;
}

/**
 * Half the sheen's width: a quarter of the control, and never thinner than 16px
 * so a small action still shows a band rather than a line.
 */
export const sheenHalf = (controlWidth: number): number =>
  Math.max(16, Math.round(controlWidth / 4));

/**
 * Where one half sits at the start and the end.
 *
 * At the start the pair's right edge touches the control's left edge — the sheen
 * is entirely outside — and at the end the lead's left edge passes the control's
 * right edge. Both halves move the same distance, so the brightest line stays
 * between them and they never separate.
 */
export const sheenFrames = (
  half: number,
  controlWidth: number,
  side: SheenHalf,
): SheenFrames => {
  const offset = side === "lead" ? 0 : half;
  return {
    initial: { left: -2 * half + offset },
    animate: { left: controlWidth + offset },
  };
};

/**
 * One half's paint: a two-stop gradient from clear to lit for the lead, and the
 * reverse for the trail, so the pair reads as one soft band.
 */
export const sheenGradient = (
  lit: string,
  clear: string,
  side: SheenHalf,
): LinearGradientBackground => ({
  type: "linear-gradient",
  angle: 90,
  stops:
    side === "lead"
      ? [
          { color: clear, position: 0 },
          { color: lit, position: 1 },
        ]
      : [
          { color: lit, position: 0 },
          { color: clear, position: 1 },
        ],
});
