/** @jsxImportSource @gpuix/react */
import type { EventModifiers } from "@gpuix/react";
import * as Option from "effect/Option";
import { Button } from "@gpuixui/primitives/button";
import {
  TableColumnDivider,
  type TableColumnResizeProps,
} from "../columns/divider.js";
import { textStyle, themeColors } from "../theme.js";
import type { CellAlign } from "../table/table.js";
import { TableHeaderCell } from "../table/table.js";
import { useTheme } from "../theme.js";
import {
  columnName,
  sortOrderGlyph,
  sortOrderLabel,
  toggleSort,
  type SortDirection,
  type SortOrder,
  type SortState,
} from "./logic.js";

interface TableSortHeaderShape {
  readonly field: string;

  readonly label: string;

  readonly sort: Option.Option<SortState>;

  readonly order?: SortOrder;

  readonly initialDirection?: SortDirection;

  readonly width?: number;

  readonly align?: CellAlign;

  readonly resize?: TableColumnResizeProps;
  readonly testId?: string;
}

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

export const sortGlyph = (
  sort: Option.Option<SortState>,
  field: string,
): string => sortOrderGlyph(Option.toArray(sort), field);

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
  const colors = themeColors(theme);
  const order = orderProp ?? Option.toArray(sort);
  const glyph = sortOrderGlyph(order, field);

  const name = columnName(label, field);
  return (
    <TableHeaderCell width={width} align={align} testId={testId}>
      <Button
        variant="ghost"
        size="sm"
        fullWidth
        label={sortOrderLabel(label, order, field)}
        style={{ paddingLeft: 0, paddingRight: 0 }}
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
                color: colors.mutedForeground,
              }}
            >
              {glyph}
            </text>
          )
        }
      >
        {name}
      </Button>
      {width === undefined || resize === undefined ? null : (
        <TableColumnDivider width={width} {...resize} />
      )}
    </TableHeaderCell>
  );
};
