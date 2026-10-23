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
  removeAt,
  updateAt,
  type Comparison,
  type FieldPredicate,
  type FilterPath,
  type FilterTree,
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
   * id instead of repeating a sibling's. The root's Add control is
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
   * A root clause and a clause inside a `not` do not: the root has no parent to
   * drop it, and a `not` holds one child it cannot be left without. Neither
   * paints a Remove control, because a press that leaves the tree unchanged is
   * a control claiming an action it cannot take.
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
  kind,
  children,
  onRemove,
  slot,
  testId,
}: {
  readonly kind: "all" | "any" | "not";
  readonly children: ReactNode;
  /** The group's own removal, when it sits in a group that can drop it. */
  readonly onRemove?: () => void;
  /** The group's path as a locator segment. */
  readonly slot: string;
  readonly testId: string | undefined;
}) => {
  const theme = useTheme();
  return (
    <div style={recipeStyle(FILTER_GROUP, theme)}>
      <text
        style={recipeStyle("text-xs font-medium text-muted-foreground", theme)}
      >
        {groupLabels[kind]}
      </text>
      {children}
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
  );
};

/** The tree, painted. */
const Tree = ({
  root,
  node,
  path,
  fields,
  onChange,
  onAdd,
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
  readonly onAdd: (path: FilterPath) => void;
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
        kind="not"
        slot={slotOf(path)}
        testId={testId}
        onRemove={removable ? () => onChange(removeAt(root, path)) : undefined}
      >
        <Tree
          root={root}
          node={node.child}
          path={[...path, 0]}
          fields={fields}
          onChange={onChange}
          onAdd={onAdd}
          testId={testId}
          removable={false}
        />
      </Group>
    );
  }
  return (
    <Group
      kind={node.kind}
      slot={slotOf(path)}
      testId={testId}
      onRemove={removable ? () => onChange(removeAt(root, path)) : undefined}
    >
      {Arr.map(node.children, (child, at) => (
        <Tree
          key={`${at}`}
          root={root}
          node={child}
          path={[...path, at]}
          fields={fields}
          onChange={onChange}
          onAdd={onAdd}
          testId={testId}
          removable
        />
      ))}
      {path.length === 0 || !removable ? undefined : (
        <Button
          variant="ghost"
          size="sm"
          label={`Add a clause to the ${groupLabels[node.kind]} group`}
          onActivate={() => onAdd(path)}
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
 * added and the whole tree cleared.
 *
 * A clause's Remove control paints only where removal changes the tree: a
 * `not` holds one child and is removed whole (when it sits in a group), and a
 * root clause is cleared with Clear. Add is the same rule: every `all`/`any`
 * group that sits in a group paints its own Add control, so a nested `any` can
 * be extended in place — the root's Add sits below the tree. A `not` paints
 * none, because {@link removeAt} cannot take a clause back out of one.
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
        onAdd={addClause}
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
