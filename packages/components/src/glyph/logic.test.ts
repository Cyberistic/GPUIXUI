/**
 * The glyph wall's arithmetic, measured without a window.
 *
 * The bugs these guard: a wall that reshuffles between mounts (the same seed
 * must paint the same wall); a cell that lands outside the box it is clipped to;
 * a huge box that mounts thousands of text hosts instead of growing its cell; a
 * density or cell the renderer cannot use reaching the paint as `NaN`; a mark
 * set that is empty and paints nothing; and a caller's marks being ignored in
 * favour of the house set.
 */

import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  glyphCell,
  glyphCellOf,
  glyphDensity,
  glyphDensityOf,
  glyphDim,
  glyphField,
  glyphMarks,
  glyphMarksOf,
  glyphMaxCells,
  type GlyphField,
} from "./logic.js";
import * as Option from "effect/Option";

const BOX = { width: 400, height: 240 } as const;

const paintings = (field: GlyphField): ReadonlyArray<string> =>
  Arr.map(field.cells, (cell) => `${cell.key}:${cell.text}`);

const grid = (field: GlyphField): number => field.columns * field.rows;

describe("glyphField", () => {
  it("paints the same wall for the same seed and another one for a new seed", () => {
    const wall = glyphField({ ...BOX, seed: 7 });
    expect(paintings(glyphField({ ...BOX, seed: 7 }))).toEqual(paintings(wall));
    expect(paintings(glyphField({ ...BOX, seed: 8 }))).not.toEqual(
      paintings(wall),
    );
  });

  it("keeps every mark inside the box it is clipped to", () => {
    const field = glyphField({ ...BOX, density: 1 });
    Arr.forEach(field.cells, (cell) => {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.x).toBeLessThan(BOX.width);
      expect(cell.y).toBeLessThan(BOX.height);
    });
  });

  it("grows the cell rather than mounting more than the cap", () => {
    const huge = glyphField({ width: 4000, height: 3000, density: 1 });
    expect(grid(huge)).toBeLessThanOrEqual(glyphMaxCells);
    expect(huge.cell).toBeGreaterThan(glyphCell);
    expect(huge.cells.length).toBeLessThanOrEqual(glyphMaxCells);

    // The cap is a bound on nodes, not a reason to paint part of the wall: a
    // small box keeps the caller's cell and fills it edge to edge.
    const small = glyphField({
      width: 100,
      height: 100,
      cellSize: 10,
      density: 1,
    });
    expect(small.cell).toBe(10);
    expect(grid(small)).toBe(100);
  });

  /**
   * The bug this guards: the cell was chosen from the box's **area** alone, and
   * the grid floors each dimension at one cell — so a strip narrower than the
   * estimate painted one column of every row it could fit. Measured, a 10 × 6000
   * box painted **272** text hosts and a 10 × 10 000 box **454**, against a cap
   * of 240. A wall is a node per glyph, so that is the one bound the module
   * promises and a decorative strip could hold thousands.
   */
  it("keeps the cap on a wall that is one cell wide or one cell tall", () => {
    const strips = [
      { width: 10, height: 6000 },
      { width: 10, height: 10000 },
      { width: 8000, height: 16 },
      { width: 1, height: 4000 },
      { width: 4000, height: 1 },
    ];
    Arr.forEach(strips, (box) => {
      const field = glyphField({ ...box, density: 1 });
      const painted = field.cells.length;
      expect(
        painted,
        `${box.width}x${box.height} painted ${painted} of ${field.columns}x${field.rows}`,
      ).toBeLessThanOrEqual(glyphMaxCells);
      expect(field.cell).toBeGreaterThanOrEqual(glyphCell);
    });
  });

  it("holds the cap over every aspect ratio", () => {
    // A derived sweep rather than a second list of the boxes above: the cap is
    // a claim about *any* box, and the area estimate failed only where one side
    // is shorter than the cell it computes.
    const sides = [1, 10, 16, 240, 1000, 8000];
    const over = Arr.flatMap(sides, (width) =>
      Arr.flatMap(sides, (height) => {
        const field = glyphField({ width, height, density: 1 });
        const painted = field.cells.length;
        return painted > glyphMaxCells
          ? [`${width}x${height}: ${painted} > ${glyphMaxCells}`]
          : [];
      }),
    );
    expect(over).toEqual([]);
  });

  it("paints no cell at density 0 and every grid cell at density 1", () => {
    expect(glyphField({ ...BOX, density: 0 }).cells).toEqual([]);
    const full = glyphField({ ...BOX, density: 1 });
    expect(full.cells).toHaveLength(grid(full));
  });

  it("paints nothing before the box has been measured", () => {
    Arr.forEach(
      [
        { width: 0, height: 0 },
        { width: Number.NaN, height: 240 },
        { width: 400, height: -1 },
      ],
      (box) => {
        const field = glyphField(box);
        expect(field.cells).toEqual([]);
        expect(field.columns).toBe(0);
        expect(field.rows).toBe(0);
      },
    );
  });

  it("falls back from a cell, a density or a seed the renderer cannot use", () => {
    expect(glyphCellOf(Option.some(Number.NaN))).toBe(glyphCell);
    expect(glyphCellOf(Option.some(2))).toBe(glyphCell);
    expect(glyphCellOf(Option.some(500))).toBe(72);
    expect(glyphCellOf(Option.none())).toBe(glyphCell);

    expect(glyphDensityOf(Option.some(Number.POSITIVE_INFINITY))).toBe(
      glyphDensity,
    );
    expect(glyphDensityOf(Option.some(-0.5))).toBe(glyphDensity);
    expect(glyphDensityOf(Option.some(2))).toBe(1);

    const seeded = glyphField({ ...BOX, seed: Number.NaN });
    expect(paintings(seeded)).toEqual(
      paintings(glyphField({ ...BOX, seed: 1 })),
    );
  });

  it("draws only the caller's marks, one code point per cell", () => {
    const field = glyphField({ ...BOX, marks: "01", density: 1 });
    Arr.forEach(field.cells, (cell) => {
      expect(["0", "1"]).toContain(cell.text);
    });
    expect(glyphMarksOf(Option.some("ab"))).toEqual(["a", "b"]);
    expect(glyphMarksOf(Option.some(""))).toEqual(Arr.fromIterable(glyphMarks));
    expect(glyphMarksOf(Option.none())).toEqual(Arr.fromIterable(glyphMarks));
  });

  it("keeps every painted cell in the grid, in the dim-to-full band", () => {
    const field = glyphField({ ...BOX });
    const keys = Arr.map(field.cells, (cell) => cell.key);
    expect(Arr.dedupe(keys)).toEqual(keys);
    Arr.forEach(field.cells, (cell) => {
      expect(cell.opacity).toBeGreaterThanOrEqual(glyphDim);
      expect(cell.opacity).toBeLessThanOrEqual(1);
    });
    // Texture, not a block: a wall that paints every cell at one brightness is
    // the same paint as a solid fill.
    expect(
      Arr.dedupe(Arr.map(field.cells, (cell) => cell.opacity)).length,
    ).toBeGreaterThan(1);
  });
});
