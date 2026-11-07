import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as HashMap from "effect/HashMap";
import * as Number from "effect/Number";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as R from "effect/Record";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

export const DEFAULT_MIN_COLUMN_WIDTH = 80;

export const DEFAULT_MAX_COLUMN_WIDTH = 640;

export const COLUMN_KEY_STEP = 16;

export interface ColumnDef {
  readonly id: string;

  readonly label: string;

  readonly width: number;

  readonly minWidth?: number;

  readonly maxWidth?: number;
}

export interface Column extends ColumnDef {
  readonly visible: boolean;
}

export interface ColumnState {
  readonly columns: ReadonlyArray<Column>;
}

export interface ColumnWidthBounds {
  readonly minWidth: number;
  readonly maxWidth: number;
}

const readable = (value: number, fallback: number): number =>
  globalThis.Number.isFinite(value) ? value : fallback;

export const widthBounds = (
  minWidth: number = DEFAULT_MIN_COLUMN_WIDTH,
  maxWidth: number = DEFAULT_MAX_COLUMN_WIDTH,
): ColumnWidthBounds => {
  const min = Math.max(1, readable(minWidth, DEFAULT_MIN_COLUMN_WIDTH));
  return {
    minWidth: min,
    maxWidth: Math.max(min, readable(maxWidth, DEFAULT_MAX_COLUMN_WIDTH)),
  };
};

export const columnBounds = (column: ColumnDef): ColumnWidthBounds =>
  widthBounds(column.minWidth, column.maxWidth);

export const clampWidth = (width: number, bounds: ColumnWidthBounds): number =>
  Number.clamp({ minimum: bounds.minWidth, maximum: bounds.maxWidth })(width);

export const readableWidth = (
  width: number,
  bounds: ColumnWidthBounds,
): number => (globalThis.Number.isNaN(width) ? bounds.minWidth : width);

export const clampColumnWidth = (width: number, column: ColumnDef): number =>
  clampWidth(width, columnBounds(column));

export const initialColumns = (
  defs: ReadonlyArray<ColumnDef>,
): ColumnState => ({
  columns: Arr.map(defs, (column) => ({
    ...column,
    width: clampColumnWidth(column.width, column),
    visible: true,
  })),
});

export const columnResizeKeys = ["left", "right", "home", "end"] as const;

export const ColumnResizeKey = Schema.Literals(columnResizeKeys);

export type ColumnResizeKey = typeof ColumnResizeKey.Type;

export const isColumnResizeKey = Schema.is(ColumnResizeKey);

export const resizeWidthByKey = (
  width: number,
  key: ColumnResizeKey,
  bounds: ColumnWidthBounds,
  step: number = COLUMN_KEY_STEP,
): number => {
  const by = readable(step, COLUMN_KEY_STEP);

  const from = readableWidth(width, bounds);
  return pipe(
    Match.value(key),
    Match.when("left", () => clampWidth(from - by, bounds)),
    Match.when("right", () => clampWidth(from + by, bounds)),
    Match.when("home", () => bounds.minWidth),
    Match.when("end", () => bounds.maxWidth),
    Match.exhaustive,
  );
};

export const visibleColumns = (state: ColumnState): ReadonlyArray<Column> =>
  Arr.filter(state.columns, (column) => column.visible);

export const hiddenColumns = (state: ColumnState): ReadonlyArray<string> =>
  Arr.filterMap(state.columns, (column) =>
    column.visible ? Result.failVoid : Result.succeed(column.id),
  );

export const findColumn = (
  state: ColumnState,
  id: string,
): Option.Option<Column> =>
  Arr.findFirst(state.columns, (column) => column.id === id);

export const columnWidth = (
  state: ColumnState,
  id: string,
): Option.Option<number> =>
  Option.map(findColumn(state, id), (column) => column.width);

export const isColumnVisible = (state: ColumnState, id: string): boolean =>
  pipe(
    findColumn(state, id),
    Option.match({ onNone: () => false, onSome: (column) => column.visible }),
  );

export const contentWidth = (state: ColumnState): number =>
  Arr.reduce(visibleColumns(state), 0, (total, column) => total + column.width);

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

const withColumn = (
  state: ColumnState,
  id: string,
  update: (column: Column) => Column,
): ColumnState => ({
  columns: Arr.map(state.columns, (column) =>
    column.id === id ? update(column) : column,
  ),
});

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

export const toggleColumn = (state: ColumnState, id: string): ColumnState =>
  pipe(
    findColumn(state, id),
    Option.match({
      onNone: () => state,
      onSome: (column) => setColumnVisible(state, id, !column.visible),
    }),
  );

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

export const resizeColumn = (
  state: ColumnState,
  id: string,
  width: number,
): ColumnState => {
  if (globalThis.Number.isNaN(width)) return state;
  const target = findColumn(state, id);
  if (Option.isNone(target)) return state;
  const next = clampColumnWidth(width, target.value);
  if (next === target.value.width) return state;
  return withColumn(state, id, (column) => ({ ...column, width: next }));
};

export const resetColumns = (defs: ReadonlyArray<ColumnDef>): ColumnState =>
  initialColumns(defs);

export interface ColumnConfig {
  readonly order: ReadonlyArray<string>;

  readonly hidden: ReadonlyArray<string>;

  readonly widths: Readonly<Record<string, number>>;
}

export const columnConfig = (state: ColumnState): ColumnConfig => ({
  order: Arr.map(state.columns, (column) => column.id),
  hidden: hiddenColumns(state),
  widths: R.fromEntries(
    Arr.map(state.columns, (column) => [column.id, column.width] as const),
  ),
});

const StoredColumnConfig = Schema.Record(Schema.String, Schema.Unknown);

const decodeStoredColumnConfig = Schema.decodeUnknownOption(StoredColumnConfig);

const storedField = (stored: unknown, key: string): unknown =>
  Option.match(decodeStoredColumnConfig(stored), {
    onNone: () => undefined,
    onSome: (record) => Option.getOrUndefined(R.get(record, key)),
  });

const storedIds = (stored: unknown): ReadonlyArray<string> =>
  Arr.isArray(stored) ? Arr.filter(stored, P.isString) : [];

const storedWidth = (stored: unknown, fallback: number): number =>
  P.isNumber(stored) && globalThis.Number.isFinite(stored) ? stored : fallback;

export const restoreColumns = (
  defs: ReadonlyArray<ColumnDef>,
  stored: unknown,
): ColumnState => {
  const byId = HashMap.fromIterable(
    Arr.map(defs, (column) => [column.id, column] as const),
  );
  const savedOrder = Arr.dedupe(
    Arr.filter(storedIds(storedField(stored, "order")), (id) =>
      HashMap.has(byId, id),
    ),
  );
  const rest = Arr.filter(
    Arr.map(defs, (column) => column.id),
    (id) => !Arr.contains(savedOrder, id),
  );
  const widths = Option.getOrElse(
    decodeStoredColumnConfig(storedField(stored, "widths")),
    () => ({}),
  );
  const ordered = Arr.getSomes(
    Arr.map(Arr.appendAll(savedOrder, rest), (id) => HashMap.get(byId, id)),
  );
  const withWidths: ColumnState = {
    columns: Arr.map(ordered, (column) => ({
      ...column,
      width: clampColumnWidth(
        storedWidth(
          Option.getOrUndefined(R.get(widths, column.id)),
          column.width,
        ),
        column,
      ),
      visible: true,
    })),
  };
  return Arr.reduce(
    storedIds(storedField(stored, "hidden")),
    withWidths,
    (state, id) => setColumnVisible(state, id, false),
  );
};
