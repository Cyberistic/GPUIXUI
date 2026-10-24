/**
 * The `file-tree-lifecycle` fixture: the shipped `@gpuixui/files` `FileTree` in
 * a window.
 *
 * Tier 4's *File trees* row cites `virtual-tree-lifecycle`, which measures the
 * runtime's virtual list around a probe-local flattening — no window had mounted
 * the shipped tree, pressed one of its rows, toggled the leading checkbox or
 * read the glyph-and-checkbox row the component adds over `@gpuixui/data`'s
 * tree. What only a window settles is the component's own two gestures: a press
 * on a row **replaces** the selection, and the checkbox **toggles** a row in it
 * without opening the folder the row belongs to.
 *
 * The workspace is small on purpose — four roots, two children under `src` — so
 * every row the probe names is arithmetic rather than a scroll hunt, and the
 * tree is given a four-row height so the two rows `src` opens are pushed out of
 * its box: the definite height is the other half of the fixture.
 *
 * A path is a row's key (`keyOf` is `node.path`), so an id is the path:
 * `file-tree-row-src/index.ts`.
 *
 * Native-free, so the premises are testable on a host with no binding.
 */
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import { TREE_INSET } from "@gpuixui/data";
import { targetSize } from "@gpuixui/tokens";

/** The workspace the tree is built from, by `buildFileTree`. */
export const FILE_TREE_PATHS: ReadonlyArray<string> = [
  "src/index.ts",
  "src/button.tsx",
  "assets/logo.png",
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

/** What the readout publishes: the selected keys and the last row pressed. */
export interface FileTreeState {
  readonly selected: ReadonlyArray<string>;
  /** The last row a press or Enter activated; `None` before any. */
  readonly picked: Option.Option<string>;
}

/** The state before any input: nothing selected, nothing picked. */
export const FILE_TREE_REST: FileTreeState = {
  selected: [],
  picked: Option.none(),
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
      `sel=${state.selected.length} keys=${keys} picked=${Option.getOrElse(state.picked, () => "-")}`,
  );

/**
 * The point a checkbox press lands on, in the row's own coordinates.
 *
 * A row is the depth inset, then the chevron's slot (`@gpuixui/data` gives it
 * `iconSize.md`), then the caller's content — and `FileTree`'s content starts
 * with the checkbox, whose press target is the library's own minimum target
 * size, centred vertically in the row. Both widths are read from the window, so
 * the point is the target's centre at any density or icon scale.
 */
export const fileTreeCheckboxOffset = (
  chevron: number,
  rowHeight: number,
): { readonly x: number; readonly y: number } => ({
  x: TREE_INSET + chevron + targetSize.minimum / 2,
  y: rowHeight / 2,
});

/** The states the steps drive, named once so the record reads the same lines. */

/** A press on the open folder: it opens and replaces the selection. */
export const FILE_TREE_OPENED: FileTreeState = {
  selected: [FILE_TREE_SRC],
  picked: Option.some(FILE_TREE_SRC),
};

/** A press on a file replaces the selection the folder had. */
export const FILE_TREE_README_PICKED: FileTreeState = {
  selected: [FILE_TREE_README],
  picked: Option.some(FILE_TREE_README),
};

/**
 * The leading checkbox, measured.
 *
 * The component documents the checkbox as toggling a row *in* the selection;
 * the window shows the same press also reaches the row, whose replace wins, so
 * a checkbox press leaves that row alone in the selection and activates it.
 * The probe pins the behaviour so a component fix flips it.
 */
export const FILE_TREE_CHECKBOX_PRESSED: FileTreeState = {
  selected: [FILE_TREE_ASSETS],
  picked: Option.some(FILE_TREE_ASSETS),
};

/** Enter on the row the arrow reached: the keyboard activates what focus holds. */
export const FILE_TREE_INDEX_PICKED: FileTreeState = {
  selected: [FILE_TREE_INDEX],
  picked: Option.some(FILE_TREE_INDEX),
};

/** How far a wheel drives the tree's own scroller: two rows and a margin. */
export const FILE_TREE_SCROLL = 200;

/**
 * The checks the probe asserts, by the step that makes them.
 *
 * - rest: the readout, the four roots, the folded child, the tree's box and the
 *   definite height (8);
 * - the press on `src`: the readout and its two children (3);
 * - the row below the box, then the wheel: the box, its place outside the tree,
 *   the offset, the bottom row inside and the top row pushed out (7);
 * - the press on `readme.md`: the readout and the folder still open (2);
 * - the wheel back up: the offset it returns to (1);
 * - the checkbox: the chevron slot it is measured from, the pressed row, the
 *   folder that press opens, the second press that closes it, and the row it
 *   leaves chosen (5);
 * - the keyboard: the focus a press lands, the arrow's move, Enter's activation
 *   and the typed prefix (4).
 */
export const FILE_TREE_CHECKS = 30;
