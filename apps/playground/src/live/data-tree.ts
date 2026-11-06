import * as Option from "effect/Option";

export const DATA_TREE_READOUT = "data-tree-readout";

export const DATA_TREE_EXPAND = "tree-expand";
export const DATA_TREE_COLLAPSE = "tree-collapse";
export const DATA_TREE_REVEAL = "tree-reveal";

export const DATA_TREE = "tree";

export const dataTreeRow = (key: string): string => `${DATA_TREE}-row-${key}`;

export interface DataTreeState {
  readonly rows: number;

  readonly active: Option.Option<string>;
}

export const dataTreeReadout = (state: DataTreeState): string =>
  `${state.rows} rows · active=${Option.getOrElse(state.active, () => "-")}`;

export const DATA_TREE_ROWS_FOLDED = 3;
export const DATA_TREE_ROWS_OPEN = 5;
export const DATA_TREE_ROWS_REVEALED = 9;
export const DATA_TREE_ROWS_ALL = 11;

export const DATA_TREE_INITIAL = dataTreeReadout({
  rows: DATA_TREE_ROWS_OPEN,
  active: Option.some("src"),
});

export const DATA_TREE_REVEALED = "row.tsx";
