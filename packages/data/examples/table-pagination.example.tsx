/** @jsxImportSource @gpuix/react */
/**
 * A grid whose page the reader moves: the page is the core's slice of the
 * filtered and sorted rows, and the controller owns the state.
 *
 * The screen is the wiring a consumer copies:
 *
 * - `useTable({ pageSize })` slices the kept set; `pageIndex`/`pageCount` are
 *   what a pager prints, and `nextPage`/`previousPage` are the arrows;
 * - the filter field narrows the set **and returns to the first page**, because
 *   the records the reader was reading are not where the saved index says they
 *   are once the set changes;
 * - a record chosen on one page stays chosen while another page paints, so the
 *   readout counts the kept set while the header's box covers the page;
 * - the page is part of the record `save()` writes, so a workspace reopens on
 *   the page the reader left — and a saved index past a narrowed set clamps to
 *   the last page the set holds instead of painting a blank one.
 *
 * The example holds 24 rows at six a page: four pages, and the last one holds
 * the remainder rather than a full page.
 */

import * as Arr from "effect/Array";
import { Button } from "@gpuixui/primitives/button";
import type { GridColumn } from "../src/grid-core.js";
import type { ColumnDef } from "../src/columns/logic.js";
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
import { TableFilterField } from "../src/filter/field.js";
import { useTable } from "../src/use-table.js";
import { textStyle, useTheme } from "../src/theme.js";

interface TaskRow {
  readonly id: string;
  readonly title: string;
  readonly owner: "ada" | "grace" | "linus";
}

const OWNERS = ["ada", "grace", "linus"] as const;

const tasks: ReadonlyArray<TaskRow> = Arr.map(Arr.range(1, 24), (n) => ({
  id: `task-${n}`,
  title: `Task ${String(n).padStart(2, "0")}`,
  owner: OWNERS[n % OWNERS.length] ?? "ada",
}));

/** The one column list the header, the rows and the row model read. */
const TASK_COLUMNS: ReadonlyArray<ColumnDef & GridColumn<TaskRow>> = [
  {
    id: "title",
    label: "Task",
    width: 200,
    minWidth: 120,
    maxWidth: 320,
    valueOf: (row) => row.title,
  },
  {
    id: "owner",
    label: "Owner",
    width: 100,
    minWidth: 80,
    maxWidth: 160,
    valueOf: (row) => row.owner,
  },
];

/** The rows one page holds. */
export const PAGE_SIZE = 6;

/** A task list the reader pages through and narrows. */
export const TablePaginationExample = () => {
  const theme = useTheme();
  const table = useTable({
    rows: tasks,
    keyOf: (row) => row.id,
    columns: TASK_COLUMNS,
    pageSize: PAGE_SIZE,
  });
  const page = `${table.pageIndex + 1} of ${table.pageCount}`;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        width: 480,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        <TableFilterField
          value={table.query}
          onValueChange={table.setQuery}
          width={200}
          testId="pagination-filter"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={table.pageIndex === 0}
          onActivate={table.previousPage}
          testId="pagination-previous"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={table.pageIndex >= table.pageCount - 1}
          onActivate={table.nextPage}
          testId="pagination-next"
        >
          Next
        </Button>
        <text
          testId="pagination-readout"
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          {`Page ${page} · ${table.rows.length} rows · ${table.selectedCount} selected`}
        </text>
      </div>
      <Table height={320} aria-label="Tasks" testId="pagination-table">
        <TableViewport>
          <TableHeader>
            <TableRow>
              {Arr.map(TASK_COLUMNS, (column) => (
                <TableHeaderCell key={column.id} width={column.width}>
                  <text
                    style={{
                      ...textStyle(theme, "caption"),
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    {column.label}
                  </text>
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody testId="pagination-body">
            {Arr.map(table.rows, (row) => (
              <TableRow
                key={row.id}
                testId={`pagination-row-${row.id}`}
                selected={table.isSelected(row.id)}
                onClick={(event) => table.press(row.id, event.modifiers)}
              >
                <TableCell width={200}>
                  <text style={textStyle(theme, "body")}>{row.title}</text>
                </TableCell>
                <TableCell width={100}>
                  <text
                    style={{
                      ...textStyle(theme, "caption"),
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    {row.owner}
                  </text>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableViewport>
        <TableCaption>{`Page ${page} · ${table.kept.length} matching`}</TableCaption>
      </Table>
    </div>
  );
};
