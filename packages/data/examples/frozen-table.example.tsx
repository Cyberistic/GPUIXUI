/** @jsxImportSource @gpuix/react */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import {
  FrozenTable,
  TableCell,
  TableHeaderCell,
  TableRow,
} from "../src/index.js";
import { textStyle, useTheme } from "../src/theme.js";

export const FROZEN_TABLE_ROWS = 60;

export const FROZEN_TABLE_WIDTH = 180;

export const FROZEN_TABLE_ROW_HEIGHT = 32;

export const FROZEN_TABLE_CONTENT_WIDTH = 420;

interface FileRow {
  readonly id: string;
  readonly name: string;
  readonly status: "tracked" | "modified" | "untracked";
  readonly size: number;
  readonly owner: string;
}

const STATUSES = ["tracked", "modified", "untracked"] as const;
const OWNERS = ["ada", "grace", "linus"] as const;
const FROZEN_COLUMNS = [
  { id: "status", label: "Status", width: 140 },
  { id: "size", label: "Size", width: 120 },
  { id: "owner", label: "Owner", width: 160 },
] as const;

const files: ReadonlyArray<FileRow> = Arr.map(
  Arr.range(1, FROZEN_TABLE_ROWS),
  (n) => ({
    id: `file-${n}`,
    name: `file-${String(n).padStart(3, "0")}.ts`,
    status: STATUSES[n % STATUSES.length] ?? "tracked",
    size: n * 7,
    owner: OWNERS[n % OWNERS.length] ?? "ada",
  }),
);

export const FrozenTableExample = () => {
  const theme = useTheme();
  const [chosen, setChosen] = useState<Option.Option<string>>(Option.none());
  const selected = (row: FileRow): boolean => Option.contains(chosen, row.id);
  const cellStyle = {
    ...textStyle(theme, "body"),
    color: theme.colors.foreground,
  };

  const rowProps = (row: FileRow) => ({
    selected: selected(row),
    style: { height: FROZEN_TABLE_ROW_HEIGHT },
    onClick: () => setChosen(Option.some(row.id)),
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        width: FROZEN_TABLE_WIDTH + 340,
      }}
    >
      <FrozenTable
        height={320}
        frozenWidth={FROZEN_TABLE_WIDTH}
        contentWidth={FROZEN_TABLE_CONTENT_WIDTH}
        rows={files}
        rowKey={(row) => row.id}
        aria-label="Files, frozen name column"
        testId="frozen-table"
        frozenTestId="frozen-pane"
        bodyTestId="frozen-body"
        viewportTestId="frozen-viewport"
        frozenHeader={
          <TableRow>
            <TableHeaderCell width={FROZEN_TABLE_WIDTH}>
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                Name
              </text>
            </TableHeaderCell>
          </TableRow>
        }
        frozenRow={(row) => (
          <TableRow {...rowProps(row)} testId={`frozen-row-${row.id}`}>
            <TableCell width={FROZEN_TABLE_WIDTH}>
              <text style={cellStyle}>{row.name}</text>
            </TableCell>
          </TableRow>
        )}
        header={
          <TableRow>
            {Arr.map(FROZEN_COLUMNS, (column) => (
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
        }
        row={(row) => (
          <TableRow {...rowProps(row)} testId={`body-row-${row.id}`}>
            <TableCell width={FROZEN_COLUMNS[0].width}>
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: selected(row)
                    ? theme.colors.selectedForeground
                    : theme.colors.mutedForeground,
                }}
              >
                {row.status}
              </text>
            </TableCell>
            <TableCell width={FROZEN_COLUMNS[1].width} align="right">
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: selected(row)
                    ? theme.colors.selectedForeground
                    : theme.colors.mutedForeground,
                }}
              >
                {`${row.size} B`}
              </text>
            </TableCell>
            <TableCell width={FROZEN_COLUMNS[2].width}>
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: selected(row)
                    ? theme.colors.selectedForeground
                    : theme.colors.mutedForeground,
                }}
              >
                {row.owner}
              </text>
            </TableCell>
          </TableRow>
        )}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        <text
          testId="frozen-table-readout"
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          {`${files.length} rows · ${Option.getOrElse(chosen, () => "none")} selected`}
        </text>
      </div>
    </div>
  );
};

export const frozenRowNames: ReadonlyArray<string> = Arr.map(
  files,
  (row) => row.name,
);
