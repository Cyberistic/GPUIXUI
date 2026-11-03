import * as Arr from "effect/Array";
import { ranges, rows, tabs, type Range, type Row, type Tab } from "./data.js";

/** A stored range name, narrowed to one this dashboard ships. */
export const isRange = (value: string): value is Range =>
  Arr.some(ranges, (range) => range.value === value);

/** A stored tab name, narrowed to one this dashboard ships. */
export const isTab = (value: string): value is Tab =>
  Arr.some(tabs, (tab) => tab.value === value);

/** The rows a tab holds: a name this release does not ship shows the outline. */
export const rowsOf = (tab: Tab): ReadonlyArray<Row> => rows[tab];

/** A row's chosen/un-chosen state, as the list the table paints. */
export const toggleRow = (
  selected: ReadonlyArray<string>,
  header: string,
): ReadonlyArray<string> =>
  Arr.contains(selected, header)
    ? Arr.filter(selected, (chosen) => chosen !== header)
    : Arr.append(selected, header);

/** Every row chosen, when the list holds them all. */
export const everyRow = (
  selected: ReadonlyArray<string>,
  list: ReadonlyArray<Row>,
): boolean =>
  Arr.match(list, {
    onEmpty: () => false,
    onNonEmpty: (rows) =>
      Arr.every(rows, (row) => Arr.contains(selected, row.header)),
  });

/** The heading's mark: a movement or a rate, as one glyph and its words. */
export const movement = (direction: "up" | "down" | "flat"): string =>
  direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
