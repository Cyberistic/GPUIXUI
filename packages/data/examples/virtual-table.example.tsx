/** @jsxImportSource @gpuix/react */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { Button } from "@gpuixui/primitives/button";
import type { VirtualReveal, VisibleRange } from "../src/index.js";
import {
  TableHeaderCell,
  TableRow,
  TableCell,
  TableSortHeader,
  TableFilterField,
  VirtualTable,
  useTable,
} from "../src/index.js";
import { textStyle, useTheme } from "../src/theme.js";

export const VIRTUAL_TABLE_ROWS = 1_000;

export const VIRTUAL_TABLE_ROW_HEIGHT = 36;

export const REVEAL_VIRTUAL_ROW = 900;

interface VirtualRow {
  readonly id: string;
  readonly name: string;
  readonly status: "tracked" | "modified" | "untracked";
  readonly size: number;
}

const STATUSES = ["tracked", "modified", "untracked"] as const;

const rows: ReadonlyArray<VirtualRow> = Arr.map(
  Arr.range(1, VIRTUAL_TABLE_ROWS),
  (n) => ({
    id: `row-${n}`,
    name: `file-${String(n).padStart(4, "0")}.ts`,
    status: STATUSES[n % STATUSES.length] ?? "tracked",
    size: n * 5,
  }),
);

const COLUMNS = [
  {
    id: "name",
    label: "Name",
    width: 260,
    minWidth: 120,
    maxWidth: 420,
    valueOf: (row: VirtualRow) => row.name,
  },
  {
    id: "status",
    label: "Status",
    width: 140,
    minWidth: 80,
    maxWidth: 220,
    valueOf: (row: VirtualRow) => row.status,
  },
  {
    id: "size",
    label: "Size",
    width: 100,
    minWidth: 70,
    maxWidth: 200,
    valueOf: (row: VirtualRow) => row.size,
  },
] as const;

export const VirtualTableExample = () => {
  const theme = useTheme();
  const table = useTable({
    rows,
    keyOf: (row) => row.id,
    columns: COLUMNS,
  });
  const [range, setRange] = useState<Option.Option<VisibleRange>>(
    Option.none(),
  );
  const [reveal, setReveal] = useState<VirtualReveal | undefined>(undefined);

  const trailing = {
    ...textStyle(theme, "caption"),
    color: theme.colors.mutedForeground,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        width: 560,
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
          width={180}
          testId="virtual-table-filter"
        />
        <Button
          variant="outline"
          size="sm"
          onActivate={() => setReveal({ index: REVEAL_VIRTUAL_ROW })}
          testId="virtual-table-reveal"
        >
          {`Reveal row ${REVEAL_VIRTUAL_ROW}`}
        </Button>
        <text testId="virtual-table-readout" style={trailing}>
          {`${table.rows.length} rows · ${table.selectedCount} selected · ${Option.match(
            range,
            {
              onNone: () => "first=- last=-",
              onSome: (window) => `first=${window.first} last=${window.last}`,
            },
          )}`}
        </text>
      </div>

      <VirtualTable
        height={320}
        count={table.rows.length}
        rowHeight={VIRTUAL_TABLE_ROW_HEIGHT}
        aria-label="Files, virtualized"
        testId="virtual-table"
        reveal={reveal}
        onVisibleRange={(next) => setRange(Option.some(next))}
        empty={
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            No file matches that filter.
          </text>
        }
        header={
          <TableRow>
            <TableSortHeader
              field="name"
              label="Name"
              sort={table.sort}
              onSort={(next) => table.setSort(Option.some(next))}
              width={COLUMNS[0].width}
              testId="virtual-table-name"
            />
            <TableHeaderCell width={COLUMNS[1].width}>
              <text style={trailing}>Status</text>
            </TableHeaderCell>
            <TableSortHeader
              field="size"
              label="Size"
              sort={table.sort}
              onSort={(next) => table.setSort(Option.some(next))}
              align="right"
              width={COLUMNS[2].width}
              initialDirection="desc"
              testId="virtual-table-size"
            />
          </TableRow>
        }
        row={(index) => {
          const row = table.rows[index];
          if (row === undefined) return null;
          return (
            <TableRow
              testId={`virtual-row-${row.id}`}
              selected={table.isSelected(row.id)}
              style={{ height: VIRTUAL_TABLE_ROW_HEIGHT }}
              onClick={(event) => table.pressRow(row, event.modifiers)}
            >
              <TableCell width={COLUMNS[0].width}>
                <text
                  style={{
                    ...textStyle(theme, "body"),
                    color: table.isSelected(row.id)
                      ? theme.colors.selectedForeground
                      : theme.colors.foreground,
                  }}
                >
                  {row.name}
                </text>
              </TableCell>
              <TableCell width={COLUMNS[1].width}>
                <text
                  style={{
                    ...textStyle(theme, "caption"),
                    color: table.isSelected(row.id)
                      ? theme.colors.selectedForeground
                      : theme.colors.mutedForeground,
                  }}
                >
                  {row.status}
                </text>
              </TableCell>
              <TableCell width={COLUMNS[2].width} align="right">
                <text
                  style={{
                    ...textStyle(theme, "caption"),
                    color: table.isSelected(row.id)
                      ? theme.colors.selectedForeground
                      : theme.colors.mutedForeground,
                  }}
                >
                  {`${row.size} B`}
                </text>
              </TableCell>
            </TableRow>
          );
        }}
      />
    </div>
  );
};

export const virtualRowNames: ReadonlyArray<string> = Arr.map(
  rows,
  (row) => row.name,
);
