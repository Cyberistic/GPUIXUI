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
    expect(paintings(glyphField({ ...BOX, seed: 7 }))).toEqual(
      paintings(wall),
    );
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
    expect(glyphMarksOf(Option.some(""))).toEqual(
      Arr.fromIterable(glyphMarks),
    );
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
    expect(Arr.dedupe(Arr.map(field.cells, (cell) => cell.opacity)).length).toBeGreaterThan(1);
  });
});
