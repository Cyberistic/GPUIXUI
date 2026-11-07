import * as Option from "effect/Option";

export const VIRTUAL_TABLE_READOUT = "virtual-table-readout";

export const VIRTUAL_TABLE_REVEAL = "virtual-table-reveal";
export const VIRTUAL_TABLE_FILTER = "virtual-table-filter";
export const VIRTUAL_TABLE_NAME_SORT = "virtual-table-name-sort";

export const VIRTUAL_TABLE = "virtual-table";

export const virtualTableRow = (n: number): string => `virtual-row-row-${n}`;

export interface VirtualTableState {
  readonly rows: number;
  readonly selected: number;

  readonly first: Option.Option<number>;
  readonly last: Option.Option<number>;
}

export const virtualTableReadout = (state: VirtualTableState): string =>
  `${state.rows} rows · ${state.selected} selected · first=${Option.getOrElse(
    state.first,
    () => "-",
  )} last=${Option.getOrElse(state.last, () => "-")}`;

export const VIRTUAL_TABLE_INITIAL = virtualTableReadout({
  rows: 1_000,
  selected: 0,
  first: Option.none(),
  last: Option.none(),
});

export const VIRTUAL_TABLE_FILTERED_ROWS = 127;
