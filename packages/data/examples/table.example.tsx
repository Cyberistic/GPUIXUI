/**
 * A files table: sort, filter, choose a row, configure columns, resize a track
 * and walk the rows from the keyboard.
 *
 * This is the whole composition a consumer copies — the parts are presentational
 * and the controllers hold the state, so the screen is the wiring:
 *
 * - the header is a sibling of the row scroller inside one horizontal scroller,
 *   which is how 0.11.0 gets a fixed header without `position: "sticky"`;
 * - a `TableSortHeader` reports the next `SortState`, and the controller sorts;
 * - a row press reports the record and the runtime's modifier flags, so a plain
 *   press replaces, Cmd/Ctrl toggles and Shift extends;
 * - a selection box toggles one record without replacing the set, because the
 *   box paints and GPUI's hit test stops at the first painted child;
 * - ArrowUp/ArrowDown move the chosen row **and** native focus, because a
 *   selection the keyboard moved but focus did not is a row the next key does
 *   not reach;
 * - the rows are **one stop in the Tab order**, owned by the chosen record or
 *   by the first painted row when nothing is chosen, so Tab reaches them before
 *   any press and a filter that releases a chosen record does not remove the
 *   stop the reader was standing on;
 * - Enter or Space chooses the row that holds the stop, because a focusable
 *   `div` has no activation of its own: the arrows walk, and a row the reader
 *   Tabs into must be the one they can choose;
 * - the filter field narrows the set, and the controller releases a chosen
 *   record the narrower set hides;
 * - the header and every row read **one** column list (`columns.visible`) and
 *   each column's own width, so hiding, moving or resizing a column cannot
 *   leave the cells on a second copy of the layout;
 * - a resize divider sits inside the header cell it ends, so a body row needs
 *   no spacer track.
 *
 * The example holds 60 rows so the window suite can measure a scrolling body
 * without pretending the table is virtualized: it paints every row it is given.
 */

import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import * as Arr from "effect/Array";
import { Match } from "effect";
import * as Option from "effect/Option";
import { useCallback, useLayoutEffect, useRef } from "react";
import { Button } from "@gpuixui/primitives/button";
import { ColumnMenu } from "../src/columns/menu.js";
import { TableColumnDivider } from "../src/columns/divider.js";
import type { ColumnDef } from "../src/columns/logic.js";
import type { GridColumn } from "../src/grid-core.js";
import { useColumns } from "../src/columns/use-columns.js";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableViewport,
} from "../src/table/table.js";
import { TableSortHeader } from "../src/sort/header.js";
import { TableFilterField } from "../src/filter/field.js";
import { useTable } from "../src/use-table.js";
import { neighbourKey, selectionSize } from "../src/selection/logic.js";
import {
  TableSelectionCell,
  TableSelectionHeader,
} from "../src/selection/column.js";
import { textStyle, useTheme } from "../src/theme.js";

interface FileRow {
  readonly id: string;
  readonly name: string;
  readonly status: "tracked" | "modified" | "untracked";
  readonly size: number;
}

const STATUSES = ["tracked", "modified", "untracked"] as const;

const files: ReadonlyArray<FileRow> = Arr.map(Arr.range(1, 60), (n) => ({
  id: `file-${n}`,
  name: `file-${String(n).padStart(3, "0")}.ts`,
  status: STATUSES[n % STATUSES.length] ?? "tracked",
  size: n * 7,
}));

/** The one column list the header, the rows and the row model read. */
const FILE_COLUMNS: ReadonlyArray<ColumnDef & GridColumn<FileRow>> = [
  {
    id: "name",
    label: "Name",
    width: 260,
    minWidth: 120,
    maxWidth: 420,
    valueOf: (row) => row.name,
  },
  {
    id: "status",
    label: "Status",
    width: 110,
    minWidth: 80,
    maxWidth: 220,
    valueOf: (row) => row.status,
  },
  {
    id: "size",
    label: "Size",
    width: 90,
    minWidth: 70,
    maxWidth: 200,
    valueOf: (row) => row.size,
  },
];

/** The text a column paints for one row. */
const cellText = (row: FileRow, id: string): string =>
  Match.value(id).pipe(
    Match.when("name", () => row.name),
    Match.when("status", () => row.status),
    Match.when("size", () => `${row.size} B`),
    Match.orElse(() => ""),
  );

/**
 * One row, with a **stable** ref callback.
 *
 * React only calls a ref callback again when the callback itself changes; an
 * inline callback is re-created on every paint, so the runtime's reconciler can
 * drop the instance it recorded and a later `focusElement` goes nowhere. The
 * callback is keyed by the record, so it re-registers only when the record does.
 */
const FileRow = ({
  row,
  columns,
  selected,
  tabbable,
  elements,
  onPress,
  onKeyDown,
  onToggleSelection,
}: {
  readonly row: FileRow;
  readonly columns: ReturnType<typeof useColumns>["visible"];
  readonly selected: boolean;
  readonly tabbable: boolean;
  readonly elements: { readonly current: Map<string, number> };
  readonly onPress: (event: EventPayload) => void;
  readonly onKeyDown: (event: EventPayload) => void;
  readonly onToggleSelection: () => void;
}) => {
  const theme = useTheme();
  const attach = useCallback(
    (instance: PublicInstance | null) => {
      if (instance === null) elements.current.delete(row.id);
      else elements.current.set(row.id, instance.id);
    },
    [elements, row.id],
  );
  return (
    <TableRow
      testId={`files-row-${row.id}`}
      selected={selected}
      tabIndex={tabbable ? 0 : -1}
      instanceRef={attach}
      onClick={onPress}
      onKeyDown={onKeyDown}
    >
      <TableSelectionCell
        checked={selected}
        onCheckedChange={onToggleSelection}
        label={`Select ${row.name}`}
        testId={`files-select-${row.id}`}
      />
      {Arr.map(columns, (column) => (
        <TableCell
          key={column.id}
          width={column.width}
          align={column.id === "size" ? "right" : "left"}
          testId={`files-cell-${row.id}-${column.id}`}
        >
          <text
            style={{
              ...textStyle(theme, column.id === "name" ? "body" : "caption"),
              color:
                column.id === "name"
                  ? theme.colors.foreground
                  : theme.colors.mutedForeground,
            }}
          >
            {cellText(row, column.id)}
          </text>
        </TableCell>
      ))}
    </TableRow>
  );
};

/** A files table with a filter, column configuration, sorting and selection. */
export const TableExample = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const columns = useColumns({ columns: FILE_COLUMNS });
  const table = useTable({
    rows: files,
    keyOf: (row) => row.id,
    columns: FILE_COLUMNS,
    // The search field reads the painted tracks: hiding a column takes its
    // text out of the query as well as out of the header and the cells.
    hiddenColumns: columns.hidden,
  });
  const elements = useRef(new Map<string, number>());

  const focus = (key: string) => {
    const id = elements.current.get(key);
    if (id !== undefined) renderer?.focusElement?.(id);
  };

  const walk = (key: string, delta: number) => {
    const next = neighbourKey(table.keys, Option.some(key), delta);
    Option.match(next, {
      onNone: () => {},
      onSome: (target) => table.press(target),
    });
  };

  const onRowKeyDown = (key: string) => (event: EventPayload) => {
    // The grid's one tab stop is a row, so the keys a stop implies act on the
    // row the reader is standing on. A focusable `div` has no activation of its
    // own — only the pointer path runs `onClick` — so without this the row a
    // reader Tabs into is the one record the keyboard cannot choose.
    if (event.key === "enter" || event.key === "space")
      table.press(key, event.modifiers);
    else if (event.key === "down") walk(key, 1);
    else if (event.key === "up") walk(key, -1);
  };

  // Focus follows the committed tab stop. `renderer.focusElement` refuses an
  // element outside the tab order, so focusing the new row in the key handler
  // (before `tabIndex` reaches it) moved nothing.
  useLayoutEffect(() => {
    Option.match(table.activeKey, {
      onNone: () => {},
      onSome: focus,
    });
  }, [table.activeKey]);

  const nameWidth = Option.getOrElse(columns.widthOf("name"), () => 0);

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
          width={220}
          testId="files-filter"
        />
        <ColumnMenu
          state={columns.state}
          onChange={columns.apply}
          onReset={columns.reset}
          testId="files-columns"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={selectionSize(table.selection) === 0}
          onActivate={table.clear}
          testId="files-clear"
        >
          Clear
        </Button>
      </div>
      <text
        testId="files-readout"
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`${table.rows.length} rows · ${selectionSize(table.selection)} selected · cols=${Arr.join(
          Arr.map(columns.visible, (column) => column.id),
          ",",
        )} · w=${nameWidth} · content=${columns.contentWidth} · ${Option.match(
          table.sort,
          {
            onNone: () => "unsorted",
            onSome: (sort) => `${sort.field}-${sort.direction}`,
          },
        )}`}
      </text>

      <Table height={320} aria-label="Files" testId="files-table">
        <TableViewport>
          <TableHeader>
            <TableRow>
              <TableSelectionHeader
                checked={table.allSelected}
                indeterminate={table.someSelected}
                onCheckedChange={table.setAllSelected}
                disabled={table.rows.length === 0}
                testId="files-select-all"
              />
              {Arr.map(columns.visible, (column) => {
                const resize = {
                  minWidth: column.minWidth,
                  maxWidth: column.maxWidth,
                  onResize: (width: number) => columns.resize(column.id, width),
                  label: `Resize the ${column.label.toLowerCase()} column`,
                  testId: `files-divider-${column.id}`,
                };
                return Match.value(column.id).pipe(
                  Match.when("name", () => (
                    <TableSortHeader
                      key={column.id}
                      field="name"
                      label={column.label}
                      sort={table.sort}
                      onSort={(next) => table.setSort(Option.some(next))}
                      width={column.width}
                      resize={resize}
                      testId="files-name"
                    />
                  )),
                  Match.when("status", () => (
                    <TableHeaderCell
                      key={column.id}
                      width={column.width}
                      testId="files-status"
                    >
                      <text
                        style={{
                          ...textStyle(theme, "caption"),
                          color: theme.colors.mutedForeground,
                        }}
                      >
                        {column.label}
                      </text>
                      <TableColumnDivider width={column.width} {...resize} />
                    </TableHeaderCell>
                  )),
                  Match.when("size", () => (
                    <TableSortHeader
                      key={column.id}
                      field="size"
                      label={column.label}
                      sort={table.sort}
                      onSort={(next) => table.setSort(Option.some(next))}
                      align="right"
                      width={column.width}
                      resize={resize}
                      initialDirection="desc"
                      testId="files-size"
                    />
                  )),
                  Match.orElse(() => (
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
                  )),
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody testId="files-body">
            {table.rows.length === 0 ? (
              <TableEmpty>
                <text
                  style={{
                    ...textStyle(theme, "body"),
                    color: theme.colors.foreground,
                  }}
                >
                  No file matches that filter.
                </text>
                <text
                  style={{
                    ...textStyle(theme, "caption"),
                    color: theme.colors.mutedForeground,
                  }}
                >
                  Clear the field to see all {files.length} files.
                </text>
              </TableEmpty>
            ) : (
              Arr.map(table.rows, (row) => (
                <FileRow
                  key={row.id}
                  row={row}
                  columns={columns.visible}
                  selected={table.isSelected(row.id)}
                  tabbable={Option.contains(table.tabStop, row.id)}
                  elements={elements}
                  onPress={(event) => table.press(row.id, event.modifiers)}
                  onKeyDown={onRowKeyDown(row.id)}
                  onToggleSelection={() => table.toggleSelection(row.id)}
                />
              ))
            )}
          </TableBody>
        </TableViewport>
        <TableCaption>
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            {`Sorted ${Option.match(table.sort, { onNone: () => "by source order", onSome: (sort) => `by ${sort.field} ${sort.direction}` })}`}
          </text>
        </TableCaption>
      </Table>
    </div>
  );
};

/** The fixture's names, for a suite that needs the source order. */
export const fileNames: ReadonlyArray<string> = Arr.map(
  files,
  (row) => row.name,
);
