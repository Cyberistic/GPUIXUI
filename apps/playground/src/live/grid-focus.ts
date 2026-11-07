import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export const GRID_FOCUS_IDS = {
  probe: "grid-focus-probe",
  readout: "grid-focus-readout",
  before: "grid-focus-before",
  after: "grid-focus-after",
} as const;

export const GRID_COLUMNS = 3;
export const GRID_ROWS = 3;

export const GRID_CELL_COUNT = GRID_COLUMNS * GRID_ROWS;

export const cellId = (row: number, column: number): string =>
  `gridfocus-r${row}c${column}`;

export interface GridPosition {
  readonly row: number;
  readonly column: number;
}

export const positionOf = (index: number): GridPosition => ({
  row: Math.floor(index / GRID_COLUMNS),
  column: index % GRID_COLUMNS,
});

export const indexOf = (position: GridPosition): number =>
  position.row * GRID_COLUMNS + position.column;

export const GRID_CELLS: ReadonlyArray<number> = Arr.makeBy(
  GRID_CELL_COUNT,
  (index) => index,
);

export const GridKey = Schema.Literals([
  "left",
  "right",
  "up",
  "down",
  "home",
  "end",
]);

export type GridKey = typeof GridKey.Type;

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

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

export const tabIndexOf = (index: number, roving: number): number =>
  index === roving ? 0 : -1;

export const gridKeyOf = (key: string): Option.Option<GridKey> =>
  Option.filter(Option.some(key), Schema.is(GridKey));

export class GridFocusReadout extends Schema.Class<GridFocusReadout>(
  "GridFocusReadout",
)({
  roving: Schema.Int,
  activations: Schema.Int,
}) {}

export const formatReadout = (readout: GridFocusReadout): string =>
  `roving=r${positionOf(readout.roving).row}c${positionOf(readout.roving).column} activations=${readout.activations}`;

export const initialReadout = new GridFocusReadout({
  roving: 0,
  activations: 0,
});

export const tabStops = (roving: number): ReadonlyArray<string> => [
  GRID_FOCUS_IDS.before,
  cellId(positionOf(roving).row, positionOf(roving).column),
  GRID_FOCUS_IDS.after,
];

export const GRID_FOCUS_CHECKS = 20;
