import { typeaheadMatchIndex } from "@gpuixui/components/typeahead";
import { spokenText } from "@gpuixui/primitives/core";
import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as MutableHashSet from "effect/MutableHashSet";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Schema from "effect/Schema";
import { listOf } from "../internal/list.js";
import { neighbourKey } from "../selection/logic.js";

export const TREE_INDENT = 16;

export interface TreeSpec<T> {
  readonly keyOf: (node: T) => string;

  readonly childrenOf: (node: T) => ReadonlyArray<T> | null | undefined;
}

export interface TreeRow<T> {
  readonly node: T;
  readonly key: string;

  readonly depth: number;

  readonly parent: Option.Option<string>;

  readonly hasChildren: boolean;

  readonly expanded: boolean;
}

export const flattenTree = <T>(
  roots: ReadonlyArray<T> | null | undefined,
  spec: TreeSpec<T>,
  expanded: HashSet.HashSet<string>,
): ReadonlyArray<TreeRow<T>> => {
  const rows: Array<TreeRow<T>> = [];

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
    const children = listOf(spec.childrenOf(node));
    const hasChildren = Arr.isReadonlyArrayNonEmpty(children);
    const open = hasChildren && HashSet.has(expanded, key);
    rows.push({ node, key, depth, parent, hasChildren, expanded: open });
    if (!open) return;
    const path = HashSet.add(ancestors, key);
    Arr.forEach(children, (child) =>
      visit(child, depth + 1, Option.some(key), path),
    );
  };

  Arr.forEach(listOf(roots), (root) =>
    visit(root, 0, Option.none(), HashSet.empty()),
  );
  return rows;
};

export interface PaintedRow<T> {
  readonly row: TreeRow<T>;

  readonly leaving: boolean;
}

export const paintedRows = <T>(
  rows: ReadonlyArray<TreeRow<T>>,
  leaving: ReadonlyArray<TreeRow<T>>,
  before: ReadonlyArray<TreeRow<T>>,
): ReadonlyArray<PaintedRow<T>> => {
  const visible = HashSet.fromIterable(Arr.map(rows, (row) => row.key));
  const anchorOf = (row: TreeRow<T>): Option.Option<string> =>
    pipe(
      Arr.findFirstIndex(before, (candidate) => candidate.key === row.key),
      Option.flatMap((index) =>
        Arr.findFirst(Arr.drop(before, index + 1), (candidate) =>
          HashSet.has(visible, candidate.key),
        ),
      ),
      Option.map((candidate) => candidate.key),
    );
  const anchoredBefore = (key: string): ReadonlyArray<TreeRow<T>> =>
    Arr.filter(leaving, (row) => Option.contains(anchorOf(row), key));

  return [
    ...Arr.flatMap(rows, (row) => [
      ...Arr.map(anchoredBefore(row.key), (gone) => ({
        row: gone,
        leaving: true,
      })),
      { row, leaving: false },
    ]),
    ...Arr.map(
      Arr.filter(leaving, (row) => Option.isNone(anchorOf(row))),
      (row) => ({ row, leaving: true }),
    ),
  ];
};

export const branchKeys = <T>(
  roots: ReadonlyArray<T> | null | undefined,
  spec: TreeSpec<T>,
): ReadonlyArray<string> => {
  const keys: Array<string> = [];
  const seen = MutableHashSet.empty<string>();

  const visit = (node: T, ancestors: HashSet.HashSet<string>): void => {
    const key = spec.keyOf(node);
    if (HashSet.has(ancestors, key) || MutableHashSet.has(seen, key)) return;
    MutableHashSet.add(seen, key);
    const children = listOf(spec.childrenOf(node));
    if (Arr.isReadonlyArrayNonEmpty(children)) keys.push(key);
    const path = HashSet.add(ancestors, key);
    Arr.forEach(children, (child) => visit(child, path));
  };

  Arr.forEach(listOf(roots), (root) => visit(root, HashSet.empty()));
  return keys;
};

export const isExpanded = (
  expanded: HashSet.HashSet<string>,
  key: string,
): boolean => HashSet.has(expanded, key);

export const setExpanded = (
  expanded: HashSet.HashSet<string>,
  key: string,
  open: boolean,
): HashSet.HashSet<string> =>
  open ? HashSet.add(expanded, key) : HashSet.remove(expanded, key);

export const toggleExpanded = (
  expanded: HashSet.HashSet<string>,
  key: string,
): HashSet.HashSet<string> =>
  setExpanded(expanded, key, !isExpanded(expanded, key));

export const collapseAll = (): HashSet.HashSet<string> => HashSet.empty();

export const expandedSet = (value: unknown): HashSet.HashSet<string> =>
  P.isIterable(value)
    ? HashSet.fromIterable(Arr.filter(Arr.fromIterable(value), P.isString))
    : HashSet.empty();

export const expandAll = <T>(
  roots: ReadonlyArray<T> | null | undefined,
  spec: TreeSpec<T>,
): HashSet.HashSet<string> => HashSet.fromIterable(branchKeys(roots, spec));

export const expandedPath = <T>(
  roots: ReadonlyArray<T> | null | undefined,
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
        const inside = walk(listOf(spec.childrenOf(node)), next);
        return Option.isSome(inside) ? inside : walk(Arr.drop(nodes, 1), path);
      },
    });

  return walk(listOf(roots), []);
};

export const expandTo = <T>(
  expanded: HashSet.HashSet<string>,
  roots: ReadonlyArray<T> | null | undefined,
  spec: TreeSpec<T>,
  key: string,
): HashSet.HashSet<string> =>
  Option.match(expandedPath(roots, spec, key), {
    onNone: () => expanded,
    onSome: (path) =>
      Arr.reduce(path, expanded, (set, ancestor) => HashSet.add(set, ancestor)),
  });

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

export const TreeKey = Schema.Literals(treeKeys);

export type TreeKey = typeof TreeKey.Type;

export const isTreeKey = Schema.is(TreeKey);

export interface TreeCursor {
  readonly expanded: HashSet.HashSet<string>;
  readonly active: Option.Option<string>;
}

export const emptyCursor: TreeCursor = {
  expanded: HashSet.empty(),
  active: Option.none(),
};

export const findRow = <T>(
  rows: ReadonlyArray<TreeRow<T>>,
  key: Option.Option<string>,
): Option.Option<TreeRow<T>> =>
  Option.flatMap(key, (wanted) =>
    Arr.findFirst(rows, (row) => row.key === wanted),
  );

const indexOf = <T>(
  rows: ReadonlyArray<TreeRow<T>>,
  key: Option.Option<string>,
): Option.Option<number> =>
  Option.flatMap(key, (wanted) =>
    Arr.findFirstIndex(rows, (row) => row.key === wanted),
  );

const at = <T>(
  rows: ReadonlyArray<TreeRow<T>>,
  index: number,
): Option.Option<TreeRow<T>> => Option.fromNullishOr(rows[index]);

export const cursorRow = <T>(
  rows: ReadonlyArray<TreeRow<T>>,
  cursor: TreeCursor,
): Option.Option<TreeRow<T>> =>
  Option.orElse(findRow(rows, cursor.active), () => Arr.head(rows));

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

export const treeName = (label: string, key: string): string =>
  spokenText(Option.fromNullishOr(label), key);

export const typeAheadRow = <T>(
  rows: ReadonlyArray<TreeRow<T>>,
  active: Option.Option<string>,
  prefix: string,
  labelOf: (row: TreeRow<T>) => string,
): Option.Option<string> =>
  Option.flatMap(
    typeaheadMatchIndex(
      Arr.map(rows, (row) => ({
        label: treeName(labelOf(row), row.key),
        disabled: false,
      })),
      indexOf(rows, active),
      prefix,
    ),
    (index) => Option.map(at(rows, index), (row) => row.key),
  );
