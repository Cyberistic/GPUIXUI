import { spokenText } from "@gpuixui/primitives/core";
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Number from "effect/Number";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

export const propertyName = (label: string, key: string): string =>
  spokenText(Option.fromNullishOr(label), key);

export const UNNAMED_CLAUSE_FIELD = "Field";

export const clauseFieldName = (field: string): string =>
  spokenText(Option.fromNullishOr(field), UNNAMED_CLAUSE_FIELD);

export const comparisons = [
  "equals",
  "notEquals",
  "contains",
  "greaterThan",
  "lessThan",
] as const;

export const Comparison = Schema.Literals(comparisons);

export type Comparison = typeof Comparison.Type;

export type GroupKind = "all" | "any" | "not";

export interface FieldPredicate {
  readonly kind: "predicate";

  readonly field: string;
  readonly comparison: Comparison;

  readonly value: string;
}

export interface AllClause {
  readonly kind: "all";
  readonly children: ReadonlyArray<FilterTree>;
}

export interface AnyClause {
  readonly kind: "any";
  readonly children: ReadonlyArray<FilterTree>;
}

export interface NotClause {
  readonly kind: "not";
  readonly child: FilterTree;
}

export type FilterTree = FieldPredicate | AllClause | AnyClause | NotClause;

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

export const UNREADABLE_TREE = "a filter this release cannot read";

export const isFilterTree = (value: unknown): value is FilterTree =>
  Schema.is(FilterTree)(value);

export const isComparison = (value: unknown): value is Comparison =>
  Schema.is(Comparison)(value);

export const readFilterTree = (value: unknown): Option.Option<FilterTree> =>
  isFilterTree(value) ? Option.some(value) : Option.none();

export const isPredicate = (tree: FilterTree): tree is FieldPredicate =>
  tree.kind === "predicate";

export const isAll = (tree: FilterTree): tree is AllClause =>
  tree.kind === "all";

export const isAny = (tree: FilterTree): tree is AnyClause =>
  tree.kind === "any";

export const isNot = (tree: FilterTree): tree is NotClause =>
  tree.kind === "not";

const numeric = (value: string | number): Option.Option<number> =>
  typeof value === "number" ? Option.some(value) : Number.parse(value);

const ordered = (
  left: string | number,
  right: string,
  compare: (one: number, other: number) => boolean,
): boolean =>
  Option.match(Option.all([numeric(left), numeric(right)]), {
    onNone: () => false,
    onSome: ([one, other]) => compare(one, other),
  });

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

export const matchesTree = <Row>(
  tree: FilterTree,
  row: Row,
  valueOf: (row: Row, field: string) => string | number,
): boolean => isFilterTree(tree) && matchesReadable(tree, row, valueOf);

export const filterByTree = <Row>(
  rows: ReadonlyArray<Row>,
  tree: FilterTree,
  valueOf: (row: Row, field: string) => string | number,
): ReadonlyArray<Row> =>
  isFilterTree(tree)
    ? Arr.filter(rows, (row) => matchesReadable(tree, row, valueOf))
    : [];

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

export const clauseCount = (tree: FilterTree): number =>
  isFilterTree(tree) ? clauseCountReadable(tree) : 0;

const describeReadable = (tree: FilterTree): string =>
  Match.value(tree).pipe(
    Match.when(isPredicate, (clause) =>
      Str.trim(
        `${clauseFieldName(clause.field)} ${clause.comparison} ${clause.value}`,
      ),
    ),
    Match.when(isAll, (group) =>
      group.children.length === 0
        ? "everything"
        : `all of (${Arr.map(group.children, describeReadable).join(", ")})`,
    ),
    Match.when(isAny, (group) =>
      group.children.length === 0
        ? "nothing"
        : `any of (${Arr.map(group.children, describeReadable).join(", ")})`,
    ),
    Match.when(isNot, (group) => `not (${describeReadable(group.child)})`),
    Match.exhaustive,
  );

export const describeTree = (tree: FilterTree): string =>
  isFilterTree(tree) ? describeReadable(tree) : UNREADABLE_TREE;

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

export const updatePredicate = (
  tree: FilterTree,
  change: {
    readonly field?: string;
    readonly comparison?: Comparison;
    readonly value?: string;
  },
): FilterTree =>
  isFilterTree(tree) ? updatePredicateReadable(tree, change) : tree;

export type FilterPath = ReadonlyArray<number>;

export const emptyTree: FilterTree = { kind: "all", children: [] };

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

const childAt = (
  children: ReadonlyArray<FilterTree>,
  at: number,
  rest: FilterPath,
): Option.Option<FilterTree> =>
  Arr.get(children, at).pipe(Option.flatMap((child) => nodeAt(child, rest)));

export const clauseAt = (
  tree: FilterTree,
  path: FilterPath,
): Option.Option<FieldPredicate> =>
  isFilterTree(tree)
    ? Option.flatMap(nodeAt(tree, path), (node) =>
        isPredicate(node) ? Option.some(node) : Option.none(),
      )
    : Option.none();

const asGroup = (node: FilterTree, kind: "all" | "any"): FilterTree =>
  Match.value(node).pipe(
    Match.when(isPredicate, (clause) => ({ kind, children: [clause] })),
    Match.when(isAll, (group) => ({ kind, children: group.children })),
    Match.when(isAny, (group) => ({ kind, children: group.children })),
    Match.when(isNot, (group) => asGroup(group.child, kind)),
    Match.exhaustive,
  );

export const withClauseField = (
  clause: FieldPredicate,
  field: string,
): FieldPredicate => ({ ...clause, field, value: "" });

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
      head === 0
        ? { ...group, child: updateAt(group.child, rest, next) }
        : group,
    ),
    Match.exhaustive,
  );
};

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
        : tree,
    ),
    Match.exhaustive,
  );
};

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

export const appendClause = (
  tree: FilterTree,
  clause: FieldPredicate,
): FilterTree =>
  isFilterTree(tree) && isFilterTree(clause) ? appendNode(tree, clause) : tree;

export const appendAt = (
  tree: FilterTree,
  path: FilterPath,
  added: FilterTree,
): FilterTree => {
  if (!isFilterTree(tree) || !isFilterTree(added)) return tree;

  if (path.length === 0) return appendNode(tree, added);
  const appendInto = (current: FilterTree, rest: FilterPath): FilterTree => {
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
