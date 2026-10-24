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
 * A tree is also **stored data**: a saved query outlives the release that wrote
 * it, and a store or a hand-edited record can hand back a node or a comparison
 * this build does not name. Every exported reader therefore reads its input
 * through {@link FilterTree}'s schema first: an unreadable tree keeps **no**
 * rows rather than throwing, or keeps every row as if the filter were absent —
 * the records a broken query was meant to hide must not paint. `null` and
 * `undefined` are the one absence the *components* read as the empty tree; a
 * direct `filterByTree` call treats them like any other unreadable input.
 * `describeTree` says {@link UNREADABLE_TREE} and a builder paints that
 * sentence with Clear, so a reader can recover from a query they cannot edit.
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

import { spokenText } from "@gpuixui/primitives/core";
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Number from "effect/Number";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

/**
 * The words a property row is painted and named by.
 *
 * A row's label is content before it is a literal: a saved object answers `""`
 * for a row whose name key is missing, and the panel paints that label in its
 * label column and hands it to an editable row's field as the field's own name.
 * A blank label therefore reads as the row's **key** — the identity the panel
 * addresses the row by — so a row is never an unnamed field beside an empty
 * column.
 */
export const propertyName = (label: string, key: string): string =>
  spokenText(Option.fromNullishOr(label), key);

/** How a field's value is compared with a clause's value. */
export const comparisons = [
  "equals",
  "notEquals",
  "contains",
  "greaterThan",
  "lessThan",
] as const;

/** One comparison, as the builder offers it and a saved tree decodes it. */
export const Comparison = Schema.Literals(comparisons);

/** How a field's value is compared with a clause's value. */
export type Comparison = typeof Comparison.Type;

/** The combinators a group can wear. */
export type GroupKind = "all" | "any" | "not";

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

/**
 * The tree as a schema: the shape every reader validates stored input against.
 *
 * Recursive, because a group holds trees. It is the same union the types
 * describe, so `Schema.is` is a membership test rather than a second model —
 * and it is what makes a saved query decodable before a grid runs it.
 */
export const FilterTree: Schema.Schema<FilterTree> = Schema.Union([
  Schema.Struct({
    kind: Schema.tag("predicate"),
    field: Schema.String,
    comparison: Comparison,
    value: Schema.String,
  }),
  Schema.Struct({
    kind: Schema.tag("all"),
    children: Schema.Array(Schema.suspend(() => FilterTree)),
  }),
  Schema.Struct({
    kind: Schema.tag("any"),
    children: Schema.Array(Schema.suspend(() => FilterTree)),
  }),
  Schema.Struct({
    kind: Schema.tag("not"),
    child: Schema.suspend(() => FilterTree),
  }),
]);

/**
 * The sentence a tree this release cannot read is shown by.
 *
 * A builder paints it beside Clear, and `describeTree` answers it for any
 * stored query the schema refuses, so the words a reader meets match the rows
 * they see (none).
 */
export const UNREADABLE_TREE = "a filter this release cannot read";

/** Whether a value is a tree this release can read. */
export const isFilterTree = (value: unknown): value is FilterTree =>
  Schema.is(FilterTree)(value);

/** Whether a value is a comparison this release can evaluate. */
export const isComparison = (value: unknown): value is Comparison =>
  Schema.is(Comparison)(value);

/**
 * Read a stored query, or refuse it.
 *
 * This is the boundary a saved query crosses: a store hands back `unknown`, and
 * a builder or a grid is handed only the trees this build can read. `None`
 * means the query cannot be read — not that it keeps everything.
 */
export const readFilterTree = (value: unknown): Option.Option<FilterTree> =>
  isFilterTree(value) ? Option.some(value) : Option.none();

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
  Arr.contains(comparisons, comparison) &&
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

/** A row and a tree the schema has already accepted. */
const matchesReadable = <Row>(
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
      Arr.every(group.children, (child) =>
        matchesReadable(child, row, valueOf),
      ),
    ),
    Match.when(isAny, (group) =>
      Arr.some(group.children, (child) => matchesReadable(child, row, valueOf)),
    ),
    Match.when(isNot, (group) => !matchesReadable(group.child, row, valueOf)),
    Match.exhaustive,
  );

/**
 * Whether a row matches a tree.
 *
 * The row's value is read through `valueOf`, so the tree is independent of
 * what a row is. A tree the schema refuses matches nothing: a saved query this
 * release cannot read must not pass every record through the filter it was
 * meant to apply.
 */
export const matchesTree = <Row>(
  tree: FilterTree,
  row: Row,
  valueOf: (row: Row, field: string) => string | number,
): boolean => isFilterTree(tree) && matchesReadable(tree, row, valueOf);

/**
 * The rows a tree keeps, in the caller's order.
 *
 * A tree the schema refuses keeps no row (see {@link matchesTree}); validating
 * once here means a stored query costs one check rather than one per record.
 */
export const filterByTree = <Row>(
  rows: ReadonlyArray<Row>,
  tree: FilterTree,
  valueOf: (row: Row, field: string) => string | number,
): ReadonlyArray<Row> =>
  isFilterTree(tree)
    ? Arr.filter(rows, (row) => matchesReadable(tree, row, valueOf))
    : [];

/** How many comparisons a tree the schema accepted holds. */
const clauseCountReadable = (tree: FilterTree): number =>
  Match.value(tree).pipe(
    Match.when(isPredicate, () => 1),
    Match.when(isAll, (group) =>
      Arr.reduce(
        group.children,
        0,
        (total, child) => total + clauseCountReadable(child),
      ),
    ),
    Match.when(isAny, (group) =>
      Arr.reduce(
        group.children,
        0,
        (total, child) => total + clauseCountReadable(child),
      ),
    ),
    Match.when(isNot, (group) => clauseCountReadable(group.child)),
    Match.exhaustive,
  );

/** How many comparisons a tree holds; a tree it cannot read holds none. */
export const clauseCount = (tree: FilterTree): number =>
  isFilterTree(tree) ? clauseCountReadable(tree) : 0;

/** The sentence a tree the schema accepted reads as. */
const describeReadable = (tree: FilterTree): string =>
  Match.value(tree).pipe(
    Match.when(
      isPredicate,
      (clause) => `${clause.field} ${clause.comparison} ${clause.value}`,
    ),
    Match.when(isAll, (group) =>
      group.children.length === 0
        ? "everything"
        : `all of (${Arr.map(group.children, describeReadable).join(", ")})`,
    ),
    Match.when(isAny, (group) =>
      group.children.length === 0
        ? // No alternative to satisfy, so no row matches — the sentence a
          // builder shows has to agree with the rows the tree keeps.
          "nothing"
        : `any of (${Arr.map(group.children, describeReadable).join(", ")})`,
    ),
    Match.when(isNot, (group) => `not (${describeReadable(group.child)})`),
    Match.exhaustive,
  );

/**
 * The sentence a tree reads as.
 *
 * A builder shows the sentence beside the clauses, so a reader can see what
 * the tree means without reading every row. A tree the schema refuses reads as
 * {@link UNREADABLE_TREE} instead of throwing.
 */
export const describeTree = (tree: FilterTree): string =>
  isFilterTree(tree) ? describeReadable(tree) : UNREADABLE_TREE;

/** A tree the schema accepted, edited in place. */
const updatePredicateReadable = (
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
        updatePredicateReadable(child, change),
      ),
    })),
    Match.when(isAny, (group) => ({
      ...group,
      children: Arr.map(group.children, (child) =>
        updatePredicateReadable(child, change),
      ),
    })),
    Match.when(isNot, (group) => ({
      ...group,
      child: updatePredicateReadable(group.child, change),
    })),
    Match.exhaustive,
  );

/**
 * Replace one clause's field, comparison or value.
 *
 * The builder edits the tree in place rather than rebuilding it, so a change
 * keeps the clauses the reader did not touch. A tree the schema refuses is
 * returned unchanged.
 */
export const updatePredicate = (
  tree: FilterTree,
  change: {
    readonly field?: string;
    readonly comparison?: Comparison;
    readonly value?: string;
  },
): FilterTree =>
  isFilterTree(tree) ? updatePredicateReadable(tree, change) : tree;

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
 * The node a path addresses.
 *
 * A group holds its children by index; a `not` holds one child, at index `0`.
 * A path that walks past a clause, or past a `not`'s single child, names
 * nothing.
 */
const nodeAt = (
  tree: FilterTree,
  path: FilterPath,
): Option.Option<FilterTree> => {
  if (path.length === 0) return Option.some(tree);
  const [head, ...rest] = path;
  return Option.flatMap(Option.fromNullishOr(head), (at) =>
    Match.value(tree).pipe(
      Match.when(isPredicate, () => Option.none()),
      Match.when(isAll, (group) => childAt(group.children, at, rest)),
      Match.when(isAny, (group) => childAt(group.children, at, rest)),
      Match.when(isNot, (group) =>
        at === 0 ? nodeAt(group.child, rest) : Option.none(),
      ),
      Match.exhaustive,
    ),
  );
};

/** The node at an index of a group's children. */
const childAt = (
  children: ReadonlyArray<FilterTree>,
  at: number,
  rest: FilterPath,
): Option.Option<FilterTree> =>
  Arr.get(children, at).pipe(Option.flatMap((child) => nodeAt(child, rest)));

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
): Option.Option<FieldPredicate> =>
  isFilterTree(tree)
    ? Option.flatMap(nodeAt(tree, path), (node) =>
        isPredicate(node) ? Option.some(node) : Option.none(),
      )
    : Option.none();

/**
 * The group a node reads as when its children keep their positions.
 *
 * A `not` is a negation, not a third combinator: giving it `all`/`any` reads
 * through it into its child, so a negated `any` becomes an `any` of the same
 * clauses. A clause becomes a group of one, which is what un-negating a `not`
 * that holds a clause reads as.
 */
const asGroup = (node: FilterTree, kind: "all" | "any"): FilterTree =>
  Match.value(node).pipe(
    Match.when(isPredicate, (clause) => ({ kind, children: [clause] })),
    Match.when(isAll, (group) => ({ kind, children: group.children })),
    Match.when(isAny, (group) => ({ kind, children: group.children })),
    Match.when(isNot, (group) => asGroup(group.child, kind)),
    Match.exhaustive,
  );

/** Replace the clause at a path. */
export const updateAt = (
  tree: FilterTree,
  path: FilterPath,
  next: FilterTree,
): FilterTree => {
  if (!isFilterTree(tree) || !isFilterTree(next)) return tree;
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
 * Give the group at `path` a combinator, keeping its children.
 *
 * The builder offers "match all" and "match any" on every group, so the reader
 * can turn a group into a disjunction without rebuilding the clauses it holds.
 * A path that names nothing leaves the tree alone.
 */
export const setGroupKind = (
  tree: FilterTree,
  path: FilterPath,
  kind: "all" | "any",
): FilterTree => {
  if (!isFilterTree(tree)) return tree;
  return Option.match(nodeAt(tree, path), {
    onNone: () => tree,
    onSome: (node) => updateAt(tree, path, asGroup(node, kind)),
  });
};

/**
 * Negate the group at `path`, or give it back when it is already negated.
 *
 * A `not` keeps one child: negating a group wraps the whole group, so
 * `not (any of A, B)` means "neither A nor B". Negating again removes the
 * wrapper and changes nothing else, so the control is its own inverse. A path
 * that names nothing leaves the tree alone.
 */
export const negateAt = (tree: FilterTree, path: FilterPath): FilterTree => {
  if (!isFilterTree(tree)) return tree;
  return Option.match(nodeAt(tree, path), {
    onNone: () => tree,
    onSome: (node) =>
      updateAt(
        tree,
        path,
        isNot(node) ? node.child : { kind: "not", child: node },
      ),
  });
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
  if (!isFilterTree(tree)) return tree;
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

/**
 * Add a clause or a group to a tree, keeping the tree's shape.
 *
 * A tree that is a single clause becomes an `all` holding both, because a lone
 * clause has no group to append to; a group gains the node as its last child.
 */
const appendNode = (tree: FilterTree, node: FilterTree): FilterTree =>
  Match.value(tree).pipe(
    Match.when(isPredicate, () => ({
      kind: "all" as const,
      children: [tree, node],
    })),
    Match.when(isAll, (group) => ({
      ...group,
      children: [...group.children, node],
    })),
    Match.when(isAny, (group) => ({
      ...group,
      children: [...group.children, node],
    })),
    Match.when(isNot, (group) => ({
      ...group,
      child: appendNode(group.child, node),
    })),
    Match.exhaustive,
  );

/** Add a clause to a tree, or replace the root's only node. */
export const appendClause = (
  tree: FilterTree,
  clause: FieldPredicate,
): FilterTree =>
  isFilterTree(tree) && isFilterTree(clause) ? appendNode(tree, clause) : tree;

/**
 * Add a clause or a group to the group at `path` — the root at `[]`.
 *
 * A builder paints an Add control on every group it can extend, so a clause can
 * join a nested `any` without rebuilding the tree around it, and a group can be
 * nested where the reader wants it. Appending to the root is
 * {@link appendClause}'s rule, generalized: a lone node becomes an `all`
 * holding both.
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
  added: FilterTree,
): FilterTree => {
  if (!isFilterTree(tree) || !isFilterTree(added)) return tree;
  // The root keeps `appendClause`'s rule: a lone node becomes an `all` holding
  // both, which is what the builder's own Add means.
  if (path.length === 0) return appendNode(tree, added);
  const appendInto = (current: FilterTree, rest: FilterPath): FilterTree => {
    // Only a group takes a node. A clause or a `not` at the path is left alone
    // rather than wrapped, so an append never changes the tree's shape at a
    // node that does not paint an Add control.
    if (rest.length === 0) {
      return isAll(current) || isAny(current)
        ? appendNode(current, added)
        : current;
    }
    const [head, ...tail] = rest;
    const intoChildren = (
      children: ReadonlyArray<FilterTree>,
    ): ReadonlyArray<FilterTree> =>
      Arr.map(children, (child, at) =>
        at === head ? appendInto(child, tail) : child,
      );
    return Match.value(current).pipe(
      Match.when(isPredicate, () => current),
      Match.when(isNot, (group) =>
        // A `not` takes no node of its own; index `0` is the one child it
        // holds, so a path through it is followed into that child.
        head === 0
          ? { ...group, child: appendInto(group.child, tail) }
          : current,
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
