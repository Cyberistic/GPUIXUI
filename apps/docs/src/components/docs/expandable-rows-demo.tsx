import { DEFAULT_EXPANDER_WIDTH } from "@gpuixui/data";
import * as Arr from "effect/Array";
import { Fragment, useState, type KeyboardEvent } from "react";

/**
 * Browser preview for the Expandable rows page.
 *
 * `@gpuixui/data`'s `TableExpandableRow` is a GPUix host row, so the package
 * page cannot mount it and this drawing is a labelled approximation. What it
 * does not approximate is the row's contract, read from
 * `packages/data/src/table/expandable.tsx`: **the row is the toggle** (the
 * chevron is decoration that takes no hit test), the panel is a **sibling**
 * row on the `muted` strip rather than a cell, the expander track is the
 * package's `DEFAULT_EXPANDER_WIDTH`, and two rows can be open at once. Only
 * the paint is the browser's.
 */

/** One file the table lists, and the facts its panel shows. */
export interface ListedFile {
  readonly id: string;
  readonly name: string;
  readonly size: string;
  readonly modified: string;
  readonly kind: string;
  readonly owner: string;
}

/** The first record: the page opens its panel. */
export const HARBOUR: ListedFile = {
  id: "harbour",
  name: "harbour-chart.png",
  size: "1.4 MB",
  modified: "24 Oct",
  kind: "PNG image",
  owner: "design",
};

const NOTES: ListedFile = {
  id: "notes",
  name: "notes.md",
  size: "12 KB",
  modified: "23 Oct",
  kind: "Markdown",
  owner: "docs",
};

const DEPLOY: ListedFile = {
  id: "deploy",
  name: "deploy.log",
  size: "318 KB",
  modified: "22 Oct",
  kind: "Log file",
  owner: "platform",
};

const BUDGET: ListedFile = {
  id: "budget",
  name: "budget.csv",
  size: "48 KB",
  modified: "20 Oct",
  kind: "Spreadsheet",
  owner: "finance",
};

/** The records the table lists. */
export const LISTED_FILES: ReadonlyArray<ListedFile> = [
  HARBOUR,
  NOTES,
  DEPLOY,
  BUDGET,
];

/** The panel the page opens on: the first record, so a reader sees one at rest. */
export const OPEN_ON_MOUNT: ReadonlyArray<string> = [HARBOUR.id];

/**
 * The ids open after a press on one row.
 *
 * The caller owns `expanded` and flips it, so the drawing's rule is the
 * package's: a press opens the row it names and leaves every other panel
 * alone — two rows can be open at once — and a second press closes it.
 */
export const toggleOpen = (
  open: ReadonlyArray<string>,
  id: string,
): ReadonlyArray<string> =>
  Arr.contains(open, id)
    ? Arr.filter(open, (candidate) => candidate !== id)
    : Arr.append(open, id);

/** The chevron the expander paints: the two names the package chooses between. */
export const expanderGlyph = (
  open: boolean,
): "chevron-down" | "chevron-right" =>
  open ? "chevron-down" : "chevron-right";

/** The glyph a browser paints for the package's icon name. */
export const expanderMark = (open: boolean): string =>
  expanderGlyph(open) === "chevron-down" ? "▾" : "▸";

/** The facts the detail panel lists, in the order it paints them. */
export const detailOf = (
  file: ListedFile,
): ReadonlyArray<{
  readonly key: string;
  readonly label: string;
  readonly value: string;
}> => [
  { key: "kind", label: "Kind", value: file.kind },
  { key: "size", label: "Size", value: file.size },
  { key: "owner", label: "Owner", value: file.owner },
  { key: "modified", label: "Modified", value: file.modified },
];

/** The page's preview: a table whose rows open a panel under themselves. */
export function ExpandableRowsDemo() {
  const [open, setOpen] = useState<ReadonlyArray<string>>(OPEN_ON_MOUNT);
  const press = (id: string): void =>
    setOpen((current) => toggleOpen(current, id));

  const key =
    (id: string) =>
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key !== "Enter" && event.key !== " ") return;
      // A disclosure row is a control: the key opens it exactly as a press does,
      // and it is answered only because the row itself holds focus.
      event.preventDefault();
      press(id);
    };

  return (
    <div className="gx-demo-frame">
      <div aria-label="Files with details" className="gx-er" role="table">
        <div className="gx-er-head" role="rowgroup">
          <div className="gx-er-headrow" role="row">
            <span
              aria-hidden="true"
              className="gx-er-track"
              role="presentation"
              style={{ width: DEFAULT_EXPANDER_WIDTH }}
            />
            <span className="gx-er-cell gx-er-name" role="columnheader">
              Name
            </span>
            <span className="gx-er-cell" role="columnheader">
              Size
            </span>
            <span className="gx-er-cell" role="columnheader">
              Modified
            </span>
          </div>
        </div>
        <div className="gx-er-body" role="rowgroup">
          {LISTED_FILES.map((file) => {
            const expanded = Arr.contains(open, file.id);
            return (
              <Fragment key={file.id}>
                <div
                  aria-expanded={expanded}
                  className="gx-er-row"
                  data-open={expanded}
                  onClick={() => press(file.id)}
                  onKeyDown={key(file.id)}
                  role="row"
                  tabIndex={0}
                >
                  <span
                    aria-hidden="true"
                    className="gx-er-track"
                    style={{ width: DEFAULT_EXPANDER_WIDTH }}
                  >
                    {expanderMark(expanded)}
                  </span>
                  <span className="gx-er-cell gx-er-name" role="cell">
                    {file.name}
                  </span>
                  <span className="gx-er-cell" role="cell">
                    {file.size}
                  </span>
                  <span className="gx-er-cell" role="cell">
                    {file.modified}
                  </span>
                </div>
                {expanded ? (
                  <div className="gx-er-detail" role="row">
                    <div className="gx-er-detail-cell" role="cell">
                      <div
                        aria-label={`${file.name} details`}
                        className="gx-kv"
                        role="list"
                      >
                        {detailOf(file).map((fact) => (
                          <div
                            className="gx-kv-row"
                            key={fact.key}
                            role="listitem"
                          >
                            <span className="gx-kv-label" style={{ width: 72 }}>
                              {fact.label}
                            </span>
                            <span className="gx-kv-value">{fact.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </Fragment>
            );
          })}
        </div>
      </div>
      <p className="gx-demo-readout">
        {open.length} of {LISTED_FILES.length} panels open · the row is the
        toggle, Enter and Space included
      </p>
      <p className="gx-demo-hint">
        The panel is a sibling row, not a cell: a row span does not exist in
        GPUix 0.11.0. Two rows can be open at once, and the panel&apos;s height
        is not animated — a windowed table cannot hold these rows.
      </p>
    </div>
  );
}

export const expandableRowsDemoSource = `import {
  KeyValue,
  Table,
  TableBody,
  TableExpandableRow,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableViewport,
} from "@gpuixui/data";
import { useState } from "react";

const [open, setOpen] = useState<string[]>([]);
const flip = (id: string) =>
  setOpen((kept) => (kept.includes(id) ? kept.filter((k) => k !== id) : [...kept, id]));

<Table height={300} aria-label="Files with details">
  <TableViewport>
    <TableHeader>
      <TableRow>
        <TableHeaderCell width={32} />
        <TableHeaderCell width={200}>Name</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {files.map((file) => (
        <TableExpandableRow
          key={file.id}
          expanded={open.includes(file.id)}
          onToggle={() => flip(file.id)}
          cells={<TableCell width={200}>{file.name}</TableCell>}
          detail={<KeyValue entries={detailOf(file)} />}
        />
      ))}
    </TableBody>
  </TableViewport>
</Table>;`;
