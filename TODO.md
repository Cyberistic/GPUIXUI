# TODO.md — the persistent source of truth

This file is how work resumes after a context compaction, a restart, or a new
agent. Tick items as they finish. Add categories as plans land. If a task is not
here, add it and tick it. Implementation details do not belong here — only tasks
worth tracking.

Legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` cancelled

---

## Harness — the supervisor that keeps the swarm alive

`[x]` `[█████████░]` 6/7

`[x]` Repo on `proserver` with the required shape, mission, rules and plan index
`[x]` opencode 2.0.31 installed with the provider credentials and a trimmed config
`[x]` Verified a real run on `opencode-go-braven/deepseek-v4.1-flash`
`[x]` Supervisor: 30-minute tick, ≥5 agents, one worktree each, idempotent and crash-safe
`[x]` Scheduler installed (launchd agent + daemon driver; see `.agents/slop/README.md`)
`[x]` Model fallback chain with limit detection, one active model for the whole swarm, and an hourly recovery probe (see `scripts/README.md`)
`[ ]` Enforce one live session per worktree: the `opencode run` loop currently
starts a new session before the previous one closes (evidence:
`.agents/slop/blockers/2026-10-17-concurrent-tokens-writers.md`; the guard is
planned in `primitives` plan 022, `022-swarm-single-writer.md`)

---

## Phase A — audit and feasibility

`[ ]` `[░░░░░░░░░░]` 0/6

`[ ]` Inspect the environment, package manager and toolchain; record the findings
`[ ]` Establish the GPUix version, APIs, primitives, events, layout and limits
`[ ]` Read GPUix docs and examples; write the capability map
`[ ]` Inspect GPUI Kit (hierarchy, theming, layout, interaction, licence)
`[ ]` Study shadcn/ui organisation and semantic tokens; review PanelUI; review Fumadocs setup
`[ ]` Write and index every phase and package plan in `.agents/slop/plans/`

## Phase B — working foundation

`[x]` `[█████████░]` 14/16

`[ ]` Land the workspace, boundaries and package scaffolding that has real content
`[x]` Land tokens and the theming architecture (light + dark, semantic roles)
`[x]` Land the `@gpuixui/tw` extension registry, luma `cn-*` aliases and state
variants (plan 524)
`[x]` Land the primitives package — `packages/primitives` (27 Tier 1 rows over 19
components plus `core/`, `recipe/`, docs, examples and the runtime suites) and
`packages/icons`; the Tier 1 inventory rows in `COMPONENTS.md` now record the real
status, support verdict and limitations instead of `todo`
`[-]` Give `packages/primitives`' test theme fixture the `avatarSize` group —
cancelled: `@gpuixui/tokens` ships `avatarSize` as a fixed scale, not a `Theme`
group, so a hand-built theme needs no change (an avatar diameter is content-sized,
like an image; a new theme group would be a breaking change for every theme
literal)
`[x]` **Native smoke test**: layout, input, focus, overlay and panel primitives in real GPUix — 21/21 scenarios, all 15 capabilities verified on 0.11.0 (see `apps/playground/README.md`)
`[ ]` Land one fully working component running in GPUix
`[x]` Land the docs shell and the component page pattern in Fumadocs — the
sectioned sidebar (Getting Started / Components / Contributing), the reusable
Preview/Code template, the `nub` install block, the "On this page" TOC, the
previous/next pager, and the Button, Dialog, Popover and Tabs pages are deployed
under <https://gpuixui.sudokw.com/docs>
`[x]` Render the package's component docs on the site — `packages/components/docs`
is a second Fumadocs collection mounted at `/docs/components`, so all 39 shipped
components have a page (curated pages win their URL), the sidebar fills them in
after the curated four, search indexes both collections, and `/docs/components`
indexes the section. `docs/preview-strategy.md` records the page template and the
honesty policy; `package-docs.test.ts` guards the frontmatter and MDX rules the
package's Markdown must satisfy
`[x]` Mount the primitive and icon docs too — `packages/primitives/docs` (28
pages) lives at `/docs/primitives` and `packages/icons/docs` at `/docs/icons`,
filling a Primitives sidebar section before Components; the section index links
every page, and `package-docs.test.ts` fails when a `packages/*/docs` directory
is unmounted, when a collection shadows a page outside the curated overrides, or
when a package page breaks the MDX rules. Verified in the dev server:
`/docs/primitives/button`, `/docs/icons/icon`, `/docs/primitives`, and the search
index returns `/docs/primitives/slider`
`[x]` Land the docs platform switch (macOS · Linux · Windows · Default) — the
sidebar switch resolves `platformTheme` from `@gpuixui/tokens`, writes
`?platform=` and remembers the choice; every preview renders on a `PreviewSurface`
that carries the theme's roles, radius and families, and a guard test holds the
preview style sheets to the tokens. `/docs/theming#platform-styles` documents it
`[x]` Land the Blocks and Theme Editor docs surfaces (plan 436) — the
`/docs/blocks` index with Login/Settings recipes and the `/docs/themes` live
token editor, deployed under <https://gpuixui.sudokw.com/docs>
`[x]` Land the Dashboard block and landing window — a `dashboard-01` recipe
composed from `@gpuixui/*` (card, badge, progress, search, icon) with an SVG
chart primitive (bar, donut, stacked bar) labelled as a gap, shown on `/` as the
product window and linked from `/docs/blocks/dashboard`
`[x]` Land the marketing landing page at `/` (plan 434) — Hunter License
identity, stacked-native deck hero, library grid, proof, attribution
`[x]` Deploy the Fumadocs app (landing + getting started) to
<https://gpuixui.sudokw.com> on Cloudflare Workers via the alchemy stack
`[x]` Upgrade GPUix to **0.11.0** and land terminal support (plan 539) — both
`@gpuix/react`/`@gpuix/native` bumped; `KeyEvent`/`boxShadow` type breakages fixed;
the modal Tab trap calls `preventDefault`; the landing gains a "Run it in your
terminal" section (`render(<App/>, { terminal: true })`), the README documents
`isTerminal()` and `GPUIX_TERMINAL=1`, and `installation.mdx` gains the terminal
subsection

### Runtime workstream (`@gpuixui/runtime`)

`[x]` `[██████████]` 3/3

`[x]` Land `@gpuixui/runtime` (plan 438 §2 truth pass) — the capability matrix
(`transform`, `gridSpan`, `canvas`, `imeComposition`, `globalShortcut`, `tray`,
`nativeView` as `supported: false` with a reason + workaround; `terminal`,
`headlessDialog`, `tabNavigation` as `supported: true`), the
`UnsupportedRuntimeFeature` `Schema.TaggedError`, the `isTerminal()` re-export,
and the compile-time guards in `src/guards.ts` that fail TS2578 the moment the
runtime adds a key the matrix claims is absent.
`[x]` Refuse the unrepresentable classes in `@gpuixui/tw` — `transform`,
`rotate-*`, `scale-*`, `translate-*`, `skew-*`, `col-span-*`, `row-span-*`,
`grid-area-*` now return a specific reason naming the gap and workaround instead
of a generic "unknown class".
`[x]` Document the matrix on `/docs/runtime` (table + `isTerminal()` + per-gap
"what to do instead"), linked from the installation page and sidebar.

### Keyboard workstream (`@gpuixui/keyboard`)

`[x]` `[██████████]` 4/4

`[x]` Land `@gpuixui/keyboard` (plan 438 §4) — the strict `Accelerator` grammar
(`parse`/`format`/`formatSymbols`/`serialize` with canonical order, `mod`
platform resolution, and a typed `AcceleratorParseError` naming the offending
token), `fromEvent` capture, exact `match`, the `Keymap` with scope-stack
precedence, the `CommandRegistry` `Context.Service` and `Layer`, and the React
`CommandRegistryProvider`/`useCommandRegistry`. Dependency-light (`effect` +
`@gpuix/react`), schema-first.
`[x]` Lift the accelerator/capture logic out of `packages/components`
(`shortcut/accelerator.ts`, `hotkey/logic.ts`) into the package; `HotkeyRecorder`
and `KeyboardShortcuts` now reuse `@gpuixui/keyboard` with their public APIs
unchanged.
`[x]` Test it: 29 unit tests (parse/format round-trips + exact error text,
modifier exactness, scope precedence with pop-restore, platform formatting,
negative controls); `@gpuixui/components` unit + behaviour suites stay green.
`[x]` Replace the hand-rolled accelerator grammar with `@tanstack/hotkeys@0.17.0`
as the engine (owner's call): delete `accelerator.ts`/`display.ts` and the
`Accelerator`/`AcceleratorParseError`/`Modifier`/`Key` schemas; keep the thin
GPUix adapter (`decodeGpuixEvent`), the scope-stack `Keymap` and the
`CommandRegistry`. Adopt `HotkeySequence` in `Keymap` + a tested
`makeSequenceMatcher` step machine (TanStack's `createSequenceMatcher` is
DOM-typed, so it is not driven without a cast). Recorder captures via
`normalizeHotkey(decodeGpuixEvent(…))` + `hasNonModifierKey`; display via
`formatForDisplay`. 32 unit tests now (decode/match/scope/sequence/format),
`@gpuixui/components` unit (332) + behaviour (452) stay green. Non-test source
643 → 363 LOC; the 459-LOC grammar is now a 68-LOC adapter.

### `@gpuixui/tw` migration (`tw-primitives`)

`[x]` `[██████████]` 3/3

`[x]` Add `@gpuixui/tw` as a `@gpuixui/primitives` dependency and convert the
core primitives — `Button`, `Input`, `Text`, `Stack`, `Grid` (plus `TextArea`'s
shared `fieldChrome`) — onto the Tailwind recipe (`src/recipe/`). Each renders a
`className` recipe compiled through `classesToStyle`, accepts a caller
`className` joined last, and keeps its rendered `StyleDesc` equivalent to the
pre-migration resolver. `recipe.test.ts` proves the equivalence per
variant/size/tone; `MIGRATION.md` records the mapping for the rest. `Grid`
landed with `grid-cols-*` / `grid-rows-*` utilities added to `@gpuixui/tw`'s
built-in table (the runtime's grid is numeric, so spans and arbitrary templates
stay unsupported — `MIGRATION.md` §"The grid").
`[x]` Convert the remaining `packages/primitives/src/components` with the recipe
in `MIGRATION.md` — `Box`, `Label`, `Separator`, `ScrollArea`, `ButtonGroup`,
`Toggle`, `OTPField`, `Select`, `Rating`, `Tooltip` now render through
`recipeTw` (plus `TextArea`, transitively via `fieldChrome`). The components
whose resting appearance is a computed numeric or dynamic value stayed on
their `core/` resolver pending the three-tier model below.
`[x]` Land the three-tier styling model and convert the ten skipped primitives —
`NumberField`, `Checkbox`, `RadioGroup`, `Switch`, `Slider`, `RangeSlider`,
`Meter`, `Progress`, `Spinner`, `Skeleton`. The `@gpuixui/tw` registry now
accepts a `(theme) => number` (square) or typed-shape **derived** utility
(`size-icon-*`, `switch-track-*`, `slider-thumb-*`, `px-inset-*`,
`w-stepper-column`, `h-space-*`) and a compile-time numeric `calc()` (`+ - * /`,
parentheses, `var(--token)` against the numeric scales; percentages, units and
functions rejected through `unsupportedReason`). Every primitive takes a
`className` and a typed `style` prop, merged last, so data (percentage fills,
caller sizes, pulse opacity) flows through `style` while token arithmetic is a
named derived token. `MIGRATION.md` documents the tiers and the merge order;
`recipe/geometry.test.ts` proves the equivalence per variant/size plus the
merge order. Zero primitives remain on their `core/` resolver.
`[x]` Convert `packages/components` onto `@gpuixui/tw` — these may adopt the
shadcn recipes' fixed metrics instead of the primitives' density scale.

`[x]` `[██████████]` 39/39

`[x]` Convert the eight leaf components — `Card`, `Badge`, `Alert`, `Avatar`,
`List`, `Pagination`, `EmptyState`, `Stepper` — onto `@gpuixui/tw`. Each renders
a `className` recipe (`CARD_*`, `BADGE_*`, … in `packages/tw/src/recipes.ts`)
compiled through `classesToStyle` with the **default** registry (shadcn's fixed
metrics), accepts a caller `className` joined last via `cn`, and keeps its
variants/sizes/states and behaviour. `src/recipe/recipe.test.ts` proves the
compiled `StyleDesc` per variant/size, the merge order and a no-unsupported
sweep. The off-grid `label` role adopts `text-sm` (14/20); list rows and stepper
markers keep density (ADR 0006).
`[x]` Convert the fifteen non-overlay Tier 2 components — `Accordion`,
`Breadcrumb`, `Carousel`, `Collapsible`, `Countdown`, `Field`, `Fieldset`,
`Form`, `HotkeyRecorder`, `InlineEdit`, `KeyboardShortcuts`, `MentionInput`,
`SearchInput`, `TagInput`, `Timeline` — onto `@gpuixui/tw` recipes. Each renders
its resting appearance from a recipe (`ACCORDION_*`, `BREADCRUMB_*`, …), accepts
a caller `className` joined last via `cn`, and keeps its variants/sizes/states,
refs, keyboard behaviour and tests. Control geometry (`controlHeight`, list
`rowHeight`) keeps density; everything else compiles from the fixed shadcn
recipe. The recipe oracle per part, the merge-order test and the
no-unsupported-classes sweep all extend `src/recipe/recipe.test.ts`; the
utilities the new recipes need (`flex-wrap`, `self-stretch`, `h-px`/`w-px`,
`mt-`/`mb-`/`ml-`/`mr-`) landed in the default registry. None were skipped.
`[x]` Convert the five overlay components — `Dialog`, `Popover`, `DropdownMenu`,
`ContextMenu`, `CommandMenu` — onto `@gpuixui/tw` recipes. Each surface compiles
its resting appearance from a recipe (`DIALOG_*`, `POPOVER_CONTENT`,
`MENU_CONTENT`/`MENU_*`, `COMMAND_*`), accepts a caller `className` joined last
via `cn`, and keeps its public API, parts, refs, keyboard, focus trap, Escape
layering and dismissal unchanged. The shared composition lives once in
`internal/overlay.ts` (`overlaySurfaceStyle`); the menu surface and rows are
hoisted recipes (`menu/surface.tsx`, `menu/item.tsx`) so Dropdown, Context and
Sub menu agree. The scrim maps shadcn's `bg-black/30` to the theme's `overlay`
role so it stays contrast-aware; the dialog keeps its flex layout and density
height rather than shadcn's `grid`. `recipe.test.ts` proves the compiled
`StyleDesc` per part, the merge order and the no-unsupported sweep;
`behaviour/overlay-layering.test.tsx` proves Escape dismisses a dialog over a
popover over a menu outside-in. The remaining pickers are below.
`[x]` Convert the remaining pickers — confirm-dialog, drawer, navigation-menu,
preview-card, tabs, toast, combobox, date-picker, time-picker, color-picker,
message-scroller — in their own pass. Each renders its resting appearance from a
recipe (`CONFIRM_DIALOG_BUSY`, `DRAWER_*`, `NAVIGATION_MENU_*`,
`PREVIEW_CARD_CONTENT`, `TABS_*`, `TOAST_*`, `COMBOBOX_*`, `DATE_PICKER_*`,
`TIME_PICKER_*`, `COLOR_PICKER_*`, `MESSAGE_SCROLLER_*`), accepts a caller
`className` joined last via `cn`, and keeps its public API, parts, refs,
keyboard/focus/dismissal and scroll/positioning unchanged. The overlays (toast
card, drawer surface/scrim, navigation-menu panel, preview-card surface) reuse
`internal/overlay.ts` (`overlaySurfaceStyle`); the pickers' triggers and list
surfaces compile through recipes while their measured geometry, density height
and scroll stay in `style`. Three utilities the wave needed landed in the
default registry: `border-strong` (the picker triggers' strong edge),
`items-end`, and `justify-start`. `recipe.test.ts` proves the compiled
`StyleDesc` per part, the merge order and the no-unsupported sweep. None were
skipped; the whole `packages/components` package is now on `@gpuixui/tw`
(39/39).

### Design tokens and theming (`tokens-theme`)

`[x]` `[█████████░]` 26/30

`[x]` Write and index the tokens/theme plan set (plans 010–019 and 051)
`[x]` Implement `packages/tokens`: semantic colour roles, typography, spacing,
radii, density, elevation, light + dark themes
`[x]` Implement the theme extension mechanism (`createTheme`/`extendTheme`) and
the `@gpuixui/tokens/react` provider
`[x]` Add high-contrast (AAA) light and dark themes (`getTheme(mode, "high")`)
`[x]` Add status tone roles plus `alpha` and `statusTone` helpers
`[x]` Expose `colorRoles` for the docs site's generated token tables
`[x]` Make `@gpuixui/tokens` resolvable from source so a clean checkout needs no
prebuilt `dist` (plan 016)
`[x]` Ship `focusRing(theme)` and correct the focus claims in `docs/tokens.md` and
`docs/design-system.md` — GPUix 0.10.0 (then pinned) had no `outline*` and no
`focusVisible` (plan 017)
`[x]` Ship the keyboard-only ring (plan 053): `keyboardFocusRing(theme)` returns
the runtime's `focusVisible` outline (width `borderWidth.strong`, colour the
`ring` role, offset 0), applied at rest so a Tab paints it and a click does not.
The probe measured that `focusVisible` does **not** paint for a programmatic
focus before any keyboard input, so `focusRing(theme)` stays the unconditional
shadow for a mouse-opened overlay; both are documented with the evidence, and
`focus.test.ts` guards the split. Component adoption is the interlock row below
`[~]` Truth pass on the remaining `0.10.0` claims outside this workstream —
**primitives half done**: every ring claim in `packages/primitives/docs` and its
inventory rows now names `focusVisible`, and `COMPONENTS.md`'s Tier 1 rows no
longer say a press paints the ring; the components package's comments and rows
still claim the old absence (owner: components; plan 053 §Why lists the evidence)
`[x]` Drop `BoxShadow.inset`, document the one-shadow rule and hoist
`elevationShadow(theme, level)` (plan 018)
`[x]` Write `docs/tokens.md` (every token + extension API)
`[x]` Write `docs/design-system.md` (identity, roles, state, accessibility)
`[x]` Add platform type styles and `platformTheme(theme, platform)` for the docs
platform toggle (plan 051)
`[x]` Widen the platform styles past type: `platformStyles` carries a radius
scale, a density preset and per-mode chrome roles (background, surfaces, borders,
primary, ring, accent, selected, placeholder) per macOS / Linux / Windows, and
`platformTheme` applies them, so the docs switch repaints, re-shapes and re-types
rather than only re-typing. `default` stays the library identity; a
high-contrast base keeps its palette (families/radii/density only), recorded by
`Theme.contrast`. All six platform themes run the contrast contract
`platforms.test.ts`, and `platforms.example.ts` shows editing one. Docs in
`docs/tokens.md` §Platform styles and `docs/design-system.md` §5
`[x]` Ship the contrast contract as public API — `contrastRatio` (WCAG 2.1,
`undefined` rather than a guess for a translucent colour), `contrastFloors`,
`highContrastFloors`, `contrastPairs` and `contrastFailures(theme, floors?)`
(which reports every missed pair, including one it cannot measure); the colour and
platform tests read the same table, so a brand can run the check its theme must
pass. 9 contract tests + docs
`[x]` Add the design-system rows to `COMPONENTS.md`
`[x]` Add `avatarSize` (20/26/32/40) so the Avatar component drops its local
diameter table; a fixed scale, not a theme group
`[x]` Ship `blend`, `filledHover` and `filledPressed` — opaque derived action
fills instead of six stored hover/press roles, with the label contrast floors
checked on both fills
`[-]` Add motion tokens (durations/easings) to `@gpuixui/tokens` — cancelled:
`@gpuixui/motion` is the package that owns easing curves, spring presets, stagger
and reduced-motion policy, so a second copy here would be the duplication the
boundaries forbid. A component reads motion from `@gpuixui/motion` and keeps
colour/type/space/radius from this package
`[x]` Ship `registerFonts` (plan 052) — consumer-only: installs a font file's
bytes in a renderer, is idempotent per renderer and per file, does not cache a
rejected file, and returns the families a theme may name; 6 tests, docs and a
README example. No family is bundled, so there is no licence review yet
`[ ]` Native proof that a registered face paints — needs a window; owner:
playground. The live window runner now exists (`--only focus-visible` green on
0.11.0), so the probe is the remaining work; plan 052 stays `blocked` on the
visual half
`[x]` Cross-team: native theme gallery in `apps/playground` — `theme-color-roles`,
`theme-type-and-shadow` and `theme-platform` read the runtime's style report;
21/21 green on 0.11.0 (owner: `playground`)
`[x]` Cross-team: Fumadocs Theming page from `docs/tokens.md` and the
docs platform toggle (macOS / Linux / Windows / Default) built on
`platformTypes` + `platformTheme` (owner: `docs-site`) — landed: the switch and
the resolved `platformStyles` are on `/docs/theming#platform-styles`, and the
inventory row records the guard tests; ignore the `references`
**symlink** — a `references/` rule does not match a symlink, so every worktree
shows it as untracked (owner: repo tooling; `packages/README.md` already lists
`tokens`)
`[x]` Components consume `@gpuixui/tokens` directly: the local `withAlpha`,
`focusRing`, `elevation` and hand-mixed `tone` palette are gone; `internal/theme.ts`
re-exports the token helpers and keeps only the `danger` → `destructive` mapping
(plan 157)
`[x]` Cross-team: `primitives` still carries its local focus-ring and
first-shadow helpers (`primitives/src/core/style.ts`) — **resolved**: `style.ts`
already resolved the ring and elevation through `@gpuixui/tokens`; the last copy
(`core/selection.ts`) now calls `focusRing(theme).boxShadow` too, and
`core/theme.test.ts` scans the package source to keep the row geometry defined
once (owner: primitives; plan 157 records the components half)
`[x]` Components carry no structural copy of `@gpuixui/tokens` and import the
package directly (plan 157)
`[x]` Tokens' `src/react.tsx` is compiled inside the components program when
tokens resolves from source; the isolated linker puts `@gpuix/react` only under
`packages/components/node_modules`, so components' `tsconfig.json` mapped the JSX
runtime to its own dependency. **Fixed tokens-side** with the
`/** @jsxImportSource react */` pragma (no new dependency, no lockfile change):
the entry now compiles under any consumer's `jsxImportSource`. Proven both ways —
without the pragma a program with `jsxImportSource: "@gpuix/react"` and no path
mapping fails TS2875; with it, it compiles. `react.test.tsx` guards the pragma.
The components workstream can now delete its `paths` mapping (interlock row).
`[x]` Promote the workstream to `main`: plans 010–019 and 051, `packages/tokens`
and the union plan index are on `main` (commit `458fe10`); `main` now compiles
`@gpuixui/tokens` from source, so `primitives`, `components` and `docs-site` can
merge it and drop their structural copies
`[-]` Merge `main` into `agent/tokens-theme` once plan 019 (motion tokens) lands
there — cancelled: plan 019's subject moved to `@gpuixui/motion`, and this
workstream now lands on `master` directly, so there is nothing to merge. The
`agent/tokens-theme` / `agent/tokens-platform` branches are historical (they were
a workaround for two live sessions sharing one worktree; see
`.agents/slop/blockers/2026-10-17-concurrent-tokens-writers.md`)

### Playground and native smoke (`apps/playground`, `packages/testing`)

`[x]` `[███████░░░]` 7/9

`[x]` Rebuild the 0.11.0 `darwin-x64` binding from the pinned upstream revision
      (B1 re-opened by the version bump): `build-native-binding.sh` now fetches
      the release commit the package installs instead of copying the lagging
      reference clone, so a binding always matches the napi surface
      (`GPUIX_REV` overrides the pin). Built and installed 2026-10-21; 21/21
      headless scenarios green.
`[x]` Land `theme-platform` — each `platformTheme` mono family reaches the
      runtime and the three platforms name three distinct faces while keeping
      the system-UI sans sentinel (headless, `--only theme-platform`).
`[x]` Make `--only` repeatable in both runners (the swarm's verification
      instructions use it) and reject every unknown id by name.
`[x]` Land the **live window runner** — `apps/playground/src/live/` drives a real
      window through `@gpuix/native/automation`, reports through the same
      `Smoke` model/exit codes (`0/1/2`), and captures one PNG per paint state.
      `packages/testing` gained `AsyncSmokeHost` + `runAsyncScenarios` over the
      shared check model (5 tests; the errored-not-passed test fails without the
      defect handler).
`[x]` Land the `focus-visible` live probe (plan `053` STOP gate): measured that
      the ring **paints** for Tab, does **not** paint for a mouse press or for a
      programmatic focus before any keyboard input, and that a programmatic
      focus after a Tab does paint it; `keyboardFocusDim` tracks the same state.
      Evidence: `.artifacts/live/focus-visible*.png` + README table.
`[x]` Assert the live captures with pixels — `@gpuixui/testing`'s `Pixels`
      decodes the PNG (inflate injected) and `countColour` reads exact colours;
      the probe asserts no ring for the press/traversal/programmatic states and
      a ring after Tab. Negative control: a wrong ring colour fails
      `Tab paints the focus ring` with exit `1`. 8 decoder tests.
`[x]` Probe 053's remaining question — `keyboard-focus-dim` (live) measured that
      `keyboardFocusDim` is on by default, dims every other focusable (fill and
      text) while one has keyboard focus, and that `keyboardFocusDim: false`
      opts an element out; the probe asserts the fill-pixel count drops by one
      sample, so a whole-window dim fails. Evidence: `.artifacts/live/keyboard.png`
      + README table. No component needs to undo it; one that draws its own
      ring opts out per element.
`[ ]` Port the modal/menu/toast Tier 2 examples into live probes (the headless
      scenarios already cover the primitives)
`[ ]` Frame the live runner as a release gate before release

## Phase C — Tier 1–2 components

`[x]` `[██████████]` 3/3

`[x]` Tier 1 foundational components (code + test + example + docs + inventory):
      all 19 components have code, tests, a runtime-verified interaction, an
      in-package docs page, a mounted example and an inventory row;
      `packages/primitives/src/inventory.test.ts` holds the 27
      `COMPONENTS.md` rows to the code, so that table cannot drift again;
      their pages now render on the site at `/docs/primitives/<name>` (and the
      icon page at `/docs/icons/icon`), linked from the Primitives section index
`[x]` Tier 2 composition/feedback components (same bar)
  - [x] Write and index the Tier 2 plan set (plans 110–119)
  - [x] `packages/components` package, token/primitives adapters, native test harness
    - [x] Package scaffold (package.json, tsconfig, vitest config, README)
    - [x] `internal/collection.ts` (index arithmetic), `internal/key.ts` (key predicates)
    - [x] `internal/theme.ts` adapter over the landed token API (plan 110 §6) — the tokens workstream is merged into this branch
    - [x] `runtime.test.tsx` — the renderer guard (plan 117 §5b): a lifted dynamic import decides `available` / `unsupported-host` / `missing`, and fails on a supported host. Proven to fail by adding this host to `supportedHosts`.
    - [x] `internal/test-root.tsx` (`renderComponent`) — renders under a theme; runs here now that the native binding loads
    - [x] `internal/a11y.ts` — the accessibility dump normalised for assertions (role case, `value` vs `label`)
    - [x] Behaviour suites under a second config (`src/behaviour/`, `test:behaviour`): a static GPUix import fails to *load* on an unsupported host, so `describe.skipIf` cannot gate them (plan 117 §5a/§5c). **The split stays**: the suites now run here, on hosts with a binding
  - [x] Foundation parts: Card, Badge, Avatar, Alert, EmptyState, List (plan 111)
    - [x] `internal/collection.ts` (List single-selection core, shared with Tabs/menus)
    - [x] Card: `src/card.tsx`, behaviour suite, example, docs page, inventory record — **verified natively** (5/5, `nub run --filter @gpuixui/components test:behaviour`)
    - [x] Badge: `src/badge.tsx` + `toneSurface` in the theme seam, behaviour suite (7/7), example, docs page, inventory record
    - [x] Avatar: `src/avatar.tsx` + `src/avatar/logic.ts` (unicode-safe initials), behaviour suite (7/7) + logic suite (8), example, docs page, inventory record
    - [x] Alert: `src/alert.tsx`, behaviour suite (10/10, real click + keyboard), example, docs page, inventory record — the dismiss control is `internal/button.tsx`
    - [x] Local button stand-in: `src/internal/button.tsx` (`Button`, `IconButton`), behaviour suite (9/9); plan 110 §7 amended
    - [x] EmptyState: `src/empty-state.tsx`, behaviour suite (6/6), example, docs page, inventory record
    - [x] List / ListItem: `src/list.tsx` over `internal/collection.ts`, behaviour suite (12/12: real focus, wrap over disabled rows, controlled), example, docs page, inventory record
  - [x] Overlays: Dialog, Confirmation dialog, Popover
    - [x] Plan 112 §1/§1b re-measured against 0.10.0 and corrected: there is **no** `Dialog`, `DismissableLayer`, `pushDismissLayer` or `anchored fill="window"`, so the overlays are local implementations over host elements
    - [x] Plan 112 §1b's five overlay probes answered and recorded in plan 112 §1c — the veil must be an `<anchored position={{x:0,y:0}}>`, because `position:"absolute"` resolves against the mount parent; `focusNextWithin` wraps; a focused `tabIndex={-1}` node receives keys
    - [x] `internal/dismiss-layer.ts` (topmost-layer-wins, one event consumes one layer) + `dialog.tsx` (+ 5 logic tests, 12 native behaviour tests)
    - [x] `confirm-dialog.tsx` — Cancel-first, caller-owned close, loading locks both dismissals (+ 5 native behaviour tests)
    - [x] `popover.tsx` — `FloatingLayer` anchoring, Escape restores focus, Tab/outside press do not, mouse-down re-open guard (+ 8 native behaviour tests, both themes)
    - [x] Examples, docs pages and inventory rows for Dialog, Confirmation dialog and Popover
    - [x] Plans 112/113 reference `keyboardFocusDim` and `focusVisible`, which 0.10.0's `StyleDesc` does not have — corrected in the plans before any overlay style was written
    - [x] `StyleDesc` has per-side border *widths* but a single `borderColor`; a separator that needs its own colour uses a 1px `div` or `borderColor` (as `CardFooter` does). Plan 111's footer row uses `borderColor`.
    - [x] Plan 112's `DialogContent` names the surface through `aria-label` only (0.10.0 has no `aria-labelledby`; verified in `AnchoredProps`/`HostProps`)
  - [x] Disclosure and navigation: Tabs, Accordion, Collapsible, Breadcrumb, Pagination (plan 113)
    - [x] Logic: `accordion/logic.ts`, `breadcrumb/logic.ts`, `pagination/logic.ts`, `tabs/logic.ts`
    - [x] `tabs.tsx` + 8 native behaviour tests (automatic/manual activation, wrap, disabled, controlled)
    - [x] `collapsible.tsx` + 4 native behaviour tests (unmounts while closed, Enter/Space, controlled)
    - [x] `accordion.tsx` + 8 native behaviour tests (single/multiple, collapsible, disabled, null close)
    - [x] `breadcrumb.tsx` + 5 native behaviour tests (collapse keeps the ends, separators follow their item)
    - [x] `pagination.tsx` + 8 native behaviour tests (edges, current page no-op, both themes)
    - [x] Examples, docs pages and inventory rows for all five
  - [x] Menus: Dropdown, Context, Command (plan 114)
    - [x] Logic: `menu/logic.ts` over the shared collection
    - [x] `menu/state.ts` + `menu/item.tsx` + `menu/surface.tsx` (the shared row registry, highlight-follows-focus, menu keyboard rules)
    - [x] `dropdown-menu.tsx`, behaviour suite (9/9), example, docs page, inventory row
    - [x] `context-menu.tsx` on `onAuxClick` + `isRightClick` and an `anchored` surface at the pointer (6/6), example, docs, inventory
    - [x] `command-menu.tsx` composing Dialog + the shared row look; input keeps focus, Enter arrives as `submit` (8/8), example, docs, inventory
  - [x] Choice inputs: Search input, Combobox (plan 116)
    - [x] Logic: `combobox/logic.ts` (ranking + selection)
    - [x] `search-input.tsx` + 6 native behaviour tests (typing, clear + focus, Enter, Escape once, controlled)
    - [x] `combobox.tsx` wrapping GPUix's headless combobox with pre-ranked items; 10 native behaviour tests (ranking, value payload, single/multiple, disabled, Escape)
    - [x] Examples, docs pages and inventory rows for both
  - [x] Feedback: Toast system, inline validation (`Field`)
    - [x] `toast/model.ts` + test (the `ToastInput` boundary type and the queued `Toast`)
    - [x] `toast/store.ts` + test (queue, monotonic ids, `FiberMap` timers, `TestClock`)
    - [x] `validation/logic.ts` + test (`validate` / `validateAll` over schema issues)
    - [x] `toast/provider.tsx` + `viewport.tsx` + `toast.tsx` (ManagedRuntime boundary, `useToast`, viewport) + 7 native behaviour tests
    - [x] `field.tsx` (Field/FieldLabel/FieldDescription/FieldError/FieldInput) + 5 native behaviour tests
    - [x] Examples, docs pages and inventory rows for Toast and Field
  - [x] Date / time picker (plan 119) — the day picker is done; a time picker is documented as out of scope
  - [x] Tier 2 verification matrix and inventory sync check (plan 117)
    - [x] `src/inventory.ts` + `src/inventory.test.ts`: files exist, rows agree, no duplicates, `done` implies a behaviour test
    - [x] `src/behaviour/theme-matrix.test.tsx`: the both-theme matrix for the 11 components without one
    - [x] Six records corrected from `gpuixSupport: "yes"` to `partial` where the runtime lacks the ARIA surface or a keyboard path
  - Tier 2 hardening after the inventory closed (plans 120+)
    - [x] List multiple selection (`selectionMode="multiple"`, modifiers, range) and the duplicate `COMPONENTS.md` row — plan 120
    - [x] Accordion arrow/Home/End movement between headers — plan 121
    - [x] Context menu Shift+F10 opening and focus return — plan 122
    - [x] Toast pause-on-hover with remaining-time resume — plan 123
    - [x] Toast hold on keyboard focus, composed with hover — plan 124
    - [x] List select-all (`Cmd`/`Ctrl`+A) over enabled rows — plan 125
    - [x] Dropdown menu keyboard opening lands on the first/last row — plan 126
    - [x] Date picker `min`/`max` bounds and a clear action — plan 127
    - [x] Trigger parts merge the caller's ref with their internal one (found by plan 127)
    - [x] Every part that owns a ref composes the caller's too — plan 128
    - [x] Menu type-ahead (`DropdownMenu`/`ContextMenu`) — plan 129
    - [x] List type-ahead over the shared type-ahead core — plan 130
    - [x] Dropdown menu submenus — plan 131
    - [x] Time picker, the time half of the date/time item — plan 132
    - [x] Command menu fuzzy matching and in-group ranking — plan 133
    - [x] List row activation on Enter and click — plan 134
    - [x] Submenu pointer activation and ContextMenu submenus — plan 135
    - [x] SearchInput ref and TabsTrigger onBlur forwarding — plan 136
    - [x] ListItem caller `onClick` forwarding — plan 137
    - [x] Combobox pointer selection coverage — plan 138
    - [x] Inventory test counts and the drifted rows — plan 139
    - [x] Tabs vertical orientation verified: axis keys, layout and manual activation — plan 321
    - [x] Toast actions: one labelled action with a provider-owned handler — plan 322
    - [x] Floating placement truth: compensate `align="center"` from the measured
      panel and flip a snapped surface off its trigger — plan 323 (evidence:
      plan 156 §8; `PopoverContent`/`DropdownMenuContent` promised a runtime
      flip that 0.10.0 does not provide)
    - [x] Cross-team: handle the playground's measured floating defects
      (`align="center"` off by half the panel; `fit="snap"` clamping over the
      trigger) in `PopoverContent`, `DropdownMenuContent` and
      `ComboboxContent` — plan 323; 6 new native tests, both-direction proof
  - Reference adoption
    - [x] 200 — adopt `base-gpui`'s compound-part contract as the Tier 1–2 API spec: `docs/component-api.md`, ADR 0004, `LICENSES/base-gpui.md`, `PLAN.md` D25 and a contract check in `inventory.test.ts` (plan 200; proven to fail by changing one translation row)
    - [x] 201 (components half) — `core/runtime.ts` (`createRuntime`: initial/reduce/query/run), its pure test, the `docs/component-api.md` §7 state-model section, ADR 0005 and PLAN.md D26 (plan 201; both-direction proof: deleting the select branch fails the fold test)
    - [x] 201 (shared helper) — `packages/testing/src/state.ts` + its test
      (`runCommands` over a runtime), so suites outside `packages/components`
      replay commands (owner: playground; this package's `runtime.run` is the
      same fold). 3 tests; both-direction proof (skipping the fold fails the
      state/query check).
    - [x] Split Alert into parts — `Alert`, `AlertIcon`, `AlertContent`, `AlertTitle`, `AlertDescription`, `AlertDismiss` over a tone context; 11 native tests; docs, example and API table updated (plan 158)
    - [x] Split the remaining landed deviations named in `docs/component-api.md` §9 into parts — each with its own behaviour test, docs update and inventory row (owner: components). Plans 300–303 are landed.
      - [x] Pagination parts — plan 300
      - [x] CommandMenu parts — plan 301
      - [x] Combobox parts — plan 302
      - [x] DatePicker + TimePicker parts — plan 303
    - [x] Typed-by-position children — plan 304: `PartChildren` (elements/conditionals, never text) plus a family-scoped render check on 32 parents; part identity cannot be a compile error in React 19's JSX types, recorded in `docs/component-api.md` §1 (owner: components)
    - [x] Expose `style` as `StateStyle<PartState>` on the interactive parts — plan 305: 11 parts with exported state types; button-shaped triggers stay on the local stand-in until `@gpuixui/primitives` owns it (owner: components)
    - [ ] `packages/primitives` adopts the same contract for Tier 1 (a parts table row is the spec; the package is owned by primitives) — plan `040`, nine ordered steps; runtime verification waits on B1
  - Tier 2 gap rows (plan 205; each row gets its own plan before implementation)
    - [x] Write and index plans 309–320 for the twelve remaining gap rows
    - [x] Fieldset — plan 306: groups fields, propagates `disabled` to `FieldInput` (7 native tests; both-direction proof)
    - [x] Stepper — plan 307: read-only multi-step indicator, statuses derived from `value` (8 native tests; both-direction proof)
    - [x] Form — plan 308: owned-value schema validation, one alert summary, decoded `onSubmit`, pending guard (7 native tests; both-direction proof)
    - [x] Drawer — plan 309: 10 native tests; the modal rules extracted from Dialog, whose 18 tests re-pass
    - [x] Keyboard shortcuts / keycap display — plan 310 (owns the accelerator model): 10 accelerator tests + 6 native tests; both-direction proof
    - [x] Timeline — plan 311: 6 native tests; both-direction proof
    - [x] Countdown — plan 312: 9 formatting tests + 5 native tests
    - [x] Inline edit — plan 313: 8 native tests; both-direction proof
    - [x] Tag / token input — plan 314: 10 rule + 8 native tests; both-direction proof
    - [x] Carousel — plan 315: 8 native tests; both-direction proof
    - [x] Hotkey-recorder input — plan 316 (consumes plan 310): 8 capture + 8 native tests; both-direction proof
    - [x] Preview Card — plan 317: 8 native tests; delay, pointer travel and Escape proven
    - [x] Color picker — plan 318 (discrete swatches: 0.10.0 has no gradients): 8 hex + 8 native tests; both-direction proof
    - [x] Mention input — plan 319: 12 rule + 9 native tests; both-direction proof
    - [x] Navigation Menu — plan 320: 6 parts, 10 native tests; both-direction proof
    - [x] Message scroller — plan 206: pinned follow over a 1px tail sentinel, no yank when scrolled up, unread count, jump-to-latest, streamed growth; 11 rule + 10 native tests + 1 theme-matrix case; both-direction proof (behaviour 437, unit 296). Non-virtualized viewport recorded as the limitation (`<virtual-list>` takes an item count, not compound children)
    - [x] Tier 2 gap cluster complete: all twelve landed with code, a native test, an example, a docs page and an inventory row; after plan 206 the suite is behaviour 437, unit 296
`[x]` Verify every component in both themes

## Blockers (project-level, with evidence)

`[x]` **The GPUix native runtime now loads on this machine, so the Tier 2 behaviour
suites run here.** Resolved 2026-10-17 08:57 by plan `140` (playground workstream):
`@gpuix/native@0.10.0` publishes no `darwin-x64` binary, so the pinned source was
built locally with `gpui_macos/runtime_shaders` (which removes the build-time
`xcrun metal` dependency) and the resulting `gpuix-native.darwin-x64.node` is in
the store, hard-linked across worktrees. Verified from `packages/components`:
`nub run --filter @gpuixui/components test:behaviour` runs the real
`TestRenderer` and Card's suite passes 5/5.

Evidence, 2026-10-17 (the failure this replaced): `uname -m` → `x86_64`;
`@gpuix/native@0.10.0` published only `-darwin-arm64`, `-linux-x64-gnu`,
`-win32-x64-msvc`; loading it failed with `mach-o file, but is an incompatible
architecture (have 'arm64', need 'x86_64')`.

Still true and worth remembering:

- The `wasm` build exports only `GpuixRenderer`, not `TestGpuixRenderer`.
- The binding is a **locally built artifact**, not a published one: a clean
  `nub install` on a bare host still has none, so the behaviour suites stay out
  of the default `test` run (plan 117 §5a–§5c) and a host without a binding
  reports `unsupported-host` from `src/runtime.test.tsx`.
- On an Apple-silicon Mac, Linux x64 or Windows x64 the published binding works
  with no local build.

`[x]` **nub's isolated linker does not install optional platform binaries of
transitive dependencies.** `@gpuix/native-darwin-arm64` (an optional dependency
of `@gpuix/native`) was absent from the store entry; `nub install --node-linker
hoisted` links it. Superseded on this host: the store now carries a locally built
`darwin-x64` binding (first entry above), hard-linked across worktrees.

`[x]` **Two sessions wrote this worktree at once — B3, resolved 2026-10-17
08:56.** Root cause and permanent fix: plan `022-swarm-single-writer.md`
(primitives worktree). Measurement for this worktree: plan
`118-single-writer-components.md`, which also records the resolution: the stale
turn `ses_eb7f09666ffeRRbJxPz0d344Cw` (07:12) committed and pushed everything it
produced and stood down, because the rotating `run-components.sh` turn is the one
the supervisor can see and replace. Re-verified at 08:56 and again at 09:00: the
`session_v2` count is `1`, and the tree is clean apart from the untracked
`nub.lock` and `references` symlink. The permanent fix — pinning `--session` and
teaching `agent_alive` to count live server-side sessions (plan 022 §5) — is
still the coordinator's, in `scripts/`.

`[!]` **`@gpuix/react@0.10.0` (the latest published release) is far behind the
reference clone in `~/GPUIXUI/references/gpuix`.** Verified against the installed
package, 2026-10-17:

| Surface | Reference clone | installed 0.10.0 |
| ------- | --------------- | ---------------- |
| `KeyEvent` type, `preventDefault`, `defaultPrevented` | yes | **no** — handlers receive `EventPayload` |
| `Button`, `buttonProps` | yes | **no** |
| `Dialog` + parts, `DialogPortal/Backdrop/Popup` | yes | **no** |
| `DismissableLayer`, `pushDismissLayer`, layer stack, focus restore | yes | **no** |
| `FloatingLayer`, `renderSlot`, `useControllableState`, `mergeStyles` | yes | yes, via `@gpuix/react/floating` |
| `Select` + parts, `Combobox` + parts, `Tooltip` + parts | yes | yes |
| `motion`, `AnimatePresence` | yes | yes |
| WASM build exports `TestGpuixRenderer` | no | no |

Consequences for Tier 2: Escape dismissal, layer stacking, focus-in/out and
Tab trapping must be implemented in this package on top of `renderer.focusElement`
/ `focusNextWithin` / `focusPreviousWithin` and element-level `onKeyDown`, instead
of relying on the clone's `DismissableLayer`. `Button`/`buttonProps` and
`Dialog` parts must be equivalent local implementations over `<div>` + host props
until `packages/primitives` and a newer `@gpuix/react` land. Plans 110 §1/§7 and
112/114 have been corrected for this.

Related: the reference clone must not be treated as the API of the pinned
dependency anywhere in this repo, and `package.json` pins must stay explicit.

`[!]` **Two sessions write this worktree at once — B3, still live** (measured
2026-10-17 08:47). Root cause and permanent fix: plan
`022-swarm-single-writer.md` (primitives worktree). Measurement for this
worktree: plan `118-single-writer-components.md`. Two live top-level sessions
hold `workspaces/components` at the same time —
`ses_eb7f09666ffeRRbJxPz0d344Cw` (07:12:12, a stale turn from an earlier tick)
and `ses_eb7a7c3edffeSehcVqeqHJEsYa` (08:31:44, the current `run-components.sh`
turn). `run-components.sh` starts a new `opencode run` session every iteration
and does not own the turn, so a turn that outlives its CLI call keeps writing
while the loop starts another on top of it; `agent_alive` only checks the runner
pid, so the supervisor cannot see the duplicate. Between 08:40 and 08:47 the tree
gained `card.tsx`, `behaviour/card.test.tsx`, `docs/card.mdx`,
`examples/card.example.tsx` and the commits `7786193`, `f424b1e`, `ab000ab` —
none authored by the supervisor's session. **Response:** this workstream stopped
writing component code the moment the duplicate was confirmed, restoring the
one-writer invariant; the one clean non-overlapping commit (`22f706c`, the
status-tone palette) is preserved. No session was deleted — that is the
coordinator's call and would discard the stale session's in-flight work (plan
022 §4/§7). Resume `packages/components` only when the plan 118 §5 check prints
`1` twice. **Re-measured 08:54:** the pair rotates — `ses_eb7a7c3e…` went idle and
`ses_eb795d97…` took its place while the stale turn stayed live — so the count
stays `2` and the condition **cannot** be met by agent discipline; it needs plan
022 §5's pinned-session fix (coordinator, `scripts/`). Component code stays
paused on a green, pushed `HEAD`; plan 118 carries the measurement.

## Interlocks (cross-workstream dependencies)

Work that this workstream needs but does not own. Another agent owns each row.

| Need | Owner | Status |
| ---- | ----- | ------ |
| `@gpuixui/tokens` roles in plan 110 §6 | tokens-theme | **resolved** — the workstream is merged into `agent/components`; `internal/theme.ts` is the seam over it |
| Serialise writers per worktree: a second live session writes `packages/components` alongside the supervisor's; root cause in plan `022` (primitives), this worktree's measurement in plan `118` | repo tooling (`scripts/`) | **resolved in this worktree** 2026-10-17 (the stale turn stood down; the tree has read one writer since); the permanent `scripts/` fix (plan 022 §5) is still pending |
| Decide the GPUix version: stay on 0.10.0 and implement dismiss layers/focus locally, or ship a release that includes `Dialog`/`Button`/`DismissableLayer` (0.10.0 is the latest published) | owner / playground | **resolved** — 0.11.0 adopted (plan 539); the library keeps its styled compound Dialog rather than wrapping the headless `@gpuix/react/dialog` (documented in `dialog.tsx`) |
| Soft tone pair per status (`info`, `infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft` + readable foregrounds) | tokens-theme | **resolved** — landed on `main`; `internal/theme.ts` consumes `statusTone` (plan 157) |
| `alpha(color, amount)` helper | tokens-theme | **resolved** — landed on `main`; the local `withAlpha` is deleted (plan 157) |
| An `info` status role so Alert/Badge/Toast stop borrowing `accent` | tokens-theme | **resolved** — `infoSoft`/`infoSoftForeground` are the tone's roles (plan 157) |
| `@gpuixui/tokens`' React file compiles with this package's `jsxImportSource`; tokens cannot resolve `@gpuix/react` under the isolated linker | tokens-theme | **resolved tokens-side** — `react.tsx` carries `/** @jsxImportSource react */`, so the entry pins React's runtime wherever it is compiled (proof: a program with `jsxImportSource: "@gpuix/react"` and no path mapping fails TS2875 without it and compiles with it). **components:** delete the `jsx-runtime` `paths` mapping in `packages/components/tsconfig.json`, then this row closes |
| `packages/testing/src/state.ts` + test: `runCommands(runtime, commands)` for suites outside this package (plan 201) | playground | **resolved** — `State.runCommands` replays a runtime's commands and queries the final state (3 tests) |
| An avatar diameter scale (20/26/32/40) so `DIAMETER` in `avatar.tsx` can be deleted | tokens-theme | **resolved** — `avatarSize` is exported from `@gpuixui/tokens`; fixed, not a `Theme` group (a new group breaks hand-built theme literals). Avatar can drop `DIAMETER` |
| Platform style variants wider than typography (colour, radius, density per macOS/Linux/Windows) so the docs switch visibly repaints, not only re-types | tokens-theme | **resolved** — `platformTheme` applies the platform palette, radius and density; the docs bridge now publishes the control heights and paddings as CSS variables, so the preview controls resize too (macOS 28 / Linux 36 / Windows 32px at `md`), verified live on `/docs/components/button?platform=darwin|linux|win32|default` |
| `@gpuixui/primitives` exports in plan 110 §7 | primitives | pending — **blocking nothing meanwhile**: `internal/button.tsx` is the local `Button`/`IconButton` stand-in (plan 110 §7 amendment), to be deleted when the package lands |
| A `primaryHover` / `destructiveHover` role pair so filled buttons stop using a half-alpha fill for hover | tokens-theme | **resolved without the pair** — `filledHover(theme, action)` / `filledPressed(theme, action)` derive an opaque fill from the action role and the theme's `foreground`, so a brand override follows automatically and the six roles are unnecessary; adoption is the row below |
| Adopt `filledHover` / `filledPressed` and delete the half-alpha hover fills: `components/src/internal/button.tsx`, `primitives/src/core/variants.ts` (`filled`), and the checkbox/radio hover fills in `primitives/src/core/selection.ts` (via `blend`, whose role there is not one of the three actions) | components, primitives | pending — **blocked on `@gpuixui/tw`**: the resting appearance of every migrated primitive is a class recipe, and the hover is still `hover:bg-primary/90` in `packages/tw/src/recipes.ts`, so changing the core resolver alone breaks `src/recipe/recipe.test.ts` and `src/recipe/geometry.test.ts` (measured: 4 failures). The adoptable order is (1) a derived opaque-fill utility in `@gpuixui/tw` — `hover:fill-primary`/`active:fill-primary` resolving through `filledHover`/`filledPressed` — (2) the recipes, (3) the core resolvers and their tests, all in one change; `Toggle`'s pressed accent also needs a general-role helper (accent is not one of the three `FilledAction` roles) |
| The docs theme editor (`/docs/themes`) could show a live contrast readout while a reader edits a role — `contrastRatio` / `contrastFailures` are public and cover the 24 pairs the library itself is tested on | docs-site | **resolved** — `contrastReport`/`formatContrastFailure` in `theme-editor-logic.ts` run `contrastFailures` on the resolved edit; the editor shows a `role="status"` readout under the preview naming each failing pair with its measured ratio and floor, and reporting an unmeasurable (translucent) pair instead of counting it as passed. 3 tests: built-ins pass, a broken primary pair reads `1.00:1 (needs 4.5:1)`, a translucent ring reads `unmeasurable`. Documented on `/docs/themes#contrast` |
| The docs previews should show a platform's control geometry too — `toCssVars` publishes `--radius`, the families and every colour role, but not density, so the `compact`/`spacious` half of `platformTheme` is invisible in a browser preview | docs-site | **resolved** — `toCssVars` now publishes `--control-height-{sm,md,lg}` and `--control-padding-x-{sm,md,lg}`, `.gx-demo` defaults them to `themes.dark`'s comfortable density, and `.gx-btn*`, `.gx-field` and `.gx-tab` take their geometry from them. `theme-css.test.ts` holds the bridge, the defaults and the consumed rules, and asserts macOS 28 / Linux 36 / Windows 32px for `--control-height-md`. Verified in the dev server on `/docs/components/button?platform=`; no `--row-height` until a list/table preview exists |
| Playground mounts the Tier 2 examples and runs a dialog/menu/toast smoke | playground | pending |
| Native proof that `registerFonts` paints the registered face: register a face in the theme gallery and show the fallback and the intended face | playground | pending — `@gpuixui/tokens` side is shipped and unit-tested |
| Probe that `focusVisible` paints after Tab and not after a mouse press (and on programmatic focus in a dialog) — plan 053's STOP gate | playground | **resolved** — the `focus-visible` live probe measured all five states on 0.11.0 (`apps/playground/README.md` §`focus-visible`): Tab paints the outline and dims other focusables; a mouse press, a native traversal and a programmatic focus before any key paint nothing; a programmatic focus after a Tab paints it. The tokens half shipped `keyboardFocusRing`; adoption is the row below |
| Adopt the keyboard-only ring and delete the manual focus tracking: `components/src/{inline-edit,time-picker,search-input,tabs,date-picker,field,list,accordion,breadcrumb,tag-input,color-picker,mention-input,hotkey-recorder,collapsible,context-menu}.tsx`, `components/src/internal/button.tsx`, `primitives/src/core/{selection,style}.ts`, `primitives/src/components/internal.ts` | components, primitives | **primitives half shipped; components pending** — `core/focus.ts` (`keyboardRing`) declares the `focusVisible` outline at rest and every primitive uses it: Button, Toggle, Checkbox, Switch, RadioGroup, Input/TextArea (`fieldChrome`), NumberField, OTPField, Slider's track, RangeSlider's thumbs and Rating's stars. No primitive merges a shadow ring on focus any more; `internal.ts`'s `focusRingStyle` is deleted. The components package still paints the shadow while focused. Keep tokens' `focusRing` only for a mouse-opened overlay's programmatic focus (the probe's measured gap) |
| The `focus-visible` live probe carries its own copy of the outline (`apps/playground/src/live/scenarios.tsx` `focusVisibleRing`) | playground | pending — replace it with `keyboardFocusRing` from `@gpuixui/tokens` so the probe paints the shipped helper, not a local duplicate |
| Docs site renders `packages/components/docs/*.mdx` and the example registry | docs-site | **resolved for the pages** — every package docs directory is a Fumadocs collection: `/docs/components` (39 pages), `/docs/primitives` (28) and `/docs/icons` (1), all in the sidebar and search; the example registry waits on the playground mounting them |
| Seven primitives pages carry no `## API` section although the package's own page contract (`packages/primitives/docs/README.md` §Page contract) requires one: `meter.mdx`, `number-field.mdx`, `otp-field.mdx`, `range-slider.mdx`, `rating.mdx`, `slider.mdx`, `toggle.mdx`. Found while mounting the collection; docs-site cannot add the prop tables because the pages are the primitives workstream's source of truth | primitives | open — add the real prop/type/default/consequence table to each; every other primitive page has one |
| Keep `packages/components/docs/*.mdx` valid as MDX: quoted YAML frontmatter, no raw `<tag>` in prose | components | open — `mention-input.mdx`, `color-picker.mdx` and `tag-input.mdx` were fixed by docs-site to mount the collection; `apps/docs/src/lib/package-docs.test.ts` fails on a regression |
| `scripts/verify-two-directions.sh` uses `jj`, which is not installed (D1) | tooling | pending |
| Correct `docs/component-api.md` §2: "`onValueChange` is the only change callback name" is wrong for boolean parts — base-gpui uses `on_checked_change`, so primitives adopts `onCheckedChange` alongside `onValueChange` (plan 040 §2.1) | components | pending |
| A `darwin-x64` binding for `@gpuix/native` **0.11.0** (B1, re-opened by the version bump; the store's local build was 0.10.0) | playground | **resolved** — rebuilt from the pinned `2e31b47` with the fixed zed checkout path; 21/21 smoke green on 0.11.0 |
| Decide whether `nub.lock` is committed: it is currently untracked and regenerated per worktree, so every workstream's copy would conflict | tooling | **resolved** — master tracks `nub.lock`; the merge took master's committed copy |
| `LICENSES/`: record GPUI Kit = Apache-2.0 (+ CC BY 4.0 for its docs prose, Lucide ISC for icons, no NOTICE file); shadcn/ui is referenced as design inspiration only, not copied source. The Message Scroller behaviour port (MIT) needs its own `provenance.md` row (plan 206 credits it on the docs page) | licensing | pending |

## Phase D — data and workspace components

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Tier 3 data presentation
`[ ]` Tier 4 desktop workspace (panels, docking, tabs, command palette)
`[ ]` Verify critical interactions in the real runtime

## Phase E — specialised components

`[ ]` `[░░░░░░░░░░]` 0/2

`[ ]` Tier 5 specialised components where justified
`[ ]` Document every capability GPUix does not provide, with evidence

## Phase F — integration and polish

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Consistency, keyboard, themes, composability pass
`[ ]` Performance and packaging
`[ ]` Docs truth pass against the implementation

### Docs information architecture (`docs-site`)

`[ ]` `[██░░░░░░░░]` 1/4

`[x]` Architecture page — `/docs/architecture` names all 11 packages, the dependency direction, the recipe pipeline, the Effect boundaries, the testing lanes and where a change goes; `apps/docs/src/lib/architecture.test.ts` fails when a package is added without a row or the page leaves the sidebar
`[ ]` Layouts, Workspace and Data display pages — the composition lanes the component inventory names, with live examples as they land
`[ ]` Examples and API reference pages — the example registry once the playground mounts it, plus a generated public-export reference
`[ ]` License and attribution page — rendered from `LICENSES/` once the inventory is complete

## Phase G — release readiness

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Clean-environment install and public-export checks
`[ ]` Licence inventory and attribution complete
`[ ]` All gates green (`nub run check`, `nub run lint`, `nub run test`)

## Swarm-owned blockers (fix these)

- **B1** GPUix native bindings fail to install (blocks the playground + every native smoke test).
- **B2** No durable scheduler — the swarm runs on a detached daemon; launchd and cron do not fire here.

Both are specified in ; each fix starts with a plan under .

- [x] **Docs: platform toggle (macOS / Linux / Windows / Default)** — landed: every preview renders through the resolved `platformTheme`, the switch writes the URL and remembers the choice, and the preview style sheets carry no colour literal. The variants now carry the families, radii, density and the platform's colour roles, and the previews follow because they read the resolved theme.

- [x] Tabs: a measured shared indicator on the **native** component — the rail renders one `tabs-indicator` surface instead of a card background per trigger; each trigger reports its painted box through `onLayout` and a 1×1 `tabs-origin` probe reports where the rail's absolute children start, so the pill's box is exactly the selected trigger's (asserted in both orientations and both themes; 18 native behaviour tests + an `indicator.ts` unit suite). No `transform`, so it jumps rather than slides — the docs demo's slide stays a browser illustration.
