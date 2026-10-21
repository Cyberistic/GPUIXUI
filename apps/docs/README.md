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
  components/           Custom pages (Button, Dialog, Popover, Tabs) and the index
  contributing.mdx      Checks, worktrees and the component checklist
public/                 Static assets (favicon)
src/routes/index.tsx    The landing page at `/`
src/routes/docs/        `/docs` index and the `/docs/$` splat
src/routes/api/search   Fumadocs search endpoint
src/components/docs/    ComponentPreview, PreviewSurface, Install, ComponentSource,
                        CopyPage, PlatformToggle, demos
src/components/mdx.tsx  The MDX component registry
src/lib/docs-view.tsx   Shared docs layout and the two-collection page template
src/lib/source.ts       Fumadocs collection for `content/docs`
src/lib/component-docs.ts Fumadocs collection for `packages/components/docs`
src/lib/page-tree.ts    Fills the package's pages into the Components section
src/lib/platform.ts     The platform switch: parse, label, resolve the theme
src/lib/theme-css.ts    Theme → CSS variables, shared with the theme editor
src/lib/page-markdown.ts Server function for the "Copy page" action
src/styles/app.css      Tailwind, Fumadocs presets and the GPUIxUI palette
src/styles/demos.css    Scoped browser previews of the native components
```

## Two collections

The site renders two Fumadocs collections:

- `content/docs` — this app's own pages, including the curated component pages.
- `packages/components/docs` — the page each component ships with, mounted at
  `/docs/components/<name>`. It is rendered as-is, never copied, so the site and
  the package cannot drift. `src/lib/page-tree.ts` fills those pages into the
  Components section of the sidebar, after the curated pages; a curated page
  keeps its URL, and the search index skips the package page for that URL.

The package's files are written as Markdown and compiled here as MDX, which is
stricter: frontmatter must be valid YAML and prose may not contain a raw
`<tag>` outside code. `src/lib/component-docs.test.ts` guards both, because a
violation fails the collection, not just one page.

## The platform switch

`PlatformToggle` sits in the sidebar footer and offers macOS, Linux, Windows and
Default. `resolvePlatformTheme` asks `@gpuixui/tokens` for the theme, the choice
is carried in `?platform=` and remembered in local storage, and every preview
renders on a `PreviewSurface` that applies the theme's variables. A preview
therefore paints the library's roles, not a docs palette. See
`docs/preview-strategy.md` for the full policy.

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
