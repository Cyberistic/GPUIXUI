# `@gpuixui/data`

Data presentation rendered by GPUix through React — the table core, the
sort/selection/filter controller it runs on, column configuration with resizing,
the virtualized list over the runtime's own `<virtual-list>`, the virtualized
table that composes it with a fixed header, the **tree** with its expansion and
cursor model, the **windowed tree** that retains one window of a hierarchy, the
**expandable table row** that opens a detail panel under itself, the
**charts** (bar, stacked, line, donut and sparkline, one tinted `<svg>` mask per
series), and the **data surfaces** (a key-value list, a statistic card, a property
panel, a toolbar and the advanced filter's predicate tree), and the **frozen
column** — two panes mirrored into one scroll (`FrozenTable`).

## Why a package

A data grid is a composition with its own state (sort, selection, filters,
column sizes, virtualisation). Folding it into `@gpuixui/components` would make
every consumer of a badge pay for it, so the grid lives here and depends on the
primitives rather than the other way round.

## What the runtime forces

Measured on the pinned `@gpuix/native@0.11.0`; evidence is in
`apps/playground/README.md` and `docs/gpuix-capabilities.md`.

| Rule | Evidence | What this package does |
| ---- | -------- | ---------------------- |
| No `position: "sticky"` | `data-grid-fixed-header`, `table-lifecycle` | The header is a **sibling** of the row scroller, and both sit inside **one** horizontal scroller. A header moved into the row scroller painted at `y = -36`. |
| A frozen column is two scrollers | `data-grid-frozen-column`, `frozen-column-lifecycle` | `FrozenTable` puts the frozen column in its own vertical scroller beside the data pane and mirrors both ways through `onScrollChange` → `renderer.scrollTo`, guarded by a ref. The sideways pan is the data pane's alone, and a pressed frozen cell chooses the record for the whole grid. |
| No `transform` | upstream issue #102 | Column resize and row moves change `left`/`width`, never a transform. |
| No canvas drawing | `chart-raster` | A chart is stacked `<svg>` (one tint each) or an `<img>` pixel buffer; see §Charts in plan 610. |
| Wheel moves every scrollable ancestor | `nested-scroll-lifecycle` | The table's `height` bounds the table; the body owns the vertical wheel. |
| Chord presses arrive on `click` | `modifier-select-lifecycle` | Selection reads `event.modifiers.{shift,cmd,ctrl}`; the anchor rules are `selection/logic`. |
| A hidden row's selection is released at render, not erased | `table-filter-lifecycle` | `useTable` computes `retainSelection(chosen, keys)` during render, so the first frame after a query change paints the released set. The retention is **not** a write: the core still holds the chosen ids, so a query that widens back to them paints them chosen again (measured: `1 rows · 0 selected` → a whole-set query → `60 rows · 2 selected`). A grid that needs a permanent clear calls `clear()` on the change. |
| A sort is an order | `grid-core.test.ts`, `table.test.tsx` | A plain header press replaces the order; a Shift press appends the field as the next tie-break or flips it where it already sits. The core's sorted model walks every entry in turn, so records the primary sort ties are ordered by the second. |
| Column changes are app state | `table-columns-lifecycle` | Hiding a column takes its width out of the content and shifts every later column by exactly that width; a move changes the order and not the width. The header and the cells read one `columns.visible` list. |
| A resize divider arms the capture | `column-resize-lifecycle` | `TableColumnDivider` listens to `onMouseDown` **and** `onMouseMove`, holds the press in a ref, and reads the width at each press. Its width is clamped to the column's own bounds, and only a **primary** press arms it: the runtime delivers `mouseDown` for all three buttons, so a right press — the context-menu gesture — and a middle one would otherwise start a resize. |
| A press stops at the first painted child | `press-routing-lifecycle` | A cell control that must hand a press to its row declares `pointerEvents: "none"`; a filled child is the hit-test boundary, not the innermost handler. A tree's chevron is an `<svg>` that takes no press, so the row answers; a checkbox in a row paints, so it takes its own. |
| A fill takes the row's hover too | `hover-routing-lifecycle` | The native `hover` refinement's hovered set is the **same hit test** the press takes. A filled `<text>` or `<div>` in a row takes the row's hover wash and hears its own enter; an unfilled label leaves both to the row; `pointerEvents: "none"` removes the fill's hitbox while the child still runs its own listener. A decorative pill in a cell opts out so the row keeps its feedback. |
| Arrow keys move real native focus | `virtual-tree-lifecycle` | A tree holds **one** tab stop and moves `renderer.focusElement` in a layout effect **after** the `tabIndex` commit. A call from the key handler moved nothing: the row was still outside the tab order. A 16px depth inset is the hierarchy's only paint. |
| A windowed tree keeps its tab stop mounted | `virtual-tree-lifecycle`, `virtual-list-windowed` | `VirtualTree` moves the window to a row before focusing it, and a wheel or collapse that unmounts the cursor's row moves the cursor to the viewport's top row — the runtime unmounts the focused row, and a tree without a mounted tab stop cannot take the next key. |
| A painted row that grows re-measures | `virtual-list-expand` | An expandable row opens a **sibling** detail row (no row span on 0.11.0): the rows below shift by the growth, and a fixed-estimate `itemCount` window cannot express it — use the plain table or the list's children mode. |
| A key is dispatched along the focus path | `press-routing-lifecycle` | A key typed in a field inside a row still reaches the row's `onKeyDown`, so a row that owns activation reads the renderer's focused element first. `TableExpandableRow` toggles only while the row itself holds focus, and a disabled row toggles on no key. |
| The `aria-*` set is closed | `a11y-tree`, `docs/gpuix-capabilities.md` | A row's state travels only in the attributes 0.11.0 carries — a chosen row's selected state, an open one's expanded state. A disabled row installs no press handler and paints no pointer state, because 0.11.0 has no aria-disabled; the reason belongs in a cell's text (`src/table/aria.test.ts` holds the write set). |
| `<svg source>` is one tinted mask | `chart-raster`, `content-surfaces` | A chart is **one `<svg>` per series**, each carrying its series in the plot's viewBox and tinted through `style.color`; labels and the legend are text. A translucent mark that must sit over another uses the raster route (`setImagePixels`), not two masks. |
| A list builds only a window | `virtual-list-lifecycle`, `virtual-list-windowed` | `VirtualList` wraps the host element: children mode retains every React child and skips build/paint off screen; `itemCount` + `estimatedItemHeight` + `windowStart` retains only the app's slice. A list sizes its viewport from a definite height. |
| A shrinking set re-clamps the window | `virtual-table-lifecycle` | A scroll offset belongs to the set it was measured against. `useVirtualRows` clamps it to `count × rowHeight − viewport` before the window is computed, so a filter that narrows the set under a reader at row 900 lands on the narrowed set's end with the viewport still full — the core alone clamps the stale offset to the content's end and mounts five rows in a nine-row viewport. |
| `onVisibleRange` lags the paint | `virtual-list-windowed` | The reported range is **not** the window's source: the window follows the runtime's **scroll anchor** (`getListScrollTop`), which is exact even while the row heights are estimates. A window built from the reported range paints blank rows. |
| A reveal moves the window first | `virtual-list-windowed` | `useVirtualRows` moves the window to the row's own position in the same render, and the body scrolls to it in the layout effect after that commit. |

## Shape

```
src/
  table/      Table, TableViewport, TableHeader, TableBody, TableRow,
              TableHeaderCell, TableCell, TableCaption, TableEmpty, TableSkeleton,
              FrozenTable (the pinned-column composition)
  sort/       the press cycle, the announced label, TableSortHeader
  selection/  press modes, range + anchor, retention, neighbour step,
              the header/row checkbox column
  filter/     TableFilterField (the field above the rows)
  grid-core   the @tanstack/table-core features and constructGrid
  columns/    visibility, order, resize bounds, ColumnMenu, TableColumnDivider
  virtual/    VirtualList over the runtime's <virtual-list>, both modes;
              VirtualTable, VirtualTree, useVirtualRows and the window calculator
  tree/       the flattening, the cursor contract, TreeView, the shared row and
              keyboard controller, useExpandedRows; type-ahead reads
              @gpuixui/components/typeahead
  chart/      the geometry, the one-tint-per-series markup, the five charts
              and the legend
  surfaces/   KeyValue, StatCard, PropertyPanel, DataToolbar, AdvancedFilter
              and the predicate tree they read
  use-table   the uncontrolled controller over the core's row models
  use-columns the uncontrolled column controller
  internal/   the compile cache and the behaviour suites' test root
examples/     mountable screens (registered in examples/index.ts)
```

The grid state is **`@tanstack/table-core`'s**: sorting, the filtered order and
the chosen ids are row models over one data array (`grid-core.ts` registers the
features and `constructGrid` builds a table from controlled state — React holds
each slice, so no store subscription, adapter package or DOM is involved). The
press cycle, the pointer gesture and the render-time release stay in this
package: they are the rules a window measured, and the core has no opinion about
them. The window arithmetic is **`@tanstack/virtual-core`'s** — this package
hands it the scroll offset and the viewport and reads the range back — so the
grid's windowing is the same one a browser grid uses, driven without a DOM.
An application driving a grid from Effect or its own store builds the same table
with `constructGrid`.

## Usage

```tsx
import { Table, TableBody, TableRow, TableCell, TableHeader, TableViewport } from "@gpuixui/data";
import { useTable } from "@gpuixui/data/use-table";

const columns = [
  { id: "name", label: "Name", width: 260, valueOf: (row) => row.name },
  { id: "size", label: "Size", width: 90, valueOf: (row) => row.size },
];
const table = useTable({ rows, keyOf: (row) => row.id, columns });

<Table height={360} aria-label="Files">
  <TableViewport>
    <TableHeader>{/* TableSortHeader per sortable column */}</TableHeader>
    <TableBody>
      {table.rows.map((row) => (
        <TableRow
          key={row.id}
          selected={table.isSelected(row.id)}
          onClick={(event) => table.press(row.id, event.modifiers)}
        >
          <TableCell>{row.name}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </TableViewport>
</Table>;
```

The rows are **one stop in the Tab order**, and the stop always exists.
`table.tabStop` is the chosen record, or the first painted row when nothing is
chosen; a row takes `tabIndex={Option.contains(table.tabStop, row.id) ? 0 : -1}`.
A stop that waited for a pointer press left a fresh table out of the Tab order
entirely — Tab walked the column menu, the header controls and the per-row boxes
and reached no row — and a filter that released the chosen record then removed
the stop the reader was standing on. The arrow walk moves the selection, which
moves the stop with it.

A focused row answers **Enter and Space**, which choose the record the reader is
standing on (with the press's modifier flags, so Shift+Enter still extends a
range). A focusable `div` has no activation of its own — only the pointer path
runs `onClick` — so a walk that handled only the arrows left the row a reader
Tabbed into as the one record the keyboard could not choose.

Sorting is an **order**, not a field. `table.sort` is the primary sort and
`table.sortOrder` is every entry the row model walks; a plain `TableSortHeader`
press replaces the order, and a **Shift press** adds the column as the next
tie-break (or flips it where it already sits). The header reports its press
through `onSortPress` so the controller can compose it:

```tsx
<TableSortHeader
  field="name"
  label="Name"
  sort={table.sort}
  order={table.sortOrder}
  onSortPress={table.pressSort}
  width={260}
/>
```

A consumer that owns one sort keeps the single-column callback —
`onSort={(next) => setSort(Option.some(next))}` — and never passes `order`. The
page is `docs/table-sorting.mdx`, and `src/behaviour/table.test.tsx` presses a
second header with Shift and reads the tie-break out of the painted rows.

A **checkbox column** is a fixed track at the head of the header and every row.
The controller supplies the tri-state over the painted set, so the header cannot
claim a record a filter hides:

```tsx
<TableSelectionHeader
  checked={table.allSelected}
  indeterminate={table.someSelected}
  onCheckedChange={table.setAllSelected}
  disabled={table.rows.length === 0}
/>

<TableSelectionCell
  checked={table.isSelected(row.id)}
  onCheckedChange={() => table.toggleSelection(row.id)}
  label={`Select ${row.name}`}
/>
```

The box paints a fill, so it takes its own press (`press-routing-lifecycle`):
toggling one record leaves the row press's set alone. The page is
`docs/table-selection.mdx`.

A column set is one ordered list the header and every row read. The controller
holds visibility, order and widths; the menu drives the first two and a divider
drives the third:

```tsx
const columns = useColumns({ columns: FILE_COLUMNS });

<ColumnMenu
  state={columns.state}
  onChange={columns.apply}
  onReset={columns.reset}
/>

<TableRow>
  {columns.visible.map((column) => (
    <TableSortHeader
      key={column.id}
      field={column.id}
      label={column.label}
      width={column.width}
      resize={{
        minWidth: column.minWidth,
        maxWidth: column.maxWidth,
        label: `Resize the ${column.label.toLowerCase()} column`,
        onResize: (width) => columns.resize(column.id, width),
      }}
      ...
    />
  ))}
</TableRow>
```

A resizable column needs a fixed `width`; the divider sits inside its header
cell therefore, so a body row needs no spacer track.

A hidden column **leaves the search but keeps its sort**. `useTable` takes the
controller's memoised `hidden` list (`useColumns().hidden`) and the core marks
those columns out of the global filter, so a query keeps no record by text no
painted cell shows — while hiding the column a reader sorted by keeps the order
rather than silently restoring the source order:

```tsx
const columns = useColumns({ columns: FILE_COLUMNS });
const table = useTable({
  rows,
  keyOf: (row) => row.id,
  columns: FILE_COLUMNS,
  hiddenColumns: columns.hidden,
});
```

A **pinned column** is `FrozenTable`, not a column attribute: the runtime paints
no `position: "sticky"`, so the frozen column is its own vertical scroller beside
the data pane and the two are mirrored through `onScrollChange` →
`renderer.scrollTo` with a re-entrancy guard (`data-grid-frozen-column`,
`frozen-column-lifecycle`). The sideways pan is the data pane's alone, and a
press on a frozen cell chooses the record for the whole grid. `ColumnMenu`
therefore offers no pin row — a pin is a different layout, not something the
column list can express. The page is `docs/frozen-columns.mdx`; the shipped
screen is `examples/frozen-table.example.tsx`.

```tsx
<FrozenTable
  height={320}
  frozenWidth={180}
  contentWidth={420}
  rows={table.rows}
  rowKey={(row) => row.id}
  frozenHeader={<TableRow><TableHeaderCell width={180}>Name</TableHeaderCell></TableRow>}
  frozenRow={(row) => <TableRow selected={table.isSelected(row.id)}>…</TableRow>}
  header={<TableRow><TableHeaderCell width={140}>Status</TableHeaderCell></TableRow>}
  row={(row) => <TableRow selected={table.isSelected(row.id)}>…</TableRow>}
/>
```

A long list uses the runtime's `<virtual-list>` through `VirtualList`. Children
mode is the default; `itemCount` mode retains only the slice the app renders,
and the app owns the window:

```tsx
<VirtualList
  ref={attach}
  height={320}
  itemCount={rows.length}
  estimatedItemHeight={32}
  windowStart={windowStart}
  onVisibleRange={(range) => setWindowStart(Math.max(0, range.first - overdraw))}
>
  {slice.map((row) => (
    <div key={row.id} style={{ height: 32 }}>{row.label}</div>
  ))}
</VirtualList>
```

`onVisibleRange` lags the paint by one gesture, so the window must be wider than
the viewport plus overdraw. A reveal moves `windowStart` first and then calls
`renderer.scrollToItem(listInstance, index)` — in children mode the ref is all
the reveal needs. `VirtualList` paints no chrome: a row is the caller's `div` or
`TableRow`.

A **table** over a long set composes that list with the measured fixed header.
`VirtualTable` owns the window: it reads the runtime's scroll anchor, hands the
offset and the measured body height to `@tanstack/virtual-core`, and gives the
runtime the `windowStart` the range produced. The offset is clamped to the rows
the current `count` holds before the window is computed, so a filter that
shrinks the set under the reader lands on the narrowed set's end with the
viewport still full rather than on the old offset's tail.

```tsx
<VirtualTable
  height={320}
  count={rows.length}
  rowHeight={36}
  header={<TableRow><TableSortHeader field="name" label="Name" … /></TableRow>}
  row={(index) => (
    <TableRow key={rows[index].id} selected={table.isSelected(rows[index].id)}>
      <TableCell>{rows[index].name}</TableCell>
    </TableRow>
  )}
/>
```

The row must paint exactly `rowHeight`: the window's positions come from the
runtime's estimate, so a taller row would push the rows below it out of place.
A row of a different height uses `VirtualList` in children mode instead.

A set of **no rows is empty, not loading**: `count={0}` paints the `empty` message
inside a `TableEmpty` row, and `DEFAULT_EMPTY_MESSAGE` (`No rows`) when the
caller names none — the body's no-children branch is the loading skeleton, and a
caller who said there are no records must not be told the first page is still
arriving. A string `empty` paints as the cell's own `<text>`, because a raw
string in a box paints and is never announced (`src/behaviour/table-empty-a11y.test.tsx`).

A **tree** is a flattened column of rows with one tab stop. `useExpandedRows`
holds the expansion set and the cursor; `TreeView` paints the rows and owns the
keys and the native focus. A typed prefix is the **published** rule —
`@gpuixui/components/typeahead` owns the window, the repeat rule and the
character a keystroke types, so a tree, a list and a menu cannot disagree; the
tree contributes each row's `labelOf` and keeps only the position-to-key step:

```tsx
const tree = useExpandedRows({ roots: files, keyOf, childrenOf, labelOf });

<TreeView
  aria-label="Workspace files"
  height={260}
  rows={tree.rows}
  cursor={tree.cursor}
  onCursorChange={tree.setCursor}
  labelOf={(node) => node.name}
  onActivate={(row) => open(row.node)}
/>
```

Up/Down/Home/End move the cursor (and the platform focus); Right opens a branch
or steps into it; Left closes it or steps out — a root stays where it is, because
clearing the cursor would fall back to the first painted row; a printable
character jumps to the first row after the cursor whose label starts with the
prefix. `reveal(key)` opens the path to a node and moves the cursor to it.

A tree of thousands uses **`VirtualTree`**: the same rows and keyboard over the
runtime's `itemCount` window, so only the rows around the viewport are retained.
A cursor move to a row outside the window moves the window first, then focuses
the row; a wheel or a collapse that unmounts the cursor's row moves the cursor to
the viewport's top row, so the tree always keeps one live tab stop. Rows paint
exactly `rowHeight`, and a variable-height tree composes `VirtualList` in
children mode instead. The page is `docs/virtual-tree.mdx`.

```tsx
const tree = useExpandedRows({ roots: files, keyOf, childrenOf, labelOf });

<VirtualTree
  aria-label="Workspace files"
  height={320}
  rows={tree.rows}
  cursor={tree.cursor}
  onCursorChange={tree.setCursor}
  labelOf={(node) => node.name}
  onActivate={(row) => open(row.node)}
/>
```

An **expandable row** opens a detail panel under itself. The panel is a sibling
row, not a spanning cell — 0.11.0 has no row span — so it is as wide as the
table's content and pushes the rows below it:

```tsx
<TableExpandableRow
  expanded={HashSet.has(open, file.id)}
  onToggle={() => setOpen((current) => toggleExpanded(current, file.id))}
  cells={<><TableCell width={200}>{file.name}</TableCell></>}
  detail={<KeyValue entries={detailOf(file)} />}
/>
```

The header needs a matching expander track (`<TableHeaderCell width={32} />`).
The row is the disclosure's **control**: it is a Tab stop and Enter/Space toggle
the panel, because a focusable `div` has no activation of its own. An expanding
row belongs in the plain table or the list's children mode: a fixed-estimate
`itemCount` window would misplace every row below it.

A **chart** is one `<svg>` per series, tinted through `style.color`, because an
`<svg source>` is one mask (`chart-raster`). The geometry is pure data, and the
labels and legend are text beside the plot:

```tsx
<BarChart
  aria-label="Revenue by quarter"
  labels={QUARTERS}
  series={[{ key: "revenue", label: "Revenue", values: [32, 48, 41, 60] }]}
  width={320}
  height={140}
/>

<DonutChart aria-label="Traffic by source" data={sources} size={160} />
<Sparkline aria-label="Revenue trend" values={[32, 48, 41, 60]} />
```

`chart/logic.ts` holds the scale, the marks and the markup so a chart can be
drawn from Effect or a store; `seriesColors(theme)` supplies the categorical
palette every chart paints from. A **stacked** bar is one bar of its categories'
totals, so its axis reads `stackedScale` — the ceiling of the tallest total, the
same number the marks divide by (`chartScale`, the widest single value among the
slots the chart paints, is the grouped bar's and the line's). A value past the
last label draws nowhere, so it cannot raise the axis either. The axis column
paints its ceiling at the plot's top and its floor on the plot's floor, so a
bar's top reads against the value beside it. Every mark sits at the centre of
its category slot — a bar, a line's point and the label under it share one `x`
— so a series with fewer values than labels stays in the columns it names.

The picture announces its numbers: the chart is a group named by `aria-label`,
each series is an image named by its label, and the values travel in
`aria-description` (`Q1 32, Q2 48`) — a value past the last label is not
described and one the caller never supplied reads `no value` rather than the
`0` the geometry substitutes. A series with a labelled slot keeps its image even
when no value draws: a chart of zeros, or of negatives the geometry cannot show,
still reads `Q1 0, Q2 -4` rather than vanishing from the tree. A `Sparkline` is
one image, not a group of them: the caller's `aria-label` names it and its values
are its description.

The full screens — the files table with filter, sort headers, column menu and
keyboard walk, the 2 000-row list, the 1 000-row virtualized table, the
workspace **tree**, the 4 000-row **windowed tree**, the **expandable-rows**
table, the **charts** and the **data surfaces** over one object — are
`examples/table.example.tsx`, `examples/virtual-list.example.tsx`,
`examples/virtual-table.example.tsx`, `examples/tree.example.tsx`,
`examples/virtual-tree.example.tsx`, `examples/expandable-rows.example.tsx`,
`examples/chart.example.tsx` and `examples/surfaces.example.tsx`.

## The data surfaces

One object, read four ways: a toolbar that acts on it, a statistic card that
shows a derived reading, a key-value list that scans down two columns, and a
property panel that edits it. None of them keeps a copy of the object.

```tsx
import { AdvancedFilter, DataToolbar, KeyValue, PropertyPanel, StatCard } from "@gpuixui/data";

<DataToolbar search={{ value: query, onValueChange: setQuery }}>
  <Button onActivate={() => setWidth(240)}>Wide</Button>
</DataToolbar>

<StatCard label="Area" value={`${width * height}`} unit="px²" />

<KeyValue entries={[{ key: "name", label: "Name", value: name }]} />

<PropertyPanel
  title="Properties"
  rows={[{ kind: "editable", key: "name", label: "Name", value: name, onChange: setName }]}
/>

<AdvancedFilter fields={FIELDS} tree={tree} onChange={setTree} />
```

They announce what they paint: the key-value list is a named `List` of
`ListItem`s, the statistic card is a `Group` named by its `aria-label`, both
titles are headings, and every primitive label or value is a `Label` node
(`src/behaviour/surface-a11y.test.tsx`).

The advanced filter's state is a **predicate tree**, not a string: a predicate
(field, comparison, value), an `all`, an `any` and a `not`. The tree is the
caller's, so a builder, a saved query and a table's own filter read one shape,
and the evaluation is a pure function:

```ts
const kept = filterByTree(rows, tree, (row, field) => row[field]);
```

The comparisons are literal — a value is never a pattern — and an order reads
both sides as numbers, so a field stored as a number and a clause typed as text
still compare. A side that does not read as a number satisfies no order, the
blank value a new clause starts with included, so an unfilled clause keeps no
row rather than reading the blank as `0`. An empty `all` matches everything,
which is what an empty builder means. The builder adds wherever a reader presses:
`appendAt(tree, path, clause)` grows the `all`/`any` at a path, so a nested `any`
gains a clause in place, while a path naming a clause or the `not` itself leaves
the tree alone. A path through a `not` is followed into its one child, so a group
a `not` negates is edited like any other — its Add appends there and a clause's
Remove takes that clause out. A `not` paints no Add and the clause it holds
directly paints no Remove, because a `not` cannot be left without its child. The
toolbar's search is the one **debounced** field (the core's `@tanstack/pacer`
debouncer owns the wait); the table's own filter field is deliberately not,
because `table-filter-lifecycle` measured the set narrowing as the reader types.

## Styling

Resting appearance is a Tailwind class recipe compiled through
`@gpuixui/tw`'s default registry (shadcn's fixed metrics), cached once per
recipe per theme. Geometry the runtime exposes as behaviour — scroller axes,
column widths — is set in `style`, because `overflow-x`/`overflow-y` live only
in the primitives' registry and a column width is data.

## Status

| Surface | State |
| ------- | ----- |
| Table core, fixed header, empty and loading states | shipped, window-verified |
| Sort reducer + `TableSortHeader` | shipped, window-verified |
| Multi-column sort (Shift press, `sortOrder`, `pressSort`) | shipped, window-verified |
| Selection reducer + row paint + keyboard walk | shipped (the walk is composed in the example; `tabStop` names the one row stop, and no roving-focus API exists in the runtime) |
| Selection column (`TableSelectionHeader`, `TableSelectionCell`) | shipped, window-verified |
| Filter reducer + `TableFilterField` | shipped, window-verified |
| Column visibility + order (`ColumnMenu`, `useColumns`) | shipped, window-verified |
| Resizable columns (`TableColumnDivider`) | shipped, window-verified |
| Virtualized lists (`VirtualList`, both host modes) | shipped, window-verified |
| Virtualized table (`VirtualTable`, `useVirtualRows`) | shipped, window-verified |
| Trees (`TreeView`, `useExpandedRows`, `tree/logic`) | shipped, window-verified |
| Windowed trees (`VirtualTree` over the `itemCount` window) | shipped, window-verified |
| Expandable rows (`TableExpandableRow`, `TableDetailRow`) | shipped, window-verified (the row is a Tab stop and answers Enter/Space only while it holds focus; a disabled row answers neither pointer nor key) |
| Data surfaces (`KeyValue`, `StatCard`, `PropertyPanel`, `DataToolbar`, `AdvancedFilter`) | shipped, window-verified |
| Pinned / frozen columns (`FrozenTable`) | shipped, window-verified (`data-grid-frozen-column`, `frozen-column-lifecycle`) |
| Charts (`BarChart`, `StackedBar`, `LineChart`, `DonutChart`, `Sparkline`) | shipped, window-verified |

## Commands

```sh
nub run --filter @gpuixui/data test              # reducers + recipe guards
nub run --filter @gpuixui/data test:behaviour    # the real renderer
nub run --filter @gpuixui/data check-types
```
