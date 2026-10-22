# `@gpuixui/dock`

The Tier 4 panel workspace, rendered by GPUix through React: `SplitPane`,
`PanelGroup` and `DockLayout`. They share one resize control — the divider — and
one data model, so a split, a group and a docking tree all obey the same runtime
rules and persist through the same schema.

## Why a package

A docking workspace is a composition with its own state (pane sizes, collapse
flags, a tree of split and tab groups) and its own persistence shape. It is not
a `@gpuixui/components` control, so it lives here, over the primitives, exactly
as `@gpuixui/data` lives beside it.

## What the runtime forces

Measured on the pinned `@gpuix/native@0.11.0`; the evidence is in
`COMPONENTS.md`'s Tier 4 rows and `docs/gpuix-capabilities.md`.

| Rule | Evidence | What this package does |
| ---- | -------- | ---------------------- |
| Pointer capture arms only on the `onMouseDown` + `onMouseMove` pair | `pointer-capture`, `split-pane-lifecycle` | `Divider` declares both, so a drag that leaves its 6 px box keeps all eight moves (a move-only sample kept 1 of 8). |
| No `transform` | upstream issue #102 | A pane is sized by `flexBasis`/`width`, never scaled; the divider's press feedback is an opacity fade of a highlight layer, timed by `@gpuixui/motion`. |
| A divider is a control, not only a handle | `split-pane-lifecycle`, WCAG 2.1.1 | `role="separator"` tab stop, `keyboardFocusRing` at rest, `aria-valuetext`, arrows step 16 px and Home/End name the bounds. |
| A split's `max` is the caller's number | `dock-reflow` | `SplitPane` takes `min`/`max` and clamps to them; it never derives a bound from its container. |
| A pane owns its own scroller | `nested-scroll-lifecycle` | Every pane is `overflow: hidden` with `min-*: 0`, so a pane's scroller moves alone. |
| The runtime publishes no storage | `workspace-restore` | `PanelLayout` and `DockNode` round-trip through a JSON string at the app's boundary; a decode failure is the caller's signal to open the default. |

## Shape

```
src/
  logic.ts        the pure geometry (clamp, step, resize) and the persisted
                  shapes: PanelLayout, DockNode, and their JSON codecs
  divider.tsx     the one resize control the three components share
  split-pane.tsx  two panes and a draggable divider
  panel-group.tsx N panes in a row/column, fractions, a collapse toggle per pane
  dock-layout.tsx a named tree of split and tab groups
  recipe.ts       the class-string recipes and the compile cache
  theme.ts        the single seam over @gpuixui/tokens
examples/         mountable screens (registered in examples/index.ts)
```

`logic.ts` imports no React: an Effect-driven or store-driven workspace reads
the same reducers the components do.

## Usage

```tsx
import { SplitPane } from "@gpuixui/dock";
import { useState } from "react";

const [size, setSize] = useState(240);

<SplitPane
  size={size}
  onResize={setSize}
  min={160}
  max={400}
  dividerLabel="Sidebar width"
  first={<Sidebar />}
  second={<Document />}
/>;
```

A `PanelGroup` persists its whole shape — fractions, collapse flags, axis — as
one `PanelLayout`:

```tsx
import { PanelGroup, PanelLayout, Panel } from "@gpuixui/dock";

const layout = new PanelLayout({
  orientation: "horizontal",
  panels: [
    new Panel({ id: "sidebar", label: "Sidebar", size: 0.2, collapsible: true }),
    new Panel({ id: "editor", label: "Editor", size: 0.8 }),
  ],
});

<PanelGroup
  layout={layout}
  onLayoutChange={setLayout}
  renderPanel={(id) => <Pane id={id} />}
/>;
```

A `DockLayout` is a named tree of splits and tab groups, with `activeTab` per
group:

```tsx
import { DockLayout, DockNodeJson } from "@gpuixui/dock";

<DockLayout
  layout={layout}
  onLayoutChange={setLayout}
  renderTab={(id) => <Pane id={id} />}
/>;

// Persist and restore at the app's boundary:
const saved = Schema.encodeUnknownSync(DockNodeJson)(layout);
const restored = Schema.decodeUnknownSync(DockNodeJson)(saved);
```

## Styling

Resting appearance is a Tailwind class recipe compiled through `@gpuixui/tw`'s
default registry (shadcn's fixed metrics), cached once per recipe per theme.
Roles come from `@gpuixui/tokens`; the collapse toggle is the primitives'
`Button`; the divider's feedback is timed by `@gpuixui/motion`.

## Commands

```sh
nub run --filter @gpuixui/dock test           # geometry, round-trips, rule guards
nub run --filter @gpuixui/dock check-types
```
