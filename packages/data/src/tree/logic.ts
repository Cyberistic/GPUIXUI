/**
 * A tree, flattened to the rows a reader can see, as pure data.
 *
 * The rules are the ones `virtual-tree-lifecycle` measured in a window: a
 * 4 000-row tree paints a ten-row window, expand and collapse repaint the
 * flattening in place, a nested row insets by **16px** per level, and the arrow
 * keys move **native focus** row by row rather than mounting a tab stop per row.
 * Nothing here paints or focuses: {@link flattenTree} answers the rows, and
 * {@link treeCursorMove} answers the expansion and active row a key produces.
 *
 * The cursor is data — an expanded set plus the active key — so a tree can be
 * driven from Effect or a store exactly like the table's selection. The component
 * moves native focus towards the active row after the commit; a call from the key
 * handler moved nothing, because the row was still outside the tab order (the
 * same measured rule the table example follows).
 *
 * The type-ahead rule is not this module's: the window, the repeat rule and the
 * character a keystroke types come from `@gpuixui/components/typeahead`, the
 * seam a list and a menu also read, so a tree cannot disagree with them about
 * what a typed prefix means. {@link typeAheadRow} keeps only the step that maps
 * the position the seam answers back onto this tree's row key.
 */

import { typeaheadMatchIndex } from "@gpuixui/components/typeahead";
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as MutableHashSet from "effect/MutableHashSet";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { neighbourKey } from "../selection/logic.js";

/**
 * The inset one nesting level adds, in pixels.
 *
 * Measured by `virtual-tree-lifecycle`: a child row's label sits 16px inside its
 * parent's, which is what makes the hierarchy readable without a paint.
 */
export const TREE_INDENT = 16;

/** What a flattened tree needs from the caller. */
export interface TreeSpec<T> {
  /** The stable identity a row is expanded, activated and focused by. */
  readonly keyOf: (node: T) => string;
  /** The children a node has, in paint order. A leaf answers `[]`. */
  readonly childrenOf: (node: T) => ReadonlyArray<T>;
}

/** One visible row: the node, where it sits and whether its children paint. */
export interface TreeRow<T> {
  readonly node: T;
  readonly key: string;
  /** `0` at a root, one more for every level of nesting. */
  readonly depth: number;
  /** The key of the node this row hangs from; absent at a root. */
  readonly parent: Option.Option<string>;
  /** The node has children, so it paints a chevron whether or not it is open. */
  readonly hasChildren: boolean;
  /** The node's children paint under it. */
  readonly expanded: boolean;
}

/**
 * The rows a reader can see, in paint order.
 *
 * A node paints once. A key already painted is not entered a second time, so a
 * caller's duplicated sibling or a node repeated under its own descendant cannot
 * make the flatten loop or paint two rows that answer to one key. That is a
 * caller mistake the tree swallows rather than throws: a data surface that
 * refuses to paint is worse than one that paints the node its caller gave it.
 */
export const flattenTree = <T>(
  roots: ReadonlyArray<T>,
  spec: TreeSpec<T>,
  expanded: HashSet.HashSet<string>,
): ReadonlyArray<TreeRow<T>> => {
  const rows: Array<TreeRow<T>> = [];
  // The walk is the one place a mutable set earns its keep: "painted once" is
  // carried across two recursive branches, and an immutable copy per node would
  // make the flatten quadratic for no gain. Nothing escapes this function.
  const painted = MutableHashSet.empty<string>();

  const visit = (
    node: T,
    depth: number,
    parent: Option.Option<string>,
    ancestors: HashSet.HashSet<string>,
  ): void => {
    const key = spec.keyOf(node);
    if (HashSet.has(ancestors, key) || MutableHashSet.has(painted, key)) return;
    MutableHashSet.add(painted, key);
    const children = spec.childrenOf(node);
    const hasChildren = Arr.isReadonlyArrayNonEmpty(children);
    const open = hasChildren && HashSet.has(expanded, key);
    rows.push({ node, key, depth, parent, hasChildren, expanded: open });
    if (!open) return;
    const path = HashSet.add(ancestors, key);
    Arr.forEach(children, (child) =>
      visit(child, depth + 1, Option.some(key), path),
    );
  };

  Arr.forEach(roots, (root) => visit(root, 0, Option.none(), HashSet.empty()));
  return rows;
};

/** Every key in the tree that has children, in paint order. */
export const branchKeys = <T>(
  roots: ReadonlyArray<T>,
  spec: TreeSpec<T>,
): ReadonlyArray<string> => {
  const keys: Array<string> = [];
  const seen = MutableHashSet.empty<string>();

  const visit = (node: T, ancestors: HashSet.HashSet<string>): void => {
    const key = spec.keyOf(node);
    if (HashSet.has(ancestors, key) || MutableHashSet.has(seen, key)) return;
    MutableHashSet.add(seen, key);
    const children = spec.childrenOf(node);
    if (Arr.isReadonlyArrayNonEmpty(children)) keys.push(key);
    const path = HashSet.add(ancestors, key);
    Arr.forEach(children, (child) => visit(child, path));
  };

  Arr.forEach(roots, (root) => visit(root, HashSet.empty()));
  return keys;
};

/** Whether a node's children paint. */
export const isExpanded = (
  expanded: HashSet.HashSet<string>,
  key: string,
): boolean => HashSet.has(expanded, key);

/** Open or close one node. */
export const setExpanded = (
  expanded: HashSet.HashSet<string>,
  key: string,
  open: boolean,
): HashSet.HashSet<string> =>
  open ? HashSet.add(expanded, key) : HashSet.remove(expanded, key);

/** Flip one node. */
export const toggleExpanded = (
  expanded: HashSet.HashSet<string>,
  key: string,
): HashSet.HashSet<string> =>
  setExpanded(expanded, key, !isExpanded(expanded, key));

/** Nothing open. */
export const collapseAll = (): HashSet.HashSet<string> => HashSet.empty();

/** Every branch open, which is what "expand all" means. */
export const expandAll = <T>(
  roots: ReadonlyArray<T>,
  spec: TreeSpec<T>,
): HashSet.HashSet<string> => HashSet.fromIterable(branchKeys(roots, spec));

/**
 * Every ancestor of `key`, and `key` itself, so revealing a node opens it.
 *
 * Walking up needs no parent map: the caller's tree already answers a node's
 * children, so a depth-first search records the path to the target. A key the
 * tree does not hold answers nothing, and the caller's set is unchanged.
 */
export const expandedPath = <T>(
  roots: ReadonlyArray<T>,
  spec: TreeSpec<T>,
  key: string,
): Option.Option<ReadonlyArray<string>> => {
  const walk = (
    nodes: ReadonlyArray<T>,
    path: ReadonlyArray<string>,
  ): Option.Option<ReadonlyArray<string>> =>
    Option.match(Arr.head(nodes), {
      onNone: () => Option.none(),
      onSome: (node) => {
        const nodeKey = spec.keyOf(node);
        if (Arr.contains(path, nodeKey)) {
          return walk(Arr.drop(nodes, 1), path);
        }
        const next = [...path, nodeKey];
        if (nodeKey === key) return Option.some(next);
        const inside = walk(spec.childrenOf(node), next);
        return Option.isSome(inside) ? inside : walk(Arr.drop(nodes, 1), path);
      },
    });

  return walk(roots, []);
};

/** Expand every ancestor of `key` in one step, for a reveal or a search hit. */
export const expandTo = <T>(
  expanded: HashSet.HashSet<string>,
  roots: ReadonlyArray<T>,
  spec: TreeSpec<T>,
  key: string,
): HashSet.HashSet<string> =>
  Option.match(expandedPath(roots, spec, key), {
    onNone: () => expanded,
    onSome: (path) =>
      Arr.reduce(path, expanded, (set, ancestor) => HashSet.add(set, ancestor)),
  });

/** The keys a tree row answers. */
export const treeKeys = [
  "up",
  "down",
  "home",
  "end",
  "right",
  "left",
  "enter",
  "space",
] as const;

/** One key a tree row answers. */
export const TreeKey = Schema.Literals(treeKeys);

/** One key a tree row answers. */
export type TreeKey = typeof TreeKey.Type;

/** Whether a key event belongs to the tree, so an unrelated key passes on. */
export const isTreeKey = Schema.is(TreeKey);

/** The cursor a tree holds: what is open, and the row the keyboard stands on. */
export interface TreeCursor {
  readonly expanded: HashSet.HashSet<string>;
  readonly active: Option.Option<string>;
}

/** Nothing open, nothing active. */
export const emptyCursor: TreeCursor = {
  expanded: HashSet.empty(),
  active: Option.none(),
};

/** The row a key names, when the tree paints it. */
export const findRow = <T>(
  rows: ReadonlyArray<TreeRow<T>>,
  key: Option.Option<string>,
): Option.Option<TreeRow<T>> =>
  Option.flatMap(key, (wanted) =>
    Arr.findFirst(rows, (row) => row.key === wanted),
  );

/** The index a row paints at, when the tree paints it. */
const indexOf = <T>(
  rows: ReadonlyArray<TreeRow<T>>,
  key: Option.Option<string>,
): Option.Option<number> =>
  Option.flatMap(key, (wanted) =>
    Arr.findFirstIndex(rows, (row) => row.key === wanted),
  );

/** The row at an index. */
const at = <T>(
  rows: ReadonlyArray<TreeRow<T>>,
  index: number,
): Option.Option<TreeRow<T>> => Option.fromNullishOr(rows[index]);

/** The row a tree starts on: the active one while it paints, else the first. */
export const cursorRow = <T>(
  rows: ReadonlyArray<TreeRow<T>>,
  cursor: TreeCursor,
): Option.Option<TreeRow<T>> =>
  Option.orElse(findRow(rows, cursor.active), () => Arr.head(rows));

/**
 * The cursor a key produces over the painted rows.
 *
 * The contract is the desktop tree's: Up/Down/Home/End move the active row and
 * clamp at the ends, Right opens a closed branch or steps into an open one,
 * Left closes an open branch or steps out to its parent, and Enter or Space
 * flips the branch under the cursor. A leaf answers Right/Left with no move.
 * A move never wraps: the last row's Down stays where it is.
 */
export const treeCursorMove = <T>(
  rows: ReadonlyArray<TreeRow<T>>,
  cursor: TreeCursor,
  key: TreeKey,
): TreeCursor => {
  const order = Arr.map(rows, (row) => row.key);
  const active = findRow(rows, cursor.active);

  const focus = (next: Option.Option<string>): TreeCursor => ({
    ...cursor,
    active: next,
  });

  const opened = (row: TreeRow<T>, next: boolean): TreeCursor => ({
    expanded: setExpanded(cursor.expanded, row.key, next),
    active: Option.some(row.key),
  });
  return Match.value(key).pipe(
    Match.when("up", () => focus(neighbourKey(order, cursor.active, -1))),
    Match.when("down", () => focus(neighbourKey(order, cursor.active, 1))),
    Match.when("home", () => focus(Arr.head(order))),
    Match.when("end", () =>
      focus(Option.fromNullishOr(order[order.length - 1])),
    ),
    Match.when("right", () =>
      Option.match(active, {
        onNone: () => focus(Arr.head(order)),
        onSome: (row) => {
          const open = isExpanded(cursor.expanded, row.key);
          if (!row.hasChildren) return focus(Option.some(row.key));
          if (!open) return opened(row, true);
          return Option.match(indexOf(rows, Option.some(row.key)), {
            onNone: () => cursor,
            onSome: (index) =>
              Option.match(at(rows, index + 1), {
                onNone: () => cursor,
                onSome: (next) =>
                  next.depth === row.depth + 1
                    ? focus(Option.some(next.key))
                    : cursor,
              }),
          });
        },
      }),
    ),
    Match.when("left", () =>
      Option.match(active, {
        onNone: () => cursor,
        onSome: (row) =>
          row.hasChildren && isExpanded(cursor.expanded, row.key)
            ? opened(row, false)
            : Option.match(row.parent, {
                // A root has no parent to step out to, so Left leaves the
                // cursor where it is rather than clearing it: an empty cursor
                // falls back to the first row, which moves a reader standing on
                // a later root.
                onNone: () => cursor,
                onSome: (parent) => focus(Option.some(parent)),
              }),
      }),
    ),
    Match.when("enter", () =>
      Option.match(active, {
        onNone: () => cursor,
        onSome: (row) =>
          row.hasChildren
            ? opened(row, !isExpanded(cursor.expanded, row.key))
            : focus(Option.some(row.key)),
      }),
    ),
    Match.when("space", () =>
      Option.match(active, {
        onNone: () => cursor,
        onSome: (row) =>
          row.hasChildren
            ? opened(row, !isExpanded(cursor.expanded, row.key))
            : focus(Option.some(row.key)),
      }),
    ),
    Match.exhaustive,
  );
};

/**
 * The row a typed prefix names: the first row **after** the active one whose
 * label starts with the prefix, wrapping to the first match.
 *
 * Searching after the cursor is what lets a repeated letter walk the matches.
 * An empty prefix, or one nothing matches, answers `None`, so the caller keeps
 * the row it was on.
 */
export const typeAheadRow = <T>(
  rows: ReadonlyArray<TreeRow<T>>,
  active: Option.Option<string>,
  prefix: string,
  labelOf: (row: TreeRow<T>) => string,
): Option.Option<string> =>
  Option.flatMap(
    typeaheadMatchIndex(
      Arr.map(rows, (row) => ({ label: labelOf(row), disabled: false })),
      indexOf(rows, active),
      prefix,
    ),
    (index) => Option.map(at(rows, index), (row) => row.key),
  );
