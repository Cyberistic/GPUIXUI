# 610 — Tier 3 data presentation: the `@gpuixui/data` package

| Field | Value |
| ----- | ----- |
| Status | done — phases 1–7 and 3b landed 2026-10-22/23 (`packages/data`; headless probes `data-table-core`, `data-tree-core`, `data-expandable-rows-core`, `data-charts-core`; package suite 115 cases + 55 native behaviour cases). Frozen columns ship as `FrozenTable` |
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
- **Phase 3b (frozen columns) landed**: `FrozenTable` composes the measured
  two-pane rule — the frozen column's own vertical scroller beside the data
  pane's, mirrored both ways through `onScrollChange` → `renderer.scrollTo`
  with a re-entrancy guard — with the panes' headers taking the taller of their
  two measured heights, the sideways pan the data pane's alone (its own `x` is
  carried into the vertical mirror) and a frozen press choosing the record for
  the whole grid. 6 native behaviour cases mount the shipped example
  (`src/behaviour/frozen-table.test.tsx`), the page is
  `packages/data/docs/frozen-columns.mdx`, and the Tier 3 Tables and
  Column-configuration rows state the composition. Evidence:
  `data-grid-frozen-column`, `frozen-column-lifecycle`.
- **The README ships what it claims**: §Usage's pinned-column paragraph names
  `FrozenTable` (the two-pane mirror, the data-pane-only pan, the whole-grid
  press) instead of calling pinned columns unshipped, and the status table's
  row reads *shipped, window-verified*. `src/readme.test.ts` derives the claim
  from the tree rather than repeating it — the status row, the root export, the
  example registration, the docs page, every probe id in the playground's two
  registries, every component named in a table row against the root exports,
  and every prop the README's own `<FrozenTable>` snippet passes against
  `FrozenTableProps`. Directions measured: restoring the retracted row fails
  two cases, and the citation case failed until the paragraph named the page.
- **Virtualization has a page**: `packages/data/docs/virtualization.mdx`
  documents both `<virtual-list>` modes and the windowed table — the anchor
  rule, the overdraw, the reveal order, the shrink re-clamp, the measured body
  height — with the API tables, the accessibility budget, the limitations and
  the eight suites that hold them. It is mounted by the `data` collection; the
  `/docs/data-display` link is recorded as a docs-site interlock row.
- **The empty state sits inside the grid**: `TableEmpty` wrote no role, so the
  accessibility tree described the body's `rowgroup` with the message's text
  directly under it and no row or cell at all (measured: four nodes). It is a
  `role="row"` holding one `role="cell"` box with the recipe's centred column;
  `src/behaviour/table-empty-a11y.test.tsx` (2 cases) decodes the rendered tree
  and fails with `the tree has no Cell node` when the role-less box returns.
- **Phase 3 (columns and resizing) landed**: `columns/logic` (visibility,
  visible-order moves, per-column resize bounds, keyboard steps), `useColumns`,
  `ColumnMenu` (the component package's measured DropdownMenu) and
  `TableColumnDivider` inside the header cell it ends (no spacer track in body
  rows). The example and every row read one column list. Pinned/frozen columns
  remain a separate row: sticky is absent, so freezing is the two-pane
  composition.
- **Phase 2 note**: the painted-child press rule now lives in
  `table.tsx`'s row/cell docs and the two Tier 3 rows, guarded by
  `src/table/press-rule.test.ts` and a blank-cell press case. The measured
  **hover** boundary sits beside it: the native hover refinement's set is the
  press's own hit test (`hover-routing-lifecycle`), so a decorative child in a
  cell or tree row opts out with `pointerEvents: "none"` while a control that
  answers the pointer keeps its fill. `src/table/hover-rule.test.ts` holds the
  source, the README rule, the tree page and the three Tier 3 rows.
- **Phase 2 revisited — the grid state is `@tanstack/table-core`'s**: the
  sorting, the filtered order and the chosen ids were pure reducers of this
  package's own; they are now row models over one data array.
  `src/grid-core.ts` registers the five features the controller drives
  (`columnFilteringFeature`, `globalFilteringFeature`, `rowSortingFeature`,
  `rowSelectionFeature` and the two row-model slots, with `includesString` and
  `basic` in their registries) and `constructGrid` builds a table from
  **controlled** state — React holds `sorting`, `globalFilter` and
  `rowSelection`, so the core needs no store subscription, no adapter package
  and no DOM. `useTable` takes the caller's column list (one list for the header,
  the rows and the row model) and keeps the rules a window measured: the press
  cycle (`sort/logic`), the chord gesture (`selection/logic`), the render-time
  release of a hidden selection, and the arrow walk. The old `sortRows`,
  `filterRows`/`narrowTable` and `matchesQuery` are removed — `src/grid-core.test.ts`
  holds the order the core derives (numeric, code-unit, stable, trimmed literal
  filter) and the premise retention rests on (the core keeps the chosen id a
  filter hides). `nub run --filter @gpuixui/data test` (116) and
  `test:behaviour` (55) green on 0.11.0.
- **Phase 2's checkbox column landed**: `TableSelectionHeader`/
  `TableSelectionCell` (`selection/column.tsx`) are a fixed
  `SELECTION_COLUMN_WIDTH` track in the header and every row. The controller
  supplies `allSelected`/`someSelected` over the **painted** keys and
  `toggleSelection`/`setAllSelected`; the header is a tri-state
  (`aria-valuetext` `checked`/`unchecked`/`mixed` — 0.11.0 has no
  `aria-checked`). The box's target paints the table's `card` fill, because a
  bare `Checkbox` root paints nothing and the measured `control-unfilled` route
  runs both the box and the row: without the paint the behaviour case measured
  a box press after a row press painting `1 selected` (the row replaced the
  set). `selection/logic.test.ts` holds the three states, the visible-order
  rule and the empty table; three behaviour cases mount the shipped example.
  The page is `docs/table-selection.mdx` and the `Row selection` row names it.
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
- **Phase 5 (trees and expansion) landed**: `packages/data/src/tree/` — the pure
  model (`flattenTree`, `branchKeys`, `expandAll`/`collapseAll`, `expandedPath`/
  `expandTo`, `treeCursorMove`, the type-ahead buffer and `typeAheadRow`), the
  `useExpandedRows` controller and `TreeView`. The measured rules are in the
  paint: a 16px depth inset (`TREE_INDENT`), **one** tab stop whose arrows move
  native focus in a layout effect after the `tabIndex` commit
  (`virtual-tree-lifecycle`), and a chevron that takes no press
  (`press-routing-lifecycle`). `TableExpandableRow`/`TableDetailRow` open a
  **sibling** detail row because 0.11.0 has no row span; `virtual-list-expand`'s
  rule (a painted row grows and the rows below shift) is why an expanding row
  belongs in the plain table or the list's children mode, not a fixed-estimate
  window. 13 unit + 12 behaviour cases, two docs pages and two examples; headless
  `data-tree-core` and `data-expandable-rows-core` are 1/1 on 0.11.0.
- **Virtualized hierarchical data landed (Tier 5)**: `VirtualTree` composes the
  tree model with the `itemCount` window (`packages/data/src/virtual/tree.tsx`),
  and `tree/row` + `tree/use-tree` are the one row paint and keyboard controller
  `TreeView` and `VirtualTree` share. Four measured rules are in the paint: a
  cursor move mounts its row before the focus moves; a reveal moves the window
  before the scroll; the window follows `getListScrollTop`, not the lagging
  `onVisibleRange`; and a mounted tab stop always exists — a wheel or collapse
  that unmounts the cursor's row moves it to the viewport's top row, focusing it
  only when the tree held the focus. 7 native behaviour cases mount the
  40-directory × 99-file example (only a window is retained, `End` reveals the
  last row and focuses it, a caller's reveal re-takes focus after the press, a
  wheel leaves a focused tab stop, `Right` expands in place, a collapse keeps a
  live keyboard stop). Page `docs/virtual-tree.mdx`, example
  `virtual-tree.example.tsx`, and the Tier 5 row is `done`. Directions measured:
  dropping the window reveal fails the `End`/reveal/collapse cases by name.
- **A column move steps over every column it crosses**: `moveColumn` traded places
  with its destination, so a `delta` of 2 put the column past the target while the
  column between them stayed where it was. It now removes the column from the
  visible order, inserts it at the clamped target and writes the visible columns
  back into their slots, so hidden columns keep their places and a step past an
  end clamps at the end. `columns/logic.test.ts` gains the two-place and clamp
  cases (133 unit cases green; the hidden-column case asserts the slot).
- **A clause's Remove paints only where removal changes the tree**: the builder
  offered it in every position while `removeAt` leaves a `not` (one child, never
  empty) and the root alone. `ClauseRow` now takes its position's removability,
  so a clause inside a `not` has no Remove and the group is removed whole; a root
  clause or root `not` is cleared with Clear. `surfaces.test.tsx` gains the case
  (`not` in an `all`, a sibling clause, a root `not`), 72 behaviour cases green.
- Evidence: `nub run --filter @gpuixui/data test` (126) and `test:behaviour` (67)
  green on 0.11.0; `nub apps/playground/dist/smoke/run.js --only data-table-core`
  and `--only data-tree-core` and `--only data-expandable-rows-core` (1/1 each).
  Frozen columns are the open TODO row.
- **Type-ahead is the published seam**: the tree imports
  `typeaheadMatchIndex` from `@gpuixui/components/typeahead` and keeps only the
  position-to-key step; `TreeView` uses the seam's `typedChar`/`useTypeahead`, so
  the window, the repeat rule and the character rule are shared with a list and
  a menu. `src/tree/typeahead.test.ts` refuses a second copy.
- **Phase 6 (charts) landed**: `packages/data/src/chart/` — the geometry
  (`chart/logic.ts`: `niceCeiling`, `axisTicks`, `barMarks`/`groupedBarMarks`/
  `stackedBarMarks`, `linePath`, `donutSegments`, `chartMarkup`, `seriesColour`)
  and the five parts plus `ChartLegend`. **One `<svg>` per series** is the route
  `chart-raster` leaves: an `<svg source>` is one tinted mask, so each series
  carries its geometry in the plot's viewBox and is tinted through `style.color`;
  the axis, labels and legend are text and boxes beside the plot. Colours come
  from `seriesColors(theme)`. A value that is NaN, infinite or negative paints
  nothing; a zero keeps its bar slot and paints no ring segment; a full ring is
  two halves. 10 unit cases hold the geometry and 7 behaviour cases mount the
  shipped example in the real renderer; headless `data-charts-core` is 1/1 on
  0.11.0.
- **Phase 7 (the data surfaces) landed**: `packages/data/src/surfaces/` —
  `KeyValue`, `StatCard`, `PropertyPanel`, `DataToolbar` and `AdvancedFilter`,
  over one object that none of them copies. The advanced filter's state is a
  **predicate tree** (`surfaces/logic.ts`: a predicate, an `all`, an `any`, a
  `not`), not a string: the comparisons are literal, an order reads both sides
  as numbers, and an empty `all` matches everything. The tree is the caller's,
  so a builder, a saved query and a table's filter read one shape. The runtime
  forces the rest: there is no menu host (the pickers are the component
  package's measured `DropdownMenu`), no canvas and no transform, and a label
  column is a measurement rather than a token. 23 unit cases hold the tree and
  5 native behaviour cases mount the shipped example: the label column's fixed
  width and the value column's shared `x`, a width action moving the card's
  reading in the same frame (9600 → 19200), a panel edit reaching the readout,
  the builder's clause narrowing the rows (4 of 4 → 1 of 4), and the toolbar's
  search reporting only after its `@tanstack/pacer` debounce. Five docs pages
  ship in `packages/data/docs/`. Directions measured: dropping the label
  column's width, reporting the search at once, and swapping the sides of a
  `contains` each fail their case. The suite is 85 unit / 29 behaviour green.
  Frozen columns are the open TODO row.
- **A stacked bar's axis reads the stack**: `StackedBar` drew its bars against
  the ceiling of the tallest total and printed its axis from the ceiling of the
  widest single **value** — two series of `60` filled a `200` scale while the
  axis stopped at `100`. `stackedScale(series)` is now the one measure, the
  exported `stackedBarMarks` takes the scale rather than computing its own, and
  `ChartFrame`'s new `scaleOf` hands the axis and the marks one number. The
  example's data agreed by coincidence (widest value 60 → 100, tallest total
  84 → 100), which is why neither suite saw it. Two unit cases and one window
  case hold it; directions measured: the per-series measure fails the three
  cases by name (`expected 100 to be 200`), and dropping `scaleOf` fails the
  window case on the missing `tick-200`. 128 unit / 68 behaviour green.
- **A disabled row stopped claiming an attribute the runtime drops**: `TableRow`
  wrote `aria-disabled`, which the closed `aria-*` set does not carry, so a
  disabled row read as an ordinary row while its press handler was gone. The row
  now states the state as behaviour (no handler, no pointer wash) and says where
  a reason belongs; `src/table/aria.test.ts` sweeps the shipped sources against
  the seven measured attributes, holds the docs and re-reads the capability
  record. Directions measured: restoring the attribute fails the sweep naming
  `table/table.tsx: aria-disabled`. 131 unit / 68 behaviour green.
- **An empty `any` group stopped claiming it kept everything**: `describeTree`
  answered `everything` for both empty combinators, while `matchesTree` keeps
  every row for an empty `all` and **none** for an empty `any` (no alternative
  to satisfy). The sentence a builder shows now reads `nothing` for the empty
  `any`, and the evaluation case beside it proves the rows agree with the words.
  Direction measured: the old sentence fails `reads an empty any group as
  nothing, because that is what it keeps` with `expected 'everything' to be
  'nothing'`. 132 unit / 68 behaviour green.
- **A stack is scaled by the categories it paints**: `stackedScale` took its
  count from the longest series, so a value past the last label — which draws
  nowhere — still raised the axis and shrank every painted bar. It takes the
  painted count now (`StackedBar` hands it `labels.length`, the same count the
  marks use) and falls back to the longest series only when no caller names one.
  Direction measured: ignoring the count fails `reads a stack's axis against the
  totals, not its widest series` with `expected 500 to be 5`. 12 chart cases
  green.

## 5. Acceptance

- The twenty data rows in `COMPONENTS.md` move from `todo` to `done` (or `?`
  with a measured limitation).
- `/docs/data-display` links every component and states the runtime rules.
- A live playground probe mounts the table at 1,000 rows and measures the
  painted window.
