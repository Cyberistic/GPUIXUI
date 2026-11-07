import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export class A11yNode extends Schema.Class<A11yNode>("A11yNode")({
  aria: Schema.Struct({
    role: Schema.optionalKey(Schema.String),
    label: Schema.optionalKey(Schema.String),
    value: Schema.optionalKey(Schema.String),
    description: Schema.optionalKey(Schema.String),
  }),
  children: Schema.optionalKey(Schema.Array(Schema.String)),
}) {}

export class A11yTree extends Schema.Class<A11yTree>("A11yTree")({
  root: Schema.String,
  nodes: Schema.Record(Schema.String, A11yNode),
}) {}

export const decodeA11yTree = Schema.decodeUnknownSync(A11yTree);

export const roleOf = (tree: A11yTree, id: string): string =>
  tree.nodes[id]?.aria.role ?? "";

export const descendants = (
  tree: A11yTree,
  id: string,
): ReadonlyArray<string> =>
  Arr.flatMap(tree.nodes[id]?.children ?? [], (child) => [
    child,
    ...descendants(tree, child),
  ]);

export const withRole = (
  tree: A11yTree,
  id: string,
  role: string,
): ReadonlyArray<string> =>
  Arr.filter(descendants(tree, id), (node) => roleOf(tree, node) === role);

export const onlyRole = (tree: A11yTree, role: string): string =>
  Option.getOrElse(
    Arr.findFirst(
      Object.keys(tree.nodes),
      (node) => roleOf(tree, node) === role,
    ),
    () => {
      throw new Error(`the tree has no ${role} node`);
    },
  );
