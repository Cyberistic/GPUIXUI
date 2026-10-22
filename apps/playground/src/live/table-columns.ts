/**
 * The configurable grid `table-columns-lifecycle` drives, and the rules a column
 * menu owes.
 *
 * Tier 3's **column configuration** row is `grid tracks + a menu`: the runtime
 * has no table element, so a grid is rows of cells the app lays out and the
 * column order is app state. What the app owns is the consequence of hiding,
 * restoring or moving a column — the content width and every later column's `x`
 * shift, the `x` a pointer lands on, and the one column list the header and every
 * row must read or they drift apart. The horizontal end is a rule too, but the
 * renderer enforces it: a shrinking scroller clamps its own offset.
 *
 * The arithmetic lives here rather than in the view, so it is testable on a host
 * with no binding, as `table-filter.ts` and `workspace-restore.ts` are.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** The width every row gives a column, keyed by the column it names. */
export const COLUMN_SIZES = {
  name: 120,
  status: 80,
  owner: 160,
  updated: 100,
  size: 140,
  kind: 90,
} as const;

/** A column's id: the key of the width it occupies. */
export type ColumnId = keyof typeof COLUMN_SIZES;

/** The order the grid opens with, left to right. */
export const COLUMN_ORDER = [
  "name",
  "status",
  "owner",
  "updated",
  "size",
  "kind",
] as const satisfies ReadonlyArray<ColumnId>;

/** The viewport the grid scrolls in, its row height and the rows it holds. */
export const COLUMN_VIEWPORT_WIDTH = 360;
export const COLUMN_VIEWPORT_HEIGHT = 240;
export const COLUMN_ROW_HEIGHT = 28;
export const COLUMN_ROWS = 40;

/** Every row index, in table order. */
export const COLUMN_ROW_INDEXES = Arr.range(0, COLUMN_ROWS - 1);

/** The `testId`s the view and the steps share, so a probe cannot address a ghost. */
export const COLUMN_IDS = {
  probe: "columns-probe",
  grid: "columns-grid",
  readout: "columns-readout",
  hide: (id: ColumnId): string => `columns-hide-${id}`,
  move: (id: ColumnId): string => `columns-move-${id}`,
  header: (id: ColumnId): string => `columns-header-${id}`,
  cell: (row: number, id: ColumnId): string => `columns-cell-${row}-${id}`,
} as const;

/** The width `id` occupies in every row. */
export const columnWidth = (id: ColumnId): number => COLUMN_SIZES[id];

/** The columns a hidden set leaves, in the configured order. */
export const visibleColumns = (
  order: ReadonlyArray<ColumnId>,
  hidden: ReadonlyArray<ColumnId>,
): ReadonlyArray<ColumnId> =>
  Arr.filter(order, (id) => !Arr.contains(hidden, id));

/** The width the whole content needs: the sum of the visible columns. */
export const contentWidth = (visible: ReadonlyArray<ColumnId>): number =>
  Arr.reduce(visible, 0, (total, id) => total + columnWidth(id));

/** The left edge of `id` inside the content, or `None` while it is hidden. */
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

/**
 * The furthest left the grid can pan, as the negative offset the renderer holds.
 *
 * A content narrower than the viewport cannot scroll, so the end is `0` rather
 * than a positive offset. Measured in a window: when a hide shrinks the content
 * under a panned offset, the renderer clamps the offset to this end itself and
 * reports the new pair through `onScrollChange`, so the grid does not call
 * `scrollTo` — it only has to know where the end now is.
 */
export const maxOffsetX = (width: number): number =>
  Math.min(0, COLUMN_VIEWPORT_WIDTH - width);

/**
 * `id` moved `delta` places through `order`, clamped at either end.
 *
 * A column move is an order change, not a width change, so the content width is
 * the same before and after and only the `x` every column reads moves.
 */
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

/** The selection label a readout prints. */
export const selectionLabel = (selected: Option.Option<number>): string =>
  Option.match(selected, {
    onNone: () => "none",
    onSome: (row) => `r${row}`,
  });

/** The readout a window paints. */
export const columnsReadout = (
  visible: ReadonlyArray<ColumnId>,
  offset: { readonly x: number; readonly y: number },
  selected: Option.Option<number>,
): string =>
  `cols=${Arr.join(visible, ",")} width=${contentWidth(visible)} offset=${offset.x},${offset.y} selected=${selectionLabel(selected)}`;

/** The label a cell paints: its column and its row. */
export const cellLabel = (row: number, id: ColumnId): string => `${id} ${row}`;
