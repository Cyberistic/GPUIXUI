/**
 * The virtualized file-tree fixture: one `<virtual-list>` row per visible node.
 *
 * A file tree is the Tier 3/4 capability that needs both halves of the runtime
 * at once — flattening a hierarchy into rows, and building only the rows near
 * the viewport. The dataset is deliberately larger than the viewport by three
 * orders of magnitude (40 directories × 99 files) so the painted row count is
 * evidence of windowing rather than of a small list, and `TREE_REVEAL_INDEX`
 * sits deep enough that no probe could reach it by scrolling.
 *
 * Kept free of React so the fixture's flattening is a pure unit test.
 */
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** Directories at the root; each holds `TREE_FILE_COUNT` files. */
export const TREE_DIR_COUNT = 40;

/** Files per directory. */
export const TREE_FILE_COUNT = 99;

/** Every row paints at this height, so the window is `viewport / height`. */
export const TREE_ROW_HEIGHT = 28;

/** The list's height: ten rows, against four thousand when all are expanded. */
export const TREE_VIEWPORT_HEIGHT = 280;

/** The inset a depth-1 row adds to its label. */
export const TREE_INDENT = 16;

/**
 * The row a "reveal this path" action targets.
 *
 * Index 3000 is the thirtieth directory's own row (each block is 100 rows), so
 * the reveal's painted label is deterministic and far outside any wheel path.
 */
export const TREE_REVEAL_INDEX = 3000;

/** A root directory. */
export interface TreeDirectory {
  readonly kind: "dir";
  readonly id: string;
  readonly label: string;
  readonly depth: 0;
}

/** A file inside a directory; visible only while its parent is expanded. */
export interface TreeFile {
  readonly kind: "file";
  readonly id: string;
  readonly label: string;
  readonly depth: 1;
  readonly parent: string;
}

/** One node of the tree. */
export type TreeNode = TreeDirectory | TreeFile;

const pad = (value: number): string => pipe(`${value}`, Str.padStart(3, "0"));

const directoryId = (index: number): string => `dir-${pad(index)}`;

const fileId = (directory: string, index: number): string =>
  `file-${directory}/${pad(index)}`;

const directoryLabel = (index: number): string => `dir ${pad(index)}`;

const fileLabel = (directory: number, index: number): string =>
  `file ${pad(directory)}/${pad(index)}`;

const buildDirectory = (index: number): TreeDirectory => ({
  kind: "dir",
  id: directoryId(index),
  label: directoryLabel(index),
  depth: 0,
});

/**
 * Every node in document order: a directory immediately followed by its files.
 *
 * The order is what a flattened tree paints, so `index` in this array and the
 * row order a tree produces agree once the directories are expanded.
 */
export const TREE_NODES: ReadonlyArray<TreeNode> = Arr.flatMap(
  Arr.range(0, TREE_DIR_COUNT - 1),
  (directory) => {
    const node = buildDirectory(directory);
    const files = Arr.map(Arr.range(0, TREE_FILE_COUNT - 1), (file) => ({
      kind: "file" as const,
      id: fileId(node.id, file),
      label: fileLabel(directory, file),
      depth: 1 as const,
      parent: node.id,
    }));
    return Arr.prepend(files, node);
  },
);

/** Every directory id: expanding all of them makes every node visible. */
export const TREE_ALL_DIRECTORIES: ReadonlyArray<string> = Arr.map(
  Arr.filter(TREE_NODES, (node): node is TreeDirectory => node.kind === "dir"),
  (node) => node.id,
);

/**
 * The rows a tree paints: every directory, and a file whose parent is open.
 *
 * A row is not a node — a collapsed directory hides its whole subtree — which
 * is the flattening rule the probe asserts by index.
 */
export const visibleRows = (
  expanded: ReadonlyArray<string>,
): ReadonlyArray<TreeNode> =>
  Arr.filter(TREE_NODES, (node) =>
    node.kind === "dir" ? true : Arr.contains(expanded, node.parent),
  );

/** The node at a visible index, when the tree has that many rows. */
export const visibleRowAt = (
  expanded: ReadonlyArray<string>,
  index: number,
): Option.Option<TreeNode> => Arr.get(visibleRows(expanded), index);

/** The row's `testId`; the locator a probe presses. */
export const rowTestId = (node: TreeNode): string => `tree-row-${node.id}`;

/** The label's `testId`; the box an indentation assertion measures. */
export const labelTestId = (node: TreeNode): string => `tree-label-${node.id}`;

/** The disclosure control a pointer presses to open or close a directory. */
export const toggleTestId = (node: TreeNode): string =>
  `tree-toggle-${node.id}`;

/** The label's left inset for a node's depth. */
export const labelInset = (node: TreeNode): number => node.depth * TREE_INDENT;
