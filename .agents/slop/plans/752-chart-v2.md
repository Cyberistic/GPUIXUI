# 752 — Charts v2: the multi-colour surface, the config seam and the missing types

| Field | Value |
| --- | --- |
| Status | in progress — the scene bridge lands; the frame's document route, the config seam and the new types are next |
| Phase | D (data presentation) |
| Depends on | `@gpuixui/data` chart module, `@gpuixui/tokens` series scale, `@gpuixui/motion` |
| References | shadcn/ui v4 `apps/v4/registry/new-york-v4/ui/chart.tsx`, Recharts v3, GPUI Kit `component/chart`, `chart-raster` and `chart-surface-lifecycle` probes |
| Workstream | charts |

## 1. The problem

`@gpuixui/data` ships nine chart types and a shared frame. Against
shadcn/ui's chart and GPUI Kit's chart it is behind in three ways that matter
more than the number of types:

1. **The paint route costs everything.** A chart is one `<svg>` per series,
   each a single tinted mask, because `<svg source>` rasterises its markup
   through GPUI's icon element. So a chart cannot paint two colours in one
   element, cannot paint a real gradient, and cannot paint a translucent
   mark over a mark beneath it. The fade under an area is a stack of nested
   bands; the shadow under a bar is not there at all.
2. **There is no config seam.** shadcn's `ChartConfig` is the whole point of
   its chart: labels, icons and colour tokens live in one table that is
   independent of the data, so a chart's identity is shared between charts and
   a theme owns the colours. Here the caller repeats `key`/`label`/`values`
   per series and passes colours separately, and the legend and the tooltip
   each re-read the series list to find a name.
3. **The reference types are missing.** GPUI Kit ships a candlestick and a
   sankey; Recharts ships a scatter, a funnel and a radial bar. A candlestick
   and a scatter are both pure geometry over the existing signed range, and
   the reference line, the pinned domain, the vertical grid, the second
   y-axis, the stacked-area baseline and the per-datum emphasis are the
   features Recharts users reach for first.

## 2. What the runtime allows (measured, not assumed)

The measured facts, from `docs/gpuix-capabilities.md` and the
`chart-raster` probe:

| Fact | Evidence | Consequence |
| --- | --- | --- |
| `<svg source>` paints **one tint** (`style.color`) | `chart-raster`, `svg-pattern` | one element, one colour |
| `ImgInstance.setImage(bytes)` decodes **SVG** through GPUI's own `SvgRenderer` | `chart-raster`: `setImage(Buffer.from(PLOT_SVG))` painted `#B14AFF`, `#00A893`, `#FF8A00` — three fills, three colours, one element | **the multi-colour vector route** |
| The decoder is `gpui::Image::from_bytes(format, bytes).to_image_data(svg_renderer)` | `references/gpuix/packages/native/src/custom_elements/img.rs` `render_image_from_encoded` | real SVG: gradients, strokes, per-fill colour, text |
| A resize re-scales the buffer with its box, no second push | `chart-raster`: a 120 → 180 box made the bar 1.5× as wide | the chart follows a splitter |
| The buffer must be pushed from a **layout effect** | `content-surfaces` | the paint order is a layout effect, not a passive one |
| A transparent pixel composites onto the surface behind the element | `chart-raster` | a chart inherits its card, paints no surface of its own |
| `<canvas>` paints nothing; there is no chart host | `content-surfaces` | a chart is composed, never provided |
| Pointer `mouseEnter`/`mouseMove`/`mouseLeave` reach a host element with `x`/`y` | `docs/gpuix-capabilities.md` | the hover readout is a hit zone over the plot |
| `onLayout` reports a **size**, not a move | `surface-origin` | the plot's box is measured, the origin is not trusted |

**The route this plan takes: one `<img>` per plot, painted with the chart's
whole SVG markup through `setImage`.** One element, every colour, real
gradients. The axis, the category labels and the legend stay `<text>` and
boxes beside it, because the raster carries the marks and the runtime's text
host is what a reader's accessibility tree names.

The `<svg source>` route stays as the **fallback** for a caller who cannot
push an image — a headless renderer, a screenshot — so the two are one code
path with two painters.

## 3. What ships

### 3.1 The multi-colour surface

| Piece | Change |
| --- | --- |
| `chart/svg.ts` | **new** — builds one SVG document for a whole chart: `defs` with per-series linear gradients, the marks in the series' own fills, the grid, the axes' rules. One function, `chartSvg(context)`, so the markup is a pure value a test can read. |
| `chart/mark.ts` | **new** — the mark model gains `fill`, `stroke`, `opacity`, `dash` and `gradient`, so a mark is no longer "one colour, one shape". The old `ChartMark` is kept as the shape and gains the paint. |
| `chart/surface.tsx` | **new** — `<ChartSurface>`: an `<img>` with `ref.setImage(Buffer.from(markup))` from a layout effect, re-pushed when the markup or the box changes. It reports the failure through `Effect.try` rather than swallowing it. |
| `chart/frame.tsx` | the frame paints through the surface instead of the per-series `<svg>` stack. The per-series `<svg>` route stays behind `render="mask"`. |

### 3.2 The config seam (shadcn's `ChartConfig`)

| Piece | Change |
| --- | --- |
| `chart/config.ts` | **new** — `ChartConfig`: a keyed table of `{ label?, icon?, color?, theme? }`. `theme` is `{ light, dark }`; the mode decides. `chartConfigOf` reads a config the way a store wrote it. |
| `chart/config.ts` | `seriesFromConfig(config, data)` — the shadcn `dataKey` route: a table of records plus a config, and the series fall out of it. This is the "their logic" the request names. |
| `chart/chart.tsx` | every chart accepts `config?: ChartConfig` and `data?: ReadonlyArray<Record<string, unknown>>` beside the existing `series`/`labels`. The config owns the label, the icon and the colour; the series list stays the escape hatch. |

### 3.3 The missing geometry

| Piece | Change |
| --- | --- |
| `chart/geometry.ts` | `referenceLine` (a dashed rule at a value), `pinnedRange` (the `y_domain` of GPUI Kit: a range the caller names, so a price that never nears zero is not pressed flat), `verticalGrid` (the `grid_columns` of GPUI Kit), `scatterMarks` (a point per datum, no line), `candleMarks` (OHLC bodies and wicks, up and down in two theme roles), `funnelMarks` (a stage per datum, each a share of the first). |
| `chart/chart.tsx` | `ScatterChart`, `CandleChart` and `FunnelChart` join the nine types. A `ComposedChart` gains a `lineKeys` per side, so a chart carries a **second axis** for a rate beside a count. |
| `chart/frame.tsx` | the frame gains `secondaryAxis` (a right-hand tick column), `referenceLines`, `verticalGrid`, `pinnedRange`, `emphasis` (a datum the pointer is on, painted larger), `crosshair` (a vertical rule at the hovered column, the Recharts `cursor` cue). |

### 3.4 The hover readout, at Recharts quality

Recharts' tooltip is a card with a label, a row per series, an indicator and
a value. Ours has that. What it lacks:

| Piece | Change |
| --- | --- |
| `chart/frame.tsx` | the readout **flips** near the plot's edges, so it never leaves the plot; it follows the pointer in both axes; it paints a **crosshair** rule at the hovered column; the hovered series' point **enlarges** (the GPUI Kit "halo"). |
| `chart/frame.tsx` | a per-datum readout for the ring charts — a pie's slice names itself, the way GPUI Kit's pie names the datum under the cursor, not the series. |

### 3.5 The docs

| Piece | Change |
| --- | --- |
| `packages/data/docs/charts.mdx` | a section per type, the config seam, the surface route, and the limits. |
| `apps/docs/src/components/docs/charts-demo.tsx` | the browser approximation is replaced by the **same geometry** rendered as real SVG in the browser — the markup is one function, so the page paints the chart's own document. |

## 4. Files

| File | Change |
| --- | --- |
| `packages/data/src/chart/mark.ts` | **new** — the mark model with paint. |
| `packages/data/src/chart/svg.ts` | **new** — the whole-chart SVG document. |
| `packages/data/src/chart/surface.tsx` | **new** — the `<img>` surface that pushes the document. |
| `packages/data/src/chart/config.ts` | **new** — `ChartConfig` and `seriesFromConfig`. |
| `packages/data/src/chart/geometry.ts` | the new geometry: reference lines, a pinned range, a vertical grid, scatter, candle, funnel. |
| `packages/data/src/chart/frame.tsx` | the surface route, the secondary axis, the crosshair, the emphasis, the flipping readout. |
| `packages/data/src/chart/chart.tsx` | the three new types, the config props. |
| `packages/data/src/chart/logic.ts` | the mark model moves out; `logic.ts` keeps the scale and the names. |
| `packages/data/src/chart/recipe.ts` | the recipes for the new surfaces. |
| `packages/data/src/chart/{mark,svg,config,geometry}.test.ts` | **new** — one case per rule, both directions. |
| `packages/data/src/behaviour/chart-*.test.tsx` | a real-renderer case per new type and per new frame option. |
| `packages/data/examples/chart.example.tsx` | every type on one surface, the new ones included. |
| `packages/data/docs/charts.mdx` | the sections. |
| `apps/docs/src/components/docs/charts-demo.tsx` | the browser preview paints the chart's own markup. |
| `apps/playground/src/live/chart-surface.ts` | the fixture for the new surface's window probe. |
| `.agents/slop/COMPONENTS.md` | the inventory row. |
| `.agents/slop/TODO.md` | the tasks. |

## 5. Verification

```sh
nub run --filter @gpuixui/data test
nub run --filter @gpuixui/data test:behaviour
nub run --filter playground build
nub apps/playground/dist/live/run.js --only chart-surface-lifecycle
nub run check
nub run lint
nub run test
```

## 6. STOP conditions

- **The `setImage` route does not paint in a real window.** The probe
  `chart-raster` measured it, but if the shipped surface cannot push bytes
  into an `<img>` inside the library's own frame, stop and report: the
  fallback is the `<svg source>` mask route, which is what ships today, and
  the config seam and the new geometry land without it.
- **The `<img>` route cannot carry the accessibility tree.** A chart's
  picture of numbers is announced through `aria-label`/`aria-description` on
  the element that paints it; an `<img>` takes `aria-label` but maybe not
  `aria-description`. If the description is lost, the readout and the
  per-series description move to a sibling `<div role="img">` that owns the
  names, and the surface paints inside it.
- **A gradient needs a `clipPath` or a `mask`.** GPUI's SVG decoder may not
  carry them. If it does not, the fade stays the nested-band route and the
  plan says so in the docs.
- **The `setImage` push throws.** `Effect.try` reports the failure; the
  surface falls back to the mask route and the chart still paints.

## 7. Acceptance

- One `<img>` per plot, carrying the chart's whole SVG document, with **two
  series in two colours inside one element** — the claim `chart-raster`
  proved for a hand-written SVG and this proves for the shipped chart.
- A real gradient under an area, not nested bands.
- A `ChartConfig` that owns the labels, the icons and the colours, and a
  `data` route that builds the series from it.
- `ScatterChart`, `CandleChart` and `FunnelChart` shipped, each with a
  usage block, an API table, a logic test, a behavioural case and an example.
- A reference line, a pinned range, a vertical grid, a second axis and a
  crosshair, each with a test in both directions.
- The hover readout flips at the plot's edges and follows the pointer.
- Every number on the page is derived from the code, not restated.
- `nub run check`, `nub run lint`, `nub run test` green.

---

## 8. Why Recharts is not used — the measured answer

The request asked whether the package could switch to Recharts. It cannot, and
the reason is not the output format — it is the **input**.

### 8.1 Recharts needs a DOM

Recharts renders `<rect>`, `<path>`, `<g>` and `<text>` as **React elements**,
so it needs `document.createElementNS`, real attribute mutation, and
`getBoundingClientRect`. The runtime publishes **twelve** host elements
(`packages/react/jsx-runtime.d.ts`):

```
div · text · img · svg · canvas · input · textarea · anchored · code · diff · markdown · "virtual-list"
```

There is no `<rect>`, no `<path>`, no `<g>`, no SVG `<text>`, and no DOM of any
kind. `ResizeObserver`, `document` and CSS do not exist either.

### 8.2 Recharts needs per-mark pointer events

Its tooltip, legend highlight, brush and zoom all hang off **individual
marks** — `<Bar onMouseEnter>`. The runtime's SVG route cannot carry them:

| Route | What it is | What it cannot do |
| --- | --- | --- |
| `<svg source>` | `gpui::svg()` — an **icon element** (`custom_elements/img.rs`) | one tint; no child elements; `supported_events` is `click`, `mouseEnter`, `mouseLeave`, `fileDrop` — **no `mouseMove`**, and no per-mark events |
| `setImage(bytes)` | `gpui::Image::from_bytes(...).to_image_data(svg_renderer)` → a **`RenderImage`** | it is a **picture**: rasterised pixels have no hit-testable sub-elements |

So `setImage` buys **colour and gradients**, and costs **per-mark
interactivity**.

### 8.3 The substitute, and it is already proven here

A chart's interactivity is **hit zones**: a grid of transparent `<div>`s over
the plot, one per category, each reporting the pointer's `x`/`y`. The
geometry then names the datum under the pointer. The shipped charts already
work this way, and the plan keeps it.

Two measured rules make the surface and the zones coexist:

- an element that **paints a fill** takes the pointer hit test
  (`style::should_occlude`), so the surface is painted with
  `pointerEvents: "none"` — it paints and the pointer passes through it;
- `position: absolute` occludes on its own, so the surface's own absolute
  placement would block the zones **without** that rule. This is why the
  surface carries `pointerEvents: "none"`.

### 8.4 What is taken from shadcn/ui instead

Not the library — the **shape of the API**:

| shadcn/ui | What lands here |
| --- | --- |
| `ChartConfig` | `packages/data/src/chart/config.ts` — a keyed table of label, icon and colour, decoupled from the data |
| `dataKey` + a `data` array of records | `seriesFromConfig(config, data)` — the series fall out of the config and the table |
| `theme: { light, dark }` per entry | `configColour(entry, mode)` |
| `ChartTooltip` / `ChartTooltipContent` | the frame's readout, already there, brought to Recharts' behaviour (edge-flip, crosshair, emphasis) |
| `ChartLegend` / `ChartLegendContent` | `ChartLegend`, already there, driven by the config's icons |
| `accessibilityLayer` | the per-series `aria-label`/`aria-description`, already there |

### 8.5 The rendering decision

**The document route is the default**, because a chart that cannot paint two
colours in one element is not at the level of the reference, and the
`setImage` route is measured to work in a real window. The mask route stays
as the fallback for a host that cannot decode an image.

The interactivity does not change either way: the hit zones are the plot's
children and the surface is behind them.

---

## 9. TanStack Charts — the one library that fits

The request named Recharts, which cannot be used (§8). **TanStack Charts can.**

### 9.1 What it is

`https://github.com/TanStack/charts` — MIT, by Tanner Linsley, published
`1.2.1`. It is **not** a DOM chart library. It is a **scene compiler**: a
definition plus data plus a size compiles to a `ChartScene`, and a **renderer**
walks the scene and paints it.

The scene is renderer-neutral by construction. Its node kinds are
`group`, `rule`, `polyline`, `area`, `dot`, `rect` and `label` — the portable
primitives, each with a `SceneStyle` carrying `fill`, `fillOpacity`, `stroke`,
`strokeWidth`, `opacity`, `strokeDasharray`. `ChartPoint` records sit beside
the painted nodes, so **a datum keeps its identity without being an
element** — which is exactly what makes per-mark interaction possible
without per-mark DOM.

### 9.2 Measured, in a DOM-free environment

The proof ran in `vitest` with `environment: "node"` — `typeof document` and
`typeof window` are `undefined`:

| Claim | Measurement |
| --- | --- |
| The scene path imports and runs without a DOM | `scene.ts`, `runtime.ts`, `types.ts`, `mark.ts`, `svg-renderer.ts`, `nearest.ts`, `focus*.ts`, `interaction-cursor.ts`, `tooltip-model.ts` — **no** `document`, `window`, `HTMLElement`, `getBoundingClientRect` or `ResizeObserver` |
| The DOM is confined to the renderers | only `canvas.ts`, `dom-types.ts`, `dom-text.ts` name them |
| A multi-series scene builds | `barY` + `lineY` + `areaY` over three rows → a scene whose nodes are `rect`, `polyline` and `area` |
| The scene serialises to an SVG document | `renderChartSvg(scene, { ariaLabel })` → one `<svg>` carrying `#2563eb` **and** `#60a5fa` — **two series, two colours, one element** |
| The hit test is geometric | `nearestScenePoint(scene, x, y, maxDistance)` — a pure function over the scene, no DOM event |

The rendered markup is ordinary SVG: `<g data-ts-key="marks">`,
`<rect fill="#2563eb" x="44.85" y="131.21" width="129.34" height="105.79"/>`.

### 9.3 The route, end to end

```
definition + data + size
        │  createChartScene  (pure, DOM-free)
        ▼
   ChartScene  ──────────────► nearestScenePoint(scene, x, y)
        │                              │
        │  renderChartSvg              │  the pointer's answer
        ▼                              ▼
   one SVG string  ──────────► setImage(bytes)  ─► GPUix's SVG rasteriser
        (colour, gradients)                    (one element, every fill its own)
```

The GPUix side is **already measured**: `chart-raster` pushed three coloured
fills through `setImage` and they painted. So the runtime half is done.

### 9.4 What it costs

| Cost | Number |
| --- | --- |
| Bundle, "compact-scale line scene" | **34 kB** minified, **12 kB** gzip |
| Bundle, "D3-scale line + static SVG" | **60 kB** minified, **22 kB** gzip |
| Bundle, "representative marks" | **83 kB** minified, **30 kB** gzip |
| Bundle, "React line consumer" | **109 kB** minified, **40 kB** gzip |

The published baseline is `benchmarks/bundle-size/universal-baseline.json`.

The `d3-*` dependencies are the bulk of it (`d3-scale`, `d3-shape`,
`d3-force`, `d3-geo`, `d3-sankey`, `d3-hierarchy`, `d3-brush`, `d3-zoom`,
`d3-contour`, `d3-delaunay`, `d3-hexbin`, `d3-selection`). A chart library
that pulls in `d3-selection` — a **DOM selection** library — for a runtime
with no DOM is the wrong shape, but the *scenes* it compiles do not need it.

### 9.5 The decision

**Take the dependency.** The owner decided the charts are built on TanStack
Charts, and the measurements support it: the scene path is DOM-free, the
bundle carries no d3 when the subpaths are used, and the output is
production-grade — axes, tick rules, tick labels, focus layers, per-series
fills and real `fill-opacity` fades in one document.

What ships:

| Package | Why |
| --- | --- |
| `@tanstack/charts` `1.2.1` | the scene compiler, the marks, the ticks and the SVG serialiser |
| `@tanstack/charts-scales` `1.2.1` | the band and linear scales, with **no dependencies of its own** |

Both are imported **by subpath** — `/scene`, `/line`, `/bar`, `/area`, `/tick`,
`/svg`, `/scales/band`, `/scales/linear` — so `d3-scale`, `d3-shape`,
`d3-selection`, `d3-force`, `d3-geo` and the rest stay out of the bundle.
Measured: a bundle of the scene path, the SVG renderer, the bar/line/area
marks and the compact scales is **57 kB minified / 21 kB gzip** and carries
**zero** d3 references; the minimal scene is **41 kB / 15 kB**.

TanStack's DOM renderers (`/canvas`, `/dom`, `/dom-text`) are **not** used:
they name `document`, `window`, `HTMLElement`, `getBoundingClientRect` and
`ResizeObserver`, and this runtime has none of them.

The earlier alternative — take the architecture, not the dependency — is
recorded below because it is the fallback if the package's API keeps moving.

#### The earlier alternative, for the record

TanStack's design is the right one for this runtime and its implementation is
MIT and proven DOM-free. But:

- the package is **heavy** (12–40 kB gzip) for a desktop component library
  whose charts are nine types;
- it is **unreleased on `main`** for much of its surface, and the repo
  carries `1.0-READINESS.md`, `API-FRICTION.md` and
  `API-HARMONIZATION-ROADMAP.md` — the API is still moving;
- the repo's own spike says a native renderer "cannot implement the current
  public contract honestly", because `ChartRenderer.mount` takes an
  `HTMLElement`.

The earlier plan was:

1. **Adopt the architecture.** The `ChartScene` model — renderer-neutral
   nodes, `ChartPoint` identity beside the paint, a pure scene compiler and a
   pure geometric hit test — is the design this package should have, and it
   is what the `setImage` route makes possible.
2. **Write the GPUix renderer against it**, as `packages/data/src/chart/scene.ts`
   plus `renderer.tsx`: a scene visitor that turns a `ChartScene` into the
   SVG document the surface pushes, and a `nearestScenePoint` equivalent for
   the hit zones.
3. **Do not depend on `@tanstack/charts`** yet. Re-implement the scene
   compiler's *shape* — which is what this package already does in
   `logic.ts` and `geometry.ts` — and re-evaluate the dependency once the
   package settles past 1.0.

**That is what §9.5 reversed**, and the reversal is measured rather than
assumed: the dependency costs 15–21 kB gzip with no d3, and the output is
production-grade on the first run.

### 9.6 What we learn from it, whatever we do

| TanStack | What it tells us |
| --- | --- |
| `SceneNode` = group/rule/polyline/area/dot/rect/label | the mark model should be **these seven**, not rect/path/circle/ellipse |
| `SceneStyle` carries the paint | the paint belongs on the mark, as this plan's `mark.ts` already does |
| `ChartPoint` beside the nodes | a datum's identity is **not** the element — so a hit test can be geometric |
| `nearestScenePoint(scene, x, y)` | the hover readout should **hit-test the scene**, not use a hit-zone grid |
| `renderChartSvg(scene, options)` | one function, scene → document — this plan's `chartSvg` is the same shape |
| focus is a **renderer-neutral guide** | the crosshair and the emphasis are **scene nodes**, not overlay divs |
