/** @jsxImportSource @gpuix/react */
import { Icon } from "@gpuixui/icons";
import { cn } from "@gpuixui/tw";
import { mergeStyles } from "@gpuix/react/floating";
import { useGpuix, type Props, type PublicInstance } from "@gpuix/react";
import * as Option from "effect/Option";
import { useCallback, useRef, type ReactNode } from "react";
import { recipeStyle } from "../recipe.js";
import { themeColors, useTheme } from "../theme.js";
import { TABLE_DETAIL_CELL, TABLE_DETAIL_ROW } from "./recipe.js";
import { TableCell, TableRow, type TableRowProps } from "./table.js";

export const DEFAULT_EXPANDER_WIDTH = 32;

export interface TableDetailRowProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

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

export interface TableExpandableRowProps extends Omit<
  TableRowProps,
  "children" | "onClick"
> {
  readonly expanded?: boolean;

  readonly onToggle?: () => void;

  readonly cells: ReactNode;

  readonly detail: ReactNode;

  readonly toggleWidth?: number;

  readonly detailTestId?: string;
}

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
  tabIndex,
  onKeyDown,
  instanceRef,
  ...rest
}: TableExpandableRowProps) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  const renderer = useGpuix().renderer;
  const row = useRef<PublicInstance | null>(null);
  const attach = useCallback(
    (instance: PublicInstance | null) => {
      row.current = instance;
      if (typeof instanceRef === "function") instanceRef(instance);
      else if (instanceRef !== null && instanceRef !== undefined)
        instanceRef.current = instance;
    },
    [instanceRef],
  );
  const open = expanded === true;
  return (
    <>
      <TableRow
        {...rest}
        instanceRef={attach}
        disabled={disabled}
        aria-expanded={open}
        tabIndex={disabled === true ? -1 : (tabIndex ?? 0)}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (disabled === true) return;
          const ours = Option.fromNullishOr(row.current?.id);
          const focused = Option.fromNullishOr(
            renderer?.getFocusedElementId?.(),
          );
          if (!Option.exists(focused, (id) => Option.contains(ours, id)))
            return;
          if (event.key === "enter" || event.key === "space") onToggle?.();
        }}
        className={className}
        style={style}
        onClick={onToggle}
      >
        <TableCell
          width={toggleWidth}
          align="center"
          style={{ paddingLeft: 0, paddingRight: 0 }}
        >
          {}
          {colors.mutedForeground === undefined ? undefined : (
            <Icon
              name={open ? "chevron-down" : "chevron-right"}
              size="sm"
              color={colors.mutedForeground}
            />
          )}
        </TableCell>
        {cells}
      </TableRow>
      {open ? (
        <TableDetailRow testId={detailTestId}>{detail}</TableDetailRow>
      ) : undefined}
    </>
  );
};
