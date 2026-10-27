/**
 * The `file-tree-lifecycle` fixture: the shipped `@gpuixui/files` `FileTree` in
 * a window.
 *
 * Tier 4's *File trees* row cites `virtual-tree-lifecycle`, which measures the
 * runtime's virtual list around a probe-local flattening — no window had mounted
 * the shipped tree, pressed one of its rows, opened a folder or read the
 * name-and-glyph row the component paints. What only a window settles is the
 * component's own gestures: a press on a folder flips only that subtree and
 * reports no selection, a press on a file selects it and reports it once, the
 * keyboard walks the visible rows, and the height the tree is handed scrolls.
 *
 * The workspace is small on purpose — four roots, two children under `src` — so
 * every row the probe names is arithmetic rather than a scroll hunt, and the
 * tree is given a four-row height so the two rows `src` opens are pushed out of
 * its box: the definite height is the other half of the fixture.
 *
 * A path is a row's key (`FileTreeFile`/`FileTreeFolder` path), so an id is the
 * path: `file-tree-row-src/index.ts`.
 *
 * Native-free, so the premises are testable on a host with no binding.
 */
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";

/** The workspace the tree is built from, by `buildFileTree`. */
export const FILE_TREE_PATHS: ReadonlyArray<string> = [
  "src/index.ts",
  "assets/logo.png",
  "src/button.tsx",
  "config.json",
  "readme.md",
];

/** The paths the checks name, so a scene cannot drift from its own rows. */
export const FILE_TREE_SRC = "src";
export const FILE_TREE_ASSETS = "assets";
export const FILE_TREE_README = "readme.md";
export const FILE_TREE_BUTTON = "src/button.tsx";
export const FILE_TREE_INDEX = "src/index.ts";
export const FILE_TREE_LOGO = "assets/logo.png";

/** The ids the view and the steps share. */
export const FILE_TREE_IDS = {
  probe: "file-tree-probe",
  tree: "file-tree",
  readout: "file-tree-readout",
} as const;

/** One row's id: the component derives it from the node's own key. */
export const fileTreeRow = (path: string): string =>
  `${FILE_TREE_IDS.tree}-row-${path}`;

/**
 * The row count the tree's definite height holds.
 *
 * The four roots fit exactly; opening `src` makes six rows, so the two below the
 * box are the scroll's evidence.
 */
export const FILE_TREE_VISIBLE_ROWS = 4;

/** The rows the tree paints once `src` is open: its four roots plus two files. */
export const FILE_TREE_ROWS_OPEN = 6;

/** What the readout publishes: the selection, the last file, the open paths. */
export interface FileTreeState {
  readonly selected: ReadonlyArray<string>;
  /** The last file a press or Enter selected; `None` before any. */
  readonly picked: Option.Option<string>;
  /** The open folder paths, as the component reports them. */
  readonly opens: ReadonlyArray<string>;
}

/** The state before any input: nothing selected, nothing open, nothing picked. */
export const FILE_TREE_REST: FileTreeState = {
  selected: [],
  picked: Option.none(),
  opens: [],
};

/** The readout line, spelled once so the probe and its record cannot drift. */
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

/** A press on the folded folder: it opens, and the selection stays untouched. */
export const FILE_TREE_OPENED: FileTreeState = {
  selected: [],
  picked: Option.none(),
  opens: [FILE_TREE_SRC],
};

/** A press on a file selects it and leaves the folder open. */
export const FILE_TREE_README_PICKED: FileTreeState = {
  selected: [FILE_TREE_README],
  picked: Option.some(FILE_TREE_README),
  opens: [FILE_TREE_SRC],
};

/** Enter on the row the arrow reached: the keyboard selects what focus holds. */
export const FILE_TREE_INDEX_PICKED: FileTreeState = {
  selected: [FILE_TREE_INDEX],
  picked: Option.some(FILE_TREE_INDEX),
  opens: [FILE_TREE_SRC],
};

/** How far a wheel drives the tree's own scroller: two rows and a margin. */
export const FILE_TREE_SCROLL = 200;

/**
 * The checks the probe asserts, by the step that makes them.
 *
 * - rest: the readout, the four roots, the folded children, the tree's box and
 *   the definite height (8);
 * - the press on `src`: the readout (no selection), its two children and the
 *   sibling that stays folded (4);
 * - the row below the box, then the wheel: the box, its place outside the tree,
 *   the offset, the bottom row inside, the top row pushed out and its place above the box (7);
 * - the press on `readme.md`: the readout and the folder still open (2);
 * - the wheel back up: the offset it returns to (1);
 * - the keyboard: the focus a press lands, the arrow's move, Enter's selection
 *   and the typed prefix (4).
 */
export const FILE_TREE_CHECKS = 26;
