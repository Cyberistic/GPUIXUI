/**
 * The table the `table-lifecycle` probe paints and sorts.
 *
 * Tier 3's table does not exist yet, so the probe composes one from what a data
 * grid has: fixed-width cells in flex rows, a header sibling above the row
 * scroller, and one shared horizontal offset. The two interactions MISSION
 * names for a table — sort and selection — are measured there in a window.
 *
 * Kept native-free so the premise the paint checks rest on is testable on a host
 * with no binding, as `list.ts` is: a header press is only a measurement if the
 * name order and the size order disagree, and "the first row after a size sort"
 * has to be a record the probe names rather than arithmetic it repeats.
 */
import { Order } from "effect";
import * as Arr from "effect/Array";
import * as Str from "effect/String";

/** One table row: the record the cells paint and the number they sort by. */
export interface TableRow {
  readonly n: number;
  readonly name: string;
  readonly status: "ready" | "idle";
  readonly size: number;
}

/** The column a header press sorts by. */
export type TableColumn = "name" | "size";

/** The table's order: which column, and which way. */
export interface TableSort {
  readonly column: TableColumn;
  readonly descending: boolean;
}

/** The order the table mounts in. */
export const TABLE_SORT: TableSort = { column: "name", descending: false };

/** The column widths; together they overflow the viewport by 80px. */
export const COLUMN_WIDTH = { name: 160, size: 120, status: 100 } as const;
export const TABLE_WIDTH = 300;
/** `sum(COLUMN_WIDTH) - TABLE_WIDTH`, the horizontal travel a wheel has. */
export const TABLE_X_RANGE = 80;
export const TABLE_HEIGHT = 200;
export const TABLE_HEADER_HEIGHT = 32;
export const TABLE_ROW_HEIGHT = 28;
export const TABLE_ROWS = 60;
/** `TABLE_ROWS * TABLE_ROW_HEIGHT - TABLE_HEIGHT`, the offset both ends clamp at. */
export const TABLE_Y_RANGE = TABLE_ROWS * TABLE_ROW_HEIGHT - TABLE_HEIGHT;

/**
 * A byte count that cycles 16…64 by 8, rotated by two so the size order is not
 * a name order in either direction: the smallest row is `Item 005` and the
 * largest is `Item 004`, while the name order starts at `Item 000`.
 */
const sizeOf = (n: number): number => 16 + ((n + 2) % 7) * 8;

/** The rows in mount order, which is also name order. */
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

/** Ties break by record, ascending, in both directions. */
const byRecord: Order.Order<TableRow> = Order.mapInput(
  Order.Number,
  (row: TableRow) => row.n,
);

/** The rows as the table paints them: the primary column, then the record. */
export const sortTable = (sort: TableSort): ReadonlyArray<TableRow> => {
  const primary = sort.column === "name" ? byName : bySize;
  const ordered = sort.descending
    ? Order.combine((left, right) => primary(right, left), byRecord)
    : Order.combine(primary, byRecord);
  return Arr.sort(tableRows, ordered);
};

/** What a header press does: the same column flips, another column starts ascending. */
export const toggleSort = (
  current: TableSort,
  column: TableColumn,
): TableSort =>
  current.column === column
    ? { column, descending: !current.descending }
    : { column, descending: false };

/** The readout's spelling of an order (`name-asc`). */
export const sortLabel = (sort: TableSort): string =>
  `${sort.column}-${sort.descending ? "desc" : "asc"}`;
