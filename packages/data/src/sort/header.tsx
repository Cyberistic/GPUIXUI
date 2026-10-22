/**
 * A sortable header cell.
 *
 * The whole cell is the control: the primitives' `Button` gives it the
 * runtime's activation contract (Enter on key-down, Space on key-up, a press,
 * a disabled refusal), which is the "same `Pressable` contract" the
 * `table-select-sort` probe exercises. Pressing the cell sorts by its field;
 * pressing the sorted field flips the direction.
 *
 * The direction travels in two channels because 0.11.0 has neither `aria-sort`
 * nor a sort announcement: an arrow glyph for a sighted reader and an
 * accessible name that says the state ("Name, sorted descending") for a reader
 * who only hears the control.
 */

import * as Option from "effect/Option";
import { Button } from "@gpuixui/primitives/button";
import { textStyle } from "../theme.js";
import type { CellAlign } from "../table/table.js";
import { TableHeaderCell } from "../table/table.js";
import { useTheme } from "../theme.js";
import {
  sortLabel,
  toggleSort,
  type SortDirection,
  type SortState,
} from "./logic.js";

/** {@link TableSortHeader} props. */
export interface TableSortHeaderProps {
  /** The field this column sorts by. */
  readonly field: string;
  /** The column's visible label, and the base of its accessible name. */
  readonly label: string;
  /** The table's current sort, if any. */
  readonly sort: Option.Option<SortState>;
  /** Receives the next state. A controlled consumer stores it. */
  readonly onSort: (next: SortState) => void;
  /** The direction a first press starts at. Defaults to `asc`. */
  readonly initialDirection?: SortDirection;
  /** A fixed track width, in pixels. */
  readonly width?: number;
  /** Defaults to `left`. */
  readonly align?: CellAlign;
  readonly testId?: string;
}

/** The glyph a column paints for its state. */
export const sortGlyph = (
  sort: Option.Option<SortState>,
  field: string,
): string =>
  Option.match(sort, {
    onNone: () => "",
    onSome: (state) =>
      state.field !== field ? "" : state.direction === "asc" ? "↑" : "↓",
  });

/** A header cell that sorts its column when activated. */
export const TableSortHeader = ({
  field,
  label,
  sort,
  onSort,
  initialDirection = "asc",
  width,
  align = "left",
  testId,
}: TableSortHeaderProps) => {
  const theme = useTheme();
  const glyph = sortGlyph(sort, field);
  return (
    <TableHeaderCell width={width} align={align} testId={testId}>
      <Button
        variant="ghost"
        size="sm"
        fullWidth
        label={sortLabel(label, sort, field)}
        testId={testId === undefined ? undefined : `${testId}-sort`}
        onActivate={() => onSort(toggleSort(sort, field, initialDirection))}
        trailing={
          glyph.length === 0 ? undefined : (
            <text
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.mutedForeground,
              }}
            >
              {glyph}
            </text>
          )
        }
      >
        {label}
      </Button>
    </TableHeaderCell>
  );
};
