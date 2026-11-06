/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@gpuixui/components/dropdown-menu";
import { Button, Input } from "@gpuixui/primitives";
import { spokenText } from "@gpuixui/primitives/core";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Str from "effect/String";
import type { ReactNode } from "react";
import { listOf } from "../internal/list.js";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";
import {
  appendAt,
  clauseFieldName,
  comparisons,
  describeTree,
  emptyTree,
  isFilterTree,
  negateAt,
  removeAt,
  setGroupKind,
  UNREADABLE_TREE,
  updateAt,
  withClauseField,
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

export interface AdvancedFilterField {
  readonly field: string;

  readonly label: string;
}

export interface AdvancedFilterProps extends Omit<
  Props,
  "children" | "onChange"
> {
  readonly fields: ReadonlyArray<AdvancedFilterField>;

  readonly tree: FilterTree;

  readonly onChange: (next: FilterTree) => void;

  readonly title?: string;
  readonly className?: string;

  readonly testId?: string;
}

export const comparisonLabels: Readonly<Record<Comparison, string>> = {
  equals: "equals",
  notEquals: "does not equal",
  contains: "contains",
  greaterThan: "greater than",
  lessThan: "less than",
};

export const DEFAULT_FILTER_TITLE = "Filters";

export const groupLabels: Readonly<Record<"all" | "any" | "not", string>> = {
  all: "all of",
  any: "any of",
  not: "not",
};

const labelOf = (
  fields: ReadonlyArray<AdvancedFilterField>,
  field: string,
): string =>
  Arr.findFirst(fields, (candidate) => candidate.field === field).pipe(
    Option.map((candidate) =>
      spokenText(
        Option.fromNullishOr(candidate.label),
        clauseFieldName(candidate.field),
      ),
    ),
    Option.getOrElse(() => clauseFieldName(field)),
  );

const slotOf = (path: FilterPath): string =>
  path.length === 0 ? "0" : Arr.join(Arr.map(path, String), "-");

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

const fieldList = (
  fields: ReadonlyArray<AdvancedFilterField>,
): ReadonlyArray<AdvancedFilterField> =>
  Arr.filter(
    listOf(fields),
    (field): boolean =>
      P.isObject(field) &&
      P.isString(field.field) &&
      Str.isNonEmpty(Str.trim(field.field)),
  );

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
  readonly root: FilterTree;
  readonly clause: FieldPredicate;
  readonly path: FilterPath;

  readonly slot: string;
  readonly fields: ReadonlyArray<AdvancedFilterField>;

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
              onSelect={() =>
                onChange(
                  updateAt(root, path, withClauseField(clause, field.field)),
                )
              }
              testId={
                id === undefined ? undefined : `${id}-field-${field.field}`
              }
            >
              {labelOf(fields, field.field)}
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
  readonly root: FilterTree;

  readonly path: FilterPath;
  readonly kind: GroupKind;
  readonly children: ReactNode;

  readonly onAdd?: () => void;

  readonly onRemove?: () => void;
  readonly onChange: (next: FilterTree) => void;

  readonly slot: string;
  readonly testId: string | undefined;
}) => {
  const theme = useTheme();

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
            aria-description="Change how this group combines its clauses"
            testId={base === undefined ? undefined : `${base}-kind`}
          >
            {groupLabels[kind]}
          </DropdownMenuTrigger>
          <DropdownMenuContent label="Combine the group">
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
  canAdd,
}: {
  readonly root: FilterTree;

  readonly node: FilterTree;
  readonly path: FilterPath;
  readonly fields: ReadonlyArray<AdvancedFilterField>;
  readonly onChange: (next: FilterTree) => void;

  readonly onAddClause: (path: FilterPath) => void;

  readonly onAddGroup: (path: FilterPath) => void;
  readonly testId: string | undefined;

  readonly removable: boolean;

  readonly canAdd: boolean;
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
          canAdd={canAdd}
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
      onAdd={path.length === 0 || !canAdd ? undefined : () => onAddGroup(path)}
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
          canAdd={canAdd}
        />
      ))}
      {path.length === 0 || !canAdd ? undefined : (
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

export const AdvancedFilter = ({
  fields,
  tree,
  onChange,
  title,
  className,
  style,
  testId,
  ...rest
}: AdvancedFilterProps) => {
  const theme = useTheme();
  const heading = spokenText(Option.fromNullishOr(title), DEFAULT_FILTER_TITLE);

  const offered = fieldList(fields);

  const shown = Option.match(Option.fromNullishOr(tree), {
    onNone: () => Option.some(emptyTree),
    onSome: (value) =>
      isFilterTree(value) ? Option.some(value) : Option.none(),
  });
  const base = Option.getOrElse(shown, () => emptyTree);
  const addClause = (path: FilterPath): void => {
    onChange(appendAt(base, path, clauseFor(offered)));
  };
  const addGroup = (path: FilterPath): void => {
    onChange(
      appendAt(base, path, { kind: "all", children: [clauseFor(offered)] }),
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
        {heading}
      </text>
      <text style={recipeStyle(FILTER_SENTENCE, theme)}>
        {Option.match(shown, {
          onNone: () => UNREADABLE_TREE,
          onSome: describeTree,
        })}
      </text>
      {Option.match(shown, {
        onNone: () => null,
        onSome: (readable) => (
          <Tree
            root={readable}
            node={readable}
            path={[]}
            fields={offered}
            onChange={onChange}
            onAddClause={addClause}
            onAddGroup={addGroup}
            testId={testId}
            removable={false}
            canAdd={offered.length > 0}
          />
        ),
      })}
      <div style={recipeStyle("flex flex-row items-center gap-2", theme)}>
        {Option.isSome(shown) && offered.length > 0 ? (
          <>
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
          </>
        ) : undefined}
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
