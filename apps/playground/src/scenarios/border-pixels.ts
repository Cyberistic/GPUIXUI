/**
 * Where the border/radius probe samples, derived from the reported box.
 *
 * The bug being guarded: `theme-type-and-shadow` proves `borderWidth`,
 * `borderColor` and `borderRadius` reach the runtime's **style report**, and
 * nothing proves the frame paints them. A runtime that accepts all three and
 * paints a square, borderless box would pass every other check while every
 * card, input and dialog in the library lost its chrome.
 *
 * The runtime reports a **content-origin** box (plan `529` §6.5): `x`/`y` sit
 * inside the border and padding, `width`/`height` are the border box minus its
 * borders. With no padding, the outer box is `[x - B, y - B, width + 2B,
 * height + 2B]`, which is what every function here derives. No literal border
 * width appears: the caller passes the token's.
 */

import { Match } from "effect";

/** A box as the runtime reports it: content origin, borderless size. */
export interface ProbeBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A logical window point. */
export interface ProbePoint {
  readonly x: number;
  readonly y: number;
}

/** One side of a box. */
export type Edge = "left" | "right" | "top" | "bottom";

/**
 * The middle of a border band on one edge.
 *
 * The band spans `[x - width, x)` on the left (and mirrors on the other
 * edges), so `at` is how far across the band the sample sits: `0` at the
 * content edge, `1` at the outer edge, `0.5` (the default) in the middle.
 * Sampling the outer quarter (`0.75`) is what distinguishes a 2 px band from
 * a 1 px one, because the middle of the wider band is still inside the
 * narrower band.
 */
export const borderBand = (
  bounds: ProbeBox,
  width: number,
  edge: Edge,
  at = 0.5,
): ProbePoint => {
  const middleX = bounds.x + bounds.width / 2;
  const middleY = bounds.y + bounds.height / 2;
  const distance = width * at;
  return Match.value(edge).pipe(
    Match.when("left", () => ({ x: bounds.x - distance, y: middleY })),
    Match.when("right", () => ({
      x: bounds.x + bounds.width + distance,
      y: middleY,
    })),
    Match.when("top", () => ({ x: middleX, y: bounds.y - distance })),
    Match.when("bottom", () => ({
      x: middleX,
      y: bounds.y + bounds.height + distance,
    })),
    Match.exhaustive,
  );
};

/**
 * A point `gap` px outside the border box on one edge.
 *
 * The gap is measured from the **outer** edge, so `gap: 1` with a 2 px border
 * is the first pixel past the band rather than the second pixel of it.
 */
export const beyondBorder = (
  bounds: ProbeBox,
  width: number,
  gap: number,
  edge: Edge,
): ProbePoint => {
  const middleX = bounds.x + bounds.width / 2;
  const middleY = bounds.y + bounds.height / 2;
  const offset = width + gap;
  return Match.value(edge).pipe(
    Match.when("left", () => ({ x: bounds.x - offset, y: middleY })),
    Match.when("right", () => ({
      x: bounds.x + bounds.width + offset,
      y: middleY,
    })),
    Match.when("top", () => ({ x: middleX, y: bounds.y - offset })),
    Match.when("bottom", () => ({
      x: middleX,
      y: bounds.y + bounds.height + offset,
    })),
    Match.exhaustive,
  );
};

/**
 * The reported content origin.
 *
 * With a border this is one width inside the outer corner, which is exactly
 * where a rounded box stops painting its fill and a square one does not.
 */
export const contentCorner = (bounds: ProbeBox): ProbePoint => ({
  x: bounds.x,
  y: bounds.y,
});

/** The box's centre: the fill, never a border or a clipped corner. */
export const centre = (bounds: ProbeBox): ProbePoint => ({
  x: bounds.x + bounds.width / 2,
  y: bounds.y + bounds.height / 2,
});

/**
 * How far the content corner sits outside a corner arc, in logical px.
 *
 * The outer corner arc is centred at `(x - B + R, y - B + R)`; the content
 * corner is `(x, y)`. Along the diagonal the arc is `R(√2 - 1) - B√2` short of
 * the corner. A value `>= 2` keeps a sample clear of the anti-aliased edge;
 * a non-positive value means the corner is painted.
 */
export const cornerClearance = (radius: number, border = 0): number =>
  radius * (Math.SQRT2 - 1) - border * Math.SQRT2;
