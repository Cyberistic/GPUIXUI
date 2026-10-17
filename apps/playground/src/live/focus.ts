/**
 * Maps a native focus id back to the `testId` the automation tree exposes.
 *
 * The renderer reports focus as a host id (`getFocusedElementId`), while a
 * scenario names elements by `testId`. The live runner owns both, so the bridge
 * is this tree walk. A miss is `None`, never a fallback to the root: reporting
 * the container as focused would make every focus assertion pass against the
 * wrong element.
 */
import type { TreeNode } from "@gpuix/native/automation";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** The `testId` of the node with `elementId`, or `None` when it has none. */
export const testIdOf = (
  tree: TreeNode | null,
  elementId: number,
): Option.Option<string> =>
  Option.match(Option.fromNullishOr(tree), {
    onNone: () => Option.none(),
    onSome: (node) => find(node, elementId),
  });

const find = (node: TreeNode, elementId: number): Option.Option<string> =>
  node.id === elementId
    ? Option.fromNullishOr(node.testId)
    : Option.firstSomeOf(
        Arr.map(node.children ?? [], (child) => find(child, elementId)),
      );
