# Preview strategy — what a component page shows, and how

`MISSION.md` sets the constraint: the library renders through **GPUix**, the
documentation site runs in a **browser**, and a browser preview may not pretend
to be the native surface. This file records the strategy the site uses, the
theming rule that keeps a preview honest, and the template every component page
follows.

## The strategy: labelled approximation, plus real source

Of the four strategies the mission allows —

1. embed a real GPUix surface in the page,
2. ship a companion native playground,
3. render a browser approximation **labelled as one**,
4. give source, screenshots and a limitation notice where the interaction cannot
   be shown,

this site uses **3 for the paint and geometry, and 2 for the runtime**:

- A `<ComponentPreview>` (or `<BlockPreview>`) renders a browser reproduction of
  the component's geometry, palette and states. Every preview carries a note:
  *"Browser preview: the geometry, palette and states of the native component.
  The shipped component renders through GPUix, not the DOM."*
- The same page shows the **copyable source** (`<ComponentSource>`), so the
  reader can run the real component in `apps/playground` — the companion native
  playground — rather than trust the drawing.
- Where the runtime lacks a capability (no `focusVisible`, no `aria-checked`, no
  `transform`), the page says so in **Accessibility and limitations** instead of
  drawing behaviour that does not exist. `COMPONENTS.md` carries the same
  evidence per row.

A preview is never the authority. If a preview and the component disagree, the
component is right and the preview is a bug.

### Pages the package writes

Each package writes the page a component ships with. The site mounts those
directories as Fumadocs collections and renders the files as-is, so a component
cannot ship a page the site does not show and the two cannot drift:

| Collection | Source | Route | Sidebar |
| ---------- | ------ | ----- | ------- |
| Primitives | `packages/primitives/docs` | `/docs/primitives` | Primitives |
| Icons | `packages/icons/docs` | `/docs/icons` | Primitives |
| Components | `packages/components/docs` | `/docs/components` | Components |

Those pages are **strategy 4**: no browser rendering, the real API tables and
limitations, and a note at the top naming the example file to run in
`apps/playground`. The primitive layer is one sidebar section even though two
packages write its pages, because a reader looks for a lane of the library, not
for a package boundary. `src/lib/collection-routes.ts` is the single registry;
`src/lib/package-docs.test.ts` holds it to every `packages/*/docs` directory and
checks that the primitives index links every page in the section.

A curated page in `content/docs/components/` wins its URL and adds the previews,
the install block and the copyable source. Curated today: Button, Dialog,
Popover, Tabs.

Because the package writes Markdown and the site compiles MDX, the packages'
files must satisfy both: valid YAML frontmatter and no raw `<tag>` outside code.
`src/lib/package-docs.test.ts` holds that line, and a collection fails whole
when it is crossed.

## Theming: a preview paints the library's theme, not the site's

The site has its own identity (Hunter License green); the components have the
library's tokens (iris). A preview must show the latter, and it must follow the
platform switch.

- `src/lib/theme-css.ts` is the one bridge: a `Theme` becomes CSS variables
  (`primaryForeground` → `--primary-foreground`, `radius.md` → `--radius`, both
  families, and the density's control heights and paddings). The theme editor
  and every preview use it.
- `src/components/docs/preview-surface.tsx` wraps a preview in `.gx-demo` and
  applies `toCssVars` of the **resolved platform theme** from
  `src/lib/platform.ts` (`platformTheme(themes.dark, platform)`), plus a
  `data-platform` marker.
- `.gx-demo` in `demos.css` declares the dark theme's roles and its comfortable
  density as defaults, because the landing's product window renders outside a
  preview surface.
- `src/lib/theme-css.test.ts` holds the seam: every `var(--…)` a preview style
  sheet reads must exist in the bridge, the `.gx-demo` defaults must equal
  `themes.dark` (colour roles and density alike), every control-shaped preview
  rule must take its height from a density variable, and no preview rule may
  carry a library colour literal. A preview therefore cannot drift from the
  tokens, and a wider platform variant — macOS compact, Linux spacious, Windows
  comfortable — repaints and re-sizes the site with no docs change.

The exception is the dashboard block: its `--dash-*` palette is its own, because
the landing renders the same markup in a light and a dark window. It is labelled
as a browser reproduction and is excluded from the literal guard.

## The component page template

Every page in `content/docs/components/` follows this order. Sections that do not
apply (no sizes, no keyboard path) are **omitted, not faked**; the limitation is
recorded instead.

| Section | Contents |
| ------- | -------- |
| frontmatter | `title`, one-sentence `description` |
| intro | one paragraph: what it is, what it is not, any runtime gap it absorbs |
| preview | `<ComponentPreview name="…" />` — the most representative composition |
| Installation | `<Install packageName importName />` + `<ComponentSource name file />` |
| Usage | a realistic snippet, not a bare prop dump |
| Variants | table of variants → role mapping; one `ComponentPreview` |
| Sizes / States | tables that name the token (`density.controlHeight.md`), previews |
| Composition | which parts compose it, and what to use instead |
| Keyboard | table: key → contract |
| API reference | table: prop → type → default → consequence |
| Theming | which roles it reads, and what a theme change does |
| Accessibility and limitations | role/name, and every unsupported attribute with the alternative |
| Dependencies | the packages it needs, and why |
| Related | siblings, parents, alternatives |
| Status | `done` / `partial`, with the runtime evidence, when it is not `done` |

The template is a contract, not a suggestion: a page missing a section is a page
that hides a decision from the reader, so `src/lib/component-page.test.ts`
checks every curated page for the required sections and their order, a preview,
and the package it installs from. The package's own pages are exempt — they are
the component's doc file.

## The lane pages

Three pages sit outside the component and block folders because they describe a
**composition lane**, not a single component: [Layouts](/docs/layouts),
[Workspace](/docs/workspace) and [Data display](/docs/data-display). They are
where a reader lands when the question is "how do I assemble these parts", so
they have their own contract.

| Section | Contents |
| ------- | -------- |
| frontmatter | `title`, one-sentence `description` |
| intro | what the lane is, and how much of it is unbuilt |
| The lane | `<LaneTable lane="…" />` — the generated inventory |
| Today | the shipped pieces that compose the lane, each linked to its page, or a runnable composition preview |
| Gaps | the missing rows, each with its evidence and the strongest honest alternative |
| Where a change goes | which package owns the next change in the lane |

**The table is generated.** `src/lib/inventory.ts` parses the tier tables in
`COMPONENTS.md`; `<LaneTable>` renders the rows the lane names and prints "N
rows · N shipped · N to build" from the same parse. A lane page therefore cannot
call a row shipped while the inventory says `todo`, and a new inventory row
appears without a docs change. `src/lib/inventory.test.ts` holds the parse (a
malformed row is reported, not dropped), `lane-table.test.tsx` proves every row
reaches the rendered table, and `lane-page.test.ts` proves each page mounts its
table, names the inventory and sits in the sidebar.

**No preview for a component that does not exist.** A lane preview is either a
shipped component (`<ComponentPreview>`) or a composition of shipped parts
(`<ComponentPreview>` with `composition: true`, which changes the note to "a
composition of native parts, not a new component"). A docking layout, a table or
a chart is described in prose and its gap is recorded — never drawn as if it
were shipped.

## Adding a preview

1. Add the rendering and its `source` string to `src/components/docs/demos.tsx`
   (or `blocks.tsx` for a page-level recipe). Use only classes that exist in
   `demos.css`, and colour roles through variables — never a hex.
2. Reference it from the page with `<ComponentPreview name="…" />`. The name is
   the demo key; a wrong key throws at render instead of drawing nothing.
3. If the demo's state changes (open, selected, loading), give it a real
   interaction path in the demo rather than a static picture of the end state.
4. Run `nub run --filter @gpuixui/docs test` — the style-sheet guards fail on a
   hardcoded colour or an unknown variable.
5. Run `nub run --filter @gpuixui/docs build` before pushing: an SSR-only error
   in a preview (a missing provider) shows up here, not in `vitest`.
