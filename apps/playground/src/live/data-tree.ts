/**
 * The `data-tree-lifecycle` fixture: the shipped `@gpuixui/data` workspace tree,
 * and the readout a window probe asserts against.
 *
 * The probe mounts `tree` from the package's example registry, so the ids belong
 * to `packages/data/examples/tree.example.tsx`, and the tree's own shape belongs
 * to `TreeView` (`${testId}-row-${key}`). The fixture owns the readout's
 * vocabulary and the row counts a check needs; `data-tree.test.ts` derives those
 * counts from the example's `workspace` literal rather than trusting the probe.
 *
 * Why a window adds anything: the offscreen `data-tree-core` scenario mounts the
 * same screen, but the tree's whole key contract is about **native focus** — one
 * tab stop that moves with the cursor, a `focusElement` call after the
 * `tabIndex` commit, and a type-ahead buffer fed by keys the row receives. None
 * of that rides on a synthesised key.
 */

import * as Option from "effect/Option";

/** The example's readout: the visible row count and the active row. */
export const DATA_TREE_READOUT = "tree-readout";
/** The three actions above the tree. */
export const DATA_TREE_EXPAND = "tree-expand";
export const DATA_TREE_COLLAPSE = "tree-collapse";
export const DATA_TREE_REVEAL = "tree-reveal";
/** The tree itself; every row derives its own id from this one. */
export const DATA_TREE = "tree";

/** One row, as `TreeView` names it: the node's own key. */
export const dataTreeRow = (key: string): string => `${DATA_TREE}-row-${key}`;

/** What the readout prints. */
export interface DataTreeState {
  readonly rows: number;
  /** The active row's key; `None` is the example's `-`. */
  readonly active: Option.Option<string>;
}

/**
 * The readout line, spelled once.
 *
 * The example interpolates both segments itself; `data-tree.test.ts` reads its
 * template and holds this spelling to it.
 */
export const dataTreeReadout = (state: DataTreeState): string =>
  `${state.rows} rows · active=${Option.getOrElse(state.active, () => "-")}`;

/**
 * The visible row count in each state the probe measures, derived by
 * `data-tree.test.ts` from the example's own `workspace` literal.
 *
 * The tree opens with `src` expanded; a press on an open folder closes it; a
 * reveal opens the whole path to `row.tsx`; the two actions fold and unfold
 * every branch.
 */
export const DATA_TREE_ROWS_FOLDED = 3;
export const DATA_TREE_ROWS_OPEN = 5;
export const DATA_TREE_ROWS_REVEALED = 9;
export const DATA_TREE_ROWS_ALL = 11;

/** The screen the example opens on: `src` expanded and active. */
export const DATA_TREE_INITIAL = dataTreeReadout({
  rows: DATA_TREE_ROWS_OPEN,
  active: Option.some("src"),
});

/** The deep node the reveal action names. */
export const DATA_TREE_REVEALED = "row.tsx";
