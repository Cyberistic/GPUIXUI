# apps/docs — the Fumadocs site

A **browser** application. It documents and showcases the GPUix-native library.
The docs shell never imports the native renderer; the one real GPUix surface is
an isolated, opt-in WebAssembly document under `/gpuix-preview/` (tier L, plan
455). See `MISSION.md`, plan `410-docs-site.md`, and `docs/preview-strategy.md`.

## Brand and document head

The site's identity is generated, not retyped. `src/lib/site-head.ts` owns the
title, description, OpenGraph/Twitter tags, the icon links and the social card's
declared size; `src/routes/__root.tsx` merges it into every route, and the two
scheme-scoped `theme-color` tags are rendered directly in `<head>` because
TanStack keys meta tags by name and would keep only one of them.

The assets live in `public/brand/` (see its `README.md` for the mark, the
1200×630 card and how the PNGs were rasterized). `src/lib/site-head.test.ts`
proves each path exists, the card's real pixel size and that the browser-chrome
colours are the library palettes; `smoke:build` proves the built pages carry the
tags and serve each asset. A page without a description, `og:title`, `og:url`, an
absolute `og:image`, a Twitter card, an SVG icon and a PNG fallback, an
apple-touch icon, a manifest link or a light/dark `theme-color` fails the crawl
by name (plans 510 and 516).

The install metadata is `/site.webmanifest`, a route
(`src/routes/site[.]webmanifest.ts`) built from `src/lib/site-manifest.ts`, so
the name, description, start URL and both colours come from the head and the
token palette instead of a hand-written JSON file. It is deliberately
`display: "browser"` with no maskable icon: there is no service worker, so the
site makes no standalone or offline claim, and the full-bleed mark would be
cropped by an Android mask. `src/lib/site-manifest.test.ts` decodes the document
with a `Schema.Class` and reads each icon's real pixels; `smoke:build` proves the
route answers as `application/manifest+json`, serves the module's exact
document, and that both icons resolve as PNGs.

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
nub run --filter docs smoke:console # every page loads with a clean browser console
nub run --filter docs smoke:preview # drive the live GPUix surface in headless Chrome
nub run --filter docs smoke:keyboard # skip link, focus ring and Enter in a real browser
nub run --filter docs smoke:platform # the toggle: click, URL, storage, arrows
nub run --filter docs smoke:theme   # the theme switch: class, storage, previews
nub run --filter docs smoke:theme-editor # the editor: repaint, share URL, reset
nub run --filter docs smoke:responsive # 390 px: no sideways scroll and no clipped column
nub run --filter docs smoke:a11y   # axe over every page in both schemes
nub run --filter docs build:preview # only rebuild the live surface (public/gpuix-preview)
nub run --filter docs api:values    # regenerate the generated Values API index
nub run --filter docs icons         # regenerate the icon catalogue from packages/icons
nub run --filter docs roadmap       # regenerate the roadmap from COMPONENTS.md
nub run --filter docs studio        # author the MDX in Fumadocs Studio (dev-only)
nub run check                       # repo gate: test quality, lint, format, types
```

`vitest.config.ts` keys its filesystem module cache by the set of page files
under `content/docs`. `src/lib/source.ts` is compiled into one
`import.meta.glob`, and Vitest keys a cached transform by the module's content —
so a page added without editing `source.ts` reused a stale page list (measured:
15 of 94, with every source-based guard green). The key makes an add or a remove
recompile it; `src/lib/source-completeness.test.ts` compares `source` with the
files on disk in both directions.

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
`component-pages.test.ts` reads. Its **Live scenes** section (plan 517) is the
authoring guide for a tier-L surface: the record field, the four files, the
gesture vocabulary, the readiness contract and the guards, every fact checked
against `preview/scenes.ts` and the real files.

The styling model has its own page, `/docs/styling` (plan 606): the `style` prop,
the shallow-merge contract, the seven `StyleDesc` families and the CSS concepts
the runtime does not have. The supported surface is an `<auto-type-table>` over
`node_modules/@gpuix/native/dist/host.d.ts`, so the page renders the runtime's own
73 fields; the absent-concept table is `<AbsentStylingConcepts />`, drawn from
`src/lib/styling.ts`. `src/lib/styling.test.ts` parses the same declarations in
both directions and fails by name when a field is unclassified, a family anchor
disappears, a concept is claimed absent after the runtime gained it, or the table
stops resolving.

A misspelling has a tier of its own (plans 607, 608). The lexical index tolerates
most typos by returning *some* page, so `botton` returned Toggle and `theem` the
Values API, while `acordian` and `dropdwon` returned nothing at all.
`src/lib/typo.ts` compares a single-word query with every component name, page
title and guarded alias after collapsing repeated letters and applying the same
stem the real matcher uses; it also compares the raw spelling, so `themnig` sees
`theming`'s suffix rather than only its stem. A whole phrase is matched word by
word against one whole title or alias, positionally, with every word exact or one
edit and at least one changed (`theem editr`, `buton group`, `seach input`).
A single misspelled word lands at `TYPO_MATCH_RANK` (8), below every real match;
a whole-phrase typo is name evidence and sits at `PHRASE_TYPO_MATCH_RANK` (2), so
a one-token result (`Radio group` for `buton group`) cannot steal it. A whole
title beats a word of a longer title, a name beats an alias, two names tied at
the winning tier are never promoted, and a four-letter word inside a longer title
is not a typo (`code` is not `mode`). The winning page is synthesized when the
index omitted it. `src/lib/typo.test.ts` pins each rule, `search.test.ts` runs
the measured misspellings against the real index, and `smoke:build` checks
`botton`, `acordian` and `theem editr` in the production build. The same passes
give Typography `line height`, `line spacing` and `leading`, Installation the
platform question, Layouts the i18n, locale and direction vocabulary, and the
eighth page-alias block the exact phrase a page already owns — `state
management` → Component API, `transparency`, `width` and `letter spacing` →
Styling, `rendering` and `server side rendering` → Architecture, `speed`,
`credits`, `vitest`, `panel` and the colour-vision words.

The extension half is `/docs/extending` (plan 488): the `core/` layer, the real
`Toggle` source and the theme example. `src/extending.test.ts` reads
`packages/primitives/src/core` and the page, so a new core module cannot ship
undocumented and a renamed include or command fails by name.

The editor packages are exact-pinned devDependencies: the ecosystem is pre-v1, so
a minor bump may change the serialization contract the guard proves. Re-run the
suite before bumping.

## Built-site smoke check

The unit suite reads the source tree. `smoke:build` reads the **production
build**: it builds, serves the worker with `vite preview` on a free loopback
port, and crawls the result (plan 439). It fails when a page does not render,
loses its title, `<h1>`, `<main>` landmark, `lang` or canonical link, skips a
heading level (plan 499); when the document head loses its description,
`og:title`/`og:url`/an absolute `og:image`, its Twitter card, its icon or its
light/dark `theme-color`, or names a brand asset that does not answer as an
image (plan 510); when an internal link or asset 404s; when a
`#fragment` link has no element with that id on the page it names (plan 501);
when `/api/search` stops answering; when an unknown slug is not 404; or when
`robots.txt` loses its sitemap. The fragment check compares the **ids the page
actually renders** (with script bodies removed), not a copy of Fumadocs' heading
slugger, so the 66 generated `#api-reference` links cannot break silently when a
heading changes. It exits `2` — not `0` — when the check could not run (build or
preview failure), so "unverified" is never reported as a pass.

```sh
nub run --filter docs smoke:build
# or crawl a server that is already running:
nub apps/docs/scripts/smoke-build.ts --base-url http://127.0.0.1:4173
```

It is deliberately **not** part of `nub run test`: the build takes ~13 s and
starts a worker, which would slow every checkout. Run it before a release and
after a layout or content change.

## Console smoke check

`smoke:console` loads **every sitemap page** in the production build and fails on
a client error: a `console.error`, an uncaught exception, or an error-level log
entry such as a failed `/assets/*.js`. That is the class the server-HTML crawl
and `smoke:browser` cannot see: a redeploy with stale asset hashes serves a 200
document and 404s every chunk, and a thrown client effect fails after
hydration. The report model (`scripts/page-errors.ts`) is unit-tested; the
sweep runs once in light because a console error is not painted by a theme.
Warnings and info logs are ignored — a gate on them would become an allowlist.

```sh
nub run --filter docs smoke:console
# or against a running server, one page:
nub apps/docs/scripts/smoke-console.ts --base-url http://127.0.0.1:4173 --no-build --only /docs/installation
```

Exit `1` names the page and the error, exit `2` means the build, server or
Chrome was missing — never a pass.

## Live GPUix surface (tier L)

`preview/` is a **second Vite project**, not part of the SSR app. It mounts the
real library components on `@gpuix/native@0.10.0`'s published WebAssembly
renderer (the browser's GPU backend) and exports one document per scene:

- `preview/scenes.ts` lists the scene keys and the text each one must paint;
  `preview/scene-views.tsx` holds the compositions. A registry record opts in
  with `liveScene: "<key>"`, `registry.test.ts` fails on a key no scene ships,
  and `scene-contract.test.ts` fails when a scene's expected text no longer
  occurs in its view. Live scenes ship for every record that declares a
  `liveScene` (45 today), plus the Showcase page and the three composed pattern
  screens — the confirmation flow, the command palette and the project browser
  (plans 560, 521, 522 and 575); `docs/preview-strategy.md`
  owns the tier table and names them all. 26 of those document state only a
  gesture produces — an open
  overlay, an opened list, a checked control, a value a key reaches, text a
  reader types or a colour/rename a reader commits — so
  `preview/scenes.ts` declares the gesture that produces it
  (`SCENE_GESTURE`) and the sentence the reader sees
  (`SCENE_INTERACTION`); the smoke drives the gesture through the `App` the
  renderer installs on the page, typing through the same keyboard/IME path a
  keyboard uses. Every delivered page now has a live scene or an
  illustration; `scene-contract.test.ts` fails on a new gap instead of shipping
  it silently (plans 458, 486, 492, 493 and 508).
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

**Every page that carries a labelled preview is read in both modes** (plan 495).
The page list is derived from the MDX tree (`scripts/preview-pages.ts`), so a new
component page joins the gate by shipping its `<ComponentPreview>` block; the
smoke opens each page once in dark and once in light, from one Chrome session,
and fails naming the page and the surface that disagreed. A surface still
showing the server's light snapshot after hydration is exactly what this catches.

```sh
nub run --filter docs smoke:browser
# or against a server that is already running:
nub apps/docs/scripts/smoke-browser.ts --base-url http://127.0.0.1:4173 --no-build
```

It finds Chrome via `CHROME_PATH`, then the macOS app path, `google-chrome`,
`chromium` or `chromium-browser`; pass `--chrome <path>` to override. Exit `1`
means the site is wrong (`FAIL <url>: <what>`), exit `2` means the check could
not run (no build, no server, no Chrome) — never a pass. Expected values come
from `@gpuixui/tokens`, so the script carries no colour or font literal. The
Chrome session itself (`scripts/chrome-session.ts`) is shared with
`smoke:preview`, which drives the live GPUix scenes.

## Keyboard and focus

Every page leads with a **skip link** (`src/components/skip-link.tsx`). It is
`sr-only` until focused, then fixed at the top-left. Its target carries
`tabIndex={-1}` so Enter **moves focus** into the page rather than only changing
the hash: `#nd-page` (the docs article) on a docs page, `#main-content` (the
landing and 404 bodies) on the home layouts.

The site's own links, buttons, selects, summaries and tab stops draw a 2 px
`--color-fd-ring` outline on `:focus-visible` (`src/styles/app.css`), so keyboard
focus belongs to the docs identity in both themes; `theme.test.ts` pins the rule
to the token. Fumadocs' own styles keep precedence because the rule uses
`:where`. The skip target carries `data-skip-target`, which suppresses the ring:
focus moved to a 640×7327 px article, and ringing it would frame the page.

`smoke:keyboard` proves the contract in a real browser — the first Tab reaches
the skip link, it is visible only then, the outline is the resolved ring token,
and Enter focuses the target:

```sh
nub run --filter docs smoke:keyboard
# or against a running server:
nub apps/docs/scripts/smoke-keyboard.ts --base-url http://127.0.0.1:4173 --no-build
```

Two pages cover both layouts and the 404 path: `/docs/components/button` in dark
(`#nd-page`), `/` in light (`#main-content`), and an unknown docs slug in dark
(the not-found body). Exit `1` names the step that broke, exit `2` means Chrome
or the server was missing — never a pass.

## Search smoke

`smoke:build` proves the index answers over HTTP; `smoke:search` drives the
palette itself in headless Chrome (plan 506). It opens the dialog with the real
⌘K shortcut, proves the field takes focus, types `installation` and finds the
Installation page, presses Enter and lands on it with focus on the destination
page's start, reopens and types an unknown query to get the "No results found"
state, then dismisses with Escape and proves focus is back on the visible
search trigger rather than `<body>`.

The two focus assertions guard measured defects: Fumadocs opens a
**controlled** Radix dialog, so it has no trigger to restore to and both close
paths left focus on `<body>`. `src/search/search-focus.tsx` remembers the
opener (or the trigger), moves focus back when Escape dismissed the palette and
into the new page when a result was chosen. `src/search/focus.test.ts` pins the
decision rules.

The same smoke drives the two search surfaces the palette does not cover. On
`/docs/components` it types `combobox` and asserts the live count and the one
card, then a no-match query and the empty state's **Clear filter** control,
returning the full list. At 390×844 it uses the only control a phone reader has
— the `Open Search` icon button — and proves the palette opens focused, lists
Installation, navigates on Enter, lands focus on the destination and does not
scroll sideways.

```sh
nub run --filter docs smoke:search
# or against a running server:
nub apps/docs/scripts/smoke-search.ts --base-url http://127.0.0.1:4173 --no-build
```

Exit `1` names the step that broke, exit `2` means Chrome or the server was
missing — never a pass.

## Platform toggle smoke

`MISSION.md` accepts the platform styles on one sentence: a reader toggles
macOS → Windows and every preview changes, the choice lives in the URL so a link
carries it, and it is remembered across navigation. `smoke:browser` only ever
*loaded* `?platform=win32`, so the control itself had no gate.

`smoke:platform` operates the switcher in a real browser and proves the whole
path: a click changes `<html data-platform>`, the URL, the checked option and
every preview surface; a fresh document with no query parameter restores the
stored choice; a client-side navigation keeps it; the Theming page's live
sentence names it; Default removes the parameter and restores the base theme;
and the arrow keys move, apply and keep focus. Every expected label and mono
family comes from `@gpuixui/tokens`, so the script carries no platform literal.

The switcher is one **radio group** (WAI-ARIA APG single-select): one tab stop,
`aria-checked`, and arrows that select and apply. `src/platform/platform-toggle-logic.ts`
owns the neighbour table and its test walks it against `platformNames`, so a new
platform cannot be added to the rendered list and silently left out of the
keyboard order. The same component renders a native `<select>` below the `sm`
breakpoint, where four labels do not fit beside the logo, search and the menu;
both controls call the one provider setter, and `isPlatformName` decodes the
select's string. `smoke:platform` operates the radio group in a 640×720 window
and the select at 390 px, so neither path is inferred from the other (plan 519).

```sh
nub run --filter docs smoke:platform
# or against a running server:
nub apps/docs/scripts/smoke-platform.ts --base-url http://127.0.0.1:4173 --no-build
```

Exit `1` names the step that broke, exit `2` means Chrome or the server was
missing — never a pass.

## Theme toggle smoke

The other browser smokes force the colour scheme through CDP, so they prove both
modes *render*; none of them presses the switch a reader presses. `smoke:theme`
does: starting from a fresh profile in forced **light**, it clicks
`[data-theme-toggle]` and asserts the document class, `color-scheme`, the page
background, the stored `localStorage["theme"]` and every preview surface turn
dark together; a client navigation and a parameter-free reload keep the mode
(the scheme is still forced light, so storage is the only explanation); a second
press returns to light. It runs at 1280 px, where the docs switch is in the
header rather than the mobile sidebar.

The landing page is the exception Fumadocs does not cover: `HomeLayout` hides
its switch inside a `max-lg:hidden` container, so below 1024 px the page had no
usable mode control. `src/components/theme-toggle.tsx` renders a compact
`lg:hidden` switch in the home nav; it reads the same next-themes store, and its
glyph follows the `dark` class through CSS so the server and client markup
agree. Step 6 opens `/` at 390 px, proves the compact switch is the only
displayed one, and presses it dark and back to light.

```sh
nub run --filter docs smoke:theme
# or against a running server:
nub apps/docs/scripts/smoke-theme.ts --base-url http://127.0.0.1:4173 --no-build
```

Both backgrounds come from `@gpuixui/tokens`, converted to the `rgb()` form
`getComputedStyle` reports, so the script carries no colour literal. Exit `1`
names the step, field and observed value; exit `2` means Chrome or the server
was missing — never a pass.

## Responsive layout

`smoke:responsive` gives the site a **390×844** layout viewport through CDP
(`Emulation.setDeviceMetricsOverride`, so the media queries see it) and crawls
**every sitemap page** — landing, prose, the component index, generated tables,
source includes, token tables and the rest. For each it asserts:

1. `documentElement.scrollWidth` stays at the viewport — the page never scrolls
   sideways;
2. the article (`#nd-page`, or `#main-content` on the landing page) has
   `scrollWidth === clientWidth` — no block is clipped. Fumadocs wraps the
   article in `overflow-x: clip`, so a wide block does **not** grow the
   document: it silently loses its tail. That second assertion found a real
   bug (plan 502): the tier-V suite path on the Buttons page was 423 px wide in
   a 390 px column. Inline code now wraps (`:not(pre) > code` in
   `src/styles/app.css`); code blocks keep their own horizontal scroll.

It then opens the mobile sidebar with `button[aria-label="Open Sidebar"]`, waits
for a visible `/docs/installation` link, clicks it and proves the route
changes. Every docs page shares the shell, so the navigation is checked once.
The same pass measures the two controls MISSION names: at 390 px the landing page
paints the compact theme switch and the platform select with non-zero boxes
inside the viewport, the desktop switch and radio group are not displayed, and
the docs sidebar exposes `[data-theme-toggle]` after it opens (plan 519).
Exit `1` names the page and the measurement, exit `2` means Chrome or the
server was missing — never a pass.

```sh
nub run --filter docs build
nub apps/docs/scripts/smoke-responsive.ts --no-build
```

## Accessibility sweep

Every rule above checks one thing. `smoke:a11y` runs **axe-core 4.10.2** with
the WCAG 2.1 A/AA tags over **every sitemap page in both colour schemes**, so a
defect joins the gate by the page existing. It found three classes on its first
run and all are fixed: a landing-page `<ul>` whose `<li>` children overrode
their role, two horizontally scrolling table wrappers with no keyboard path
(now a labelled `role="region"` with `tabIndex={0}`, which the shared
`:where(…, [tabindex]):focus-visible` rule already rings), and four preview
fragments dimmed with `opacity: 0.5` until captions fell to 2.86:1. The Rating
and Label previews no longer dim informative text; the disabled Button preview
keeps the library's 0.5 opacity and carries `aria-disabled="true"`, which is
the state it depicts and the WCAG 1.4.3 exemption stated in the page.

The axe source is injected from the dev dependency, never fetched from a CDN,
and the script carries no allowlist: a violation fails by name. Use `--only` for
a local loop; the committed gate always sweeps the sitemap.

```sh
nub run --filter docs smoke:a11y
# or against a running server, one page:
nub apps/docs/scripts/smoke-a11y.ts --base-url http://127.0.0.1:4173 --no-build --only /docs/capabilities
```

Exit `1` prints one line per violating element (page, scheme, rule, target and
axe's reason); exit `2` means Chrome, the server or axe could not run — never a
pass.



## Search

`/api/search` merges the MDX page index with the component registry
(`src/lib/search.ts`). A component name is scored by its **title** — equal,
prefix, word prefix, an inflected stem, then a substring of at least four
characters — so `button` reaches
`/docs/components/button` even when prose matches first; every other query keeps
the page index's order and appends registry hits in the tail (plan 419). The
props types a component documents are indexed too, so `ButtonProps` and
`ToastViewportProps` reach their pages (plan 442), and so is every exported part
name, so `DialogTitle` reaches Dialogs (plan 481). A props type also **names its
component**: `componentSymbols` strips the `Props` suffix and scores the stem
like a title, so `Spinner` reaches the *Loading indicators* page first even
though that title never contains the word (plan 500). The generated token
catalogue is indexed the same way (plan 504): every colour role, type role,
scale token and platform family has a document derived from `@gpuixui/tokens`,
so `destructiveSoft` reaches the colour table and `spacing.md` reaches the scale
table instead of returning nothing or component prose. An exact, distinctive
token name (camelCase or dotted) is promoted like a component title; a plain word
such as `input` or `label` is not, so the component page keeps the first result,
and a pasted value from any of the four shipped palettes finds the role that owns
it (plan 586). The measured capability matrix is its own document (plan 505), so
`modal-focus-trap` and
`theme-color-roles` reach `/docs/capabilities`; only hyphenated ids are promoted,
so `theme` and `log` still find their pages. The icon set is indexed the same
way (plan 507): every name is in the document, and a hyphenated one such as
`chevrons-up-down` reaches the Icons page first. A blank query returns `[]`, and
one page is listed once. `src/lib/search.test.ts`, `src/lib/token-search.test.ts` and
`src/lib/capability-search.test.ts` guard these rules, and `smoke:build` asserts
the `Spinner` symbol, a token role and a scenario id against the production
index.

A query may be a **phrase** (plan 561). A whole-query name match keeps the ranks
above; when there is none, each word is tried against every component name with
a penalty, so `popover placement` reaches the Popover page instead of the Box
page's variants. A page's **own title** is scored the same way (`Command
palette`, `Theming`), and a title hit the page index omitted is synthesized from
`source.getPages()`, because `theming` otherwise answered with the `## Theming`
heading on component pages and never `/docs/theming`. A whole-phrase page match
still outranks a one-word component match.

A promoted name also matches the way prose writes it (plan 564). A roadmap
target (`File trees`, `Code editor integration`), a camelCase token
(`primaryForeground`), a hyphenated icon (`chevrons-up-down`) and a scenario id
(`modal-focus-trap`) are promoted for any query of **two or more words** where
every word prefixes part of the name — so `file tree`, `primary foreground`,
`chevrons up down` and `modal focus` reach their pages. The partial match ranks
below an exact name, and a **single** word is never promoted: `input`, `label`,
`search`, `copy` and `list` keep their own pages. `src/lib/generated-search.test.ts`
guards the rule and the four generated indexes prove it end to end.

A hand-authored page's own **description** is a search signal (plan 568).
`mergeResults` scores a page without a component record by its frontmatter
summary — exact, whole word, word prefix, then every word of a phrase — one tier
below its title (`DESCRIPTION_MATCH_RANK`). That is what makes `table` reach
Data display, `panel` reach Workspace and `aria` reach Accessibility instead of
the page that merely mentions the word; a component page is excluded because
its title, symbols and aliases already identity it, and its summary is prose.
`pageDescriptionHits` synthesizes a page hit when the index answered only with
headings, and `src/lib/search.test.ts` guards the five measured queries
(`table`, `tables`, `panel`, `aria`, `screen reader`) plus the word-boundary and
component-summary rules. `smoke:build` asserts `table` and `aria` against the
production index.

A summary must **name every subject its page owns** (plan 574). The description
rule only sees words an author wrote, so four pages whose subjects are generated
tables described themselves without them: `spacing`, `radius`, `density` and
`elevation` reached the Tokens API or Box, `font`, `font family` and `font
weight` reached the Tokens API, `wasm`, `screenshot` and `approximation` reached
the Values API or Architecture, and `virtualized` reached Message scroller. The
Theming, Typography, Previews and Data display descriptions now name them; an
11-query table in `src/lib/search.test.ts` requires the owning page **first**,
and `smoke:build` checks `spacing`, `font family` and `screenshot` against the
production index. `split panes` stays on the Roadmap because plan 564 promotes
the inventory target of that name.

A promoted name is a candidate even when the lexical index misses it (plan 569).
The Fumadocs index tokenises `focusRing` as one word, so `focus ring` returned
Number field prose and `elevation shadow` only a table chunk. `generatedNameHits`
synthesizes one page result per generated document whose promoted name matches —
the rule `pageTitleHits` uses for titles — and `mergeResults` promotes only the
page, not a text chunk at the same URL. The Tokens API function table has its own
entry, derived from the real `@gpuixui/tokens` helper exports in
`src/lib/tokens-api-search.ts`, so `focus ring` and `elevation shadow` reach
`/docs/tokens-api#functions`. Only distinctive names are promoted: `alpha` is
indexed but not promoted, and `input`/`label` keep their component pages.
`smoke:build` asserts both helper queries and the existing `semantic roles`
answer.

Reader vocabulary is one guarded table (plan 566):
`src/lib/component-aliases.ts` maps a record slug to the terms a reader types
when the title cannot match — `textbox` → Text inputs, `one time password` →
OTP Field, `modal` → Dialogs, `colour picker` → Color picker. The registry
index, the ranker and the index filter all read it, and an alias is matched as a
whole query, so `modal focus` still reaches the `modal-focus-trap` capability
row. `component-aliases.test.ts` rejects a shared term or one that shadows
another component's title, and `smoke:build` queries two recovered terms
against the production index.

A hand-authored page has no such record, so it gets its own guarded table
(plan 598): `src/lib/page-aliases.ts` maps a page URL to the phrases a reader
types for it — `theme switch` and `system theme` → Dark mode, `demo` and
`sample` → Examples, `how to use` and `import` → Getting started, `version` →
Installation. A page alias is matched only as the **whole** query: a prefix
would let `theme` claim Dark mode through `theme switch`, and an inner word would
let `switch` claim it too. `pageAliasRank` scores `0` above a component's title
token and a live scene's instruction, and `pageAliasHits` synthesizes the page
result, so the alias answers a query the lexical index never retrieved. The
table is page-only — `hint` and `supporting text` are component vocabulary and
live in `component-aliases.ts` — and `page-aliases.test.ts` rejects a key that
outlives a page, a key on a component page, a shared term, and a term that
shadows a page or component name. `smoke:build` asserts `theme switch` and
`hint` against the production index.

A second measured pass (plan 599) covered the integration vocabulary, where the
owning subject is a **section** rather than a title: `react`, `react provider`,
`provider` and `providers` → Getting started, `escape`, `escape key`, `disabled`
and `disabled state` → Component API, `select row` and `selectable rows` → Data
display, `mono`, `mono font` and `monospace` → Typography, and `how to install` →
Installation. A third pass (plan 601) added the keyboard conventions —
`keyboard`, `keyboard shortcuts`, `keyboard support`, `enter key`, `space key`,
`arrow keys` and `tab order` → Component API, `keyboard focus` → Accessibility,
`reduced motion` → Theming — and the component table learned `hotkey input`.
Every term is an entry in the same table; no ranker changed.
`row selection` deliberately stays on the Roadmap (it promotes a target of that
exact name), `motion`/`animation` have no owner until `packages/tokens` ships
motion tokens, and `disabled button` keeps Button. `smoke:build` asserts `react`,
`how to install`, `easing` and `keyboard`.

A fourth pass (plan 602) gave the **runtime vocabulary** a page instead of a
component coincidence: `effect`, `effect ts`, `effect runtime`, `managed
runtime`, `fiber`, `browser`, `browser build`, `run in browser`, `runs in
browser`, `web app`, `webassembly`, `ssr`, `server rendering` and `hydration` →
Architecture, whose `## State and Effect` names the toast `ManagedRuntime`, the
`core/` decision layer and the app-owned clock, and whose `## What runs where`
separates the desktop renderer, the wasm live surface and the server-rendered,
hydrated docs chrome. `wasm` stays on Previews and `project browser` keeps the
pattern page; `smoke:build` asserts `effect`, `browser` and `hydration`.

The table got a second measured pass (plan 579). `typeahead`, `passcode`,
`wizard`, `pin code`, `segmented control`, `hover card`, `menubar` and
`scrollview` returned nothing or another component; the same table now answers
them, with no new mechanism. The page summaries took the same pass: Data
display's summary names `datagrids`, and Workspace's names `sidebars`, so the two
alternate names reach the pages that own the subject. `data grid` deliberately
stays on the Stack page: `Grid` is a real exported layout primitive and plan
564's token rule promotes it, so the tabular meaning gets its own word
(`datagrid`).
The `search.test.ts` plan-579 tables fail by query, and `smoke:build` checks
`typeahead` and `datagrid` against the production index.

A third pass (plan 583) added the next measured words: `cmdk` → Command menus,
`autosuggest` → Comboboxes, `gauge` → Meter, `pill` → Badges, `callout` →
Alerts, `busy` → Loading indicators and `sheet` → Drawers. Theming's summary now
names the macOS, Linux and Windows platform styles it owns, Workspace's names
resizable splits and inspector panels, and Layouts records that RTL layout is
not implemented. This is the same alias table and the same authored-summary
rule; it adds no ranker. The plan-583 table in `search.test.ts` fails by query,
and `smoke:build` checks `cmdk` and `macos` against the production index.

A fourth measured pass (plan 585) fixed two spelling assumptions. A title is now
matched by its **stem** after the exact and prefix tiers, so `theme` reaches
Theming and `capability` reaches GPUix capabilities: `Theming`/`theme` and
`capabilities`/`capability` are the same word to a reader. A substring shorter
than four characters no longer names a page — `log` was matching `Dialogs` and
outranking the page that owns log viewers. The pages that own a subject name it
(Data display: tree views, log viewers, charts, key-value displays;
Accessibility: keyboard focus), and the guarded `src/lib/roadmap-aliases.ts`
adds the one-word name of a multiword target: `diff` → Diff viewer, `editor` →
Code editor integration, `drag` → Drag and drop, `markdown`/`rich text` →
Rich-text editing, `toolbar` → Toolbars. Keycap also learned
`keybinding`/`keybindings`. The plan-585 table in `search.test.ts` requires 14
owning pages **first**, a guard keeps `table`, `panel`, `input` and `label` where
the earlier passes put them, and `smoke:build` checks `theme`, `capability`,
`tree`, `diff` and `toolbar` against the production index.

The palette **UI** is driven end to end by `smoke:search` (plan 506): the real
⌘K shortcut opens and focuses it, typing lists the Installation page, Enter
navigates and focuses the destination page, an unknown query shows the empty
state, and Escape closes it with focus returned to the search trigger.

A declared **part** is a name too (plan 580). `CardTitle`, `FieldError` and
`DialogClose` are scored like a title, so the component page is the first
result rather than a limitations paragraph that mentions the name. The ranker
reads every name the record owns — title, props-type symbol, declared part,
props type and alias — and `search.test.ts` walks all of them against the real
index. A part two compound records share (`MenuGroup`) ranks both; the tie-break
chooses one and the guard accepts either owner.

A **live scene's instruction** is searchable too (plan 582). The sentence above
each surface — `Type a name into the field.`, `Wheel up in the log to leave the
tail.` — is rendered React from `preview/scenes.ts`, so the MDX index never sees
it. `src/lib/scene-search.ts` indexes the whole scene list at
`/docs/previews` and synthesizes a page candidate for each scene whose
instruction matches; `sceneInstructionRank` scores a multiword phrase above
prose and a page title's token match, but below an exact title. `wheel up`,
`press end`, `type a name` and `right click` therefore reach Message scroller,
Slider, Text inputs and Context menu; `live scene` reaches Previews. A
stop-word-only phrase (`click the`) and every single word are never promoted, so
`input` and `click` keep their own pages. There is deliberately no second
document at a component page's URL: the registry index keys documents by URL, and
the duplicate made every query answer HTTP 500 when this plan was first built
(measured; the unit index accepted it).

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

## Accessibility

`/docs/accessibility` is the cross-cutting answer a consumer needs before
adopting the library: the `aria-*` surface the pinned `@gpuix/native` accepts,
the library's substitute for every attribute it lacks, and every delivered
component's recorded limitations.

The supported and absent sets live in `src/lib/accessibility.ts` and are
rendered by `<AriaSupportTable />`; `src/lib/accessibility.test.ts` parses
`interface HostProps` from the installed declarations, so a dependency change
fails the suite instead of leaving the page stale. `<AccessibilityIndex />`
renders the registry's `limitations`, grouped by tier, and
`accessibility-index.test.tsx` compares the markup with the registry in both
directions. Both tables are rendered React, so the Fumadocs page index cannot
see them (D32): `src/lib/accessibility-search.ts` gives them their own document,
`smoke:build` asserts `aria-valuenow` reaches the page, and `smoke:a11y` covers
it in both schemes.

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

## Showcase

`/docs/showcase` mounts the `showcase` live scene (plan 560): a composed project
panel — identity header, a Card with its footer actions, two labelled fields, a
checked box and a progress bar — built from the real packages. It is a tier-L
surface, so the label still says WebAssembly and not the desktop window. The
scene is not a component record; `preview/scenes.ts` maps it to its page with
`SCENE_PAGE`, and `src/showcase-page.test.tsx` proves the page, its sidebar
entry, the delivered records it names and the landing-page link. The page's
component list is generated from `SHOWCASE_SLUGS`, so no title is typed twice.

## Installation facts

The Installation page's prerequisites and native-binding table are derived facts,
not remembered prose (plan 584). `src/lib/native-platforms.ts` lists the platforms
a reader can install; `native-platforms.test.tsx` compares its published rows with
the installed `@gpuix/native` package's real `napi.targets` and optional binary
dependencies. Intel macOS is an explicit unpublished row, not a claim: the pinned
0.10.0 release has no `x86_64-apple-darwin` binary, and the page names the
repository's `apps/playground/scripts/build-native-binding.sh` remedy.
`installation-page.test.ts` compares the displayed Node, nub and GPUix versions
with `.node-version`, `devEngines.packageManager` and the workspace catalog, and
resolves the build script on disk. Because the table is rendered React, a
generated `platformSearchEntry` carries every target into ⌘K and promotes
`platform support` / `native bindings`; `platform-search.test.ts` keeps a plain
word on the page that owns it. The page summary names `prerequisites`,
`requirements` and `platform support`; `search.test.ts` guards eight measured
queries and `smoke:build` checks two of them against the production index.

## Theme

The site's light and dark palette **is** the library's palette. The Fumadocs
variables in `src/styles/app.css` are the semantic roles from `@gpuixui/tokens`,
mapped in `src/lib/docs-theme.ts`; `src/styles/theme.test.ts` asserts every mapped
value equals `lightTheme.colors` / `darkTheme.colors` in both modes. Change the
token package first, then the stylesheet — a mismatch fails the suite.

The theming and typography pages render `<TokenColors />`, `<TypeScale />` and
`<PlatformTypes />` from the package's data, so the documented values are the
shipped values. `<ContrastColors />` renders the same 47 roles from the two
high-contrast themes, and a separate search document carries their values, so a
high-contrast value finds its role (plan 586). `<TokenScales />` adds every
remaining group — spacing, radius, border width, icon size, density and
elevation — with tests that fail when a group, key or value drifts. The token
root entry is the **only** `@gpuixui/*` import the site may make
(`@gpuixui/tokens/react` is forbidden, as is every GPUix runtime package);
`src/architecture.test.ts` enforces the allow-list.

Motion is the one design-system axis with no tokens yet, so Theming's
`## Motion` section states what the *runtime* can animate instead: the
`MotionStyle` keys, the timing fields, and the transform/rotation/colour that do
not exist. `src/motion-truth.test.ts` parses `MotionStyle`, `MotionTransition`,
`MotionEase` and the `@gpuix/react` exports from the installed declarations, so
the section cannot outlive the API in either direction, and it fails when
`packages/tokens/src/index.ts` gains a motion module — the day plan 019 lands,
the page must change. `motion`, `animation` and `easing` reach the section
through the page-alias table; `smoke:build` asserts `easing`, which returned
nothing at all before (plan 600).

## Code highlighting

Code fences, source includes and generated prop tables are highlighted by two
separate Shiki pipelines. Both read one palette from
`src/lib/code-palette.ts`; `source.config.ts` passes it to `rehypeCodeOptions`
and to `remarkAutoTypeTable`'s `shiki` option.

The base pair is GitHub Light/Dark, with two measured corrections (plan 498):
`#e36209` painted 3.49:1 on the light code surface and `#6a737d` 3.51:1 on the
dark one, both below the 4.5:1 text floor. They are replaced per theme
(`#b34700`, `#8b949e`) so each correction reaches one scheme. Change the palette
in that module, not in CSS: `src/code-palette.test.ts` recomputes every ratio,
and `smoke:browser` measures each painted code colour on the pages it visits.

## Page weight

The docs must stay fast to navigate, and nothing used to measure what the client
graph shipped. `src/lib/source.ts` enabled Fumadocs' `lucideIconsPlugin()`,
which resolves an `icon` name through `import { icons } from "lucide-react"` —
a namespace import that defeats tree-shaking. **No page, `meta.json` or
frontmatter in this site declares an `icon`**, so the plugin resolved nothing
and every reader downloaded all 1 849 icon records in one 701 KiB chunk.

The plugin is gone (plan 604). Two guards keep it gone:

- `src/lib/source-icons.test.ts` fails when `source.ts` mentions `lucide`, when
  a `meta.json` declares `icon`, or when a page's frontmatter does. An `icon`
  now renders nothing, so the failure says to name a component or adopt an
  explicit map instead.
- `smoke:build` scans `dist/client/assets/*.js` after the build and fails when a
  single script carries more than 100 lucide icon records
  (`name:`…`,size:24,node:`). The full set measured 1 849; the tree-shaken
  glyphs this site legitimately uses total 24, 15 in the largest asset.

Measured on the production build, fresh Chrome profile per page,
`performance.getEntriesByType("resource")`:

| Page | Before | After |
| ---- | ------ | ----- |
| `/docs/components/button` | 1 686 KiB | 1 084 KiB |
| `/docs/theming` | 1 572 KiB | 970 KiB |
| `/docs/components` | 1 517 KiB | 915 KiB |
| `/docs/components/context-menu` | 2 521 KiB | 1 919 KiB |

The shared root chunk fell from 701 KiB to 261 KiB. The remaining page-specific
chunk is the highlighted article the page renders, not duplicated library code.

## Icon catalogue

The Icons page lists **every name the set ships**, filtered locally
(`src/components/icon-catalogue.tsx`). The names and their geometry are
generated: `nub run --filter docs icons` writes
`src/lib/icon-catalogue.generated.ts` from `packages/icons/src/names.ts` and
`registry.ts`, and `src/lib/icon-catalogue.test.ts` fails while the file is
stale, so a new icon reaches the page with no docs edit beyond the command. The
site cannot import `@gpuixui/icons` directly: its root pulls `effect/Record` and
its `Icon` component into the bundle, which `src/architecture.test.ts` forbids.

Each tile draws the package's own markup in the browser, with the replaceable
`#000` shown as the current text colour — the same substitution GPUix's
`<svg source>` performs with `style.color`. The page says so: the gallery is a
lookup table, not a native capture, and the live scene plus
`icon.runtime.test.tsx` remain the native evidence. Every icon name is also in
the search index (`src/lib/icon-search.ts`); only hyphenated names are promoted,
so `chevrons-up-down` reaches the page first while `copy` and `search` keep the
pages that own those words.

## Roadmap

`/docs/roadmap` publishes the half of the inventory that has no pages yet: every
Tier 3–5 target from `COMPONENTS.md`, with its status, GPUix support and note.
`nub run --filter docs roadmap` writes `src/lib/roadmap.generated.ts`; the page
renders it through `<RoadmapTable />`, and `src/lib/roadmap.test.ts` fails while
the committed module is stale. `src/lib/roadmap-search.ts` indexes every target,
promoting only multiword names (`Resizable split panes`) so a plain word such as
`Toolbars` keeps its prose result.

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

## Machine discovery

Three routes serve the documentation to a reader that is not a browser, all
generated from the page tree so a new page needs no edit here:

- `/llms.txt` (`src/routes/llms[.]txt.ts`) is the index: every page's title,
  summary and absolute URL, grouped by the sidebar. The root `meta.json`
  description is the document's summary.
- `/llms-full.txt` (`src/routes/llms-full[.]txt.ts`) renders every page with
  `page.data.getText("processed")` — the authored Markdown, with the title,
  description and absolute source URL above it. Data-driven MDX blocks stay as
  component tags because they are React, not prose.
- `/docs/<slug>.md` (`src/routes/docs/{$}[.]md.ts`) is one page, the same
  render `/llms-full.txt` carries, addressed on its own. `src/lib/llms.ts` owns
  the render (`renderPageMarkdown`), so the full document and the per-page route
  cannot diverge; `src/lib/page-markdown.ts` names the URL. Every page links to
  it from the **Copy Markdown** button and the **View as Markdown** anchor in
  `src/routes/docs/$.tsx`.

`src/lib/llms.test.ts` proves the index links every source page once, absolutely,
and that the full document renders each page. `smoke:build` compares the served
index with the sitemap in **both** directions: a page a crawler sees cannot be
missing from the index, and an index link cannot point at a page the site does
not serve. It also fetches `/docs/components/button.md`, requires
`text/markdown` and an `# Buttons` body, requires `/docs/nope.md` to `404`, and
requires the built component page to carry both controls.

`src/lib/site-output.ts` is the one route table: the Contributing page's guard
and the generated search document both read it, so a discovery route cannot be
served, undocumented or unfindable by itself (plan 597).

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

A **fenced** example is text, so `<include>` guards cannot see its imports.
`src/code-imports.test.ts` reads every `@gpuixui/*` import in a code fence,
resolves the specifier through the package's real `exports` map, and checks each
named import against the resolved module's exports and its `export *` chain
(plan 577). It was written after Inline validation shipped
`@gpuixui/components/validation/logic`: the package's `"./*"` export maps to
`src/*.tsx`, the helper is `src/validation/logic.ts`, and the root entry does not
re-export it, so a reader copying the example got a module-not-found error.

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

A pattern page documents a **real composition**, not a component.
`content/docs/patterns/settings-form.mdx` shows the `examples/basic-app` screen,
`content/docs/patterns/confirmation-flow.mdx` shows a destructive workflow
that runs as a live scene (`preview/patterns/confirmation-flow.tsx`, plan 521),
and `content/docs/patterns/command-palette.mdx` runs the real `CommandMenu`
through an open and a command executed (`preview/patterns/command-palette.tsx`,
plan 522).
The contract (`src/pattern-pages.test.ts`) is: six sections (`The task`,
`Composition`, `State`, `What is verified`, `Source`, `Related`), at least one
real `<include>` that resolves inside the repository, no placeholder prose, and
any `nub run --filter <package> <script>` claim must name a script the example
or docs package really defines. A pattern with no runnable source does not get
a page.

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
animations (skeleton, spinner) or the icon glyph set; they are proved by a
live scene (tier L) and their native suite (tier V), never by a browser
approximation. `scene-contract.test.ts` requires a measured reason for each
interaction gap. `theme-surface.test.ts` also proves every `--preview-*` name a
preview reads is one the surface defines.

`/docs/previews` also renders `<LiveSceneIndex />` (plan 578): one row per
`LIVE_SCENES` entry with the page that mounts it and the reader instruction from
`SCENE_INTERACTION`, or "Mounts in the state it documents" when no gesture is
needed. The rows and the caption derive from `preview/scenes.ts`, so a new scene
needs no docs edit. Two raw GitHub links to `docs/preview-strategy.md` were
removed from that page: the default branch does not serve the path (measured
404), and the on-site list is now the reader's copy.

The instruction is also a search document (plan 582): `scene-search.ts` indexes
the whole list at `/docs/previews` and synthesizes a page candidate for the scene
whose phrase matches, so the ranker scores it above prose without a second
document at a component URL. The scene-index test still owns the rendered rows;
the search test proves the measured gesture queries reach the page that mounts
the scene.

An approximation is never a fallback. The only way to render one is
`<IllustrativeApproximation>`, which always renders the mandated banner.

## Honesty rules

Every preview obeys `docs/preview-strategy.md`. This app must never import
`@gpuixui/*` runtime code or `@gpuix/react` — it reads the real TypeScript
*source* for prop tables and copyable snippets, and nothing else.
`src/architecture.test.ts` enforces that boundary over `src/**`.
