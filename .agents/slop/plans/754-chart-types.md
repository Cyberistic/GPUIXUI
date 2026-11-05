# 754 — The three remaining chart types: treemap, sankey and sunburst

| Field | Value |
| --- | --- |
| Status | done — the treemap, the sankey and the sunburst land, with the scene compiler resolving their layouts and the document route painting them |
| Phase | D (data presentation) |
| Depends on | `@gpuixui/data` chart module, the scene bridge (plan 752), `@tanstack/charts` |
| References | Recharts v3 (`Treemap`, `Sankey`, `SunburstChart`), TanStack Charts' `hierarchy/treemap`, `hierarchy/sunburst` and `network/sankey` marks, GPUI Kit's `SankeyChart` |
| Workstream | charts |

## 1. The problem

Against Recharts' thirteen chart types this library ships ten: `LineChart`,
`AreaChart`, `BarChart`, `ScatterChart`, `ComposedChart`, `FunnelChart`,
`PieChart`/`DonutChart`, `RadarChart` and `RadialChart` (plus `CandleChart`,
which GPUI Kit has and Recharts does not, and `Sparkline`).

**Three are missing**, and they are the three that do not lay their marks out
on an x/y axis:

| Recharts type | What it draws |
| --- | --- |
| `Treemap` | a hierarchy as nested rectangles, each area its value |
| `Sankey` | a flow between nodes, each ribbon's thickness its value |
| `SunburstChart` | a hierarchy as concentric rings, each arc its value |

They are the ones a reader reaches for when the question is **"where does the
time go"** rather than **"how much of each category"** — a part-to-whole
hierarchy, a flow between stages, and the same hierarchy read as rings. A
dashboard without them can show a breakdown but not a structure.

## 2. What the runtime allows, and what TanStack gives

Measured, in a plain Node process with `typeof document` and `typeof window`
both `undefined`:

- `@tanstack/charts/hierarchy/treemap` — `treemap(rows, options)` compiles to a
  scene and serialises to one SVG document. **Measured**: a flat hierarchy of
  one root and three children compiled to a scene and serialised to one
  document carrying **three differently coloured `<rect>`s**.
- `@tanstack/charts/hierarchy/sunburst` — `sunburst(rows, options)` runs
  **inside** `polar(...)`, with `scales: { x: null, y: null }`. **Measured**:
  the same hierarchy compiled to a scene and serialised to one document
  carrying two coloured `<path>`s.
- `@tanstack/charts/network/sankey` — `sankeyDiagram({ nodes, links, ... })`
  resolves a flow layout and then composes ordinary marks over it. **Measured**:
  a four-node, four-link graph compiled to a scene and serialised to one
  document carrying the node `<rect>`s and the link `<line>`s.

So the **scene bridge** already speaks all three: the scene path is DOM-free
and carries every mark's own colour in one document, which is exactly what
the document route paints.

**One difference from the cartesian marks**: the polar and sankey marks do
not take `x`/`y` channels the way `barY` does. The sunburst must be wrapped
in `polar(...)`, and the sankey composes its own marks over the layout it
resolved. So the bridge needs a **kind** beyond `bar | line | area`.

## 3. The shape of the work

### 3.1 The bridge

`SceneChartKind` grows a variant per layout, and `sceneDefinition` reads it:

| Kind | Mark | Scales |
| --- | --- | --- |
| `treemap` | `treemap(rows, { nodeId, parentId, value, fill })` | `x`/`y` linear over the plot |
| `sunburst` | `polar({ marks: [sunburst(...)], scales: { angle: null, radius: null } })` | `x: null`, `y: null` |
| `sankey` | `sankeyDiagram({ nodes, links, marks })` | `x: null`, `y: null` |

The treemap's rows are a **flat hierarchy**: every row names its `nodeId` and
its `parentId`, and the **root** is the one row whose parent is absent. The
scene compiler rejects a hierarchy with two roots and one with none, so the
bridge must build the root itself when the caller gives leaves only.

### 3.2 The components

| Component | Props beyond the shared frame |
| --- | --- |
| `TreemapChart` | `nodes`: a flat list of `{ id, parentId?, name, value }`; `method`: `squarify` (the default), `binary`, `dice`, `slice`, `slice-dice`; `ratio`; `paddingInner`; `paddingOuter` |
| `SankeyChart` | `nodes`: `{ id, name }`; `links`: `{ source, target, value }`; `nodeWidth`; `nodePadding`; `align`; `iterations` |
| `SunburstChart` | `nodes`: the same flat hierarchy as the treemap; `innerRadius`; `ringPadding`; `visibleDepth` |

### 3.3 The rules that must hold

1. **A hierarchy with no root paints nothing.** A flat list of leaves has no
   parent, so the compiler would reject it; the bridge makes the root.
2. **A node's value is its own, or its subtree's.** The compiler aggregates a
   parent's value from its children when the parent carries none, so a caller
   may give leaves only.
3. **A value that is not a number paints nothing.** The same rule every other
   chart follows: a `NaN`, an infinity or a negative paints no mark.
4. **A link with no endpoint paints nothing.** The compiler rejects a link
   naming a node that is not in the graph.
5. **The treemap's areas are proportional.** A cell's area is its value's
   share of the whole, so a child never paints outside its parent.
6. **The sunburst's arcs are proportional.** An arc's angle is its value's
   share of its parent's.
7. **The sankey's ribbons are proportional.** A ribbon's thickness is its
   value's share of the node it leaves.

## 4. The steps

1. **The bridge** — `SceneChartKind` grows `treemap | sunburst | sankey`, and
   `sceneDefinition` builds the mark each names. The scene's `scales` become
   `null` for the two layouts that resolve their own.
2. **The geometry** — `packages/data/src/chart/geometry.ts` holds the rows
   each layout reads: the flat hierarchy (with the root built when the caller
   gives leaves only), the node and link lists, and the value each node
   aggregates.
3. **The components** — `TreemapChart`, `SankeyChart` and `SunburstChart` in
   `chart.tsx`, each with its props, its frame and its legend.
4. **The page** — a section per type in `packages/data/docs/charts/charts.mdx`,
   with the usage, every prop and its default.
5. **The tests** — the geometry in `geometry.test.ts`, the paint in
   `behaviour/chart-types.test.tsx`, the page in `chart/docs.test.ts`.
6. **The probe** — the document route paints a treemap, a sankey and a
   sunburst in one window, and the colours are counted.

## 5. The test plan

| Case | What it holds |
| --- | --- |
| a hierarchy with no root | the bridge builds one, and the cells paint |
| a hierarchy with two roots | the compiler's own rejection, stated |
| a node's own value and its subtree's | both aggregate the same way |
| a value that is not a number | no mark, and no throw |
| a link with no endpoint | no mark, and no throw |
| a treemap's areas | each cell's area is its share of the whole |
| a sunburst's arcs | each arc's angle is its share of its parent |
| a sankey's ribbons | each ribbon's thickness is its share of the node |
| the document route | three types, three documents, one element each |

Every case is checked **in both directions**: the rule fails on the previous
code, and the previous code is named in the case's header comment.

## 6. The limits, stated up front

- **A mark cannot answer a press.** The hit test is geometric, and a treemap
  cell or a sunburst arc is not a point — so the tooltip reads the **nearest
  cell**, not the cell under the pointer, and a sankey's ribbon is read the
  same way. This is a real difference from Recharts and it is the runtime's,
  not the chart's.
- **A label inside a treemap cell is clipped to the cell.** A cell too small
  for its label paints the label's **beginning**, or none.
- **The sunburst's rings are drawn from the root out**, and a hierarchy
  deeper than `visibleDepth` is not drawn.
- **A sankey with no positive link paints nothing.** A graph with no flow has
  nothing to lay out.
