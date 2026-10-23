/**
 * The predicate tree an advanced filter composes, and the rules that read it.
 *
 * A query builder is a **tree of predicates**, not a string: every clause
 * names a field, a comparison and a value, and the clauses combine with `all`,
 * `any` and `not`. Modelling it as data means a builder, a saved query and a
 * table's own filter all read the same tree, and the evaluation stays a pure
 * function a test can hold.
 *
 * The comparisons are literal — a value is never a pattern — and a field's
 * value is read through the caller's `valueOf`, so the tree never learns what
 * a row is.
 *
 * ```ts
 * const tree: FilterTree = {
 *   kind: "all",
 *   children: [
 *     { kind: "predicate", field: "status", comparison: "equals", value: "tracked" },
 *     { kind: "predicate", field: "size", comparison: "greaterThan", value: "1024" },
 *   ],
 * };
 *
 * const kept = filterByTree(rows, tree, (row, field) => row[field]);
 * ```
 */

import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Number from "effect/Number";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** How a field's value is compared with a clause's value. */
export type Comparison =
  | "equals"
  | "notEquals"
  | "contains"
  | "greaterThan"
  | "lessThan";

/** The comparisons a builder offers, in the order it lists them. */
export const comparisons: ReadonlyArray<Comparison> = [
  "equals",
  "notEquals",
  "contains",
  "greaterThan",
  "lessThan",
];

/** One comparison over one field. */
export interface FieldPredicate {
  readonly kind: "predicate";
  /** The field the clause reads. */
  readonly field: string;
  readonly comparison: Comparison;
  /** The value the field is compared with. */
  readonly value: string;
}

/** Every child must match. */
export interface AllClause {
  readonly kind: "all";
  readonly children: ReadonlyArray<FilterTree>;
}

/** At least one child must match. */
export interface AnyClause {
  readonly kind: "any";
  readonly children: ReadonlyArray<FilterTree>;
}

/** The child must not match. */
export interface NotClause {
  readonly kind: "not";
  readonly child: FilterTree;
}

/** A predicate, or a boolean combination of predicates. */
export type FilterTree = FieldPredicate | AllClause | AnyClause | NotClause;

/** Whether a tree is a single comparison. */
export const isPredicate = (tree: FilterTree): tree is FieldPredicate =>
  tree.kind === "predicate";

/** Whether a tree is an `all` group. */
export const isAll = (tree: FilterTree): tree is AllClause =>
  tree.kind === "all";

/** Whether a tree is an `any` group. */
export const isAny = (tree: FilterTree): tree is AnyClause =>
  tree.kind === "any";

/** Whether a tree is a `not` group. */
export const isNot = (tree: FilterTree): tree is NotClause =>
  tree.kind === "not";

/** A number a comparison reads, or `None` when the text is not one. */
const numeric = (value: string | number): Option.Option<number> =>
  typeof value === "number" ? Option.some(value) : Number.parse(value);

/** Whether two sides both read as numbers and the first is beyond the second. */
const ordered = (
  left: string | number,
  right: string,
  compare: (one: number, other: number) => boolean,
): boolean =>
  Option.match(Option.all([numeric(left), numeric(right)]), {
    onNone: () => false,
    onSome: ([one, other]) => compare(one, other),
  });

/**
 * One comparison.
 *
 * A numeric comparison reads both sides as numbers, so a field the caller
 * stores as a number and a clause the caller types as text still compare. A
 * side that does not read as a number — a blank value the reader has not typed
 * yet, or text that is not one — never satisfies an order: the builder appends
 * a clause with no value, and the global `Number("")` is `0`, which would
 * otherwise keep every positive row.
 */
export const matchesComparison = (
  comparison: Comparison,
  left: string | number,
  right: string,
): boolean =>
  Match.value(comparison).pipe(
    Match.when("equals", () => `${left}` === right),
    Match.when("notEquals", () => `${left}` !== right),
    Match.when("contains", () =>
      Str.includes(Str.toLowerCase(right), 0)(Str.toLowerCase(`${left}`)),
    ),
    Match.when("greaterThan", () =>
      ordered(left, right, (one, other) => one > other),
    ),
    Match.when("lessThan", () =>
      ordered(left, right, (one, other) => one < other),
    ),
    Match.exhaustive,
  );

/**
 * Whether a row matches a tree.
 *
 * The row's value is read through `valueOf`, so the tree is independent of
 * what a row is.
 */
export const matchesTree = <Row>(
  tree: FilterTree,
  row: Row,
  valueOf: (row: Row, field: string) => string | number,
): boolean =>
  Match.value(tree).pipe(
    Match.when(isPredicate, (clause) =>
      matchesComparison(
        clause.comparison,
        valueOf(row, clause.field),
        clause.value,
      ),
    ),
    Match.when(isAll, (group) =>
      Arr.every(group.children, (child) => matchesTree(child, row, valueOf)),
    ),
    Match.when(isAny, (group) =>
      Arr.some(group.children, (child) => matchesTree(child, row, valueOf)),
    ),
    Match.when(isNot, (group) => !matchesTree(group.child, row, valueOf)),
    Match.exhaustive,
  );

/** The rows a tree keeps, in the caller's order. */
export const filterByTree = <Row>(
  rows: ReadonlyArray<Row>,
  tree: FilterTree,
  valueOf: (row: Row, field: string) => string | number,
): ReadonlyArray<Row> =>
  Arr.filter(rows, (row) => matchesTree(tree, row, valueOf));

/** How many comparisons a tree holds. */
export const clauseCount = (tree: FilterTree): number =>
  Match.value(tree).pipe(
    Match.when(isPredicate, () => 1),
    Match.when(isAll, (group) =>
      Arr.reduce(
        group.children,
        0,
        (total, child) => total + clauseCount(child),
      ),
    ),
    Match.when(isAny, (group) =>
      Arr.reduce(
        group.children,
        0,
        (total, child) => total + clauseCount(child),
      ),
    ),
    Match.when(isNot, (group) => clauseCount(group.child)),
    Match.exhaustive,
  );

/**
 * The sentence a tree reads as.
 *
 * A builder shows the sentence beside the clauses, so a reader can see what
 * the tree means without reading every row.
 */
export const describeTree = (tree: FilterTree): string =>
  Match.value(tree).pipe(
    Match.when(
      isPredicate,
      (clause) => `${clause.field} ${clause.comparison} ${clause.value}`,
    ),
    Match.when(isAll, (group) =>
      group.children.length === 0
        ? "everything"
        : `all of (${Arr.map(group.children, describeTree).join(", ")})`,
    ),
    Match.when(isAny, (group) =>
      group.children.length === 0
        ? // No alternative to satisfy, so no row matches — the sentence a
          // builder shows has to agree with the rows the tree keeps.
          "nothing"
        : `any of (${Arr.map(group.children, describeTree).join(", ")})`,
    ),
    Match.when(isNot, (group) => `not (${describeTree(group.child)})`),
    Match.exhaustive,
  );

/**
 * Replace one clause's field, comparison or value.
 *
 * The builder edits the tree in place rather than rebuilding it, so a change
 * keeps the clauses the reader did not touch.
 */
export const updatePredicate = (
  tree: FilterTree,
  change: {
    readonly field?: string;
    readonly comparison?: Comparison;
    readonly value?: string;
  },
): FilterTree =>
  Match.value(tree).pipe(
    Match.when(isPredicate, (clause) => ({
      ...clause,
      ...(change.field === undefined ? {} : { field: change.field }),
      ...(change.comparison === undefined
        ? {}
        : { comparison: change.comparison }),
      ...(change.value === undefined ? {} : { value: change.value }),
    })),
    Match.when(isAll, (group) => ({
      ...group,
      children: Arr.map(group.children, (child) =>
        updatePredicate(child, change),
      ),
    })),
    Match.when(isAny, (group) => ({
      ...group,
      children: Arr.map(group.children, (child) =>
        updatePredicate(child, change),
      ),
    })),
    Match.when(isNot, (group) => ({
      ...group,
      child: updatePredicate(group.child, change),
    })),
    Match.exhaustive,
  );

/**
 * A clause's path from the root: the child index at each level.
 *
 * The builder edits a clause by its path, so a nested clause can be changed
 * without rebuilding the tree around it. A group holds its children by index;
 * a `not` holds exactly one, at index `0`.
 */
export type FilterPath = ReadonlyArray<number>;

/** The empty tree: an `all` group with no clause, which matches everything. */
export const emptyTree: FilterTree = { kind: "all", children: [] };

/**
 * The predicate a path addresses.
 *
 * The builder reads the clause it is about to edit, so a field or a comparison
 * can be written back without rebuilding the tree. A path that names a group
 * addresses no predicate.
 */
export const clauseAt = (
  tree: FilterTree,
  path: FilterPath,
): Option.Option<FieldPredicate> => {
  if (path.length === 0) {
    return isPredicate(tree) ? Option.some(tree) : Option.none();
  }
  const [head, ...rest] = path;
  return Option.flatMap(Option.fromNullishOr(head), (at) =>
    Match.value(tree).pipe(
      Match.when(isPredicate, () => Option.none()),
      Match.when(isAll, (group) => clauseIn(group.children, at, rest)),
      Match.when(isAny, (group) => clauseIn(group.children, at, rest)),
      Match.when(isNot, (group) =>
        at === 0 ? clauseAt(group.child, rest) : Option.none(),
      ),
      Match.exhaustive,
    ),
  );
};

/** The predicate at an index of a group's children. */
const clauseIn = (
  children: ReadonlyArray<FilterTree>,
  at: number,
  rest: FilterPath,
): Option.Option<FieldPredicate> =>
  Arr.get(children, at).pipe(Option.flatMap((child) => clauseAt(child, rest)));

/** Replace the clause at a path. */
export const updateAt = (
  tree: FilterTree,
  path: FilterPath,
  next: FilterTree,
): FilterTree => {
  if (path.length === 0) return next;
  const [head, ...rest] = path;
  const replaceChild = (children: ReadonlyArray<FilterTree>) =>
    Arr.map(children, (child, at) =>
      at === head ? updateAt(child, rest, next) : child,
    );
  return Match.value(tree).pipe(
    Match.when(isPredicate, () => tree),
    Match.when(isAll, (group) => ({
      ...group,
      children: replaceChild(group.children),
    })),
    Match.when(isAny, (group) => ({
      ...group,
      children: replaceChild(group.children),
    })),
    Match.when(isNot, (group) =>
      // A `not` holds one child, at index `0`; any other index names nothing,
      // so the tree is returned unchanged rather than edited by accident.
      head === 0
        ? { ...group, child: updateAt(group.child, rest, next) }
        : group,
    ),
    Match.exhaustive,
  );
};

/**
 * Remove the clause at a path.
 *
 * A group that loses its last child keeps its shape: an empty `all` matches
 * everything, which is what an empty builder means.
 *
 * A `not` holds one child and cannot be left empty, so a path naming that child
 * names no removable node — the tree comes back unchanged and the builder
 * removes the `not` itself instead. A path that goes **through** the child into
 * a group it negates is followed: a group inside a `not` is a group like any
 * other, and its clauses remove like any other.
 */
export const removeAt = (tree: FilterTree, path: FilterPath): FilterTree => {
  if (path.length === 0) return tree;
  const [head, ...rest] = path;
  const dropChild = (children: ReadonlyArray<FilterTree>) =>
    Arr.filter(children, (_, at) => at !== head);
  return Match.value(tree).pipe(
    Match.when(isPredicate, () => tree),
    Match.when(isAll, (group) => ({
      ...group,
      children:
        rest.length === 0
          ? dropChild(group.children)
          : Arr.map(group.children, (child, at) =>
              at === head ? removeAt(child, rest) : child,
            ),
    })),
    Match.when(isAny, (group) => ({
      ...group,
      children:
        rest.length === 0
          ? dropChild(group.children)
          : Arr.map(group.children, (child, at) =>
              at === head ? removeAt(child, rest) : child,
            ),
    })),
    Match.when(isNot, (group) =>
      head === 0 && rest.length > 0
        ? { ...group, child: removeAt(group.child, rest) }
        : // The `not`'s own child is the one node it cannot lose; a path that
          // stops there leaves the tree alone.
          tree,
    ),
    Match.exhaustive,
  );
};

/** Add a clause to a group, or replace the root's only child. */
export const appendClause = (
  tree: FilterTree,
  clause: FieldPredicate,
): FilterTree =>
  Match.value(tree).pipe(
    Match.when(isPredicate, () => ({
      kind: "all" as const,
      children: [tree, clause],
    })),
    Match.when(isAll, (group) => ({
      ...group,
      children: [...group.children, clause],
    })),
    Match.when(isAny, (group) => ({
      ...group,
      children: [...group.children, clause],
    })),
    Match.when(isNot, (group) => ({
      ...group,
      child: appendClause(group.child, clause),
    })),
    Match.exhaustive,
  );

/**
 * Add a clause to the group at `path` — the root at `[]`.
 *
 * A builder paints an Add control on every group it can extend, so a clause can
 * join a nested `any` without rebuilding the tree around it. Appending to the
 * root is {@link appendClause}, including its rule that a lone clause becomes an
 * `all` holding both.
 *
 * A path that names no group leaves the tree alone: a missing child, a clause, the
 * `not` itself (which holds one child and takes no clause of its own), or an
 * index past a group's children. A path that goes **through** a `not` into the
 * group it negates is followed, because that group is a group like any other.
 * The builder only paints Add where the append lands, so an unchanged tree is a
 * caller error rather than a state the UI offers — the same rule `removeAt`
 * follows for a control that cannot remove.
 */
export const appendAt = (
  tree: FilterTree,
  path: FilterPath,
  clause: FieldPredicate,
): FilterTree => {
  // The root keeps `appendClause`'s rule: a lone clause becomes an `all`
  // holding both, which is what the builder's own Add means.
  if (path.length === 0) return appendClause(tree, clause);
  const appendInto = (node: FilterTree, rest: FilterPath): FilterTree => {
    // Only a group takes a clause. A clause or a `not` at the path is left
    // alone rather than wrapped, so an append never changes the tree's shape
    // at a node that does not paint an Add control.
    if (rest.length === 0) {
      return isAll(node) || isAny(node) ? appendClause(node, clause) : node;
    }
    const [head, ...tail] = rest;
    const intoChildren = (
      children: ReadonlyArray<FilterTree>,
    ): ReadonlyArray<FilterTree> =>
      Arr.map(children, (child, at) =>
        at === head ? appendInto(child, tail) : child,
      );
    return Match.value(node).pipe(
      Match.when(isPredicate, () => node),
      Match.when(isNot, (group) =>
        // A `not` takes no clause of its own; index `0` is the one child it
        // holds, so a path through it is followed into that child.
        head === 0 ? { ...group, child: appendInto(group.child, tail) } : node,
      ),
      Match.when(isAll, (group) => ({
        ...group,
        children: intoChildren(group.children),
      })),
      Match.when(isAny, (group) => ({
        ...group,
        children: intoChildren(group.children),
      })),
      Match.exhaustive,
    );
  };
  return appendInto(tree, path);
};
