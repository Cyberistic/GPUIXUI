import * as Arr from "effect/Array";

export const DATA_TABLE_READOUT = "files-readout";

export const DATA_TABLE_FILTER = "files-filter";
export const DATA_TABLE_COLUMNS = "files-columns";

export const DATA_TABLE_BODY = "files-body";
export const DATA_TABLE_NAME_HEADER = "files-name";

export const DATA_TABLE_DIVIDER = "files-divider-name";
export const DATA_TABLE_NAME_SORT = "files-name-sort";

export const DATA_TABLE_COLUMNS_ORDER = ["name", "status", "size"] as const;

export const DATA_TABLE_WIDTHS: Readonly<Record<string, number>> = {
  name: 260,
  status: 110,
  size: 90,
};

export const DATA_TABLE_NAME_WIDTH = 260;
export const DATA_TABLE_CONTENT_WIDTH = Arr.reduce(
  DATA_TABLE_COLUMNS_ORDER,
  0,
  (sum, id) => sum + (DATA_TABLE_WIDTHS[id] ?? 0),
);

export const DATA_TABLE_DRAG = 40;

export const dataTableRow = (n: number): string => `files-row-file-${n}`;

export const dataTableCell = (n: number, column: string): string =>
  `files-cell-file-${n}-${column}`;

export const dataTableColumnToggle = (id: string): string =>
  `${DATA_TABLE_COLUMNS}-toggle-${id}`;
export const DATA_TABLE_COLUMN_RESET = `${DATA_TABLE_COLUMNS}-reset`;

export interface DataTableState {
  readonly rows: number;
  readonly selected: number;
  readonly columns: ReadonlyArray<string>;
  readonly width: number;
  readonly content: number;
  readonly sort: string;
}

export const dataTableReadout = (state: DataTableState): string =>
  `${state.rows} rows · ${state.selected} selected · cols=${Arr.join(
    state.columns,
    ",",
  )} · w=${state.width} · content=${state.content} · ${state.sort}`;

export const DATA_TABLE_INITIAL = dataTableReadout({
  rows: 60,
  selected: 0,
  columns: DATA_TABLE_COLUMNS_ORDER,
  width: DATA_TABLE_NAME_WIDTH,
  content: DATA_TABLE_CONTENT_WIDTH,
  sort: "unsorted",
});

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

export const DATA_TABLE_SORT_ASC = "name-asc";
export const DATA_TABLE_SORT_DESC = "name-desc";
