export interface PreviewTableRow {
  readonly id: string;
  readonly service: string;
  readonly environment: string;
  readonly status: "ready" | "building" | "failed";
  readonly duration: number;
}

export const TABLE_ROWS: ReadonlyArray<PreviewTableRow> = [
  {
    id: "billing",
    service: "billing-api",
    environment: "production",
    status: "ready",
    duration: 92,
  },
  {
    id: "search",
    service: "search-index",
    environment: "staging",
    status: "building",
    duration: 148,
  },
  {
    id: "gateway",
    service: "edge-gateway",
    environment: "production",
    status: "failed",
    duration: 36,
  },
  {
    id: "reports",
    service: "reports-worker",
    environment: "staging",
    status: "ready",
    duration: 211,
  },
  {
    id: "auth",
    service: "auth-service",
    environment: "production",
    status: "ready",
    duration: 74,
  },
  {
    id: "media",
    service: "media-proxy",
    environment: "development",
    status: "building",
    duration: 129,
  },
];

export const COLUMN_IDS = [
  "service",
  "environment",
  "status",
  "duration",
] as const;

export type ColumnId = (typeof COLUMN_IDS)[number];

export const TABLE_TRACKS: Readonly<
  Record<"select" | ColumnId | "actions", string>
> = {
  select: "6%",
  service: "34%",
  environment: "25%",
  status: "16%",
  duration: "12%",
  actions: "7%",
};

export const tableTracks = (
  columns: ReadonlyArray<ColumnId>,
): ReadonlyArray<string> => [
  TABLE_TRACKS.select,
  ...columns.map((id) => TABLE_TRACKS[id]),
  TABLE_TRACKS.actions,
];

export const cellOf = (row: PreviewTableRow, id: ColumnId): string =>
  id === "duration" ? `${row.duration}` : row[id];

export const cellsOf = (row: PreviewTableRow): ReadonlyArray<string> =>
  COLUMN_IDS.map((id) => cellOf(row, id));

export const valueOf = (row: PreviewTableRow, field: string): string | number =>
  field === "duration"
    ? row.duration
    : field === "environment"
      ? row.environment
      : field === "status"
        ? row.status
        : row.service;

export interface PreviewSort {
  readonly field: string;
  readonly direction: "asc" | "desc";
}

export type PreviewSortOrder = ReadonlyArray<PreviewSort>;

export const INITIAL_ORDER: PreviewSortOrder = [
  { field: "service", direction: "asc" },
];

const flip = (direction: "asc" | "desc"): "asc" | "desc" =>
  direction === "asc" ? "desc" : "asc";

export const pressSortOrder = (
  order: PreviewSortOrder,
  field: string,
  initialDirection: "asc" | "desc" = "asc",
  additive = false,
): PreviewSortOrder => {
  const at = order.findIndex((entry) => entry.field === field);
  if (additive) {
    return at === -1
      ? [...order, { field, direction: initialDirection }]
      : order.map((entry, position) =>
          position === at ? { field, direction: flip(entry.direction) } : entry,
        );
  }
  const primary = order[0];
  return primary === undefined
    ? [{ field, direction: initialDirection }]
    : [
        {
          field,
          direction:
            primary.field === field
              ? flip(primary.direction)
              : initialDirection,
        },
      ];
};

export const directionIn = (
  order: PreviewSortOrder,
  field: string,
): "asc" | "desc" | undefined =>
  order.find((entry) => entry.field === field)?.direction;

export const normalizeQuery = (query: string): string =>
  query.trim().toLowerCase();

export const filterRows = (
  rows: ReadonlyArray<PreviewTableRow>,
  query: string,
  columns: ReadonlyArray<ColumnId> = COLUMN_IDS,
): ReadonlyArray<PreviewTableRow> => {
  const needle = normalizeQuery(query);
  return needle === ""
    ? rows
    : rows.filter((row) =>
        columns.some((id) => cellOf(row, id).toLowerCase().includes(needle)),
      );
};

const compareBy = (
  left: PreviewTableRow,
  right: PreviewTableRow,
  field: string,
): number => {
  const a = valueOf(left, field);
  const b = valueOf(right, field);
  if (typeof a === "number" && typeof b === "number") return a - b;
  return `${a}` < `${b}` ? -1 : `${a}` > `${b}` ? 1 : 0;
};

const compareRows = (
  left: PreviewTableRow,
  right: PreviewTableRow,
  order: PreviewSortOrder,
): number =>
  order.reduce((decided, entry) => {
    if (decided !== 0) return decided;
    const direction = entry.direction === "asc" ? 1 : -1;
    return compareBy(left, right, entry.field) * direction;
  }, 0);

const insertOrdered = (
  ordered: ReadonlyArray<PreviewTableRow>,
  row: PreviewTableRow,
  order: PreviewSortOrder,
): ReadonlyArray<PreviewTableRow> => {
  const at = ordered.findIndex((other) => compareRows(other, row, order) > 0);
  return at === -1
    ? [...ordered, row]
    : [...ordered.slice(0, at), row, ...ordered.slice(at)];
};

export const sortRows = (
  rows: ReadonlyArray<PreviewTableRow>,
  order: PreviewSortOrder,
): ReadonlyArray<PreviewTableRow> =>
  order.length === 0
    ? rows
    : rows.reduce<ReadonlyArray<PreviewTableRow>>(
        (ordered, row) => insertOrdered(ordered, row, order),
        [],
      );

export const visibleRows = (
  rows: ReadonlyArray<PreviewTableRow>,
  query: string,
  order: PreviewSortOrder,
  columns: ReadonlyArray<ColumnId> = COLUMN_IDS,
): ReadonlyArray<PreviewTableRow> =>
  sortRows(filterRows(rows, query, columns), order);

export interface PreviewSelection {
  readonly selected: ReadonlyArray<string>;
  readonly anchor: string | null;
}

export const NO_SELECTION: PreviewSelection = { selected: [], anchor: null };

export interface PreviewModifiers {
  readonly shift?: boolean;
  readonly cmd?: boolean;
  readonly ctrl?: boolean;
}

export const pressRow = (
  state: PreviewSelection,
  key: string,
  modifiers: PreviewModifiers,
  order: ReadonlyArray<string>,
): PreviewSelection => {
  if (modifiers.shift === true) {
    const from = state.anchor === null ? -1 : order.indexOf(state.anchor);
    const to = order.indexOf(key);
    if (from === -1 || to === -1) {
      return { selected: [key], anchor: key };
    }
    const [start, end] = from <= to ? [from, to] : [to, from];
    return {
      selected: [
        ...new Set([...state.selected, ...order.slice(start, end + 1)]),
      ],
      anchor: state.anchor,
    };
  }

  if (modifiers.cmd === true || modifiers.ctrl === true) {
    const selected = state.selected.includes(key)
      ? state.selected.filter((chosen) => chosen !== key)
      : [...state.selected, key];
    return { selected, anchor: key };
  }

  return { selected: [key], anchor: key };
};

export const retainSelection = (
  state: PreviewSelection,
  visible: ReadonlyArray<string>,
): PreviewSelection => ({
  selected: state.selected.filter((key) => visible.includes(key)),
  anchor:
    state.anchor !== null && visible.includes(state.anchor)
      ? state.anchor
      : null,
});

export const sortOrderLabel = (
  label: string,
  order: PreviewSortOrder,
  field: string,
): string => {
  const at = order.findIndex((entry) => entry.field === field);
  const entry = order[at];
  if (entry === undefined) return `${label}, sortable`;
  const state = `${label}, sorted ${entry.direction === "asc" ? "ascending" : "descending"}`;
  return order.length > 1
    ? `${state}, sort ${at + 1} of ${order.length}`
    : state;
};

export const sortOrderGlyph = (
  order: PreviewSortOrder,
  field: string,
): string => {
  const at = order.findIndex((entry) => entry.field === field);
  const entry = order[at];
  if (entry === undefined) return "";
  const arrow = entry.direction === "asc" ? "↑" : "↓";
  return order.length > 1 ? `${arrow}${at + 1}` : arrow;
};

export const PAGE_SIZE = 5;

export const pageCount = (rows: ReadonlyArray<PreviewTableRow>): number =>
  Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

export const clampPage = (page: number, count: number): number =>
  Math.min(Math.max(page, 0), count - 1);

export const pageSlice = (
  rows: ReadonlyArray<PreviewTableRow>,
  page: number,
): ReadonlyArray<PreviewTableRow> => {
  const count = pageCount(rows);
  const start = clampPage(page, count) * PAGE_SIZE;
  return rows.slice(start, start + PAGE_SIZE);
};

export const ALL_COLUMNS: ReadonlyArray<ColumnId> = [...COLUMN_IDS];

export const toggleColumn = (
  visible: ReadonlyArray<ColumnId>,
  id: ColumnId,
): ReadonlyArray<ColumnId> => {
  const next = visible.includes(id)
    ? visible.filter((column) => column !== id)
    : [...visible, id];
  return next.length === 0
    ? visible
    : COLUMN_IDS.filter((column) => next.includes(column));
};

export const allPageSelected = (
  state: PreviewSelection,
  pageIds: ReadonlyArray<string>,
): boolean =>
  pageIds.length > 0 && pageIds.every((id) => state.selected.includes(id));

export const somePageSelected = (
  state: PreviewSelection,
  pageIds: ReadonlyArray<string>,
): boolean =>
  !allPageSelected(state, pageIds) &&
  pageIds.some((id) => state.selected.includes(id));

export const togglePageSelection = (
  state: PreviewSelection,
  pageIds: ReadonlyArray<string>,
): PreviewSelection =>
  allPageSelected(state, pageIds)
    ? {
        selected: state.selected.filter((id) => !pageIds.includes(id)),
        anchor: null,
      }
    : {
        selected: [...new Set([...state.selected, ...pageIds])],
        anchor: null,
      };

export const toggleRow = (
  state: PreviewSelection,
  key: string,
): PreviewSelection => ({
  selected: state.selected.includes(key)
    ? state.selected.filter((chosen) => chosen !== key)
    : [...state.selected, key],
  anchor: key,
});
