# 610 — Tier 3 data presentation: the `@gpuixui/data` package

| Field | Value |
| ----- | ----- |
| Status | in progress — phases 1–3 and 4 landed 2026-10-22 (`packages/data`; `data-table-core` probe 1/1, package suite 63 cases + 24 native behaviour cases) |
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

State comes from **`@tanstack/table-core`** (headless, no DOM in the core): the
table instance owns sorting, filtering, grouping, selection, column visibility,
ordering, pinning and pagination. We own the GPUix renderer — rows, headers and
cells — and the behaviour tests. The one DOM helper in the core is column
resizing; implement that with the pointer rule this repo already measured.

A filter field narrows painted rows and clears a hidden selection. Proven
against `table-filter-lifecycle`.

### Phase 3 — column configuration and resizing

Column visibility, order, pinned left/right, and drag-resize with min/max. The
divider arms pointer capture on `onMouseDown` + `onMouseMove` only (the measured
rule).

### Phase 4 — virtualization

**`@tanstack/virtual-core`** computes the window; we supply the scroll offset and
row measurement from GPUix (the core's own element observers are the only DOM
part). `VirtualList` and `VirtualTable` render the returned range; only the
window mounts.

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

No React state outside hooks. The table, virtual and form state comes from
TanStack's headless cores, so a consumer can drive a grid from Effect or from
their own store. Debounce and throttle use **`@tanstack/pacer`**.

TanStack Charts is **not** used: it is DOM/SVG-renderer first. The five chart
primitives in Phase 6 are stacked `<svg>` on GPUix.

## 4. Rules

- A component ships with code, a test that can fail, a docs page, an example and
  a `COMPONENTS.md` row.
- Anything the runtime cannot express is documented at the call site with the
  upstream issue number, and the fallback is measured — not asserted.
- Virtualization and selection are proven on a 1,000-row fixture in the real
  renderer, with a negative control (unmounting the window must fail the count).

## 4a. Progress

- **Phase 1 (table core) landed**: `packages/data/src/table/` — the parts, the
  measured fixed-header composition (one horizontal scroller, header a sibling
  of the row scroller) and the measured body height (0.11.0 sizes a scroller
  from a definite height; a `flex-1` body inside the horizontal scroller grew to
  8 880px for a 320px table, so the viewport and header report `onLayout`
  heights and the body takes the difference).
- **Phase 2 (sort, selection, filtering) landed**: the pure reducers in
  `sort/`, `selection/`, `filter/`, the `TableSortHeader`, `TableFilterField`
  and the `useTable` controller. The selection release runs during render, and
  the keyboard walk moves native focus after the `tabIndex` commit (a call from
  the key handler moved nothing — the row was still outside the tab order).
- **Phase 3 (columns and resizing) landed**: `columns/logic` (visibility,
  visible-order moves, per-column resize bounds, keyboard steps), `useColumns`,
  `ColumnMenu` (the component package's measured DropdownMenu) and
  `TableColumnDivider` inside the header cell it ends (no spacer track in body
  rows). The example and every row read one column list. Pinned/frozen columns
  remain a separate row: sticky is absent, so freezing is the two-pane
  composition.
- **Phase 2 note**: the painted-child press rule now lives in
  `table.tsx`'s row/cell docs and the two Tier 3 rows, guarded by
  `src/table/press-rule.test.ts` and a blank-cell press case.
- **Phase 4a (virtual list) landed**: `VirtualList` wraps the runtime's
  `<virtual-list>` with both host modes as a discriminated union, a definite
  `height`, a typed `VisibleRange` and a forwarded ref for `scrollToItem`. The
  2 000-row example proves only a window paints and a far row reveals. The
  windowed mode's state (`windowStart`, overdraw, reveal order) stays app-owned
  until phase 4b composes it with the table.
- **Phase 4b (virtual table) landed**: `VirtualTable`/`VirtualTableBody`
  compose the measured fixed header with a `<virtual-list>` in `itemCount` mode.
  **The window follows the runtime's scroll anchor (`getListScrollTop`), not the
  range the runtime reports** — `onVisibleRange` lags the paint by one gesture,
  and a window built from the lagging range paints blank rows (measured: the
  window stayed at rows 0–17 while the paint was at 16–24 and nothing painted).
  The window's arithmetic is **`@tanstack/virtual-core`'s**, driven without a
  DOM; a reveal moves the window to the row's own position in the same render
  and the body scrolls after that commit.
- Evidence: `nub run --filter @gpuixui/data test` (63) and `test:behaviour` (24)
  green on 0.11.0; `nub apps/playground/dist/smoke/run.js --only data-table-core`
  1/1. Phases 5–7 and frozen columns are the open TODO rows.

## 5. Acceptance

- The twenty data rows in `COMPONENTS.md` move from `todo` to `done` (or `?`
  with a measured limitation).
- `/docs/data-display` links every component and states the runtime rules.
- A live playground probe mounts the table at 1,000 rows and measures the
  painted window.
