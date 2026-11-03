# 753 — Graphics: one category for charts, icons and diagrams

| Field | Value |
| --- | --- |
| Status | in progress — the `Graphics` category, the `Diagram` component and the pages land; the window probe is next |
| Phase | F (integration and polish) |
| Depends on | `@gpuixui/data` charts, `@gpuixui/icons`, the docs site's diagram fence |
| References | shadcn/ui v4 `apps/v4/registry/new-york-v4/ui/chart.tsx`, [Pele](https://pele.run) |
| Workstream | graphics |

## 1. The problem

The docs site has **three** kinds of visual material in three different
places:

| What | Where it lives today |
| --- | --- |
| charts | the `Data display` lane, from `@gpuixui/data` |
| icons | the `Icons` lane, from `@gpuixui/icons` |
| diagrams | one page at the top of the docs, rendered by Pele |

A reader looking for "the things this library draws" finds them in three
sections, and one of them — the diagrams — is not a **library** surface at
all: it is a docs-site fence that renders Mermaid in the browser. There is no
`Diagram` a consumer can mount in their own app.

The owner wants **one `Graphics` category** holding charts, icons and
diagrams, and the diagrams to be a **shadcn-like component** that still uses
Pele.

## 2. What the runtime allows (measured)

Pele's `render(source)` is a **pure function over a string**: it returns
`{ svg, width, height, type, links }` and needs no DOM. Measured in a plain
Node process:

```
document: undefined window: undefined
type: flowchart
size: 403 x 64
svg head: <svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 403 64" ...>
```

Pele is **MIT**, **zero dependencies**, and its SVG carries its theme as
`var(--pele-bg, …)` custom properties on the root element.

So a native diagram is the **same route the charts take**: the SVG document
goes to an `<img>` as a data URL and the runtime's own decoder paints it.

Two limits the native route has, and they are the honest ones:

- an image cannot be **re-themed by a CSS variable** — the values are baked
  into the raster, so a theme switch needs a re-render (the charts' theme
  switch re-renders too, so this is the same rule);
- an image cannot be **selected** and cannot carry a **link** — Pele's
  `links` are reported by the render, so the component can surface them, but
  the pixels themselves are not clickable.

## 3. What ships

### 3.1 The `Diagram` component

`@gpuixui/data`'s diagram surface, or a new `@gpuixui/graphics`? The charts
are in `data` because a chart is data presentation; a diagram is not. The
icons are their own package. **A diagram is a drawing, so it belongs beside
the charts and the icons.**

The package boundary is the question. Options:

| Option | Cost | Verdict |
| --- | --- | --- |
| `@gpuixui/data` | the package's name says data; a diagram is not data | rejected |
| `@gpuixui/icons` | the package says icons | rejected |
| a new `@gpuixui/graphics` | a package with one component in it | rejected — a package needs a real responsibility |
| `@gpuixui/components` | the general component package | **chosen** — a diagram is a general-purpose surface, and `components` already carries the primitives every other package builds on |

`packages/components` gains `src/diagram/`:

| File | Change |
| --- | --- |
| `diagram/logic.ts` | `diagramSvg(source, options)` — the render lifted into a typed `Effect`, with Pele's failure as a `Schema.TaggedError`; `diagramType(source)` — the type the source declares |
| `diagram/recipe.ts` | the surface's recipe: the frame, the error state, the caption |
| `diagram/diagram.tsx` | `Diagram` — the component: the source, the theme's roles, the size, the error state |
| `diagram/logic.test.ts` | the rules, each in both directions |

The component's API is **shadcn-like** in the sense shadcn's `chart` is: a
container plus named parts, a typed config, and a caller who owns the source.

```tsx
<Diagram
  aria-label="The render path"
  source={SOURCE}
  caption="How a component becomes a picture"
/>
```

### 3.2 The category

| Piece | Change |
| --- | --- |
| `apps/docs/src/lib/collection-routes.ts` | the `Icons` section becomes `Graphics`; the charts' collection moves from `Data display` into it |
| `apps/docs/content/docs/graphics/` | **new** — the category's directory: `index.mdx`, `charts.mdx`, `icons.mdx`, `diagrams.mdx` |
| `apps/docs/content/docs/meta.json` | the `icons` and `data-display` entries become `graphics` |
| `apps/docs/content/docs/diagrams.mdx` | moves into the category and documents the **component**, not just the fence |
| `apps/docs/src/components/docs/mermaid-diagram.tsx` | the docs fence stays — it is the reader's copyable source — but the page points at the component |

**The charts stay in `@gpuixui/data` and their pages stay in the package's
docs.** The category is a *docs* grouping; a package does not move because
the sidebar groups it differently. `data-display` keeps its other pages
(tables, trees, the stat card) — only the **charts** move.

### 3.3 The diagrams page

The page teaches three things:

1. the **component** — its props, its defaults, its states;
2. the **source** — a fence a reader can copy, which is the whole API of a
   diagram;
3. the **theming** — the table of Pele's roles against the library's, which
   the native component follows.

## 4. Files

| File | Change |
| --- | --- |
| `packages/components/src/diagram/logic.ts` | **new** — the render, lifted into a typed effect |
| `packages/components/src/diagram/recipe.ts` | **new** — the recipes |
| `packages/components/src/diagram/diagram.tsx` | **new** — the component |
| `packages/components/src/diagram/logic.test.ts` | **new** — the rules |
| `packages/components/src/behaviour/diagram.test.tsx` | **new** — the native case |
| `packages/components/package.json` | `pele` in the catalog and the dependencies |
| `package.json` | `pele` in the catalog, pinned |
| `packages/components/docs/diagram.mdx` | **new** — the component's page |
| `packages/components/docs/meta.json` | the page into the package's collection |
| `apps/docs/src/lib/collection-routes.ts` | the `Graphics` section |
| `apps/docs/content/docs/graphics/**` | **new** — the category's directory |
| `apps/docs/content/docs/meta.json` | the category in the order |
| `apps/docs/content/docs/diagrams.mdx` | moved and rewritten |
| `apps/docs/src/lib/component-index.test.ts` | the section name, in both directions |
| `apps/docs/src/lib/package-docs.test.ts` | the section's packages |
| `.agents/slop/COMPONENTS.md` | the `Diagram` row |
| `.agents/slop/LICENSES/` | the Pele record |
| `.agents/slop/TODO.md` | the tasks |

## 5. Verification

```sh
nub run --filter @gpuixui/components test
nub run --filter @gpuixui/components test:behaviour
nub run --filter @gpuixui/docs test
nub run check
nub run lint
nub run test
```

## 6. STOP conditions

- **Pele's render needs a DOM in the runtime.** Measured: it does not. If a
  future release does, the component reports the failure through its typed
  error and the page keeps the browser fence.
- **Pele's SVG cannot be painted by the runtime's decoder.** The charts'
  document route already proves an SVG string paints; if a diagram's markup
  is refused, the component falls back to the mask route and the page says
  so.
- **A diagram's size is not known before it renders.** Pele reports the size
  in the render result, so the component measures from it; a caller who wants
  a fixed box passes one and the diagram is scaled to fit.

## 7. Acceptance

- A `Diagram` a consumer can mount, rendering a Mermaid source with Pele,
  themed by the library's tokens, with a typed error state.
- The docs site's sidebar has **one `Graphics` section** holding charts,
  icons and diagrams, and a reader finds all three there.
- The diagrams page documents the **component** and still shows a copyable
  fence.
- Every number on the page is derived from the code.
- `nub run check`, `nub run lint`, `nub run test` green.
