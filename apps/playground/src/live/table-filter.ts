/**
 * The filtered table `table-filter-lifecycle` drives, and the rules a data
 * grid's filter owes.
 *
 * Tier 3's **filtering controls** row is `div` + `<input>`, so the runtime cannot
 * be wrong about it — but the *rules* around the control are what a grid has to
 * get right, and they are pure: a literal case-insensitive match, a selection
 * that lives only while its record does, and an arrow step that walks the
 * filtered set rather than the numeric index. The fixture keeps them out of the
 * view so they are testable on a host with no binding, as `workspace-restore.ts`
 * and `dock-focus.ts` are.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The rows the grid holds, its row height and the viewport it scrolls in. */
export const FILTER_ROWS = 120;
export const FILTER_ROW_HEIGHT = 28;
export const FILTER_VIEWPORT = 240;

/** The `testId`s the view and the steps share, so a probe cannot address a ghost. */
export const FILTER_IDS = {
  probe: "filter-probe",
  field: "filter-field",
  clear: "filter-clear",
  list: "filter-list",
  empty: "filter-empty",
  readout: "filter-readout",
  row: (index: number): string => `filter-row-${index}`,
} as const;

/** The label a row paints; the query matches this text, not the index. */
export const rowLabel = (index: number): string => `Item ${index}`;

/** Every row index, in table order. */
const allRows = Arr.range(0, FILTER_ROWS - 1);

/**
 * The rows a query keeps: a literal, case-insensitive match on the label.
 *
 * An empty (or whitespace-only) query keeps every row, so "no filter" and "no
 * matches" are different states a probe can tell apart.
 */
export const filterRows = (query: string): ReadonlyArray<number> => {
  const needle = Str.toLowerCase(Str.trim(query));
  return Str.isEmpty(needle)
    ? allRows
    : Arr.filter(allRows, (index) =>
        Str.includes(needle)(Str.toLowerCase(rowLabel(index))),
      );
};

/**
 * A selection that survives only while its record is in the filtered set.
 *
 * A grid keeps the selection by record, so hiding the record must clear the
 * selection rather than leave an invisible one. A record still in the set keeps
 * its selection across a filter change, including a clear.
 */
export const keepSelection = (
  selected: Option.Option<number>,
  rows: ReadonlyArray<number>,
): Option.Option<number> =>
  Option.filter(selected, (index) => Arr.contains(rows, index));

/**
 * The row an Up/Down step lands on, inside the filtered set.
 *
 * The step is the filtered order, not the numeric index: with `Item 1` followed
 * by `Item 10`, Down from 1 is 10. A step at either end clamps at that end, and
 * an empty set has nowhere to go.
 */
export const stepRow = (
  rows: ReadonlyArray<number>,
  selected: Option.Option<number>,
  delta: number,
): Option.Option<number> =>
  Option.match(selected, {
    onNone: () => Arr.head(rows),
    onSome: (current) =>
      Option.flatMap(
        Arr.findFirstIndex(rows, (row) => row === current),
        (at) =>
          Arr.get(
            rows,
            Math.min(rows.length - 1, Math.max(0, at + delta)),
          ),
      ),
  });

/** The readout a window paints. */
export const filterReadout = (
  query: string,
  rows: ReadonlyArray<number>,
  selected: Option.Option<number>,
  offset: number,
): string =>
  `rows=${Arr.length(rows)} query=${Str.isEmpty(Str.trim(query)) ? "none" : query} selected=${Option.match(
    selected,
    { onNone: () => "none", onSome: (index) => `item-${index}` },
  )} offset=${offset}`;
