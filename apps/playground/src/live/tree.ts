/**
 * Counts the nodes the automation protocol reports.
 *
 * The tree is the **retained** tree: a virtual list keeps a node for every row
 * while painting only a window, so this count is the live cost metric, not a
 * painted-row count (plans `301`, `620`). A missing tree is zero, never a
 * fabricated root.
 */
import type { TreeNode } from "@gpuix/native/automation";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

const countNode = (node: TreeNode): number =>
  1 +
  Arr.reduce(node.children ?? [], 0, (sum, child) => sum + countNode(child));

/** Every node in the tree, including the root; `0` when there is no tree. */
export const countNodes = (tree: Option.Option<TreeNode>): number =>
  Option.match(tree, { onNone: () => 0, onSome: countNode });
