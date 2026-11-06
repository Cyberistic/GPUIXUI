# 751 — Native charts: types, styling and the chart page

| Field | Value |
| --- | --- |
| Status | done — every type ships, the page documents each with usage and a preview mode; the hover readout is not pointer-driven in the test renderer |
| Phase | D (data presentation) |
| Depends on | `@gpuixui/data` chart module, `@gpuixui/tokens` series scale |
| References | shadcn/ui v4 `apps/v4/app/(app)/charts`, Recharts, GPUI Kit `crates/component/src/chart` |
| Workstream | charts |

## 1. Problem

The package ships bar, stacked bar, line, donut and sparkline. Every mark is a
filled rectangle or a filled path, so a "line" is a filled polygon, there is no
area, radar, radial, pie, horizontal bar or negative value, and no hover
readout. The chart page shows one usage block and one API table, not the types.

## 2. What the runtime allows (measured)

`docs/gpuix-capabilities.md`:

- `<svg source>` paints its markup **as one tint** (`style.color`) but keeps the
  markup's own coverage: a stroked square paints its stroke, and a path's
  subpaths all paint (`svg-pattern`).
- Element `style.opacity` composites (`keyboard-focus-dim`).
- The element scales a view box by its **width** and clips overflow.
- Pointer `mouseEnter` / `mouseMove` / `mouseLeave` reach a host element
  (`EventPayload.x` / `y`).

So the paint route stays **one `<svg>` per series per layer**, and the new
geometry is strokes, circles, polygon fills and opacity bands.

## 3. Types and options to ship

| Type | Recharts counterpart | New options |
| --- | --- | --- |
| `BarChart` | `BarChart` | `orientation` (vertical/horizontal), `negative` values, `radius`, `valueLabels` |
| `StackedBar` | stacked bar | `radius`, `percent` |
| `LineChart` | `LineChart` | `curve` (linear/smooth/step), `dots`, `dashed`, `lineWidth` |
| `AreaChart` | `AreaChart` | `curve`, `stacked`, `gradient`, `fillOpacity`, `dots` |
| `PieChart` | `PieChart` | `innerRadius`, `padAngle`, `labels` |
| `DonutChart` | donut | `innerRadius`, `padAngle`, `centerLabel` |
| `RadarChart` | `RadarChart` | `levels`, `grid`, `fillOpacity`, `dots` |
| `RadialChart` | `RadialBarChart` | `max`, `innerRadius`, `centerLabel` |
| `Sparkline` | — | `curve`, `filled` |

Shared, on every cartesian type:

| Option | Default | Consequence |
| --- | --- | --- |
| `grid` | `true` | horizontal grid lines in the border role |
| `tooltip` | `true` | hovered category shows a card with each series' value |
| `colors` | theme scale | palette override; a series may also carry `color` |
| `legend` | `"bottom"` when >1 series | `"top"`, `"bottom"` or `false` |
| `axis` / `ticks` | `true` / `4` | y tick column and its steps |
| `xLabels` | `true` | category labels under the plot |

## 4. Paint model

- `ChartMark` gains `circle`; `path` gains `fill` | `stroke` and a width.
- A series paints **one named layer** carrying its accessible readout, plus
  decorative layers (`aria-hidden`-equivalent: no role, no name) for the area
  fill and gradient bands.
- Gradient = the area path drawn in N bands of increasing height at equal
  opacity; overlaps accumulate toward the line, so the fill fades to the
  baseline without a gradient element.
- Grid is one decorative layer of 1px rects at tick heights.
- Hover is a row of category hit zones over the plot; the card is a themed
  surface positioned above the column.

## 5. Files

| File | Change |
| --- | --- |
| `packages/data/src/chart/logic.ts` | range/baseline, curve paths, stroke/circle marks, area bands, radar, radial, horizontal + negative bars |
| `packages/data/src/chart/logic.test.ts` | one case per geometry rule, both directions |
| `packages/data/src/chart/chart.tsx` | new components and shared frame options |
| `packages/data/src/chart/recipe.ts` | grid, tooltip card, label recipes |
| `packages/data/examples/chart.example.tsx` | every type on one surface |
| `packages/data/src/behaviour/chart*.test.tsx` | a real-renderer case per type |
| `packages/data/docs/charts.mdx` | a section per type with usage + API |
| `apps/docs/src/components/docs/charts-demo.tsx` | browser approximation per type |
| `.agents/slop/COMPONENTS.md` | inventory rows |

## 6. Verification

```sh
nub run --filter @gpuixui/data test
nub run --filter @gpuixui/data test:behaviour
nub run --filter @gpuixui/docs test
nub run check
```

## 7. STOP conditions

- The runtime drops stroke or circle markup → keep the rect/path route and
  document the type as unavailable rather than faking it.
- A geometry rule needs a transform → place the shape arithmetically instead.

## 8. Acceptance

Every type above renders through the shipped components, has a usage block and
an API table on `/data-display/charts`, a logic test, a behavioural case, and an
example. No browser reimplementation is presented as the native chart.
