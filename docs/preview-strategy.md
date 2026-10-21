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

`packages/components/docs/<name>.mdx` is the page a component ships with. The
site mounts that directory as a second Fumadocs collection and renders the files
as-is at `/docs/components/<name>`, so a component cannot ship a page the site
does not show and the two cannot drift. Those pages are **strategy 4**: no
browser rendering, the real API tables and limitations, and a note at the top
naming the example file to run in `apps/playground`.

A curated page in `content/docs/components/` wins its URL and adds the previews,
the install block and the copyable source. Curated today: Button, Dialog,
Popover, Tabs.

Because the package writes Markdown and the site compiles MDX, the package's
files must satisfy both: valid YAML frontmatter and no raw `<tag>` outside code.
`src/lib/component-docs.test.ts` holds that line, and the collection fails whole
when it is crossed.

## Theming: a preview paints the library's theme, not the site's

The site has its own identity (Hunter License green); the components have the
library's tokens (iris). A preview must show the latter, and it must follow the
platform switch.

- `src/lib/theme-css.ts` is the one bridge: a `Theme` becomes CSS variables
  (`primaryForeground` → `--primary-foreground`, `radius.md` → `--radius`, both
  families). The theme editor and every preview use it.
- `src/components/docs/preview-surface.tsx` wraps a preview in `.gx-demo` and
  applies `toCssVars` of the **resolved platform theme** from
  `src/lib/platform.ts` (`platformTheme(themes.dark, platform)`), plus a
  `data-platform` marker.
- `.gx-demo` in `demos.css` declares the dark theme's roles as defaults, because
  the landing's product window renders outside a preview surface.
- `src/lib/theme-css.test.ts` holds the seam: every `var(--…)` a preview style
  sheet reads must exist in the bridge, the `.gx-demo` defaults must equal
  `themes.dark`, and no preview rule may carry a library colour literal. A
  preview therefore cannot drift from the tokens, and a wider platform variant
  repaints the site with no docs change.

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
