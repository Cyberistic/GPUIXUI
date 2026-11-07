import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export interface LiveNode {
  readonly id: number;
  readonly testId?: string;
  readonly children?: ReadonlyArray<LiveNode>;
}

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
