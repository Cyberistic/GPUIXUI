# 610 — Tier 3 data presentation: the `@gpuixui/data` package

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | D — data and workspace |
| Owner | the `data` workstream |
| Depends on | `@gpuixui/components`, `@gpuixui/primitives`, `@gpuixui/tw`, `@gpuixui/tokens`, `@gpuixui/motion` |
| Evidence | `table-filter-lifecycle`, `data-grid-fixed-header`, `multi-pane-editor` (playground) |

Twenty of the fifty-two remaining component rows are data presentation. They do
not belong in `packages/components`: a data grid is a composition with its own
state (sort, selection, filters, column sizes, virtualization), and folding it
into the component package would make every consumer pay for it. This plan opens
`packages/data` (`@gpuixui/data`).

## 1. What the runtime forces

- **No `position: sticky`.** A fixed header is a sibling outside the row
  scroller, and both share one horizontal scroller. Measured by
  `data-grid-fixed-header`.
- **No `transform`.** Column resize and row reorder move `left`/`width`, not a
  transform (upstream #102).
- **No canvas drawing.** A chart is stacked `<svg>`, one per colour (issue #82);
  a pixel surface is `<img>` only.
- **One text session per window.** An editable cell is a field, not a DOM span.

## 2. Phases

### Phase 1 — table core

`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`, `TableCaption`.
Fixed header as the measured sibling rule; one horizontal scroller; empty state;
loading skeleton; density-aware row height.

### Phase 2 — sorting, selection, filtering

`useTableSort`, `useTableSelection`, `useTableFilter` as pure reducers over an
immutable row array (Effect-friendly, framework-free), then the components:
sortable header buttons, a selection column with shift-range, a filter field that
narrows painted rows and clears a hidden selection. Proven against
`table-filter-lifecycle`.

### Phase 3 — column configuration and resizing

Column visibility, order, pinned left/right, and drag-resize with min/max. The
divider arms pointer capture on `onMouseDown` + `onMouseMove` only (the measured
rule).

### Phase 4 — virtualization

`useVirtualRows` computing the visible window from `scrollOffset` and row height;
`VirtualList` and `VirtualTable` reading it. Only the window mounts.

### Phase 5 — trees and expansion

`TreeView` (nested rows, roving focus, type-ahead), `useExpandedRows`, and
expandable table rows reusing the virtualization window.

### Phase 6 — charts

`BarChart`, `LineChart`, `DonutChart`, `Sparkline`, `StackedBar` as stacked
`<svg>` primitives: one tint per `<svg>`, one `aria-label` per series, a
`Legend` part. No canvas.

### Phase 7 — data surfaces

`KeyValue`, `StatCard`, `PropertyPanel`, `DataToolbar`, `AdvancedFilter`
(query builder as a typed predicate tree).

## 3. Package shape

```
packages/data/src/
  table/        Table + header/body/row/cell
  sort/         the reducer and the header button
  selection/    the reducer, the range rule, the column
  filter/       the predicate tree and the field
  columns/      visibility, order, pinning, resize
  virtual/      the window hook, list and table
  tree/         TreeView, expanded rows, roving focus
  chart/        the SVG primitives
  surfaces/     KeyValue, StatCard, PropertyPanel, DataToolbar
```

No React state outside hooks; the reducers are pure and exported so a consumer
can drive the grid from Effect or from their own store.

## 4. Rules

- A component ships with code, a test that can fail, a docs page, an example and
  a `COMPONENTS.md` row.
- Anything the runtime cannot express is documented at the call site with the
  upstream issue number, and the fallback is measured — not asserted.
- Virtualization and selection are proven on a 1,000-row fixture in the real
  renderer, with a negative control (unmounting the window must fail the count).

## 5. Acceptance

- The twenty data rows in `COMPONENTS.md` move from `todo` to `done` (or `?`
  with a measured limitation).
- `/docs/data-display` links every component and states the runtime rules.
- A live playground probe mounts the table at 1,000 rows and measures the
  painted window.
