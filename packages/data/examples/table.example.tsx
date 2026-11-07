/** @jsxImportSource @gpuix/react */
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import * as Arr from "effect/Array";
import { Match } from "effect";
import * as Option from "effect/Option";
import { useCallback, useLayoutEffect, useRef } from "react";
import { Button } from "@gpuixui/primitives/button";
import { ColumnMenu } from "../src/columns/menu.js";
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
import { columnName } from "../src/sort/logic.js";
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

const cellText = (row: FileRow, id: string): string =>
  Match.value(id).pipe(
    Match.when("name", () => row.name),
    Match.when("status", () => row.status),
    Match.when("size", () => `${row.size} B`),
    Match.orElse(() => ""),
  );

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

export const TableExample = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const columns = useColumns({ columns: FILE_COLUMNS });
  const table = useTable({
    rows: files,
    keyOf: (row) => row.id,
    columns: FILE_COLUMNS,

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
    if (event.key === "enter" || event.key === "space")
      table.press(key, event.modifiers);
    else if (event.key === "down") walk(key, 1);
    else if (event.key === "up") walk(key, -1);
  };

  useLayoutEffect(() => {
    Option.match(table.activeKey, {
      onNone: () => {},
      onSome: focus,
    });
  }, [table.activeKey]);

  const nameWidth = Option.getOrElse(columns.widthOf("name"), () => 0);

  const sortToken = Arr.match(table.sortOrder, {
    onEmpty: () => "unsorted",
    onNonEmpty: (order) =>
      Arr.join(
        Arr.map(order, (entry) => `${entry.field}-${entry.direction}`),
        "+",
      ),
  });

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
        )} · w=${nameWidth} · content=${columns.contentWidth} · ${sortToken}`}
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
                const name = columnName(column.label, column.id);
                const resize = {
                  minWidth: column.minWidth,
                  maxWidth: column.maxWidth,
                  onResize: (width: number) => columns.resize(column.id, width),
                  label: `Resize the ${name.toLowerCase()} column`,
                  testId: `files-divider-${column.id}`,
                };
                return Match.value(column.id).pipe(
                  Match.when("name", () => (
                    <TableSortHeader
                      key={column.id}
                      field="name"
                      label={column.label}
                      sort={table.sort}
                      order={table.sortOrder}
                      onSortPress={table.pressSort}
                      width={column.width}
                      resize={resize}
                      testId="files-name"
                    />
                  )),
                  Match.when("status", () => (
                    <TableSortHeader
                      key={column.id}
                      field="status"
                      label={column.label}
                      sort={table.sort}
                      order={table.sortOrder}
                      onSortPress={table.pressSort}
                      width={column.width}
                      resize={resize}
                      testId="files-status"
                    />
                  )),
                  Match.when("size", () => (
                    <TableSortHeader
                      key={column.id}
                      field="size"
                      label={column.label}
                      sort={table.sort}
                      order={table.sortOrder}
                      onSortPress={table.pressSort}
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
                        {name}
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
            {`Sort: ${sortToken}`}
          </text>
        </TableCaption>
      </Table>
    </div>
  );
};

export const fileNames: ReadonlyArray<string> = Arr.map(
  files,
  (row) => row.name,
);
