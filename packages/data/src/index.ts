/**
 * `@gpuixui/data` — data presentation rendered by GPUix through React.
 *
 * The package is deliberately not part of `@gpuixui/components`: a data grid is
 * a composition with its own state (sort, selection, filters, column sizes,
 * virtualisation), and folding that into the component package would make every
 * consumer of a badge pay for it.
 *
 * Shape:
 *
 * - `table/` — the parts and the measured fixed-header composition.
 * - `sort/`, `selection/`, `filter/`, `columns/` — pure reducers plus the one
 *   control each needs; they import no React and can drive the grid from
 *   Effect.
 * - `virtual/` — the typed seam over the runtime's `<virtual-list>`.
 * - `use-table`, `use-columns` — the uncontrolled controllers.
 *
 * Read `packages/data/README.md` for the runtime rules (no sticky, no
 * transform, no canvas) and plan 610 for the remaining phases.
 */

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableSkeleton,
  TableViewport,
} from "./table/table.js";
export type {
  CellAlign,
  CellLayoutProps,
  TableBodyProps,
  TableCaptionProps,
  TableCellProps,
  TableEmptyProps,
  TableHeaderCellProps,
  TableHeaderProps,
  TableProps,
  TableRowProps,
  TableSkeletonProps,
  TableViewportProps,
} from "./table/table.js";

export { TableSortHeader, sortGlyph } from "./sort/header.js";
export type { TableSortHeaderProps } from "./sort/header.js";
export { directionOf, sortLabel, sortRows, toggleSort } from "./sort/logic.js";
export type { SortDirection, SortState, SortValue } from "./sort/logic.js";

export {
  clearSelection,
  currentKey,
  emptySelection,
  isSelected,
  moveSelection,
  neighbourKey,
  pressMode,
  pressSelection,
  retainSelection,
  selectAll,
  selectionSize,
} from "./selection/logic.js";
export type {
  PressMode,
  PressModifiers,
  SelectionState,
} from "./selection/logic.js";

export {
  filterRows,
  matchesQuery,
  narrowTable,
  normalizeQuery,
} from "./filter/logic.js";
export type { Narrowed } from "./filter/logic.js";

export { TableFilterField } from "./filter/field.js";
export type { TableFilterFieldProps } from "./filter/field.js";

export { useTable } from "./use-table.js";
export type { TableController, UseTableOptions } from "./use-table.js";

export { ColumnMenu } from "./columns/menu.js";
export type { ColumnMenuProps } from "./columns/menu.js";
export { TableColumnDivider } from "./columns/divider.js";
export type {
  TableColumnDividerProps,
  TableColumnResizeProps,
} from "./columns/divider.js";
export {
  COLUMN_KEY_STEP,
  ColumnResizeKey,
  DEFAULT_MAX_COLUMN_WIDTH,
  DEFAULT_MIN_COLUMN_WIDTH,
  clampColumnWidth,
  clampWidth,
  columnBounds,
  columnOffset,
  columnResizeKeys,
  columnWidth,
  contentWidth,
  findColumn,
  initialColumns,
  isColumnResizeKey,
  isColumnVisible,
  moveColumn,
  resetColumns,
  resizeColumn,
  resizeWidthByKey,
  setColumnVisible,
  toggleColumn,
  visibleColumns,
  widthBounds,
} from "./columns/logic.js";
export type {
  Column,
  ColumnDef,
  ColumnState,
  ColumnWidthBounds,
} from "./columns/logic.js";
export { useColumns } from "./columns/use-columns.js";
export type {
  ColumnController,
  UseColumnsOptions,
} from "./columns/use-columns.js";

export { VirtualList, visibleRange } from "./virtual/list.js";
export type { VirtualListProps, VisibleRange } from "./virtual/list.js";
