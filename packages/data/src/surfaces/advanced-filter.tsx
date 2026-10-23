/**
 * The advanced filter: a builder over a typed predicate tree.
 *
 * A query builder is **data**, not a string: every clause names a field, a
 * comparison and a value, and the clauses combine with `all`, `any` and `not`.
 * The tree is the caller's — this component paints it and reports every edit —
 * so a builder, a saved query and a table's own filter all read one shape.
 *
 * The tree's rules are the pure ones in `surfaces/logic.ts`: the comparisons are
 * literal, a numeric comparison reads both sides as numbers, and an empty
 * `all` matches everything (which is what an empty builder means). A side that
 * does not read as a number — the blank value a clause starts with — satisfies
 * no order, so an unfilled clause keeps no row rather than reading the blank as
 * zero.
 *
 * The runtime paints no menu of its own, so the field and comparison pickers
 * are the component package's measured `DropdownMenu` — the same surface the
 * column configuration uses, not a second menu implementation.
 *
 * Every group paints its **combinator** as a menu: `all of`, `any of` and
 * whether the group is negated. That is how a reader composes an `any` or a
 * `not` — the tree has always held them, and this control is what writes one
 * from the builder. **Add group** appends an `all` group holding one blank
 * clause to the group it sits in, so a nested group lands where the reader
 * asked and its combinator is one press away.
 *
 * ```tsx
 * const [tree, setTree] = useState<FilterTree>(emptyTree);
 * <AdvancedFilter
 *   fields={[{ field: "status", label: "Status" }]}
 *   tree={tree}
 *   onChange={setTree}
 * />
 * ```
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@gpuixui/components/dropdown-menu";
import { Button, Input } from "@gpuixui/primitives";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";
import {
  appendAt,
  comparisons,
  describeTree,
  emptyTree,
  negateAt,
  removeAt,
  setGroupKind,
  updateAt,
  type Comparison,
  type FieldPredicate,
  type FilterPath,
  type FilterTree,
  type GroupKind,
} from "./logic.js";
import {
  ADVANCED_FILTER,
  FILTER_CLAUSE,
  FILTER_GROUP,
  FILTER_SENTENCE,
} from "./recipe.js";

/** One field a clause may name. */
export interface AdvancedFilterField {
  /** The field the clause reads. */
  readonly field: string;
  /** The words the builder shows for it. */
  readonly label: string;
}

/** {@link AdvancedFilter} props. */
export interface AdvancedFilterProps extends Omit<
  Props,
  "children" | "onChange"
> {
  /** The fields a clause may name, in the order the picker lists them. */
  readonly fields: ReadonlyArray<AdvancedFilterField>;
  /** The tree the builder paints. */
  readonly tree: FilterTree;
  /** Receives every edited tree. */
  readonly onChange: (next: FilterTree) => void;
  /** The title above the builder. Defaults to `Filters`. */
  readonly title?: string;
  readonly className?: string;
  /**
   * The trigger's test id. Every row derives from it: `${testId}-${slot}` names
   * a clause, where `slot` is the clause's path joined with `-` (a root clause
   * is `0`), and the row's parts are `${testId}-${slot}-field`,
   * `${testId}-${slot}-comparison`, `${testId}-${slot}-value` and
   * `${testId}-${slot}-remove`. A nested group's clause therefore keeps its own
   * id instead of repeating a sibling's. A group's combinator is
   * `${testId}-kind` at the root and `${testId}-${slot}-kind` below it, with
   * `${testId}-${slot}-kind-all`, `-kind-any` and `-kind-negate` for its menu,
   * and its Add group is `${testId}-add-group` at the root and
   * `${testId}-${slot}-add-group` below it. The root's Add clause is
   * `${testId}-add`, and a nested group's own is `${testId}-${slot}-add`.
   */
  readonly testId?: string;
}

/** The words a comparison is shown by. */
export const comparisonLabels: Readonly<Record<Comparison, string>> = {
  equals: "equals",
  notEquals: "does not equal",
  contains: "contains",
  greaterThan: "greater than",
  lessThan: "less than",
};

/** The words a group is shown by. */
export const groupLabels: Readonly<Record<"all" | "any" | "not", string>> = {
  all: "all of",
  any: "any of",
  not: "not",
};

/** The label a field is shown by, falling back to its own name. */
const labelOf = (
  fields: ReadonlyArray<AdvancedFilterField>,
  field: string,
): string =>
  Arr.findFirst(fields, (candidate) => candidate.field === field).pipe(
    Option.map((candidate) => candidate.label),
    Option.getOrElse(() => field),
  );

/** A clause's or group's path as a locator segment: a root node is `0`. */
const slotOf = (path: FilterPath): string =>
  path.length === 0 ? "0" : Arr.join(Arr.map(path, String), "-");

/** The clause an Add control appends: the first field, no comparison made yet. */
const clauseFor = (
  fields: ReadonlyArray<AdvancedFilterField>,
): FieldPredicate => ({
  kind: "predicate",
  field: Arr.head(fields).pipe(
    Option.map((field) => field.field),
    Option.getOrElse(() => ""),
  ),
  comparison: "equals",
  value: "",
});

/** One clause: a field, a comparison, a value and a way out. */
const ClauseRow = ({
  root,
  clause,
  path,
  slot,
  fields,
  removable,
  onChange,
  testId,
}: {
  /** The whole tree: an edit is written back into it by path. */
  readonly root: FilterTree;
  readonly clause: FieldPredicate;
  readonly path: FilterPath;
  /** The clause's path as a locator segment, unique across nested groups. */
  readonly slot: string;
  readonly fields: ReadonlyArray<AdvancedFilterField>;
  /**
   * Whether removing this clause changes the tree.
   *
   * A root clause and the child a `not` holds directly do not: the root has no
   * parent to drop it, and a `not` cannot be left without its child. Neither
   * paints a Remove control, because a press that leaves the tree unchanged is
   * a control claiming an action it cannot take. A clause deeper inside a group
   * the `not` negates does remove, and paints one.
   */
  readonly removable: boolean;
  readonly onChange: (next: FilterTree) => void;
  readonly testId: string | undefined;
}) => {
  const theme = useTheme();
  const id = testId === undefined ? undefined : `${testId}-${slot}`;
  const replace = (change: Partial<FieldPredicate>): void => {
    onChange(updateAt(root, path, { ...clause, ...change }));
  };
  return (
    <div style={recipeStyle(FILTER_CLAUSE, theme)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          variant="secondary"
          size="sm"
          testId={id === undefined ? undefined : `${id}-field`}
        >
          {labelOf(fields, clause.field)}
        </DropdownMenuTrigger>
        <DropdownMenuContent label="Field">
          {Arr.map(fields, (field) => (
            <DropdownMenuItem
              key={field.field}
              onSelect={() => replace({ field: field.field })}
              testId={
                id === undefined ? undefined : `${id}-field-${field.field}`
              }
            >
              {field.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger
          variant="secondary"
          size="sm"
          testId={id === undefined ? undefined : `${id}-comparison`}
        >
          {comparisonLabels[clause.comparison]}
        </DropdownMenuTrigger>
        <DropdownMenuContent label="Comparison">
          {Arr.map(comparisons, (comparison) => (
            <DropdownMenuItem
              key={comparison}
              onSelect={() => replace({ comparison })}
              testId={
                id === undefined ? undefined : `${id}-comparison-${comparison}`
              }
            >
              {comparisonLabels[comparison]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Input
        label={`${labelOf(fields, clause.field)} value`}
        value={clause.value}
        onValueChange={(value) => replace({ value })}
        size="sm"
        testId={id === undefined ? undefined : `${id}-value`}
      />
      {removable ? (
        <Button
          variant="ghost"
          size="sm"
          label="Remove clause"
          onActivate={() => onChange(removeAt(root, path))}
          testId={id === undefined ? undefined : `${id}-remove`}
        >
          Remove
        </Button>
      ) : undefined}
    </div>
  );
};

/** A group of clauses, or a negated one. */
const Group = ({
  root,
  path,
  kind,
  children,
  onAdd,
  onRemove,
  onChange,
  slot,
  testId,
}: {
  /** The whole tree: a combinator change is written back into it. */
  readonly root: FilterTree;
  /** The group's own path. */
  readonly path: FilterPath;
  readonly kind: GroupKind;
  readonly children: ReactNode;
  /** Append a group to this group, when it can take one. */
  readonly onAdd?: () => void;
  /** The group's own removal, when it sits in a group that can drop it. */
  readonly onRemove?: () => void;
  readonly onChange: (next: FilterTree) => void;
  /** The group's path as a locator segment. */
  readonly slot: string;
  readonly testId: string | undefined;
}) => {
  const theme = useTheme();
  // The root's own controls drop the `0-` prefix the clauses keep, so a
  // root control reads `-add` and a nested one `-1-add`, the naming the
  // clause locators already use.
  const base =
    testId === undefined
      ? undefined
      : path.length === 0
        ? testId
        : `${testId}-${slot}`;
  return (
    <div style={recipeStyle(FILTER_GROUP, theme)}>
      <div style={recipeStyle("flex flex-row items-center gap-2", theme)}>
        <DropdownMenu>
          <DropdownMenuTrigger
            variant="ghost"
            size="sm"
            testId={base === undefined ? undefined : `${base}-kind`}
          >
            {groupLabels[kind]}
          </DropdownMenuTrigger>
          <DropdownMenuContent label="Group">
            <DropdownMenuItem
              onSelect={() => onChange(setGroupKind(root, path, "all"))}
              testId={base === undefined ? undefined : `${base}-kind-all`}
            >
              Match all
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onChange(setGroupKind(root, path, "any"))}
              testId={base === undefined ? undefined : `${base}-kind-any`}
            >
              Match any
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onChange(negateAt(root, path))}
              testId={base === undefined ? undefined : `${base}-kind-negate`}
            >
              {kind === "not" ? "Do not negate" : "Negate"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {Option.match(Option.fromNullishOr(onRemove), {
          onNone: () => null,
          onSome: (remove) => (
            <Button
              variant="ghost"
              size="sm"
              label="Remove group"
              onActivate={remove}
              testId={
                testId === undefined
                  ? undefined
                  : `${testId}-${slot}-group-remove`
              }
            >
              Remove group
            </Button>
          ),
        })}
      </div>
      {children}
      {Option.match(Option.fromNullishOr(onAdd), {
        onNone: () => null,
        onSome: (add) => (
          <Button
            variant="ghost"
            size="sm"
            label={`Add a group to the ${groupLabels[kind]} group`}
            onActivate={add}
            testId={base === undefined ? undefined : `${base}-add-group`}
          >
            Add group
          </Button>
        ),
      })}
    </div>
  );
};

/** The tree, painted. */
const Tree = ({
  root,
  node,
  path,
  fields,
  onChange,
  onAddClause,
  onAddGroup,
  testId,
  removable,
}: {
  /** The whole tree: an edit is written back into it by path. */
  readonly root: FilterTree;
  /** The node this call paints. */
  readonly node: FilterTree;
  readonly path: FilterPath;
  readonly fields: ReadonlyArray<AdvancedFilterField>;
  readonly onChange: (next: FilterTree) => void;
  /** Append a clause to the group at a path. */
  readonly onAddClause: (path: FilterPath) => void;
  /** Append a group to the group at a path. */
  readonly onAddGroup: (path: FilterPath) => void;
  readonly testId: string | undefined;
  /** Whether the node sits in a group that can drop it. */
  readonly removable: boolean;
}) => {
  if (node.kind === "predicate") {
    return (
      <ClauseRow
        root={root}
        clause={node}
        path={path}
        slot={slotOf(path)}
        fields={fields}
        removable={removable}
        onChange={onChange}
        testId={testId}
      />
    );
  }
  if (node.kind === "not") {
    return (
      <Group
        root={root}
        path={path}
        kind="not"
        slot={slotOf(path)}
        testId={testId}
        onChange={onChange}
        onRemove={removable ? () => onChange(removeAt(root, path)) : undefined}
      >
        <Tree
          root={root}
          node={node.child}
          path={[...path, 0]}
          fields={fields}
          onChange={onChange}
          onAddClause={onAddClause}
          onAddGroup={onAddGroup}
          testId={testId}
          removable={false}
        />
      </Group>
    );
  }
  return (
    <Group
      root={root}
      path={path}
      kind={node.kind}
      slot={slotOf(path)}
      testId={testId}
      onChange={onChange}
      onRemove={removable ? () => onChange(removeAt(root, path)) : undefined}
      onAdd={path.length === 0 ? undefined : () => onAddGroup(path)}
    >
      {Arr.map(node.children, (child, at) => (
        <Tree
          key={`${at}`}
          root={root}
          node={child}
          path={[...path, at]}
          fields={fields}
          onChange={onChange}
          onAddClause={onAddClause}
          onAddGroup={onAddGroup}
          testId={testId}
          removable
        />
      ))}
      {path.length === 0 ? undefined : (
        <Button
          variant="ghost"
          size="sm"
          label={`Add a clause to the ${groupLabels[node.kind]} group`}
          onActivate={() => onAddClause(path)}
          testId={
            testId === undefined ? undefined : `${testId}-${slotOf(path)}-add`
          }
        >
          Add clause
        </Button>
      )}
    </Group>
  );
};

/**
 * The builder.
 *
 * The tree is the caller's, so a saved query, a table's filter and this
 * builder read one shape; the component paints the tree and reports every
 * edit — a clause's field, comparison or value, a clause removed, a clause
 * added, a group added, a group's combinator changed or negated, and the whole
 * tree cleared.
 *
 * A group's combinator control edits the group in place: **match all** and
 * **match any** keep its children and change how they combine, while **negate**
 * wraps the group (and pressing it again gives the group back). A `not` holds
 * one child, so its own Add controls are absent; a group inside it is a group
 * like any other and paints both Adds.
 *
 * A clause's Remove control paints only where removal changes the tree: a
 * `not` holds one child and is removed whole (when it sits in a group), so that
 * child carries none and a root clause is cleared with Clear. A clause deeper
 * inside a group the `not` negates removes like any other. Add is the same
 * rule: every `all`/`any` group that sits in a group paints its own Add
 * controls, so a nested `any` can be extended or given a group in place —
 * including one a `not` negates — while the root's Add sits below the tree.
 */
export const AdvancedFilter = ({
  fields,
  tree,
  onChange,
  title = "Filters",
  className,
  style,
  testId,
  ...rest
}: AdvancedFilterProps) => {
  const theme = useTheme();
  const addClause = (path: FilterPath): void => {
    onChange(appendAt(tree, path, clauseFor(fields)));
  };
  const addGroup = (path: FilterPath): void => {
    // A new group starts as an `all` holding one blank clause: the reader
    // edits that clause, and the combinator control turns the group into a
    // disjunction or negates it. A group with no clause would be an `any` that
    // keeps nothing, which is not a state an Add control should land a reader
    // in.
    onChange(
      appendAt(tree, path, { kind: "all", children: [clauseFor(fields)] }),
    );
  };
  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(ADVANCED_FILTER, className), theme),
        style,
      )}
    >
      <text
        role="heading"
        aria-level={3}
        style={recipeStyle("text-xs font-medium text-muted-foreground", theme)}
      >
        {title}
      </text>
      <text style={recipeStyle(FILTER_SENTENCE, theme)}>
        {describeTree(tree)}
      </text>
      <Tree
        root={tree}
        node={tree}
        path={[]}
        fields={fields}
        onChange={onChange}
        onAddClause={addClause}
        onAddGroup={addGroup}
        testId={testId}
        removable={false}
      />
      <div style={recipeStyle("flex flex-row items-center gap-2", theme)}>
        <Button
          variant="secondary"
          size="sm"
          onActivate={() => addClause([])}
          testId={testId === undefined ? undefined : `${testId}-add`}
        >
          Add clause
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onActivate={() => addGroup([])}
          testId={testId === undefined ? undefined : `${testId}-add-group`}
        >
          Add group
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onActivate={() => onChange(emptyTree)}
          testId={testId === undefined ? undefined : `${testId}-clear`}
        >
          Clear
        </Button>
      </div>
    </div>
  );
};
