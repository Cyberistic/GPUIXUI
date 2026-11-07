import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export const COLUMN_SIZES = {
  name: 120,
  status: 80,
  owner: 160,
  updated: 100,
  size: 140,
  kind: 90,
} as const;

export type ColumnId = keyof typeof COLUMN_SIZES;

export const COLUMN_ORDER = [
  "name",
  "status",
  "owner",
  "updated",
  "size",
  "kind",
] as const satisfies ReadonlyArray<ColumnId>;

export const COLUMN_VIEWPORT_WIDTH = 360;
export const COLUMN_VIEWPORT_HEIGHT = 240;
export const COLUMN_ROW_HEIGHT = 28;
export const COLUMN_ROWS = 40;

export const COLUMN_ROW_INDEXES = Arr.range(0, COLUMN_ROWS - 1);

export const COLUMN_IDS = {
  probe: "columns-probe",
  grid: "columns-grid",
  readout: "columns-readout",
  hide: (id: ColumnId): string => `columns-hide-${id}`,
  move: (id: ColumnId): string => `columns-move-${id}`,
  header: (id: ColumnId): string => `columns-header-${id}`,
  cell: (row: number, id: ColumnId): string => `columns-cell-${row}-${id}`,
} as const;

export const columnWidth = (id: ColumnId): number => COLUMN_SIZES[id];

export const visibleColumns = (
  order: ReadonlyArray<ColumnId>,
  hidden: ReadonlyArray<ColumnId>,
): ReadonlyArray<ColumnId> =>
  Arr.filter(order, (id) => !Arr.contains(hidden, id));

export const contentWidth = (visible: ReadonlyArray<ColumnId>): number =>
  Arr.reduce(visible, 0, (total, id) => total + columnWidth(id));

export const columnOffset = (
  visible: ReadonlyArray<ColumnId>,
  id: ColumnId,
): Option.Option<number> =>
  Option.map(
    Arr.findFirstIndex(visible, (column) => column === id),
    (at) =>
      Arr.reduce(
        Arr.take(visible, at),
        0,
        (total, column) => total + columnWidth(column),
      ),
  );

export const maxOffsetX = (width: number): number =>
  Math.min(0, COLUMN_VIEWPORT_WIDTH - width);

export const moveColumn = (
  order: ReadonlyArray<ColumnId>,
  id: ColumnId,
  delta: number,
): ReadonlyArray<ColumnId> =>
  Option.match(
    Arr.findFirstIndex(order, (column) => column === id),
    {
      onNone: () => order,
      onSome: (at) => {
        const to = Math.min(order.length - 1, Math.max(0, at + delta));
        const without = Arr.remove(order, at);
        return Option.getOrElse(Arr.insertAt(without, to, id), () => without);
      },
    },
  );

export const selectionLabel = (selected: Option.Option<number>): string =>
  Option.match(selected, {
    onNone: () => "none",
    onSome: (row) => `r${row}`,
  });

export const columnsReadout = (
  visible: ReadonlyArray<ColumnId>,
  offset: { readonly x: number; readonly y: number },
  selected: Option.Option<number>,
): string =>
  `cols=${Arr.join(visible, ",")} width=${contentWidth(visible)} offset=${offset.x},${offset.y} selected=${selectionLabel(selected)}`;

export const cellLabel = (row: number, id: ColumnId): string => `${id} ${row}`;
