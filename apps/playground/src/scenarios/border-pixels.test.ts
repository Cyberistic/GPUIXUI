/**
 * Guards the premises of the border/radius pixel checks (plan `745`).
 *
 * The bug being guarded: `borderWidth`, `borderColor` and `borderRadius` were
 * only ever read back from the authored style report, so a runtime that paints
 * every box square and borderless passed. These tests pin that a sample lands
 * in the middle of a band of the token's width, that "outside" is measured
 * from the outer edge, that the corner/centre samples use the reported
 * content-origin box, and that the corner clearance is the real arc distance —
 * so a widened border or a shrunken radius cannot silently make a pixel check
 * vacuous.
 */
import { describe, expect, it } from "vitest";
import {
  beyondBorder,
  borderBand,
  centre,
  contentCorner,
  cornerClearance,
} from "./border-pixels.js";

const BOX = { x: 100, y: 50, width: 160, height: 72 };

describe("borderBand", () => {
  it("samples the middle of a 1 px band on all four edges", () => {
    expect(borderBand(BOX, 1, "left")).toEqual({ x: 99.5, y: 86 });
    expect(borderBand(BOX, 1, "right")).toEqual({ x: 260.5, y: 86 });
    expect(borderBand(BOX, 1, "top")).toEqual({ x: 180, y: 49.5 });
    expect(borderBand(BOX, 1, "bottom")).toEqual({ x: 180, y: 122.5 });
  });

  it("derives the distance from the width instead of a literal", () => {
    expect(borderBand(BOX, 2, "left").x).toBe(99);
    expect(borderBand(BOX, 4, "left").x).toBe(98);
    expect(borderBand(BOX, 4, "left").x).toBeLessThan(
      borderBand(BOX, 1, "left").x,
    );
  });

  it("samples the outer quarter where a wider band differs from a narrower one", () => {
    expect(borderBand(BOX, 2, "left", 0.75)).toEqual({ x: 98.5, y: 86 });
    expect(borderBand(BOX, 1, "left", 0.75).x).toBe(99.25);
    expect(borderBand(BOX, 2, "left", 0.75).x).toBeLessThan(BOX.x - 1);
  });
});

describe("beyondBorder", () => {
  it("measures the gap from the outer edge on every side", () => {
    expect(beyondBorder(BOX, 1, 1, "left")).toEqual({ x: 98, y: 86 });
    expect(beyondBorder(BOX, 1, 1, "right")).toEqual({ x: 262, y: 86 });
    expect(beyondBorder(BOX, 1, 1, "top")).toEqual({ x: 180, y: 48 });
    expect(beyondBorder(BOX, 1, 1, "bottom")).toEqual({ x: 180, y: 124 });
  });

  it("moves outward with a wider border", () => {
    expect(beyondBorder(BOX, 2, 1, "left").x).toBe(97);
    expect(beyondBorder(BOX, 2, 1, "left").x).toBeLessThan(
      borderBand(BOX, 2, "left").x,
    );
  });
});

describe("contentCorner and centre", () => {
  it("uses the reported content origin, not the outer box", () => {
    expect(contentCorner(BOX)).toEqual({ x: 100, y: 50 });
    expect(centre(BOX)).toEqual({ x: 180, y: 86 });
  });
});

describe("cornerClearance", () => {
  it("is the arc distance at the content corner", () => {
    expect(cornerClearance(12, 0)).toBeCloseTo(4.9706, 3);
    expect(cornerClearance(12, 1)).toBeCloseTo(3.5563, 3);
    expect(cornerClearance(4, 0)).toBeCloseTo(1.6569, 3);
  });

  it("rejects a radius too small for a 2 px clear sample", () => {
    expect(cornerClearance(12, 0)).toBeGreaterThanOrEqual(2);
    expect(cornerClearance(4, 0)).toBeLessThan(2);
  });
});
