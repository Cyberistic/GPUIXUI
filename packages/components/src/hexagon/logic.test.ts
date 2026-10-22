/**
 * The hexagon grid's arithmetic, without a window.
 *
 * The bugs these guard: a grid that leaves gaps because the column pitch is
 * wrong; a radius the renderer could scale to a smear, or a cell count that runs
 * away on a large box; a stroke that paints as a fill; a box that has not been
 * laid out yet still generating geometry at the origin; and a field whose shape
 * changed between two identical renders.
 */

import { describe, expect, it } from "vitest";
import {
  hexagonField,
  hexagonMaxCells,
  hexagonMaxStroke,
  hexagonRadius,
  hexagonRadiusOf,
  hexagonStroke,
  hexagonStrokeOf,
} from "./logic.js";

/** The closed subpaths in one generated path. */
const cellsIn = (markup: string): number => markup.split("Z").length - 1;

describe("the hexagon grid", () => {
  it("generates one path in a view box the size of the box", () => {
    const field = hexagonField({
      width: 300,
      height: 200,
      radius: 30,
      stroke: 1,
    });

    expect(field.markup).toContain('viewBox="0 0 300 200"');
    expect(field.markup.match(/<path /g)).toHaveLength(1);
    expect(field.cells).toBe(40);
    expect(cellsIn(field.markup)).toBe(40);
  });

  it("starts the first hex wholly inside the box, at the top-left", () => {
    const field = hexagonField({
      width: 300,
      height: 200,
      radius: 30,
      stroke: 1,
    });

    // A flat-top hexagon's first vertex is level with its centre, one radius
    // to the right: (30 + 30, √3 × 30 / 2) = (60, 25.98).
    expect(field.markup).toContain("M 60 26 L");
  });

  it("paints the same grid for the same box and settings", () => {
    const box = { width: 420, height: 260, radius: 34, stroke: 1.5 };
    expect(hexagonField(box).markup).toBe(hexagonField(box).markup);
  });

  it("grows a radius that would exceed the cell cap", () => {
    const field = hexagonField({
      width: 800,
      height: 600,
      radius: 10,
      stroke: 1,
    });

    expect(field.radius).toBeGreaterThan(10);
    expect(field.cells).toBeLessThanOrEqual(hexagonMaxCells);
    expect(cellsIn(field.markup)).toBe(field.cells);
  });

  it("keeps the authored radius when the grid already fits", () => {
    const field = hexagonField({
      width: 300,
      height: 200,
      radius: 30,
      stroke: 1,
    });
    expect(field.radius).toBe(30);
  });

  it("falls back from a radius or stroke the renderer cannot paint", () => {
    expect(hexagonRadiusOf(Number.NaN)).toBe(hexagonRadius);
    expect(hexagonRadiusOf(-4)).toBe(hexagonRadius);
    expect(hexagonRadiusOf(2)).toBe(10);
    expect(hexagonRadiusOf(10_000)).toBe(160);

    expect(hexagonStrokeOf(Number.POSITIVE_INFINITY)).toBe(hexagonStroke);
    expect(hexagonStrokeOf(0)).toBe(hexagonStroke);
    expect(hexagonStrokeOf(0.1)).toBe(0.5);
    expect(hexagonStrokeOf(100)).toBe(hexagonMaxStroke);

    const thick = hexagonField({
      width: 300,
      height: 200,
      radius: 30,
      stroke: 100,
    });
    expect(thick.markup).toContain(`stroke-width="${hexagonMaxStroke}"`);
  });

  it("paints nothing before the box has a size", () => {
    expect(
      hexagonField({ width: 0, height: 200, radius: 30, stroke: 1 }),
    ).toEqual({ markup: "", cells: 0, radius: 30 });
    expect(
      hexagonField({
        width: Number.NaN,
        height: 200,
        radius: 30,
        stroke: 1,
      }).markup,
    ).toBe("");
  });
});
