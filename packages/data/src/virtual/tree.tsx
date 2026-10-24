/** @jsxImportSource @gpuix/react */
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

/** {@link VirtualTree} props. */
export interface VirtualTreeProps<T> extends Omit<
  Props,
  "children" | "onVisibleRange"
> {
  /**
   * The visible rows, in paint order — the full flattened set, not a slice.
   *
   * The list is stored data like every other (`recordsOf`): a workspace that
   * keeps its flattened rows restores them from JSON, so an absent list paints
   * the frame with no rows — before the read, the window's own `rows.length`
   * threw `Cannot read properties of null (reading 'length')` in the first
   * render — and an entry a store dropped names no row.
   */
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
  /**
   * A definite viewport height, in pixels.
   *
   * A height the layout cannot paint reads as **no height**
   * ({@link paintableSize}): the tree takes its bounded column's share and
   * windows against the height it measured, so a computed value cannot leave
   * the window at `0` (`behaviour/paintable-height.test.tsx`). An auto-height
   * or non-flex parent gives it no viewport and it paints no rows.
   */
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
  // The viewport's height, when it paints. A height nothing could be read from
  // is no height, so the caller's layout owns the viewport (`paintableSize`).
  const bound = paintableSize(height);
  const painted = usePaintedHeight(onLayout);
  // The tree's rows are built at the density's step, so a declaration the
  // window cannot divide falls back to it rather than to `NaN`: the two cursor
  // walks below divide by this number, and a `NaN` index reaches no row at all.
  // The step is the primitives' reader, so a theme a store gave back without
  // the density group answers the library's row.
  const rowHeight = windowRowHeight(namedRowHeight, rowHeightOf(theme));
  // The height the list is drawn at: the caller's, or the box this component
  // measured for it. An unbound tree takes its layout's share and windows
  // against the height that box painted; without that measurement the window
  // sees `0` and mounts only the overdraw in a pane that holds far more
  // (`paintable-height`).
  const listHeight = Option.orElse(bound, () => painted.measured);
  // The rows are stored data: a saved flattened list can be absent, and a hole
  // the store wrote inside one names no row (`recordsOf`). Read once, so the
  // window, the cursor walks and the paint read one set.
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
  // `<virtual-list>` paints no surface of its own, so it reports no layout
  // event (measured on 0.11.0). An unbound tree measures the column it fills
  // instead; the list is then drawn at that height.
  return Option.match(bound, {
    onSome: () => list,
    onNone: () => (
      <div onLayout={painted.onLayout} style={paneFill(bound)}>
        {list}
      </div>
    ),
  });
};
