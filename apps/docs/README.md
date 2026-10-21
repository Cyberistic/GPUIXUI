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
  primitives/           The Tier 1 section index (its pages come from the packages)
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
src/lib/collection-routes.ts The registry: every mounted package directory, route, section
src/lib/package-docs.ts The Fumadocs loaders for the three package collections
src/lib/page-tree.ts    Fills the package's pages into the Components section
src/lib/platform.ts     The platform switch: parse, label, resolve the theme
src/lib/theme-css.ts    Theme → CSS variables, shared with the theme editor
src/lib/page-markdown.ts Server function for the "Copy page" action
src/styles/app.css      Tailwind, Fumadocs presets and the GPUIxUI palette
src/styles/demos.css    Scoped browser previews of the native components
```

## Four collections

The site renders four Fumadocs collections: its own pages, plus one per package
that ships documentation. The package pages are rendered as-is, never copied, so
the site and the package cannot drift.

| Collection | Route | Sidebar |
| ---------- | ----- | ------- |
| `content/docs` | `/docs` | the curated pages |
| `packages/primitives/docs` | `/docs/primitives/<name>` | Primitives |
| `packages/icons/docs` | `/docs/icons/<name>` | Primitives |
| `packages/components/docs` | `/docs/components/<name>` | Components |

`src/lib/page-tree.ts` fills each package's pages into its section, after the
curated pages. A curated page keeps its URL, and the search index skips the
package page for that URL. The primitive layer is one sidebar section even
though two packages write its pages.

The packages' files are written as Markdown and compiled here as MDX, which is
stricter: frontmatter must be valid YAML and prose may not contain a raw
`<tag>` outside code. `src/lib/package-docs.test.ts` guards that, that every
`packages/*/docs` directory is mounted, and that the primitives index links every
page it ships — a violation fails the collection, not just one page.

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
