/** @jsxImportSource @gpuix/react */
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

export const PAGE_SIZE = 6;

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
