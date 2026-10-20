/**
 * The surface box rule.
 *
 * The bug this guards (plan `697`): `Surface` passed its authored size straight
 * to the host style and to every adapter call, so a fractional width (a measured
 * column) failed the raster adapter's whole-pixel check and painted **no** frame,
 * while a `NaN` width was dropped by the style and stretched the host to its
 * parent's width. A surface box must be whole, non-negative logical pixels.
 */

import { describe, expect, it } from "vitest";
import { surfaceBounds } from "./bounds.js";

const box = (width: number, height: number) => surfaceBounds({ width, height });

describe("surfaceBounds", () => {
  it("keeps a whole box unchanged", () => {
    expect(box(320, 180)).toStrictEqual({ width: 320, height: 180 });
  });

  it("floors a fractional length so the box never exceeds its space", () => {
    expect(box(320.5, 180.9)).toStrictEqual({ width: 320, height: 180 });
    expect(box(0.5, 1.25)).toStrictEqual({ width: 0, height: 1 });
  });

  it("collapses a length that is not a positive number", () => {
    expect(box(0, 180)).toStrictEqual({ width: 0, height: 180 });
    expect(box(-8, -0.5)).toStrictEqual({ width: 0, height: 0 });
    expect(box(Number.NaN, 180)).toStrictEqual({ width: 0, height: 180 });
    expect(
      box(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
    ).toStrictEqual({ width: 0, height: 0 });
  });

  it("is idempotent, so the component and its element seam cannot drift", () => {
    const once = box(320.5, Number.NaN);
    expect(surfaceBounds(once)).toStrictEqual(once);
  });
});
