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
  architecture.mdx      The package graph, the recipe pipeline and where a change goes
  theming.mdx           Semantic roles, themes, overrides
  dark-mode.mdx         App-owned mode switching
  typography.mdx        The type scale, families, tones and the platform rule
  primitives/           The Tier 1 section index (its pages come from the packages)
  components/           Custom pages (Button, Dialog, Popover, Tabs) and the index
  layouts.mdx           The layout lane: primitives, the window frame, runtime rules
  workspace.mdx         The desktop-shell lane: what composes a window, split-pane gate
  data-display.mdx      The data lane: what ships, the table gate, runtime gaps
  reference.mdx         The public entry points, generated from each package manifest
  contributing.mdx      Checks, worktrees and the component checklist
public/                 Static assets (favicon)
src/routes/index.tsx    The landing page at `/`
src/routes/docs/        `/docs` index and the `/docs/$` splat
src/routes/api/search   Fumadocs search endpoint
src/components/docs/    ComponentPreview, PreviewSurface, Install, ComponentSource,
                        CopyPage, PlatformToggle, LaneTable, demos
src/components/mdx.tsx  The MDX component registry
src/lib/docs-view.tsx   Shared docs layout and the two-collection page template
src/lib/source.ts       Fumadocs collection for `content/docs`
src/lib/inventory.ts    Parses the tier tables of COMPONENTS.md into lane rows
src/lib/lane-page.test.ts Holds the lane pages to their template and sidebar place
src/lib/public-api.ts   Derives the public entry points from each package's exports map
src/components/docs/api-reference.tsx The generated entry-point table
src/components/docs/type-scale.tsx The typography specimen, generated from the theme
src/components/docs/component-index.tsx The filterable index on /docs/components
src/lib/collection-routes.ts The registry: every mounted package directory, route, section
src/lib/package-docs.ts The Fumadocs loaders for the three package collections
src/lib/page-tree.ts    Fills the package's pages into the Components section
src/lib/component-index.ts The component index: URL mapping, curated shadowing, filter
src/lib/component-index-data.ts The index, read from every docs collection at build time
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

## Metadata and discovery

Every docs page publishes its own document metadata: the frontmatter `title`
with the site name, its `description`, an Open Graph and Twitter card, and a
canonical link. The canonical drops the `?platform=` switch, so the four
platform looks are one page to a crawler and four shareable links to a reader.
`src/lib/page-meta.ts` builds it; `docs-view.tsx` returns the page's title and
description from the loader, so both collections — the site's pages and the
package's — get real metadata without a copy.

`src/lib/site.ts` holds the one origin (`https://gpuixui.sudokw.com`), and
`site.test.ts` holds it to `DOCS_DOMAIN` in the deploy stack. `/sitemap.xml` is
generated from the collections at request time (`src/lib/sitemap.ts`), so a page
added to any mounted collection is listed without a docs change; a curated page
shadows its package page and the URL is listed once. `public/robots.txt` points
at it.

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

The Components index (`/docs/components`) mounts `<ComponentIndex />`, which
lists every page in the Primitives and Components lanes with its description and
a filter box. The rows come from the pages' frontmatter at build time
(`src/lib/component-index.ts` and `component-index-data.ts`), so a page added to
any collection appears without a docs change, a curated page shadows its package
page, and the index cannot advertise a page that does not exist.

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
