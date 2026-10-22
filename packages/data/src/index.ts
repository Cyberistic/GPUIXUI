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
 * - `sort/`, `selection/`, `filter/` — pure reducers plus the one control each
 *   needs; they import no React and can drive the grid from Effect.
 * - `use-table` — the uncontrolled controller joining the three.
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
