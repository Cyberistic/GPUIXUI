/**
 * The checkbox column: a select-all box in the header, one box per row.
 *
 * These are cells, not a column model: the table's columns are the caller's,
 * and a selection box is the same fixed track in the header and every row. The
 * controller supplies the three states — `allSelected` and `someSelected` over
 * the visible order, and `toggleSelection`/`setAllSelected` to write them.
 *
 * The box **paints a fill**, so GPUI's hit test stops there
 * (`press-routing-lifecycle`): pressing a row's box toggles that record and
 * does not also run the row's press. That is load-bearing in a table whose row
 * press replaces the set — a box that let the press through would replace the
 * reader's selection instead of adding to it.
 *
 * 0.11.0 has no `aria-checked`; `Checkbox` announces the state through
 * `aria-valuetext` (`checked`/`unchecked`/`mixed`), which is the supported
 * route, and the box needs its own `label` because a painted `Label` beside it
 * is not associated with the control.
 */

import type { StyleDesc } from "@gpuix/react";
import { Checkbox } from "@gpuixui/primitives";
import { TableCell, TableHeaderCell } from "../table/table.js";
import { useTheme, type Theme } from "../theme.js";

/** The fixed track a selection column takes in the header and every row. */
export const SELECTION_COLUMN_WIDTH = 40;

/**
 * The box's own painted target.
 *
 * It paints the fill it stands in — invisible against the table, and the hit
 * boundary GPUI stops at, so a press on the box runs the box and not the row.
 * The `Checkbox`'s root paints no background (`Checkbox` reserves its paint for
 * the box's inside), so a bare box inside a row is the measured
 * `control-unfilled` case: both the box and the row hear the press.
 *
 * A body box follows its row: a chosen row fills `selected`, so its box does
 * too, or the target would read as a `card` notch inside the selection. Under
 * the pointer the box takes the row's own `accent` wash, for the same reason.
 */
const selectionBox = (
  theme: Theme,
  fill: string,
  interactive: boolean,
): StyleDesc => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: fill,
  ...(interactive ? { hover: { backgroundColor: theme.colors.accent } } : {}),
});

/** {@link TableSelectionHeader} props. */
export interface TableSelectionHeaderProps {
  /** Every visible record is chosen. */
  readonly checked: boolean;
  /** Some visible records are chosen, so the box paints a dash. */
  readonly indeterminate?: boolean;
  /** The box's next state: choose every visible record, or clear the set. */
  readonly onCheckedChange: (selected: boolean) => void;
  /** Defaults to `Select every row`. */
  readonly label?: string;
  /** Defaults to {@link SELECTION_COLUMN_WIDTH}, which the body box must match. */
  readonly width?: number;
  readonly disabled?: boolean;
  /** The box's test id; the header cell is `${testId}-cell` and its target `${testId}-target`. */
  readonly testId?: string;
}

/**
 * The header's select-all box, in a header cell of its own.
 *
 * Pair it with one {@link TableSelectionCell} at the head of every row, and
 * give both the same `width`.
 */
export const TableSelectionHeader = ({
  checked,
  indeterminate = false,
  onCheckedChange,
  label = "Select every row",
  width = SELECTION_COLUMN_WIDTH,
  disabled = false,
  testId,
}: TableSelectionHeaderProps) => {
  const theme = useTheme();
  return (
    <TableHeaderCell
      width={width}
      align="center"
      testId={testId === undefined ? undefined : `${testId}-cell`}
    >
      <div
        testId={testId === undefined ? undefined : `${testId}-target`}
        style={selectionBox(theme, theme.colors.card, false)}
      >
        <Checkbox
          checked={checked}
          indeterminate={indeterminate}
          onCheckedChange={onCheckedChange}
          label={label}
          disabled={disabled}
          size="sm"
          testId={testId}
        />
      </div>
    </TableHeaderCell>
  );
};

/** {@link TableSelectionCell} props. */
export interface TableSelectionCellProps {
  /** This record is chosen. */
  readonly checked: boolean;
  /** The box's next state; a controlled table flips the record's membership. */
  readonly onCheckedChange: (selected: boolean) => void;
  /** The record's accessible name, e.g. `Select file-001.ts`. Required. */
  readonly label: string;
  /** Defaults to {@link SELECTION_COLUMN_WIDTH}, which the header must match. */
  readonly width?: number;
  readonly disabled?: boolean;
  /** The box's test id; the cell is `${testId}-cell` and its target `${testId}-target`. */
  readonly testId?: string;
}

/**
 * One row's selection box.
 *
 * A `label` is required: a row box that reads only "checkbox" is anonymous in
 * the accessibility tree, and the runtime has no `aria-labelledby` to borrow
 * the row's text.
 */
export const TableSelectionCell = ({
  checked,
  onCheckedChange,
  label,
  width = SELECTION_COLUMN_WIDTH,
  disabled = false,
  testId,
}: TableSelectionCellProps) => {
  const theme = useTheme();
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
          checked ? theme.colors.selected : theme.colors.card,
          true,
        )}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={onCheckedChange}
          label={label}
          disabled={disabled}
          size="sm"
          testId={testId}
        />
      </div>
    </TableCell>
  );
};
