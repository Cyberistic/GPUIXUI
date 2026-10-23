/**
 * The virtualized table body, and the table that composes it with a fixed
 * header.
 *
 * `@gpuix/native@0.11.0` has no table element: a table is a column of `div`
 * rows, and a virtualized one is that column inside a `<virtual-list>`. The
 * runtime's `itemCount` mode retains only the slice the app renders, so the
 * window is app state — {@link useVirtualRows} holds it and the runtime is given
 * `windowStart` (`virtual-list-windowed`).
 *
 * Three measured rules are load-bearing here:
 *
 * - the body's height is the **measured** difference between the viewport and
 *   the header, because a `flex-1` body inside the horizontal scroller grew to
 *   its content (`table-lifecycle`);
 * - the window is computed from the runtime's **scroll anchor**, not from the
 *   range it reports: `onVisibleRange` lags the paint by one gesture, and a
 *   window built from the lagging range paints blank rows;
 * - a reveal moves the window **before** the scroll, so the target row exists
 *   before `scrollToItem` asks for it.
 *
 * A row must paint exactly `rowHeight`: the window's positions come from the
 * estimate, and a taller row would push the rows below it without moving the
 * window's arithmetic. Rows of varying height use `VirtualList` in children
 * mode instead.
 *
 * ```tsx
 * <VirtualTable
 *   height={360}
 *   count={rows.length}
 *   rowHeight={36}
 *   header={<TableRow><TableHeaderCell>Name</TableHeaderCell></TableRow>}
 *   row={(index) => (
 *     <TableRow><TableCell>{rows[index]?.name}</TableCell></TableRow>
 *   )}
 * />
 * ```
 */

import { useGpuix, type Props, type PublicInstance } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type Ref,
} from "react";
import {
  DEFAULT_EMPTY_MESSAGE,
  Table,
  TableBody,
  TableCaption,
  TableEmpty,
  TableHeader,
  TableViewport,
} from "../table/table.js";
import { useMeasuredBodyHeight } from "../table/frame.js";
import { VirtualList, type VisibleRange } from "./list.js";
import {
  useVirtualRows,
  type VirtualReveal,
  type VirtualRowsController,
} from "./use-virtual-rows.js";
import { anchorOffset, rowCount } from "./window.js";

/** {@link VirtualTableBody} props. */
export interface VirtualTableBodyProps extends Omit<
  Props,
  "children" | "onVisibleRange"
> {
  /** The logical row count — the table's whole data set, not the slice. */
  readonly count: number;
  /** The painted height of one row, in pixels. */
  readonly rowHeight: number;
  /** Paint one absolute row index. Must return a row of exactly `rowHeight`. */
  readonly renderRow: (index: number) => ReactNode;
  /**
   * A definite body height. Omit it inside a bounded {@link Table}: the body
   * takes the measured difference between the viewport and the header.
   */
  readonly height?: number;
  /** Rows mounted beyond the viewport on each side. Defaults to `4`. */
  readonly overdraw?: number;
  /** A row to reveal: the window moves, then the body scrolls to it. */
  readonly reveal?: VirtualReveal;
  /** The runtime's lagging range report, for a readout or pagination. */
  readonly onVisibleRange?: (range: VisibleRange) => void;
  /** The list's instance, for a consumer that scrolls it itself. */
  readonly instanceRef?: Ref<PublicInstance>;
  readonly testId?: string;
}

/** The windowed row scroller: only the mounted window is retained. */
export const VirtualTableBody = ({
  count,
  rowHeight,
  renderRow,
  height,
  overdraw,
  reveal,
  onVisibleRange,
  instanceRef,
  testId,
  style,
  ...rest
}: VirtualTableBodyProps) => {
  const renderer = useGpuix().renderer;
  const measured = useMeasuredBodyHeight();
  const definite = height ?? Option.getOrUndefined(measured);
  // The count the window can hold, so the runtime list, the window and the
  // reveal arithmetic are given one number (`rowCount`).
  const total = rowCount(count);
  const rows = useVirtualRows({
    count: total,
    rowHeight,
    viewportHeight: definite ?? 0,
    overdraw,
    reveal,
  });
  const instance = useRef<PublicInstance | null>(null);
  const attach = useCallback(
    (next: PublicInstance | null) => {
      instance.current = next;
      if (typeof instanceRef === "function") instanceRef(next);
      else if (instanceRef !== undefined && instanceRef !== null)
        instanceRef.current = next;
    },
    [instanceRef],
  );

  // The runtime's range lags the paint by one gesture, so the window follows
  // the scroll **anchor** — the row at the viewport's top edge — which the
  // runtime reports exactly (`virtual-list-windowed`).
  const handleRange = useCallback(
    (range: VisibleRange) => {
      const anchor = anchorOffset(
        Option.fromNullishOr(
          renderer?.getListScrollTop?.(instance.current?.id ?? -1),
        ),
        rowHeight,
      );
      rows.setScrollOffset(
        Option.getOrElse(anchor, () => range.first * rowHeight),
      );
      onVisibleRange?.(range);
    },
    [renderer, rowHeight, rows, onVisibleRange],
  );

  // The window is already committed with this paint, so the scroll now names a
  // row the runtime has mounted (`virtual-list-windowed`'s reveal rule).
  useLayoutEffect(() => {
    Option.match(rows.scrollTarget, {
      onNone: () => {},
      onSome: (index) => {
        const list = instance.current;
        if (list !== null) renderer?.scrollToItem?.(list.id, index);
        rows.consumeScrollTarget();
      },
    });
  }, [rows.scrollTarget, rows.consumeScrollTarget, renderer]);

  return (
    <VirtualList
      {...rest}
      ref={attach}
      testId={testId}
      height={definite}
      itemCount={total}
      estimatedItemHeight={rowHeight}
      windowStart={rows.windowStart}
      onVisibleRange={handleRange}
      style={style}
    >
      {Arr.map(rows.mounted, (index) => (
        <Fragment key={index}>{renderRow(index)}</Fragment>
      ))}
    </VirtualList>
  );
};

/** {@link VirtualTable} props. */
export interface VirtualTableProps extends Omit<
  Props,
  "children" | "onVisibleRange"
> {
  /** The logical row count. */
  readonly count: number;
  /** A definite table height, in pixels. */
  readonly height: number;
  /** The painted height of every row, in pixels. */
  readonly rowHeight: number;
  /** The header row's cells. */
  readonly header: ReactNode;
  /** Paint one absolute row index. Must return a row of exactly `rowHeight`. */
  readonly row: (index: number) => ReactNode;
  /**
   * Painted in place of the rows when `count` is `0`.
   *
   * The table wraps it in a `TableEmpty` row, so the message sits inside the
   * grid as a cell rather than directly under the body's row group — the shape
   * the accessibility tree needs. A string paints as its own text element.
   * Defaults to `DEFAULT_EMPTY_MESSAGE` (`No rows`): an empty set is empty,
   * not loading, so the body must not paint its skeleton.
   */
  readonly empty?: ReactNode;
  /**
   * The line below the frame. A string is painted as the caption's own text
   * element; pass a node for anything richer.
   */
  readonly caption?: ReactNode;
  /** Rows mounted beyond the viewport on each side. Defaults to `4`. */
  readonly overdraw?: number;
  /** A row to reveal: the window moves, then the body scrolls to it. */
  readonly reveal?: VirtualReveal;
  readonly onVisibleRange?: (range: VisibleRange) => void;
  readonly className?: string;
}

/**
 * A table over a logical row count, painting one measured window of it.
 *
 * The header is the same measured sibling composition as {@link Table}: it sits
 * outside the vertical scroller and inside the one horizontal scroller, so a
 * sideways pan moves both and a wheel over the rows moves only the rows. An
 * empty set paints the caller's `empty` inside a `TableEmpty` row, so the
 * message is a cell of the grid rather than a loose label under its row group.
 */
export const VirtualTable = ({
  count,
  height,
  rowHeight,
  header,
  row,
  empty,
  caption,
  overdraw,
  reveal,
  onVisibleRange,
  className,
  style,
  ...rest
}: VirtualTableProps) => (
  <Table {...rest} height={height} className={className} style={style}>
    <TableViewport>
      <TableHeader>{header}</TableHeader>
      {rowCount(count) === 0 ? (
        <TableBody>
          <TableEmpty>{empty ?? DEFAULT_EMPTY_MESSAGE}</TableEmpty>
        </TableBody>
      ) : (
        <VirtualTableBody
          count={count}
          rowHeight={rowHeight}
          renderRow={row}
          overdraw={overdraw}
          reveal={reveal}
          onVisibleRange={onVisibleRange}
        />
      )}
    </TableViewport>
    {caption === undefined ? undefined : <TableCaption>{caption}</TableCaption>}
  </Table>
);

/** The controller a consumer uses to render the window itself. */
export type { VirtualRowsController };
