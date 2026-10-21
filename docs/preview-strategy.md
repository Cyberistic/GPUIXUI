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
- Where the runtime lacks a capability (no `aria-checked`, no `transform`, no
  caret position), the page says so in **Accessibility and limitations**
  instead of
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
limitations, and a note at the top naming the command that opens the companion
playground — `nub run dev:playground`, read from the root manifest rather than
typed twice — with a link to
[how to run it](/docs/installation#run-the-playground).
`src/components/docs/native-run-note.test.ts` holds the command to the manifest's
script, the link to a heading the installation page has, and the page frame to
mounting the note. The primitive layer is one sidebar section even though two
packages write its pages, because a reader looks for a lane of the library, not
for a package boundary. `src/lib/collection-routes.ts` is the single registry;
`src/lib/package-docs.test.ts` holds it to every `packages/*/docs` directory and
checks that the primitives index links every page in the section.

A curated page in `content/docs/components/` wins its URL and adds the previews,
the install block and the copyable source. Curated today: Button, Dialog,
Dropdown menu, Popover, Tabs. `src/lib/component-preview.test.ts` holds the
preview registry from both sides: every `<ComponentPreview name>` on a page names
a registered demo, and every demo is mounted by a page (a key nobody renders is
dead code, and a typo throws in the browser rather than failing the build).

### The status strip is generated, not written

A package page describes its component but does not decide whether that
component is shipped. `src/components/docs/status-strip.tsx` prints the
`COMPONENTS.md` row — its status and its GPUix support verdict — above the page,
joined by the page title: `src/lib/inventory-status.ts` normalises punctuation
and a trailing plural, and names the few titles whose row reads differently
(`Text` → `Text / typography`, `Toast` → `Toasts / notifications`). The strip
reads the inventory, so a row that moves to `done` moves on the page in the same
commit with no docs change.

A page the inventory has no row for renders no strip rather than a guess. The
argued exemption is `ThemeProvider`, a provider rather than a component, and
`inventory-status.test.ts` fails when a new page needs an entry, when an alias
names a row that is gone, when an exemption outlives its page, or when a title
two rows could answer would report the wrong verdict. `Grid` was the second
exemption until its Tier 1 row landed; the strip now reports it.

Because the package writes Markdown and the site compiles MDX, the packages'
files must satisfy both: valid YAML frontmatter and no raw `<tag>` outside code.
`src/lib/package-docs.test.ts` holds that line, and a collection fails whole
when it is crossed.

## Theming: a preview paints the library's theme, not the site's

The site has its own identity (Hunter License green); the components have the
library's tokens (iris). A preview must show the latter, and it must follow the
platform switch and the look picker. Both are library values: the platform names
come from `platformStyles`, and the looks are the authored `retroStyles` — Luna
and Aero — which are styles of the same shape, not a fifth platform (the
mission's toggle stays macOS · Linux · Windows · Default). Each is written to the
URL (`?platform=…&look=…`) so a link carries what the reader saw.

The site's own palette is the one thing that is not a library theme, so it is
held to the library's contract instead: `src/styles/app.css` declares the
Fumadocs variables once for `:root` and once for `.dark`, and
`src/lib/docs-theme.test.ts` measures the pairs a reader reads — body text,
secondary text, the label on every filled surface, error text — at the library's
own floors, plus the focus ring at the 3:1 boundary floor on the page, a card and
the sidebar. It found the light scheme's ring at 2.33:1, under the floor, and the
ring is now `#5c7a00` (4.65:1) in light while the dark scheme keeps the bright
lime at 8.03:1. The guard also fails when a colour is declared in one scheme and
not the other, so a scheme cannot silently inherit a variable from its sibling.

- `src/lib/theme-css.ts` is the one bridge: a `Theme` becomes CSS variables
  (`primaryForeground` → `--primary-foreground`, `radius.md` → `--radius`, both
  families, and the density's control heights and paddings). The theme editor
  and every preview use it.
- `src/components/docs/preview-surface.tsx` wraps a preview in `.gx-demo` and
  applies `toCssVars` of the **resolved platform theme** from
  `src/lib/platform.ts` (`platformTheme(themes.dark, platform)`, then the
  authored look over it when one is chosen), plus `data-platform` and
  `data-look` markers.
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

The theme editor follows the switch too, with one difference: it stores only the
roles a reader changed and resolves those over `platformThemes(platform, look)`
for the mode on screen. Switching the platform therefore re-bases the editor's
preview and its inputs while the edits stay, and **Copy theme** prints the
resolved values — what a reader copies is what they saw. `theme-editor.test.tsx`
renders the same surface over the Windows style and fails if the colour inputs
still print the identity's roles; `theme-editor-logic.test.ts` holds the pins to
the base in both directions and keeps the persistence boundary (`parseState`)
rejecting a pinned value the renderer cannot paint.

The readout under the preview is the whole audit, not a contrast check: all nine
`auditTheme` reports are flattened into one list (`auditFindings`), each worded
for a reader, because a theme that paints a divider into itself, drops a `NaN`
radius, erases a disabled label or hides a chart series is still broken and none
of those is a text pair. The page prints the number as a word derived from the
gate's own keys, so a tenth report cannot land while `/docs/themes` promises
nine, and every report has a case in `theme-editor-logic.test.ts` — the cases for
the reports no contrast pair covers also prove the colour reports stay silent on
that brand, so only the new line can fail the gate.

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

## The patterns page

[Patterns](/docs/patterns) is the one page that describes a **workflow** rather
than a component or a lane. A reader who knows what a Dialog is still has to
decide who owns `open`, what happens to the focus, and what they see when the
save fails; those answers cross components, so they cannot live on any single
component page. Each pattern is a section with:

| Part | Contents |
| ---- | -------- |
| heading | the pattern's title, in the page so the "On this page" list reaches it |
| `<Pattern>` | the situation, a parts table, the state owner, the ordered steps, the failure it prevents, and the runnable example |

**The parts table is generated from `src/lib/patterns.ts`**, and the guard is
what keeps it true: `patterns.test.ts` walks `content/docs` and every
`packages/*/docs` directory, requires each linked URL to be a page that exists,
and requires the named part to appear in that page's own text. A renamed part or
a moved page therefore fails the docs suite instead of leaving a confident link
to nothing. The example each pattern names must be a file the example registry
publishes (`packages/*/examples/*.example.tsx`), so "run this" cannot point at a
file that is gone.

**The chooser is data too.** `patternChoices` answers "which component?" with the
one to use and **when it is the wrong answer**, checked by the same guard, so the
table cannot recommend a component the library does not ship. It is the one place
the site compares components instead of documenting each in isolation.

**No workflow preview.** A pattern is native behaviour with state, timing and
failure paths, and the site has no native surface — so a pattern shows the real
source file and the component pages' limitations rather than a drawing of a
conversation that only works in the browser. That is strategy 4 from the top of
this file, chosen for the same reason the package pages use it.

## Examples: source, never a rendering

Every package ships a worked example beside its components — a screen that owns
its state, not a gallery of props — and `/docs/examples` lists all of them. The
page shows each file's source and the summary the file writes in its own header.
It does **not** render the example: a GPUix screen drawn in the DOM would be the
approximation this strategy warns about, with no component page to anchor it, and
the file a reader copies is the stronger artefact. `examples.test.ts` holds the
registry to the files on disk in both directions, so a new example appears
without a docs change and a deleted one leaves no dead row.

## Generated specimens

A preview whose content *is* the tokens is generated, not drawn. The typography
page's `<TypeScale>` enumerates the theme's text roles, prints each resolved
`size/leading · weight` and paints the specimen at those metrics on a
`PreviewSurface`, so the platform switch changes the families while the sizes
stay the theme's. `type-scale.test.tsx` holds the role list to
`themes.dark.typography` and checks every row's metrics against the theme, so a
role added to `@gpuixui/tokens` fails the docs until the page describes it.

`<TokenScales>` on [Theming](/docs/theming#scales) follows the same rule for the
geometry: the spacing, radius, border, icon and density rows are read from the
theme the platform switch resolves, and `token-scales.test.tsx` holds every step
and its printed pixel value to the theme, the elevation list to the theme's
levels, and the density table to the presets. A step added to the token package
therefore appears without a docs change, and a step removed fails the suite.

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

## The examples page

`/docs/examples` is the registry of the worked examples the packages ship. It is
generated from `packages/*/examples/*.example.tsx` — one row per file — so it
cannot advertise an example that does not exist, and a new file appears with no
docs change.

Three rules keep the rows honest:

- **The summary is the file's own.** Every example opens with a
  `<Name> example: <what it shows>.` header; the row prints the half after the
  colon. A page therefore cannot describe an example differently from the file
  it links. `examples.test.ts` holds each summary to its file, and fails on an
  unmounted file, a dead link or a grouped row sent to a guessed page.
- **A row links to the page that owns it, or to the lane.** An exact page name
  wins; a sole page that extends the id is accepted (`otp` → `otp-field`); an
  ambiguous match is not guessed, it points at the lane index and says the
  example is grouped.
- **The source is read, never rendered.** These are GPUix modules. The page
  shows the source behind a labelled toggle and says so in prose; a browser
  rendering would be the fake preview this file opens by ruling out. The source
  is absent from the first paint (`examples-index.test.tsx`), because a reader
  should not pay for fifty code blocks to scan the list.

The page also names how the examples are run today: the primitives package
mounts all of its examples in `runtime/examples.runtime.test.tsx`. The
components' examples are the copy-target for their pages and have no runtime
registry yet — that is a tracked task, and the page says so instead of implying
they run.

## A page's claims about the runtime

A curated page names the runtime version its gaps were measured on, how many
native behaviour tests prove the component, and whether `COMPONENTS.md` calls it
shipped. All three drifted once, and in opposite directions: the pages still said
`0.10.0` after the bump, one claimed a shadow focus ring the runtime no longer
needs, one printed 14 tests for a suite that runs 19, and the Button page
reported `todo` rows that were `done`. `src/lib/component-page-truth.test.ts`
holds each claim to its source — the workspace catalogue's pinned
`@gpuix/native`, `it(` in the named behaviour suite, and the parsed inventory row
— so a page cannot quietly contradict the code it documents. A version bump
therefore fails the docs suite until the pages are re-read against the new
release, which is the truth pass, not a nuisance.

`src/lib/runtime-version.test.ts` applies the same rule to **every** page under
`content/docs`, not only the curated four: it reads the pin from the workspace
catalogue and fails any page that names another version, in prose or in a code
block. That is how the three pages still saying `0.10.0` were found — the claim
"the runtime exposes no appearance API" was still true, but the version it was
measured on was not.

## The reference page is generated, and it says so

`/docs/reference` is the one page that claims to be the workspace's whole
public surface, so it is generated twice over and held to both sources.

- **Entry points** come from the packages' `exports` maps
  (`src/lib/public-api.ts`): the specifier a consumer may import and the file
  it resolves to.
- **Symbols** come from the source behind them. A Vite plugin
  (`apps/docs/plugins/public-symbols-plugin.ts`) reads the workspace once at
  build time and serves an index of every published name, its kind, the file
  that declares it and its doc comment. The browser bundle carries the index,
  not the two megabytes of TypeScript it came from.

Two rules keep that honest:

- **A page that needs something heavy imports it itself.** The shared MDX
  surface (`apps/docs/src/components/mdx.tsx`) holds the small components; the
  reference page imports `ApiReference` directly, so the symbol index travels
  with that page's chunk instead of with every page on the site.
- **The index is read at build time, so it is as fresh as the build.** A new
  export appears on the next build rather than the next edit — the price of not
  shipping the workspace source to every reader.

`src/lib/public-symbols-source.ts` does the reading. It scans a module's export
statements the way the compiler sees them — an `export` inside a comment, a
string or a template literal is not an export, and a statement that spans lines
is one export — follows the re-exports, and resolves each name to the module
that declares it. `public-symbols.test.ts` holds it to the workspace in both
directions: every published module yields the symbols its source declares, and
the scanner's rules are pinned by fixtures that fail when a form is missed.

