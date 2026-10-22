# `@gpuixui/data`

Data presentation rendered by GPUix through React — the table core, the
sort/selection/filter controller it runs on, and column configuration with
resizing. Plan 610 owns the phases still to land (virtualisation, trees, charts,
the data surfaces).

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

## Shape

```
src/
  table/      Table, TableViewport, TableHeader, TableBody, TableRow,
              TableHeaderCell, TableCell, TableCaption, TableEmpty, TableSkeleton
  sort/       the reducer, the announced label, TableSortHeader
  selection/  press modes, range + anchor, retention, neighbour step
  filter/     the literal query, narrowTable, TableFilterField
  columns/    visibility, order, resize bounds, ColumnMenu, TableColumnDivider
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

The full screen — filter field, sort headers, column menu, keyboard walk, empty
state — is `examples/table.example.tsx`.

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
| Pinned / frozen columns | composition, not shipped (`data-grid-frozen-column`) |
| Virtualisation, trees, charts, data surfaces | plan 610 phases 4–7 |

## Commands

```sh
nub run --filter @gpuixui/data test              # reducers + recipe guards
nub run --filter @gpuixui/data test:behaviour    # the real renderer
nub run --filter @gpuixui/data check-types
```
