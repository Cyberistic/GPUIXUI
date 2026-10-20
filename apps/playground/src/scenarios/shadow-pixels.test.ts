/**
 * Guards the premises of the shadow pixel checks (plan `736`).
 *
 * The bug being guarded: `focusRing` and `elevationShadow` were only ever read
 * back from the authored style report, so a shadow the runtime accepts but does
 * not paint passed every check. These tests pin that the ring sample is inside
 * a 2 px band on the correct side, that the interior sample stays inside the
 * box, that the elevation sample sits below it, and that "darker" is a
 * per-channel direction rather than "different".
 */
import { describe, expect, it } from "vitest";
import { Pixels } from "@gpuixui/testing";
import {
  SHADOW_DELTA,
  SHADOW_DROP,
  darkerThan,
  interior,
  ringBand,
  shadowSample,
} from "./shadow-pixels.js";

const BOX = { x: 100, y: 40, width: 120, height: 64 };

const rgba = (r: number, g: number, b: number): Pixels.Rgba =>
  new Pixels.Rgba({ r, g, b, a: 255 });

describe("ringBand", () => {
  it("samples the middle of a 2 px band on each edge", () => {
    expect(ringBand(BOX, 2, "left")).toEqual({ x: 99, y: 72 });
    expect(ringBand(BOX, 2, "right")).toEqual({ x: 221, y: 72 });
    expect(ringBand(BOX, 2, "top")).toEqual({ x: 160, y: 39 });
  });

  it("moves outward with the token's spread and never samples the edge", () => {
    expect(ringBand(BOX, 4, "left").x).toBe(98);
    expect(ringBand(BOX, 1, "left").x).toBe(99);
    expect(ringBand(BOX, 0, "left").x).toBe(99);
  });
});

describe("interior", () => {
  it("stays inside the box and follows its origin", () => {
    const point = interior(BOX, 4);
    expect(point).toEqual({ x: 104, y: 72 });
    expect(point.x).toBeGreaterThan(BOX.x);
    expect(point.x).toBeLessThan(BOX.x + BOX.width);
    expect(point.y).toBeGreaterThan(BOX.y);
    expect(point.y).toBeLessThan(BOX.y + BOX.height);
  });
});

describe("shadowSample", () => {
  it("sits below the box's bottom edge, horizontally centred", () => {
    expect(shadowSample(BOX)).toEqual({ x: 160, y: 40 + 64 + SHADOW_DROP });
  });
});

describe("darkerThan", () => {
  const control = rgba(100, 100, 100);

  it("accepts a uniform darkening of exactly the delta", () => {
    const at = 100 - SHADOW_DELTA;
    expect(darkerThan(rgba(at, at, at), control, SHADOW_DELTA)).toBe(true);
  });

  it("rejects one channel short, an unchanged pixel and a brighter pixel", () => {
    const short = 100 - SHADOW_DELTA;
    expect(
      darkerThan(rgba(short, short, short + 1), control, SHADOW_DELTA),
    ).toBe(false);
    expect(darkerThan(rgba(100, 100, 100), control, SHADOW_DELTA)).toBe(false);
    expect(darkerThan(rgba(short, short, 110), control, SHADOW_DELTA)).toBe(
      false,
    );
  });
});
