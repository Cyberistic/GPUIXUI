import { DEFAULT_EXPANDER_WIDTH } from "@gpuixui/data";
import * as Arr from "effect/Array";
import { Fragment, useState, type KeyboardEvent } from "react";

export interface ListedFile {
  readonly id: string;
  readonly name: string;
  readonly size: string;
  readonly modified: string;
  readonly kind: string;
  readonly owner: string;
}

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

export const LISTED_FILES: ReadonlyArray<ListedFile> = [
  HARBOUR,
  NOTES,
  DEPLOY,
  BUDGET,
];

export const OPEN_ON_MOUNT: ReadonlyArray<string> = [HARBOUR.id];

export const toggleOpen = (
  open: ReadonlyArray<string>,
  id: string,
): ReadonlyArray<string> =>
  Arr.contains(open, id)
    ? Arr.filter(open, (candidate) => candidate !== id)
    : Arr.append(open, id);

export const expanderGlyph = (
  open: boolean,
): "chevron-down" | "chevron-right" =>
  open ? "chevron-down" : "chevron-right";

export const expanderMark = (open: boolean): string =>
  expanderGlyph(open) === "chevron-down" ? "▾" : "▸";

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

export function ExpandableRowsDemo() {
  const [open, setOpen] = useState<ReadonlyArray<string>>(OPEN_ON_MOUNT);
  const press = (id: string): void =>
    setOpen((current) => toggleOpen(current, id));

  const key =
    (id: string) =>
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      press(id);
    };

  return (
    <div className="gx-data-scene">
      <div aria-label="Files with details" className="gx-dt" role="table">
        <div className="gx-dt-head" role="rowgroup">
          <div className="gx-dt-row" role="row">
            <div
              aria-hidden="true"
              className="gx-dt-hcell gx-dt-fixed"
              style={{ width: DEFAULT_EXPANDER_WIDTH }}
            />
            <div className="gx-dt-hcell" role="columnheader">
              Name
            </div>
            <div className="gx-dt-hcell" role="columnheader">
              Size
            </div>
            <div className="gx-dt-hcell" role="columnheader">
              Modified
            </div>
          </div>
        </div>
        <div role="rowgroup">
          {LISTED_FILES.map((file) => {
            const expanded = Arr.contains(open, file.id);
            return (
              <Fragment key={file.id}>
                <div
                  aria-expanded={expanded}
                  className="gx-dt-row"
                  data-expanded={expanded ? "true" : "false"}
                  data-file={file.id}
                  data-interactive=""
                  onClick={() => press(file.id)}
                  onKeyDown={key(file.id)}
                  role="row"
                  tabIndex={0}
                >
                  <div
                    className="gx-dt-cell gx-dt-expander"
                    style={{ width: DEFAULT_EXPANDER_WIDTH }}
                  >
                    {expanderMark(expanded)}
                  </div>
                  <div className="gx-dt-cell" role="cell">
                    {file.name}
                  </div>
                  <div className="gx-dt-cell" role="cell">
                    {file.size}
                  </div>
                  <div className="gx-dt-cell" role="cell">
                    {file.modified}
                  </div>
                </div>
                {expanded ? (
                  <div className="gx-dt-detail" role="row">
                    <div role="cell">
                      <div
                        aria-label={`${file.name} details`}
                        className="gx-dkv"
                        role="list"
                      >
                        {detailOf(file).map((fact) => (
                          <div
                            className="gx-dkv-row"
                            key={fact.key}
                            role="listitem"
                          >
                            <span
                              className="gx-dkv-label"
                              style={{ width: 72 }}
                            >
                              {fact.label}
                            </span>
                            <span className="gx-dkv-value">{fact.value}</span>
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
        <p className="gx-dt-caption">
          {open.length} of {LISTED_FILES.length} panels open
        </p>
      </div>
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
