/**
 * The box a surface paints into.
 *
 * A `Surface` reserves one box and a raster adapter fills it with whole RGBA
 * pixels, so the authored size has to be a whole, non-negative length. Derived
 * sizes are commonly fractional (a measured column) or unreadable (`NaN` from a
 * value that never arrived), and passing either through verbatim paints a box
 * the buffer cannot match — measured, a 320.5 px surface painted no frame at
 * all while a `NaN` width stretched its host to the parent's width (plan `697`).
 */

import type { SurfaceBounds } from "./adapter.js";

/**
 * A length in whole logical pixels.
 *
 * A finite positive value floors, so the box never exceeds the space the caller
 * was given. Zero stays zero — a collapsed surface is a layout state, not an
 * error — and a negative or non-finite value is not a length at all, so it
 * collapses rather than reaching the paint (the rule `core/value.ts` applies to
 * public pixel props, plan `371`).
 */
const paintLength = (value: number): number =>
  Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

/**
 * The paintable box for an authored size.
 *
 * Idempotent: a box this function returned normalises to itself, so the
 * component and its element seam can both call it without drifting.
 */
export const surfaceBounds = ({
  width,
  height,
}: SurfaceBounds): SurfaceBounds => ({
  width: paintLength(width),
  height: paintLength(height),
});
