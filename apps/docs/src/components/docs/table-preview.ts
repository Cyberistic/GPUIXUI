/**
 * The rules the Table page's browser previews follow.
 *
 * The shipped table is presentational: `@gpuixui/data`'s controllers own the
 * sort, the selection and the filter, and a preview that re-invented them would
 * teach a model the package does not implement. So this module is a small,
 * plain copy of those three rules, and `table-preview.test.ts` holds it to the
 * package's own functions over a sweep — the preview cannot drift from
 * `sort/logic.ts`, `selection/logic.ts` or the filtered row model `grid-core.ts`
 * configures without failing.
 *
 * Nothing here is imported by the native package; the page states that the
 * previews are illustrative, and this file is why they are also accurate.
 */

/** One deploy-queue row, the fixture both previews read. */
export interface PreviewTableRow {
  readonly id: string;
  readonly service: string;
  readonly environment: string;
  readonly status: "ready" | "building" | "failed";
  readonly duration: number;
}

/** The rows the workflow preview starts with. */
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

/** The four cells a row paints, each one searched on its own. */
export const cellsOf = (row: PreviewTableRow): ReadonlyArray<string> => [
  row.service,
  row.environment,
  row.status,
  `${row.duration}`,
];

/** The value one column sorts by: numbers as numbers, everything else as text. */
export const valueOf = (row: PreviewTableRow, field: string): string | number =>
  field === "duration"
    ? row.duration
    : field === "environment"
      ? row.environment
      : field === "status"
        ? row.status
        : row.service;

/** A sorted column and its direction, or unsorted. */
export interface PreviewSort {
  readonly field: string;
  readonly direction: "asc" | "desc";
}

/** The column the header shows first, and the one a press starts at. */
export const INITIAL_SORT: PreviewSort = { field: "service", direction: "asc" };

/**
 * The sort a press produces: the sorted field flips, any other field starts at
 * its own initial direction, and a third press on the field returns to none.
 *
 * The flip is the package's (`sort/logic.ts` flips the sorted field); the
 * third, clearing press is the preview's own gesture, because the native
 * header only ever hands `Option.some(next)` and clears through `setSort`.
 */
export const nextSort = (
  current: PreviewSort | null,
  field: string,
  initialDirection: "asc" | "desc" = "asc",
): PreviewSort | null =>
  current === null || current.field !== field
    ? { field, direction: initialDirection }
    : current.direction === "asc"
      ? { field, direction: "desc" }
      : null;

/** The query as it is matched: trimmed and lowercased, never a pattern. */
export const normalizeQuery = (query: string): string =>
  query.trim().toLowerCase();

/**
 * The rows a literal, case-insensitive query keeps.
 *
 * Each cell is matched on its own, which is the rule the core's global filter
 * takes: every column's accessor value is lowercased and asked whether it
 * contains the query. A query therefore cannot span two cells.
 */
export const filterRows = (
  rows: ReadonlyArray<PreviewTableRow>,
  query: string,
): ReadonlyArray<PreviewTableRow> => {
  const needle = normalizeQuery(query);
  return needle === ""
    ? rows
    : rows.filter((row) =>
        cellsOf(row).some((cell) => cell.toLowerCase().includes(needle)),
      );
};

/** The order two rows take under one column, ignoring the direction. */
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

/** Insert one row into an already-ordered list, keeping the caller's order on ties. */
const insertOrdered = (
  ordered: ReadonlyArray<PreviewTableRow>,
  row: PreviewTableRow,
  sort: PreviewSort,
): ReadonlyArray<PreviewTableRow> => {
  const direction = sort.direction === "asc" ? 1 : -1;
  const at = ordered.findIndex(
    (other) => compareBy(other, row, sort.field) * direction > 0,
  );
  return at === -1
    ? [...ordered, row]
    : [...ordered.slice(0, at), row, ...ordered.slice(at)];
};

/** The rows in the sorted order; an unsorted table keeps the caller's order. */
export const sortRows = (
  rows: ReadonlyArray<PreviewTableRow>,
  sort: PreviewSort | null,
): ReadonlyArray<PreviewTableRow> =>
  sort === null
    ? rows
    : rows.reduce<ReadonlyArray<PreviewTableRow>>(
        (ordered, row) => insertOrdered(ordered, row, sort),
        [],
      );

/** The rows a preview paints: filtered first, then sorted. */
export const visibleRows = (
  rows: ReadonlyArray<PreviewTableRow>,
  query: string,
  sort: PreviewSort | null,
): ReadonlyArray<PreviewTableRow> => sortRows(filterRows(rows, query), sort);

/** Chosen records plus the record a range extends from. */
export interface PreviewSelection {
  readonly selected: ReadonlyArray<string>;
  readonly anchor: string | null;
}

/** Nothing chosen. */
export const NO_SELECTION: PreviewSelection = { selected: [], anchor: null };

/** The modifier flags a press reports. */
export interface PreviewModifiers {
  readonly shift?: boolean;
  readonly cmd?: boolean;
  readonly ctrl?: boolean;
}

/**
 * A press, in the order the reader can see: `shift` extends from the anchor and
 * keeps it, a chord toggles the record and moves the anchor, a plain press
 * replaces the set and becomes the anchor.
 */
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

/** Keep the chosen records the visible set still holds; drop an anchor it lost. */
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

/** The name a sortable column announces, because 0.11.0 has no `aria-sort`. */
export const sortLabel = (
  label: string,
  sort: PreviewSort | null,
  field: string,
): string =>
  sort === null || sort.field !== field
    ? `${label}, sortable`
    : `${label}, sorted ${sort.direction === "asc" ? "ascending" : "descending"}`;

/* ---- pagination ----
 *
 * The preview pages five rows at a time, which the native package does not: it
 * ships a bounded, scrolling body instead. The slice and its clamp are pure so
 * a filter that narrows the set can never leave the reader on a page the set no
 * longer spans. */

/** Rows painted per page. */
export const PAGE_SIZE = 5;

/** The pages a row set spans; a set always spans at least one page. */
export const pageCount = (rows: ReadonlyArray<PreviewTableRow>): number =>
  Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

/** Clamp a page index into the pages a set actually spans. */
export const clampPage = (page: number, count: number): number =>
  Math.min(Math.max(page, 0), count - 1);

/**
 * The rows one page paints, with the index clamped to a real page.
 *
 * `page` is zero-based. A page past the end clamps to the last page rather than
 * returning an empty slice, so a filtered set never leaves a blank body while
 * rows still exist.
 */
export const pageSlice = (
  rows: ReadonlyArray<PreviewTableRow>,
  page: number,
): ReadonlyArray<PreviewTableRow> => {
  const count = pageCount(rows);
  const start = clampPage(page, count) * PAGE_SIZE;
  return rows.slice(start, start + PAGE_SIZE);
};

/* ---- column visibility ----
 *
 * A shadcn-style data table lets the reader hide columns. The select and
 * actions tracks never hide; the four data columns toggle through a menu and at
 * least one must stay, because a row with no text paints nothing. */

/** The hideable columns, in the order the header paints them. */
export const COLUMN_IDS = [
  "service",
  "environment",
  "status",
  "duration",
] as const;

/** One hideable column. */
export type ColumnId = (typeof COLUMN_IDS)[number];

/** The columns shown at first. */
export const ALL_COLUMNS: ReadonlyArray<ColumnId> = [...COLUMN_IDS];

/**
 * Toggle one column; hiding the last visible column keeps it, and a re-shown
 * column returns to its place in the canonical order.
 *
 * The "at least one" rule is the same the native `useColumns` enforces: the
 * reader can narrow the set down to one column but never to none, so every row
 * keeps a label.
 */
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

/* ---- page selection ----
 *
 * The header checkbox selects the **page**, never the whole filtered set: the
 * page is what the reader can see, and a checkbox that reached past it would
 * claim a record the table does not paint. */

/** Whether every row on the page is chosen — and the page is not empty. */
export const allPageSelected = (
  state: PreviewSelection,
  pageIds: ReadonlyArray<string>,
): boolean =>
  pageIds.length > 0 && pageIds.every((id) => state.selected.includes(id));

/** Whether some, but not all, of the page is chosen: the header box's dash. */
export const somePageSelected = (
  state: PreviewSelection,
  pageIds: ReadonlyArray<string>,
): boolean =>
  !allPageSelected(state, pageIds) &&
  pageIds.some((id) => state.selected.includes(id));

/**
 * Toggle the header checkbox: choose the page's rows when any is unchosen,
 * otherwise release them. Rows on other pages keep their state.
 */
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

/**
 * Toggle one record by its checkbox.
 *
 * A checkbox toggles the record it sits on — a plain press is a toggle, not the
 * row's replace — while a Shift press still extends a range through `pressRow`.
 */
export const toggleRow = (
  state: PreviewSelection,
  key: string,
): PreviewSelection => ({
  selected: state.selected.includes(key)
    ? state.selected.filter((chosen) => chosen !== key)
    : [...state.selected, key],
  anchor: key,
});
