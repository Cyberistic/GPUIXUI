/** @jsxImportSource @gpuix/react */
import { useGpuix, type Props, type PublicInstance } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
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
  Table,
  TableBody,
  TableCaption,
  TableEmpty,
  TableHeader,
  TableViewport,
  emptyMessage,
} from "../table/table.js";
import { useMeasuredBodyHeight } from "../table/frame.js";
import { paintableSize } from "../internal/size.js";
import { paneFill } from "../internal/painted.js";
import { VirtualList, type VisibleRange } from "./list.js";
import {
  useVirtualRows,
  type VirtualReveal,
  type VirtualRowsController,
} from "./use-virtual-rows.js";
import { anchorOffset, rowCount, rowHeightOf } from "./window.js";

export interface VirtualTableBodyProps extends Omit<
  Props,
  "children" | "onVisibleRange"
> {
  readonly count: number;

  readonly rowHeight: number;

  readonly renderRow: (index: number) => ReactNode;

  readonly height?: number;

  readonly overdraw?: number;

  readonly reveal?: VirtualReveal;

  readonly onVisibleRange?: (range: VisibleRange) => void;

  readonly instanceRef?: Ref<PublicInstance>;
  readonly testId?: string;
}

export const VirtualTableBody = ({
  count,
  rowHeight: namedRowHeight,
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

  const definite = Option.orElse(paintableSize(height), () => measured);

  const total = rowCount(count);
  const rowHeight = rowHeightOf(namedRowHeight);
  const rows = useVirtualRows({
    count: total,
    rowHeight,
    viewportHeight: Option.getOrElse(definite, () => 0),
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
      height={Option.getOrUndefined(definite)}
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

export interface VirtualTableProps extends Omit<
  Props,
  "children" | "onVisibleRange"
> {
  readonly count: number;

  readonly height: number;

  readonly rowHeight: number;

  readonly header: ReactNode;

  readonly row: (index: number) => ReactNode;

  readonly empty?: ReactNode;

  readonly caption?: ReactNode;

  readonly overdraw?: number;

  readonly reveal?: VirtualReveal;
  readonly onVisibleRange?: (range: VisibleRange) => void;
  readonly className?: string;
}

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
  <Table
    {...rest}
    height={Option.getOrUndefined(paintableSize(height))}
    className={className}
    style={mergeStyles(paneFill(paintableSize(height)), style)}
  >
    <TableViewport>
      <TableHeader>{header}</TableHeader>
      {rowCount(count) === 0 ? (
        <TableBody>
          <TableEmpty>{emptyMessage(empty)}</TableEmpty>
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

export type { VirtualRowsController };
