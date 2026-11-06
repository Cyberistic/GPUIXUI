import {
  UNREADABLE_TREE,
  appendAt,
  comparisons,
  describeTree,
  emptyTree,
  filterByTree,
  readFilterTree,
  removeAt,
  setGroupKind,
  updateAt,
  type Comparison,
  type FieldPredicate,
  type FilterTree,
} from "@gpuixui/data/surfaces/logic";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";

export interface FilterFile {
  readonly id: string;
  readonly name: string;
  readonly status: "tracked" | "ignored" | "archived";
  readonly size: number;
}

export const FILTER_FILES: ReadonlyArray<FilterFile> = [
  { id: "brand", name: "brand.svg", status: "tracked", size: 2048 },
  { id: "hero", name: "hero.png", status: "tracked", size: 512 },
  { id: "logo", name: "logo.svg", status: "tracked", size: 900 },
  { id: "draft", name: "draft.md", status: "ignored", size: 4096 },
  { id: "notes", name: "notes.txt", status: "archived", size: 120 },
];

export const filterDisplayFields: ReadonlyArray<{
  readonly field: string;
  readonly label: string;
}> = [
  { field: "status", label: "Status" },
  { field: "size", label: "Size" },
];

export const filterValueOf = (
  file: FilterFile,
  field: string,
): string | number => {
  if (field === "status") return file.status;
  if (field === "size") return file.size;
  return file.name;
};

export const comparisonLabels: Readonly<Record<Comparison, string>> = {
  equals: "equals",
  notEquals: "does not equal",
  contains: "contains",
  greaterThan: "greater than",
  lessThan: "less than",
};

const tracked = (status: string): FieldPredicate => ({
  kind: "predicate",
  field: "status",
  comparison: "equals",
  value: status,
});

const largerThan = (size: string): FieldPredicate => ({
  kind: "predicate",
  field: "size",
  comparison: "greaterThan",
  value: size,
});

export const filterTree = (
  kind: "all" | "any",
  size: string,
  status = "tracked",
): FilterTree =>
  setGroupKind(
    { kind: "all", children: [tracked(status), largerThan(size)] },
    [],
    kind,
  );

export const filterStoredQuery = {
  kind: "all",
  children: [
    {
      kind: "predicate",
      field: "status",
      comparison: "matches",
      value: "tracked",
    },
  ],
};

export const appliedFilter = (
  stored: boolean,
  kind: "all" | "any",
  size: string,
  status = "tracked",
): Option.Option<FilterTree> =>
  stored
    ? readFilterTree(filterStoredQuery)
    : Option.some(filterTree(kind, size, status));

export const filterFiles = (
  applied: Option.Option<FilterTree>,
): ReadonlyArray<FilterFile> =>
  Option.match(applied, {
    onNone: () => [],
    onSome: (tree) => filterByTree(FILTER_FILES, tree, filterValueOf),
  });

export const filterSentence = (applied: Option.Option<FilterTree>): string =>
  Option.match(applied, {
    onNone: () => UNREADABLE_TREE,
    onSome: describeTree,
  });

const fieldLabel = (field: string): string =>
  Option.match(
    Arr.findFirst(filterDisplayFields, (entry) => entry.field === field),
    { onNone: () => field, onSome: (entry) => entry.label },
  );

const kindOf = (tree: FilterTree): "all" | "any" =>
  tree.kind === "any" ? "any" : "all";

const statusTone = (status: FilterFile["status"]): string =>
  status === "tracked"
    ? "gx-badge-success"
    : status === "ignored"
      ? "gx-badge-warning"
      : "gx-badge-neutral";

const Clause = ({
  clause,
  index,
  menu,
  onMenu,
  onChange,
  onRemove,
}: {
  readonly clause: FieldPredicate;
  readonly index: number;
  readonly menu: string | undefined;
  readonly onMenu: (next: string | undefined) => void;
  readonly onChange: (next: FieldPredicate) => void;
  readonly onRemove: () => void;
}) => {
  const name = fieldLabel(clause.field);
  const fieldMenu = `field-${index}`;
  const comparisonMenu = `comparison-${index}`;
  return (
    <div className="gx-dfilter-clause">
      <span className="gx-dmenu-anchor">
        <button
          aria-expanded={menu === fieldMenu}
          aria-label="Field"
          className="gx-btn gx-btn-secondary gx-btn-sm"
          onClick={() => onMenu(menu === fieldMenu ? undefined : fieldMenu)}
          type="button"
        >
          {name}
        </button>
        {menu === fieldMenu ? (
          <div aria-label="Field" className="gx-dmenu" role="menu">
            {filterDisplayFields.map((entry) => (
              <button
                className="gx-dmenu-item"
                key={entry.field}
                onClick={() => {
                  onMenu(undefined);
                  onChange({ ...clause, field: entry.field });
                }}
                role="menuitem"
                type="button"
              >
                {entry.label}
              </button>
            ))}
          </div>
        ) : null}
      </span>
      <span className="gx-dmenu-anchor">
        <button
          aria-expanded={menu === comparisonMenu}
          aria-label="Comparison"
          className="gx-btn gx-btn-secondary gx-btn-sm"
          onClick={() =>
            onMenu(menu === comparisonMenu ? undefined : comparisonMenu)
          }
          type="button"
        >
          {comparisonLabels[clause.comparison]}
        </button>
        {menu === comparisonMenu ? (
          <div aria-label="Comparison" className="gx-dmenu" role="menu">
            {comparisons.map((comparison) => (
              <button
                className="gx-dmenu-item"
                key={comparison}
                onClick={() => {
                  onMenu(undefined);
                  onChange({ ...clause, comparison });
                }}
                role="menuitem"
                type="button"
              >
                {comparisonLabels[comparison]}
              </button>
            ))}
          </div>
        ) : null}
      </span>
      <label className="gx-dfield gx-dfield-sm">
        <input
          aria-label={`${name} value`}
          onChange={(event) =>
            onChange({ ...clause, value: event.target.value })
          }
          value={clause.value}
        />
      </label>
      <button
        aria-label="Remove clause"
        className="gx-btn gx-btn-ghost gx-btn-sm"
        onClick={onRemove}
        type="button"
      >
        Remove
      </button>
    </div>
  );
};

export function AdvancedFilterDemo() {
  const [tree, setTree] = useState<FilterTree>(() => filterTree("all", "1024"));
  const [stored, setStored] = useState(false);
  const [menu, setMenu] = useState<string | undefined>(undefined);
  const applied = stored
    ? readFilterTree(filterStoredQuery)
    : Option.some(tree);
  const files = filterFiles(applied);
  const clauses =
    tree.kind === "predicate" || tree.kind === "not" ? [] : tree.children;

  const edit = (index: number, next: FieldPredicate): void => {
    setStored(false);
    setTree(updateAt(tree, [index], next));
  };

  return (
    <div className="gx-data-scene" data-demo="advanced-filter">
      <div className="gx-dfilter">
        <span className="gx-dfilter-title">Filters</span>
        <span className="gx-dfilter-sentence">{filterSentence(applied)}</span>
        {stored ? null : (
          <>
            <div aria-label="Match" className="gx-data-row" role="group">
              {(["all", "any"] as const).map((kind) => (
                <button
                  aria-pressed={kindOf(tree) === kind}
                  className="gx-btn gx-btn-sm gx-toggle"
                  data-pressed={kindOf(tree) === kind ? "" : undefined}
                  key={kind}
                  onClick={() => {
                    setTree(setGroupKind(tree, [], kind));
                    setMenu(undefined);
                  }}
                  type="button"
                >
                  {kind}
                </button>
              ))}
            </div>
            <div className="gx-dfilter-group">
              {clauses.map((clause, index) =>
                clause.kind === "predicate" ? (
                  <Clause
                    clause={clause}
                    index={index}
                    key={`${clause.field}-${index}`}
                    menu={menu}
                    onChange={(next) => edit(index, next)}
                    onMenu={setMenu}
                    onRemove={() => {
                      setMenu(undefined);
                      setTree(removeAt(tree, [index]));
                    }}
                  />
                ) : null,
              )}
            </div>
          </>
        )}
        <div className="gx-dfilter-actions">
          {stored ? null : (
            <>
              <button
                className="gx-btn gx-btn-secondary gx-btn-sm"
                onClick={() =>
                  setTree(
                    appendAt(tree, [], {
                      kind: "predicate",
                      field: "status",
                      comparison: "equals",
                      value: "",
                    }),
                  )
                }
                type="button"
              >
                Add clause
              </button>
              <button
                className="gx-btn gx-btn-ghost gx-btn-sm"
                onClick={() => {
                  setTree(emptyTree);
                  setMenu(undefined);
                }}
                type="button"
              >
                Clear
              </button>
            </>
          )}
          <button
            className="gx-btn gx-btn-secondary gx-btn-sm"
            onClick={() => {
              if (stored) {
                setStored(false);
                setTree(filterTree("all", "1024"));
                return;
              }
              setStored(true);
              setMenu(undefined);
            }}
            type="button"
          >
            {stored
              ? `Clear “${UNREADABLE_TREE}”`
              : "Load a query from an older release"}
          </button>
        </div>
      </div>
      <div aria-label="Files the query keeps" className="gx-dt" role="table">
        <div className="gx-dt-head" role="rowgroup">
          <div className="gx-dt-row" role="row">
            <div className="gx-dt-hcell" role="columnheader">
              File
            </div>
            <div className="gx-dt-hcell" role="columnheader">
              Status
            </div>
            <div className="gx-dt-hcell gx-dt-right" role="columnheader">
              Size
            </div>
          </div>
        </div>
        <div role="rowgroup">
          {files.length === 0 ? (
            <div className="gx-dt-empty" role="row">
              No rows
            </div>
          ) : (
            files.map((file) => (
              <div
                className="gx-dt-row"
                data-file={file.id}
                key={file.id}
                role="row"
              >
                <div className="gx-dt-cell" role="cell">
                  {file.name}
                </div>
                <div className="gx-dt-cell" role="cell">
                  <span
                    className={`gx-badge gx-badge-sm ${statusTone(file.status)}`}
                  >
                    {file.status}
                  </span>
                </div>
                <div className="gx-dt-cell gx-dt-right" role="cell">
                  {file.size}
                </div>
              </div>
            ))
          )}
        </div>
        <p className="gx-dt-caption">
          {`${files.length} of ${FILTER_FILES.length} files`}
        </p>
      </div>
    </div>
  );
}

export const advancedFilterDemoSource = `import {
  AdvancedFilter,
  emptyTree,
  filterByTree,
  type FilterTree,
} from "@gpuixui/data";
import { useState } from "react";

const [tree, setTree] = useState<FilterTree>(emptyTree);
const rows = filterByTree(files, tree, (file, field) =>
  field === "status" ? file.status : file.size,
);

<AdvancedFilter
  fields={[
    { field: "status", label: "Status" },
    { field: "size", label: "Size" },
  ]}
  tree={tree}
  onChange={setTree}
/>;

<Table rows={rows} />;`;
