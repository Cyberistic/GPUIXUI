/**
 * Maps a native focus id back to the `testId` the automation tree exposes.
 *
 * The window reports focus as a host id (`getFocusedElementId`), while a probe
 * names elements by `testId`. A miss is `None`, never a fallback to the root:
 * reporting the container as focused would make every focus assertion pass
 * against the wrong element.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** The fields of an automation node this module needs. */
export interface LiveNode {
  readonly id: number;
  readonly testId?: string;
  readonly children?: ReadonlyArray<LiveNode>;
}

/** The `testId` of the node with `elementId`, or `None` when it has none. */
export const testIdOf = (
  tree: LiveNode | null,
  elementId: number,
): Option.Option<string> =>
  Option.match(Option.fromNullishOr(tree), {
    onNone: () => Option.none(),
    onSome: (node) => find(node, elementId),
  });

const find = (node: LiveNode, elementId: number): Option.Option<string> =>
  node.id === elementId
    ? Option.fromNullishOr(node.testId)
    : Option.firstSomeOf(
        Arr.map(node.children ?? [], (child) => find(child, elementId)),
      );
