import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import { seededUnit, seedOf, tenth } from "../internal/scatter.js";
import { paintableBox, type PatternBox } from "../internal/svg-pattern.js";

export const glyphCell = 22;

export const glyphMinCell = 10;
export const glyphMaxCell = 72;

export const glyphMaxCells = 240;

export const glyphDensity = 0.55;

export const glyphDim = 0.3;

export const glyphMarks = ".+*/\\<>[]{}~";

export const glyphSeed = 1;

export interface GlyphCell {
  readonly key: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly opacity: number;
}

export interface GlyphField {
  readonly cell: number;
  readonly columns: number;
  readonly rows: number;
  readonly cells: ReadonlyArray<GlyphCell>;
}

export interface GlyphFieldOptions extends PatternBox {
  readonly cellSize?: number;
  readonly density?: number;
  readonly seed?: number;
  readonly marks?: string;
}

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

export const glyphDensityOf = (density: Option.Option<number>): number =>
  Option.getOrElse(
    Option.map(
      Option.filter(density, (value) => Number.isFinite(value) && value >= 0),
      (value) => Math.min(value, 1),
    ),
    () => glyphDensity,
  );

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

const gridOf = (
  box: PatternBox,
  cell: number,
): { readonly columns: number; readonly rows: number } => ({
  columns: Math.max(1, Math.floor(box.width / cell)),
  rows: Math.max(1, Math.floor(box.height / cell)),
});

const cellForCap = (box: PatternBox): number =>
  Math.max(
    Math.ceil(Math.sqrt((box.width * box.height) / glyphMaxCells)),
    Math.ceil(box.width / glyphMaxCells),
    Math.ceil(box.height / glyphMaxCells),
  );

const cellAt = (
  index: number,
  columns: number,
  cell: number,
): { readonly key: string; readonly x: number; readonly y: number } => {
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    key: `${column}-${row}`,

    x: tenth(column * cell + cell * 0.3),
    y: tenth(row * cell + cell * 0.2),
  };
};

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
