import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";

export const FILE_TREE_PATHS: ReadonlyArray<string> = [
  "src/index.ts",
  "assets/logo.png",
  "src/button.tsx",
  "config.json",
  "readme.md",
];

export const FILE_TREE_SRC = "src";
export const FILE_TREE_ASSETS = "assets";
export const FILE_TREE_README = "readme.md";
export const FILE_TREE_BUTTON = "src/button.tsx";
export const FILE_TREE_INDEX = "src/index.ts";
export const FILE_TREE_LOGO = "assets/logo.png";

export const FILE_TREE_IDS = {
  probe: "file-tree-probe",
  tree: "file-tree",
  readout: "file-tree-readout",
} as const;

export const fileTreeRow = (path: string): string =>
  `${FILE_TREE_IDS.tree}-row-${path}`;

export const FILE_TREE_VISIBLE_ROWS = 4;

export const FILE_TREE_ROWS_OPEN = 6;

export interface FileTreeState {
  readonly selected: ReadonlyArray<string>;

  readonly picked: Option.Option<string>;

  readonly opens: ReadonlyArray<string>;
}

export const FILE_TREE_REST: FileTreeState = {
  selected: [],
  picked: Option.none(),
  opens: [],
};

export const fileTreeReadout = (state: FileTreeState): string =>
  pipe(
    state.selected,
    Arr.sort(Order.String),
    Arr.match({
      onEmpty: () => "none",
      onNonEmpty: (keys: ReadonlyArray<string>) => Arr.join(keys, ","),
    }),
    (keys) =>
      `sel=${state.selected.length} keys=${keys} picked=${Option.getOrElse(state.picked, () => "-")} opens=${Arr.join(Arr.sort(state.opens, Order.String), ",") || "none"}`,
  );

export const FILE_TREE_OPENED: FileTreeState = {
  selected: [],
  picked: Option.none(),
  opens: [FILE_TREE_SRC],
};

export const FILE_TREE_README_PICKED: FileTreeState = {
  selected: [FILE_TREE_README],
  picked: Option.some(FILE_TREE_README),
  opens: [FILE_TREE_SRC],
};

export const FILE_TREE_INDEX_PICKED: FileTreeState = {
  selected: [FILE_TREE_INDEX],
  picked: Option.some(FILE_TREE_INDEX),
  opens: [FILE_TREE_SRC],
};

export const FILE_TREE_SCROLL = 200;

export const FILE_TREE_CHECKS = 26;
