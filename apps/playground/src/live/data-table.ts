/**
 * The `data-table-lifecycle` fixture: the shipped `@gpuixui/data` files table,
 * and the readout the window probe asserts against.
 *
 * The probe mounts the **example** rather than a copy of the composition, the
 * way the headless `data-table-core` scenario does, so every id below belongs to
 * `packages/data/examples/table.example.tsx` and a change there fails here
 * instead of measuring a second table. The fixture therefore owns only the
 * readout's vocabulary and the arithmetic a check needs; the example owns the
 * screen.
 *
 * Why a window adds anything: the example's own header records the rule it
 * learned from this runtime — `renderer.focusElement` refuses an element outside
 * the tab order, so a row's focus has to follow the committed `tabIndex` rather
 * than run inside the key handler. Nothing had measured that path through the
 * shipped table, nor the shipped `ColumnMenu` inside a header, nor its
 * `TableColumnDivider` drag.
 *
 * Kept native-free, so the fixture is testable on a host with no binding.
 */

import * as Arr from "effect/Array";

/** The example's readout: rows, selection, visible columns, widths and sort. */
export const DATA_TABLE_READOUT = "files-readout";
/** The filter field above the table, and the column menu's trigger. */
export const DATA_TABLE_FILTER = "files-filter";
export const DATA_TABLE_COLUMNS = "files-columns";
/** The row scroller, and the one header cell the probe reads for the fixed header. */
export const DATA_TABLE_BODY = "files-body";
export const DATA_TABLE_NAME_HEADER = "files-name";
/** The name column's resize divider, and the sortable header above it. */
export const DATA_TABLE_DIVIDER = "files-divider-name";
export const DATA_TABLE_NAME_SORT = "files-name-sort";

/** The example's three columns, in the order it declares them. */
export const DATA_TABLE_COLUMNS_ORDER = ["name", "status", "size"] as const;
/**
 * Each column's declared width.
 *
 * A column the example adds without a width here sums as nothing, so
 * `data-table.test.ts` holds this record to the example's `FILE_COLUMNS`.
 */
export const DATA_TABLE_WIDTHS: Readonly<Record<string, number>> = {
  name: 260,
  status: 110,
  size: 90,
};
/** The name column's declared width, and the content width the three sum to. */
export const DATA_TABLE_NAME_WIDTH = 260;
export const DATA_TABLE_CONTENT_WIDTH = Arr.reduce(
  DATA_TABLE_COLUMNS_ORDER,
  0,
  (sum, id) => sum + (DATA_TABLE_WIDTHS[id] ?? 0),
);
/** One drag step on the name column: the value the readout must report after it. */
export const DATA_TABLE_DRAG = 40;

/** The one row the probe drives, and the record a sort moves to the top. */
export const dataTableRow = (n: number): string => `files-row-file-${n}`;
/** One cell of one row, as the example names it. */
export const dataTableCell = (n: number, column: string): string =>
  `files-cell-file-${n}-${column}`;
/** The column menu's visibility row and its reset row. */
export const dataTableColumnToggle = (id: string): string =>
  `${DATA_TABLE_COLUMNS}-toggle-${id}`;
export const DATA_TABLE_COLUMN_RESET = `${DATA_TABLE_COLUMNS}-reset`;

/** What the readout prints, in the example's own order. */
export interface DataTableState {
  readonly rows: number;
  readonly selected: number;
  readonly columns: ReadonlyArray<string>;
  readonly width: number;
  readonly content: number;
  readonly sort: string;
}

/**
 * The readout line, spelled once.
 *
 * The example interpolates these six segments itself; `data-table.test.ts` reads
 * the example's template and holds this spelling to it, so a readout change
 * cannot leave the probe asserting a sentence the screen no longer prints.
 */
export const dataTableReadout = (state: DataTableState): string =>
  `${state.rows} rows · ${state.selected} selected · cols=${Arr.join(
    state.columns,
    ",",
  )} · w=${state.width} · content=${state.content} · ${state.sort}`;

/** The unfiltered, unsorted table the probe opens on. */
export const DATA_TABLE_INITIAL = dataTableReadout({
  rows: 60,
  selected: 0,
  columns: DATA_TABLE_COLUMNS_ORDER,
  width: DATA_TABLE_NAME_WIDTH,
  content: DATA_TABLE_CONTENT_WIDTH,
  sort: "unsorted",
});

/**
 * The content width a visible column set paints.
 *
 * `columns.contentWidth` is the visible widths summed — the example prints it
 * beside the name column's own width — so a hide or a resize moves it by
 * exactly the width that moved.
 */
export const dataTableContent = (
  columns: ReadonlyArray<string>,
  nameWidth = DATA_TABLE_NAME_WIDTH,
): number =>
  Arr.reduce(
    columns,
    0,
    (sum, id) =>
      sum + (id === "name" ? nameWidth : (DATA_TABLE_WIDTHS[id] ?? 0)),
  );

/** The sort token the header presses produce. */
export const DATA_TABLE_SORT_ASC = "name-asc";
export const DATA_TABLE_SORT_DESC = "name-desc";
