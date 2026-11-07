import { Order } from "effect";
import * as Arr from "effect/Array";
import * as Str from "effect/String";

export interface TableRow {
  readonly n: number;
  readonly name: string;
  readonly status: "ready" | "idle";
  readonly size: number;
}

export type TableColumn = "name" | "size";

export interface TableSort {
  readonly column: TableColumn;
  readonly descending: boolean;
}

export const TABLE_SORT: TableSort = { column: "name", descending: false };

export const COLUMN_WIDTH = { name: 160, size: 120, status: 100 } as const;
export const TABLE_WIDTH = 300;

export const TABLE_X_RANGE = 80;
export const TABLE_HEIGHT = 200;
export const TABLE_HEADER_HEIGHT = 32;
export const TABLE_ROW_HEIGHT = 28;
export const TABLE_ROWS = 60;

export const TABLE_Y_RANGE = TABLE_ROWS * TABLE_ROW_HEIGHT - TABLE_HEIGHT;

const sizeOf = (n: number): number => 16 + ((n + 2) % 7) * 8;

export const tableRows: ReadonlyArray<TableRow> = Arr.map(
  Arr.range(0, TABLE_ROWS - 1),
  (n) => ({
    n,
    name: `Item ${Str.padStart(3, "0")(`${n}`)}`,
    status: n % 3 === 0 ? "ready" : "idle",
    size: sizeOf(n),
  }),
);

const byName: Order.Order<TableRow> = Order.mapInput(
  Order.String,
  (row: TableRow) => row.name,
);

const bySize: Order.Order<TableRow> = Order.mapInput(
  Order.Number,
  (row: TableRow) => row.size,
);

const byRecord: Order.Order<TableRow> = Order.mapInput(
  Order.Number,
  (row: TableRow) => row.n,
);

export const sortTable = (sort: TableSort): ReadonlyArray<TableRow> => {
  const primary = sort.column === "name" ? byName : bySize;
  const ordered = sort.descending
    ? Order.combine((left, right) => primary(right, left), byRecord)
    : Order.combine(primary, byRecord);
  return Arr.sort(tableRows, ordered);
};

export const toggleSort = (
  current: TableSort,
  column: TableColumn,
): TableSort =>
  current.column === column
    ? { column, descending: !current.descending }
    : { column, descending: false };

export const sortLabel = (sort: TableSort): string =>
  `${sort.column}-${sort.descending ? "desc" : "asc"}`;
