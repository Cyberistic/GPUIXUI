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

One drawing is deliberately coarser, and this file records it: an **overlay
surface**. The native dialog, popover and menu compile a fixed recipe radius
(`rounded-4xl`, 32px) and paint the theme's `elevation.lg` beside the recipe's
1px `foreground` ring, while the preview's `.gx-dialog` draws
`border-radius: calc(var(--radius) + 8px)` and a single CSS shadow. The platform
switch therefore reshapes the preview's corner and not the native one, so the two
agree on palette and lift and differ in radius — an approximation, not a
measurement of the shipped surface.

### Strategy 1 is real: the GPUix web build

`@gpuix/native@0.11.0` ships a second target beside the `.node` binding: a
`browser` entry (`browser.mjs`) over a **19.2 MiB** wasm renderer. It is not the
headless test renderer. It is GPUI's browser platform: it creates its own
`<canvas>`, appends it to `<body>`, paints through WebGPU with a WebGL2 fallback,
and drives the same retained tree the native window does.

That makes strategy 1 available for the first time — a docs route could show the
real library instead of a drawing of it — but it is a **whole-page** surface,
not a preview inside a page, because the platform is a singleton with three
measured constraints:

- **One document-owned canvas and one top-level window per page load.** A second
  `init()` fails with `GPUIX web is already running`, and a closed window cannot
  be reopened. Leaving a live surface therefore means a reload.
- **The document must be cross-origin isolated.** The wasm instantiates
  `WebAssembly.Memory` with `shared: true`, so it needs
  `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp`; without them `SharedArrayBuffer`
  does not exist and the module does not start.
- **WebGPU first, WebGL2 fallback.** A browser with neither backend gets no
  surface at all, so a live route owes a plain-text fallback rather than a blank
  canvas.

**The site mounts it, on one route.** `/live` boots the browser build and paints
a real card with a `@gpuixui/primitives` filled action on it; every other page
keeps the labelled DOM reproduction above, because the platform hosts one
surface per document and a component page needs room for its prose.
`src/lib/gpuix-web.test.ts` holds this status to the tree in both directions: the
policy cannot claim the surface is mounted while no route imports the build, and
it cannot claim a route that is not there. The guard also reads the installed
package, so the size, the memory requirement and the browser entry it quotes
cannot drift silently. Plan `440-live-gpuix-web-surface` is the record of how the
route was reached; this section is its outcome.

Two things `/live` is **not**, and its label says both:

- it is not the native macOS runtime — it is the same renderer compiled to wasm;
- it is not the React reconciler. The reconciler's own mount is still owed; the
  page feeds the renderer the mutation protocol the reconciler emits, with every
  `StyleDesc` resolved by `@gpuixui/primitives/core` (see §The live surface).

### The paint is measured

Plan `440`'s riskiest step — whether a real GPUix surface paints at all in a
browser — is now measured, not assumed.
`scripts/live-surface-probe.ts` serves a cross-origin-isolated page, boots the
published glue against the published wasm, applies one mutation batch (a
420×200 `div` with a `text` child), captures the frame over the DevTools
protocol and reads a pixel back out of the PNG. It passes only when the renderer
started, appended its `<canvas>`, the retained tree carries the text the batch
set, **and the sampled pixel is the fill the batch set** — a blank frame captures
perfectly well, so its existence proves nothing.

Run it with `nub apps/docs/scripts/live-surface-probe.ts`; the frames land in
`.artifacts/live/`, which is verification-only and gitignored.
`scripts/live-frame.ts` is the frame contract it judges against, and
`src/lib/live-frame.test.ts` holds both directions: a frame that reported itself
healthy while its pixels were white fails by name.

What it settled, measured on macOS 15.8.1 x86_64 with headless Google Chrome
155.0.8059.80 over SwiftShader:

- **A headless browser is enough.** `crossOriginIsolated` is true under
  `COOP: same-origin`/`COEP: require-corp`, `SharedArrayBuffer` exists, WebGL2 is
  available and `navigator.gpu.requestAdapter()` returns an adapter — so the
  backend question the plan had no tool to answer is answered on this host.
- **`browser.mjs` is a bundler entry, not a browser one.** Its
  `import … with { type: "file" }` is a bundler convention; the probe initialises
  `wasm/gpuix-web.js` directly with the wasm URL, which is the path a Vite rule
  must reproduce.
- **`getPaintedText()` is not a paint report.** It returned `[]` on a frame whose
  screenshot shows the fill and the label, because the report is written by a
  frame the probe never ticks. A paint claim has to read the pixels.
- **The CLI screenshot flags cannot prove it.** `--screenshot` captures at load
  and `--virtual-time-budget` fast-forwards the page's timers, so both captured a
  white frame while the surface painted a moment later; the probe drives Chrome
  over DevTools and captures after the page reports itself.

That is the spike's feasibility half. The route built on it is §The live surface.

### The live surface

`/live` is the strongest preview the mission allows: the real renderer, in the
browser, painting the library's own styles. It is a whole-page route because the
platform is a document-level singleton.

- `src/routes/live.tsx` is the route; `src/components/docs/live-surface.tsx`
  boots the renderer inside an effect (never at module scope, so the server build
  never evaluates the wasm) and reports what it painted.
- `src/lib/live-batch.ts` is the screen: a card, a heading, a sentence, a filled
  action and a status line. Every `StyleDesc` comes from
  `@gpuixui/primitives/core` — `controlStyle` for the button, `textStyle` for the
  type, `surfaceStyle` for the card — so the paint is the recipe the package
  ships, not a copy written for the docs.
- The theme is the platform switch's: `resolvePlatformTheme(platform, "dark",
  look)` from `?platform=` and `?look=`, falling back to the remembered choice,
  so the surface changes with the rest of the site's previews.
- A press goes through `renderer.simulateClick` — the renderer's own input path —
  and the listener repaints the banner's fill and counts the press. Nothing in
  the page calls the handler directly.
- The bar above the surface is DOM and says what the surface is; the page falls
  back to a sentence when there is no WebGPU or WebGL2, and says "reload to
  mount it again" when the platform reports `GPUIX web is already running`.

The paint is measured, not assumed. `scripts/live-route-probe.ts` loads the
running dev server's `/live`, reads the element bounds the page reports, samples
the button's fill and the banner's resting fill out of the PNG, presses through
the renderer, and samples the banner again. It fails if the page does not report
`painting`, if the button's pixel is not `controlStyle`'s fill, if the press does
not reach the listener, or if the banner does not change. Run it with the dev
server up:

```sh
nub run --filter @gpuixui/docs dev
nub apps/docs/scripts/live-route-probe.ts
```

Frames land in `.artifacts/live/docs-live-route-{before,after}.png`, which are
verification-only and gitignored. Measured on 2026-10-22, macOS 15.8.1 x86_64,
headless Google Chrome 155.0.8059.80 over SwiftShader: the button sampled
`#a7a9ff` (`controlStyle`'s dark primary), the banner `#222730` (`muted`), and
after a press `#0e5135` (`successSoft`) with the status reading "Pressed 1 time".

**Owed:** the React reconciler mount. `render(<App />, { renderer })` takes an
injected renderer, but `@gpuix/react` pulls `@gpuix/native/runtime` and
`@gpuix/native/automation` at module scope, and nothing has measured whether
that graph bundles for a browser. Until it does, `/live` drives the batch
protocol by hand — the same operations, resolved by the same library styles.

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

**A snippet is code, not prose.** Every `ts` and `tsx` fence on every mounted
page — the site's own and each package's — has its `@gpuixui/*` imports resolved
against the package source by `src/lib/page-snippets.test.ts`, because the build
renders a snippet with the wrong export name exactly like a right one. A plain
`ts` fence counts: `/docs/runtime` prints its capability calls in one, and a walk
that read only `tsx` fences never saw it. The walk found one page that named a
symbol its package does not publish — `primitives/docs/tooltip.mdx` imported
`Icon` from `@gpuixui/primitives`, while `Icon` lives in `@gpuixui/icons` — and
the primitives workstream fixed the page; the defect record was deleted in the
same pass rather than left standing empty.

**A source accordion is the real file.** A curated page's `<ComponentSource>`
names a key in `src/components/docs/sources.ts`, and MDX does not typecheck that
prop: the Dropdown menu page passed a *demo* key, so the accordion under
Installation printed an empty code block. `src/lib/component-source.test.ts`
holds the three things that must agree — the key is registered, the `file` the
page labels the accordion with is the file the registry's `?raw` import reads,
and that file exists — and reads the registry from the other side, so a key no
page mounts is not shipped dead.

**An install block resolves too.** `<Install packageName importName>` writes the
`nub add` command and the import line as strings, so `src/lib/install-block.test.ts`
resolves both props through the workspace symbol index: the package must be an
entry point the workspace publishes, and the name must be one that entry point
exports. A renamed package or a misspelled export would otherwise teach a
command that cannot resolve on the section a reader follows first.

A curated page in `content/docs/components/` wins its URL and adds the previews,
the install block and the copyable source.
Curated today: Accordion, Alert, Button, Card, Command menu,
Confirmation dialog, Dialog, Dropdown menu, Field and inline validation,
Popover, Tabs, Toast.
`src/lib/component-preview.test.ts` holds the preview registry from both sides:
every `<ComponentPreview name>` on a page names a registered demo, and every demo
is mounted by a page (a key nobody renders is dead code, and a typo throws in the
browser rather than failing the build).

### The dependency line is generated, not written

`MISSION.md` asks every component page for the packages it needs, and the
package pages are Markdown the site mounts. Asking seventy-odd authors to keep a
list beside their imports would drift the first time an import moved, so the
site reads the component's own module instead:

- `src/lib/page-dependencies.ts` is the model: a page's component imports,
  grouped by workspace package (`@gpuixui/*`, `@gpuix/*`), with the page that
  documents each one. A package the site has no page for stays plain text.
- `src/lib/page-dependencies-source.ts` resolves the page's component. The
  published symbol wins, because a page stem is not always a file name: `grid`
  finds the `Grid` declared in `Stack.tsx`, `spacer` finds `Separator.tsx`. A
  family that publishes no symbol under its own name falls back to the file of
  the same name (`chat` → `chat.tsx`). A page that resolves to no module is
  reported, not guessed, and the guard fails until it has a source to read.
- `plugins/page-dependencies-plugin.ts` serves that index as a build-time
  module, so neither the browser bundle nor the Worker opens the workspace.
- `<DependencyStrip>` prints it under the status strip, names the module the
  imports were read from, and links each package to its page. It renders nothing
  on a page whose author wrote `## Dependencies` itself (today,
  `packages/primitives/docs/tooltip.mdx`) or whose component imports no
  workspace package.

`src/lib/page-dependencies.test.ts` holds both directions of the reading — every
workspace import the module makes is listed and nothing invented — and keeps
every printed link on a mounted page. Deleting the strip's mount fails the
frame case; emptying the index fails five cases across the two guards.


### The source block is generated, not written

`MISSION.md` asks every component page for copyable source, and a package page
is Markdown: it can describe the component but cannot embed it. Before this
block, only the nine curated pages carried a source accordion — a reader of the
other sixty could read behaviour, theming and API and still not see the file
they would own if they copied the component.

The site resolves the module a page documents at build time, reusing the
decision the dependency line already makes (`page-dependencies-source.ts`'s
`readPackagePages`; the published symbol wins, a page-stem file is the fallback)
and prints that file's own text:

- `src/lib/page-source.ts` is the model: a page's module, a loader for it, and
  the cache that keeps one promise per page so a re-render cannot suspend on a
  fresh one.
- `plugins/page-source-plugin.ts` serves each module as a **dynamic** import of
  `<absolute path>?raw`, so a page downloads its own component and not the
  workspace's ninety-six modules.
- `<SourceAccordion>` is the one block both callers render: a curated page hands
  it a hand-named file (`sources.ts`), a package page hands it the resolved
  module. It is collapsed, shows the repository-relative path and links the file
  on GitHub.
- `<PackageSource url>` mounts at the end of the package page frame — after the
  page's own prose, so the component's behaviour still opens the page.

`src/lib/page-source.test.ts` holds both directions: every package page resolves
to a readable module (with a floor, so a scan that stopped matching cannot
pass), the text it prints **is** the file on disk rather than a second copy, a
page with no loader is reported instead of rendering an empty Code block, and
the mount sits on the package frame rather than the curated one. Measured both
ways: removing the mount fails the frame case (`expected … to contain
'<PackageSource url={url} />'`), and pointing the loader at another file fails
the copy case with the wrong text. Verified in a browser on
`/docs/primitives/switch`: the accordion opens, prints 9,709 characters of
`Switch.tsx`, and the GitHub link is that file's own path.

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

The same row marks the index row, because the strip is on a page the reader has
not opened yet. `src/lib/component-index-data.ts` resolves every page title
through that one alias table and `buildIndex` copies the two cells onto the
entry; `verdictMark` stays silent for `done` on `yes` and names each axis that
is not whole (`partial`, `todo · unknown`), so the list cannot wear a mark the
inventory does not support. The query indexes those words too, which is what
makes `partial` a way to find the components the runtime covers only in part.
`component-index.test.ts` holds the resolution, both axes and the silent case,
`component-index.test.tsx` holds the badge on the rendered rows, and
`component-page.test.ts` requires the index page to say what the mark means.

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

One axis is deliberately fixed: a preview paints the library's own dark identity
(`previewMode` in `src/lib/platform.ts`), not the docs site's light/dark mode.
The site's mode is a reading preference and the preview's subject is the platform
style, so the switch keeps one axis — and `/docs/theming` prints the mode it
paints rather than leaving a reader in light mode to wonder why the previews did
not change.

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

The readout under the preview is the whole audit, not a contrast check: all ten
`auditTheme` reports are flattened into one list (`auditFindings`), each worded
for a reader, because a theme that paints a divider into itself, drops a `NaN`
radius, erases a disabled label or hides a chart series is still broken and none
of those is a text pair. The page prints the number as a word derived from the
gate's own keys, so an eleventh report cannot land while `/docs/themes` promises
ten, and every report has a case in `theme-editor-logic.test.ts` — the cases for
the reports no contrast pair covers also prove the colour reports stay silent on
that brand, so only the new line can fail the gate.

## The component page template

Every page in `content/docs/components/` follows this order. Sections that do not
apply (no sizes, no variants) are **omitted, not faked**; the limitation is
recorded instead. A **Keyboard** section is always present: when a component has
no keyboard path, it says so rather than leaving the reader to guess.

| Section | Contents |
| ------- | -------- |
| frontmatter | `title`, one-sentence `description` |
| intro | one paragraph: what it is, what it is not, any runtime gap it absorbs |
| preview | `<ComponentPreview name="…" />` — the most representative composition |
| Installation | `<Install packageName importName />` + `<ComponentSource name file />` — a package page gets the generated `<PackageSource>` instead |
| Usage | a realistic snippet, not a bare prop dump |
| Variants | table of variants → role mapping; one `ComponentPreview` |
| Sizes / States | tables that name the token (`density.controlHeight.md`), previews |
| Composition | which parts compose it, and what to use instead |
| Keyboard | table: key → contract |
| API reference | table: prop → type → default → consequence |
| Theming | which roles it reads, and what a theme change does |
| Accessibility and limitations | role/name, and every unsupported attribute with the alternative |
| Dependencies | the packages it needs, and why — curated pages write the table; a package page gets the generated strip |
| Related | siblings, parents, alternatives |
| Status | the `done` / `partial` status and the runtime support verdict, with the evidence |

The template is a contract, not a suggestion: a page missing a section is a page
that hides a decision from the reader, so `src/lib/component-page.test.ts`
checks every curated page for the required sections and their order, a preview,
and the package it installs from. It also **resolves the API table**: every
backticked name in the table's first column must be a prop an interface declares
or a part an exported component declares, in `packages/primitives` or
`packages/components`. The snippet walk checks the imports in a fence, not the
prop names in a row, so a renamed prop would otherwise leave the page teaching a
name that no longer exists. It is a resolution check rather than a completeness
one — a prop the page omits is a documentation gap, and inherited `Omit`/`Props`
types make "every prop" a compiler question rather than a regex one.

The **Accessibility and limitations** row has a shared half as well as a
per-component one. A page states what its own control does and cannot do; the
runtime's whole ARIA budget — the role-required rule, the seven attributes that
are published, the fifteen it refuses, the absent live region, the focus ring
and the keyboard dim — is the cross-cutting contract on `/docs/accessibility`,
so a page does not have to restate the runtime in order to be honest.
`src/lib/accessibility-page.test.ts` holds that page to the installed typings,
the capability record, the primitives' label rule, the tokens' focus helpers and
the two probes (`a11y-tree`, `filled-action-dim`), so a runtime bump or a
capability row that changes cannot leave the contract teaching the old budget.

The **Theming** section is held the same way, because a page's description of
how a component paints drifts faster than its props. The curated Tabs page was
still calling the selected surface a fill "painted per trigger" that "jumps
between tabs" while the component had shipped one measured `tabs-indicator`
that slides, and no count or status check could see it.
`src/lib/component-page-truth.test.ts` derives the description from the painter:
the indicator's `testId`, its `motion` target and the `selected` role must exist
in the source, the timing level and duration come from the component's
`useSurfaceTiming` call and the motion package's table, and the printed contrast
ratio is computed from the role pair the component's own comment cites — so a
page that describes a different component fails by name.

A curated page that shares a package page's URL **displaces** it. The site
serves one page per URL, so `/docs/components/dropdown-menu` is the curated page
and `packages/components/docs/dropdown-menu.mdx` is mounted nowhere: anything
only that file documented is documented nowhere on the site. The curated
Dropdown menu page was missing `DropdownMenuCheckboxItem`'s required `checked`
and `onCheckedChange`, the action row's `leading`/`trailing`/`closeOnSelect`
slots, the trigger's button props and the surface's `alignOffset`, so none of
them could be found from the page a reader lands on.
`component-page-truth.test.ts` derives the displaced set from the two folders
(a new collision fails until it is named) and requires every prop the displaced
page documents to be named in the curated page's API section. The same file
holds the Status section to **both** words of its inventory row — the status and
the runtime support verdict — so a page cannot drop `partial` and read as a
component the runtime covers whole.

One line above every page body is **not** the author's: the site mounts the
worked-example strip (and, on a package page, the status strip) from the example
registry and `COMPONENTS.md` respectively. A page cannot claim an example or a
status it does not have, which is why neither is a table row an author writes.

The package's own pages are the component's doc file and use strategy 4 from the
top of this file: no browser preview, and a section that does not apply (no
sizes, no keyboard path) is omitted rather than faked. Four sections are not
optional on any component page, though — `## API`, an accessibility or
limitations section, the evidence section (`## Verification` or `## Testing`)
and `## Related` — and `src/lib/package-page-template.test.ts` holds every page
under `packages/*/docs` to them, across all three collections. A page could
otherwise lose its prop table or its accessibility budget while the site kept
rendering it as the component's documentation. The guard scans 70+ pages with a
floor, so a walk that stopped matching cannot pass. It found one page without
`## Related` (`packages/components/docs/message-scroller.mdx`, owned by
`components`); that gap is recorded in `TODO.md` and in the guard's own list,
and the guard fails once the section is added, so the entry cannot outlive the
fix.

## The getting-started page

`/docs/getting-started` is the one page that writes the code a reader copies
before they know the components, so it is held to the workspace rather than
reviewed by eye: `src/lib/getting-started.test.ts` resolves every
`@gpuixui/*` import to a symbol the package publishes, holds
`nub run dev:playground` to the root manifest, requires every numbered step to
link the page it depends on, and pairs each `useState` value with the table row
that says who owns it. It is not a component page: there is no preview, because
a whole screen drawn in the browser would be the approximation this file opens
by ruling out, and the runnable artefact is the snippet plus the playground
command.

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

The link runs the other way too. A page that an example owns carries a
**Worked example** strip under its title (`page-example.tsx`), generated from the
same registry, pointing at the row's own fragment — `<package>-<id>`, so
`/docs/examples#components-card`. The fragment is the file's package and id
rather than the page title, because two packages ship a `form` and a retitled
page would otherwise move the anchor. A grouped example owns no single page, so
no component page claims it, and a page with no example renders no strip rather
than borrowing one. `page-example.test.tsx` proves the href is the rendered row's
anchor, that every owned page resolves, and that a page with no row stays empty.

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

## Block pages

A block is a page-level recipe: a browser reproduction of the composition plus
the real `@gpuixui/*` source. Each page mounts its reproduction by registry key
(`<BlockPreview name="dashboard-01" />`), and `src/lib/block-page.test.ts` holds
the two inventories together in both directions — a page naming an unregistered
key throws at render, and a registered block with no page is dead code — plus the
blueprint sidebar entry.

A block that draws must state the runtime's measured rule, not a browser one: one
`<svg source>` paints **one tint** (a shape's own `fill` never reaches the
frame), so a multi-series chart is one stacked element per colour. The dashboard
page teaches that and its recipe takes the colour per layer; the evidence is
`docs/gpuix-capabilities.md` §Inline SVG painting.

**A block's source is code too.** A recipe is a `source` string in
`src/components/docs/blocks.tsx`, not a fence, so the page-snippet walk never
read it: a renamed export would leave every block's Code tab teaching an import
that no longer resolves while the build stayed green. `src/lib/block-source.test.ts`
walks the registry instead — it resolves each block's `source` through the
workspace symbol index, follows a constant the registry imports from another
module (the dashboard's lives in `dashboard.tsx`), and fails a block whose source
is nearly empty, because a Code tab that prints nothing is the same lie as a
wrong import. Directions measured: `Input` → `Inputt` in `loginSource` fails
`login-01: @gpuixui/primitives does not export Inputt`, and emptying that
constant fails the near-empty case.

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
mounts all of its examples in `runtime/examples.runtime.test.tsx`, and the
components' registry runs through the playground's `examples-mount` scenario,
which pages through every entry one screen at a time and reads the result back
from the renderer. Both commands are resolved to the workspace manifest and the
scenario registry on disk by `examples-page.test.ts`, and that guard also holds
this file to the command the page prints — so the policy cannot promise a
registry that is gone, or deny one that exists. The scenario's checks and
negative controls are in `apps/playground/README.md` §The example gallery.

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

Three rules keep that honest:

- **A page that needs something heavy imports it itself.** The shared MDX
  surface (`apps/docs/src/components/mdx.tsx`) holds the small components; the
  reference page imports `ApiReference` directly, so the symbol index travels
  with that page's chunk instead of with every page on the site.
- **The index is read at build time, so it is as fresh as the build.** A new
  export appears on the next build rather than the next edit — the price of not
  shipping the workspace source to every reader.
- **A symbol links the page its file ships with.** `docsUrlFor` maps the
  declaring module to the page named after it (`IconButton.tsx` →
  `/docs/primitives/icon-button`, acronyms included) and returns nothing unless
  the site mounts that page, so a helper or a package with no docs collection
  keeps its plain name and module path rather than a link to a 404.
  `api-reference.test.tsx` holds every rendered link to the mounted page list and
  `public-symbols.test.ts` the mapping's refusals.

`src/lib/public-symbols-source.ts` does the reading. It scans a module's export
statements the way the compiler sees them — an `export` inside a comment, a
string or a template literal is not an export, and a statement that spans lines
is one export — follows the re-exports, and resolves each name to the module
that declares it. `public-symbols.test.ts` holds it to the workspace in both
directions: every published module yields the symbols its source declares, and
the scanner's rules are pinned by fixtures that fail when a form is missed.

## The testing page

[Testing](/docs/testing) documents `@gpuixui/testing`, the harness every native
scenario is written against. It has no preview and no specimen: the harness is
not a surface a browser can draw, and its subject is the renderer the page cannot
mount. The runnable artefacts are the snippets and the commands, so the page is
held to the package's source instead.

- **Its rows are the interface.** `src/lib/testing-page.test.ts` parses
  `packages/testing/src/index.ts` for the namespaces the root projects, and the
  `SmokeHost`, `AsyncSmokeHost` and `Assertions` interfaces for their members. A
  verb or assertion has to reach a table row — a passing mention in a sentence
  does not count, so deleting a row fails even when the prose still names it. A
  verb the package gains is a row the page owes; a verb it loses is a row the
  page may not keep.
- **Its exit codes have two owners.** `Report.exitCode` answers `0` or `1`; the
  `2` that means "no evidence" belongs to `apps/playground`'s runner. The guard
  reads both files, so moving a code fails whether the report or the page
  changes.
- **Its commands are the manifests'.** Every `nub run --filter <package>
  <script>` on the page resolves against that package's `package.json`, and the
  smoke command is held to the script that builds and runs
  `dist/smoke/run.js`.
- **Its limits follow the package.** The page calls the harness workspace
  internal only while `packages/testing/package.json` is `private`, so publishing
  it is a page change rather than a stale footnote.

