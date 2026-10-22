# apps/docs — the GPUIxUI documentation site

The docs site is a real Fumadocs app on TanStack Start, deployed as a Cloudflare
Worker by `packages/deploy/alchemy.run.docs.ts` at
**https://gpuixui.sudokw.com**. It documents the native library; it does not
reimplement it. The browser site never pretends to be GPUix.

The landing page lives at `/`. Documentation lives under `/docs` and follows the
shadcn/ui anatomy: a sectioned sidebar, Preview/Code tabs, an install block, the
page TOC and a previous/next pager. `docs/preview-strategy.md` at the repo root is
the policy a page follows: every browser rendering is labelled as one, the source
is copyable, and a page whose interaction cannot be shown says so.

## Pages

Every page is an MDX file; the paths below are relative to `content/docs/`.
`src/lib/readme-ledger.test.ts` holds this list to the directory.

```
index.mdx                    Introduction (served at /docs)
installation.mdx             Requirements, nub, first component, terminal mode
getting-started.mdx          A first screen: theme, card, state, run it natively
architecture.mdx             The package graph, the recipe pipeline, where a change goes
theming.mdx                  Semantic roles, themes, the platform switch, the look picker
dark-mode.mdx                App-owned mode switching — no hidden OS-mode listener
typography.mdx               The ten type roles, the two families, the platform rule
runtime.mdx                  What the pinned GPUix provides, what it does not, and the workaround
layouts.mdx                  The layout lane: primitives, the window frame, runtime facts
workspace.mdx                The desktop-shell lane: composing parts, the docking gate
data-display.mdx             The data lane: what ships, the table gate, runtime gaps
patterns.mdx                 The workflows that cross components, and who owns the state
examples.mdx                 The example registry, generated from every package's examples
reference.mdx                The public entry points and the symbols behind them
themes.mdx                   The live token editor, its audit and its copy output
blocks/index.mdx             Page-level recipes composed from the library
blocks/login.mdx             A centered sign-in card
blocks/settings.mdx          A settings page with tabbed sections
blocks/dashboard.mdx         An activity dashboard composed from the library
components/index.mdx         The filterable component index
components/button.mdx        Curated: previews, install, source (the package page keeps the API)
components/command-menu.mdx  Curated: the palette's matcher, group ranking and keys
components/dialog.mdx        Curated: a real confirmation workflow
components/dropdown-menu.mdx Curated: highlighted row is the focused row
components/popover.mdx       Curated: anchored placement
components/tabs.mdx          Curated: the measured indicator
primitives/index.mdx         The Tier 1 section index (its pages come from the packages)
contributing.mdx             The checks, the worktree rules, the component checklist
license.mdx                  Licenses and attribution, read from LICENSES/*.md
```

## Site source

```
plugins/public-symbols-plugin.ts    Build-time module: the public symbol index

src/start.ts                        TanStack Start instance and the Worker cache policy
src/router.tsx                      The router instance
src/routes/__root.tsx               The document shell, icons and the Fumadocs provider
src/routes/index.tsx                The landing page at /
src/routes/docs/index.tsx           /docs, the Introduction
src/routes/docs/$.tsx               Every other docs page, from either collection
src/routes/api/search.ts            Fumadocs search endpoint over all four collections
src/routes/sitemap[.]xml.ts         /sitemap.xml, generated from every collection

src/components/mdx.tsx              The MDX component registry
src/components/landing/landing.tsx  The landing page composition
src/components/landing/deck.tsx     The stacked native-window deck
src/components/landing/terminal.tsx The "run it in your terminal" section
src/components/landing/lineage.tsx  References and attribution on the landing page
src/components/landing/data.ts      The landing page's content, as data
src/components/not-found.tsx        The 404 inside the docs chrome

src/components/docs/component-preview.tsx The Preview/Code component preview
src/components/docs/preview-surface.tsx   A preview carrying the resolved theme's variables
src/components/docs/demos.tsx             The browser renderings and their source strings
src/components/docs/menu-preview.ts       The menu preview's row model and arrow arithmetic
src/components/docs/command-preview.ts    The palette preview's matcher and group ranking
src/components/docs/sources.ts            The real source files the Code tab shows
src/components/docs/component-source.tsx  The copyable source block
src/components/docs/install.tsx           The nub / manual install tabs
src/components/docs/copy-page.tsx         Copy the page as Markdown
src/components/docs/status-strip.tsx      The generated COMPONENTS.md status and verdict
src/components/docs/native-run-note.tsx   The note above a package page: the playground command and its page
src/components/docs/lane-table.tsx        The generated rows on the three lane pages
src/components/docs/component-index.tsx   The filterable index on /docs/components
src/components/docs/examples-index.tsx    The generated registry on /docs/examples
src/components/docs/api-reference.tsx     The entry-point table and the symbol index
src/components/docs/type-scale.tsx        The typography specimen, from the theme
src/components/docs/theme-matrix.tsx      The built-in themes, generated from the token package
src/components/docs/token-scales.tsx      The spacing/radius/density specimens on /docs/theming
src/components/docs/platform-toggle.tsx   The platform and look switch, and its provider
src/components/docs/license-table.tsx     LICENSES/*.md, rendered
src/components/docs/patterns.tsx          The pattern workflows and the chooser
src/components/docs/series-swatches.tsx   The theme's categorical data series, on /docs/theming
src/components/docs/block-index.tsx       The Blocks index
src/components/docs/blocks.tsx            The Login, Settings and Dashboard recipes
src/components/docs/block-preview.tsx     A block's browser rendering
src/components/docs/dashboard.tsx         The dashboard's charts and stats
src/components/docs/theme-editor.tsx      The live token editor on /docs/themes
src/components/docs/theme-editor-logic.ts Its pure core: edits, audit, copy output
src/styles/app.css                        Tailwind, Fumadocs presets and the docs palette
src/styles/demos.css                      Scoped browser previews of the native components
src/styles/blocks.css                     The block recipes' preview styles
src/styles/landing.css                    The landing page's styles
src/styles/platform.css                   The platform switch's own chrome
src/styles/theme-editor.css               The theme editor's chrome and preview

src/lib/docs-view.tsx               The shared docs layout and the two-collection page template
src/lib/layout.shared.tsx           The nav chrome: brand and top-level links
src/lib/source.ts                   The Fumadocs collection for content/docs
src/lib/doc-snippets.test-util.ts   The shared page-snippet and symbol resolve for the page guards
src/lib/search-index.ts             The search index's page list: curated pages shadow package pages
src/lib/search-links.ts             The search dialog's pre-query entry points
src/lib/package-docs.ts             The loaders for the three package collections
src/lib/collection-routes.ts        The registry: every mounted package directory, route, section
src/lib/page-tree.ts                Fills the package's pages into their sidebar section
src/lib/page-meta.ts                Title, description, canonical and social metadata
src/lib/page-markdown.ts            Server function behind "Copy page"
src/lib/site.ts                     The one deployed origin
src/lib/shared.ts                   App name, docs route and the repository link
src/lib/sitemap.ts                  The sitemap's URL set
src/lib/virtual-modules.d.ts        The types of the build-time modules
src/lib/fonts.ts                    The `.SystemUIFont` sentinel → CSS stack bridge for the previews
src/lib/inventory.ts                Parses the tier tables of COMPONENTS.md into lane rows
src/lib/inventory-data.ts           The parsed inventory, at build time
src/lib/inventory-status.ts         The page → COMPONENTS.md row join behind the status strip
src/lib/public-api.ts               Derives the entry points from each package's exports map
src/lib/public-api-data.ts          The entry points, at build time
src/lib/public-symbols.ts           The symbol index model: kinds, modules and summaries
src/lib/public-symbols-source.ts    Reads the workspace source the index describes
src/lib/public-symbols-data.ts      The index, read from the plugin's build-time module
src/lib/examples.ts                 The example registry: ids, paths and header summaries
src/lib/examples-data.ts            Reads packages/*/examples/*.example.tsx at build time
src/lib/component-index.ts          The component index: URL mapping, curated shadowing, filter
src/lib/component-index-data.ts     The index, from every docs collection at build time
src/lib/patterns.ts                 The one source of the patterns and their parts
src/lib/licenses.ts                 The LICENSES/*.md parse
src/lib/licenses-data.ts            The licence records, at build time
src/lib/platform.ts                 The platform and look switch: parse, label, resolve
src/lib/platform-storage.ts         The remembered platform/look choice, per axis
src/lib/theme-css.ts                Theme → CSS variables, shared with every preview
src/lib/block-source.test.ts        A block's copyable source, resolved against the workspace
src/lib/gpuix-web.test.ts           The GPUix web build: browser entry, shared memory and the policy's status
src/lib/live-frame.test.ts          The live probe's judge and its PNG pixel reader

scripts/live-frame.ts               The live surface's frame contract: page, report, pixel
scripts/live-surface-probe.ts       Drives headless Chrome to prove a real GPUix frame paints
```

`src/routeTree.gen.ts` is generated by the TanStack Start plugin and is not
edited; `src/lib/sidebar-pages.test-util.ts` is the shared `meta.json` parse the
three sidebar guards import, and `src/lib/doc-snippets.test-util.ts` is the
shared snippet/import resolve the page guards use (the symbol index is read
once, so every page is judged by the same rule).

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
`src/lib/package-page-template.test.ts` holds every package page to the
component-page template's invariant core — `## API`, an accessibility or
limitations section, the evidence section and `## Related` — so a page cannot
drop one silently; the one page missing a related list is recorded with its
owner and the guard fails once it is added.

Every package page opens with a **status strip** generated from its
`COMPONENTS.md` row (`src/components/docs/status-strip.tsx`): the inventory's
status and its GPUix support verdict, plus a link to the inventory. The join is
the page title (`src/lib/inventory-status.ts`), which normalises punctuation and
a trailing plural and names the titles whose row reads differently. The page
therefore cannot claim more than the inventory, and a row that changes changes
the page with no docs edit; `src/lib/inventory-status.test.ts` holds every
mounted page to a row, and the pages that have none are argued in the module.

## Pages that read the workspace

No page restates what the code already says:

- **Examples** (`/docs/examples`) is built from `packages/*/examples/*.example.tsx`
  by `src/lib/examples-data.ts`. The row's summary is the file's own header, so
  a new example appears with no docs change and a deleted one leaves no dead
  row. The site shows the source and never renders an example in the browser:
  an example is a GPUix screen, and a DOM drawing of it would be the fake
  preview the preview strategy rules out.
- **Reference** (`/docs/reference`) publishes the entry points from each
  package's `exports` map, then the symbols behind them. The symbol index needs
  the workspace source, which is far too large for a browser bundle, so
  `plugins/public-symbols-plugin.ts` reads it once at build time and exposes a
  virtual module; `src/lib/public-symbols-data.ts` reads that module and the
  page renders one table.
- **Component index** (`/docs/components`) lists every primitives and components
  page from its frontmatter (`component-index.ts`), so the index cannot
  advertise a page that does not exist and a new page appears without a docs
  edit. A curated page shadows its package page.
- **Lane pages** (`/docs/layouts`, `/docs/workspace`, `/docs/data-display`) get
  their rows from the tier tables of `COMPONENTS.md` through `<LaneTable>`, so a
  page cannot call a row shipped while the inventory says `todo`.
- **Typography and Theming** render specimens from the theme itself
  (`<TypeScale>`, `<TokenScales>`), so a token edit moves the page with it.
- **License** (`/docs/license`) renders `LICENSES/*.md` through
  `<LicenseInventory>`; a record added beside the code appears with no docs
  change.
- **Sitemap** (`/sitemap.xml`) is generated per request from the same
  collections (`src/lib/sitemap.ts`), with one URL per page and a curated page
  shadowing its package page; `public/robots.txt` points at it.

## Preview honesty

`<ComponentPreview>` and `<BlockPreview>` render a browser reproduction of the
component's geometry, palette and states, always with the note that the shipped
component renders through GPUix. The same page carries the real source, so the
reader can run it in `apps/playground`. `src/lib/theme-css.ts` is the one bridge
from a `Theme` to CSS variables, and the previews take their values from the
resolved platform theme, so a preview cannot carry a colour literal the library
does not ship. `docs/preview-strategy.md` is the full policy — including the one
route that could stop being an approximation: `@gpuix/native`'s wasm browser
build is a real GPUix surface (one document-owned canvas, cross-origin
isolation), which the site does **not** mount yet. `src/lib/gpuix-web.test.ts`
holds that status, the build's size and its shared-memory requirement to the
installed package, and plan `440-live-gpuix-web-surface` is the spike that would
mount it.

That spike's riskiest step is measured rather than assumed: `scripts/live-surface-probe.ts`
boots the wasm in headless Chrome, applies one mutation batch and reads the
frame's pixel back out of the screenshot, so a frame is only a paint when it
carries the fill the batch set. It lives outside `src/` — it is a host tool, and
the docs app still imports no renderer — and `scripts/live-frame.ts` is the frame
contract it judges against.

A block page mounts its reproduction by registry key (`<BlockPreview
name="dashboard-01" />`); `src/lib/block-page.test.ts` holds every page to a
registered key and every registered block to a page, and checks both are in the
Blocks sidebar. The dashboard's chart recipe states the runtime's measured rule —
one `<svg source>` paints one tint, so a multi-series chart is one stacked
element per colour — because the page used to call a single element a native
chart. The Code tab is the real source too: `src/lib/block-source.test.ts`
resolves every recipe's `@gpuixui/*` imports against the workspace, so a renamed
export fails instead of teaching a broken import.

## The platform switch and the look picker

`PlatformToggle` sits in the sidebar footer. **Platform** offers macOS, Linux,
Windows and Default; **Look** offers the platform's own style and the two
authored looks (`Windows XP (Luna)`, `Windows 7 (Aero)`). `src/lib/platform.ts`
resolves `platformTheme(themes[mode], platform)` and then `applyStyle` over it for
a look, the choice is carried in `?platform=…&look=…` and remembered in local
storage, and every preview renders on a `PreviewSurface` that applies the resolved
theme's variables, `data-platform` and `data-look`. A preview therefore paints the
library's roles, radii, families and density, not a docs palette.

## The theme editor

`/docs/themes` mounts `<ThemeEditor>`, which edits the twelve shadcn-core roles,
`radius.md` and the `sans` family for each mode, previews them through the same
CSS bridge, and copies a `createTheme` module in the shape
`@gpuixui/tokens` consumes. Its state is the **pins** a reader set, resolved over
the platform style the switch selected (`platformThemes`), so switching the
platform re-bases the preview and inputs while the edits stay, and the copied
module prints the resolved values. The edits persist to the URL and to local
storage. Its readout is `auditTheme` — the library's own gate — so a role the
renderer cannot paint, a text pair below its floor and an invisible divider are
all reported, and a persisted state that would paint black is rejected instead of
restored. `theme-editor-logic.ts` is the pure core and its tests.

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
it. The curated pages — the ones with a preview — are the set named in
`docs/preview-strategy.md`; every other component page is the package's own and
adds the API tables, limitations and the example to run. `src/lib/component-page-truth.test.ts` holds the curated pages to the
runtime version the workspace pins, the inventory row and the test count their
suite actually runs.

The copies are checked on every page the site mounts, not only the curated ones:
`src/lib/page-snippets.test.ts` resolves each `@gpuixui/*` import in every `ts`
and `tsx` fence — 98 pages, the site's own plus the 71 the packages ship —
against the package source, so a renamed export fails the docs suite instead of
reaching a reader as working code. One defect on a page this app does not own is
recorded with its owner in that guard, and the entry fails once the page is
fixed.

## Metadata and discovery

Every docs page publishes its own document metadata: the frontmatter `title`
with the site name, its `description`, an Open Graph and Twitter card, and a
canonical link. The canonical drops the `?platform=` and `?look=` switches, so
the variants are one page to a crawler and shareable links to a reader.
`src/lib/page-meta.ts` builds it; `docs-view.tsx` returns the page's title and
description from the loader, so both collections — the site's pages and the
package's — get real metadata without a copy. The landing page is a route rather
than a collection document, so it contributes its own `landingMeta` (title,
description, Open Graph, Twitter card and the absolute URL with the same
no-double-slash rule) from the same module. Both publish one share image,
`socialImage`: the site's 512px mark in `public/logo.png`, with its type, size
and alt text, so a shared link is a card and not a blank rectangle;
`page-meta.test.ts` holds the URL to the file that ships.

`src/lib/site.ts` holds the one origin (`https://gpuixui.sudokw.com`), and
`site.test.ts` holds it to `DOCS_DOMAIN` in the deploy stack.

## Commands

```sh
nub run dev:docs                                 # dev server
nub run --filter @gpuixui/docs test              # vitest, including the page guards
nub run --filter @gpuixui/docs build             # production build
nub run --filter @gpuixui/docs check-types       # tsc
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
