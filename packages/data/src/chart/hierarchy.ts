import * as Arr from "effect/Array";

/**
 * The rows a hierarchy chart reads.
 *
 * A treemap and a sunburst draw the same thing in two shapes: a **hierarchy**
 * of named nodes, each with a value. The value is the node's own or the sum
 * of its children's, and the area or the angle is that share of the parent.
 *
 * The hierarchy is **flat** — one row per node, each naming its path — and
 * the path is the node's **route** through the tree, joined by a separator:
 * `"root/engineering/frontend"`. A node's name is the last segment of its
 * path, so a reader who writes a path writes the names too.
 *
 * A flat list of **leaves** is the common case, and it has no root: every
 * path names a parent that is not there. So the rows are given a root — one
 * path that holds every leaf — and the compiler's own requirement of exactly
 * one root is met by construction rather than by the caller.
 */

/** The separator a path's segments are joined by. */
export const HIERARCHY_SEPARATOR = "/";

/** One node of a hierarchy. */
export interface HierarchyNode {
  /**
   * The node's route through the tree.
   *
   * `"root/engineering"` is a node named `engineering` under `root`. A node
   * whose path names a parent that is not in the list is a **root of its own**,
   * and a list with two roots has no tree.
   */
  readonly path: string;
  /** The node's value, when the caller gave one. */
  readonly value?: number;
}

/** One row of a flat hierarchy, as the scene compiler reads it. */
export interface HierarchyRow {
  /**
   * The node's route through the tree.
   *
   * It is the route **the caller wrote**, with a root above it when the
   * caller's list named none. The compiler reads the route to build the
   * tree, and the colour a node paints is looked up by it.
   */
  readonly path: string;
  /** The node's name — the last segment of its path. */
  readonly name: string;
  /** The node's value. */
  readonly value: number;
  /**
   * The route the caller wrote, before a root was put above it.
   *
   * A caller's own key names the node they named, so a colour looked up by
   * it finds the node the caller meant.
   */
  readonly key: string;
}

/**
 * The path the root takes when the caller's paths name no root.
 *
 * It begins with a character a route cannot start with, so the root can
 * never collide with a path the caller wrote.
 */
const ROOT_PATH = "\u0000root";

/**
 * The rows a flat hierarchy makes, with a root.
 *
 * A node's value is its own when the caller gave one, and the **sum of its
 * children's** when it did not: a parent that holds no value of its own
 * holds its subtree's, which is what a reader means by a parent's size.
 *
 * A value that is not a number counts as nothing: the same rule every other
 * chart follows, so a stored `NaN` paints no mark rather than poisoning the
 * sum it belongs to.
 */
export const hierarchyRows = (
  nodes: ReadonlyArray<HierarchyNode>,
): ReadonlyArray<HierarchyRow> => {
  if (nodes.length === 0) return [];

  const paths = nodes.map((node) => node.path);
  const present = new Set(paths);
  /**
   * The parent a path names, when the list holds it.
   *
   * A path's parent is the path without its last segment: `"root/a"`'s
   * parent is `"root"`. A parent the list does not hold means the path is a
   * **root of its own** — and the tree is grown from the paths the list
   * holds, not from the paths it implies.
   */
  const parentOf = (path: string): string | undefined => {
    const at = path.lastIndexOf(HIERARCHY_SEPARATOR);
    if (at <= 0) return undefined;
    const parent = path.slice(0, at);
    return present.has(parent) ? parent : undefined;
  };
  /**
   * The paths that are **roots of their own**.
   *
   * A path is a root when the list holds no parent for it: either it names no
   * parent at all (`"a"`), or the parent it names (`"root"` of `"root/a"`)
   * is not in the list.
   *
   * Two such paths are **one** tree when they share a parent that the list
   * does not hold: `"root/a"` and `"root/b"` are two branches of one `root`,
   * and the tree the compiler builds holds them both. A list of paths with no
   * shared parent is several trees, and the compiler wants one.
   */
  const rootPaths = paths.filter((path) => parentOf(path) === undefined);
  const roots =
    rootPaths.length > 1 && shareAParent(rootPaths)
      ? [rootPaths[0] ?? ""]
      : rootPaths;

  // The children's values are summed per parent, so a parent without a value
  // of its own holds its subtree's.
  const sums = new Map<string, number>();
  for (const node of nodes) {
    const parent = parentOf(node.path);
    if (parent === undefined) continue;
    const value = node.value === undefined || !Number.isFinite(node.value)
      ? 0
      : node.value;
    sums.set(parent, (sums.get(parent) ?? 0) + value);
  }

  const rows: HierarchyRow[] = nodes.map((node) => ({
    path: node.path,
    name: nameOf(node.path),
    // A value that is not a finite number counts as nothing: the same rule
    // every other chart follows, so a stored `NaN` paints no mark rather
    // than poisoning the sum it belongs to.
    value: finiteOr(node.value, sums.get(node.path) ?? 0),
    key: node.path,
  }));

  // A list with one root needs no root of its own.
  if (roots.length === 1) return rows;

  // A list with no root — every path is a leaf — gets one, and a list with
  // two roots gets one that holds them both, so the compiler's own rule of
  // exactly one root is met either way.
  //
  // The root sits **above** the whole list, and the caller's routes are
  // kept under it. The root's own path is one the caller cannot have
  // written, so it can never collide with a route of theirs.
  const rootValue = rows.reduce((total, row) => total + row.value, 0);
  return [
    { path: ROOT_PATH, name: ROOT_PATH, value: rootValue, key: ROOT_PATH },
    ...rows.map((row) => ({
      ...row,
      path: `${ROOT_PATH}/${row.path}`,
    })),
  ];
};

/**
 * A value that is a finite number, or the one that stands for it.
 *
 * A value that is not finite — a `NaN`, an infinity — is **nothing**: a mark
 * of no size, and a sum that stays a sum.
 */
const finiteOr = (value: number | undefined, fallback: number): number =>
  value === undefined || !Number.isFinite(value) ? fallback : value;

/**
 * Whether the paths share a parent the list does not hold.
 *
 * `"root/a"` and `"root/b"` share the parent `"root"`, so they are two
 * branches of one tree and the tree needs a root above them. `"a"` and
 * `"b"` share no parent, so they are two trees and the caller asked for
 * two.
 */
const shareAParent = (paths: ReadonlyArray<string>): boolean => {
  const first = paths[0];
  if (first === undefined) return false;
  const at = first.lastIndexOf(HIERARCHY_SEPARATOR);
  if (at <= 0) return false;
  const parent = first.slice(0, at);
  return Arr.every(paths, (path) => {
    const cut = path.lastIndexOf(HIERARCHY_SEPARATOR);
    return cut > 0 && path.slice(0, cut) === parent;
  });
};

/**
 * The rows that are **roots** — the ones no other row sits under.
 *
 * A root is the whole: a treemap's background and a sunburst's centre.
 */
export const hierarchyRoots = (
  rows: ReadonlyArray<HierarchyRow>,
): ReadonlyArray<HierarchyRow> => {
  // A row is a root when **no other row sits under it**: no other row's path
  // is a prefix of its own.
  const paths = rows.map((row) => row.path);
  return rows.filter(
    (row) =>
      !paths.some(
        (path) => path !== row.path && row.path.startsWith(`${path}/`),
      ),
  );
};

/** The name a path's last segment names. */
export const nameOf = (path: string): string => {
  const at = path.lastIndexOf(HIERARCHY_SEPARATOR);
  return at === -1 ? path : path.slice(at + 1);
};

/**
 * The paths a hierarchy paints, in the order the compiler reads them.
 *
 * The root is not painted: it is the whole, and the whole is the plot's
 * background. A treemap draws its **leaves**, and a sunburst its rings.
 */
export const hierarchyLeaves = (
  rows: ReadonlyArray<HierarchyRow>,
): ReadonlyArray<HierarchyRow> => {
  const parents = new Set(
    rows.map((row) => parentPath(row.path)).filter((path) => path !== undefined),
  );
  return rows.filter((row) => !parents.has(row.path));
};

/** The parent a path names, when the path names one at all. */
const parentPath = (path: string): string | undefined => {
  const at = path.lastIndexOf(HIERARCHY_SEPARATOR);
  return at <= 0 ? undefined : path.slice(0, at);
};

/** One node of a flow graph. */
export interface FlowNode {
  /** The node's identity, which a link names. */
  readonly id: string;
  /** The node's name, which a label prints. */
  readonly name?: string;
}

/** One edge of a flow graph. */
export interface FlowLink {
  /** The node the flow leaves. */
  readonly source: string;
  /** The node the flow reaches. */
  readonly target: string;
  /** The flow's size. */
  readonly value: number;
}

/**
 * The nodes and links a flow graph holds.
 *
 * A link naming a node the graph does not hold is **dropped**: the compiler
 * rejects such a link, and a reader who drew a flow to a node that is not
 * there would rather see the flow that is.
 *
 * A link whose value is not a number, or is not positive, is dropped too: a
 * flow of nothing has no thickness, and the compiler's own rule is that a
 * graph must hold at least one positive link.
 */
export const flowGraph = (
  nodes: ReadonlyArray<FlowNode>,
  links: ReadonlyArray<FlowLink>,
): {
  readonly nodes: ReadonlyArray<FlowNode>;
  readonly links: ReadonlyArray<FlowLink>;
} => {
  const present = new Set(nodes.map((node) => node.id));
  return {
    nodes,
    links: links.filter(
      (link) =>
        present.has(link.source) &&
        present.has(link.target) &&
        Number.isFinite(link.value) &&
        link.value > 0,
    ),
  };
};
