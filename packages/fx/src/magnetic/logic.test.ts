import { describe, expect, it } from "vitest";
import {
  magneticFrames,
  magneticPull,
  magneticReach,
  magneticRest,
  magneticStrength,
  samePull,
} from "./logic.js";

const box = { x: 100, y: 50, width: 200, height: 80 };

describe("magneticPull", () => {
  it("rests at zero when the pointer is on the centre", () => {
    expect(magneticPull({ x: 200, y: 90 }, box)).toEqual(magneticRest);
  });

  it("follows a share of the distance from the centre", () => {
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
