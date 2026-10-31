/**
 * MotionGrid's rules: which slot a cell sits in, and how big the frame is.
 *
 * A cell is placed **absolutely** so the runtime can tween it from one slot to
 * another — the runtime has no `transform` (upstream issue #102), so a reorder
 * moves a cell's `left`/`top` inset rather than translating a layer. The cost of
 * absolute placement is that no cell sizes its own row, so the cell size is the
 * caller's and the frame is arithmetic over it: the grid has the same box before
 * and after a reorder, and a slot never depends on what a cell paints.
 *
 * Every measure is a whole number of pixels. The runtime lays cells out on a
 * pixel grid, and a fractional cell width leaves a seam between two cells whose
 * painted widths no longer add up to the frame.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** The columns a grid uses when the caller names none. */
export const motionGridColumnCount = 3;

/** The width of one cell, in pixels, when the caller names none. */
export const motionGridCellWidth = 160;

/** The height of one row, in pixels, when the caller names none. */
export const motionGridRowHeight = 120;

/** The space between two columns and between two rows, in pixels. */
export const motionGridGap = 12;

/**
 * Whether a stored entry is a cell: an object naming itself with a text id.
 *
 * The id is the cell's key — the element a reorder keeps so its slot change
 * tweens instead of remounting — so an entry without one is not a cell. Nothing
 * else is read here: a cell's content is a React node, which no structural read
 * can describe.
 */
const isCell = <Cell extends { readonly id: string }>(
  entry: unknown,
): entry is Cell => {
  if (typeof entry !== "object" || entry === null || !("id" in entry)) {
    return false;
  }
  const id = entry.id;
  return typeof id === "string" && id.trim().length > 0;
};

/**
 * The cells a caller's list carries, read at the boundary.
 *
 * A grid is composed in code as often as it is restored with a saved layout,
 * and JSON writes `null` for a list a record never carried: `Arr.length` and
 * `items.map` over that value threw before a cell painted. Only a real list is a
 * list, and an entry that does not name itself is dropped while its neighbours
 * paint, so one malformed record cannot take the frame down; an empty list
 * paints the empty frame.
 */
export const itemsOf = <Cell extends { readonly id: string }>(
  value: ReadonlyArray<Cell> | null | undefined,
): ReadonlyArray<Cell> => {
  const list = Option.getOrElse(
    Option.filter(Option.fromNullishOr(value), (entries): boolean =>
      Arr.isArray(entries),
    ),
    () => [],
  );
  return Arr.filter(list, isCell);
};

export interface MotionGridLayout {
  /** Columns across the frame; at least one. */
  readonly columns: number;
  /** The painted width of one cell, in pixels. */
  readonly cellWidth: number;
  /** The painted height of one row, in pixels. */
  readonly rowHeight: number;
  /** The gap between two columns and between two rows, in pixels. */
  readonly gap: number;
}

/** The caller's measures, as the component received them. */
export interface MotionGridOptions {
  readonly columns: Option.Option<number>;
  readonly cellWidth: Option.Option<number>;
  readonly rowHeight: Option.Option<number>;
  readonly gap: Option.Option<number>;
}

/**
 * A caller's whole-pixel measure, or the house value.
 *
 * A value that cannot be laid out (`NaN`, an infinity) falls back to the house
 * value rather than reaching the runtime as `null`, and a negative one is held
 * at `floor` — a cell of no width paints nothing while still taking a tween.
 */
const wholePixels = (
  value: Option.Option<number>,
  house: number,
  floor: number,
): number =>
  Option.match(value, {
    onNone: () => house,
    onSome: (next) =>
      Number.isFinite(next) ? Math.max(floor, Math.round(next)) : house,
  });

/** The column count: a count, so it is floored, and always at least one. */
const columnCount = (value: Option.Option<number>): number =>
  Option.match(value, {
    onNone: () => motionGridColumnCount,
    onSome: (next) =>
      Number.isFinite(next)
        ? Math.max(1, Math.floor(next))
        : motionGridColumnCount,
  });

/** The layout the four caller measures resolve to. */
export const motionGridLayout = (
  options: MotionGridOptions,
): MotionGridLayout => ({
  columns: columnCount(options.columns),
  cellWidth: wholePixels(options.cellWidth, motionGridCellWidth, 1),
  rowHeight: wholePixels(options.rowHeight, motionGridRowHeight, 1),
  gap: wholePixels(options.gap, motionGridGap, 0),
});

/** How many rows `count` cells need, before the last row is filled. */
export const motionGridRows = (count: number, columns: number): number =>
  count <= 0 ? 0 : Math.ceil(count / columns);

/** The frame's width: every column plus the gaps between them. */
export const motionGridWidth = (layout: MotionGridLayout): number =>
  layout.columns * layout.cellWidth + (layout.columns - 1) * layout.gap;

/** The frame's height: every row plus the gaps between them; zero when empty. */
export const motionGridHeight = (
  layout: MotionGridLayout,
  rows: number,
): number =>
  rows <= 0 ? 0 : rows * layout.rowHeight + (rows - 1) * layout.gap;

/** One cell's inset box inside the frame. */
export interface MotionGridSlot {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Where the cell at `index` sits: left to right, then the next row.
 *
 * The cell after the last column wraps to the start of the next row, which is
 * the movement a reorder or a filter asks the runtime to tween.
 */
export const motionGridSlot = (
  layout: MotionGridLayout,
  index: number,
): MotionGridSlot => {
  const column = index % layout.columns;
  const row = Math.floor(index / layout.columns);
  return {
    left: column * (layout.cellWidth + layout.gap),
    top: row * (layout.rowHeight + layout.gap),
    width: layout.cellWidth,
    height: layout.rowHeight,
  };
};
