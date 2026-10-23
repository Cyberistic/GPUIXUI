/**
 * A sortable header cell.
 *
 * The whole cell is the control: the primitives' `Button` gives it the
 * runtime's activation contract (Enter on key-down, Space on key-up, a press,
 * a disabled refusal), which is the "same `Pressable` contract" the
 * `table-select-sort` probe exercises. Pressing the cell sorts by its field;
 * pressing the sorted field flips the direction.
 *
 * A **Shift press** adds the column to the order instead of replacing it. The
 * header reports the press (`onSortPress`) so the controller can compose an
 * order; a consumer that owns only one sort keeps the `onSort` callback and
 * gets the single entry the press cycle produces.
 *
 * The direction travels in two channels because 0.11.0 has neither `aria-sort`
 * nor a sort announcement: an arrow glyph for a sighted reader — carrying the
 * field's place in a multi-column order — and an accessible name that says the
 * state ("Name, sorted descending, sort 1 of 2") for a reader who only hears
 * the control.
 */

import type { EventModifiers } from "@gpuix/react";
import * as Option from "effect/Option";
import { Button } from "@gpuixui/primitives/button";
import {
  TableColumnDivider,
  type TableColumnResizeProps,
} from "../columns/divider.js";
import { textStyle } from "../theme.js";
import type { CellAlign } from "../table/table.js";
import { TableHeaderCell } from "../table/table.js";
import { useTheme } from "../theme.js";
import {
  sortOrderGlyph,
  sortOrderLabel,
  toggleSort,
  type SortDirection,
  type SortOrder,
  type SortState,
} from "./logic.js";

/** The props every sortable header takes. */
interface TableSortHeaderShape {
  /** The field this column sorts by. */
  readonly field: string;
  /** The column's visible label, and the base of its accessible name. */
  readonly label: string;
  /**
   * The table's current sort: the primary field.
   *
   * A consumer holding an order passes it as `order` as well; this prop still
   * names the field the single-sort callback reports.
   */
  readonly sort: Option.Option<SortState>;
  /**
   * The whole order, primary first, when the table sorts by more than one
   * field. Defaults to `sort` alone.
   */
  readonly order?: SortOrder;
  /** The direction a first press starts at. Defaults to `asc`. */
  readonly initialDirection?: SortDirection;
  /** A fixed track width, in pixels. */
  readonly width?: number;
  /** Defaults to `left`. */
  readonly align?: CellAlign;
  /**
   * Makes the column resizable. A divider needs a fixed track, so this is
   * ignored when `width` is omitted.
   */
  readonly resize?: TableColumnResizeProps;
  readonly testId?: string;
}

/**
 * The press a header reports, in one of two shapes.
 *
 * `onSort` is the single-column contract: it receives the next entry the press
 * cycle produces. `onSortPress` receives the raw press and its modifiers, for
 * a controller that composes an order (a Shift press adds a tie-break).
 */
export type TableSortHeaderProps = TableSortHeaderShape &
  (
    | {
        readonly onSort: (next: SortState) => void;
        readonly onSortPress?: undefined;
      }
    | {
        readonly onSortPress: (
          field: string,
          initialDirection: SortDirection,
          modifiers?: EventModifiers,
        ) => void;
        readonly onSort?: undefined;
      }
  );

/** The glyph a column paints for its single-column state. */
export const sortGlyph = (
  sort: Option.Option<SortState>,
  field: string,
): string => sortOrderGlyph(Option.toArray(sort), field);

/** A header cell that sorts its column when activated. */
export const TableSortHeader = (props: TableSortHeaderProps) => {
  const {
    field,
    label,
    sort,
    order: orderProp,
    initialDirection = "asc",
    width,
    align = "left",
    resize,
    testId,
  } = props;
  const theme = useTheme();
  const order = orderProp ?? Option.toArray(sort);
  const glyph = sortOrderGlyph(order, field);
  return (
    <TableHeaderCell width={width} align={align} testId={testId}>
      <Button
        variant="ghost"
        size="sm"
        fullWidth
        label={sortOrderLabel(label, order, field)}
        testId={testId === undefined ? undefined : `${testId}-sort`}
        onActivate={(event) => {
          if (props.onSortPress !== undefined) {
            props.onSortPress(field, initialDirection, event.modifiers);
            return;
          }
          props.onSort(toggleSort(sort, field, initialDirection));
        }}
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
      {width === undefined || resize === undefined ? null : (
        <TableColumnDivider width={width} {...resize} />
      )}
    </TableHeaderCell>
  );
};
