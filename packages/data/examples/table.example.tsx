/**
 * A files table: sort, filter, choose a row, and walk it from the keyboard.
 *
 * This is the whole composition a consumer copies — the parts are presentational
 * and the controller holds the state, so the screen is the wiring:
 *
 * - the header is a sibling of the row scroller inside one horizontal scroller,
 *   which is how 0.11.0 gets a fixed header without `position: "sticky"`;
 * - a `TableSortHeader` reports the next `SortState`, and the controller sorts;
 * - a row press reports the record and the runtime's modifier flags, so a plain
 *   press replaces, Cmd/Ctrl toggles and Shift extends;
 * - ArrowUp/ArrowDown move the chosen row **and** native focus, because a
 *   selection the keyboard moved but focus did not is a row the next key does
 *   not reach;
 * - the filter field narrows the set, and the controller releases a chosen
 *   record the narrower set hides.
 *
 * The example holds 60 rows so the window suite can measure a scrolling body
 * without pretending the table is virtualized: it paints every row it is given.
 */

import { useGpuix } from "@gpuix/react";
import type { EventPayload } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useCallback, useLayoutEffect, useRef } from "react";
import type { PublicInstance } from "@gpuix/react";
import { Button } from "@gpuixui/primitives/button";
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
import type { SortValue } from "../src/sort/logic.js";
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

const textOf = (row: FileRow): string =>
  `${row.name} ${row.status} ${row.size}`;

const valueOf = (row: FileRow, field: string): SortValue =>
  field === "size" ? row.size : row.name;

/** The status column's width, so the table has one fixed and two flexible tracks. */
const STATUS_WIDTH = 110;
const SIZE_WIDTH = 90;

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
  selected,
  tabbable,
  elements,
  onPress,
  onKeyDown,
}: {
  readonly row: FileRow;
  readonly selected: boolean;
  readonly tabbable: boolean;
  readonly elements: { readonly current: Map<string, number> };
  readonly onPress: (event: EventPayload) => void;
  readonly onKeyDown: (event: EventPayload) => void;
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
      <TableCell>
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {row.name}
        </text>
      </TableCell>
      <TableCell width={STATUS_WIDTH}>
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          {row.status}
        </text>
      </TableCell>
      <TableCell width={SIZE_WIDTH} align="right">
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          {`${row.size} B`}
        </text>
      </TableCell>
    </TableRow>
  );
};

/** A files table with a filter, sortable columns and a keyboard-walked selection. */
export const TableExample = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const table = useTable({
    rows: files,
    keyOf: (row) => row.id,
    textOf,
    valueOf,
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
    if (event.key === "down") walk(key, 1);
    if (event.key === "up") walk(key, -1);
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
          width={260}
          testId="files-filter"
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
        <text
          testId="files-readout"
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          {`${table.rows.length} rows · ${selectionSize(table.selection)} selected · ${Option.match(table.sort, { onNone: () => "unsorted", onSome: (sort) => `${sort.field}-${sort.direction}` })}`}
        </text>
      </div>

      <Table height={320} aria-label="Files" testId="files-table">
        <TableViewport>
          <TableHeader>
            <TableRow>
              <TableSortHeader
                field="name"
                label="Name"
                sort={table.sort}
                onSort={(next) => table.setSort(Option.some(next))}
                testId="files-name"
              />
              <TableHeaderCell width={STATUS_WIDTH}>
                <text
                  style={{
                    ...textStyle(theme, "caption"),
                    color: theme.colors.mutedForeground,
                  }}
                >
                  Status
                </text>
              </TableHeaderCell>
              <TableSortHeader
                field="size"
                label="Size"
                sort={table.sort}
                onSort={(next) => table.setSort(Option.some(next))}
                align="right"
                width={SIZE_WIDTH}
                initialDirection="desc"
                testId="files-size"
              />
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
                  selected={table.isSelected(row.id)}
                  tabbable={Option.contains(table.activeKey, row.id)}
                  elements={elements}
                  onPress={(event) => table.press(row.id, event.modifiers)}
                  onKeyDown={onRowKeyDown(row.id)}
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
