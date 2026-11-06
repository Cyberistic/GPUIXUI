/** @jsxImportSource @gpuix/react */
import { useGpuix, type Props, type PublicInstance } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { rowHeightOf } from "@gpuixui/primitives/core";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { themeColors, useTheme } from "../theme.js";
import { recordsOf } from "../internal/list.js";
import { paintableSize } from "../internal/size.js";
import { paneFill, usePaintedHeight } from "../internal/painted.js";
import { treeName, type TreeCursor, type TreeRow } from "../tree/logic.js";
import { TreeRowView } from "../tree/row.js";
import { useTree } from "../tree/use-tree.js";
import { VirtualList, type VisibleRange } from "./list.js";
import { useVirtualRows } from "./use-virtual-rows.js";
import { anchorOffset, rowHeightOf as windowRowHeight } from "./window.js";

export interface VirtualTreeProps<T> extends Omit<
  Props,
  "children" | "onVisibleRange"
> {
  readonly rows: ReadonlyArray<TreeRow<T>>;

  readonly labelOf: (node: T) => string;

  readonly cursor?: TreeCursor;

  readonly onCursorChange?: (cursor: TreeCursor) => void;

  readonly defaultCursor?: TreeCursor;

  readonly onActivate?: (row: TreeRow<T>) => void;

  readonly renderRow?: (row: TreeRow<T>) => ReactNode;

  readonly height: number;

  readonly rowHeight?: number;

  readonly overdraw?: number;

  readonly onVisibleRange?: (range: VisibleRange) => void;

  readonly instanceRef?: (instance: PublicInstance | null) => void;
  readonly className?: string;

  readonly testId?: string;
}

export const VirtualTree = <T,>({
  rows: dataRows,
  labelOf,
  cursor,
  onCursorChange,
  defaultCursor,
  onActivate,
  renderRow,
  height,
  rowHeight: namedRowHeight,
  overdraw,
  onVisibleRange,
  onLayout,
  instanceRef,
  className,
  testId,
  style,
  ...rest
}: VirtualTreeProps<T>) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  const renderer = useGpuix().renderer;

  const bound = paintableSize(height);
  const painted = usePaintedHeight(onLayout);

  const rowHeight = windowRowHeight(namedRowHeight, rowHeightOf(theme));

  const listHeight = Option.orElse(bound, () => painted.measured);

  const rows = useMemo(() => recordsOf(dataRows), [dataRows]);
  const window = useVirtualRows({
    count: rows.length,
    rowHeight,
    viewportHeight: Option.getOrElse(listHeight, () => 0),
    overdraw,
  });
  const tree = useTree({
    rows,
    labelOf,
    cursor,
    onCursorChange,
    defaultCursor,
    onActivate,
  });
  const instance = useRef<PublicInstance | null>(null);
  const attach = useCallback(
    (next: PublicInstance | null) => {
      instance.current = next;
      instanceRef?.(next);
    },
    [instanceRef],
  );

  const activeIndex = Option.flatMap(tree.cursor.active, (key) =>
    Arr.findFirstIndex(rows, (row) => row.key === key),
  );

  Option.match(activeIndex, {
    onNone: () => {},
    onSome: (index) => {
      if (!Arr.contains(window.mounted, index)) window.reveal(index);
    },
  });

  useLayoutEffect(() => {
    if (Option.isSome(activeIndex)) return;
    if (rows.length === 0) return;
    const index = Math.min(
      rows.length - 1,
      Math.max(0, Math.floor(window.scrollOffset / rowHeight)),
    );
    const row = rows[index];
    if (row === undefined) return;
    tree.commit(
      { ...tree.cursor, active: Option.some(row.key) },
      { focus: tree.holdsFocus() },
    );
  }, [activeIndex, rows, rowHeight, tree, window.scrollOffset]);

  const handleRange = useCallback(
    (range: VisibleRange) => {
      const anchor = anchorOffset(
        Option.fromNullishOr(
          renderer?.getListScrollTop?.(instance.current?.id ?? -1),
        ),
        rowHeight,
      );
      const offset = Option.getOrElse(anchor, () => range.first * rowHeight);
      window.setScrollOffset(offset);

      Option.match(activeIndex, {
        onNone: () => {},
        onSome: (index) => {
          if (Arr.contains(window.mountedAt(offset), index)) return;
          const anchorRow =
            rows[
              Math.min(
                rows.length - 1,
                Math.max(0, Math.floor(offset / rowHeight)),
              )
            ];
          if (anchorRow === undefined) return;
          tree.commit(
            { ...tree.cursor, active: Option.some(anchorRow.key) },
            { focus: tree.holdsFocus() },
          );
        },
      });
      onVisibleRange?.(range);
    },
    [activeIndex, rows, onVisibleRange, renderer, rowHeight, tree, window],
  );

  useLayoutEffect(() => {
    Option.match(window.scrollTarget, {
      onNone: () => {},
      onSome: (index) => {
        const list = instance.current;
        if (list !== null) renderer?.scrollToItem?.(list.id, index);
        window.consumeScrollTarget();
      },
    });
  }, [window.scrollTarget, window.consumeScrollTarget, renderer]);

  const list = (
    <VirtualList
      {...rest}
      ref={attach}
      role="tree"
      testId={testId}
      height={Option.getOrUndefined(listHeight)}
      itemCount={rows.length}
      estimatedItemHeight={rowHeight}
      windowStart={window.windowStart}
      onVisibleRange={handleRange}
      className={className}
      style={mergeStyles({ scrollbarColor: colors.scrollbar }, style)}
    >
      {Arr.map(window.mounted, (index) => {
        const row = rows[index];
        if (row === undefined) return null;
        return (
          <Fragment key={row.key}>
            <TreeRowView
              row={row}
              active={Option.contains(tree.cursor.active, row.key)}
              tabbable={Option.contains(tree.tabKey, row.key)}
              label={treeName(labelOf(row.node), row.key)}
              renderRow={renderRow}
              height={rowHeight}
              testId={
                testId === undefined ? undefined : `${testId}-row-${row.key}`
              }
              onPress={() => tree.activate(row)}
              onKeyDown={tree.handleKey}
              attach={tree.attach(row.key)}
            />
          </Fragment>
        );
      })}
    </VirtualList>
  );

  return Option.match(bound, {
    onSome: () => list,
    onNone: () => (
      <div onLayout={painted.onLayout} style={paneFill(bound)}>
        {list}
      </div>
    ),
  });
};
