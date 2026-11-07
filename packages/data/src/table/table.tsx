/** @jsxImportSource @gpuix/react */
import type { Props, PublicInstance, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  borderWidthOf,
  spaceValue,
  spokenText,
} from "@gpuixui/primitives/core";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import type { ReactNode, Ref } from "react";
import { paintableSize } from "../internal/size.js";
import { recipeStyle } from "../recipe.js";
import {
  dividerOn,
  pointerWash,
  textStyle,
  themeColors,
  useTheme,
} from "../theme.js";
import {
  reportBoth,
  TableFrameProvider,
  useMeasuredBodyHeight,
  useTableFrame,
} from "./frame.js";
import {
  TABLE_BODY,
  TABLE_CAPTION,
  TABLE_CELL,
  TABLE_EMPTY,
  TABLE_HEADER,
  TABLE_HEADER_CELL,
  TABLE_ROOT,
  TABLE_ROW,
  TABLE_ROW_INTERACTIVE,
  TABLE_ROW_SELECTED,
  TABLE_SKELETON_BAR,
  TABLE_VIEWPORT,
} from "./recipe.js";

export type CellAlign = "left" | "center" | "right";

const JUSTIFY: Readonly<Record<CellAlign, string>> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

export interface CellLayoutProps {
  readonly width?: number;

  readonly align?: CellAlign;

  readonly className?: string;
}

const cellLayout = ({ width, align = "left" }: CellLayoutProps): StyleDesc => {
  const track = Option.getOrUndefined(paintableSize(width));
  return {
    ...(track === undefined
      ? { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 }
      : { width: track, flexGrow: 0, flexShrink: 0, flexBasis: track }),
    justifyContent: JUSTIFY[align],
  };
};

export interface TableProps extends Omit<Props, "children"> {
  readonly height?: number;
  readonly className?: string;
  readonly children?: ReactNode;
}

export const Table = ({
  height,
  className,
  children,
  style,
  ...rest
}: TableProps) => {
  const theme = useTheme();
  const bound = Option.getOrUndefined(paintableSize(height));
  return (
    <TableFrameProvider initialHeight={bound}>
      <div
        {...rest}
        role="table"
        style={mergeStyles(
          mergeStyles(
            recipeStyle(cn(TABLE_ROOT, className), theme),
            bound === undefined ? undefined : { height: bound },
          ),
          style,
        )}
      >
        {children}
      </div>
    </TableFrameProvider>
  );
};

export interface TableViewportProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const TableViewport = ({
  className,
  children,
  style,
  onLayout,
  ...rest
}: TableViewportProps) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  const frame = useTableFrame();
  return (
    <div
      {...rest}
      onLayout={(event) =>
        reportBoth(
          event,
          onLayout,
          Option.match(frame, {
            onNone: () => () => {},
            onSome: (measured) => measured.reportViewport,
          }),
        )
      }
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(TABLE_VIEWPORT, className), theme), {
          overflowX: "scroll",
          scrollbarColor: colors.scrollbar,
        }),
        style,
      )}
    >
      {children}
    </div>
  );
};

export interface TableHeaderProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const TableHeader = ({
  className,
  children,
  style,
  onLayout,
  ...rest
}: TableHeaderProps) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  const frame = useTableFrame();
  return (
    <div
      {...rest}
      onLayout={(event) =>
        reportBoth(
          event,
          onLayout,
          Option.match(frame, {
            onNone: () => () => {},
            onSome: (measured) => measured.reportHeader,
          }),
        )
      }
      role="rowgroup"
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(TABLE_HEADER, className), theme), {
          borderBottomWidth: borderWidthOf(theme, "thin"),

          borderColor: dividerOn(theme, colors.card) ?? colors.border,
        }),
        style,
      )}
    >
      {children}
    </div>
  );
};

export interface TableBodyProps extends Omit<Props, "children"> {
  readonly rows?: number;

  readonly height?: number;
  readonly className?: string;
  readonly children?: ReactNode;
}

export const TableBody = ({
  rows = 3,
  height,
  className,
  children,
  style,
  ...rest
}: TableBodyProps) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  const empty = children === undefined || children === null;
  const measured = useMeasuredBodyHeight();
  const definite = Option.orElse(paintableSize(height), () => measured);
  return (
    <div
      {...rest}
      role="rowgroup"
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(TABLE_BODY, className), theme), {
          overflowY: "scroll",
          scrollbarColor: colors.scrollbar,
          ...(Option.isNone(definite)
            ? {}
            : {
                height: definite.value,
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: definite.value,
              }),
        }),
        style,
      )}
    >
      {empty ? <TableSkeleton rows={rows} /> : children}
    </div>
  );
};

export interface TableRowProps extends Omit<Props, "children"> {
  readonly selected?: boolean;

  readonly disabled?: boolean;

  readonly instanceRef?: Ref<PublicInstance>;
  readonly className?: string;
  readonly children?: ReactNode;
}

export const TableRow = ({
  selected,
  disabled,
  instanceRef,
  className,
  children,
  style,
  onClick,
  ...rest
}: TableRowProps) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  const interactive = onClick !== undefined && disabled !== true;
  const recipe =
    selected === true
      ? TABLE_ROW_SELECTED
      : interactive
        ? TABLE_ROW_INTERACTIVE
        : TABLE_ROW;

  const rule = (surface: string | undefined): string | undefined =>
    dividerOn(theme, surface) ?? colors.border;
  const hoverFill = selected === true ? colors.accent : colors.hover;
  const pressFill =
    (selected === true
      ? pointerWash(theme, "active", "accent")
      : pointerWash(theme, "active", "hover")) ?? colors.active;
  return (
    <div
      {...rest}
      ref={instanceRef}
      role="row"
      aria-selected={selected}
      onClick={disabled === true ? undefined : onClick}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(recipe, className), theme), {
          borderBottomWidth: borderWidthOf(theme, "thin"),
          borderColor: rule(selected === true ? colors.selected : colors.card),

          ...(interactive
            ? {
                cursor: "pointer",

                hover:
                  theme.interaction === "appkit"
                    ? {}
                    : {
                        backgroundColor: hoverFill,
                        borderColor: rule(hoverFill),
                      },
                active: {
                  backgroundColor: pressFill,
                  borderColor: rule(pressFill),
                },
              }
            : {}),
        }),
        style,
      )}
    >
      {children}
    </div>
  );
};

export interface TableHeaderCellProps
  extends Omit<Props, "children">, CellLayoutProps {
  readonly children?: ReactNode;
}

export const TableHeaderCell = ({
  width,
  align = "left",
  className,
  children,
  style,
  ...rest
}: TableHeaderCellProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      role="columnheader"
      style={mergeStyles(
        mergeStyles(
          recipeStyle(cn(TABLE_HEADER_CELL, className), theme),
          cellLayout({ width, align }),
        ),
        style,
      )}
    >
      {children}
    </div>
  );
};

export interface TableCellProps
  extends Omit<Props, "children">, CellLayoutProps {
  readonly children?: ReactNode;
}

export const TableCell = ({
  width,
  align = "left",
  className,
  children,
  style,
  ...rest
}: TableCellProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      role="cell"
      style={mergeStyles(
        mergeStyles(
          recipeStyle(cn(TABLE_CELL, className), theme),
          cellLayout({ width, align }),
        ),
        style,
      )}
    >
      {children}
    </div>
  );
};

export interface TableCaptionProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const TableCaption = ({
  className,
  children,
  style,
  ...rest
}: TableCaptionProps) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(TABLE_CAPTION, className), theme),
        style,
      )}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: colors.mutedForeground,
          }}
        >
          {children}
        </text>
      ) : (
        children
      )}
    </div>
  );
};

export interface TableEmptyProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const DEFAULT_EMPTY_MESSAGE = "No rows";

export const emptyMessage = (empty: ReactNode): ReactNode =>
  P.isString(empty)
    ? spokenText(Option.fromNullishOr(empty), DEFAULT_EMPTY_MESSAGE)
    : (empty ?? DEFAULT_EMPTY_MESSAGE);

export const TableEmpty = ({
  className,
  children,
  style,
  ...rest
}: TableEmptyProps) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  return (
    <div
      {...rest}
      role="row"
      style={mergeStyles(recipeStyle(cn(TABLE_EMPTY, className), theme), style)}
    >
      <div
        role="cell"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: spaceValue(theme, "xs"),
        }}
      >
        {typeof children === "string" || typeof children === "number" ? (
          <text
            style={{
              ...textStyle(theme, "body"),
              color: colors.mutedForeground,
            }}
          >
            {children}
          </text>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export interface TableSkeletonProps {
  readonly rows?: number;

  readonly columns?: number;
}

export const SKELETON_TRACK_LIMIT = 20;

const trackCount = (count: number, fallback: number): number =>
  Number.isFinite(count)
    ? Math.min(SKELETON_TRACK_LIMIT, Math.max(1, Math.floor(count)))
    : fallback;

export const TableSkeleton = ({
  rows = 3,
  columns = 3,
}: TableSkeletonProps) => {
  const rowCount = trackCount(rows, 3);
  const columnCount = trackCount(columns, 3);
  return (
    <>
      {Array.from({ length: rowCount }, (_, row) => (
        <TableRow key={`skeleton-${row}`}>
          {Array.from({ length: columnCount }, (_, column) => (
            <TableCell key={`skeleton-${row}-${column}`}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <SkeletonBar />
              </div>
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
};

const SkeletonBar = () => {
  const theme = useTheme();
  return (
    <div
      style={mergeStyles(recipeStyle(TABLE_SKELETON_BAR, theme), {
        width: "60%",
      })}
    />
  );
};
