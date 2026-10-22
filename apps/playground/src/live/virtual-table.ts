/**
 * The `virtual-table-lifecycle` fixture: the shipped `@gpuixui/data` virtualized
 * table, and the readout a window probe asserts against.
 *
 * The probe mounts `virtual-table` from the package's example registry — the
 * screen `packages/data/examples/virtual-table.example.tsx` declares — so the
 * ids below belong to that file and a change there fails the fixture test rather
 * than measuring a second composition. The row count, row height and reveal
 * index are the example's exports, imported rather than restated.
 *
 * Why a window adds anything: the offscreen `data-table-core` scenario mounts the
 * plain table, and the `virtual-list-*` probes drive the runtime's list directly.
 * Nothing mounted the shipped `VirtualTable`, whose body is a `<virtual-list>` in
 * `itemCount` mode: only the window the app names exists in the tree, a reveal
 * moves the app's window before scrolling, and `onVisibleRange` reports absolute
 * indices that lag the paint.
 */

import * as Option from "effect/Option";

/** The example's readout: the row count, the selection and the reported window. */
export const VIRTUAL_TABLE_READOUT = "virtual-table-readout";
/** The reveal action, the filter field and the two sortable headers. */
export const VIRTUAL_TABLE_REVEAL = "virtual-table-reveal";
export const VIRTUAL_TABLE_FILTER = "virtual-table-filter";
export const VIRTUAL_TABLE_NAME_SORT = "virtual-table-name-sort";
/** The table root (the example's own test id). */
export const VIRTUAL_TABLE = "virtual-table";

/** One painted row, as the example names it. */
export const virtualTableRow = (n: number): string => `virtual-row-row-${n}`;

/** What the readout prints, in the example's own order. */
export interface VirtualTableState {
  readonly rows: number;
  readonly selected: number;
  /** The window's first and last absolute index; `None` is the example's `-`. */
  readonly first: Option.Option<number>;
  readonly last: Option.Option<number>;
}

/**
 * The readout line, spelled once.
 *
 * The example interpolates these four segments itself, and reports an absent
 * range as words (`first=- last=-`); `virtual-table.test.ts` reads the example's
 * template and holds this spelling to it.
 */
export const virtualTableReadout = (state: VirtualTableState): string =>
  `${state.rows} rows · ${state.selected} selected · first=${Option.getOrElse(
    state.first,
    () => "-",
  )} last=${Option.getOrElse(state.last, () => "-")}`;

/** The readout the screen opens on: the range is reported only after a move. */
export const VIRTUAL_TABLE_INITIAL = virtualTableReadout({
  rows: 1_000,
  selected: 0,
  first: Option.none(),
  last: Option.none(),
});

/**
 * The rows the query `01` keeps, measured on 0.11.0.
 *
 * A name is `file-NNNN.ts` and the query is a literal substring, so every name
 * that contains `01` matches — the 100 from `0100` to `0199`, the ten from
 * `0010` to `0019`, and the seventeen whose last two digits are `01`. The count
 * is the example's own arithmetic, so `virtual-table.test.ts` derives it from
 * the same names rather than trusting the probe's report.
 */
export const VIRTUAL_TABLE_FILTERED_ROWS = 127;
