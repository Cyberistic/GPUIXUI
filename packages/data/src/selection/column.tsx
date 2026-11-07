/** @jsxImportSource @gpuix/react */
import type { StyleDesc } from "@gpuix/react";
import { Checkbox } from "@gpuixui/primitives";
import { spokenText } from "@gpuixui/primitives/core";
import * as Option from "effect/Option";
import { TableCell, TableHeaderCell } from "../table/table.js";
import { themeColors, useTheme, type Theme } from "../theme.js";

export const SELECTION_COLUMN_WIDTH = 40;

export const DEFAULT_SELECTION_LABEL = "Select every row";

export const DEFAULT_SELECTION_CELL_LABEL = "Select this row";

const selectionBox = (
  theme: Theme,
  fill: string | undefined,
  interactive: boolean,
): StyleDesc => {
  const colors = themeColors(theme);
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: fill,
    ...(interactive ? { hover: { backgroundColor: colors.accent } } : {}),
  };
};

export interface TableSelectionHeaderProps {
  readonly checked: boolean;

  readonly indeterminate?: boolean;

  readonly onCheckedChange: (selected: boolean) => void;

  readonly label?: string;

  readonly width?: number;
  readonly disabled?: boolean;

  readonly testId?: string;
}

export const TableSelectionHeader = ({
  checked,
  indeterminate = false,
  onCheckedChange,
  label,
  width = SELECTION_COLUMN_WIDTH,
  disabled = false,
  testId,
}: TableSelectionHeaderProps) => {
  const theme = useTheme();
  const colors = themeColors(theme);

  const boxLabel = spokenText(
    Option.fromNullishOr(label),
    DEFAULT_SELECTION_LABEL,
  );
  return (
    <TableHeaderCell
      width={width}
      align="center"
      testId={testId === undefined ? undefined : `${testId}-cell`}
    >
      <div
        testId={testId === undefined ? undefined : `${testId}-target`}
        style={selectionBox(theme, colors.card, false)}
      >
        <Checkbox
          checked={checked}
          indeterminate={indeterminate}
          onCheckedChange={onCheckedChange}
          label={boxLabel}
          disabled={disabled}
          size="sm"
          testId={testId}
        />
      </div>
    </TableHeaderCell>
  );
};

export interface TableSelectionCellProps {
  readonly checked: boolean;

  readonly onCheckedChange: (selected: boolean) => void;

  readonly label: string;

  readonly width?: number;
  readonly disabled?: boolean;

  readonly testId?: string;
}

export const TableSelectionCell = ({
  checked,
  onCheckedChange,
  label,
  width = SELECTION_COLUMN_WIDTH,
  disabled = false,
  testId,
}: TableSelectionCellProps) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  const boxLabel = spokenText(
    Option.fromNullishOr(label),
    DEFAULT_SELECTION_CELL_LABEL,
  );
  return (
    <TableCell
      width={width}
      align="center"
      testId={testId === undefined ? undefined : `${testId}-cell`}
    >
      <div
        testId={testId === undefined ? undefined : `${testId}-target`}
        style={selectionBox(
          theme,
          checked ? colors.selected : colors.card,
          true,
        )}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={onCheckedChange}
          label={boxLabel}
          disabled={disabled}
          size="sm"
          testId={testId}
        />
      </div>
    </TableCell>
  );
};
