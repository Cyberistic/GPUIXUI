/**
 * The magnetic arithmetic.
 *
 * The bugs these guard: a pull that does not reach zero at the centre (the plate
 * would sit off-centre at rest); a pull that scales with the surface rather than
 * its distance (a wide card would yank); an uncapped pull that walks the content
 * out of the box; an axis that is not capped on its own; a `NaN` strength or
 * reach reaching the runtime; and a repeated pointer reading that paints a new
 * offset so the plate never rests.
 */

import { describe, expect, it } from "vitest";
import {
  magneticFrames,
  magneticPull,
  magneticReach,
  magneticRest,
  magneticStrength,
  samePull,
} from "./logic.js";

/** A 200 × 80 surface at (100, 50). */
const box = { x: 100, y: 50, width: 200, height: 80 };

describe("magneticPull", () => {
  it("rests at zero when the pointer is on the centre", () => {
    expect(magneticPull({ x: 200, y: 90 }, box)).toEqual(magneticRest);
  });

  it("follows a share of the distance from the centre", () => {
    // 40 px right of centre at the house share of 0.35 is 14, capped at 12.
    expect(magneticPull({ x: 240, y: 90 }, box, 0.35, 100)).toEqual({
      left: 14,
      top: 0,
    });
  });

  it("caps each axis at the reach", () => {
    expect(magneticPull({ x: 1_000, y: 1_000 }, box)).toEqual({
      left: magneticReach,
      top: magneticReach,
    });
    expect(magneticPull({ x: -1_000, y: -1_000 }, box)).toEqual({
      left: -magneticReach,
      top: -magneticReach,
    });
  });

  it("caps one axis without touching the other", () => {
    // Far right, centre line: a horizontal pull only.
    expect(magneticPull({ x: 900, y: 90 }, box)).toEqual({
      left: magneticReach,
      top: 0,
    });
  });

  it("pins the plate at a zero strength", () => {
    expect(magneticPull({ x: 900, y: 900 }, box, 0)).toEqual(magneticRest);
  });

  it("clamps a strength above one and ignores one that cannot run", () => {
    expect(magneticPull({ x: 240, y: 90 }, box, 4, 100).left).toBe(40);
    expect(magneticPull({ x: 240, y: 90 }, box, Number.NaN, 100).left).toBe(
      Math.round(40 * magneticStrength * 10) / 10,
    );
  });

  it("falls back to the house reach for a reach that cannot run", () => {
    expect(magneticPull({ x: 1_000, y: 90 }, box, 1, Number.NaN).left).toBe(
      magneticReach,
    );
    expect(magneticPull({ x: 1_000, y: 90 }, box, 1, -4).left).toBe(
      magneticReach,
    );
  });

  it("rounds to a tenth of a pixel so a held pointer paints one value", () => {
    // 5 px right of centre at the house share is 1.75, painted as 1.8.
    expect(magneticPull({ x: 205, y: 90 }, box, 0.35, 100)).toEqual({
      left: 1.8,
      top: 0,
    });
  });
});

describe("the frames a pull paints", () => {
  it("moves the plate on both inset axes", () => {
    expect(magneticFrames({ left: -4, top: 6 })).toEqual({ left: -4, top: 6 });
  });

  it("tells a moved plate from a rested one", () => {
    expect(samePull(magneticRest, magneticPull({ x: 200, y: 90 }, box))).toBe(
      true,
    );
    expect(samePull(magneticRest, magneticPull({ x: 900, y: 90 }, box))).toBe(
      false,
    );
  });
});
