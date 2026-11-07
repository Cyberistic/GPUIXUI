import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

export const TREE_DIR_COUNT = 40;

export const TREE_FILE_COUNT = 99;

export const TREE_ROW_HEIGHT = 28;

export const TREE_VIEWPORT_HEIGHT = 280;

export const TREE_INDENT = 16;

export const TREE_REVEAL_INDEX = 3000;

export interface TreeDirectory {
  readonly kind: "dir";
  readonly id: string;
  readonly label: string;
  readonly depth: 0;
}

export interface TreeFile {
  readonly kind: "file";
  readonly id: string;
  readonly label: string;
  readonly depth: 1;
  readonly parent: string;
}

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

export const TREE_ALL_DIRECTORIES: ReadonlyArray<string> = Arr.map(
  Arr.filter(TREE_NODES, (node): node is TreeDirectory => node.kind === "dir"),
  (node) => node.id,
);

export const visibleRows = (
  expanded: ReadonlyArray<string>,
): ReadonlyArray<TreeNode> =>
  Arr.filter(TREE_NODES, (node) =>
    node.kind === "dir" ? true : Arr.contains(expanded, node.parent),
  );

export const visibleRowAt = (
  expanded: ReadonlyArray<string>,
  index: number,
): Option.Option<TreeNode> => Arr.get(visibleRows(expanded), index);

export const rowTestId = (node: TreeNode): string => `tree-row-${node.id}`;

export const labelTestId = (node: TreeNode): string => `tree-label-${node.id}`;

export const toggleTestId = (node: TreeNode): string =>
  `tree-toggle-${node.id}`;

export const labelInset = (node: TreeNode): number => node.depth * TREE_INDENT;
