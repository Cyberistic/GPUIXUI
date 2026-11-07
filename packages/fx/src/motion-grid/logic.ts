import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export const motionGridColumnCount = 3;

export const motionGridCellWidth = 160;

export const motionGridRowHeight = 120;

export const motionGridGap = 12;

const isCell = <Cell extends { readonly id: string }>(
  entry: unknown,
): entry is Cell => {
  if (typeof entry !== "object" || entry === null || !("id" in entry)) {
    return false;
  }
  const id = entry.id;
  return typeof id === "string" && id.trim().length > 0;
};

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
  readonly columns: number;

  readonly cellWidth: number;

  readonly rowHeight: number;

  readonly gap: number;
}

export interface MotionGridOptions {
  readonly columns: Option.Option<number>;
  readonly cellWidth: Option.Option<number>;
  readonly rowHeight: Option.Option<number>;
  readonly gap: Option.Option<number>;
}

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

const columnCount = (value: Option.Option<number>): number =>
  Option.match(value, {
    onNone: () => motionGridColumnCount,
    onSome: (next) =>
      Number.isFinite(next)
        ? Math.max(1, Math.floor(next))
        : motionGridColumnCount,
  });

export const motionGridLayout = (
  options: MotionGridOptions,
): MotionGridLayout => ({
  columns: columnCount(options.columns),
  cellWidth: wholePixels(options.cellWidth, motionGridCellWidth, 1),
  rowHeight: wholePixels(options.rowHeight, motionGridRowHeight, 1),
  gap: wholePixels(options.gap, motionGridGap, 0),
});

export const motionGridRows = (count: number, columns: number): number =>
  count <= 0 ? 0 : Math.ceil(count / columns);

export const motionGridWidth = (layout: MotionGridLayout): number =>
  layout.columns * layout.cellWidth + (layout.columns - 1) * layout.gap;

export const motionGridHeight = (
  layout: MotionGridLayout,
  rows: number,
): number =>
  rows <= 0 ? 0 : rows * layout.rowHeight + (rows - 1) * layout.gap;

export interface MotionGridSlot {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

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
