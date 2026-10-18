# apps/docs — the GPUIxUI documentation site

The docs site is a real Fumadocs app on TanStack Start, deployed as a Cloudflare
Worker by `packages/deploy/alchemy.run.docs.ts` at
**https://gpuixui.sudokw.com**. It documents the native library; it does not
reimplement it. The browser site never pretends to be GPUix.

The landing page lives at `/`. Documentation lives under `/docs` and follows the
shadcn/ui anatomy: a sectioned sidebar, Preview/Code tabs, an install block, the
page TOC and a previous/next pager.

## Layout

```
content/docs/           MDX pages and their meta.json navigation
  index.mdx             Introduction (served at /docs)
  installation.mdx      Requirements, nub, first component
  theming.mdx           Semantic roles, themes, overrides
  dark-mode.mdx         App-owned mode switching
  components/           Button, Dialog, Popover, Tabs
  contributing.mdx      Checks, worktrees and the component checklist
public/                 Static assets (favicon)
src/routes/index.tsx    The landing page at `/`
src/routes/docs/        `/docs` index and the `/docs/$` splat
src/routes/api/search   Fumadocs search endpoint
src/components/docs/    ComponentPreview, Install, ComponentSource, CopyPage, demos
src/components/mdx.tsx  The MDX component registry
src/lib/docs-view.tsx   Shared docs layout and page template
src/lib/page-markdown.ts Server function for the "Copy page" action
src/lib/source.ts       Fumadocs collection and page-tree loader
src/styles/app.css      Tailwind, Fumadocs presets and the GPUIxUI palette
src/styles/demos.css    Scoped browser previews of the native components
```

## Component pages

A component page uses three MDX blocks:

- `<ComponentPreview name="button-variants" />` — a live browser rendering and
  a Code tab showing the native usage. The preview is always labelled as a
  browser rendering; the shipped component renders through GPUix.
- `<Install packageName="@gpuixui/primitives" importName="Button" />` — `nub`
  and manual install tabs. The packages are private workspace packages, so the
  install uses `workspace:*`, not a registry version.
- `<ComponentSource name="button" file="packages/primitives/src/components/Button.tsx" />`
  — the real implementation, imported with `?raw`.

Demo renderings and their source strings live in
`src/components/docs/demos.tsx`. Add a registry entry there, then point a page at
it.

## Commands

```sh
nub run dev:docs                               # dev server
nub run --filter @gpuixui/docs build           # production build
nub run --filter @gpuixui/docs check-types     # tsc
```

## Deploy

```sh
cd packages/deploy
nub run deploy:docs
```

The stack deploys `Cloudflare.Website.Vite` as `gpuixui-docs` with
`rootDir: "../../apps/docs"`. Alchemy injects the Cloudflare Vite plugin, builds
the app and attaches the custom domain. Cloudflare credentials come from the
environment; no secret is stored in this repository.
