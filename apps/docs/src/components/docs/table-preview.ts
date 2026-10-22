/**
 * The rules the Table page's browser previews follow.
 *
 * The shipped table is presentational: `@gpuixui/data`'s controllers own the
 * sort, the selection and the filter, and a preview that re-invented them would
 * teach a model the package does not implement. So this module is a small,
 * plain copy of those three reducers, and `table-preview.test.ts` holds it to
 * the package's own functions over a sweep — the preview cannot drift from
 * `sort/logic.ts`, `selection/logic.ts` or `filter/logic.ts` without failing.
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

/** Every cell's text, which is what one filter query is matched against. */
export const textOf = (row: PreviewTableRow): string =>
  `${row.service} ${row.environment} ${row.status} ${row.duration}`;

/** The value one column sorts by: numbers as numbers, everything else as text. */
export const valueOf = (row: PreviewTableRow, field: string): string | number =>
  field === "duration"
    ? row.duration
    : field === "environment"
      ? row.environment
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
 * its own initial direction.
 */
export const nextSort = (
  current: PreviewSort | null,
  field: string,
  initialDirection: "asc" | "desc" = "asc",
): PreviewSort =>
  current !== null && current.field === field
    ? { field, direction: current.direction === "asc" ? "desc" : "asc" }
    : { field, direction: initialDirection };

/** The query as it is matched: trimmed and lowercased, never a pattern. */
export const normalizeQuery = (query: string): string =>
  query.trim().toLowerCase();

/** The rows a literal, case-insensitive query keeps. */
export const filterRows = (
  rows: ReadonlyArray<PreviewTableRow>,
  query: string,
): ReadonlyArray<PreviewTableRow> => {
  const needle = normalizeQuery(query);
  return needle === ""
    ? rows
    : rows.filter((row) => textOf(row).toLowerCase().includes(needle));
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

/** The line the workflow preview prints under its table. */
export const readout = (
  rows: ReadonlyArray<PreviewTableRow>,
  selection: PreviewSelection,
  sort: PreviewSort | null,
): string =>
  `${rows.length} rows · ${selection.selected.length} selected · ${
    sort === null ? "unsorted" : `${sort.field} ${sort.direction}`
  }`;
