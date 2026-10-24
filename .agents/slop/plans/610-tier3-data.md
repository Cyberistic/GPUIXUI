# 610 — Tier 3 data presentation: the `@gpuixui/data` package

| Field | Value |
| ----- | ----- |
| Status | done — phases 1–7 and 3b landed 2026-10-22/23 (`packages/data`; headless probes `data-table-core`, `data-tree-core`, `data-expandable-rows-core`, `data-charts-core`; package suite 261 unit cases + 188 native behaviour cases on 2026-10-24; live `data-table-lifecycle`, `table-lifecycle`, `table-filter-lifecycle`, `table-columns-lifecycle`, `column-resize-lifecycle`, `frozen-column-lifecycle`, `virtual-table-lifecycle`, `data-tree-lifecycle`, `virtual-tree-lifecycle`, `chart-surface-lifecycle` and `property-panel-lifecycle` green). Frozen columns ship as `FrozenTable` |
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
  the whole grid. 5 native behaviour cases mount the shipped example
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
- **The windowed table's empty state is a row and cell too**: `VirtualTable`
  passed its `empty` node straight into the body's row group, the same
  role-less shape the plain table had lost; the count-0 branch wraps it in
  `TableEmpty`, and the same suite's windowed case holds the message's `Label`
  under a `Cell` whose parent is a `Row` (removing the wrap fails with `the
  tree has no Cell node`).
- **A table row's rule is derived from the fill it crosses**: the raw `border`
  role sat under the 1.05:1 floor on 17 of the 64 shipped wash placements (the
  base themes' `accent` at 1.001:1 and 1.004:1), so `TableRow` asks
  `dividerOn(theme, fill)` for its base rule, its `accent`/`hover` pointer fill
  and its derived press wash; `TableHeader` uses the same function for the card
  it sits on. `table.test.tsx` holds the base, hover and press rules off the
  window (the raw `#2A303B` fails against the derived `#2E3540`), and the page
  is `docs/table-selection.mdx` §The row's rule.
- **A caption string is text the tree can hear**: a raw string inside the
  caption's box paints but the runtime makes no node of it, so the documented
  `<TableCaption>12 files</TableCaption>` was silent; a string or number child
  now paints as the caption's own `<text>`, and `table-caption.test.tsx` holds
  the value under the table (the old `{children}` fails `expected [] to include
  '12 files'`). There is no caption role in 0.11.0, so it is a `Label` beside
  the row groups.
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
  window. 15 unit + 9 behaviour cases, two docs pages and two examples; headless
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
- **A line's points sit over their labels**: `linePath` spaced its points edge
  to edge over the series' own length, while the labels and every bar are
  centred in `width / labels.length` slots, so a line's first and last points
  stood half a slot off and a two-value series against four labels drew across
  the whole plot. It takes the labelled count (defaulting to the series' own),
  drops a value past the last label and centres each point, so the page's own
  rule — a series with more values than labels paints only the labelled
  slots — is true for a line as well as a bar. `src/chart/logic.test.ts` holds
  the ragged series and the dropped tail; directions measured: the old spacing
  fails both with `M0 90L200 80` for `M25 90L75 80`, and
  `src/behaviour/chart.test.tsx` reads the painted `<svg source>` for a
  two-value line under four labels (`M0 50L200 0` for `M25 50L75 0`).
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
- **An axis is scaled by the slots it draws**: the same defect sat in
  `chartScale`, which the grouped bar and the line use — `ChartFrame` passed
  `labels.length` and the function dropped it, so `[3, 6, 999]` under two labels
  painted 0.3px and 0.6px bars under a `1000` ceiling. `chartScale`, `seriesMax`
  and `chartMaxOf` take the count through one `paintedValues` helper now. Two
  directions measured: reverting it fails the new unit case (`expected 1000 to
  be 10`) and both window cases (`99` for the no-bar-past-the-labels bar, and
  the missing `tick-10`). 20 unit / 12 behaviour chart cases green.
- **A series keeps its image while it has a labelled slot**: the frame decided a
  layer from its marks, so a bar chart of zeros (or of negatives, which the
  geometry cannot draw) painted no layer and the tree held no `Image` for the
  series — the legend named it and nothing described it. The layer is decided by
  the labelled slots now; the geometry is unchanged, so the picture still paints
  no bar and the description still says `Q1 0, Q2 -4`. Direction measured:
  restoring the marks test fails `announces a series whose values draw no bar`
  with `expected [] to deeply equal [ … ]`. 7 behaviour cases green.
- **A `not` is followed, not refused**: `removeAt`/`appendAt` returned at the
  `not` node, while `clauseAt`/`updateAt` already read its one child at index
  `0`; a group a `not` negates therefore painted a clause Remove (and, with the
  nested Add rule, its own Add) that changed nothing. Both reducers descend
  through index `0` now, so a negated group is edited like any other; a path
  naming the `not` itself or the clause it holds directly still leaves the tree
  alone, and the builder paints no Add on a `not` and no Remove on its direct
  child. Directions measured: at `HEAD` the new unit case fails `expected 2 to
  be 1` and the window case fails on the clause the Remove should have taken;
  with the descent, 29 unit and 9 behaviour cases green.
- **A Tier 3 row's divider count is the contract's, not the style set it remembered**:
  the `Tables` row said the raw `border` misses "20 of the 80" (the painter's JSDoc
  said 17 of the 64) while `dividerFailures` measures **22 of 90** over eighteen
  styles. `src/table/divider-counts.test.ts` derives the style set, the washes and
  the derived presses from `@gpuixui/tokens`, pins 18/90/22, proves `dividerOn`
  answers every placement, and holds the **specific** `| Tables |` row — found by
  its own prefix — plus `table/table.tsx`, `docs/table-selection.mdx` and the
  behaviour premise to the number while refusing both retracted ones. The tokens
  guard's whole-file search was satisfied by the `Decorative surfaces` row, which
  is why the Tier 3 row needs its own reader. Directions measured: all three cases
  fail on the old text; with it, the package is 19 files / 167 tests.
- **A row's printed case count is the suite's, not the one it shipped with**:
  the Tables row said "7 native behaviour cases mount the example" while
  `table.test.tsx` had grown to **26**, and two path-qualified counts had drifted
  the same way (`frozen-table.test.tsx` printed 6 with 5 shipped,
  `tree/logic.test.ts` printed 13 with 15). `src/inventory.test.ts` derives every
  printed count from the suites the rows name, using the two-space `it(`
  convention the components package's inventory guard already applies; it sweeps
  every row naming `@gpuixui/data`, holds the Tables row's unnamed count by name,
  and reads `docs/virtual-tree.mdx`'s `7 tests`. Directions measured: three cases
  fail on the old text (`7 native behaviour cases`, `(13 cases)`, `(6 cases)`);
  with the rows corrected, 4/4 and the package is 20 files / 171 tests.
- **A table runs the advanced filter's tree**: the builder said a saved query,
  a builder and a table's filter read one shape, but `useTable` narrowed by a
  text query only, so the tree could not reach a grid without the caller copying
  the column lookup. `useTable` takes `filterTree` and narrows the records
  before the query; `fieldValueOf(columns)` is the exported seam that resolves a
  clause's field through the column whose `id` it names (a field no column names
  reads blank, so a saved tree that mentions a removed column narrows instead of
  throwing). Selection retention already covers the tree: a chosen record the
  tree hides is released in that commit and painted again when a wider tree
  keeps it. 5 unit cases (`src/use-table-filter.test.ts`) and 2 native cases
  (`src/behaviour/table-tree-filter.test.tsx`); directions measured: a missing
  field read as its own name fails the seam case, and dropping the narrowing
  fails both window cases (`expected '3 rows · 1 selected' to be '2 rows · 1
  selected'`). README §The data surfaces and `docs/advanced-filter.mdx`
  §Narrowing a table teach it. 176 unit / 106 behaviour green.
- **A field in a tree row keeps its keys**: a key is dispatched along the focus
  path, so a space typed in a field inside `renderRow` reached `TreeView`'s
  handler and toggled the branch the field sat in, while a printable character
  moved the cursor through type-ahead. `useTree` now answers a key only while
  one of its **rows** holds native focus (the rule `TableExpandableRow` already
  followed). `src/behaviour/tree.test.tsx` gains `keeps a key typed in a row's
  field to that field`; direction measured: without the guard the space opens
  the branch at the first assertion. README's key-routing row,
  `docs/tree-view.mdx` §Keyboard and the Tree views row state the rule. 178 unit
  / 107 behaviour green; live `--only data-tree-lifecycle` (1/1) unchanged.
- **A chart's axis is labelled by its step**: every tick was printed with two
  fixed decimals, so a chart of rates or seconds over a `0.005` scale read
  `0, 0, 0, 0, 0.01` — three of the four steps rounded away and the bars had no
  number to read against. `tickLabel(tick, step)` keeps one guard digit past
  the step's magnitude (`0, 0.0013, 0.0025, 0.0037, 0.005`), drops trailing
  zeros for the whole scale (`0, 25, 50, 75, 100`) and falls back to
  exponential notation below the last finite decimal; `ChartFrame` hands it
  `scale / steps`. `axisTicks` now reads a non-finite `ticks` as four (it
  mounted `[ NaN ]`) and caps a finite count at `AXIS_STEP_LIMIT` (20).
  `src/chart/logic.test.ts` (26 cases) holds the formatter and the count;
  `src/behaviour/chart.test.tsx` (14 cases) mounts a three-label `0.005` chart
  and reads the axis out of the renderer. Directions measured: restoring the
  two-decimal label fails the window case by name, and the old `axisTicks`
  fails the unit case with `[ NaN ]`. Docs `docs/charts.mdx` §The numbers, the
  README's chart paragraph and the Tier 3 Charts row; headless
  `--only data-charts-core` (1/1) and live `--only chart-surface-lifecycle`
  (1/1) on 0.11.0.
- **A row height is read once, as a height the window can divide**: `rowHeight`
  is often computed, and a `NaN` reached the estimate, the anchor and the reveal
  at once — the calculator mounted a row per pixel (204 of a thousand), the
  anchor's `index × NaN` clamped the offset to `0`, so the paint stalled at row
  203 and a reveal of row 900 painted the first window. `virtual/window.ts`'s
  `rowHeightOf` (finite above zero, else `DEFAULT_ROW_HEIGHT` = 37, the box the
  shipped row paints) and `rowIndex` are read by `VirtualTable`, `VirtualTree`,
  `VirtualList` and `useVirtualRows`; `behaviour/rowheight.test.tsx` (5 cases)
  and `virtual/window.test.ts` (6) hold them. Directions measured: 204 retained,
  203 for the last row, `194..200` for the reveal, the tree's active row absent.
  Docs `docs/virtualization.mdx`, `docs/virtual-tree.mdx`, the README and the
  two virtualized rows.
- **The charts' paint is window-verified**: the status row said
  *shipped, window-verified* while the five charts had only the offscreen
  behaviour suite and the headless `data-charts-core` scenario. The live
  `chart-surface-lifecycle` mounts the shipped `BarChart`, `LineChart`,
  `StackedBar`, `DonutChart` and `Sparkline` and counts paint out of each
  **plot's own crop**: two series tints in one plot (the route a one-tint mask
  forbids), a stack read from its floor, three ring slices and no layer for the
  zero datum, the sparkline in the caller's colour, and a widened bar repainting
  a point it did not reach before — 40 checks on 0.11.0, ~1.8 s, twice.
  `apps/playground/src/live/chart-surface.ts` owns the data, sizes and points;
  `chart-surface.test.ts` (5 cases) holds the bar/stack samples to
  `groupedBarMarks`/`stackedBarMarks`, each ring sample to the arc radii its own
  path names and its datum's sweep, the view to the shipped parts, and the
  package's status row, Charts row and page to the probe. Direction measured:
  tinting every layer with the first palette slot fails `the bars plot paints
  the second series' tint`; restored, 1/1.
- **A tick label's precision stops at whole numbers**: `tickLabel` added its
  guard digit to `Math.ceil(-Math.log10(step))` unconditionally, so a chart
  whose four-tick step is `100` or more asked `toFixed` for a negative
  precision, which throws `RangeError` — a revenue or byte chart in the
  thousands crashed the renderer on mount instead of printing its axis. The
  precision is floored at zero (`0, 250, 500, 750, 1000`). `chart/logic.test.ts`
  gains the whole-scale case and `behaviour/chart.test.tsx` mounts a
  `4200`/`3800` chart; directions measured: without the floor the unit case
  throws from `tickLabel` and the window case reports the missing `tick-5000`.
  Green: 196 unit / 115 behaviour, `check-types` clean, headless
  `--only data-charts-core` (1/1) and live `--only chart-surface-lifecycle`
  (1/1 on 0.11.0). Docs in `docs/charts.mdx` §The numbers, the README chart
  paragraph and the Charts row.
- **A loading skeleton mounts the count it can lay out**: `TableSkeleton` built
  its tracks with `Array.from({ length: Math.max(1, rows) })`, so a computed
  count either threw (`RangeError: Invalid array length` for an infinity) or
  painted nothing (`NaN`) — in the one state a reader cannot diagnose. A count
  the renderer cannot mount now reads as the shipped `3`, and a finite one is
  bounded to `SKELETON_TRACK_LIMIT` (20) per side, because a skeleton holds a
  screen's shape rather than a data set's. `behaviour/table.test.tsx` mounts
  `Infinity`/`NaN`, `10 000` and `0`/`-4` and counts the tree's `Row`/`Cell`
  nodes; direction measured: the old `Math.max(1, count)` fails on the
  `RangeError`. Green: 196 unit / 116 behaviour. The README and the Tables row
  teach the rule.
- **A toolbar wait the core cannot read is the documented default**:
  `DataToolbar` passed `search.debounceMs` straight into `@tanstack/pacer`,
  which hands it to `setTimeout`; Node reads `NaN` and an infinity as an
  immediate timer (measured: `TimeoutNaNWarning`, duration set to `1`), so a
  delay computed from a setting reported the query in the next tick and the
  debounce existed only on paper. A finite non-negative wait is the caller's,
  `0` still reports every edit at once, and a non-finite or negative one takes
  the documented `150` ms. `behaviour/surfaces.test.tsx` gains two cases (13
  in the file): a `NaN` wait leaves the query unreported 40 ms in and reports it
  afterwards, and the zero wait reports in the same frame. Direction measured:
  with the raw wait restored the first case fails `expected 'logo' to be
  'none'`; with the guard it is 13/13. The toolbar page, the README paragraph
  and the Data toolbars row teach the rule.
- **A cell width the layout cannot paint is no width**: `cellLayout` wrote a
  caller's `width` into `width` and `flexBasis` verbatim, so a computed track —
  a share of a pane, a stored size, a measurement taken before the first layout
  — reached the runtime as `NaN`/an infinity, which the serializer drops, or as
  a negative, which paints nothing usable. The cell then sized to its own
  content: measured in the window, a 62px `Name` heading sat above a 204px body
  cell and the later columns followed the drift. A width that cannot paint now
  reads as **no width**, the meaning it already has when omitted, so the cell
  shares the leftover track and a finite width is still exact.
  `behaviour/table.test.tsx` gains two cases (`29` now): `NaN`/`Infinity`/`-20`
  hold the header, its cell and the next column to one track, and a 160px
  column stays 160px in both rows. Directions measured: with the bare write
  restored the first case fails `expected 204 to be 62`; with the reading it is
  29/29. The README's cell-width paragraph and the Tables row teach the rule.
- **A row count is read once, as whole rows**: `VirtualTable` compared the raw
  `count` to `0` and handed it to the runtime list and `@tanstack/virtual-core`,
  so a computed count that was not a non-negative number — `NaN` from a total
  that had not arrived, a negative from a subtraction — was not `0`, mounted a
  windowed body over no rows and painted a header above a **blank** body: no
  empty message and no skeleton, the one state a reader cannot diagnose. The
  window's own normaliser is public as `virtual/window.ts`'s `rowCount` (finite →
  floored, never negative; anything else → `0`), and `VirtualTable`,
  `VirtualTableBody` and `VirtualList`'s `itemCount` all read it, so the list,
  the window and the empty state cannot disagree about how many rows exist.
  `virtual/window.test.ts` gains the normaliser's own case, and
  `behaviour/virtual-table.test.tsx` gains two: `NaN`/`-3` paint `No rows`, and
  `2.5` paints two rows. Directions measured: with the raw comparison restored
  the empty-state case fails `expected 'Name' to contain 'No rows'`; with the
  normaliser it is 9/9 in the file. The virtualization page, the README
  paragraph and the Virtualized tables row teach the rule.
- **A chart part a page never named has no consumer**: `docs/charts.mdx`
  documented the series charts' shared contract and nothing else, so the page a
  reader opens for `DonutChart`, `Sparkline` and `ChartLegend` never named
  `data`, `size`, `values`, `color` or `items`, and the pre-prune sentence that
  said which types the one table covered was gone with the prose. The page now
  carries one table per shipped part (`BarChart` · `StackedBar` · `LineChart`
  share `ChartProps`; then `DonutChart`, `Sparkline`, `ChartLegend`), including
  the `className` row every other part of the package documents. A route
  without a tint is a colour the theme does not own; a chart part without a
  table is a prop the reader cannot look up. `src/chart/docs.test.ts` (3 cases)
  reads each table against the type in both directions (a declared prop with no
  row, a row no type declares) and holds the six shipped names. Directions
  measured: dropping the `values` row fails `` `Sparkline`: values ``, and
  adding a `pinFirst` row fails `` `ChartLegend`: pinFirst ``. The `Charts` row's
  `docs/charts.mdx` §Accessibility citation pointed at a section the page prune
  removed; it names the page's tables now.
- **A merged table cannot say which box takes the prop**: the same prune left
  `docs/table-selection.mdx`'s one API table describing both selection boxes,
  and the page never named `TableSelectionHeader` or `TableSelectionCell` in its
  API at all — so a reader could not tell that `indeterminate` is the header's
  partial set or that a row box's `label` is required to name the record.
  The page now carries one table per box, with each type's own default for
  `width`/`label`, and `src/selection/docs.test.ts` (3 cases) holds each table
  to its type in both directions plus the header-only prop. Directions measured:
  dropping the `indeterminate` row fails the type case and the header-only case,
  and adding it to the row's table fails the invented-prop case.
- **Two virtualization tables back to back named no part, and the list's tail-follow props were absent**: `docs/virtualization.mdx` printed a `VirtualList` table and a `VirtualTable` table under one unlabelled heading, merged `row`/`renderRow` into one row, and never named `VirtualTableBody` — the export a consumer composes inside its own frame — at all. The list's table also omitted `followTail` and `alignment`, the two props the shipped log viewer reads, so the only docs route to "keep the list at its tail" was a component's source. The page now carries one section per part (`VirtualList`, `VirtualTable`, `VirtualTableBody`) with every shared and mode prop, and `src/virtual/docs.test.ts` (3 cases) holds each table to its type in both directions, resolving the shared props plus both union branches. Directions measured: dropping the `followTail` row fails `` `VirtualList`: followTail ``, and a `probe` field on `VirtualTableProps` fails `` `VirtualTable`: probe ``.
- **A page lists the props its type declares**: `docs/table-sorting.mdx` was the
  only page a consumer reads for `TableSortHeader`, and nothing held its API
  table to the type — it documented ten of eleven props, missing `testId` (the
  handle a behaviour suite and an app locate the header by). The row is added
  and `src/sort/docs.test.ts` measures both directions: every field
  `TableSortHeaderShape` declares plus the two callbacks (`onSort`,
  `onSortPress`) must have a row, and no row may name a prop the header does not
  take. Directions measured: deleting the `testId` row fails
  `expected [ 'testId' ] to deeply equal []`, and a bogus `pinFirst` row fails
  the second case. It is the data half of the remaining package-page interlock;
  `packages/files`, `packages/shell` and `packages/dock` keep theirs.
- **An unbound window takes its pane and reads the height back**: a windowed
  surface has no natural height, so a height the layout cannot paint (omitted,
  or a computed `NaN`) left `useVirtualRows` at `0` and mounted only the
  overdraw — in a 320px pane `VirtualTable` collapsed to its header (0 rows
  against 8) and `VirtualTree` painted 5 rows against 10. `<virtual-list>` paints
  no surface, so it reports no `onLayout` of its own (measured on 0.11.0); the
  table fills its container and keeps reading the viewport frame it already
  measures, and the tree measures the column it fills (`virtual/measured.ts`'s
  `paneFill` + `usePaintedHeight`) and draws the list at that height.
  `behaviour/paintable-height.test.tsx` turns the two `it.todo`s into cases
  holding each surface to the rows it paints at `height={320}`; directions
  measured: restoring the bound-only list height fails the tree case (0 rows),
  and dropping the table's fill fails the table case (0 against 8). The
  virtualization page, the tree page, the README and the two Tier 3/Tier 5 rows
  carry the rule.


- **A column's blank label reads as the id it is stored by**: `ColumnMenu`'s
  visibility row is named by its children and its move row interpolated the
  label bare, so a column restored from a saved configuration without a title —
  or an i18n table missing its row — left the one control that decides
  visibility **unnamed** in the tree while the submenu read `Move ` and
  stopped. Both rows read `columnName` (the header's own reading), so a blank
  (or whitespace) label is the column's `id`. `surface-a11y.test.tsx` gains the
  window case (a blank and a whitespace label, the checkbox and move rows read
  off the tree); direction measured: before the fix the two move rows read
  `Move ` / `Move   ` and no checkbox row carried a name. Docs:
  `docs/column-configuration.mdx`, the README's column-label paragraph and the
  Tier 3 Column configuration row.

- **A row box's blank name reads the documented default**: `TableSelectionCell`
  handed its `label` straight to `Checkbox`, so a record restored without its
  title — `Select ${row.name}` with a blank name, or a saved label of `""` —
  left the per-row box **unnamed**, the one channel a reader has to tell one
  row's box from another, while the header box already read
  `Select every row`. The cell reads the label through `spokenText` and the new
  `DEFAULT_SELECTION_CELL_LABEL` (`Select this row`).
  `surface-a11y.test.tsx` gains `reads a blank row box name as the documented
  default` (a blank and a whitespace name, read off the tree); direction
  measured: before the reading the case fails `expected '' to be 'Select this
  row'`. Docs: `docs/table-selection.mdx`, the README's announce paragraph and
  the Tier 3 Row selection row.

- **A blank divider name reads `Resize column`**: the column divider is a
  focusable `separator` and its `label` is copy, so a locale table's missing row
  or a saved label of `""` left the one control that resizes a column nameless
  while its width stayed announced (measured in the tree: a `Splitter` with no
  label, and one named `"   "`). `DEFAULT_RESIZE_LABEL` is the reading through
  `spokenText`, and a name that says which column is composed from
  `columnName(column.label, column.id)` — the header's and the menu's reading —
  so a column restored without a title is named by its id; the shipped example,
  the page and the README carry that composition, and the example's
  non-sortable header cell reads the same words.
  `behaviour/surface-a11y.test.tsx` gains the empty/whitespace case (direction
  measured: `expected [] to deeply equal [ 'Resize column', 'Resize column' ]`)
  and `columns/docs.test.ts` holds the three copyable snippets to the
  composition (reverting the example fails
  `expected '…' to contain 'columnName(column.label, column.id)'`). Docs:
  `docs/column-configuration.mdx`, the README's divider paragraph and the
  Resizable columns row. 232 unit / 157 behaviour green.

- **Type-ahead reaches a row whose name never arrived**: the row paints and
  announces its key when `labelOf` answers blank (`treeName`) and the pure
  `typeAheadRow` matched on it, but `useTree` handed the typeahead seam the raw
  label — measured, a two-row blank-label tree painted `alpha`/`beta` and typing
  `b` left the cursor on `alpha`. The controller maps
  `treeName(labelOf(node), key)` into the seam now, so the paint, the accessible
  name and the match read one word in both `TreeView` and `VirtualTree`;
  `behaviour/tree.test.tsx` gains the case (direction measured: the focus stayed
  on `blank-tree-row-alpha`). Docs: `docs/tree-view.mdx`, the README's
  type-ahead paragraph and the Tree views row. 232 unit / 158 behaviour green.

- **A chart reads a stored list as a list**: the data surfaces already read a
  slot a store wrote `null` for as absence (`internal/list.ts`), while every
  chart part dereferenced its own list — `BarChart`/`StackedBar`/`LineChart`
  through `Arr.map`/`.length`, `DonutChart` through `data.map`, `ChartLegend`
  through `items.map`, `Sparkline` through `values.length` in the geometry — so
  a saved dashboard configuration or an unloaded query result threw
  `TypeError: object null is not iterable` / `Cannot read properties of null
  (reading 'map')` out of the render and took the surface down. Every part reads
  through `listOf` now, `ChartFrame` hands its normalized series and labels to
  the geometry callback, and a series' own `values` is read the same way (that
  series paints no layer while the rest of the chart paints).
  `src/behaviour/chart-boundary.test.tsx` (7 cases) mounts each part with the
  stored absence; directions measured: all seven fail at `HEAD` on the empty
  render and the named TypeErrors. Green: 246 unit / 172 behaviour,
  `check-types` and `check:tests` clean. Docs: `docs/charts.mdx` §Limitations,
  the README's chart paragraph and the Charts row.

- **An entry inside a chart's saved list is read, not dereferenced**: the
  stored-list read guarded the **slot** (`listOf`), while each part still read
  every entry field by field — `ChartFrame`'s `one.values`, `ChartLegend`'s
  `item.key`/`item.color`, `DonutChart`'s `one.value` — so a saved dashboard
  that wrote a hole in a list (`[null, { … }]`: a series a release dropped, a
  record an older shape saved) threw `Cannot read properties of null (reading
  'values')`, `(reading 'key')` or `(reading 'value')` out of the render and
  took the chart down. A list is stored **twice**; `recordsOf`
  (`internal/list.ts`) keeps only the entries that are records naming
  themselves with a `key`, so a hole or an entry of another kind paints
  nothing while its neighbours paint. `src/behaviour/chart-boundary.test.tsx`
  gains four cases (11 in the file). Directions measured: before the read the
  three holed cases fail at `HEAD` on the empty render, and after it the file
  is 11/11 with `check-types` clean. Docs: `docs/charts.mdx` §Limitations, the
  README's chart paragraph and the Charts inventory row.
- **A category label is read at its slot**: a `labels` list is stored data like
  a series list, and a hole where a name belongs was interpolated into the
  description (`null 6`) while the paint showed a blank slot; filtering it away
  would shift every later value under the wrong label. `textsOf` keeps the slot
  and reads a non-text entry as no words, and `seriesDescription` reads a blank
  or whitespace label as no category, so the datum is announced by its number
  alone. `src/internal/list.test.ts` (3 cases), a `chart/logic.test.ts` case and
  a window case in `src/behaviour/chart-a11y.test.tsx`; directions measured:
  the old description reads `Q1 3, null 6` in the unit case and `Q1 3,  6` in
  the window. 250 unit / 177 behaviour, `check-types` clean.
- **A saved expansion set is read, not iterated raw**: `useExpandedRows` built
  its cursor with `HashSet.fromIterable(initialExpanded)`, so a restored
  workspace whose open-folder field JSON wrote as an object (a `Set` has no JSON
  form), a number or `null` threw `TypeError: … is not iterable` in the first
  render and the tree never painted. `expandedSet` (`tree/logic.ts`) accepts a
  list or a `Set` of text keys and reads anything else as no expansion; three
  unit cases in `tree/logic.test.ts` and a window case in
  `src/behaviour/tree.test.tsx` hold it (direction measured: the mount paints
  nothing before the reader). 253 unit / 178 behaviour, `check-types` clean.
- **A blank empty message reads as `No rows`**: `FrozenTable` and `VirtualTable`
  wrote `empty ?? DEFAULT_EMPTY_MESSAGE`, which only covers an absent prop, so
  a locale table's missing row (`""`) left the empty grid a row and cell with
  no words; `emptyMessage` reads a string through `spokenText` and leaves a
  node whole. One case in `frozen-empty-a11y.test.tsx` and one in
  `behaviour/virtual-table.test.tsx`; both measured failing on the old `??`
  (`expected [ 'Name', 'Size' ] to include 'No rows'`). 253 unit / 180
  behaviour, `check-types` clean.

- **A theme without the density group still builds a row**: `TreeRowView` wrote
  `height ?? theme.density.rowHeight` and `VirtualTree` handed the same raw read
  to its normaliser, so a theme a store gave back without the group threw
  `TypeError: Cannot read properties of undefined (reading 'rowHeight')` from the
  first row a tree painted. `tree/row.tsx` exports `treeRowHeight(height, theme)`
  over the primitives' `rowHeightOf(theme)` — the published reader that answers
  the library's row — and both trees resolve through it;
  `src/tree/row.test.ts` (3 cases) holds the two absence shapes, a shipped
  theme's own step, a caller's height and the source rule. Directions measured:
  restoring either raw read fails the absence case on the `TypeError` and the
  source case by name. Docs: `docs/tree-view.mdx`, `docs/virtual-tree.mdx`, the
  README and the two inventory rows.

- **A numeric group the theme lost paints the library's number**: the parts read
  `theme.spacing`, `theme.borderWidth`, `theme.radius` and `theme.density` raw,
  so a theme a store handed back without a group threw
  `TypeError: Cannot read properties of undefined (reading 'xs')` from the first
  layout that asked for a gap, an edge or a row height. Every library source now
  paints through the primitives' published readers (`spaceValue`,
  `borderWidthOf`, `radiusValue`, `iconSideOf`, `rowHeightOf`), which answer the
  library's number for the absence; `src/paint-readers.test.ts` (3 cases) scans
  every non-test source under `src/` and fails naming the file and the group,
  with a premise case that drives the scan's own shapes so "no raw reads" cannot
  pass by reading nothing. Directions measured: restoring `theme.spacing.xs` in
  `surfaces/stat-card.tsx` fails `surfaces/stat-card.tsx: theme.spacing`.
  Examples are excluded — a demo composes like an app and owns its theme. The
  chart legend dot's `theme.iconSize.xs` was the one exception until the
  primitives published `iconStepValue`; the dot reads it now and the guard holds
  `iconSize` beside the other four groups. Docs: the README's Styling section
  and rules table.

- **A readout id is a probe's own**: the live runner mounts selected probes
  into **one** window, so the data tree's example and the windowed tree's probe
  both printing `tree-readout` let a batched run read
  `visible=4000 expanded=40 …` as the plain tree's readout — measured twice in
  `--only virtual-tree-lifecycle --only data-tree-lifecycle`, where the probe
  alone paints in 814 ms and the batched one read after 327 ms. The example now
  prints `data-tree-readout`, and `apps/playground/src/live/data-tree.test.ts`
  gains `keeps its readout id apart from the windowed tree's`, which reads both
  ids from their own sources (measured failing with the old id:
  `expected 'tree-readout' not to be 'tree-readout'`). The pair is green (2/2,
  3.6 s + 10.0 s); the runner-level mount marker for any two probes that share
  an id is `TODO.md` → Interlocks.

- **A grid's saved state round-trips, and a sort it cannot run is not counted**:
  the record was read (`readGridState`, `useTable({ stored })`) while nothing
  wrote it — a workspace had to rebuild `{ sorting: [{ id, desc }],
  globalFilter, rowSelection }` itself, and a save written from
  `table.selection` (the retained view) lost every chosen record a filter hid.
  `gridConfig(state)` is the inverse of `readGridState` and `useTable().save`
  composes it from the core's chosen ids; `retainSorting` drops a saved sort
  naming a column this release no longer holds, which the row model already
  skipped while `sortOrder` still counted it (a Shift press announced "sort 2
  of 2" above one sort). `src/grid-core.test.ts` gains four cases and
  `behaviour/table-restore.test.tsx` two (the round trip through a keyed
  remount, and the dropped column read as `0 sorts`). Directions measured:
  writing the view fails the round trip (`expected '… 3 rows · 0 selected …'`);
  reverting `sortOrder` to the raw state fails the dropped-column case
  (`expected '1 sorts · path' to be '0 sorts · '`). Docs:
  `docs/table-sorting.mdx` §Saving the state a grid holds, the README and the
  Tier 3 Tables row.

## 5. Acceptance

- The twenty data rows in `COMPONENTS.md` move from `todo` to `done` (or `?`
  with a measured limitation).
- `/docs/data-display` links every component and states the runtime rules.
- A live playground probe mounts the table at 1,000 rows and measures the
  painted window.
