/**
 * The windowed tree: a hierarchy flattened to rows, of which only a window is
 * retained and painted.
 *
 * `TreeView` paints every row it is given. That is the right shape for a
 * workspace tree of dozens of rows and the wrong one for a file tree with
 * thousands: the runtime's children-mode `<virtual-list>` keeps every row in the
 * tree and only skips its build and paint (`virtual-list-lifecycle`), so the
 * frame carries the whole set. `VirtualTree` composes the tree's model with the
 * list's **`itemCount`** window (`virtual-list-windowed`): the runtime retains
 * only the slice this component renders, and the app owns `windowStart`.
 *
 * Four measured rules shape the composition:
 *
 * - **the window follows the scroll anchor**, not the range the runtime reports
 *   (`onVisibleRange` lags the paint by one gesture), so scrolling reads
 *   `getListScrollTop` and hands the offset to `@tanstack/virtual-core`;
 * - **a cursor move mounts its row before the focus moves**: the window is moved
 *   to the row's position in the same render, and the shared tree controller
 *   focuses it in the layout effect after that commit;
 * - **a reveal moves the window first**, and only then scrolls — the runtime
 *   cannot build a row outside the window it was given;
 * - **the tab stop is always a mounted row**. A wheel that takes the cursor's
 *   row out of the window moves the cursor to the row at the window's top,
 *   because the runtime unmounts the focused row; the focus follows only when
 *   the tree already held it, so scrolling over an unfocused tree does not steal
 *   focus from the rest of the window.
 *
 * Rows paint exactly `rowHeight`. A tree whose rows vary in height composes
 * `VirtualList` in children mode (`virtual-list-rows`); a fixed-estimate window
 * cannot express a variable row.
 *
 * ```tsx
 * const tree = useExpandedRows({ roots, keyOf, childrenOf, labelOf });
 *
 * <VirtualTree
 *   aria-label="Files"
 *   height={320}
 *   rows={tree.rows}
 *   cursor={tree.cursor}
 *   onCursorChange={tree.setCursor}
 *   labelOf={labelOf}
 *   onActivate={(row) => open(row.node)}
 * />
 * ```
 */

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
} from "react";
import { useTheme } from "../theme.js";
import type { TreeCursor, TreeRow } from "../tree/logic.js";
import { TreeRowView } from "../tree/row.js";
import { useTree } from "../tree/use-tree.js";
import { VirtualList, type VisibleRange } from "./list.js";
import { useVirtualRows } from "./use-virtual-rows.js";
import { anchorOffset, rowHeightOf } from "./window.js";

/** {@link VirtualTree} props. */
export interface VirtualTreeProps<T> extends Omit<
  Props,
  "children" | "onVisibleRange"
> {
  /** The visible rows, in paint order — the full flattened set, not a slice. */
  readonly rows: ReadonlyArray<TreeRow<T>>;
  /** The row's label: its accessible name and what a typed prefix matches. */
  readonly labelOf: (node: T) => string;
  /** The cursor, when the caller holds it. Omit it for an uncontrolled tree. */
  readonly cursor?: TreeCursor;
  /** Reports every cursor the keys, a press or a window move produces. */
  readonly onCursorChange?: (cursor: TreeCursor) => void;
  /** The cursor an uncontrolled tree starts on. Defaults to nothing open. */
  readonly defaultCursor?: TreeCursor;
  /** A press or Enter on a row. */
  readonly onActivate?: (row: TreeRow<T>) => void;
  /** Paint one row's content after its inset and chevron. */
  readonly renderRow?: (row: TreeRow<T>) => ReactNode;
  /** A definite viewport height, in pixels. */
  readonly height: number;
  /**
   * The painted height of every row. Defaults to the density's `rowHeight`; a
   * value the window cannot divide is read as that step (`rowHeightOf`), so the
   * cursor walks and the runtime's estimate still land on rows.
   */
  readonly rowHeight?: number;
  /** Rows mounted beyond the viewport on each side. Defaults to `4`. */
  readonly overdraw?: number;
  /** The runtime's lagging window report, for a readout or pagination. */
  readonly onVisibleRange?: (range: VisibleRange) => void;
  /** The list's instance, for a consumer that scrolls it itself. */
  readonly instanceRef?: (instance: PublicInstance | null) => void;
  readonly className?: string;
  /** The tree's test id. Each row is `${testId}-row-${key}`. */
  readonly testId?: string;
}

/** A tree that retains and paints only the window of rows around the viewport. */
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
  instanceRef,
  className,
  testId,
  style,
  ...rest
}: VirtualTreeProps<T>) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  // The tree's rows are built at the density's step, so a declaration the
  // window cannot divide falls back to it rather than to `NaN`: the two cursor
  // walks below divide by this number, and a `NaN` index reaches no row at all.
  const rowHeight = rowHeightOf(namedRowHeight, theme.density.rowHeight);
  const window = useVirtualRows({
    count: dataRows.length,
    rowHeight,
    viewportHeight: height,
    overdraw,
  });
  const tree = useTree({
    rows: dataRows,
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
    Arr.findFirstIndex(dataRows, (row) => row.key === key),
  );
  // A row outside the mounted window does not exist to focus, and the runtime
  // cannot build a row outside the window it was given. Move the window to it in
  // this render; the focus effect then runs against the committed row.
  Option.match(activeIndex, {
    onNone: () => {},
    onSome: (index) => {
      if (!Arr.contains(window.mounted, index)) window.reveal(index);
    },
  });

  // A cursor the set no longer paints (a collapse closed the branch it stood in)
  // moves to the row at the viewport's top edge — a mounted row, so the tree
  // keeps one live tab stop without jumping the reader's scroll. It is a parent
  // update, so it runs after the commit rather than during the render.
  useLayoutEffect(() => {
    if (Option.isSome(activeIndex)) return;
    if (dataRows.length === 0) return;
    const index = Math.min(
      dataRows.length - 1,
      Math.max(0, Math.floor(window.scrollOffset / rowHeight)),
    );
    const row = dataRows[index];
    if (row === undefined) return;
    tree.commit(
      { ...tree.cursor, active: Option.some(row.key) },
      { focus: tree.holdsFocus() },
    );
  }, [activeIndex, dataRows, rowHeight, tree, window.scrollOffset]);

  const handleRange = useCallback(
    (range: VisibleRange) => {
      // The runtime's range lags the paint by one gesture, so the window follows
      // the scroll **anchor** — the row at the viewport's top edge — which it
      // reports exactly (`virtual-list-windowed`).
      const anchor = anchorOffset(
        Option.fromNullishOr(
          renderer?.getListScrollTop?.(instance.current?.id ?? -1),
        ),
        rowHeight,
      );
      const offset = Option.getOrElse(anchor, () => range.first * rowHeight);
      window.setScrollOffset(offset);
      // The runtime unmounts the row the focus was on when the window moves.
      // Keep the tab stop on a mounted row: the top of the window is the one
      // row the new window is guaranteed to hold.
      Option.match(activeIndex, {
        onNone: () => {},
        onSome: (index) => {
          if (Arr.contains(window.mountedAt(offset), index)) return;
          const anchorRow =
            dataRows[
              Math.min(
                dataRows.length - 1,
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
    [activeIndex, dataRows, onVisibleRange, renderer, rowHeight, tree, window],
  );

  // The window is already committed with this paint, so the scroll now names a
  // row the runtime has mounted (`virtual-list-windowed`'s reveal rule).
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

  return (
    <VirtualList
      {...rest}
      ref={attach}
      role="tree"
      testId={testId}
      height={height}
      itemCount={dataRows.length}
      estimatedItemHeight={rowHeight}
      windowStart={window.windowStart}
      onVisibleRange={handleRange}
      className={className}
      style={mergeStyles({ scrollbarColor: theme.colors.scrollbar }, style)}
    >
      {Arr.map(window.mounted, (index) => {
        const row = dataRows[index];
        if (row === undefined) return null;
        return (
          <Fragment key={row.key}>
            <TreeRowView
              row={row}
              active={Option.contains(tree.cursor.active, row.key)}
              tabbable={Option.contains(tree.tabKey, row.key)}
              label={labelOf(row.node)}
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
};
