/**
 * The roving-focus grid `grid-focus-lifecycle` drives.
 *
 * The inventory's *Keyboard navigation* row is `?`: the runtime has focus
 * handles, but the model a data grid, a tree or a toolbar uses — one tab stop
 * for the whole widget and arrow keys moving real focus between its cells — is
 * composed by the caller. Nothing had measured whether the parts hold in a
 * window: a Tab traversal entering at the *remembered* cell, an arrow moving
 * focus inside the widget, a `tabIndex: -1` cell still being reachable by
 * `focusElement`, and Tab leaving after one press rather than nine.
 *
 * The arithmetic is here, not in the view, so the movement rules, the tab stop
 * and the probe's expectations are one source a unit test can hold without a
 * window.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/** The ids the view and the steps share. */
export const GRID_FOCUS_IDS = {
  probe: "grid-focus-probe",
  readout: "grid-focus-readout",
  before: "grid-focus-before",
  after: "grid-focus-after",
} as const;

/** The grid's shape. A 3×3 grid is the smallest with two axes and an interior. */
export const GRID_COLUMNS = 3;
export const GRID_ROWS = 3;

/** How many cells the grid holds. */
export const GRID_CELL_COUNT = GRID_COLUMNS * GRID_ROWS;

/** A cell's id. Row and column are both in the id, so a readout names its cell. */
export const cellId = (row: number, column: number): string =>
  `gridfocus-r${row}c${column}`;

/** A cell's position in the grid. */
export interface GridPosition {
  readonly row: number;
  readonly column: number;
}

/** The cell at an index, row-major. */
export const positionOf = (index: number): GridPosition => ({
  row: Math.floor(index / GRID_COLUMNS),
  column: index % GRID_COLUMNS,
});

/** The index of a cell. */
export const indexOf = (position: GridPosition): number =>
  position.row * GRID_COLUMNS + position.column;

/** Every cell, in tab order. */
export const GRID_CELLS: ReadonlyArray<number> = Arr.makeBy(
  GRID_CELL_COUNT,
  (index) => index,
);

/** The keys the grid's own handler answers. */
export const GridKey = Schema.Literals([
  "left",
  "right",
  "up",
  "down",
  "home",
  "end",
]);

/** The keys the grid's own handler answers. */
export type GridKey = typeof GridKey.Type;

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

/**
 * Where a key moves the roving cell.
 *
 * Arrows **clamp** at the grid's edges rather than wrapping, and `Home`/`End`
 * go to the row's first and last column: a grid whose `Right` at a row's end
 * jumped to the next row would move a reader two cells for one press, and the
 * window is the only place the delivered key and the moved focus can be read
 * together.
 */
export const moveIndex = (index: number, key: GridKey): number => {
  const { row, column } = positionOf(index);
  return Match.value(key).pipe(
    Match.when("left", () =>
      indexOf({ row, column: clamp(column - 1, 0, GRID_COLUMNS - 1) }),
    ),
    Match.when("right", () =>
      indexOf({ row, column: clamp(column + 1, 0, GRID_COLUMNS - 1) }),
    ),
    Match.when("up", () =>
      indexOf({ row: clamp(row - 1, 0, GRID_ROWS - 1), column }),
    ),
    Match.when("down", () =>
      indexOf({ row: clamp(row + 1, 0, GRID_ROWS - 1), column }),
    ),
    Match.when("home", () => indexOf({ row, column: 0 })),
    Match.when("end", () => indexOf({ row, column: GRID_COLUMNS - 1 })),
    Match.exhaustive,
  );
};

/**
 * A cell's `tabIndex`: the remembered cell is the widget's one tab stop, and
 * every other cell is focusable only through the app's own `focusElement`.
 */
export const tabIndexOf = (index: number, roving: number): number =>
  index === roving ? 0 : -1;

/** The index a `key` string names, if the grid answers it. */
export const gridKeyOf = (key: string): Option.Option<GridKey> =>
  Option.filter(Option.some(key), Schema.is(GridKey));

/** The app state the view keeps and the readout prints. */
export class GridFocusReadout extends Schema.Class<GridFocusReadout>(
  "GridFocusReadout",
)({
  roving: Schema.Int,
  activations: Schema.Int,
}) {}

/** The readout's one-line form: `roving=r0c1 activations=0`. */
export const formatReadout = (readout: GridFocusReadout): string =>
  `roving=r${positionOf(readout.roving).row}c${positionOf(readout.roving).column} activations=${readout.activations}`;

/** The readout's initial state: cell zero, nothing activated. */
export const initialReadout = new GridFocusReadout({
  roving: 0,
  activations: 0,
});

/** The cells a window's Tab traversal visits when the grid is one stop. */
export const tabStops = (roving: number): ReadonlyArray<string> => [
  GRID_FOCUS_IDS.before,
  cellId(positionOf(roving).row, positionOf(roving).column),
  GRID_FOCUS_IDS.after,
];

/**
 * How many checks the probe asserts, derived from the model it measures.
 *
 * The readout's two states, the traversal's entries and exits, the nine moves
 * (both clamps included), the press and the two programmatic focuses.
 */
export const GRID_FOCUS_CHECKS = 20;
