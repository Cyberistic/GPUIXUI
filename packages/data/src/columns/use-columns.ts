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
  restoreColumns,
  setColumnVisible,
  toggleColumn,
  visibleColumns,
  type Column,
  type ColumnDef,
  type ColumnState,
} from "./logic.js";

export interface UseColumnsOptions {
  readonly columns: ReadonlyArray<ColumnDef>;

  readonly stored?: unknown;
}

export interface ColumnController {
  readonly state: ColumnState;

  readonly visible: ReadonlyArray<Column>;

  readonly hidden: ReadonlyArray<string>;

  readonly contentWidth: number;

  readonly widthOf: (id: string) => Option.Option<number>;

  readonly offsetOf: (id: string) => Option.Option<number>;
  readonly isVisible: (id: string) => boolean;

  readonly apply: (next: ColumnState) => void;
  readonly setVisible: (id: string, visible: boolean) => void;
  readonly toggle: (id: string) => void;
  readonly move: (id: string, delta: number) => void;
  readonly resize: (id: string, width: number) => void;
  readonly reset: () => void;
}

export const useColumns = ({
  columns,
  stored,
}: UseColumnsOptions): ColumnController => {
  const [state, setState] = useState<ColumnState>(() =>
    restoreColumns(columns, stored),
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
