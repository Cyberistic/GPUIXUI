/**
 * The row that opens a panel under itself.
 *
 * `@gpuix/native@0.11.0` has no row span and no sticky position, so a detail
 * panel cannot be a cell inside the row: the row is a horizontal box whose
 * height is its content, and a panel needs the table's **content width** plus
 * room to grow. The composition is therefore two rows — the row and a
 * {@link TableDetailRow} sibling under it — which is also what the runtime
 * measured: a painted row that grows re-measures on the next frame, the rows
 * below shift by the growth, and the measured height is remembered across the
 * window round trip (`virtual-list-expand`).
 *
 * Two measured rules are load-bearing:
 *
 * - **the row is the toggle.** A painted child is where GPUI's hit test stops
 *   (`press-routing-lifecycle`), and a chevron is an `<svg>` whose
 *   `pointerEvents: "none"` leaves the press to its row; a grid that also
 *   chooses rows puts a painted control (a checkbox) in a cell, which then takes
 *   its own press instead of opening the row.
 * - **the body must be sized for the open row.** `<virtual-list>` in
 *   `itemCount` mode positions rows from a fixed estimate, so an expanding row
 *   belongs in the plain table or the list's children mode; a fixed-height
 *   window would misplace every row below it (`virtual-list-expand`).
 *
 * ```tsx
 * <TableHeader>
 *   <TableRow>
 *     <TableHeaderCell width={32} />
 *     <TableHeaderCell>Name</TableHeaderCell>
 *   </TableRow>
 * </TableHeader>
 * <TableBody>
 *   <TableExpandableRow
 *     expanded={open}
 *     onToggle={() => setOpen(!open)}
 *     cells={<TableCell>readme.md</TableCell>}
 *     detail={<PropertyPanel rows={rows} />}
 *   />
 * </TableBody>
 * ```
 */

import { Icon } from "@gpuixui/icons";
import { cn } from "@gpuixui/tw";
import { mergeStyles } from "@gpuix/react/floating";
import type { Props } from "@gpuix/react";
import type { ReactNode } from "react";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";
import { TABLE_DETAIL_CELL, TABLE_DETAIL_ROW } from "./recipe.js";
import { TableCell, TableRow, type TableRowProps } from "./table.js";

/** The expander track's width when the caller names none. */
export const DEFAULT_EXPANDER_WIDTH = 32;

/** {@link TableDetailRow} props. */
export interface TableDetailRowProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

/**
 * The panel row an expanded row opens: one cell that fills the content width.
 *
 * It paints the `muted` strip, so a detail panel reads as a container rather
 * than a second row, and it carries no press handler of its own: a press on the
 * panel does not close the row it belongs to.
 */
export const TableDetailRow = ({
  className,
  children,
  testId,
  style,
  ...rest
}: TableDetailRowProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      testId={testId}
      role="row"
      style={mergeStyles(
        recipeStyle(cn(TABLE_DETAIL_ROW, className), theme),
        style,
      )}
    >
      <div
        role="cell"
        testId={testId === undefined ? undefined : `${testId}-cell`}
        style={{
          ...recipeStyle(TABLE_DETAIL_CELL, theme),
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 0,
          minWidth: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** {@link TableExpandableRow} props. */
export interface TableExpandableRowProps extends Omit<
  TableRowProps,
  "children" | "onClick"
> {
  /** The panel under the row paints. */
  readonly expanded?: boolean;
  /** Presses the row: the caller flips `expanded`. */
  readonly onToggle?: () => void;
  /** The row's cells, after the expander track. */
  readonly cells: ReactNode;
  /** The panel painted under the row while it is open. */
  readonly detail: ReactNode;
  /** The expander track's width, in pixels. Defaults to `32`. */
  readonly toggleWidth?: number;
  /** The panel's test id; the row keeps the one `TableRow` gives it. */
  readonly detailTestId?: string;
}

/**
 * A row that opens a detail row under itself.
 *
 * The press is the row's: a reader presses anywhere on the row and the panel
 * under it appears. The chevron is decoration — an `<svg>` that takes no hit
 * test — so the press always reaches the row, and the detail row is a **sibling**
 * rather than a spanning cell, which is how a table without row spans opens a
 * panel as wide as its content.
 */
export const TableExpandableRow = ({
  expanded,
  onToggle,
  cells,
  detail,
  toggleWidth = DEFAULT_EXPANDER_WIDTH,
  detailTestId,
  disabled,
  className,
  style,
  ...rest
}: TableExpandableRowProps) => {
  const theme = useTheme();
  const open = expanded === true;
  return (
    <>
      <TableRow
        {...rest}
        disabled={disabled}
        aria-expanded={open}
        className={className}
        style={style}
        onClick={onToggle}
      >
        <TableCell
          width={toggleWidth}
          align="center"
          style={{ paddingLeft: 0, paddingRight: 0 }}
        >
          <Icon
            name={open ? "chevron-down" : "chevron-right"}
            size="sm"
            color={theme.colors.mutedForeground}
          />
        </TableCell>
        {cells}
      </TableRow>
      {open ? (
        <TableDetailRow testId={detailTestId}>{detail}</TableDetailRow>
      ) : undefined}
    </>
  );
};
