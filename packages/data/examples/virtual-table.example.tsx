/**
 * A virtualized table over 1 000 rows: one measured window of rows is
 * retained, a header stays painted above them, a far row is revealed, and a
 * chosen record survives the window moving away and back.
 *
 * This is the composition phase 4b exists for. The parts are the same ones the
 * plain table uses — `VirtualTable` composes `Table`, `TableViewport`,
 * `TableHeader` and a windowed `<virtual-list>` body — so only the rows the
 * window names exist in the tree.
 *
 * `VIRTUAL_TABLE_ROW_HEIGHT` is the row's painted height **and** the runtime's
 * positioning estimate, so a row that declared a different height would leave
 * the rows below it out of place. Every row here paints exactly that box.
 *
 * The reveal is declarative: a press creates a {@link VirtualReveal} object, the
 * body moves its window in the same render, and only then scrolls to the row —
 * the order `virtual-list-windowed` measured, because the runtime cannot build a
 * row outside the window it was given.
 */

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

/** The logical row count. The screen retains one window of it. */
export const VIRTUAL_TABLE_ROWS = 1_000;

/** The painted height of every row, and the runtime's estimate. */
export const VIRTUAL_TABLE_ROW_HEIGHT = 36;

/** The far row the reveal action jumps to. */
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

const textOf = (row: VirtualRow): string =>
  `${row.name} ${row.status} ${row.size}`;

const valueOf = (row: VirtualRow, field: string): string | number =>
  field === "size" ? row.size : row.name;

/** The one column list the header and every row read. */
const COLUMNS = [
  { id: "name", label: "Name", width: 260, minWidth: 120, maxWidth: 420 },
  { id: "status", label: "Status", width: 140, minWidth: 80, maxWidth: 220 },
  { id: "size", label: "Size", width: 100, minWidth: 70, maxWidth: 200 },
] as const;

/** A table that paints one window of a thousand rows. */
export const VirtualTableExample = () => {
  const theme = useTheme();
  const table = useTable({
    rows,
    keyOf: (row) => row.id,
    textOf,
    valueOf,
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

/** The fixture's row names, for a suite that needs the source order. */
export const virtualRowNames: ReadonlyArray<string> = Arr.map(
  rows,
  (row) => row.name,
);
