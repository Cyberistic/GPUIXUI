# apps/docs — the Fumadocs site

A **browser** application. It documents and showcases the GPUix-native library.
The docs shell never imports the native renderer; the one real GPUix surface is
an isolated, opt-in WebAssembly document under `/gpuix-preview/` (tier L, plan
455). See `MISSION.md`, plan `410-docs-site.md`, and `docs/preview-strategy.md`.

## Stack

Fumadocs + TanStack Start (SSR), built with Vite, Tailwind 4 and
`fumadocs-mdx`. It deploys as a Cloudflare Worker through
`packages/deploy/alchemy.run.docs.ts` (`rootDir: "../../apps/docs"`).

## Commands

```sh
nub run --filter docs dev           # http://localhost:3000
nub run --filter docs build         # SSR bundle + client assets
nub run --filter docs check-types   # fumadocs-mdx generate + tsc --noEmit
nub run --filter docs test          # registry, IA, search, theme and preview tests
nub run --filter docs smoke:build   # build, serve and crawl the production output
nub run --filter docs smoke:browser # hydrate the production output in headless Chrome
nub run --filter docs smoke:preview # drive the live GPUix surface in headless Chrome
nub run --filter docs build:preview # only rebuild the live surface (public/gpuix-preview)
nub run --filter docs studio        # author the MDX in Fumadocs Studio (dev-only)
nub run check                       # repo gate: test quality, lint, format, types
```

## Authoring

Component pages are edited in **Fumadocs Studio** (`nub run --filter docs
studio`), a dev-only terminal command that opens `content/docs` in the editor
from `@fumadocs-editor/*`. It is deliberately not a route: the deployed Worker
has no writing surface, and nothing in `src/` imports the editor, so no editor
code reaches the production bundle (verified by grepping `apps/docs/dist`).

The editor's contract is byte-for-byte: an untouched block serializes back to the
same source, so a one-sentence edit is a one-line diff.
`src/editor-roundtrip.test.ts` proves it over every `.mdx` page, and names the
page when a parse throws. This site's own MDX components (`<ComponentState>`,
`<NativePreview>`, `<include>`, `<TokenScales>`, …) have no editor spec yet, so
Studio preserves them verbatim and they are edited in the source pane.

The contributor-facing copy of the component-page template is
`/docs/component-pages` (plan 487); its section list is generated from
`src/component-meta/contract.ts`, while the `## ` headings below stay the file
`component-pages.test.ts` reads.

The editor packages are exact-pinned devDependencies: the ecosystem is pre-v1, so
a minor bump may change the serialization contract the guard proves. Re-run the
suite before bumping.

## Built-site smoke check

The unit suite reads the source tree. `smoke:build` reads the **production
build**: it builds, serves the worker with `vite preview` on a free loopback
port, and crawls the result (plan 439). It fails when a page does not render,
loses its title, `<h1>`, `<main>` landmark, `lang` or canonical link; when an
internal link or asset 404s; when `/api/search` stops answering; when an unknown
slug is not 404; or when `robots.txt` loses its sitemap. It exits `2` — not `0`
— when the check could not run (build or preview failure), so "unverified" is
never reported as a pass.

```sh
nub run --filter docs smoke:build
# or crawl a server that is already running:
nub apps/docs/scripts/smoke-build.ts --base-url http://127.0.0.1:4173
```

It is deliberately **not** part of `nub run test`: the build takes ~13 s and
starts a worker, which would slow every checkout. Run it before a release and
after a layout or content change.

## Live GPUix surface (tier L)

`preview/` is a **second Vite project**, not part of the SSR app. It mounts the
real library components on `@gpuix/native@0.10.0`'s published WebAssembly
renderer (the browser's GPU backend) and exports one document per scene:

- `preview/scenes.ts` lists the scene keys and the text each one must paint;
  `preview/scene-views.tsx` holds the compositions. A registry record opts in
  with `liveScene: "<key>"`, `registry.test.ts` fails on a key no scene ships,
  and `scene-contract.test.ts` fails when a scene's expected text no longer
  occurs in its view. Live scenes ship for Buttons, Tabs, Dropdown menus,
  Dialogs, Confirmation dialogs, Popovers, Command menus, Icons, Scrollable
  containers, Skeletons, Loading indicators, Drawers, Navigation menus,
  Mention inputs, Preview cards, Toasts, Tooltips, Context menus, Date pickers,
  Comboboxes and Hotkey inputs. Five of those own their open state and expose
  no `defaultOpen`, so `preview/scenes.ts` declares the gesture that opens them
  (`SCENE_GESTURE`) and the sentence the reader sees
  (`SCENE_INTERACTION`); the smoke drives the gesture through the `App` the
  renderer installs on the page. Every delivered page now has a live scene or an
  illustration; `scene-contract.test.ts` fails on a new gap instead of shipping
  it silently (plans 458 and 486).
- `vite.preview.config.ts` builds it to `public/gpuix-preview/` (gitignored,
  ~20 MB). `build` and `dev` run `build:preview` first. The published browser
  entry uses Bun's `with { type: "file" }`, so the config names the two
  wasm-bindgen artefacts explicitly.
- The page carries `data-gpuix="ready"` once GPUI's window handle exists and the
  scene is mounted, and `data-gpuix="failed"` with `data-reason` otherwise.
  Neither `render()` returning nor the DOM canvas is that signal: both precede
  asynchronous graphics init, so `preview/renderer-ready.ts` asks the renderer's
  own window query. `<LiveSurface>` only mounts the iframe after a click, and
  says the renderer is ~20 MB.

`smoke:preview` drives Chrome over CDP **in real time** — a virtual-time
screenshot is black — and asserts every scene's text is in GPUI's tree, that
every scene reaches a sized canvas (a `ready` flag on a 1×1 frame does not
count), that a gesture scene's text is absent before the gesture and present
after it, that the Button scene paints a different frame in light than in dark
(with two identical dark captures proving the screenshot is deterministic), that
an unknown scene reports a reason, that each component page loads the iframe on
a click (after hydration) with the page's mode and platform in the URL, and that
`/docs/theming?platform=win32` passes the platform through to the renderer. The
page's colour scheme is forced through CDP, so the host's preference cannot
decide which mode the gate checks. `--no-build` reuses the current build. Exit
`1` is a broken surface, `2` means it could not run.

The Wasm renderer is a real GPUix surface, but it is **not** the native desktop
binary. Pages keep the native evidence (tier N/S/V) beneath it, and the canvas
is not exposed to browser accessibility APIs — the page's accessibility section
and source remain the readable description; see `docs/preview-strategy.md`.

## Hydrated-preview smoke check

The crawler reads server HTML, so it cannot see anything that happens after
hydration. `smoke:browser` loads the production build in headless Chrome and
reads the live DOM; it is the guard for the preview mode and platform bugs
(plans 444/445): a dark page must paint the dark palette, and a shared
`?platform=win32` link must paint that platform on every preview surface.

```sh
nub run --filter docs smoke:browser
# or against a server that is already running:
nub apps/docs/scripts/smoke-browser.ts --base-url http://127.0.0.1:4173 --no-build
```

It finds Chrome via `CHROME_PATH`, then the macOS app path, `google-chrome`,
`chromium` or `chromium-browser`; pass `--chrome <path>` to override. Exit `1`
means the site is wrong (`FAIL <url>: <what>`), exit `2` means the check could
not run (no build, no server, no Chrome) — never a pass. Expected values come
from `@gpuixui/tokens`, so the script carries no colour or font literal.


## Search

`/api/search` merges the MDX page index with the component registry
(`src/lib/search.ts`). A component name is scored by its **title** — equal,
prefix, word prefix, then substring — so `button` reaches
`/docs/components/button` even when prose matches first; every other query keeps
the page index's order and appends registry hits in the tail (plan 419). The
props types a component documents are indexed too, so `ButtonProps` and
`ToastViewportProps` reach their pages (plan 442), and so is every exported part
name, so `DialogTitle` reaches Dialogs (plan 481). A blank query returns `[]`,
and one page is listed once. `src/lib/search.test.ts` guards all four rules
(plan 431).

Generated prop-table rows (`#type-table-…`) are **not** returned as results
(plan 479): every table repeats `aria-label`, `style` and `children`, so those
synthetic headings buried the authored prose that answers an accessibility
query. The registry still indexes every props **type** name, and
`withoutTypeTableRows` has its own test.

The component index's own filter searches the same record fields it can prove —
title, summary, documented props types, exported part names and limitations — so
`aria-checked` finds Checkbox and Switch without leaving the index (plans 454
and 481). The built-site smoke check queries a component name, a limitation and
a part name, so a production index that stopped seeing those fields fails the
release gate.

## Capabilities

`/docs/capabilities` renders the measured GPUix matrix (plan 448) from
`src/lib/capabilities.ts`. `COMPONENTS.md` owns the verdicts and
`apps/playground/src/scenarios` owns the scenario ids, so
`src/lib/capabilities.test.ts` fails when the page invents either. `Workspace`
and `Data display` render the measured subset for their tiers, and the matrix
component lives in `src/components/capability-matrix.tsx`.

## Layout

```
content/docs/**              the MDX pages; meta.json sets the sidebar order
src/routes/                  TanStack Start routes (landing, docs catch-all, search)
src/lib/source.ts            the Fumadocs content source
src/components/              MDX components (index, state, previews)
src/component-meta/          the component registry (plan 411)
public/screenshots/          real native screenshots (plan 412)
```

`/docs/component-api` is the consumer-facing form of `docs/component-api.md`.
Its parts index is generated from the registry (`src/components/part-index.tsx`),
and `src/component-api-page.test.ts` pins the page's sections, its three real
source includes and the runtime limitation the maintainer contract overstates.

## Landing page

`/` is `src/components/landing.tsx`, extracted from the route so
`landing.test.tsx` can render it with `renderToStaticMarkup`. It reads the light
and dark palettes and the platform families from `@gpuixui/tokens`, the
documented/tracked counts from the component registry and the six preview tiers
from its own `PREVIEW_TIERS`; no colour or number is typed twice (plan 440). It
shows **no component image**: the only committed captures are theme-gallery
developer frames, and a browser-drawn component would be a placeholder presented
as native.

## Theme

The site's light and dark palette **is** the library's palette. The Fumadocs
variables in `src/styles/app.css` are the semantic roles from `@gpuixui/tokens`,
mapped in `src/lib/docs-theme.ts`; `src/styles/theme.test.ts` asserts every mapped
value equals `lightTheme.colors` / `darkTheme.colors` in both modes. Change the
token package first, then the stylesheet — a mismatch fails the suite.

The theming and typography pages render `<TokenColors />`, `<TypeScale />` and
`<PlatformTypes />` from the package's data, so the documented values are the
shipped values. `<TokenScales />` adds every remaining group — spacing, radius,
border width, icon size, density and elevation — with tests that fail when a
group, key or value drifts. The token root entry is the **only** `@gpuixui/*`
import the site may make (`@gpuixui/tokens/react` is forbidden, as is every GPUix
runtime package); `src/architecture.test.ts` enforces the allow-list.

## Public URL

Canonical links, OpenGraph `og:url` and the sitemap use `SITE_URL` from
`src/lib/site.ts`. It defaults to `https://docs.gpuixui.dev` — the domain
declared by `packages/deploy/alchemy.run.docs.ts` — and `VITE_SITE_URL`
overrides it for previews or self-hosting:

```sh
VITE_SITE_URL=https://preview.example.com nub run --filter docs build
```

`/sitemap.xml` and `/robots.txt` are generated from the Fumadocs source by
`src/routes/sitemap[.]xml.ts` and `src/routes/robots[.]txt.ts`; a new page needs
no sitemap edit. `src/lib/sitemap.test.ts` proves every page appears once.

## Adding a component page

The first real page is `content/docs/components/button.mdx` (plan 422); the
remaining Tier 1 pages followed it (plan 423), the 22 Tier 2 pages after that
(plan 425), the seven Tier 1 value/choice pages in plan 435 and the seventeen
Tier 2 supplement pages in plan 461 — 66 component pages in total. Each shows
the whole chain: a registry record that mirrors the inventory, generated status
and preview blocks, a real API table, the real component source and a
runtime-mounted example. Copy their shape.

1. Add a record to `src/component-meta/entries.ts`. **Titles must match the
   `COMPONENTS.md` row exactly** — `registry.test.ts` proves the two agree.
   Start `status: "planned"`, `gpuix: "unverified"`; a delivered component moves
   to `wip`/`done` only with a real `sourcePath` and **the exact status and
   GPUix-support words its `COMPONENTS.md` row carries** — `registry.test.ts`
   parses the inventory table and fails on any difference (plans 429 and 443).
   That means `ours` and `reuse` are real values: the page prints the word with
   its meaning (`src/component-meta/support.ts`), so a reader is never told
   "GPUix provides it" about a primitive this library wrote. A `done` record
   must carry its native `runtime` suite, and partial support also needs a
   documented limitation. The `planned`/`delivered` helpers default `parts` to `[]`, `pattern` to
   `"static"` and `persistence` to `null`; a compound or workspace record
   overrides them (plan 427). **Every compound record declares its real exported
   parts** (plan 479) — `ContextMenu`, `ContextMenuTrigger`, `ContextMenuItem`,
   … — so `missingPartSources` checks real data and every part's file reaches
   `## Source`. The first worked examples are **Tabs** (`stateful`, four parts in
   one file) and **Toasts / notifications** (`stateful`, provider and viewport in
   separate files); the other 27 compound records add `parts` without changing
   `pattern`. A `delivered` record also names
   its props types in `api` — `api: ["ButtonProps"]` — because
   `/docs/api-reference` is generated from the registry, and
   `content-references.test.ts` fails when that set and the page's prop tables
   disagree (plan 441). When a part exports its own `<Part>Props`, list that type
   too: `registry.test.ts`'s `missingPartApi` fails when a real part props type
   is undocumented.
2. Add `content/docs/components/<slug>.mdx` using the template below, and add
   the slug to `content/docs/components/meta.json`. `registry.test.ts` asserts
   that sidebar equals `index` plus every non-planned slug, so a forgotten
   entry (or a component with no page) fails the suite.
3. Move the record out of `planned` only when the component is real. The tests
   then require a `sourcePath`, the page file, the sidebar entry, and a `## Source`
   section on the page that includes that path (see below).
4. When the playground has captured the component, add the PNGs under
   `public/screenshots/<slug>/` **and** the `provenance.json` sidecar the capture
   script writes. A screenshot without a sidecar is never rendered.

```mdx
---
title: Button
description: Triggers an action; the primary interactive control.
---

<ComponentState slug="button" />

<NativePreview slug="button" />

<ComponentPreview slug="button" />

## Usage

## Variants

## Sizes

## States

## Composition

## API reference

## Keyboard and focus

## Theming

## Accessibility and limitations

## Dependencies

## Source

## Related

<RelatedComponents slug="button" />
```

`<ComponentPreview slug>` is optional: it renders a tier-A browser
approximation only for a component registered in
`src/components/preview/approximations.tsx`, and its banner is unconditional. Do
not add an approximation for an interaction or for a component that does not
exist. A page without a registered preview omits the block.

A compound or workspace record owes extra sections, in the order below. The
required list is `sectionsFor(pattern)` in `src/component-meta/contract.ts`, and
`component-pages.test.ts` applies it to every finished record.

```mdx
## State and ownership

## Anatomy

## Persistence
```

- `stateful` (Tabs, Dialog, Combobox, List, a data grid, a split host) adds
  **State and ownership** directly after **Composition**. It names the state the
  component owns and the state the consumer owns. Every interactive compound
  record is `stateful` (plan 480); a presentational compound (Card, Alert,
  Breadcrumb, Field, Fieldset, Keycap) or a display-only one (Stepper, Timeline)
  stays `static` even though it declares parts.
- `workspace` (panels, docking, a workspace) also adds **Anatomy** directly
  after **Usage** and **Persistence** directly after **State and ownership**.
  **Anatomy** names the parts and the one-way ownership relationship;
  **Persistence** names the serialised shape and says the app writes it — the
  renderer stores nothing.

The section list is a contract, not a suggestion: `src/component-pages.test.ts`
fails when a page for a component that is no longer `planned` is missing a
section, its `<ComponentState slug>` block or its `<NativePreview slug>` block,
and when this template stops listing one. It also fails when the page's
frontmatter `title`/`description` drift from the registry record, and when a
delivered page keeps a heading but loses the `tsx` example under **Usage**, the
`<auto-type-table>` under **API reference** or the `<include>` under **Source** —
a heading with nothing under it renders an empty section that still builds. A
component with no variants or sizes still gets the section — say "none" rather
than deleting it, so a reader can tell the difference between "not documented"
and "does not apply".

`<RelatedComponents>` links a related record only when it is no longer
`planned`; a planned record renders as a plain "(planned)" label, because a link
would 404. `src/components/related-components.test.tsx` guards that rule.

## Dependencies

The `Dependencies` section states what the component needs, and it is not
hand-written: it renders `<ComponentDependencies slug="…" />`, which reads the
record's `dependencies`. That list is **derived from the component's real entry
file** by `src/lib/source-imports.ts` (plan 428):

- the entry file's non-relative module imports are the modules (React and
  `@gpuix/react` are the peer packages every component has, so the block states
  them once instead of listing them 66 times);
- a relative import that resolves to another delivered record's `sourcePath` is
  recorded as that record's slug and rendered as a **Composes** link; a relative
  import into `internal/`, `core/`, `menu/`, `toast/` or `combobox/` is a private
  helper and is not a dependency;
- `src/component-meta/dependencies.test.ts` re-derives every record and fails
  with the expected list when an import and the docs disagree. Fix it by copying
  the expected list into the record; never loosen the test.

Prop tables use `fumadocs-typescript`'s remark plugin: write
`<auto-type-table path="./relative/path.ts" name="ButtonProps" />` in the MDX
and annotate the real props type with tsdoc (`@internal` hides a prop). The
table is generated at build time from the component source, so it cannot drift.

A compound page generates **one table per part that has its own props type**: the
root table first, then `### <Part>` and its table, in the order the record
declares its parts (plan 479). A part with no distinct props type (it takes
`Props`) gets no heading and no table; nothing is invented. A part exported from
another file (`ContextMenuItem` from `menu/item.tsx`) names that file in the
table's `path`.

## Copyable source

Never paste a component's source into a page. Include the real file with
Fumadocs' `<include>` tag (plan `414-copyable-component-source.md`); the plugin
reads it at build time and the page gets the same highlighted, copyable code
block as any other fence:

```mdx
<include lang="tsx" meta='title="packages/primitives/src/button/button.tsx"'>
  ../../../../../packages/primitives/src/button/button.tsx
</include>
```

- The path is relative to the MDX file. A page under `content/docs/components/`
  reaches the repository root with **five** `../` segments.
- The title is the repo-relative path; `lang` matches the extension.
- A region (`#name`, marked `// #region name`) includes part of a file instead of
  all of it.
- `<include … />` with no body renders **nothing** and says nothing, so always
  use the paired tag.

`src/content-references.test.ts` fails if an include points at a file that does
not exist, names a region the file does not contain, is written self-closing, or
if a component that is no longer `planned` has a page without its real source.

## API tables

Prop tables are generated from the component's **real TypeScript** by
`fumadocs-typescript`'s remark plugin; the generator lives in
`src/lib/type-table-generator.ts` and is wired in `source.config.ts` (that file
may only export collections, which is why the generator is separate). The
mechanism is verified in this app: `api-reference.mdx` renders a table from a
real type, and the dev server emits one row per prop
(`type-table-<file>-<Type>-<prop>`).

The contract a component props type must satisfy (`src/lib/type-table.fixture.tsx`
is its executable form, pinned by `src/lib/type-table.test.ts`):

1. The type is **exported** from a real `.ts`/`.tsx` file the page can reach.
2. Every public prop carries tsdoc text; the table shows it in the row.
3. A prop that must not appear on the site carries `@internal` — hidden by
   default, shown only when a page asks for `allowInternal`.
4. An optional prop uses `?`, so the table marks it optional.

Two gotchas the tests exist to catch:

- an unknown type `name`, or a props type in a single-line inline `type` string,
  generates **nothing** and no error — `content-references.test.ts` fails on the
  first;
- the generator's file cache is keyed by `${path}:${name}:${content}`, so it does
  **not** distinguish options: never generate the same type twice with different
  options (e.g. `allowInternal`) in one build. No page does.

The page's `<title>`, `description`, `og:title`, `og:description` and canonical
link come from its frontmatter through `src/lib/page-meta.ts`, so a new page
never inherits the site title.

## Prose truth

The pages outside `components/` make factual claims about the repository —
which packages exist, which example runs, whether the playground is built.
Those claims drift silently: a page still builds after a package lands. Plan
`426-prose-truth-and-examples.md` adds `src/prose-truth.test.ts`, which derives
the facts from the tree (a package is real when it has a `package.json`) and
fails when a page contradicts them:

- no page may call an implemented package "future work";
- no page may deny that an example exists while `examples/*` has a package;
- once `apps/playground/package.json` lands, every "not built yet" playground
  claim fails until the page is updated;
- every backticked `packages/`, `apps/`, `examples/`, `docs/` or `LICENSES/`
  path on any page must exist, or be registered as planned in its directory
  README.

When you add a page, name real paths and re-read the package/example state you
describe. When the playground becomes runnable, update `getting-started.mdx`
and `examples/index.mdx` in the same change — the guard is inverted so it fails
until you do.

## Pattern pages

A pattern page documents a **real composition**, not a component. The first is
`content/docs/patterns/settings-form.mdx`, built from
`examples/basic-app/src/App.tsx`. Its contract (`src/pattern-pages.test.ts`) is:
six sections (`The task`, `Composition`, `State`, `What is verified`, `Source`,
`Related`), at least one real `<include>` that resolves inside the repository,
no placeholder prose, and any `nub run --filter <package> <script>` claim must
name a script the example package really defines. A pattern with no runnable
source does not get a page.

## Previews

`<NativePreview slug>` picks the strongest honest tier from the record plus the
capture sidecars (`src/components/preview/select-preview.ts`):

- a listed screenshot **with** its `provenance.json` → the real capture (tier S);
  a sidecar with `kind: "interaction"` is captioned `Recorded in GPUix — …`
  instead of `Captured from GPUix — …`;
- otherwise a `playgroundScreen` → the run instructions (tier N);
- otherwise the record's `runtime` suite → the native-coverage notice (tier V:
  the suite path plus its command, and that no capture is published);
- otherwise the "not verified" notice (tier X).

The static component pages carry a tier-A preview (plans 449, 451, 452, 453 and
461): Button, Tabs, Dropdown menu and Card; Text input, Text area, Checkbox,
Radio group, Select, Switch and Slider; Range slider, Meter, Number field, OTP
field, Toggle and Rating; Badge, Alert, Progress and Avatar; List, Empty state,
Inline validation, Breadcrumb, Pagination, Search input, Accordion and
Collapsible; Text, Separator, Spacer, Stack, Box, Button group and Label; and
the supplement's Time picker, Message scroller, Fieldset, Form, Preview card,
Stepper, Timeline, Color picker, Tag input, Countdown, Carousel, Inline edit and
Keyboard shortcuts. Every one is a static rest state built only from the
`--preview-*` values of the active theme, so the platform toggle re-renders all
of them. The pages without one are interactions (dialog, confirm dialog,
popover, the context and command menus, toast, tooltip, combobox, date picker,
drawer, navigation menu, mention input, hotkey recorder, scroll area),
animations (skeleton, spinner) or the icon glyph set; they stay at tier V/X, and
`scene-contract.test.ts` requires a measured reason for each interaction gap.
`theme-surface.test.ts` also proves every `--preview-*` name a preview reads is
one the surface defines.

An approximation is never a fallback. The only way to render one is
`<IllustrativeApproximation>`, which always renders the mandated banner.

## Honesty rules

Every preview obeys `docs/preview-strategy.md`. This app must never import
`@gpuixui/*` runtime code or `@gpuix/react` — it reads the real TypeScript
*source* for prop tables and copyable snippets, and nothing else.
`src/architecture.test.ts` enforces that boundary over `src/**`.
