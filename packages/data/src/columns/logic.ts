/**
 * Column configuration, as pure data over one ordered column list.
 *
 * The rules are the ones two window probes measured (`table-columns-lifecycle`,
 * `column-resize-lifecycle`):
 *
 * - hiding a column takes its width out of the content and shifts every later
 *   column by exactly that width — the header and the cells read one list;
 * - a move changes the order and not the width;
 * - a resize is clamped to the column's own bounds, and the width is read at
 *   each press so a second gesture starts where the first ended.
 *
 * A column list is one source for the header and every row. Rendering either
 * side from a second copy is how a grid drifts, so nothing here paints: the
 * parts read {@link visibleColumns} and each column's `width`.
 *
 * Pinned columns are **not** here. The runtime paints no `position: "sticky"`,
 * so a frozen column is the measured two-pane composition
 * (`data-grid-frozen-column`) rather than an order flag; plan 610's remaining
 * frozen-column row owns it. Ordering a column to an edge is not the same
 * feature and is not offered here as one.
 *
 * Nothing in this module imports React: an Effect-driven or store-driven grid
 * reads the same reducers the `useColumns` hook does.
 */

import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Number from "effect/Number";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/** The narrowest a column may become when its definition names no minimum. */
export const DEFAULT_MIN_COLUMN_WIDTH = 80;

/** The widest a column may become when its definition names no maximum. */
export const DEFAULT_MAX_COLUMN_WIDTH = 640;

/** How far one arrow key moves a focused divider. */
export const COLUMN_KEY_STEP = 16;

/** What a caller declares about one column. */
export interface ColumnDef {
  /** The stable identity a resize, a move and a visibility change address. */
  readonly id: string;
  /** The visible label, also the base of the column's accessible names. */
  readonly label: string;
  /** The track width, in pixels. */
  readonly width: number;
  /** The narrowest width a resize may reach. Defaults to 80. */
  readonly minWidth?: number;
  /** The widest width a resize may reach. Defaults to 640. */
  readonly maxWidth?: number;
}

/** A column as the grid holds it: its definition plus its visibility. */
export interface Column extends ColumnDef {
  readonly visible: boolean;
}

/** The configured columns, in paint order. */
export interface ColumnState {
  readonly columns: ReadonlyArray<Column>;
}

/** The bounds a column's width stays inside. */
export interface ColumnWidthBounds {
  readonly minWidth: number;
  readonly maxWidth: number;
}

/**
 * The bounds a width may move between.
 *
 * A maximum below the minimum is raised to the minimum rather than inverted: a
 * definition with no legal width is a caller mistake, and a clamp that swaps
 * its bounds would resize in the direction opposite to the drag.
 */
export const widthBounds = (
  minWidth: number = DEFAULT_MIN_COLUMN_WIDTH,
  maxWidth: number = DEFAULT_MAX_COLUMN_WIDTH,
): ColumnWidthBounds => {
  const min = Math.max(1, minWidth);
  return { minWidth: min, maxWidth: Math.max(min, maxWidth) };
};

/** A column's own bounds, with the defaults applied. */
export const columnBounds = (column: ColumnDef): ColumnWidthBounds =>
  widthBounds(column.minWidth, column.maxWidth);

/** `width` clamped to `bounds`, inclusively. */
export const clampWidth = (width: number, bounds: ColumnWidthBounds): number =>
  Number.clamp({ minimum: bounds.minWidth, maximum: bounds.maxWidth })(width);

/** `width` clamped to the column's own bounds. */
export const clampColumnWidth = (width: number, column: ColumnDef): number =>
  clampWidth(width, columnBounds(column));

/**
 * The configured columns from their definitions.
 *
 * Every column starts visible, and a width outside its own bounds is clamped
 * once here so a later resize starts from a legal track.
 */
export const initialColumns = (
  defs: ReadonlyArray<ColumnDef>,
): ColumnState => ({
  columns: Arr.map(defs, (column) => ({
    ...column,
    width: clampColumnWidth(column.width, column),
    visible: true,
  })),
});

/** The keys a focused divider answers, in the order a keyboard tries them. */
export const columnResizeKeys = ["left", "right", "home", "end"] as const;

/** One key a focused divider answers. */
export const ColumnResizeKey = Schema.Literals(columnResizeKeys);

/** One key a focused divider answers. */
export type ColumnResizeKey = typeof ColumnResizeKey.Type;

/** Whether a key event belongs to a divider, so an unrelated key passes on. */
export const isColumnResizeKey = Schema.is(ColumnResizeKey);

/**
 * The width a key produces: the arrows step by `step`, Home and End name the
 * bounds themselves, and every route clamps because a keyboard reader can hold
 * an arrow against a bound exactly as a pointer can drag past it.
 */
export const resizeWidthByKey = (
  width: number,
  key: ColumnResizeKey,
  bounds: ColumnWidthBounds,
  step: number = COLUMN_KEY_STEP,
): number =>
  pipe(
    Match.value(key),
    Match.when("left", () => clampWidth(width - step, bounds)),
    Match.when("right", () => clampWidth(width + step, bounds)),
    Match.when("home", () => bounds.minWidth),
    Match.when("end", () => bounds.maxWidth),
    Match.exhaustive,
  );

/** The columns that paint, in order. */
export const visibleColumns = (state: ColumnState): ReadonlyArray<Column> =>
  Arr.filter(state.columns, (column) => column.visible);

/** The column a key names, when it is in the list. */
export const findColumn = (
  state: ColumnState,
  id: string,
): Option.Option<Column> =>
  Arr.findFirst(state.columns, (column) => column.id === id);

/** A column's configured width, whether or not it is visible. */
export const columnWidth = (
  state: ColumnState,
  id: string,
): Option.Option<number> =>
  Option.map(findColumn(state, id), (column) => column.width);

/** Whether a column paints. */
export const isColumnVisible = (state: ColumnState, id: string): boolean =>
  pipe(
    findColumn(state, id),
    Option.match({ onNone: () => false, onSome: (column) => column.visible }),
  );

/** The width the painted content needs: the sum of the visible tracks. */
export const contentWidth = (state: ColumnState): number =>
  Arr.reduce(visibleColumns(state), 0, (total, column) => total + column.width);

/** The left edge of a column inside the content, while it paints. */
export const columnOffset = (
  state: ColumnState,
  id: string,
): Option.Option<number> =>
  pipe(
    visibleColumns(state),
    Arr.findFirstIndex((column) => column.id === id),
    Option.map((at) =>
      Arr.reduce(
        Arr.take(visibleColumns(state), at),
        0,
        (total, column) => total + column.width,
      ),
    ),
  );

/** Replace one column, leaving the order and every other column alone. */
const withColumn = (
  state: ColumnState,
  id: string,
  update: (column: Column) => Column,
): ColumnState => ({
  columns: Arr.map(state.columns, (column) =>
    column.id === id ? update(column) : column,
  ),
});

/**
 * Show or hide a column.
 *
 * The last visible column cannot be hidden: a grid with no track paints a
 * header with no cells, which is a state no reader can leave through the same
 * menu. The call returns the state unchanged, so a caller holding a checkbox
 * never paints a control that claims a change it did not make.
 */
export const setColumnVisible = (
  state: ColumnState,
  id: string,
  visible: boolean,
): ColumnState => {
  const target = findColumn(state, id);
  if (Option.isNone(target)) return state;
  const current = target.value;
  if (current.visible === visible) return state;
  if (!visible && visibleColumns(state).length <= 1) return state;
  return withColumn(state, id, (column) => ({ ...column, visible }));
};

/** Flip a column's visibility, refusing to hide the last visible one. */
export const toggleColumn = (state: ColumnState, id: string): ColumnState =>
  pipe(
    findColumn(state, id),
    Option.match({
      onNone: () => state,
      onSome: (column) => setColumnVisible(state, id, !column.visible),
    }),
  );

/**
 * Move a column `delta` visible places through the order, clamped at both ends.
 *
 * The step is measured over the columns a reader can see: a hidden column
 * between two visible ones must not turn a press into a no-op. A multi-place
 * move shifts every column it steps over, so `name` moves *after* the two
 * columns a `+2` crosses rather than trading places with the second. Hidden
 * columns keep the slots they occupied, so restoring one returns it to the
 * reader's order instead of the moved column's edge. The widths move with
 * their columns and the content width is unchanged — a move is an order
 * change, not a resize.
 */
export const moveColumn = (
  state: ColumnState,
  id: string,
  delta: number,
): ColumnState => {
  const visible = visibleColumns(state);
  const fromVisible = Arr.findFirstIndex(visible, (column) => column.id === id);
  if (Option.isNone(fromVisible)) return state;
  const toVisible = Math.max(
    0,
    Math.min(visible.length - 1, fromVisible.value + delta),
  );
  if (toVisible === fromVisible.value) return state;
  const nextVisible = Option.flatMap(
    Arr.get(visible, fromVisible.value),
    (column) =>
      Arr.insertAt(Arr.remove(visible, fromVisible.value), toVisible, column),
  );
  if (Option.isNone(nextVisible)) return state;
  const visibleSlots = Arr.reduce(
    state.columns,
    Arr.empty<number>(),
    (slots, column, index) =>
      column.visible ? Arr.append(slots, index) : slots,
  );
  return {
    columns: Arr.map(state.columns, (column, index) =>
      Option.match(
        Option.flatMap(
          Arr.findFirstIndex(visibleSlots, (slot) => slot === index),
          (rank) => Arr.get(nextVisible.value, rank),
        ),
        { onNone: () => column, onSome: (next) => next },
      ),
    ),
  };
};

/**
 * Resize a column, clamped to its own bounds.
 *
 * The clamp is the column's, not a table-wide constant: a `width` column and a
 * `status` column need different floors, and a definition supplies both.
 */
export const resizeColumn = (
  state: ColumnState,
  id: string,
  width: number,
): ColumnState => {
  const target = findColumn(state, id);
  if (Option.isNone(target)) return state;
  const next = clampColumnWidth(width, target.value);
  if (next === target.value.width) return state;
  return withColumn(state, id, (column) => ({ ...column, width: next }));
};

/** Return every column to its definition: order, visibility and width. */
export const resetColumns = (defs: ReadonlyArray<ColumnDef>): ColumnState =>
  initialColumns(defs);
