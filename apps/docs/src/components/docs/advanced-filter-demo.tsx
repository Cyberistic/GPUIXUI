import {
  UNREADABLE_TREE,
  describeTree,
  filterByTree,
  readFilterTree,
  setGroupKind,
  type FieldPredicate,
  type FilterTree,
} from "@gpuixui/data/surfaces/logic";
import * as Option from "effect/Option";
import { useState } from "react";

/**
 * Browser preview for the Advanced filtering / query builders page.
 *
 * `@gpuixui/data`'s `AdvancedFilter` is a GPUix host tree, so the page cannot
 * mount it and this drawing is a labelled approximation. What it does not
 * approximate is the query itself: the tree is evaluated by the package's
 * `filterByTree`, its words are `describeTree`'s sentence, and a stored query
 * is decoded through `readFilterTree`, so a query this release cannot read
 * keeps no rows and paints the refusal the component paints.
 */

/** One file the demo's query reads. */
export interface FilterFile {
  readonly id: string;
  readonly name: string;
  readonly status: "tracked" | "ignored" | "archived";
  readonly size: number;
}

/** The rows the builder starts on: three tracked files of different sizes. */
export const FILTER_FILES: ReadonlyArray<FilterFile> = [
  { id: "brand", name: "brand.svg", status: "tracked", size: 2048 },
  { id: "hero", name: "hero.png", status: "tracked", size: 512 },
  { id: "logo", name: "logo.svg", status: "tracked", size: 900 },
  { id: "draft", name: "draft.md", status: "ignored", size: 4096 },
  { id: "notes", name: "notes.txt", status: "archived", size: 120 },
];

/** The field a clause reads, in the caller's vocabulary. */
export const filterDisplayFields: ReadonlyArray<{
  readonly field: string;
  readonly label: string;
}> = [
  { field: "status", label: "Status" },
  { field: "size", label: "Size" },
];

/** A row's value for a field, read the way the page's snippet's `valueOf` does. */
export const filterValueOf = (
  file: FilterFile,
  field: string,
): string | number => {
  if (field === "status") return file.status;
  if (field === "size") return file.size;
  return file.name;
};

/** The opening comparison: a tracked file. */
const tracked: FieldPredicate = {
  kind: "predicate",
  field: "status",
  comparison: "equals",
  value: "tracked",
};

/** The second comparison, over the size the reader types. */
const largerThan = (size: string): FieldPredicate => ({
  kind: "predicate",
  field: "size",
  comparison: "greaterThan",
  value: size,
});

/** The two-clause tree the builder opens on, combined with `kind`. */
export const filterTree = (kind: "all" | "any", size: string): FilterTree =>
  setGroupKind(
    { kind: "all", children: [tracked, largerThan(size)] },
    [],
    kind,
  );

/**
 * A query a previous release wrote with a comparison this one does not carry.
 *
 * The page's own §A saved query rule is what the drawing demonstrates: the
 * decoder refuses it, so the table keeps no rows rather than the records the
 * query meant to hide.
 */
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

/** The tree the drawing applies, or the refusal a stored query crosses. */
export const appliedFilter = (
  stored: boolean,
  kind: "all" | "any",
  size: string,
): Option.Option<FilterTree> =>
  stored
    ? readFilterTree(filterStoredQuery)
    : Option.some(filterTree(kind, size));

/** The files the applied tree keeps, in the caller's order. */
export const filterFiles = (
  applied: Option.Option<FilterTree>,
): ReadonlyArray<FilterFile> =>
  Option.match(applied, {
    onNone: () => [],
    onSome: (tree) => filterByTree(FILTER_FILES, tree, filterValueOf),
  });

/** The sentence the tree reads as; a refused query is the builder's refusal. */
export const filterSentence = (applied: Option.Option<FilterTree>): string =>
  Option.match(applied, {
    onNone: () => UNREADABLE_TREE,
    onSome: describeTree,
  });

/** The builder's browser rendering. */
export function AdvancedFilterDemo() {
  const [kind, setKind] = useState<"all" | "any">("all");
  const [size, setSize] = useState("1024");
  const [stored, setStored] = useState(false);
  const applied = appliedFilter(stored, kind, size);
  const files = filterFiles(applied);

  return (
    <div className="gx-trule-demo" data-demo="advanced-filter">
      <div className="gx-filter-controls">
        <span className="gx-filter-caption">Match</span>
        <button
          aria-pressed={kind === "all"}
          className="gx-filter-toggle"
          onClick={() => {
            setStored(false);
            setKind("all");
          }}
          type="button"
        >
          all
        </button>
        <button
          aria-pressed={kind === "any"}
          className="gx-filter-toggle"
          onClick={() => {
            setStored(false);
            setKind("any");
          }}
          type="button"
        >
          any
        </button>
        <label className="gx-filter-size">
          <span>Size greater than</span>
          <input
            className="gx-table-filter"
            onChange={(event) => {
              setStored(false);
              setSize(event.target.value);
            }}
            type="number"
            value={size}
          />
        </label>
      </div>
      <p className="gx-trule-readout">
        {`${filterSentence(applied)} · ${files.length} of ${FILTER_FILES.length} files`}
      </p>
      <div className="gx-table">
        <table aria-label="Files the query keeps" className="gx-table-el">
          <thead>
            <tr>
              <th className="gx-table-head" scope="col">
                File
              </th>
              <th className="gx-table-head" scope="col">
                Status
              </th>
              <th className="gx-table-head" scope="col">
                Size
              </th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr className="gx-table-row" data-file={file.id} key={file.id}>
                <td className="gx-table-cell gx-table-service">{file.name}</td>
                <td className="gx-table-cell">{file.status}</td>
                <td className="gx-table-cell gx-table-number">{file.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="gx-filter-stored"
        onClick={() => {
          if (stored) {
            setStored(false);
            setKind("all");
            setSize("1024");
            return;
          }
          setStored(true);
        }}
        type="button"
      >
        {stored
          ? `Clear “${UNREADABLE_TREE}”`
          : "Load a query from an older release"}
      </button>
      <p className="gx-trule-hint">
        The tree is data: “all” keeps a file that satisfies both clauses, “any”
        keeps one that satisfies either. The sentence above is the package’s
        own, and a stored query this release cannot decode keeps no rows rather
        than showing every file the query meant to hide.
      </p>
    </div>
  );
}

/** The page's copyable native usage, shown in the preview's Code tab. */
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
