# `@gpuixui/data`

Data presentation rendered by GPUix through React — the table core, the
sort/selection/filter controller it runs on, column configuration with resizing,
the virtualized list over the runtime's own `<virtual-list>`, the virtualized
table that composes it with a fixed header, and the **data surfaces** (a
key-value list, a statistic card, a property panel, a toolbar and the advanced
filter's predicate tree). Plan 610 owns the phases still to land (trees and
charts).

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
| No `transform` | upstream issue #102 | Column resize and row moves change `left`/`width`, never a transform. |
| No canvas drawing | `chart-raster` | A chart is stacked `<svg>` (one tint each) or an `<img>` pixel buffer; see §Charts in plan 610. |
| Wheel moves every scrollable ancestor | `nested-scroll-lifecycle` | The table's `height` bounds the table; the body owns the vertical wheel. |
| Chord presses arrive on `click` | `modifier-select-lifecycle` | Selection reads `event.modifiers.{shift,cmd,ctrl}`; the anchor rules are `selection/logic`. |
| A hidden row's selection must be cleared | `table-filter-lifecycle` | `narrowTable` releases it in the same commit; `useTable` does the same for a sort/filter change. |
| Column changes are app state | `table-columns-lifecycle` | Hiding a column takes its width out of the content and shifts every later column by exactly that width; a move changes the order and not the width. The header and the cells read one `columns.visible` list. |
| A resize divider arms the capture | `column-resize-lifecycle` | `TableColumnDivider` listens to `onMouseDown` **and** `onMouseMove`, holds the press in a ref, and reads the width at each press. Its width is clamped to the column's own bounds. |
| A press stops at the first painted child | `press-routing-lifecycle` | A cell control that must hand a press to its row declares `pointerEvents: "none"`; a filled child is the hit-test boundary, not the innermost handler. |
| A list builds only a window | `virtual-list-lifecycle`, `virtual-list-windowed` | `VirtualList` wraps the host element: children mode retains every React child and skips build/paint off screen; `itemCount` + `estimatedItemHeight` + `windowStart` retains only the app's slice. A list sizes its viewport from a definite height. |
| `onVisibleRange` lags the paint | `virtual-list-windowed` | The reported range is **not** the window's source: the window follows the runtime's **scroll anchor** (`getListScrollTop`), which is exact even while the row heights are estimates. A window built from the reported range paints blank rows. |
| A reveal moves the window first | `virtual-list-windowed` | `useVirtualRows` moves the window to the row's own position in the same render, and the body scrolls to it in the layout effect after that commit. |

## Shape

```
src/
  table/      Table, TableViewport, TableHeader, TableBody, TableRow,
              TableHeaderCell, TableCell, TableCaption, TableEmpty, TableSkeleton
  sort/       the reducer, the announced label, TableSortHeader
  selection/  press modes, range + anchor, retention, neighbour step
  filter/     the literal query, narrowTable, TableFilterField
  columns/    visibility, order, resize bounds, ColumnMenu, TableColumnDivider
  virtual/    VirtualList over the runtime's <virtual-list>, both modes;
              VirtualTable, useVirtualRows, the window calculator
  surfaces/   KeyValue, StatCard, PropertyPanel, DataToolbar, AdvancedFilter
              and the predicate tree they read
  use-table   the uncontrolled controller joining sort, selection and filter
  use-columns the uncontrolled column controller
  internal/   the compile cache and the behaviour suites' test root
examples/     mountable screens (registered in examples/index.ts)
```

The reducers import no React: an application driving a grid from Effect or from
its own store reads the same functions that `useTable` does. The window
arithmetic is **`@tanstack/virtual-core`'s** — this package hands it the scroll
offset and the viewport and reads the range back — so the grid's windowing is
the same one a browser grid uses, driven without a DOM.

## Usage

```tsx
import { Table, TableBody, TableRow, TableCell, TableHeader, TableViewport } from "@gpuixui/data";
import { useTable } from "@gpuixui/data/use-table";

const table = useTable({ rows, keyOf: (row) => row.id, textOf, valueOf });

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
cell therefore, so a body row needs no spacer track. Pinned (frozen) columns are
not offered: the runtime paints no sticky position, so a frozen column is the
measured two-pane composition (`data-grid-frozen-column`) rather than an order
flag — plan 610's frozen-column row owns it.

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
runtime the `windowStart` the range produced.

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

The full screens — the files table with filter, sort headers, column menu and
keyboard walk, the 2 000-row list, the 1 000-row virtualized table and the
**data surfaces** over one object — are `examples/table.example.tsx`,
`examples/virtual-list.example.tsx`, `examples/virtual-table.example.tsx` and
`examples/surfaces.example.tsx`.

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

The advanced filter's state is a **predicate tree**, not a string: a predicate
(field, comparison, value), an `all`, an `any` and a `not`. The tree is the
caller's, so a builder, a saved query and a table's own filter read one shape,
and the evaluation is a pure function:

```ts
const kept = filterByTree(rows, tree, (row, field) => row[field]);
```

The comparisons are literal — a value is never a pattern — and an order reads
both sides as numbers. An empty `all` matches everything, which is what an
empty builder means. The toolbar's search is the one **debounced** field (the
core's `@tanstack/pacer` debouncer owns the wait); the table's own filter field
is deliberately not, because `table-filter-lifecycle` measured the set narrowing
as the reader types.

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
| Selection reducer + row paint + keyboard walk | shipped (the walk is composed in the example; no roving-focus API in the runtime) |
| Filter reducer + `TableFilterField` | shipped, window-verified |
| Column visibility + order (`ColumnMenu`, `useColumns`) | shipped, window-verified |
| Resizable columns (`TableColumnDivider`) | shipped, window-verified |
| Virtualized lists (`VirtualList`, both host modes) | shipped, window-verified |
| Virtualized table (`VirtualTable`, `useVirtualRows`) | shipped, window-verified |
| Data surfaces (`KeyValue`, `StatCard`, `PropertyPanel`, `DataToolbar`, `AdvancedFilter`) | shipped, window-verified |
| Pinned / frozen columns | composition, not shipped (`data-grid-frozen-column`) |
| Trees, charts | plan 610 phases 5–6 |

## Commands

```sh
nub run --filter @gpuixui/data test              # reducers + recipe guards
nub run --filter @gpuixui/data test:behaviour    # the real renderer
nub run --filter @gpuixui/data check-types
```
