/**
 * The glyph wall a `Glyph` field paints, as a deterministic layout.
 *
 * A wall is a grid of cells, each painted with one character from the caller's
 * mark set. The canvas has no text pattern and no canvas surface, so a wall is
 * one `<text>` host per painted cell — which is why the cell count is capped:
 * every cell is a node the runtime lays out, not a tint inside one shape.
 *
 * The layout is a pure function of the measured box, one seed and one cell size:
 * the same seed paints the same wall on every mount, and a different one gives a
 * different wall. A cell either draws a mark or stays empty (`density`), and a
 * drawn cell carries its own opacity, so the wall reads as texture rather than a
 * solid block.
 *
 * The caller's cell size is honoured unless the box would need more cells than
 * the cap allows, in which case the cell grows to the smallest one that fits —
 * the wall covers whole cells, so a strip narrower than one cell stays empty.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import { seededUnit, seedOf, tenth } from "../internal/scatter.js";
import { paintableBox, type PatternBox } from "../internal/svg-pattern.js";

/** The house cell size, in pixels. */
export const glyphCell = 22;

/** The smallest and largest cell a caller may ask for, in pixels. */
export const glyphMinCell = 10;
export const glyphMaxCell = 72;

/** The most cells one wall paints; each is a text host the runtime lays out. */
export const glyphMaxCells = 240;

/** The house share of cells that carry a mark. */
export const glyphDensity = 0.55;

/** The faintest a painted cell may be: visible, plainly subordinate. */
export const glyphDim = 0.3;

/** The marks the house wall draws from. */
export const glyphMarks = ".+*/\\<>[]{}~";

/** The house seed. */
export const glyphSeed = 1;

/** One painted cell: where its mark sits and how bright it is. */
export interface GlyphCell {
  readonly key: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly opacity: number;
}

/** A wall's layout: the grid it drew and the cells that carry a mark. */
export interface GlyphField {
  /** The cell size actually drawn, which may exceed the caller's to honour the cap. */
  readonly cell: number;
  readonly columns: number;
  readonly rows: number;
  readonly cells: ReadonlyArray<GlyphCell>;
}

/** One wall's inputs: the box it fills and the three authored weights. */
export interface GlyphFieldOptions extends PatternBox {
  readonly cellSize?: number;
  readonly density?: number;
  readonly seed?: number;
  readonly marks?: string;
}

/** {@link GlyphProps.cellSize} as the wall can paint it. */
export const glyphCellOf = (cell: Option.Option<number>): number =>
  Option.getOrElse(
    Option.map(
      Option.filter(
        cell,
        (value) => Number.isFinite(value) && value >= glyphMinCell,
      ),
      (value) => Math.min(Math.round(value), glyphMaxCell),
    ),
    () => glyphCell,
  );

/** {@link GlyphProps.density} as a share of the grid, or the house share. */
export const glyphDensityOf = (density: Option.Option<number>): number =>
  Option.getOrElse(
    Option.map(
      Option.filter(density, (value) => Number.isFinite(value) && value >= 0),
      (value) => Math.min(value, 1),
    ),
    () => glyphDensity,
  );

/** The marks a wall draws from: the caller's code points, or the house set. */
export const glyphMarksOf = (
  marks: Option.Option<string>,
): ReadonlyArray<string> => {
  const given = Option.match(marks, {
    onNone: () => [],
    onSome: (value) => Arr.fromIterable(value),
  });
  return Arr.match(given, {
    onEmpty: () => Arr.fromIterable(glyphMarks),
    onNonEmpty: (values) => values,
  });
};

/** The grid one cell size draws in a box. */
const gridOf = (
  box: PatternBox,
  cell: number,
): { readonly columns: number; readonly rows: number } => ({
  columns: Math.max(1, Math.floor(box.width / cell)),
  rows: Math.max(1, Math.floor(box.height / cell)),
});

/**
 * The cell size that keeps a box under the cap.
 *
 * The area estimate is enough: the cap exists to bound the nodes the wall
 * mounts, not to make a promise about the exact count, which the wall reports.
 * A box smaller than the cap keeps the caller's cell; a larger one grows it
 * rather than painting part of the wall.
 */
const cellForCap = (box: PatternBox): number =>
  Math.ceil(Math.sqrt((box.width * box.height) / glyphMaxCells));

/** One cell's place in the grid, in grid order. */
const cellAt = (
  index: number,
  columns: number,
  cell: number,
): { readonly key: string; readonly x: number; readonly y: number } => {
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    key: `${column}-${row}`,
    // A mark is painted from its cell's top-left with a small inset, so the
    // grid reads as a wall rather than a string of touching glyphs.
    x: tenth(column * cell + cell * 0.3),
    y: tenth(row * cell + cell * 0.2),
  };
};

/**
 * The glyph wall for one measured box.
 *
 * A box with no paint returns no cells, so a field that has not been laid out
 * yet paints nothing rather than a wall at the origin.
 */
export const glyphField = ({
  width,
  height,
  cellSize,
  density,
  seed,
  marks,
}: GlyphFieldOptions): GlyphField => {
  const requested = glyphCellOf(Option.fromNullishOr(cellSize));
  if (!paintableBox({ width, height })) {
    return { cell: requested, columns: 0, rows: 0, cells: [] };
  }

  const box = { width, height };
  const cell = Math.max(requested, cellForCap(box));
  const { columns, rows } = gridOf(box, cell);
  const share = glyphDensityOf(Option.fromNullishOr(density));
  const alphabet = glyphMarksOf(Option.fromNullishOr(marks));
  const value = seedOf(Option.fromNullishOr(seed));

  const cells = Arr.filterMap(Arr.range(0, columns * rows - 1), (index) => {
    // One unit decides whether the cell draws at all; the next two pick the
    // mark and the brightness, so the three choices are independent.
    if (seededUnit(value, index, 0) >= share) return Result.failVoid;
    const mark =
      alphabet[Math.floor(seededUnit(value, index, 1) * alphabet.length)];
    if (mark === undefined) return Result.failVoid;
    const place = cellAt(index, columns, cell);
    return Result.succeed({
      ...place,
      text: mark,
      opacity: tenth(glyphDim + (1 - glyphDim) * seededUnit(value, index, 2)),
    });
  });

  return { cell, columns, rows, cells };
};
