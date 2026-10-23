/**
 * The accessibility tree the renderer reports, decoded for behaviour suites.
 *
 * A GPUix window has no DOM to inspect, so an accessibility claim is held by
 * reading back the tree the platform built: `getA11yTree()` answers a node table
 * addressed by id, and the guards here decode it with `Schema` and walk it by
 * role. Three data surfaces share them — an empty state, a windowed table and a
 * caption all have to land inside the grid's own nodes.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/** One node of the accessibility tree the renderer reports. */
export class A11yNode extends Schema.Class<A11yNode>("A11yNode")({
  aria: Schema.Struct({
    role: Schema.optionalKey(Schema.String),
    label: Schema.optionalKey(Schema.String),
    value: Schema.optionalKey(Schema.String),
    description: Schema.optionalKey(Schema.String),
  }),
  children: Schema.optionalKey(Schema.Array(Schema.String)),
}) {}

/** The tree, with its node table addressed by id. */
export class A11yTree extends Schema.Class<A11yTree>("A11yTree")({
  root: Schema.String,
  nodes: Schema.Record(Schema.String, A11yNode),
}) {}

/** Decode a renderer's tree. */
export const decodeA11yTree = Schema.decodeUnknownSync(A11yTree);

/** The role the platform gave one node, if any. */
export const roleOf = (tree: A11yTree, id: string): string =>
  tree.nodes[id]?.aria.role ?? "";

/** Every node id under one id, in paint order. */
export const descendants = (
  tree: A11yTree,
  id: string,
): ReadonlyArray<string> =>
  Arr.flatMap(tree.nodes[id]?.children ?? [], (child) => [
    child,
    ...descendants(tree, child),
  ]);

/** The node ids under one id whose role is `role`, in paint order. */
export const withRole = (
  tree: A11yTree,
  id: string,
  role: string,
): ReadonlyArray<string> =>
  Arr.filter(descendants(tree, id), (node) => roleOf(tree, node) === role);

/** The one node id carrying `role`, failing the case when there is not one. */
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
