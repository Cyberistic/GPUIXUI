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
styling.mdx                  The class recipe layer: two registries, states, refusals, extension
theming.mdx                  Semantic roles, themes, the platform switch, the look picker, the desktop palette
dark-mode.mdx                App-owned mode switching — no hidden OS-mode listener
typography.mdx               The ten type roles, the two families, the platform rule
runtime.mdx                  What the pinned GPUix provides, what it does not, and the workaround
accessibility.mdx            What a screen reader hears, which states have no attribute, proving the tree
motion.mdx                   Springs, keyframes, inertia, the React hooks and the reduced-motion policy
layouts.mdx                  The layout lane: primitives, the window frame, runtime facts
workspace/index.mdx            The desktop-shell lane: composing parts, the docking gate
data-display/index.mdx      The data lane: what ships, the table gate, runtime gaps
patterns.mdx                 The workflows that cross components, and who owns the state
keyboard.mdx                 The chord grammar, keymaps, sequences and command registry
examples.mdx                 The example registry, generated from every package's examples
reference.mdx                The public entry points and the symbols behind them
themes.mdx                   The live token editor, its audit and its copy output
blocks/index.mdx             Page-level recipes composed from the library
blocks/login.mdx             A centered sign-in card
blocks/settings.mdx          A settings page with tabbed sections
blocks/dashboard.mdx         An activity dashboard composed from the library
components/index.mdx         The filterable component index
components/accordion.mdx     Curated: the two modes, the chevron swap, the unmounted body
components/alert.mdx         Curated: four tones, the composition, no announcement claimed
components/avatar.mdx        Curated: the fallback table, the measured dot roles, the roster panel
components/badge.mdx         Curated: the seven variants, the fixed sizes, the press it leaves to its row
components/breadcrumb.mdx    Curated: the collapse budget, the separator that leaves with its item
components/button.mdx        Curated: previews, install, source (the package page keeps the API)
components/card.mdx          Curated: the three treatments, the recipe's fixed metrics
components/carousel.mdx      Curated: discrete stepping, the dot pill and the kept slides
components/checkbox.mdx      Curated: the three states, the 24px target, the mixed parent
components/color-picker.mdx  Curated: the hex grammar, the commit split, the swatch's own tab stop
components/collapsible.mdx   Curated: the measured reveal, the unmount, the disabled gate
components/combobox.mdx      Curated: the ranked list, the disabled row, the create row
components/command-menu.mdx  Curated: the palette's matcher, group ranking and keys
components/confirm-dialog.mdx Curated: Cancel first, confirm never closes, the frozen busy mark
components/context-menu.mdx  Curated: the pointer point, the restore gate, the type-ahead window
components/date-picker.mdx   Curated: the six-row grid, inclusive bounds, the clamped key path
components/dialog.mdx        Curated: a real confirmation workflow
components/drawer.mdx        Curated: the edge box, the dismiss stack, the exit frame
components/dropdown-menu.mdx Curated: highlighted row is the focused row
components/empty-state.mdx   Curated: the four slots, the fixed measure, the role it does not publish
components/field.mdx        Curated: one message slot, submit-time validation, no fade
components/form.mdx         Curated: the submit lifecycle, the core's field meta, the flat summary
components/inline-edit.mdx  Curated: one finish per edit, blur commits, the caller's value
components/list.mdx         Curated: one roving tab stop, type-ahead, the range that skips a row
components/navigation-menu.mdx Curated: one panel, the hover clock, the panel's fixed box
components/pagination.mdx   Curated: the derived window, the gap-of-one rule, the clamped page
components/popover.mdx       Curated: anchored placement
components/search-input.mdx  Curated: the Escape rule, the 24px clear target, the fixed metrics
components/select.mdx        Curated: the 320px list, the row that reveals itself
components/stepper.mdx       Curated: the derived status, the raw value, the workflow's gate
components/switch.mdx        Curated: the left-inset slide, the 24px band, the cleared dependent
components/table.mdx         Curated: the model, the sort and selection rules, the fixed header
components/tag-input.mdx     Curated: the commit rules, the cap, the 24px removal target, no Backspace
components/timeline.mdx      Curated: the passed status, the rail that stops, the dot nobody could see
components/tabs.mdx          Curated: the measured indicator
components/time-picker.mdx   Curated: one clock behind typing, arrows and midnight
components/toast.mdx         Curated: the bounded queue, one action, the hold
components/tooltip.mdx       Curated: the tip's clock, the traversal that never opens it
primitives/index.mdx         The Tier 1 section index (its pages come from the packages)
testing.mdx                  The two test lanes, the check model and the report
contributing.mdx             The checks, the worktree rules, the component checklist
license.mdx                  Licenses and attribution, read from LICENSES/*.md
```

## Site source

```
plugins/public-symbols-plugin.ts    Build-time module: the public symbol index
plugins/page-dependencies-plugin.ts Build-time module: the packages each package page's component imports
plugins/page-source-plugin.ts       Build-time module: each package page's module, as a lazy loader

src/start.ts                        TanStack Start instance and the Worker cache policy
src/router.tsx                      The router instance
src/routes/__root.tsx               The document shell, icons and the Fumadocs provider
src/routes/index.tsx                The landing page at /
src/routes/live.tsx                 /live, the real GPUix surface (whole page)
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
src/components/docs/chat-demo.tsx          The chat scaffold's status machine, error row and composer
src/components/docs/empty-state-demo.tsx   The empty panel's three shapes
src/components/docs/fieldset-demo.tsx      The named group's enabled and disabled states
src/components/docs/hotkey-recorder-demo.tsx The chord recorder's three states
src/components/docs/keyboard-shortcuts-demo.tsx The cheat sheet's groups and keycaps
src/components/docs/mention-input-demo.tsx The mention field's query and ranked list
src/components/docs/message-demo.tsx       The conversation row's variants and slots
src/components/docs/message-scroller-demo.tsx The scroller's pin, unread and jump
src/components/docs/navigation-menu-demo.tsx The nav's two browser renderings and their source strings
src/components/docs/navigation-menu-preview.ts The nav's reducer, its hover clock and its roving group
src/components/docs/preview-card-demo.tsx  The hoverable card's open and close
src/components/docs/breadcrumb-preview.ts The breadcrumb preview's collapse rule and separator count
src/components/docs/breadcrumb-demo.tsx  The breadcrumb's two browser renderings and their source strings
src/components/docs/checkbox-preview.ts  The checkbox preview's group arithmetic and keyboard edges
src/components/docs/checkbox-demo.tsx     The checkbox's two browser renderings and their source strings
src/components/docs/collapsible-preview.ts The collapsible preview's state contract and activation edges
src/components/docs/collapsible-demo.tsx  The collapsible's two browser renderings and their source strings
src/components/docs/color-picker-preview.ts The color picker preview's hex grammar and commit model
src/components/docs/color-picker-demo.tsx The color picker's two browser renderings and their source strings
src/components/docs/carousel-preview.ts   The carousel preview's clamp, loop rule and dot metrics
src/components/docs/carousel-demo.tsx     The carousel's two browser renderings and their source strings
src/components/docs/combobox-preview.ts The combobox preview's ranking, highlight and selection model
src/components/docs/combobox-demo.tsx     The combobox's two browser renderings and their source strings
src/components/docs/date-picker-preview.ts The picker preview's grid, month arithmetic and clamped key moves
src/components/docs/date-picker-demo.tsx  The date picker's two browser renderings and their source strings
src/components/docs/time-picker-preview.ts The time field's clock, its segment clamp and its blur padding
src/components/docs/time-picker-demo.tsx  The time picker's two browser renderings and their source strings
src/components/docs/drawer-preview.ts     The drawer preview's edge box, dismiss stack and filter rules
src/components/docs/drawer-demo.tsx       The drawer's two browser renderings and their source strings
src/components/docs/list-preview.ts       The list preview's arrow order, type-ahead and selection rules
src/components/docs/list-demo.tsx         The list's two browser renderings and their source strings
src/components/docs/dock-preview.ts       The split preview's divider width, step and clamps
src/components/docs/dock-demo.tsx         The dock's browser rendering and its SplitPane source
src/components/docs/inline-edit-preview.ts The rename's finish rule, focus reason and the app's name gate
src/components/docs/inline-edit-demo.tsx  The inline edit's two browser renderings and their source strings
src/components/docs/pagination-preview.ts The pagination preview's window rule, clamp and page slice
src/components/docs/pagination-demo.tsx   The pagination's two browser renderings and their source strings
src/components/docs/menu-preview.ts       The menu preview's row model and arrow arithmetic
src/components/docs/command-preview.ts    The palette preview's matcher and group ranking
src/components/docs/context-menu-preview.ts The context menu's points, restore gate and type-ahead
src/components/docs/context-menu-demo.tsx The context menu's two browser renderings and their source strings
src/components/docs/select-preview.ts     The select preview's data and arrow arithmetic
src/components/docs/select-demo.tsx       The select's two browser renderings and their source strings
src/components/docs/selection-preview.ts   The key edges a checkbox and a switch share
src/components/docs/form-preview.ts      The form preview's messages, submit rule and accepted account
src/components/docs/form-demo.tsx        The form's two browser renderings and their source strings
src/components/docs/search-input-preview.ts The search preview's filter, count and Escape rule
src/components/docs/search-input-demo.tsx The search field's two browser renderings and their source strings
src/components/docs/stepper-preview.ts    The stepper preview's derived status and the step gate
src/components/docs/stepper-demo.tsx      The stepper's two browser renderings and their source strings
src/components/docs/avatar-preview.ts     The avatar preview's initials, roster and presence words
src/components/docs/avatar-demo.tsx       The avatar's roster panel and state gallery
src/components/docs/badge-preview.ts       The badge preview's statuses, filter and press route
src/components/docs/badge-demo.tsx        The badge's deployments panel and state gallery
src/components/docs/timeline-preview.ts   The timeline preview's app-marked statuses and its cursor
src/components/docs/timeline-demo.tsx     The timeline's two browser renderings and their source strings
src/components/docs/switch-preview.ts      The switch preview's dependent-setting rule and its slide duration
src/components/docs/switch-demo.tsx        The switch's two browser renderings and their source strings
src/components/docs/table-preview.ts      The table preview's copy of the package's sort, selection and filter rules
src/components/docs/table-demo.tsx        The table's browser renderings and their source strings
src/components/docs/tag-input-preview.ts   The tag preview's commit rules, budget and publish gate
src/components/docs/tag-input-demo.tsx     The tag field's two browser renderings and their source strings
src/components/docs/tooltip-preview.ts    The tip's clock: delay, close grace, reopen window, traversal
src/components/docs/tooltip-demo.tsx      The tooltip's two browser renderings and their source strings
src/components/docs/box-demo.tsx          The box's surface tones and facts as a labelled diagram
src/components/docs/button-group-demo.tsx The button group's attached and separated modes
src/components/docs/checkbox-group-demo.tsx The group's roving one-tab-stop list around the shared box
src/components/docs/grid-demo.tsx         The grid's equal tracks as a labelled diagram
src/components/docs/icon-button-demo.tsx  The square action's variants and busy state
src/components/docs/input-demo.tsx        The field's resting, invalid and disabled chrome
src/components/docs/label-demo.tsx        The visible name's plain, required and invalid paint
src/components/docs/meter-demo.tsx        The measurement's four tones
src/components/docs/number-field-demo.tsx The field chrome and its pointer steppers
src/components/docs/otp-field-demo.tsx    The six cells and an invalid code
src/components/docs/progress-demo.tsx     The determinate fill, buffer and indeterminate segment
src/components/docs/radio-group-demo.tsx  The one-choice group and its selected dot
src/components/docs/range-slider-demo.tsx The two thumbs and the fill between them
src/components/docs/rating-demo.tsx       The stars, whole and half
src/components/docs/scroll-area-demo.tsx  The vertical and horizontal bounded frames
src/components/docs/separator-demo.tsx    The horizontal, vertical and captioned rules
src/components/docs/skeleton-demo.tsx     The pulsing placeholder shapes
src/components/docs/slider-demo.tsx       The track, fill, thumb and disabled paint
src/components/docs/spacer-demo.tsx       The fixed step and the flexible filler
src/components/docs/spinner-demo.tsx      The three dots, their sizes and accents
src/components/docs/stack-demo.tsx        The row, column and justified arrangements
src/components/docs/text-demo.tsx         The roles and tones of one run of type
src/components/docs/textarea-demo.tsx     The multi-line field's chrome and invalid paint
src/components/docs/theme-provider-demo.tsx The same surface painted dark and light
src/components/docs/toggle-demo.tsx       The pressed paint and the disabled state
src/components/docs/toggle-group-demo.tsx The single and multiple mode toolbars
src/components/docs/sources.ts            The real source files the Code tab shows
src/components/docs/component-source.tsx  The copyable source block, for a curated page
src/components/docs/package-source.tsx    The generated source block a package page ends with
src/components/docs/install.tsx           The nub / manual install tabs
src/components/docs/copy-page.tsx         Copy the page as Markdown
src/components/docs/status-strip.tsx      The generated COMPONENTS.md status and verdict
src/components/docs/dependency-strip.tsx  The generated "Built on" line: the component's workspace imports
src/components/docs/native-run-note.tsx   The note above a package page: the playground command and its page
src/components/docs/page-example.tsx      The worked example a component page links back to
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
src/components/docs/token-list.tsx       A contract's roles or surfaces, rendered from the package's array
src/components/docs/block-index.tsx       The Blocks index
src/components/docs/blocks.tsx            The Login, Settings and Dashboard recipes
src/components/docs/block-preview.tsx     A block's browser rendering
src/components/docs/dashboard.tsx         The dashboard's charts and stats
src/components/docs/live-surface.tsx      Boots the wasm renderer on /live and reports what it painted
src/components/docs/theme-editor.tsx      The live token editor on /docs/themes
src/components/docs/theme-editor-logic.ts Its pure core: edits, audit, copy output
src/components/docs/scatter.ts              The decorative fields' deterministic point scatter
src/components/docs/auto-height-demo.tsx   The auto height's expand/collapse preview and its source
src/components/docs/avatar-group-demo.tsx  The facepile's overlap, ring and overflow chip
src/components/docs/bubbles-demo.tsx       The bubbles field's rising scatter
src/components/docs/code-block-demo.tsx    The code block's title bar, gutter and source
src/components/docs/copy-button-demo.tsx   The copy button's acknowledge flip
src/components/docs/countdown-demo.tsx     The countdown's clock formats
src/components/docs/counting-number-demo.tsx The counting number's easing ramp
src/components/docs/fireworks-demo.tsx     The fireworks field's bursting sparks
src/components/docs/glyph-demo.tsx         The glyph wall's seeded marks
src/components/docs/gradient-demo.tsx      The gradient surface's two-stop ramp
src/components/docs/gradient-text-demo.tsx The gradient text's per-glyph ramp
src/components/docs/gravity-stars-demo.tsx The gravity stars field's falling lights
src/components/docs/hexagon-demo.tsx       The hexagon field's outline grid
src/components/docs/highlight-text-demo.tsx The highlight text's query wash
src/components/docs/image-zoom-demo.tsx    The image zoom's pointer lens
src/components/docs/liquid-button-demo.tsx The liquid button's flooding fill
src/components/docs/magnetic-demo.tsx      The magnetic card's pointer lean
src/components/docs/motion-grid-demo.tsx   The motion grid's slot travel
src/components/docs/page-transition-demo.tsx The page transition's view swap
src/components/docs/particles-demo.tsx     The particles field's drifting motes
src/components/docs/pinned-list-demo.tsx   The pinned list's sticky headers
src/components/docs/reveal-demo.tsx        The reveal's fade-and-rise entrance
src/components/docs/ripple-button-demo.tsx The ripple button's press wash
src/components/docs/rolling-text-demo.tsx  The rolling text's vertical roll
src/components/docs/rotating-text-demo.tsx The rotating text's phrase interval
src/components/docs/scroll-fade-demo.tsx   The scroll fade's edge strips
src/components/docs/scroll-progress-demo.tsx The scroll progress's reading line
src/components/docs/shine-button-demo.tsx  The shine button's sheen sweep
src/components/docs/sliding-number-demo.tsx The sliding number's rolling digits
src/components/docs/sliding-text-demo.tsx  The sliding text's horizontal slide
src/components/docs/splitting-text-demo.tsx The splitting text's word stagger
src/components/docs/stars-demo.tsx         The stars field's twinkling lights
src/components/docs/theme-toggler-demo.tsx The theme toggler's light/dark flip
src/components/docs/topography-demo.tsx    The topography field's contour lines
src/components/docs/typing-text-demo.tsx   The typing text's character reveal
src/styles/app.css                        Tailwind, Fumadocs presets and the docs palette
src/styles/demos.css                      Scoped browser previews of the native components
src/styles/blocks.css                     The block recipes' preview styles
src/styles/landing.css                    The landing page's styles
src/styles/platform.css                   The platform switch's own chrome
src/styles/theme-editor.css               The theme editor's chrome and preview
src/styles/live.css                       The live surface's bar and its fallback sentence

src/lib/docs-view.tsx               The shared docs layout and the two-collection page template
src/lib/layout.shared.tsx           The nav chrome: brand and top-level links
src/lib/source.ts                   The Fumadocs collection for content/docs
src/lib/doc-snippets.test-util.ts   The shared page-snippet and symbol resolve for the page guards
src/lib/column-drag.test-util.ts    The column drag both guards print, derived from the probe
src/lib/search-index.ts             The search index's page list: curated pages shadow package pages
src/lib/search-links.ts             The search dialog's pre-query entry points
src/lib/package-docs.ts             The loaders for the three package collections
src/lib/collection-routes.ts        The registry: every mounted package directory, route, section
src/lib/collection-pages.ts         The pages a mounted collection serves, including one that ships none yet
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
src/lib/page-dependencies.ts        The dependency model: a page's component imports, grouped by package
src/lib/page-dependencies-source.ts Reads each page's component module at build time
src/lib/page-dependencies-data.ts   The dependency index, read from the plugin's build-time module
src/lib/page-source.ts              The source model: a page's module and the loader that reads it
src/lib/page-source-data.ts         The source index, read from the plugin's build-time module
src/lib/examples.ts                 The example registry: ids, paths and header summaries
src/lib/examples-data.ts            Reads packages/*/examples/*.example.tsx at build time
src/lib/component-index.ts          The component index: URL mapping, curated shadowing, filter
src/lib/component-index-data.ts     The index, from every docs collection at build time
src/lib/patterns.ts                 The one source of the patterns and their parts
src/lib/licenses.ts                 The LICENSES/*.md parse
src/lib/licenses-data.ts            The licence records, at build time
src/lib/platform.ts                 The platform and look switch: parse, label, resolve, and the mode a preview paints
src/lib/platform-storage.ts         The remembered platform/look choice, per axis
src/lib/system-palette.ts           The desktop palette /docs/theming decodes and maps, from the shipped functions
src/lib/theme-css.ts                Theme → CSS variables, shared with every preview
src/lib/live-batch.ts               /live's mutation batch, styled by the primitives' resolver
src/lib/block-source.test.ts        A block's copyable source, resolved against the workspace
src/lib/gpuix-web.test.ts           The GPUix web build: browser entry, shared memory and the policy's status
src/lib/live-frame.test.ts          The live probe's judge and its PNG pixel reader
src/lib/live-surface.test.ts        /live's batch, its route and the isolation headers

scripts/live-frame.ts               The live surface's frame contract: page, report, pixel
scripts/chrome-session.ts           The headless-Chrome page both probes drive
scripts/live-surface-probe.ts       Drives headless Chrome to prove a real GPUix frame paints
scripts/live-route-probe.ts         Holds /live to the same rule, and a press to the renderer's path
scripts/preview-press-probe.ts      Presses a hydrated preview and reads the carousel's own state
scripts/palette-switch-probe.ts     Presses the Palette group and reads every surface's palette back
scripts/platform-switch-probe.ts    Presses Windows then macOS and reads every surface's platform, height and URL back
```

`src/routeTree.gen.ts` is generated by the TanStack Start plugin and is not
edited; `src/lib/sidebar-pages.test-util.ts` is the shared `meta.json` parse the
three sidebar guards import, `src/lib/doc-snippets.test-util.ts` is the
shared snippet/import resolve the page guards use (the symbol index is read
once, so every page is judged by the same rule), and
`src/lib/column-drag.test-util.ts` derives the widths the column-drag guards
print from `column-resize-lifecycle`'s own fixture and steps.

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
  edit. A curated page shadows its package page, and each row carries the
  `COMPONENTS.md` status and support verdict the page's status strip prints, so
  a component the runtime supports only in part is marked in the list and
  `partial` is a query.
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
does not ship. `docs/preview-strategy.md` is the full policy.

A block page mounts its reproduction by registry key (`<BlockPreview
name="dashboard-01" />`); `src/lib/block-page.test.ts` holds every page to a
registered key and every registered block to a page, and checks both are in the
Blocks sidebar. The dashboard's chart recipe states the runtime's measured rule —
one `<svg source>` paints one tint, so a multi-series chart is one stacked
element per colour — because the page used to call a single element a native
chart. The Code tab is the real source too: `src/lib/block-source.test.ts`
resolves every recipe's `@gpuixui/*` imports against the workspace, so a renamed
export fails instead of teaching a broken import.

## The live surface

`/live` is the one page that is not an approximation: `@gpuix/native`'s wasm
browser build is a real GPUix surface (one document-owned canvas, cross-origin
isolation), and the route paints a `@gpuixui/primitives` filled action on it.
`src/lib/live-batch.ts` is the screen, with every `StyleDesc` resolved by
`@gpuixui/primitives/core`; `src/components/docs/live-surface.tsx` boots the
renderer inside an effect, mounts once, and reports the element bounds it laid
out. `vite.config.ts` resolves the wasm glue past the package's `exports` (its
`browser.mjs` uses a bundler-only `with { type: "file" }` import) and asks Vite
for the wasm as an asset; `/live` alone is cross-origin isolated, in dev
(`vite.config.ts`) and in production (`src/start.ts`). Every component page's
preview note links here.

Both probes live outside `src/`: they are host tools, and the browser driver they
share is `scripts/chrome-session.ts`. `scripts/live-surface-probe.ts` proves the
renderer paints at all; `scripts/live-route-probe.ts` holds the page a reader
opens to the same rule — it samples the button's fill, the banner's resting fill,
presses through `renderer.simulateClick`, and samples the banner again.
`scripts/live-frame.ts` is the frame contract both judge against.

Measured 2026-10-22, macOS 15.8.1 x86_64, headless Google Chrome 155.0.8059.80
over SwiftShader: the button sampled `#a7a9ff` (`controlStyle`'s dark primary),
the banner `#222730` (`muted`), and after a press `#0e5135` (`successSoft`) with
the status line reading "Pressed 1 time". Frames:
`.artifacts/live/docs-live-route-{before,after}.png` (verification-only).

Owed: the React reconciler mount. `render(<App/>, { renderer })` takes an
injected renderer, but `@gpuix/react` imports `@gpuix/native/runtime` and
`@gpuix/native/automation` at module scope and nothing has measured that graph in
a browser, so the route drives the batch protocol by hand.

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
and `tsx` fence — 132 pages, the site's own 40 plus the 92 the packages ship —
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
