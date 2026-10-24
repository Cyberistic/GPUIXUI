/**
 * The table core: a bounded surface whose header stays painted while its rows
 * scroll.
 *
 * `@gpuix/native@0.11.0` paints no `position: "sticky"`, so a fixed header
 * cannot be one element inside the scroller. The composition the
 * `data-grid-fixed-header` probe measured is the one here: **one horizontal
 * scroller** holds a header and a vertical row scroller as siblings, so a
 * sideways pan moves both together and a wheel over the rows moves only the
 * rows (`table-lifecycle` measured a header moved into the row scroller
 * painting at `y = -36`).
 *
 * A cell is a box. Its content is the caller's — a `Text`, a control, a badge —
 * because a data grid has no single typographic role, and forcing one onto the
 * box would make every cell a paragraph.
 *
 * ```tsx
 * <Table height={360} aria-label="Files">
 *   <TableCaption>12 files</TableCaption>
 *   <TableViewport>
 *     <TableHeader>
 *       <TableRow>
 *         <TableHeaderCell width={240}>Name</TableHeaderCell>
 *         <TableHeaderCell>Status</TableHeaderCell>
 *       </TableRow>
 *     </TableHeader>
 *     <TableBody>
 *       <TableRow selected>
 *         <TableCell width={240}>readme.md</TableCell>
 *         <TableCell>Tracked</TableCell>
 *       </TableRow>
 *     </TableBody>
 *   </TableViewport>
 * </Table>
 * ```
 */

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

/** Where a cell's content sits across its track. */
export type CellAlign = "left" | "center" | "right";

const JUSTIFY: Readonly<Record<CellAlign, string>> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

/** The geometry a header cell and a body cell share. */
export interface CellLayoutProps {
  /**
   * A fixed track width, in pixels. Omit it — or pass a number the layout
   * cannot paint — and the cell shares the leftover width with every other
   * flexible cell.
   */
  readonly width?: number;
  /** Defaults to `left`. */
  readonly align?: CellAlign;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/**
 * A cell's track, and where its content sits across it.
 *
 * `justifyContent` is one decision with the track: both cell parts are flex
 * rows, so the alignment belongs here rather than in a class.
 */
const cellLayout = ({ width, align = "left" }: CellLayoutProps): StyleDesc => {
  const track = Option.getOrUndefined(paintableSize(width));
  return {
    ...(track === undefined
      ? { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 }
      : { width: track, flexGrow: 0, flexShrink: 0, flexBasis: track }),
    justifyContent: JUSTIFY[align],
  };
};

/** {@link Table} props. */
export interface TableProps extends Omit<Props, "children"> {
  /**
   * A definite height. The header stays painted and the body becomes a
   * vertical scroller only inside a bounded table; without one the rows lay
   * out at their natural height.
   */
  readonly height?: number;
  readonly className?: string;
  readonly children?: ReactNode;
}

/**
 * The bounded table surface.
 *
 * Set `aria-label` to name the table; a role-less node never reaches the
 * accessibility tree, and `role="table"` is written here so a consumer cannot
 * forget it.
 *
 * A height the layout cannot paint reads as **no height**
 * ({@link paintableSize}), the reading the prop already has when it is
 * omitted: the rows lay out naturally, and a table that measured 320 points
 * paints 280 of body under it.
 */
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

/** {@link TableViewport} props. */
export interface TableViewportProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

/**
 * The one horizontal scroller the header and the rows share.
 *
 * It is a column: the header stays at its natural height and the body takes
 * the rest. A sideways wheel moves this pane, and with it both the header and
 * every row.
 */
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

/** {@link TableHeader} props. */
export interface TableHeaderProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

/** The fixed part: a sibling of the body, never inside its scroller. */
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
          // The header sits on the table's own `card` fill; the rule is the
          // same derivation a row uses, so a brand whose `border` is too close
          // to its card gets a visible line here too.
          borderColor: dividerOn(theme, colors.card) ?? colors.border,
        }),
        style,
      )}
    >
      {children}
    </div>
  );
};

/** {@link TableBody} props. */
export interface TableBodyProps extends Omit<Props, "children"> {
  /** Defaults to `3`. */
  readonly rows?: number;
  /**
   * A definite height, in pixels. Omit it to let the table's measured frame
   * size the scroller (the usual case) or to let the rows lay out naturally
   * outside a height-bounded table.
   */
  readonly height?: number;
  readonly className?: string;
  readonly children?: ReactNode;
}

/**
 * The rows, and the only vertical scroller.
 *
 * `rows` is read only when there are no children: the body then paints the
 * loading placeholder, so a table that has not loaded its first page still
 * holds its frame instead of collapsing to the header.
 *
 * A height the layout cannot paint reads as **no height**
 * ({@link paintableSize}), so the body's measured frame sizes the scroller —
 * the usual case. Measured before the rule: a `NaN` height left the scroller
 * with the flex settings the style wrote beside it and no basis, so it
 * collapsed to the one row it held (**37 points**) instead of the **280** its
 * frame measures, and the rows below the first overflowed a scroller that could
 * not scroll.
 */
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

/** {@link TableRow} props. */
export interface TableRowProps extends Omit<Props, "children"> {
  /** The row is chosen: it paints the selection wash and its label role. */
  readonly selected?: boolean;
  /**
   * The row cannot be chosen or activated.
   *
   * 0.11.0 has no `aria-disabled`, so the state is the row's own: it installs
   * no press handler and answers no pointer. A row whose reason must be read
   * belongs in its cells' text.
   */
  readonly disabled?: boolean;
  /**
   * The row's painted element, for moving native focus to it.
   *
   * The host `ref` prop is not forwarded through a part, so a keyboard walk
   * keeps the instance it needs here and calls `renderer.focusElement(id)`.
   */
  readonly instanceRef?: Ref<PublicInstance>;
  readonly className?: string;
  readonly children?: ReactNode;
}

/**
 * One row.
 *
 * A row with a press handler answers the pointer: the recipe tints `hover` and
 * the press paints `pointerWash(theme, "active", "hover")`, the derived wash the
 * tokens contract measures over the one it replaces. A chosen row answers it a
 * step later (`accent`, then the derived press over that), so the pointer can see
 * the record it is over while the row keeps saying which record is chosen.
 *
 * A press stops at the **first child that paints a fill**, not at the innermost
 * handler (`press-routing-lifecycle`: filled `text` ran none, an unfilled one
 * ran `cell-click,row-click`). A cell's content is unfilled by default, so a
 * press on it reaches this row; a composed control that must hand the press on —
 * a badge, an icon with a background — declares `pointerEvents: "none"`, the
 * same rule the shipped `Badge` and `Keycap` follow.
 *
 * The pointer's hover takes the **same hit test** as its press
 * (`hover-routing-lifecycle`): an unfilled label leaves this row both its
 * `hover` wash and its enter event, while a child that paints a fill takes both
 * and hears its own enter. A decorative child — a status pill, a metric — that
 * should not swallow the row's feedback declares `pointerEvents: "none"`; the
 * child's own listener still runs, because opting out removes the fill's
 * hitbox rather than the handler.
 *
 * A row's `disabled` state is **not announced**: the runtime's `aria-*` set is
 * closed and carries no `aria-disabled` (`docs/gpuix-capabilities.md`), so the
 * row writes none — an attribute the runtime drops reads like a state a reader
 * can hear. What is left is the behaviour: no press handler, no pointer wash.
 * Put the reason in a cell's text when it has to be read.
 */
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
  /**
   * The rule a row paints, derived from the **surface it crosses**.
   *
   * A row is a surface of its own: a chosen row fills `selected`, the pointer
   * tints `accent`, and a press repaints the derived wash. The raw `border`
   * role is under the 1.05:1 floor on 22 of the 90 shipped wash placements, so
   * the rule is `dividerOn`'s — `border` stepped toward `borderStrong` until it
   * clears the wash it crosses, and the authored role where it already does.
   */
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
          // A chosen row answers the pointer too: the selection fill says which
          // record is chosen, and the `accent` wash a step off it says the
          // pointer is on it. The press takes the wash derived over the hover,
          // because a palette's own `active` role can sit under the
          // perceptibility floor beside the `accent` it replaces.
          //
          // An unchosen row is the same rule one step earlier: the recipe tints
          // `hover`, and the press derives over the wash it replaces — the
          // contract's third transition (`active` over `hover`), not the raw
          // role. The rule is re-derived for each fill, because a wash a row
          // moves onto is a surface the divider must clear too.
          ...(interactive
            ? {
                cursor: "pointer",
                hover: {
                  // A style prop's state record replaces the compiled class's,
                  // so the row restates the recipe's own `hover` fill.
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

/** {@link TableHeaderCell} props. */
export interface TableHeaderCellProps
  extends Omit<Props, "children">, CellLayoutProps {
  readonly children?: ReactNode;
}

/** One header cell: a box for a sort control or a `Text`. */
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

/** {@link TableCell} props. */
export interface TableCellProps
  extends Omit<Props, "children">, CellLayoutProps {
  readonly children?: ReactNode;
}

/**
 * One body cell: a box with the same inset as its header.
 *
 * It paints no fill of its own, which is load-bearing: a fill is where GPUI's
 * hit test stops, so a painted cell would swallow the press its row answers
 * (`press-routing-lifecycle`). A caller that needs a filled cell control inside
 * it declares `pointerEvents: "none"` on that control when the row must still
 * hear the press.
 */
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

/** {@link TableCaption} props. */
export interface TableCaptionProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

/**
 * The one line below the frame: a count, a range, or the source of the data.
 *
 * A **string** child is painted as a `<text>` element, because that is the only
 * shape the runtime puts in the accessibility tree: a raw string inside a box
 * paints but produces no node, so a caller's `"12 files"` was silent to a
 * reader. Pass a node (a `<text>` of your own) when the caption needs more than
 * one run. 0.11.0 has no caption role, so the line is a `Label` beside the
 * table's row groups rather than an associated caption — keep the table's own
 * name in `aria-label`.
 */
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

/** {@link TableEmpty} props. */
export interface TableEmptyProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

/** The words a windowed table shows when its set is empty and none are given. */
export const DEFAULT_EMPTY_MESSAGE = "No rows";

/**
 * The words an empty grid paints.
 *
 * `empty` is copy as often as a node — a locale table with a missing row answers
 * `""`, and a saved message can come back blank — while a default written
 * `empty ?? DEFAULT_EMPTY_MESSAGE` only covers an **absent** prop. A blank
 * message therefore painted a nameless empty row: a row and a cell in the
 * accessibility tree with no words under them, which reads as a grid that
 * failed to say why it is empty. A string is read through `spokenText` (the
 * rule every painted caption follows); a node is the caller's own and is left
 * whole.
 */
export const emptyMessage = (empty: ReactNode): ReactNode =>
  P.isString(empty)
    ? spokenText(Option.fromNullishOr(empty), DEFAULT_EMPTY_MESSAGE)
    : (empty ?? DEFAULT_EMPTY_MESSAGE);

/**
 * What a table paints when its set is empty: a message, not a blank frame.
 *
 * It is a **row holding one cell**, so the message sits inside the grid the
 * accessibility tree describes. A `rowgroup` whose only child is a bare `div`
 * is invalid ARIA, and 0.11.0 drops a role-less node from the tree entirely, so
 * the empty state used to be a `RowGroup` with the message's text directly
 * under it. The cell carries the recipe's column layout, so the paint does not
 * move.
 *
 * A **string** child paints as the cell's own `<text>`, the rule
 * {@link TableCaption} follows: a raw string inside a box paints but produces no
 * accessibility node, so `empty="No matches"` would be silent to a reader. Pass
 * a node for anything richer than one run.
 */
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

/** {@link TableSkeleton} props. */
export interface TableSkeletonProps {
  /** Defaults to `3`. */
  readonly rows?: number;
  /** Defaults to `3`. */
  readonly columns?: number;
}

/**
 * The most tracks one side of a skeleton paints.
 *
 * A skeleton holds the shape of a screen while the first page arrives; a count
 * past a screenful is a data set, and mounting it would paint thousands of
 * placeholder bars for a table that shows twenty.
 */
export const SKELETON_TRACK_LIMIT = 20;

/**
 * A skeleton count the renderer can mount.
 *
 * `rows`/`columns` are often computed — a page size read from a config, a
 * viewport divided by a row height — and `Array.from({ length: Infinity })`
 * throws `RangeError: Invalid array length` while `NaN` mounts nothing: a
 * loading table either took the renderer down or painted no placeholder at all.
 * A count the skeleton cannot read is its default, and a finite one is a whole
 * number of tracks between one and a screenful.
 */
const trackCount = (count: number, fallback: number): number =>
  Number.isFinite(count)
    ? Math.min(SKELETON_TRACK_LIMIT, Math.max(1, Math.floor(count)))
    : fallback;

/**
 * The loading placeholder: `rows` × `columns` bars at the cell inset.
 *
 * It paints inside {@link TableBody} when the body has no children, so a table
 * waiting on its first page holds its shape rather than jumping open when the
 * rows arrive.
 */
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

/** One skeleton bar, in the theme's placeholder role. */
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
