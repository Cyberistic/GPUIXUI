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

export {
  DEFAULT_EXPANDER_WIDTH,
  TableDetailRow,
  TableExpandableRow,
} from "./table/expandable.js";
export type {
  TableDetailRowProps,
  TableExpandableRowProps,
} from "./table/expandable.js";

export { FrozenTable } from "./table/frozen.js";
export type { FrozenTableProps } from "./table/frozen.js";

export {
  CHART_AXIS_WIDTH,
  ChartLegend,
  DEFAULT_CHART_HEIGHT,
  DEFAULT_CHART_WIDTH,
  BarChart,
  DonutChart,
  LineChart,
  Sparkline,
  StackedBar,
} from "./chart/chart.js";
export type {
  BarChartProps,
  ChartDatum,
  ChartLegendItem,
  ChartLegendProps,
  ChartProps,
  DonutChartProps,
  LineChartProps,
  SparklineProps,
  StackedBarProps,
} from "./chart/chart.js";

export {
  axisTicks,
  barMarks,
  barSlot,
  chartMarkup,
  chartMaxOf,
  chartScale,
  donutMarks,
  donutSegments,
  drawableValue,
  groupedBarMarks,
  linePath,
  niceCeiling,
  seriesColour,
  seriesMax,
  stackedBarMarks,
} from "./chart/logic.js";
export type {
  BarSlot,
  ChartBox,
  ChartMark,
  ChartSeries,
} from "./chart/logic.js";

export { TableSortHeader, sortGlyph } from "./sort/header.js";
export type { TableSortHeaderProps } from "./sort/header.js";
export { directionOf, sortLabel, toggleSort } from "./sort/logic.js";
export type { SortDirection, SortState, SortValue } from "./sort/logic.js";

export {
  allSelected,
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
  someSelected,
} from "./selection/logic.js";
export type {
  PressMode,
  PressModifiers,
  SelectionState,
} from "./selection/logic.js";
export {
  SELECTION_COLUMN_WIDTH,
  TableSelectionCell,
  TableSelectionHeader,
} from "./selection/column.js";
export type {
  TableSelectionCellProps,
  TableSelectionHeaderProps,
} from "./selection/column.js";

export { TableFilterField } from "./filter/field.js";
export type { TableFilterFieldProps } from "./filter/field.js";

export { constructGrid, gridFeatures } from "./grid-core.js";
export type {
  ConstructGridOptions,
  GridChange,
  GridColumn,
  GridState,
  GridTable,
} from "./grid-core.js";

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

export {
  DEFAULT_OVERDRAW,
  anchorOffset,
  createWindowCalculator,
} from "./virtual/window.js";
export type {
  VirtualWindow,
  WindowCalculator,
  WindowSpec,
} from "./virtual/window.js";

export { useVirtualRows } from "./virtual/use-virtual-rows.js";
export type {
  UseVirtualRowsOptions,
  VirtualReveal,
  VirtualRowsController,
} from "./virtual/use-virtual-rows.js";

export { VirtualTable, VirtualTableBody } from "./virtual/table.js";
export type {
  VirtualTableBodyProps,
  VirtualTableProps,
} from "./virtual/table.js";

export { KeyValue, DEFAULT_LABEL_WIDTH } from "./surfaces/key-value.js";
export type { KeyValueEntry, KeyValueProps } from "./surfaces/key-value.js";

export { StatCard, trendTone } from "./surfaces/stat-card.js";
export type { StatCardProps, StatTrend } from "./surfaces/stat-card.js";

export { PropertyPanel, isEditable } from "./surfaces/property-panel.js";
export type {
  EditablePropertyRow,
  PropertyPanelProps,
  PropertyRow,
  ReadonlyPropertyRow,
} from "./surfaces/property-panel.js";

export { DataToolbar, DEFAULT_SEARCH_DEBOUNCE_MS } from "./surfaces/toolbar.js";
export type { DataToolbarProps, ToolbarSearch } from "./surfaces/toolbar.js";

export {
  AdvancedFilter,
  comparisonLabels,
  groupLabels,
} from "./surfaces/advanced-filter.js";
export type {
  AdvancedFilterField,
  AdvancedFilterProps,
} from "./surfaces/advanced-filter.js";

export {
  appendClause,
  clauseAt,
  clauseCount,
  comparisons,
  describeTree,
  emptyTree,
  filterByTree,
  isAll,
  isAny,
  isNot,
  isPredicate,
  matchesComparison,
  matchesTree,
  removeAt,
  updateAt,
  updatePredicate,
} from "./surfaces/logic.js";
export type {
  AllClause,
  AnyClause,
  Comparison,
  FieldPredicate,
  FilterPath,
  FilterTree,
  NotClause,
} from "./surfaces/logic.js";

export {
  TREE_INDENT,
  TreeKey,
  branchKeys,
  collapseAll,
  cursorRow,
  emptyCursor,
  expandAll,
  expandTo,
  expandedPath,
  findRow,
  flattenTree,
  isExpanded,
  isTreeKey,
  setExpanded,
  toggleExpanded,
  treeCursorMove,
  treeKeys,
  typeAheadRow,
} from "./tree/logic.js";
export type { TreeCursor, TreeRow, TreeSpec } from "./tree/logic.js";

export { TREE_INSET, TreeView } from "./tree/tree-view.js";
export type { TreeViewProps } from "./tree/tree-view.js";

export { useExpandedRows } from "./tree/use-expanded.js";
export type {
  ExpandedRowsController,
  UseExpandedRowsOptions,
} from "./tree/use-expanded.js";
