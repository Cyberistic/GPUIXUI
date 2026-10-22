/**
 * A files table whose rows open a detail panel under themselves.
 *
 * The panel is a **sibling row**, not a spanning cell: 0.11.0 has no row span,
 * and a detail panel must be as wide as the table's content and push the rows
 * below it (`virtual-list-expand` measured the growth, the shift and the
 * re-measure). The press is the row's — the chevron is an `<svg>` that takes no
 * hit test, so a press anywhere on the row opens it.
 *
 * The expansion is the app's: `toggleExpanded` is the tree package's reducer, so
 * a table and a tree cannot disagree about what "open" means.
 */

import { Order } from "effect";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import { useState } from "react";
import { KeyValue } from "../src/surfaces/key-value.js";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableViewport,
} from "../src/table/table.js";
import { TableExpandableRow } from "../src/table/expandable.js";
import { toggleExpanded } from "../src/tree/logic.js";
import { textStyle, useTheme } from "../src/theme.js";

interface FileRow {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly size: number;
}

const files: ReadonlyArray<FileRow> = [
  { id: "readme", name: "readme.md", status: "tracked", size: 1_240 },
  { id: "index", name: "index.ts", status: "modified", size: 860 },
  { id: "table", name: "table.tsx", status: "tracked", size: 4_120 },
  { id: "theme", name: "theme.ts", status: "untracked", size: 320 },
];

/** A files table with one detail panel per row. */
export const ExpandableRowsExample = () => {
  const theme = useTheme();
  const [open, setOpen] = useState<HashSet.HashSet<string>>(HashSet.empty());

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        width: 520,
      }}
    >
      <text
        testId="expandable-readout"
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`${files.length} files · open=${Arr.join(
          Arr.sort(Arr.fromIterable(open), Order.String),
          ",",
        )}`}
      </text>
      <Table
        height={300}
        aria-label="Files with details"
        testId="expandable-table"
      >
        <TableViewport>
          <TableHeader>
            <TableRow>
              <TableHeaderCell width={32} />
              <TableHeaderCell width={200}>Name</TableHeaderCell>
              <TableHeaderCell width={120}>Status</TableHeaderCell>
              <TableHeaderCell width={100} align="right">
                Size
              </TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Arr.map(files, (row) => (
              <TableExpandableRow
                key={row.id}
                testId={`expandable-row-${row.id}`}
                detailTestId={`expandable-detail-${row.id}`}
                expanded={HashSet.has(open, row.id)}
                onToggle={() =>
                  setOpen((current) => toggleExpanded(current, row.id))
                }
                cells={
                  <>
                    <TableCell width={200}>{row.name}</TableCell>
                    <TableCell width={120}>
                      <text
                        style={{
                          ...textStyle(theme, "caption"),
                          color: theme.colors.mutedForeground,
                        }}
                      >
                        {row.status}
                      </text>
                    </TableCell>
                    <TableCell width={100} align="right">
                      {`${row.size} B`}
                    </TableCell>
                  </>
                }
                detail={
                  <KeyValue
                    labelWidth={80}
                    testId={`expandable-kv-${row.id}`}
                    entries={[
                      { key: "path", label: "Path", value: `src/${row.name}` },
                      {
                        key: "size",
                        label: "Size",
                        value: `${row.size} bytes`,
                      },
                      { key: "status", label: "Status", value: row.status },
                    ]}
                  />
                }
              />
            ))}
          </TableBody>
        </TableViewport>
        <TableCaption>
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            Press a row to open its details.
          </text>
        </TableCaption>
      </Table>
    </div>
  );
};
