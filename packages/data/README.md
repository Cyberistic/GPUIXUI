# `@gpuixui/data`

Data presentation rendered by GPUix through React — the table core, the
sort/selection/filter controller it runs on, column configuration with resizing,
and the virtualized list over the runtime's own `<virtual-list>`. Plan 610 owns
the phases still to land (the virtual table, trees, charts, the data surfaces).

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
| `onVisibleRange` lags the paint | `virtual-list-windowed` | The app's window exceeds the viewport plus overdraw, and a reveal moves `windowStart` before `scrollToItem` (via the list's ref). |

## Shape

```
src/
  table/      Table, TableViewport, TableHeader, TableBody, TableRow,
              TableHeaderCell, TableCell, TableCaption, TableEmpty, TableSkeleton
  sort/       the reducer, the announced label, TableSortHeader
  selection/  press modes, range + anchor, retention, neighbour step
  filter/     the literal query, narrowTable, TableFilterField
  columns/    visibility, order, resize bounds, ColumnMenu, TableColumnDivider
  virtual/    VirtualList over the runtime's <virtual-list>, both modes
  use-table   the uncontrolled controller joining sort, selection and filter
  use-columns the uncontrolled column controller
  internal/   the compile cache and the behaviour suites' test root
examples/     mountable screens (registered in examples/index.ts)
```

The reducers import no React: an application driving a grid from Effect or from
its own store reads the same functions that `useTable` does.

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

The full screens — the files table with filter, sort headers, column menu and
keyboard walk, and the 2 000-row list — are `examples/table.example.tsx` and
`examples/virtual-list.example.tsx`.

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
| Pinned / frozen columns | composition, not shipped (`data-grid-frozen-column`) |
| Virtual table, trees, charts, data surfaces | plan 610 phases 4b–7 |

## Commands

```sh
nub run --filter @gpuixui/data test              # reducers + recipe guards
nub run --filter @gpuixui/data test:behaviour    # the real renderer
nub run --filter @gpuixui/data check-types
```
