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
| A frozen column is two scrollers | `data-grid-frozen-column`, `frozen-column-lifecycle` | `FrozenTable` puts the frozen column in its own vertical scroller beside the data pane and mirrors both ways through `onScrollChange` → `renderer.scrollTo`, guarded by a ref. The sideways pan is the data pane's alone, and a pressed frozen cell chooses the record for the whole grid. A zero-row grid paints `TableEmpty` (`No rows` by default) in the data pane instead of the body's loading skeleton. |
| A bounded surface needs a height it can paint | `behaviour/paintable-height.test.tsx` | A height is often computed, and the runtime drops one it cannot lay out. `Table`, `VirtualTable`, `VirtualTree`, `TreeView` and `FrozenTable` read it through `paintableSize`: a height that is not finite, or is negative, is **no height**, so the surface takes the pane's share and measures the box it painted. Measured in a 320-point pane, `FrozenTable height={NaN}` painted both row scrollers at **0 points** against the **276** a readable height gives them. |
| No `transform` | upstream issue #102 | Column resize and row moves change `left`/`width`, never a transform. |
| No canvas drawing | `chart-raster` | A chart is stacked `<svg>` (one tint each) or an `<img>` pixel buffer; see §Charts in plan 610. |
| Wheel moves every scrollable ancestor | `nested-scroll-lifecycle` | The table's `height` bounds the table; the body owns the vertical wheel. |
| Chord presses arrive on `click` | `modifier-select-lifecycle` | Selection reads `event.modifiers.{shift,cmd,ctrl}`; the anchor rules are `selection/logic`. |
| A hidden row's selection is released at render, not erased | `table-filter-lifecycle` | `useTable` computes `retainSelection(chosen, keys)` during render, so the first frame after a query change paints the released set. The retention is **not** a write: the core still holds the chosen ids, so a query that widens back to them paints them chosen again (measured: `1 rows · 0 selected` → a whole-set query → `60 rows · 2 selected`). A grid that needs a permanent clear calls `clear()` on the change. |
| A sort is an order | `grid-core.test.ts`, `table.test.tsx` | A plain header press replaces the order; a Shift press appends the field as the next tie-break or flips it where it already sits. The core's sorted model walks every entry in turn, so records the primary sort ties are ordered by the second. |
| A restored state is read, not dereferenced | `grid-core.test.ts`, `behaviour/table-restore.test.tsx` | `constructGrid` is the seam a store-driven grid builds with, so its state is stored data: JSON writes a slice that was never set as `null`. `readGridState` reads each slice — a sorting list that is not a list is **no sort** and an entry that names no column is dropped, a query that is not text is **no query**, a chosen set keeps only the ids set to `true`, and a `hiddenColumns` list that is not a list of text ids hides nothing. Measured before: `globalFilter: null` threw `Cannot read properties of null (reading 'trim')`, `sorting: null` threw `state.sorting is not iterable`, and a `[null]` entry threw `Cannot read properties of null (reading 'id')` — the grid could not reopen with the state it saved. **The shipped controller takes the same record**: `useTable({ stored })` reads it once at mount, so a workspace reopens its grid sorted, narrowed and chosen — `initialSort` is the sorting shorthand, used only when the record names no sorting (`behaviour/table-restore.test.tsx`). **The record is written too**: `gridConfig(state)` is the inverse of `readGridState` and `useTable().save()` composes it from the controller, so the round trip needs no caller-side copy of the wire shape. A saved sort naming a column this release dropped is not an order the grid counts (`retainSorting`), and the chosen ids are the core's — a record a filter hides is still saved, because retention is a view, not a write. |
| Column changes are app state | `table-columns-lifecycle` | Hiding a column takes its width out of the content and shifts every later column by exactly that width; a move changes the order and not the width. The header and the cells read one `columns.visible` list. |
| A resize divider arms the capture | `column-resize-lifecycle` | `TableColumnDivider` listens to `onMouseDown` **and** `onMouseMove`, holds the press in a ref, and reads the width at each press. Its width is clamped to the column's own bounds, and only a **primary** press arms it: the runtime delivers `mouseDown` for all three buttons, so a right press — the context-menu gesture — and a middle one would otherwise start a resize. **A move that holds no primary button ends the gesture** (`pressedButton`): a window the pointer left reports no release, and a hover must never resize the column by the pointer's travel — `table.test.tsx`'s lost-release case releases outside the window and hovers the strip. |
| A bound, a step or a width the grid cannot read is legal | `columns/logic.test.ts` | A column's width is often computed (a stored size, a measurement, a fraction of the table), and a non-finite bound used to clamp every width to NaN, taking `contentWidth` and every later offset with it. `widthBounds` reads a non-finite minimum/maximum as 80/640 and `resizeWidthByKey` reads a non-finite step as 16. A width that is NaN is not clamped: it reads as the column's own minimum, so an arrow steps **from** it rather than snapping to it, and `resizeColumn` leaves the column alone instead of collapsing a 260px track to its floor because a drag computed no width. |
| A press stops at the first painted child | `press-routing-lifecycle` | A cell control that must hand a press to its row declares `pointerEvents: "none"`; a filled child is the hit-test boundary, not the innermost handler. A tree's chevron is an `<svg>` that takes no press, so the row answers; a checkbox in a row paints, so it takes its own. |
| A fill takes the row's hover too | `hover-routing-lifecycle` | The native `hover` refinement's hovered set is the **same hit test** the press takes. A filled `<text>` or `<div>` in a row takes the row's hover wash and hears its own enter; an unfilled label leaves both to the row; `pointerEvents: "none"` removes the fill's hitbox while the child still runs its own listener. A decorative pill in a cell opts out so the row keeps its feedback. |
| A row's press is derived over its hover | `pointer-wash.test.ts`, `table.test.tsx`, `tree.test.tsx` | An unchosen row tints `hover` and a chosen one `accent`; the button-down paint is `pointerWash(theme, "active", …)` over the wash it replaces, because a palette's raw `active` role can sit under the 1.05:1 floor beside it. The table's row and the tree's row paint the same three states. |
| Arrow keys move real native focus | `virtual-tree-lifecycle` | A tree holds **one** tab stop and moves `renderer.focusElement` in a layout effect **after** the `tabIndex` commit. A call from the key handler moved nothing: the row was still outside the tab order. A 16px depth inset is the hierarchy's only paint. |
| A reveal lands the focus, not only the cursor | `data-tree-lifecycle`, `tree.test.tsx` | A caller-driven cursor (a search hit, a "show this file" press) is re-taken on the next tick, because the runtime hands the pressed control the focus after the commit. A key that left the cursor where it was — Up on the first row, a press on the row already active — has no row to focus, so it is not a move the tree made and cannot take that retake away. |
| A windowed tree keeps its tab stop mounted | `virtual-tree-lifecycle`, `virtual-list-windowed` | `VirtualTree` moves the window to a row before focusing it, and a wheel or collapse that unmounts the cursor's row moves the cursor to the viewport's top row — the runtime unmounts the focused row, and a tree without a mounted tab stop cannot take the next key. |
| A painted row that grows re-measures | `virtual-list-expand` | An expandable row opens a **sibling** detail row (no row span on 0.11.0): the rows below shift by the growth, and a fixed-estimate `itemCount` window cannot express it — use the plain table or the list's children mode. |
| A key is dispatched along the focus path | `press-routing-lifecycle` | A key typed in a field inside a row still reaches the row's `onKeyDown`, so a row that owns activation reads the renderer's focused element first. `TableExpandableRow` toggles only while the row itself holds focus, and a disabled row toggles on no key. `TreeView` reads the same rule: it answers a key only while one of its rows holds native focus, so a field in `renderRow` keeps its space, Enter and characters (`tree.test.tsx`). |
| The `aria-*` set is closed | `a11y-tree`, `docs/gpuix-capabilities.md` | A row's state travels only in the attributes 0.11.0 carries — a chosen row's selected state, an open one's expanded state. A disabled row installs no press handler and paints no pointer state, because 0.11.0 has no aria-disabled; the reason belongs in a cell's text (`src/table/aria.test.ts` holds the write set). |
| `<svg source>` is one tinted mask | `chart-raster`, `content-surfaces` | A chart is **one `<svg>` per series**, each carrying its series in the plot's viewBox and tinted through `style.color`; labels and the legend are text. A translucent mark that must sit over another uses the raster route (`setImagePixels`), not two masks. |
| A list builds only a window | `virtual-list-lifecycle`, `virtual-list-windowed` | `VirtualList` wraps the host element: children mode retains every React child and skips build/paint off screen; `itemCount` + `estimatedItemHeight` + `windowStart` retains only the app's slice. A list sizes its viewport from a definite height. |
| A shrinking set re-clamps the window | `virtual-table-lifecycle` | A scroll offset belongs to the set it was measured against. `useVirtualRows` clamps it to `count × rowHeight − viewport` before the window is computed, so a filter that narrows the set under a reader at row 900 lands on the narrowed set's end with the viewport still full — the core alone clamps the stale offset to the content's end and mounts five rows in a nine-row viewport. |
| `onVisibleRange` lags the paint | `virtual-list-windowed` | The reported range is **not** the window's source: the window follows the runtime's **scroll anchor** (`getListScrollTop`), which is exact even while the row heights are estimates. A window built from the reported range paints blank rows. |
| A reveal moves the window first | `virtual-list-windowed` | `useVirtualRows` moves the window to the row's own position in the same render, and the body scrolls to it in the layout effect after that commit. |
| A row height the window can divide | `rowheight.test.tsx`, `window.test.ts` | `rowHeightOf` reads a computed row height once — a finite height above zero, else `DEFAULT_ROW_HEIGHT` (37, what the shipped row paints) — and the runtime's estimate, the anchor, a reveal and the tree's cursor walks all read it. A height nothing could be read from used to mount a row per pixel and to clamp the anchor's offset to `0`, so a thousand-row table painted nothing past its first window. |
| A theme without the density group still builds a row | `tree/row.test.ts` | The step a tree row defaults to is the primitives' density reader (`rowHeightOf(theme)`), which answers the library's row for a theme a store gave back without the group. Indexing the group directly threw `TypeError: Cannot read properties of undefined (reading 'rowHeight')` from the first row, in the plain tree and the windowed one alike. |
| A numeric group is read through the seam that answers its absence | `paint-readers.test.ts` | `spaceValue`, `borderWidthOf`, `radiusValue`, `iconStepValue` and `rowHeightOf` answer the library's number for a theme a store gave back without the group; indexing `theme.spacing`, `theme.borderWidth`, `theme.radius`, `theme.iconSize` or `theme.density` threw from the first layout that asked for a gap, an edge, a glyph or a row height. |

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
  grid-core   the @tanstack/table-core features, constructGrid and readGridState
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
with `constructGrid`, whose `state` is read through `readGridState`: a restored
record narrows and sorts the set instead of taking the build down, because a
store hands back `null` for a slice JSON never wrote.

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

A column's `label` is content, not chrome: a locale table missing its row and a
saved column configuration both hand over `""`, and the control's name is the
only channel this runtime has for the sort state. A blank label therefore reads
as the column's `field` — `columnName` is the one reading, used for the painted
header, the announced name and the column menu's rows alike — so a press on such
a column says `name, sorted ascending` rather than `", sorted ascending"`, the
visibility row is named `name` rather than left unnamed, and the submenu says
`Move name` rather than `Move ` and stopping (`surface-a11y.test.tsx`).

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
import { ColumnMenu, columnName, useColumns } from "@gpuixui/data";

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
        label: `Resize the ${columnName(column.label, column.id).toLowerCase()} column`,
        onResize: (width) => columns.resize(column.id, width),
      }}
      ...
    />
  ))}
</TableRow>
```

A resizable column needs a fixed `width`; the divider sits inside its header
cell therefore, so a body row needs no spacer track. A bound or a key step that
is not a finite number is read as the default (80/640/16) rather than a NaN
track, and a width the grid cannot read is the column's own minimum: a width is
often computed, and `NaN` orders below every number, so clamping it would
collapse the track — `resizeColumn` leaves such a column alone while a key press
steps from its floor. **One number drives the announcement, the drag and the
arrows** (`readableWidth` + the column's bounds): a width past the bounds reads
as the bound, so a consumer that does not clamp still steps from the width the
divider shows instead of landing back on the bound it already announced, and a
computed `NaN` never publishes `NaN pixels` or refuses to grow. The page is
`docs/column-configuration.mdx`.

The divider's **name** is content, like every other column's words: a locale
table missing its row or a saved label answers `""`, and the control is a
focusable `separator`, so a blank name used to leave the one control that
resizes a column nameless while its width stayed announced. `DEFAULT_RESIZE_LABEL`
(`Resize column`) is the reading, and a name that says *which* column is
composed from `columnName(column.label, column.id)` — the same reading the
header and the menu use — so a column restored without a title is named by its
id, not by a blank. `surface-a11y.test.tsx` mounts an empty and a whitespace
label and reads both names off the tree.

A **cell's own `width` is the same kind of number**, and it is read by the
layout rather than by a reducer: `TableHeaderCell`/`TableCell` take the track a
column paints, and the runtime drops a width it cannot lay out (`NaN` and the
infinities reach native as `null`, and a negative width paints nothing usable).
A cell whose width was dropped sized to its own content instead, so a column's
header and its cells stopped sharing a track — measured, a 62px `Name` heading
above a 204px body cell. A width that cannot paint is **no width**, the reading
`width` already has when it is omitted: the cell shares the leftover track and
the column stays aligned, while a finite width is the caller's exactly.

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

A **column set can be saved and restored**. `columnConfig(columns.state)` writes
the order, the hidden ids and the widths; `restoreColumns(FILE_COLUMNS, saved)`
applies them to the definitions the current release ships, and
`useColumns({ columns, stored })` reads that configuration once at mount. A
saved id the release dropped is skipped and a column it added follows the saved
ones, so a stored set from an older build still opens the table; a saved width
is clamped to the column's own bounds, a width that is not a finite number
reads as the definition's, a hidden id that no longer exists hides nothing, and
a value that is not a configuration reads as the shipped columns. Reset still
restores the definitions rather than the saved set. The page is
`docs/column-configuration.mdx` §Saving and restoring.

A **grid's own state** is saved the same way: `table.save()` (or the pure
`gridConfig(state)`) writes the sorting, the query and the chosen ids — the
record `readGridState` reads and `useTable({ stored })` reopens. The order is the
one the grid **runs**, so a saved sort naming a column this release dropped is
not counted or written back (`retainSorting`), and the ids are the core's rather
than the retained view: a record a filter hides is saved, and paints chosen
again when the query widens. The range anchor is a gesture cursor and starts
fresh after a restore. The page is `docs/table-sorting.mdx` §Saving the state a
grid holds.

A **pinned column** is `FrozenTable`, not a column attribute: the runtime paints
no `position: "sticky"`, so the frozen column is its own vertical scroller beside
the data pane and the two are mirrored through `onScrollChange` →
`renderer.scrollTo` with a re-entrancy guard (`data-grid-frozen-column`,
`frozen-column-lifecycle`). Both scrollers take the grid's `height` less the
taller of the two measured headers; a height the layout cannot paint is **no
height**, so the composition bounds them from the box it painted in the pane it
fills (`behaviour/paintable-height.test.tsx`). The sideways pan is the data
pane's alone, and a
press on a frozen cell chooses the record for the whole grid. An empty set is
the grid's too: the data pane paints `TableEmpty` — `No rows` when the caller
names no `empty`, a string as that cell's own text — because a body with no
child would paint the loading skeleton and a role-less message would sit outside
the grid the tree describes. A **blank** `empty` reads as `No rows` too
(`emptyMessage`): a default written `empty ?? "No rows"` only covers an absent
prop, and a locale table with a missing row answers `""`, which painted a row
and a cell with no words under them. `ColumnMenu`
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

**A window with no height takes its pane's.** A windowed surface computes its
range from a viewport and has no natural height, so a height the layout cannot
paint (omitted, or a computed `NaN`) reads as no height: `VirtualTable` fills
its container and windows against the measured viewport frame, and `VirtualTree`
measures the column it fills and draws the list at that height — the runtime's
`<virtual-list>` paints no surface of its own and reports no `onLayout`
(measured on 0.11.0), so the list cannot measure itself. The pane must bound the
column's height; an auto-height or non-flex parent gives the surface no viewport
and it paints no rows. In a 320px pane both paint the window they paint at
`height={320}` (8 table rows, 10 tree rows);
`behaviour/paintable-height.test.tsx` holds both. The frozen composition reads
the same rule: its two scrollers are bounded by the grid's `height`, or by the
box it measured in the pane — a `NaN` height used to paint both at **0 points**
against the **276** a readable height gives them.

**A row height the window cannot divide is the row this package paints.**
`rowHeight` (and the list's `estimatedItemHeight`) is often computed, and a
value that is not a finite height above zero used to reach the estimate, the
anchor and every offset at once: the calculator divided the viewport by one
pixel — 204 rows of a thousand in a 240px body — and the anchor's `index × NaN`
clamped the offset to `0`, so a table painted its first window and then nothing,
for ever, while a reveal scrolled to a row the window never held. `rowHeightOf` reads a height the window can divide — a finite height above zero,
else `DEFAULT_ROW_HEIGHT` (37), which is what the shipped row paints: a
`text-sm` line inside `py-2` plus the row's rule, measured by
`behaviour/rowheight.test.tsx`. The estimate, the anchor, the reveal and the
tree's cursor walks all read that one number.

**A theme that lost the density group still builds a row.** A theme a store
hands back can lack the group — JSON writes `null` where a record never carried
it, a hand-edited literal drops the key — and both tree painters used to index
it: the first row a surface painted threw
`TypeError: Cannot read properties of undefined (reading 'rowHeight')`. The row
step now comes from the primitives' density reader (`rowHeightOf(theme)`), which
answers the library's row for that absence, and the windowed tree resolves its
`rowHeight` through the same read. `tree/row.test.ts` holds it.

**An overdraw the window cannot read is the documented default.**
`@tanstack/virtual-core` multiplies `overdraw` into both edges of every range,
so a `NaN` reached `new Array(NaN)` and threw `RangeError: Invalid array length`
— the table painted nothing. `overdrawRows` reads the count once: finite
values are floored and never negative (`0` is no rows around the viewport), and
a `NaN` or an infinity is `DEFAULT_OVERDRAW` (4). `VirtualList` reads its own
`overdraw` through the same function before the host sees it.

`count` is read **once**, as the whole non-negative number of rows the table
holds — a fraction of a row cannot exist, and a count the table cannot read
(`NaN`, an infinity, a negative) is `0`. That one number drives the runtime
list's `itemCount`, the window arithmetic and the empty state, so a list and its
window cannot disagree about how many rows exist; before it, `count={NaN}`
painted a header above a blank body with neither the empty message nor the
skeleton. A caller waiting on a total passes `0` and its own `empty` until the
response arrives.

A set of **no rows is empty, not loading**: `count={0}` paints the `empty` message
inside a `TableEmpty` row, and `DEFAULT_EMPTY_MESSAGE` (`No rows`) when the
caller names none — the body's no-children branch is the loading skeleton, and a
caller who said there are no records must not be told the first page is still
arriving. A string `empty` paints as the cell's own `<text>`, because a raw
string in a box paints and is never announced (`src/behaviour/table-empty-a11y.test.tsx`).
A **blank** string reads as `No rows` (`emptyMessage`): the default only covers
an absent prop, so a locale table's missing row left the empty grid a cell with
no words under it.

A **loading skeleton counts what it can mount**: `TableBody`'s `rows` and
`TableSkeleton`'s `rows`/`columns` are often computed — a page size read from a
config, a viewport divided by a row height — so a count the renderer cannot read
(`NaN`, an infinity) is the shipped `3`, and a finite one is bounded to
`SKELETON_TRACK_LIMIT` (20) per side. A skeleton holds the shape of a screen,
not a data set: `Array.from({ length: Infinity })` would otherwise throw
`RangeError: Invalid array length`, and `NaN` would paint no track at all.

A **tree** is a flattened column of rows with one tab stop. `useExpandedRows`
holds the expansion set and the cursor; `TreeView` paints the rows and owns the
keys and the native focus. A typed prefix is the **published** rule —
`@gpuixui/components/typeahead` owns the window, the repeat rule and the
character a keystroke types, so a tree, a list and a menu cannot disagree; the
tree contributes each row's words as it paints them —
`treeName(labelOf(node), key)`, not the raw label — and keeps only the
position-to-key step:

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
prefix. A label is content: an accessor that answers blank — a listing that could
not read a name, a record restored without its title — reads as the row's key
(`treeName`, the one reading the paint, the accessible name and the type-ahead
match share), so a tree never paints a nameless row no prefix can reach — the
seam is handed that same reading, not the raw label, so typing the key reaches a
row whose name never arrived (`tree.test.tsx`).
`reveal(key)` opens the path to a node and moves the cursor to it, and a
caller-driven cursor **lands the focus** on its row: the row is re-taken on the
next tick, after the runtime has handed the pressed control the focus. A key that
left the cursor where it was is not a move the tree made, so it cannot suppress
that retake.

A saved workspace records the folders a reader left open, so `initialExpanded`
is **data**: only an iterable carrying text keys opens anything (`expandedSet`),
and a value a store wrote as something else — an object (JSON has no `Set`), a
number, `null` — is no expansion, the state a fresh tree starts in, rather than
a `TypeError` on the first render. An entry that is not text is not a key.

The hierarchy itself is data too, so `roots` and every node's `childrenOf` are
read as **lists**: JSON writes `null` for a list a record never carried, and a
hand-built node often omits it, so a leaf with `children: null` is the ordinary
shape of a saved tree. An absent slot is no row (no roots) or no children (a
leaf), never a `TypeError` out of the first render — `flattenTree`, `branchKeys`
and `expandedPath` all read through `listOf`, and `childrenOf`'s type names the
absence (`behaviour/tree.test.tsx`'s stored-children case).

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
last label draws nowhere, so it cannot raise the axis either, and a chart with no
label paints no column (no mark, a `1` ceiling) rather than one unnamed slot. The
axis column
paints its ceiling at the plot's top and its floor on the plot's floor, so a
bar's top reads against the value beside it. A tick's **label takes its
precision from the step between ticks** (`tickLabel`): a four-step axis over
`0.005` prints `0, 0.0013, 0.0025, 0.0037, 0.005`, while `100` still prints
`0, 25, 50, 75, 100` — a fixed two decimals rounded three of the small steps
away and left a column of zeros for a chart of rates or seconds. The precision
never falls below whole numbers, so a revenue chart with a `250` step prints
`0, 250, 500, 750, 1000` instead of asking `toFixed` for `-1` decimals (which
throws, and took the renderer down with it). `ticks` names
the steps: a count the axis cannot read is four and a count past
`AXIS_STEP_LIMIT` (20) is capped, so a computed count cannot empty the axis or
mount an unbounded column of labels. Every mark sits at the centre of its
category slot — a bar, a line's point and the label under it share one `x` — so
a series with fewer values than labels stays in the columns it names. A plot's
side is often computed, so `chartBox` reads one the geometry cannot lay out
(`NaN`, an infinity, zero or a negative) as the component's default: the
viewBox, the axis column's height, the plot's box and every label's slot width
are built from it, and a `NaN` would have reached all four as `0`.

A category label is bounded by the slot it is given: the label's own box is the
slot, on one line, and the slot declares `overflow: "hidden"` — the clip the
runtime applies only when a box asks for it (the rule the sidebar and the
`Rating` half star measured). A word longer than its category is therefore cut
at the slot's edge rather than painting over the category beside it; shorten the
label or widen the plot to read one in full.

The picture announces its numbers: the chart is a group named by `aria-label`,
each series is an image named by its label, and the values travel in
`aria-description` (`Q1 32, Q2 48`) — a value past the last label is not
described and one the caller never supplied reads `no value` rather than the
`0` the geometry substitutes. A series with a labelled slot keeps its image even
when no value draws: a chart of zeros, or of negatives the geometry cannot show,
still reads `Q1 0, Q2 -4` rather than vanishing from the tree. A ring follows
the same rule per datum: a zero paints no slice and still reads `Referral 0`, so
a legend entry never stands without its number. A `Sparkline` is
one image, not a group of them: the caller's `aria-label` names it and its values
are its description. A name is a stored value as often as a literal, so a blank
one reads as the documented `Trend` rather than publishing an unnamed image. A
**colour** is stored the same way: a blank `color` takes the first categorical
swatch, because `color ?? swatch` only covers an absent prop and the runtime
drops an empty tint, which left a saved sparkline painting no line while its
description still read the values (`chosenColour`, held by
`src/behaviour/chart.test.tsx`).
The same rule covers the series: a series or ring datum with no words reads as
its **key** — `seriesName`, the one reading the image's name and the legend row
share — so a saved chart configuration cannot paint a nameless row beside an
unnamed image.

A chart's list is **stored data** too, so every part reads it through `listOf`:
only a list is a list, and a saved configuration whose `series`, `labels`,
`data`, `values` or legend `items` is `null` paints its empty frame instead of
throwing out of the render and taking the surface down. A series' own `values`
is read the same way, so a saved series with no samples paints no layer while
the rest of the chart paints. A list is stored twice, so an **entry** is read
too: `recordsOf` keeps the records that name themselves with a `key`, so a
series, ring datum or legend row whose slot the store wrote as a hole
(`[null, { … }]`) paints nothing while its neighbours paint, rather than
dereferencing `null` and taking the chart down. A **label** list is read the
same way but keeps its slots: a `labels` entry that is not text names no
category, paints a blank slot and leaves its datum announced by the number
alone — filtering it would move every later value under the wrong label, and
interpolating it announced the word `null`.

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

A key-value column width is a **measurement** — the widest label, a share of a
pane — so one the layout cannot paint (`NaN`, an infinity, zero or a negative)
reads as the default instead of reaching a track: `NaN` is dropped by the
runtime, and the label column would fall back to each label's own text width so
every value started somewhere else. An unreadable `valueWidth` fills the row,
like an omitted one (`src/behaviour/surfaces.test.tsx`).

A saved surface's optional slots are **data**: a store writes `null` for a field
a record never set, so a statistic card's `trend`, a toolbar's `search` and a
panel's or list's `rows`/`entries` can arrive nullish. Each is read as the
absence the prop already means — no trend, no field, no rows — so the rest of
the surface (the title, the toolbar's own controls, the card's reading) still
paints instead of being taken down by one dereference
(`src/behaviour/surface-boundary.test.tsx`). A list is stored **twice**, so an
entry is read too: `recordsOf` keeps the records that name themselves with a
`key`, so a property row or a key-value entry a migration lost the key from
paints **no row** while its neighbours paint. A keyless editable row used to
paint a nameless field addressed `property-undefined`, and a keyless key-value
entry painted a row with no identity to address. A builder's `fields` is read the
same way: a list, or no field list at all. **Add is offered only while there is
a field to name** — a new clause takes the first offered field, so a saved list
that arrived empty (or whose one entry this release cannot read) would append a
clause over no field: a press that composes a query narrowing nothing. Clear
stays, and a saved clause that names no field still paints its row so the reader
can edit or remove it (`src/behaviour/surfaces.test.tsx`). An entry whose `field`
is **blank** names no field either: it is the same absence a saved clause carries
before a field is picked, so it can never match a column id and is dropped from
the picker and from the list Add reads — a blank entry beside a real one used to
be the field Add chose, painting a clause whose picker read the blank entry's
label while the clause narrowed by no column.

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
(`src/behaviour/surface-a11y.test.tsx`). A documented default covers a **blank**
name as well as an absent one: the filter field and the toolbar's search field
read `Filter rows` and `Search`, the builder's title reads `Filters` and its
field picker reads the field's own name, the column menu and its surface read
`Columns`, the select-all box reads `Select every row` and a row's box reads
`Select this row`, and a property
panel's blank title paints no heading rather than an unnamed one. A clause's
field is content too: a clause that names no field — the shape a saved query can
carry — reads `Field` (`clauseFieldName`) in the picker's trigger, the value
field's name and the sentence, so it never publishes a nameless picker, a value
field named `" value"` or a sentence that opens on its comparison. A property
row's label is content too: a blank one reads as the row's key (`propertyName`,
the one reading the label column and an editable row's field name share), so a
saved object cannot leave its editor unnamed. A **key-value entry's** label is
the same kind of content and reads the same way: a saved row a migration lost
the title from paints its key rather than an empty label cell beside a value. A
column's label is the same kind of content: a blank one reads as its `id` in the
column menu (`columnName`).

The advanced filter's state is a **predicate tree**, not a string: a predicate
(field, comparison, value), an `all`, an `any` and a `not`. The tree is the
caller's, so a builder, a saved query and a table's own filter read one shape,
and the evaluation is a pure function:

```ts
const kept = filterByTree(rows, tree, (row, field) => row[field]);
```

A tree narrows a **table** through the same columns it paints: `useTable` takes
the tree as `filterTree` and resolves each clause's field through the column
whose `id` it names, so the builder that composes the tree and the grid that
runs it agree on what a field means. The tree narrows the records before the
text query does, so the field above the rows searches the set the tree kept and
the sort orders that same set. A chosen record the tree hides is released in
the same commit a query releases it, and a tree that keeps it again paints it
chosen; a field no column names reads blank, so a saved tree that mentions a
removed column narrows instead of failing. A **saved query** is data read by a
later release: the tree is a `FilterTree` schema, `readFilterTree(value)` is the
boundary that decodes one, and a comparison or node this build does not name is
**refused rather than approximated** — `filterByTree` keeps no row (never every
row, which would paint the records the query meant to hide) and `describeTree`
answers `a filter this release cannot read`, which the builder paints with
Clear. A `null`/`undefined` query is no filter. A controlled consumer building
the table with `constructGrid` reads the same seam:

```ts
import { fieldValueOf, filterByTree } from "@gpuixui/data";

const kept = filterByTree(rows, tree, fieldValueOf(columns));
```

The comparisons are literal — a value is never a pattern — and an order reads
both sides as numbers, so a field stored as a number and a clause typed as text
still compare. A side that does not read as a number satisfies no order, the
blank value a new clause starts with included, so an unfilled clause keeps no
row rather than reading the blank as `0`. An empty `all` matches everything,
which is what an empty builder means. The builder adds wherever a reader presses:
`appendAt(tree, path, node)` grows the `all`/`any` at a path with a clause or a
group, so a nested `any` gains a clause in place, while a path naming a clause or
the `not` itself leaves the tree alone. A path through a `not` is followed into
its one child, so a group a `not` negates is edited like any other — its Add
appends there and a clause's Remove takes that clause out. A `not` paints no Add
and the clause it holds directly paints no Remove, because a `not` cannot be left
without its child. **The groups are composed in the builder too**: a group's
combinator is a menu (`Match all`, `Match any`, `Negate`), and `Add group` nests
a group holding one blank clause, so a reader can write an `any` or a `not`
without hand-building the tree — `setGroupKind(tree, path, kind)` keeps a
group's children and `negateAt(tree, path)` is its own inverse. The toolbar's
search is the one **debounced** field (the core's `@tanstack/pacer` debouncer
owns the wait); the table's own filter field is deliberately not, because
`table-filter-lifecycle` measured the set narrowing as the reader types. The
wait is a reporting delay (`150` ms by default) that `debounceMs: 0` turns off;
a wait the toolbar cannot read — `NaN`, an infinity, a negative — is the
default rather than the immediate timer `setTimeout` makes of it, because a
`debounceMs` read from a setting is often not a number. The field's **hint** is
copy as often as a literal: a blank `placeholder` reads the documented `Search…`
(`visibleCopy`), because a default written as `placeholder ?? "Search…"` only
covers an absent prop, and a locale table's missing row is not an absent one.

## Styling

Resting appearance is a Tailwind class recipe compiled through
`@gpuixui/tw`'s default registry (shadcn's fixed metrics), cached once per
recipe per theme. Geometry the runtime exposes as behaviour — scroller axes,
column widths — is set in `style`, because `overflow-x`/`overflow-y` live only
in the primitives' registry and a column width is data.

**A numeric group is read through the seam that answers its absence.** A theme
a store hands back can lose `spacing`, `radius`, `borderWidth`, `iconSize` or
`density`, and every part used to index the group: the first layout that asked
for a gap, an edge, a glyph or a row height threw `TypeError: Cannot read
properties of undefined (reading 'xs')` and took the surface down, because a
paint seam runs mid-render and cannot throw. The parts read the primitives'
published readers (`spaceValue`, `borderWidthOf`, `radiusValue`,
`iconStepValue`, `iconSideOf`, `rowHeightOf`), which answer the library's number
for the group the theme lost; `paint-readers` holds every source under `src/` to
them.

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
| Charts (`BarChart`, `StackedBar`, `LineChart`, `DonutChart`, `Sparkline`) | shipped, window-verified (`chart-surface-lifecycle`: each series' own tint counted in a real plot, the stack, ring and spark painted, and a changed value repainting its bar) |

## Commands

```sh
nub run --filter @gpuixui/data test              # reducers + recipe guards
nub run --filter @gpuixui/data test:behaviour    # the real renderer
nub run --filter @gpuixui/data check-types
```
