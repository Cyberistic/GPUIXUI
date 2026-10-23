/**
 * The uncontrolled column controller.
 *
 * It holds one {@link ColumnState} — order, visibility and widths — and hands
 * the parts the two reads a table needs (`visible`, `widthOf`) plus the
 * reducers. Every rule lives in `columns/logic`, so a controlled consumer that
 * already owns column state can drive those functions directly.
 *
 * The definitions are read once, at mount, and `reset` restores them. A grid
 * whose columns are a function of live data should keep its own
 * {@link ColumnState} and pass it to the parts; this hook is the convenient
 * path for the usual static set.
 *
 * ```tsx
 * const columns = useColumns({ columns: FILE_COLUMNS });
 * <ColumnMenu state={columns.state} onChange={columns.apply} />
 * ```
 */

import type * as Option from "effect/Option";
import { useMemo, useState } from "react";
import {
  columnOffset,
  columnWidth,
  contentWidth,
  hiddenColumns,
  initialColumns,
  isColumnVisible,
  moveColumn,
  resizeColumn,
  setColumnVisible,
  toggleColumn,
  visibleColumns,
  type Column,
  type ColumnDef,
  type ColumnState,
} from "./logic.js";

/** What {@link useColumns} needs: the column definitions, in paint order. */
export interface UseColumnsOptions {
  readonly columns: ReadonlyArray<ColumnDef>;
}

/** Everything a table's parts read from {@link useColumns}. */
export interface ColumnController {
  /** The configured columns, in paint order. */
  readonly state: ColumnState;
  /** The columns that paint, in order — the one list header and rows share. */
  readonly visible: ReadonlyArray<Column>;
  /**
   * The ids of the columns that do not paint, for the row model's filter.
   *
   * Memoised on the column state, so a grid can pass it to `useTable` without
   * rebuilding the core on an unrelated render.
   */
  readonly hidden: ReadonlyArray<string>;
  /** The sum of the visible tracks, in pixels. */
  readonly contentWidth: number;
  /** A column's width, visible or not. */
  readonly widthOf: (id: string) => Option.Option<number>;
  /** A visible column's left edge inside the content. */
  readonly offsetOf: (id: string) => Option.Option<number>;
  readonly isVisible: (id: string) => boolean;
  /** Store a complete state a menu produced. */
  readonly apply: (next: ColumnState) => void;
  readonly setVisible: (id: string, visible: boolean) => void;
  readonly toggle: (id: string) => void;
  readonly move: (id: string, delta: number) => void;
  readonly resize: (id: string, width: number) => void;
  readonly reset: () => void;
}

/** Hold one table's column order, visibility and widths. */
export const useColumns = ({
  columns,
}: UseColumnsOptions): ColumnController => {
  const [state, setState] = useState<ColumnState>(() =>
    initialColumns(columns),
  );
  const hidden = useMemo(() => hiddenColumns(state), [state]);

  return {
    state,
    visible: visibleColumns(state),
    hidden,
    contentWidth: contentWidth(state),
    widthOf: (id) => columnWidth(state, id),
    offsetOf: (id) => columnOffset(state, id),
    isVisible: (id) => isColumnVisible(state, id),
    apply: setState,
    setVisible: (id, visible) =>
      setState((current) => setColumnVisible(current, id, visible)),
    toggle: (id) => setState((current) => toggleColumn(current, id)),
    move: (id, delta) => setState((current) => moveColumn(current, id, delta)),
    resize: (id, width) =>
      setState((current) => resizeColumn(current, id, width)),
    reset: () => setState(initialColumns(columns)),
  };
};
