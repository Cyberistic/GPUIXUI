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
styling.mdx                  The class recipe layer: two registries, states, refusals, extension, the React bridge
theming.mdx                  Semantic roles, themes, the platform switch, the look parameter, the desktop palette
dark-mode.mdx                App-owned mode switching, following the desktop's palette, restoring a stored theme
typography.mdx               The ten type roles, the two families, the platform rule
diagrams.mdx                 Mermaid diagrams at build time, themed from the page's roles
runtime.mdx                  What the pinned GPUix provides, what it does not, the browser build behind /live, and the workaround
accessibility.mdx            What a screen reader hears, which states have no attribute, proving the tree, the pressable-target floors and the keyboard dim
motion.mdx                   House timing and the seam a stored one is read at, retained values and the tween a clock can name, the curves a timing name stands for, the reduced-motion policy, the presence seam (and the clock a stored phase must fit) and the React hooks
layouts.mdx                  The layout lane: primitives, the window frame, runtime facts
workspace/index.mdx            The desktop-shell lane: composing parts, the docking gate
data-display/index.mdx      The data lane: what ships, the table gate, runtime gaps
patterns.mdx                 The workflows that cross components, and who owns the state
keyboard.mdx                 The chord grammar, keymaps, sequences, the command registry and its React provider
examples.mdx                 The example registry, generated from every package's examples
playground.mdx               The companion native app: run commands, the probe catalogue, where evidence lands
reference.mdx                The public entry points and the symbols behind them
status.mdx                   The whole component inventory, generated from COMPONENTS.md
themes.mdx                   The live token editor, its audit and its copy output
blocks/index.mdx             Page-level recipes composed from the library
blocks/dashboard.mdx         An activity dashboard composed from the library
blocks/sign-in.mdx           A full sign-in page: navbar, form card, illustrated quote panel
blocks/dashboard-management.mdx A three-column management console: service health, deploys, toasts, keys
blocks/settings.mdx          A settings page with tabbed sections
blocks/kanban.mdx            A project task board: sidebar, four counted columns, cards that move
blocks/settings-dialog.mdx   A modal settings window: section nav, switch, font-size slider, layouts
blocks/notification-centre.mdx A notification centre: filters, four row bodies, unread dots
blocks/command-centre.mdx    A command palette over a dimmed page: filter, highlight, run line
blocks/hunter-pipeline.mdx   A guild's licence dashboard: readings, stages, blocked dossiers, renown
blocks/file-manager.mdx      A three-pane browser: folders, image tiles and file facts
blocks/email-inbox.mdx       A four-pane mail client with a filterable list
blocks/conversations.mdx     A macOS Messages window: threads, search and a composer
blocks/sidebar.mdx           All sixteen sidebar blocks on one page, each linked to shadcn and live
components/index.mdx         The component grid: one preview tile per page, filter in the URL
components/accordion.mdx     Curated: the two modes, the chevron swap, the unmounted body
components/alert.mdx         Curated: four tones, the composition, no announcement claimed
components/auth.mdx          Curated: the four auth cards, the states and the sign-in page
components/avatar.mdx        Curated: the fallback table, the measured dot roles, the roster panel
components/badge.mdx         Curated: the seven variants, the fixed sizes, the press it leaves to its row
components/breadcrumb.mdx    Curated: the collapse budget, the separator that leaves with its item
components/button.mdx        Curated: previews, install, source, variants and its own API table
components/calendar.mdx      Curated: three selection modes, outside days, the roving key path
components/card.mdx          Curated: the three treatments, the recipe's fixed metrics
components/carousel.mdx      Curated: discrete stepping, the dot pill and the kept slides
components/checkbox.mdx      Curated: the three states, the 24px target, the mixed parent
components/color-picker.mdx  Curated: the hex grammar, the commit split, the swatch's own tab stop
components/collapsible.mdx   Curated: the measured reveal, the unmount, the disabled gate
components/combobox.mdx      Curated: the ranked list, the disabled row, the create row
components/command-menu.mdx  Curated: the palette's matcher, group ranking, keys and exit window
components/confirm-dialog.mdx Curated: Cancel first, confirm never closes, the frozen busy mark
components/context-menu.mdx  Curated: the pointer point, the restore gate, the type-ahead window, Base UI's two hover waits and the shift-free placement
components/date-picker.mdx   Curated: the calendar in a popover, ISO or span values, inclusive bounds
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
components/tooltip.mdx       Curated: the tip's clock, its entry and held exit, the traversal that never opens it
primitives/index.mdx         The Tier 1 section index (its pages come from the packages)
testing.mdx                  The two test lanes, the check model and the report
contributing.mdx             The checks, the worktree rules, the component checklist and how to write its page
license.mdx                  Licenses and attribution, read from LICENSES/*.md
```

## Site source

```
plugins/public-symbols-plugin.ts    Build-time module: the public symbol index
plugins/page-dependencies-plugin.ts Build-time module: the packages each package page's component imports
plugins/page-source-plugin.ts       Build-time module: each package page's module, as a lazy loader
plugins/package-graph-plugin.ts     Build-time module: the package graph behind the architecture table

src/start.ts                        TanStack Start instance, the Worker cache policy and the server functions' origin check
src/router.tsx                      The router instance
src/routes/__root.tsx               The document shell, icons and the Fumadocs provider
src/routes/index.tsx                The landing page at /
src/routes/live.tsx                 /live, the real GPUix surface (whole page)
src/routes/docs/index.tsx           /docs, the Introduction
src/routes/docs/$.tsx               Every other docs page, from either collection
src/routes/api/search.ts            Fumadocs search endpoint over every mounted collection
src/routes/sitemap[.]xml.ts         /sitemap.xml, generated from every collection
src/routes/llms[.]txt.ts            /llms.txt, the page index an agent reads instead of the sidebar
src/routes/llms-full[.]txt.ts       /llms-full.txt, every page as Markdown in one document

src/components/mdx.tsx              The MDX component registry
src/components/highlighted-code.tsx A render-time code block, in the library's syntax palette
src/components/landing/landing.tsx  The landing page composition
src/components/landing/deck.tsx     The three-desktop deck and the Omarchy strip under it
src/components/landing/terminal.tsx The editor moment: a typed command, then VS Code
src/components/landing/lineage.tsx  References and attribution on the landing page
src/components/landing/reduced-motion.ts The one prefers-reduced-motion query both moving surfaces read
src/components/landing/data.ts      The landing page's content, as data
src/components/not-found.tsx        The 404 inside the docs chrome
src/components/skip-link.tsx        The site's first tab stop and the content id it targets

src/components/docs/component-preview.tsx The Preview/Code component preview
src/components/docs/preview-surface.tsx   A preview carrying the resolved theme's variables
src/components/docs/demos.tsx             The browser renderings and their source strings
src/components/docs/bubble-demo.tsx        The seven surfaces, joined corners and action strip
src/components/docs/chat-demo.tsx          The chat block: fixed header, transcript, rail and composer
src/components/docs/empty-state-demo.tsx   The empty panel's three shapes
src/components/docs/fieldset-demo.tsx      The named group's enabled and disabled states
src/components/docs/hotkey-chord.ts       The browser key in the recorder's chord grammar
src/components/docs/hotkey-recorder-demo.tsx The chord recorder's three states, and a real chord
src/components/docs/keyboard-shortcuts-demo.tsx The cheat sheet's groups and keycaps
src/components/docs/mention-input-demo.tsx The mention field's query and ranked list
src/components/docs/message-demo.tsx       The conversation row's variants and slots
src/components/docs/message-scroller-demo.tsx The scroller's pin, unread and jump
src/components/docs/inspector-preview.ts    The property inspector preview's one object, its area and its two size actions
src/components/docs/property-panel-demo.tsx The inspector's four readers of that object and its source string
src/components/docs/navigation-menu-demo.tsx The nav's two browser renderings and their source strings
src/components/docs/navigation-menu-preview.ts The nav's reducer, its hover clock and its roving group
src/components/docs/preview-card-demo.tsx  The hoverable card's open and close
src/components/docs/hover-card-demo.tsx   The hover card's delay, the travel into it and its two open paths
src/components/docs/aspect-ratio-demo.tsx The ratio box's height under a width the reader moves
src/components/docs/item-demo.tsx         The item row's media, text and actions in three surfaces
src/components/docs/input-group-demo.tsx  The group's one edge, its addons and the field inside
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
src/components/docs/drawer-preview.ts     The drawer preview's edges, dismiss stack and filter rules
src/components/docs/sheet-drawer-preview.tsx The sheet and drawer drawings, opened on the surface
src/components/docs/popover-preview.ts    The popover preview's side gap, snap margin and pull-back
src/components/docs/popover-sides.tsx     The popover's four sides and its collision pull-back
src/components/docs/sidebar-demo.tsx      The sidebar and account-menu drawings and their source strings
src/components/docs/list-preview.ts       The list preview's arrow order, type-ahead and selection rules
src/components/docs/list-demo.tsx         The list's two browser renderings and their source strings
src/components/docs/dock-preview.ts       The split preview's rule, read from the dock package's reducers
src/components/docs/dock-layout-demo.tsx  The dock tree's split, tab strips and presses, on the package's reducers
src/components/docs/file-tree-demo.tsx     The workspace tree's rows, glyphs and selection, on the files and data packages' rules
src/components/docs/log-viewer-demo.tsx    The build log's parse, filter and level tints, on the log package's rules
src/components/docs/files-property-panel-demo.tsx The inspector's four row kinds and the object they repaint, on the property package's record
src/components/docs/toolbar-demo.tsx      The toolbar's overflow split and roving tab stop, on the shell package's reducers
src/components/docs/app-menu-demo.tsx     The menu bar's traversal and hover rule, on the shell package's reducers
src/components/docs/status-bar-demo.tsx   The status bar's tone roles and its two groups, on the shell package's rule
src/lib/shell-logic.ts                    The shell package's own reducers, read while it publishes no logic subpath
src/components/docs/browser-icon.tsx       One icon's shipped markup, painted in the surrounding ink
src/components/docs/mounted-preview.tsx    The preview a package page gets from the site's own table
src/components/docs/dock-demo.tsx         The dock's browser rendering and its SplitPane source
src/components/docs/inline-edit-preview.ts The rename's finish rule, focus reason and the app's name gate
src/components/docs/inline-edit-demo.tsx  The inline edit's two browser renderings and their source strings
src/components/docs/pagination-preview.ts The pagination preview's window rule, clamp and page slice
src/components/docs/pagination-demo.tsx   The pagination's two browser renderings and their source strings
src/components/docs/menu-preview.ts       The menu preview's row model and arrow arithmetic
src/components/docs/command-preview.ts    The palette preview's matcher and group ranking
src/components/docs/context-menu-preview.ts The context menu's points, restore gate, type-ahead, frame placement and hover waits
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
src/components/docs/multi-step-form-preview.ts The wizard preview's gates and step arithmetic
src/components/docs/multi-step-form-demo.tsx The wizard's browser rendering and its source string
src/components/docs/avatar-preview.ts     The avatar preview's initials, roster and presence words
src/components/docs/avatar-demo.tsx       The avatar's roster panel and state gallery
src/components/docs/badge-preview.ts       The badge preview's statuses, filter and press route
src/components/docs/badge-demo.tsx        The badge's deployments panel and state gallery
src/components/docs/timeline-preview.ts   The timeline preview's app-marked statuses and its cursor
src/components/docs/timeline-demo.tsx     The timeline's two browser renderings and their source strings
src/components/docs/switch-preview.ts      The switch preview's dependent-setting rule, and the slide's duration and curve derived from the component's timing
src/components/docs/switch-demo.tsx        The switch's two browser renderings and their source strings
src/components/docs/table-preview.ts      The table preview's copy of the package's sort, selection and filter rules
src/components/docs/table-rule-demos.tsx  The sorting and selection pages' drawings over the package's row model
src/components/docs/advanced-filter-demo.tsx The query builder's tree, its sentence and a refused stored query
src/components/docs/virtualization-demo.tsx The window calculator's mounted rows and their offsets
src/components/docs/tree-demo.tsx         The two tree drawings: the package's controller and its window calculator
src/components/docs/tree-keys.ts          The browser keys both tree drawings report as the package's own
src/components/docs/window-preview.ts      The rows a viewport shows, against the window that mounts them
src/components/docs/column-configuration-demo.tsx Show, hide, move and keyboard-resize over the column reducers
src/components/docs/charts-demo.tsx       The chart geometry, its axis and the theme's categorical swatches
src/components/docs/key-value-demo.tsx    The list's fixed label track and the width a layout cannot paint
src/components/docs/data-toolbar-demo.tsx The toolbar's debounced wait, its blank-name default and the rows it reports
src/components/docs/table-filter-demo.tsx The filter field's blank name and hint, and the literal match the table owns
src/components/docs/expandable-rows-demo.tsx The disclosure row: the press, the sibling panel and two open at once
src/components/docs/frozen-columns-demo.tsx The two mirrored scrollers and the height rule the composition reads
src/components/docs/stat-card-demo.tsx    The metric card's derived reading, its trend roles and the box a reader measures
src/components/docs/data-skin.test.tsx     Every data page's drawing held to the recipe its component compiles
src/components/docs/table-demo.tsx        The table's browser renderings and their source strings
src/components/docs/tag-input-preview.ts   The tag preview's commit rules, budget and publish gate
src/components/docs/tag-input-demo.tsx     The tag field's two browser renderings and their source strings
src/components/docs/tooltip-preview.ts    The tip's clock: delay, close grace, reopen window, held exit, reduced preference, traversal
src/components/docs/tooltip-demo.tsx      The tooltip's browser renderings (clock, motion switch, states) and their source strings
src/components/docs/box-demo.tsx          The box's surface tones and facts as a labelled diagram
src/components/docs/button-group-demo.tsx The button group's attached and separated modes
src/components/docs/checkbox-group-demo.tsx The group's roving one-tab-stop list around the shared box
src/components/docs/grid-demo.tsx         The grid's equal tracks as a labelled diagram
src/components/docs/icon-button-demo.tsx  The square action's variants and busy state
src/components/docs/input-demo.tsx        The field's resting, invalid and disabled chrome
src/components/docs/label-demo.tsx        The visible name's plain, required and invalid paint
src/components/docs/meter-demo.tsx        The measurement's four tones
src/components/docs/number-field-demo.tsx The field chrome and its pointer steppers
src/components/docs/otp-field-demo.tsx    The six cells that advance and take a paste, and an invalid code
src/components/docs/progress-demo.tsx     The determinate fill, buffer and indeterminate segment
src/components/docs/progress-values-demo.tsx A value stated against its maximum, and an indeterminate bar
src/components/docs/radio-group-demo.tsx  The one-choice group and its selected dot
src/components/docs/range-slider-demo.tsx The two draggable thumbs and the fill between them
src/components/docs/rating-preview.ts     The half a press on a star lands in
src/components/docs/rating-demo.tsx       The pressable stars, whole and half
src/components/docs/scroll-area-demo.tsx  The vertical and horizontal bounded frames
src/components/docs/separator-demo.tsx    The horizontal, vertical and captioned rules
src/components/docs/separator-roles-demo.tsx The semantic and decorative rules
src/components/docs/skeleton-demo.tsx     The pulsing placeholder shapes
src/components/docs/skeleton-states-demo.tsx The composed card, the circle and the still frame
src/components/docs/slider-preview.ts     The end a range press grabbed
src/components/docs/slider-demo.tsx       The draggable track, its keyboard and the disabled paint
src/components/docs/slider-values-demo.tsx One value and a two-thumb range
src/components/docs/spacer-demo.tsx       The fixed step and the flexible filler
src/components/docs/spinner-demo.tsx      The three dots, their sizes and accents
src/components/docs/stack-demo.tsx        The row, column and justified arrangements
src/components/docs/text-demo.tsx         The roles and tones of one run of type
src/components/docs/textarea-demo.tsx     The multi-line field's chrome and invalid paint
src/components/docs/theme-provider-demo.tsx The same surface painted dark and light
src/components/docs/toggle-demo.tsx       The pressed paint and the disabled state
src/components/docs/toggle-toolbar-demo.tsx The text, outline and icon-only modes
src/components/docs/toggle-group-demo.tsx The single and multiple mode toolbars
src/components/docs/toggle-group-toolbar-demo.tsx The single and multiple groups a page teaches
src/components/docs/sources.ts            The real source files the Code tab shows
src/components/docs/component-source.tsx  The copyable source block, for a curated page
src/components/docs/package-source.tsx    The generated source block a package page ends with
src/components/docs/install.tsx           The nub / manual install tabs
src/components/docs/copy-page.tsx         Copy the page as Markdown
src/components/docs/edit-page.tsx         The footer link to the page's Markdown, on GitHub
src/components/docs/status-strip.tsx      The generated COMPONENTS.md status and verdict
src/components/docs/dependency-strip.tsx  The generated "Built on" line: the module's workspace imports, curated and package pages alike
src/components/docs/keyboard-strip.tsx    The generated keyboard contract: the keys a component handles, read from its own modules
src/components/docs/related-strip.tsx     The generated related-component links a package page ends with
src/components/docs/native-run-note.tsx   The note above a package page: the playground command and its page
src/components/docs/playground-scenarios.tsx The probe catalogue on /docs/playground, grouped by capability
src/components/docs/page-example.tsx      The worked example a component page links back to
src/components/docs/lane-table.tsx        The generated rows on the three lane pages
src/components/docs/inventory-cells.tsx   The status badge and note cell the generated component tables share
src/components/docs/inventory-table.tsx   The whole inventory on /docs/status, grouped by the headings in COMPONENTS.md
src/components/docs/lane-pages.tsx        The generated page list on the data and workspace lanes, each package linked to its section entry
src/components/docs/collection-index.tsx The list a collection route serves when the package writes no landing page
src/components/docs/component-index.tsx   The 3-column tile grid on /docs/components and its URL filter
src/components/docs/icon-gallery.tsx      Every icon the set publishes, from its own markup
src/components/docs/use-index-query.ts    A list filter carried in `?q=`, shared by both indexes
src/components/docs/examples-index.tsx    The generated registry on /docs/examples
src/components/docs/api-reference.tsx     The entry-point table and the symbol index
src/components/docs/package-table.tsx     The package table on /docs/architecture, generated from the manifests
src/components/docs/package-graph.tsx     The direction diagram below it, from the graph's chains
src/components/docs/type-scale.tsx        The typography specimen, from the theme
src/components/docs/theme-matrix.tsx      The built-in themes, generated from the token package
src/components/docs/token-scales.tsx      The spacing/radius/density specimens on /docs/theming
src/components/docs/style-reference.tsx   The class reference on /docs/styling, compiled from the theme
src/components/docs/platform-toggle.tsx   The platform and palette switch, and the shared preview provider
src/components/docs/look-picker.tsx       The authored looks, as a control on /docs/theming
src/components/docs/platform-style-source.tsx The copyable platform style, generated from the package's own table
src/components/docs/license-table.tsx     LICENSES/*.md, rendered
src/components/docs/patterns.tsx          The pattern workflows and the chooser
src/components/docs/series-swatches.tsx   The theme's categorical data series, on /docs/theming
src/components/docs/token-list.tsx       A contract's roles or surfaces, rendered from the package's array
src/components/docs/block-index.tsx       The Blocks index, one thumbnail card per block
src/components/docs/blocks.tsx            The block registry: Sign in, Settings, Dashboard, Dashboard management, Kanban, Settings dialog, File manager and Email inbox
src/components/docs/block-preview.tsx     A block page: the screen at the page's own width, then its recipe
src/components/docs/block-icons.tsx       The glyphs the block previews draw
src/components/docs/sidebar-rail.tsx      The shared collapsible-rail toggle and state
src/components/docs/auth-blocks.tsx       The auth examples, the sign-in page and their recipes
src/components/docs/dashboard.tsx         The dashboard's charts and stats
src/components/docs/dashboard-management.tsx The console block's browser reproduction and recipe
src/components/docs/kanban-board.tsx      The kanban board's reproduction, columns and card moves
src/components/docs/settings-dialog.tsx   The settings dialog's reproduction, theme state and controls
src/components/docs/hunter-pipeline.tsx  The guild's readings, stages, dossiers and the renown chart
src/components/docs/mermaid.ts          Rendering Mermaid with Pele, and the role mapping
src/components/docs/mermaid-diagram.tsx A diagram's frame, its caption and its refusal
src/components/docs/notification-centre.tsx The notification centre's rows, filters and mark-read state
src/components/docs/command-centre.tsx    The command centre's matcher, highlight and run line
src/components/docs/file-manager-block.tsx The file browser's reducer, panes and recipe
src/components/docs/email-inbox-block.tsx The mail client's reducer, panes and recipe
src/components/docs/conversations-block.tsx The messages window's reducer, list, thread and recipe
src/components/docs/blocks/sidebar-kit.tsx The geometry, glyphs, data, live controls and parts the sixteen sidebar examples share
src/components/docs/sidebar-examples.tsx  The sixteen examples' order, shadcn links, drawings and recipes
src/components/docs/recipe-source.tsx      The copy button and disclosure a block page ends with
src/components/docs/blocks/sidebar-01.tsx The sidebar block 01's browser reproduction and recipe
src/components/docs/blocks/sidebar-02.tsx The sidebar block 02's browser reproduction and recipe
src/components/docs/blocks/sidebar-03.tsx The sidebar block 03's browser reproduction and recipe
src/components/docs/blocks/sidebar-04.tsx The sidebar block 04's browser reproduction and recipe
src/components/docs/blocks/sidebar-05.tsx The sidebar block 05's browser reproduction and recipe
src/components/docs/blocks/sidebar-06.tsx The sidebar block 06's browser reproduction and recipe
src/components/docs/blocks/sidebar-07.tsx The sidebar block 07's browser reproduction and recipe
src/components/docs/blocks/sidebar-08.tsx The sidebar block 08's browser reproduction and recipe
src/components/docs/blocks/sidebar-09.tsx The sidebar block 09's browser reproduction and recipe
src/components/docs/blocks/sidebar-10.tsx The sidebar block 10's browser reproduction and recipe
src/components/docs/blocks/sidebar-11.tsx The sidebar block 11's browser reproduction and recipe
src/components/docs/blocks/sidebar-12.tsx The sidebar block 12's browser reproduction and recipe
src/components/docs/blocks/sidebar-13.tsx The sidebar block 13's browser reproduction and recipe
src/components/docs/blocks/sidebar-14.tsx The sidebar block 14's browser reproduction and recipe
src/components/docs/blocks/sidebar-15.tsx The sidebar block 15's browser reproduction and recipe
src/components/docs/blocks/sidebar-16.tsx The sidebar block 16's browser reproduction and recipe
src/components/docs/live-surface.tsx      Boots the wasm renderer on /live, mounts the reconciler and reports what it painted
src/components/docs/theme-editor.tsx      The live token editor
src/components/docs/theme-editor-storage.ts The editor's remembered pins, through the guarded store
src/components/docs/theme-editor-logic.ts Its pure core: edits, audit, copy output
src/components/docs/scatter.ts              The decorative fields' deterministic point scatter
src/components/docs/auto-height-demo.tsx   The auto height's expand/collapse preview and its source
src/components/docs/avatar-group-demo.tsx  The facepile's overlap, ring and overflow chip
src/components/docs/bubbles-demo.tsx       The bubbles field's rising scatter
src/components/docs/code-block-demo.tsx    The code block's title bar, gutter and source
src/components/docs/code-editor-demo.tsx   The code editor's token layer, gutter, Tab rule and read-only state
src/components/docs/code-editor-preview.ts The preview's tiny tokenizer for a tsx snippet
src/components/docs/copy-button-demo.tsx   The copy button's acknowledge flip
src/components/docs/crop-area-demo.tsx     The crop frame's mask, guides and drag, on the package's crop logic
src/components/docs/diff-viewer-demo.tsx   The diff's unified and split paints of the package's edit script
src/components/docs/drop-zone-demo.tsx     The drop target's pick action and received names
src/components/docs/file-upload-demo.tsx   The upload queue's states and simulated transfer, on the package's queue
src/components/docs/image-preview-demo.tsx The image surface's loaded, loading and error states
src/components/docs/markdown-editor-demo.tsx The source/preview split with the package's status line
src/components/docs/media-player-demo.tsx  Mux's chrome — the clock, fading bar, timeline, rate and settings — on the package's player logic
src/components/docs/panel-group-demo.tsx   The group's fractions, dividers and collapse, on the package's own reducers
src/components/docs/markdown-preview.ts    The preview's block reader, closing fences with the package's rule
src/components/docs/qr-code-demo.tsx       A scannable symbol from the package's own encoder
src/components/docs/search-replace-demo.tsx The find scan, the toggles and the replace actions
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
src/lib/docs-pages.test-util.ts     The docs pages the two machine-document guards read from both trees
src/lib/preload-recovery.ts           One reload when a route's chunk has gone
src/lib/page-commands.test-util.ts  The shared `nub run` reader the contributing and installation guards hold to the manifests
src/lib/column-drag.test-util.ts    The column drag both guards print, derived from the probe
src/lib/floating-reflow.test-util.ts The panel placement both reflow guards print, derived from the probe
src/lib/aria-budget.test-util.ts   The runtime's closed `aria-*` set, and the absence a page's limits claim
src/lib/app-css.test-util.ts       The site palette both measuring guards read from the style sheet
src/lib/search-index.ts             The search index's page list: curated pages shadow package pages
src/lib/search-results.ts           The endpoint's answer, trimmed to one row per address
src/lib/curated-twins.ts            The primitive pages a curated page replaces: served, indexed and listed once
src/lib/search-tree.ts              The tree search reads: package sections filled, separators unnamed
src/lib/search-links.ts             The search dialog's pre-query entry points
src/lib/package-docs.ts             The loaders for the three package collections
src/lib/collection-routes.ts        The registry: every mounted package directory, route, section
src/lib/package-preview.ts          The package pages the site previews, and the demo each one mounts
src/lib/collection-pages.ts         The pages a mounted collection serves, including one that ships none yet
src/lib/collection-index.ts         The index a collection route generates when the package writes no landing page
src/lib/page-tree.ts                Fills and alphabetically sorts each sidebar section
src/lib/effects.ts                  The decorative slugs the Components lane groups as Effects
src/lib/page-meta.ts                Title, description, canonical and social metadata
src/lib/page-description.ts         A description's inline link: the runs the frame paints, the words the tags print
src/lib/page-markdown.ts            Server function behind "Copy page"
src/lib/page-edit.ts                The Markdown file behind a page, for its GitHub link
src/lib/site.ts                     The one deployed origin
src/lib/shared.ts                   App name, docs route and the repository link
src/lib/sitemap.ts                  The sitemap's URL set
src/lib/prerender-pages.ts          The routes the build renders once, and the one route it leaves to the Worker
src/lib/llms.ts                     /llms.txt: every page, grouped by the sidebar's section, with its note
src/lib/llms-full.ts                /llms-full.txt: every page's own Markdown, in the index's order
src/lib/virtual-modules.d.ts        The types of the build-time modules
src/lib/fonts.ts                    The `.SystemUIFont` sentinel → CSS stack bridge for the previews
src/lib/inventory.ts                Parses the tier tables and animated catalogue of COMPONENTS.md into rows and sections
src/lib/inventory-data.ts           The parsed inventory, at build time
src/lib/inventory-page.ts           Groups the inventory by its own headings and joins each row to its page
src/lib/lane-pages.ts               The pages a lane's packages ship, grouped by package
src/lib/inventory-status.ts         The page → COMPONENTS.md row join behind the status strip (title, plus the address two pages can share), both ways
src/lib/public-api.ts               Derives the entry points from each package's exports map
src/lib/public-api-data.ts          The entry points, at build time
src/lib/public-symbols.ts           The symbol index model: kinds, modules and summaries
src/lib/public-symbols-source.ts    Reads the workspace source the index describes
src/lib/public-symbols-data.ts      The index, read from the plugin's build-time module
src/lib/package-graph.ts            The package table's order, responsibilities, direction chains and model
src/lib/package-graph-source.ts     Reads packages/*/package.json for the table
src/lib/package-graph-data.ts       The graph, read from the plugin's build-time module
src/lib/page-dependencies.ts        The dependency model: a page's component imports, grouped by package; a mounted collection's route is its package's page
src/lib/page-dependencies-source.ts Reads each package page's component module and each curated page's source block, at build time
src/lib/page-dependencies-data.ts   The dependency index, read from the plugin's build-time module
src/lib/keyboard-contracts.ts      The keyboard model: each page's keys, the modules (workspace or installed runtime) they are read from, and the sentence each key earns
src/lib/page-source.ts              The source model: a page's module and the loader that reads it
src/lib/page-source-data.ts         The source index, read from the plugin's build-time module
src/lib/examples.ts                 The example registry: ids, paths and header summaries
src/lib/examples-data.ts            Reads packages/*/examples/*.example.tsx at build time
src/lib/component-index.ts          The component index: URL mapping, curated shadowing, filter
src/lib/component-index-data.ts     The index, from every docs collection at build time
src/lib/component-props.ts          The props a component declares, read through extends, aliases and Omit
src/lib/playground-registry.ts      The three playground registries, read at build time for the probe catalogue
src/lib/component-index-query.ts    The docs indexes' filter on the page URL (`?q=`)
src/lib/icon-gallery.ts             The icon gallery's entries and its paint rule
src/lib/related.ts                  The related-component families a package page's strip prints
src/lib/patterns.ts                 The one source of the patterns and their parts
src/lib/licenses.ts                 The LICENSES/*.md parse
src/lib/licenses-data.ts            The licence records, at build time
src/lib/platform.ts                 The platform and look switch: parse, label, resolve, and the mode a preview paints
src/lib/platform-style-source.ts    A shipped platform style as the file a reader copies, generated from the package
src/lib/platform-storage.ts         The remembered platform/look choice, per axis
src/lib/browser-storage.ts          The browser store, and the guard that reads a refusal as absence
src/lib/clipboard.ts                One copy call that answers an absent or refused clipboard as a failed copy
src/lib/system-palette.ts           The desktop palette /docs/theming decodes and maps, from the shipped functions
src/lib/theme-css.ts                Theme → CSS variables, shared with every preview
src/lib/style-reference.ts          The class groups /docs/styling prints, resolved by @gpuixui/tw
src/lib/code-theme.ts               The Shiki themes a code block highlights with, from the syntax palette
src/lib/remark-mermaid.ts           Turns a `mermaid` fence into a diagram at compile time
src/lib/live-scene.tsx              /live's React screen, styled by the primitives' resolver
src/lib/gpuix-native.ts             The browser entry `@gpuix/native` resolves to on /live
src/lib/block-source.test.ts        A block's copyable source, resolved against the workspace
src/lib/gpuix-web.test.ts           The GPUix web build: browser entry, shared memory and the policy's status
src/lib/live-frame.test.ts          The live probe's judge and its PNG pixel reader
src/lib/live-surface.test.ts        /live's batch, its route and the isolation headers

scripts/live-frame.ts               The live surface's frame contract: page, report, pixel
scripts/chrome-session.ts           The headless-Chrome page every probe drives, preload script included
scripts/block-thumbnails.ts          Captures each block's own page as the index tile image
scripts/live-surface-probe.ts       Drives headless Chrome to prove a real GPUix frame paints
scripts/live-route-probe.ts         Holds /live to the same rule, and a press to the renderer's path
scripts/preview-press-probe.ts      Presses a hydrated preview and reads the carousel's own state
scripts/palette-switch-probe.ts     Presses the Palette group once the surface it measures is hydrated, and reads every surface's palette back
scripts/platform-switch-probe.ts    Presses Windows then macOS and reads every surface's platform, height and URL back
scripts/docs-theme-probe.ts         Presses the docs theme toggle and holds every preview on the library's palette
scripts/data-previews-probe.ts      Presses the data lane's four drawings and reads the panels, rows, offsets and widths back
scripts/search-probe.ts             Presses the search dialog, types three queries and requires Enter to open the result
scripts/theme-editor-probe.ts       Edits, audits and resets /docs/themes in a browser that refuses site data
```

`src/routeTree.gen.ts` is generated by the TanStack Start plugin and is not
edited; `src/lib/sidebar-pages.test-util.ts` is the shared `meta.json` parse the
three sidebar guards import, `src/lib/app-css.test-util.ts` is the style sheet's
palette read for the two guards that measure it, `src/lib/doc-snippets.test-util.ts` is the
shared snippet/import resolve the page guards use (the symbol index is read
once, so every page is judged by the same rule),
`src/lib/column-drag.test-util.ts` derives the widths the column-drag guards
print from `column-resize-lifecycle`'s own fixture and steps, and
`src/lib/floating-reflow.test-util.ts` derives the boxes the capability guard
prints from `floating-reflow-lifecycle`'s fixture, its runner's window and the
probe's own README section.

## The mounted collections

The site renders a Fumadocs collection for its own pages and one for every
package that ships documentation — nine collections filling the sidebar lanes.
The package pages are rendered as-is, never copied, so the site and the package
cannot drift. A page mounts at its collection's route plus its file name, which
is why the route column is the collection's root.

| Collection | Route | Sidebar |
| ---------- | ----- | ------- |
| `content/docs` | `/docs` | the curated pages |
| `packages/primitives/docs` | `/docs/primitives/<name>` | Primitives |
| `packages/icons/docs` | `/docs/icons/<name>` | Icons |
| `packages/components/docs` | `/docs/components/<name>` | Components |
| `packages/data/docs` | `/docs/data-display/<name>` | Data display |
| `packages/editor/docs` | `/docs/editor/<name>` | Workspace |
| `packages/files/docs` | `/docs/files/<name>` | Workspace |
| `packages/shell/docs` | `/docs/shell/<name>` | Workspace |
| `packages/dock/docs` | `/docs/dock/<name>` | Workspace |
| `packages/media/docs` | `/docs/media/<name>` | Workspace |

`src/lib/page-tree.ts` merges each package's pages into its section and sorts
the section by title, so curated and package pages read as one alphabetical lane
with no sub-groups. A curated page keeps its URL, and the search index skips the
package page for that URL. A primitive curated in the Components section retires
its package page instead (`src/lib/curated-twins.ts`): the old address answers a
301 and no generated list carries it. Components is open by default; the other
lanes stay collapsed.

### The section entry

A collection's root answers too. Three packages write a landing page
(`components`, `primitives` and `data`), and the site writes those routes
itself; the other six write none, so `/docs/icons`, `/docs/editor`,
`/docs/files`, `/docs/shell`, `/docs/dock` and `/docs/media` answered **404**
while every page under them answered — a dead end for a reader who trimmed an
address or followed a breadcrumb.

`src/lib/collection-index.ts` generates the page from the collection the route
already mounts: a title and one sentence on the collection's registry entry
(`index` in `collection-routes.ts`), then one row per page with its own
frontmatter sentence and its URL. `docs-view.tsx` serves it before the 404, so a
new package page reaches the list in the same commit and a package cannot ship a
page the index omits. The sidebar does not carry the entry — the lane index is a
reader's map — but `sitemap.xml` and `/llms.txt` do, from the same registry.
`collection-index.test.ts` holds both directions against the directories on
disk: a collection with neither a landing page nor a registry entry fails by
route, and an entry for a route a site page owns fails too.

### Search

`src/routes/api/search.ts` indexes one list over every mounted collection:
`src/lib/search-index.ts` keeps a curated page in place of the package page it
shadows, so the same URL never appears twice. The dialog's breadcrumbs read
`src/lib/search-tree.ts` — the sidebar's tree with the package sections filled
and every separator left unnamed. Fumadocs treats a separator's name as a
breadcrumb, so the sidebar's group headings used to leak in (`Docs › Blocks ›
Blocks`) while a package page showed none at all; a result now names the
section it lives in, `Docs › Components` or `Docs › Primitives`.
`search-tree.test.ts` holds the shape and the route's one-tree rule.
`src/lib/search-results.ts` trims the answer to one row per address: the index
splits a long heading into several chunks that all carry the heading's anchor,
so a query used to show the same `Components › API reference` row three times.
The route keeps the best-ranked chunk for each URL and passes a body it does not
recognise through whole, so a future envelope still reaches the dialog;
`search-results.test.ts` holds the collapse, the distinct sections, the round
trip and the route's use of it.

The packages' files are written as Markdown and compiled here as MDX, which is
stricter: frontmatter must be valid YAML and prose may not contain a raw
`<tag>` outside code. `src/lib/package-docs.test.ts` guards that, that every
`packages/*/docs` directory is mounted, and that the primitives index links every
page it ships — at the curated page for the five primitives whose package page
`src/lib/curated-twins.ts` retires. A violation fails the collection, not just
one page.
`src/lib/package-page-template.test.ts` holds every package page to the two
sections a component page may never hide — `## API`, and an accessibility or
limitations section — with the pages still missing the second recorded in the
guard's ledger and owned by their package. `## Related` is **generated** rather
than required: neither frame can resolve its siblings, so `src/lib/related.ts`
names each page's family and `src/components/docs/related-strip.tsx` prints it at
the end of every page the site serves — curated and package alike.
`related-strip.test.tsx` holds the rendered line, the curated frame's mount and
the pages argued as solos; `related.test.ts` holds the model to the pages the
site serves in both directions — every page has a family or an argued solo,
every family has two or more distinct pages, and every link resolves to an
address the site answers.
`## Verification`/`## Testing` stays the page author's and is optional: it names
the suite that proves the component where the package keeps one, and the site
cannot invent a suite, so a page without the heading is not a defect the site
can fix.

Every component page — the curated pages this site writes and the package pages
it mounts — opens with a **status strip** generated from its `COMPONENTS.md` row
(`src/components/docs/status-strip.tsx`): the inventory's status and its GPUix
support verdict, plus a link to the inventory. The join is the page title
(`src/lib/inventory-status.ts`), which normalises punctuation and a trailing
plural and names the titles whose row reads differently. Two packages can ship a
component of the same name — `@gpuixui/data` and `@gpuixui/files` each have a
`PropertyPanel` — so the join also takes the page's address and `pageRowsByUrl`
pins the page whose row its title cannot name; the address reaches the index too,
so a tile cannot wear its neighbour's verdict. A page may publish
several rows — the table page teaches the column menu, the resize strip and the
filter field, the dock page its tabs, nesting and persistence — and the first one
is what its strip reports. Under it, the **Built on** line
(`src/components/docs/dependency-strip.tsx`) lists the workspace packages the
component's own module imports (§Pages that read the workspace). The guard holds
both directions: every page **every mounted collection and this site's curated
pages** serves resolves a row (the collection list comes from
`packageCollections`, so a new lane cannot sit outside the check), and every row
the inventory calls shipped is published by a page, with a row documented only on
a lane page argued in `laneRows` beside the file and probe that teach it. The
page therefore cannot claim more than the inventory, a row that changes changes
the page with no docs edit, and a page that has none is argued in the module.

The **Keyboard** block (`src/components/docs/keyboard-strip.tsx`) follows the
prose on the same two frames: the keys the component handles and the sentence
each one earns, from `src/lib/keyboard-contracts.ts`. The model names the modules
the keys were read from, and `keyboard-contracts.test.ts` holds it to them in
both directions — every fixed key a module handles is printed, nothing is printed
that it does not handle — so a handler that moves or a page that teaches a key
the component dropped fails by name. A wrapper that handles none of its own keys
(the primitives' `Select`, the components' `Combobox`, over the runtime's
headless lists) cites the installed `@gpuix/react` module instead, and the strip
says so, so a runtime release moves the page's keys the same way. A page that
writes its own `## Keyboard` section keeps it: the strip stops on the heading the
page's table of contents carries.

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
  page renders one table. The symbol filter travels in `?q=` like the component
  index's, so a narrowed view can be linked.
- **Component index** (`/docs/components`) is a three-column tile grid of every
  composed page, read from its frontmatter and its first
  `<ComponentPreview>` (`component-index.ts`), so the index cannot advertise a
  page that does not exist and a new page appears without a docs edit. A curated
  page shadows its package page, each tile renders that page's demo, and each
  tile carries the `COMPONENTS.md` status and support verdict the page's status
  strip prints, so a component the runtime supports only in part is marked in
  the grid and `partial` is a query. The grid is three across on desktop, two on
  tablet and one on a phone.
- **Lane pages** (`/docs/layouts`, `/docs/workspace`, `/docs/data-display`) get
  their rows from the tier tables of `COMPONENTS.md` through `<LaneTable>`, so a
  page cannot call a row shipped while the inventory says `todo`.
- **Implementation status** (`/docs/status`) renders every row grouped by the
  headings the document uses — the five tiers and the plan 600 animated
  catalogue, which is not a sixth tier — with the group counts and a link to the
  page that publishes each row (`src/components/docs/inventory-table.tsx`,
  `src/lib/inventory-page.ts`).
- **Typography and Theming** render specimens from the theme itself
  (`<TypeScale>`, `<TokenScales>`), so a token edit moves the page with it.
- **Styling** (`/docs/styling`) compiles its class reference through
  `@gpuixui/tw` against the resolved platform theme (`src/lib/style-reference.ts`),
  so every printed height, corner and refusal reason is the release's own answer
  and the platform switch repaints the table. The docs suite parses the
  compiler's vocabulary out of `packages/tw/src/utilities.ts`, so a utility it
  accepts without a row fails the docs until it is taught.
- **License** (`/docs/license`) renders `LICENSES/*.md` through
  `<LicenseInventory>`; a record added beside the code appears with no docs
  change.
- **Sitemap** (`/sitemap.xml`) is generated per request from the same
  collections plus the site's two routes — the landing and `/live`
  (`src/lib/sitemap.ts`) — with one URL per page and a curated page shadowing
  its package page; `public/robots.txt` points at it.
- **Machine index** (`/llms.txt`) is generated from those same collections
  (`src/lib/llms.ts`), one line per page with its description, grouped by the
  sidebar's sections. It lists the docs pages only: the landing and `/live` are
  routes a reader opens, not pages a model needs to read. `/docs/reference` links
  it.
- **Whole document** (`/llms-full.txt`) prints every page's own Markdown in the
  index's order (`src/lib/llms-full.ts`), so a reader that will not open the
  site can fetch the prose, the API tables and the limits once. The page text is
  the collection's processed Markdown — the same string the "Copy page" action
  hands a reader — and both documents share one page list and one section order,
  so they cannot disagree about which page an address serves.

## Preview honesty

`<ComponentPreview>` and `<BlockPreview>` render a browser reproduction of the
component's geometry, palette and states, always with the note that the shipped
component renders through GPUix. The same page carries the real source, so the
reader can run it in `apps/playground`. `src/lib/theme-css.ts` is the one bridge
from a `Theme` to CSS variables, and the previews take their values from the
resolved platform theme, so a preview cannot carry a colour literal the library
does not ship. `docs/preview-strategy.md` is the full policy.

### The site's own two palettes

The library's tokens paint every preview; the site's chrome is the one thing they
do not, so its colours are declared once and measured. `src/styles/app.css` holds
the docs palette (Fumadocs' surfaces in both schemes) and
`src/lib/docs-theme.test.ts` holds every text pair and the focus ring to
`@gpuixui/tokens`' floors. `src/styles/landing.css` holds the landing's own
palette and the fixed dark palette of its terminal illustration — a terminal has
no theme — and `src/lib/landing-theme.test.ts` holds both to the same floors, so
a landing caption, a chat-input hint and a terminal status line cannot be dimmer
than the least a component is allowed. Both schemes of a palette must declare
the same roles: a role added to one and forgotten in the other leaves that half
on the other's value.

The code blocks are the one place the two palettes meet: their surface is the
docs card, and their token colours are `@gpuixui/tokens`' own syntax palette, not
Fumadocs' bundled GitHub themes. `src/lib/code-theme.ts` builds both Shiki
schemes from `syntaxColors(themes[mode])`, `source.config.ts` gives them to the
MDX fences, and `src/components/highlighted-code.tsx` is the only path a
render-time block (an install command, a preview's Code tab) takes, so a block
cannot quietly fall back. `code-theme.test.ts` holds each theme to the palette,
renders a snippet through Shiki to read a token's colour back, and measures every
role on the card surface in both schemes.

A block page mounts its reproduction by registry key (`<BlockPreview
name="dashboard-01" />`); `src/lib/block-page.test.ts` holds every page to a
registered key and every registered block to a page, and checks both are in the
Blocks sidebar. A block is a page, so it is not a specimen in the component
pages' Preview/Code card: `<BlockPreview>` paints the screen at the page
column's own width — no 520px panel and no scroll box, which cropped a dashboard
and squeezed an inbox — and the recipe follows in a disclosure under it
(`block-preview.test.tsx` fails if the scene goes back inside `gx-component`).
The dashboard's charts are `@gpuixui/data`'s — `BarChart`, `DonutChart` and
`StackedBar` — and the page states the runtime's measured rule the package
implements: one `<svg source>` paints one tint, so a multi-series chart is one
stacked element per colour. Every recipe is the real source too:
`src/lib/block-source.test.ts` resolves each one's `@gpuixui/*` imports against
the workspace, so a renamed export fails instead of teaching a broken import.

The Blocks index paints one checked-in capture per block
(`public/blocks/<slug>.webp`) instead of mounting the scene, so the grid costs
twelve images rather than twelve live compositions. A capture is one rendering
and one palette, so a tile does not repaint with the switch; the block page it
links to does. The captures are made from the blocks' own pages, never drawn for
the index:
`nub run --filter @gpuixui/docs blocks:thumbnails` opens `/docs/blocks`, reads
the tile `src` list the index prints, captures each page's `.gx-block-stage` top
at 16:10 and writes it in place. A new block needs one run, and
`block-index.test.tsx` fails on a registered block whose image is missing or is
not a WebP capture.

## The live surface

`/live` is the one page that is not an approximation: `@gpuix/native`'s wasm
browser build is a real GPUix surface (one document-owned canvas, cross-origin
isolation), and the route mounts the library's own React tree on it through
`@gpuix/react`'s reconciler. `src/lib/live-scene.tsx` is the screen, written with
the reconciler's JSX runtime and every `StyleDesc` resolved by
`@gpuixui/primitives/core`; `src/components/docs/live-surface.tsx` boots the
renderer inside an effect, mounts once, and reports the element bounds it laid
out. It uses `createRoot(renderer).render(<App />)` rather than `render()`: the
latter installs Node error handlers, and Vite's browser `process` shim (`{ env }`)
has no `.on`, so it throws before the first frame. `vite.config.ts` resolves
`@gpuix/native` to `src/lib/gpuix-native.ts` — the package's own `browser.mjs`
keeps a bundler-only `with { type: "file" }` import inside a pre-bundled
dependency — and the `/wasm/*` rule reads the glue; `/live` alone is
cross-origin isolated, in dev (`vite.config.ts`) and in production
(`src/start.ts`). Every component page's preview note links here.

Both probes live outside `src/`: they are host tools, and the browser driver they
share is `scripts/chrome-session.ts`. `scripts/live-surface-probe.ts` proves the
renderer paints at all; `scripts/live-route-probe.ts` holds the page a reader
opens to the same rule — it samples the button's fill, the banner's resting fill,
presses through the automation locator, and samples the banner again.
`scripts/live-frame.ts` is the frame contract both judge against.

Measured 2026-10-22, macOS 15.8.1 x86_64, headless Google Chrome 155.0.8059.80
over SwiftShader: the button sampled `#a7a9ff` (`controlStyle`'s dark primary),
the banner `#1e222a` (`muted`), and after a press `#0e5135` (`successSoft`) with
the status line reading "Pressed 1 time". Frames:
`.artifacts/live/docs-live-route-{before,after}.png` (verification-only).

The reconciler mount was measured on 2026-10-23 on the same host and browser: the
page reported `status=painting`, the retained text read
`A real GPUix frame,Painted by the wasm renderer through the React reconciler.,
Press me,Waiting for a press`, the button sampled `#a7a9ff` at `41,113`, the
banner `#1e222a` at `500,149`, and one press through the automation locator
sampled `#0e5135` with "Pressed 1 time" — a React tree, a real press.

## The platform switch and the look picker

`PlatformToggle` sits in the sidebar footer and offers macOS, Linux, Windows and
Default — the mission's four platform names and **no look group**, because a look
is not a fifth platform. `src/lib/platform.ts` resolves
`platformTheme(themes[mode], platform)`; a look is applied over it because the
authored styles are library data: `?look=luna`, `?look=aero` or `?look=omarchy`
resolves `retroStyles` (**Windows XP (Luna)**, **Windows 7 (Aero)**, **Omarchy**)
through `applyStyle`. The choice is carried in
`?platform=…&mode=…&look=…` and remembered in local storage, and every preview
renders on a `PreviewSurface` that applies the resolved theme's variables,
`data-platform`, `data-mode` and `data-look`. A preview therefore paints the
library's roles, radii, families and density, not a docs palette. `/docs/theming`
mounts `components/docs/look-picker.tsx` — the page's own control, not a sidebar
group — so a reader presses a look and the specimens beside it repaint; it is
documented there under **The look picker**.

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
adds the API tables, limitations and the example to run.

The copies are checked on every page the site mounts, not only the curated ones:
`src/lib/page-snippets.test.ts` resolves each `@gpuixui/*` import in every `ts`
and `tsx` fence — the site's own pages and every page the packages ship —
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

## Editing a page

Every docs page ends with the Markdown file that renders it, named and linked to
GitHub's edit view — the reader who finds a wrong sentence is the one who can
fix it, and a page that does not say which file it is leaves them searching the
tree. `src/lib/page-edit.ts` derives the path from the same `origin` and `path`
the loader hands the frame; `src/components/docs/edit-page.tsx` is the footer
line. No page writes its own path, so renaming a file cannot leave the link
behind: a curated page keeps its URL over the package page it shadows, so
`/docs/components/dialog` edits `apps/docs/content/docs/components/dialog.mdx`,
not the package's displaced copy.

`page-edit.test.ts` walks both collections, resolves every page the site serves
to a file, and fails on one that does not exist; `edit-page.test.tsx` holds the
href, the printed path and the frame's mount. The ledger's one rule applies to
the link as well: the file is derived from the page, never typed beside it.

## Commands

```sh
nub run dev:docs                                 # dev server
nub run --filter @gpuixui/docs test              # vitest, including the page guards
nub run --filter @gpuixui/docs blocks:thumbnails # recapture the Blocks index images
nub run --filter @gpuixui/docs build             # production build
nub run --filter @gpuixui/docs check-types       # tsc
```

## Generated trees

`nub run dev:docs` and the build write three trees beside the source, never into
it: `.tanstack/` (TanStack Start's route tree, rebuilt on every start),
`.source/` (Fumadocs' collection output) and `dist/`. All three stay invisible to
git — `.tanstack/` through this app's own `.gitignore`, the other two through the
repository root — so `git add apps/docs` stages a lane and never a build. The
live probes' evidence directory (`.artifacts/`, at the repository root) is held
to the same rule. `src/lib/build-outputs.test.ts` asks git for each path's verdict
with `check-ignore --no-index` and holds three contributor files as the negative
control.

## Prerendering

Every page is content, so the build renders every page once and the Worker
renders none of them per request. `src/lib/prerender-pages.ts` derives the list
from the same inventory the sitemap advertises — this site's own collection, the
nine mounted package collections, the indexes a collection route generates, and
the landing — and `vite.config.ts` hands it to TanStack Start's prerender. Each
path is written as `dist/client/<path>/index.html`; `packages/deploy` sets the
asset layer's `htmlHandling` to `drop-trailing-slash`, so `/docs/components/button`
is answered by that file with a 200, `/docs/components/button/` redirects to it,
and the Worker is not invoked at all (`runWorkerFirst` stays off).

The three machine documents are prerendered with the pages: `/sitemap.xml`,
`/llms.txt` and `/llms-full.txt` are generated from the same collections, no
request changes them, and `/llms-full.txt` — every page's Markdown in one
response — is otherwise the most expensive thing the Worker could render.

What stays server-rendered is what a static document cannot be:

| Route | Why it renders per request |
| ----- | -------------------------- |
| `/live` | Boots the wasm renderer, which needs the per-request cross-origin isolation headers (`src/start.ts`) a static asset never carries |
| `/api/search` | Builds the answer to a query |
| A retired curated twin | A 301, which a prerendered file would answer with a page instead |
| An address no page claims | The 404 page |

Nothing interactive moves to the server with it: the preview switch, the search
dialog, the copy buttons and the playground all run in the browser after the
prerendered HTML hydrates, exactly as they did after an SSR response. A choice
carried in `?platform=` is applied by the client, so a shared link still opens on
the platform it asked for.

`vite build` clears `dist/` before it writes, so a prerendered file can never
outlive the page it renders. Serving a stale `dist/` by hand is the one way to
see a page 404 on its own assets and never hydrate: the HTML names hashed files
that the build it belongs to shipped.

## Deploy

```sh
cd packages/deploy
nub run deploy:docs
```

The stack deploys `Cloudflare.Website.Vite` as `gpuixui-docs` with
`rootDir: "../../apps/docs"`. Alchemy injects the Cloudflare Vite plugin, builds
the app and attaches the custom domain. Cloudflare credentials come from the
environment; no secret is stored in this repository.
