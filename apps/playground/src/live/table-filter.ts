import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

export const FILTER_ROWS = 120;
export const FILTER_ROW_HEIGHT = 28;
export const FILTER_VIEWPORT = 240;

export const FILTER_IDS = {
  probe: "filter-probe",
  field: "filter-field",
  clear: "filter-clear",
  list: "filter-list",
  empty: "filter-empty",
  readout: "filter-readout",
  row: (index: number): string => `filter-row-${index}`,
} as const;

export const rowLabel = (index: number): string => `Item ${index}`;

const allRows = Arr.range(0, FILTER_ROWS - 1);

export const filterRows = (query: string): ReadonlyArray<number> => {
  const needle = Str.toLowerCase(Str.trim(query));
  return Str.isEmpty(needle)
    ? allRows
    : Arr.filter(allRows, (index) =>
        Str.includes(needle)(Str.toLowerCase(rowLabel(index))),
      );
};

export const keepSelection = (
  selected: Option.Option<number>,
  rows: ReadonlyArray<number>,
): Option.Option<number> =>
  Option.filter(selected, (index) => Arr.contains(rows, index));

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
          Arr.get(rows, Math.min(rows.length - 1, Math.max(0, at + delta))),
      ),
  });

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
