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

`[x]` `[█████████░]` 41/42

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
`[x]` Complete the contrast pair table — 24 → 28 pairs: the text typed into an
`input` (a field's fill can differ from the surface it sits on, and no pair
measured it), and `mutedForeground` on `background`, `card` and `popover` so
secondary text is measured on every surface it can sit on. `contrast.test.ts`
proves a break to either is reported by name; all shipped and platform themes
already met the floors
`[x]` Measure the state washes — 28 → 42 pairs: the resting `foreground` on
`hover`, `active` and `accent` at the body floor, and `mutedForeground` on the
same three at the secondary floor. A ghost button or a menu row tints its
surface and keeps its label in the resting role, so those washes carry text no
pair measured. `contrast.test.ts`'s `text on the state washes` suite fails when
a pair is dropped (proven: removing `mutedForeground`/`accent` reports it by
name) and when a wash matches the text it has to carry. All shipped,
high-contrast and platform themes pass; the tightest pair is
`mutedForeground`/`active` in Linux dark at 4.59:1 against the 4.5 floor
`[x]` Correct the catalogue's focus limitation — it said the component packages
still paint `focusRing` on every focus path long after both adopted
`keyboardFocusRing` at rest (`packages/primitives/src/core/focus.ts`,
`packages/components/src/internal/theme.ts`). The Limitation now states only the
measured runtime gap (a programmatic focus before any key does not paint
`focusVisible`), and `docs.test.ts`'s `focus adoption claim` suite fails on the
retracted sentence, on a missing seam, and when either package source calls
`focusRing(` again — all three directions measured
`[x]` Ship `invalidColorRoles(theme)` and audit the documented brand themes — a
value the renderer cannot parse is ignored, so a typo painted black in silence.
The audit over `brand-theme.example.ts` found the documented brand pairing a
violet fill (`#7C5CFF`) with the dark theme's on-colour at 4.24:1: the brand now
owns its white label (`#6A45F0`), the house platform theme carries a
mode-appropriate ring, and `theme.test.ts`/`platforms.test.ts` assert both checks.
Docs in `docs/tokens.md` §Checking your own theme and `docs/design-system.md` §9
`[x]` Guard the token catalogue against drift — `docs.test.ts` reads
`docs/tokens.md` (the page that says a token absent from it is not public) and
fails when a public export has no line in it, a colour role is missing from
either colour table, a type role has no row, or the documented role/pair counts
disagree with `colorRoles`/`contrastPairs`. It found six undocumented exports —
`darkColors`, the two high-contrast colour sets, `lightElevation`,
`darkElevation` and `defaultDensity` — now in the catalogue
`[x]` Add the design-system rows to `COMPONENTS.md`
`[x]` Add `avatarSize` (20/26/32/40) so the Avatar component drops its local
diameter table; a fixed scale, not a theme group
`[x]` Ship `blend`, `filledHover` and `filledPressed` — opaque derived action
fills instead of six stored hover/press roles, with the label contrast floors
checked on both fills
`[x]` Ship the categorical **data series** — `seriesColors(theme)` resolves five
authored colours per mode and contrast variant (`lightSeries`, `darkSeries`,
`highContrastLightSeries`, `highContrastDarkSeries`) for chart marks, legends and
any colour whose meaning is "a different category". It had neither a role nor a
scale, so the docs dashboard's hand-coded `PALETTE` is the literal it replaces.
Every swatch clears the theme's own boundary floor on the three plot surfaces
(`seriesSurfaces`: `background`, `card`, `popover`) — 3:1 default, 4.5:1 high
contrast — and every pair clears `seriesDistinctnessFloor`, an OKLab distance of
0.06, because contrast cannot tell a blue from a violet of one lightness.
`seriesFailures(theme, floors?)` reports both (naming the position, surface or
pair, and an unmeasurable swatch rather than skipping it) and `auditTheme` folds
the report into its gate; a theme owns a scale by carrying `series`, which
replaces the five positions whole. `series.test.ts` holds every shipped, platform
and retro theme to both contracts and executes `series.example.ts`;
`catalogue-values.test.ts` holds the printed table to the four exports. Four
directions measured: a repeated dark swatch fails the distinctness case, the
catalogue case and the audit case; a pale light swatch fails the surface case by
name (`Light series 4 on background is 1.14`); and dropping the series half of
`passed` fails the chart-swatch gate case. Docs in `docs/tokens.md` §Data series,
`docs/design-system.md` §3/§9, the README and the `Data series` inventory row.
Consumer adoption is the interlock row below
`[-]` Add motion tokens (durations/easings) to `@gpuixui/tokens` — cancelled:
`@gpuixui/motion` is the package that owns easing curves, spring presets, stagger
and reduced-motion policy, so a second copy here would be the duplication the
boundaries forbid. A component reads motion from `@gpuixui/motion` and keeps
colour/type/space/radius from this package
`[x]` Ship `registerFonts` (plan 052) — consumer-only: installs a font file's
bytes in a renderer, is idempotent per renderer and per file, does not cache a
rejected file, and returns the families a theme may name; 6 tests, docs and a
README example. No family is bundled, so there is no licence review yet
`[x]` Native proof that a registered face paints — the playground's
`register-font` live probe installs `GpuixTestSquare` with `registerFonts`
before the first paint and measures three samples: the installed family lays
`ABm` out at its own 80px, a family no runtime knows paints the fallback's
44px, so the face is the file and not the style. Both directions measured
(without the face: `expected 80 ± 1, got 44`, exit `1`). Plan 052's native
acceptance line is the playground's to close; the token owner can tick it.
Evidence: `apps/playground/README.md` §`register-font`,
`.artifacts/live/register-font.png`
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
`[x]` Hold the documents' printed **values** to the package — `docs/tokens.md` is
the page that says a token absent from it is not public, and `docs.test.ts` held
only its shape (a row exists, the counts agree), so a palette edit could leave
the page printing the previous hex and nothing failed. The package README had the
same hole for its platform and look tables. `catalogue-values.test.ts` now
compares every printed cell with the export and the printed row set with the
exported keys: both colour tables, the high-contrast pair, every palette ramp
step, the platform chrome table (`base` must mean "inherited", a repainted role
must print that style's value), each platform's families/radius/density in both
documents, each authored look's family/radius/density in the README, the value an
inline README snippet quotes, every type role's size/leading/weight, the spacing,
radius, border, icon and avatar scales, each density preset (and which one is
marked default), each elevation level's one shadow, and each status tone's roles.
Directions measured: a changed page hex names `light primary`; a changed
`lightColors.primary` names the same pair with the carried value; a changed
platform cell, elevation offset, comfortable height, README look family, README
platform density and README quoted hex each fail by name. 14 cases; docs in
`docs/tokens.md` §Verification and the `Design tokens` inventory row. It also
caught the `Focus state` row citing `style.test.ts` and `controls.runtime.test.tsx`
without their directories — paths that resolve nowhere — now `src/core/style.test.ts`
and `runtime/controls.runtime.test.tsx`
`[x]` Guard the design-system rows in `COMPONENTS.md` — `packages/tokens/src/inventory.test.ts` fails when a row loses one of its four columns, leaves the status vocabulary, or says `done` without naming a test file that exists (all three directions measured). It found seven `done` rows claiming a capability with no named proof; each now cites the file that proves it (`color.test.ts`, `contrast.test.ts`, `focus.test.ts`, `scale.test.ts`, `styles.test.ts`, `theme.test.ts`, `typography.test.ts`, `react.test.tsx`, the two `apps/docs` guards, and the playground's registry guard for the gallery), and two rows move to `done` on evidence: `Design tokens` (the 21/21 native gallery closed the last gap) and `Theme extension` (the gallery switches the provider's value dark → light → high contrast in the renderer and every role repaints, so the switch is no longer a server-render claim)
`[x]` Ship the persisted-choice contract (salvage 065/067/068) — seven ordered indexes (`themeModes`, `themeContrasts`, `platformNames`, `retroNames`, `densityNames`, `controlSizes`, `statusTones`) own their unions, each with a guard that narrows `unknown`; `guards.test.ts` holds every index to the records it selects (a mode without both contrast variants, a platform without a style, a preset without a metric per size, a tone without its own soft roles) and executes `persisted-choices.example.ts`, and the package's own suites read the indexes instead of retyping the unions. Two directions measured: dropping `dark` from `themeModes` fails the record check and the stored-choice case; a guard that accepts any string fails the rejection case
`[x]` Guard the documents' imports — `docs.test.ts` reads `README.md` and `docs/tokens.md`, collects every name imported from `@gpuixui/tokens`, and fails when one is not a declared export (proven with `isThemeModez`)
`[x]` Hold `docs/design-system.md`'s numbers to the tokens — `design-system-docs.test.ts` reads the page and checks the role count (`colorRoles` and both colour sets), the spacing and radius scales, the avatar diameters, each density preset's control heights and row height, each platform's radius scale and named density, and every type size in §5 against `typography`; a stale number fails by name (proven with a changed comfortable height, a changed body size and a changed role count)
`[x]` Ship `auditTheme(theme, floors?)` as the gate a theme is told to run — the documented `isShippable` snippet assembled two of the three reports and called `contrastFailures(theme)` without floors, so a brand built from a high-contrast theme was audited at the **default** floors (a 5:1 placeholder passed the gate it was told to run) and a theme whose divider matched its own page was not measured at all. One call now returns `invalidRoles`, `contrast` and `decorative` plus a `passed` computed from them; `contrastFloorsFor(theme)` holds the contrast half to the theme's own variant and an explicit floor set overrides it. `audit.test.ts` proves every shipped, platform and retro theme passes one audit, reports the 5:1 placeholder the default floors pass, reports a divider no contrast pair covers, and honours an explicit floor set; docs in `docs/tokens.md` §Checking your own theme, `docs/design-system.md` §9/§11, the package README and the `Contrast contract` inventory row
`[x]` `alpha`/`blend` return a colour the renderer can paint for a non-finite amount — `NaN.toString(16)` emitted `#2559D6NAN`, which GPUix ignores in silence; the colour is now returned unchanged, proven with `#2559D6NAN`/`#NANNANNAN` before the guard
`[-]` Merge `main` into `agent/tokens-theme` once plan 019 (motion tokens) lands
there — cancelled: plan 019's subject moved to `@gpuixui/motion`, and this
workstream now lands on `master` directly, so there is nothing to merge. The
`agent/tokens-theme` / `agent/tokens-platform` branches are historical (they were
a workaround for two live sessions sharing one worktree; see
`.agents/slop/blockers/2026-10-17-concurrent-tokens-writers.md`)

### Playground and native smoke (`apps/playground`, `packages/testing`)

`[x]` `[██████████]` 23/23

`[x]` Rebuild the 0.11.0 `darwin-x64` binding from the pinned upstream revision
      (B1 re-opened by the version bump): `build-native-binding.sh` now fetches
      the release commit the package installs instead of copying the lagging
      reference clone, so a binding always matches the napi surface
      (`GPUIX_REV` overrides the pin). Built and installed 2026-10-21; 21/21
      headless scenarios green.
`[x]` Land `theme-platform` — each `platformTheme` mono family reaches the
      runtime and the three platforms name three distinct faces while keeping
      the system-UI sans sentinel (headless, `--only theme-platform`). Extended
      to the whole platform style: each row also paints that platform's
      `primary` fill, its own `lg` radius and an `md` control at its density,
      asserted through the runtime's style report and `bounds` (17 checks).
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
`[x]` Land the `register-font` live probe (plan `052`'s native half): the
      runner installs the faces a probe declares with the shipped
      `registerFonts` before the first paint, and the probe measures the
      **metrics** of three samples — the theme face, a family no runtime knows,
      and the installed `GpuixTestSquare`. Measured here: the installed family
      lays `ABm` out at its own 80px (4em at 20px) while the unknown family
      paints 44px, so the paint is the file, not the style. Negative control:
      dropping the face from the probe fails
      `the installed family paints the face's own advances` (`expected 80 ± 1,
      got 44`, exit `1`). Fixture bytes are embedded in `src/live/fonts.ts` with
      provenance; 4 unit tests guard the file's declared family and the width
      the probe expects. Evidence: `.artifacts/live/register-font.png`.
`[x]` Adopt the shipped `keyboardFocusRing` in the live probes — the
      `focus-visible` probe had its own copy of the outline, so it proved a
      local duplicate rather than the helper the library ships; re-run green
      after the swap (`--only focus-visible`).
`[x]` Land the `text-input` live probe — the first probe that mounts a **shipped
      component**: `@gpuixui/primitives`' controlled `Input` above a readout, so
      the window's typed keys must reach `onChange` (`value=hi`) and `Enter` must
      reach `onSubmit` (`submits=1`). Negative control measured (field left
      uncontrolled: `expected a string containing "value=hi", got "value=
      submits=0"`, exit `1`). Evidence: `.artifacts/live/typed.png`.
`[x]` Frame the live runner as the release gate — `apps/playground/README.md`
      §Release gate: run the full suite once on the release host, record the
      report and captures, derive the probe count from `--list`, and read exit
      `2` as "no evidence", never as a pass.
`[x]` Land the `checkbox-toggle` live probe — the shipped `Checkbox` toggles on a
      press (hit-test) and on a Space **release** (its own keyboard contract).
      Measuring it found a harness gap: a window's automation `keystrokes`
      delivers only the key down, so `AsyncSmokeHost` gained `keyUp(keystroke)`
      (released through the renderer's `simulateKeyUp`) and documents the split.
      Negative control measured (Space pressed, never released: readout stays
      `changes=1`, exit `1`). Evidence: `.artifacts/live/toggled.png`.
`[x]` Land the `scroll-horizontal` scenario — an `overflowX: "scroll"` strip
      (18 × 80px in a 320px viewport) moves on `deltaX` with `y` at 0, reports
      the delta through `onScroll`, and clamps exactly at `-1120`. 9 checks,
      negative control measured (dropping `overflowX`), `--only
      scroll-horizontal`.
`[x]` Land the `text-selection` scenario — the shipped `Text` primitive twice:
      a `selectable` line fills `getSelectedText()` after the renderer's own
      `dragSelect`, and a default (chrome) line selects nothing, with
      `clearSelection` dropping the first. `SmokeHost` gained `dragSelect` /
      `selectedText` / `clearSelection` (the doc explains why a pointer `drag`
      cannot measure selection: listeners register during paint). 6 checks,
      both negative controls measured (chrome marked selectable, content not),
      full suite 22/22 (`--only text-selection`).
`[x]` Land the Tier 2 live probes — `apps/playground` now depends on
      `@gpuixui/components` (the interlock row's `paths` fix unblocked it) and
      three window probes mount the shipped components: `dialog-lifecycle`
      (13 checks: a press opens the surface, focus enters it, Escape unpaints it
      and returns focus, the dialog's own close works; `dismissible={false}`
      fails the Escape check), `menu-lifecycle` (13 checks: press/Escape, a
      keyboard open lands on the first row, arrows move **real focus**, Enter
      and a press activate; dropping an `ArrowDown` fails by name) and
      `toast-lifecycle` (4 checks: the Effect-backed store queues, paints and
      dismisses in a live window; dropping the viewport fails). Each documented
      in `apps/playground/README.md` under "measured on 0.11.0", guarded by
      `src/live/registry.test.ts` (a probe without its section, or a section
      without its probe, fails). Measuring them found a runtime quirk now
      recorded there: a window's render root paints only one child of a
      multi-child fragment, so providers with sibling children need a host
      wrapper. All three green on 0.11.0 (`--only dialog-lifecycle --only
      menu-lifecycle --only toast-lifecycle`).
`[x]` Land the Tier 4 live probes — `command-palette` (16 checks: the shipped
      `CommandMenu` opens from a press, the search field takes the focus, an
      arrow key moves the **highlight** without moving the focus, `Enter` runs
      the highlighted row and not the first one, typing filters the rows, a
      disabled action paints but runs nothing, `Escape` dismisses) and
      `modal-focus-restore` (8 checks: the modal focus rule measured with three
      modals — the surface holds the focus → the opener gets it back, a field
      the modal focused with `initialFocus` → the opener gets it back, a field
      that took the focus with `autoFocus` → **nothing** holds it). Both green
      on 0.11.0 (`--only command-palette --only modal-focus-restore`), with
      negative controls measured (exit `1` each). The second probe isolates a
      real defect in the shipped `CommandMenu` — it loses the focus when it
      closes — recorded as an interlock row for the components workstream.
`[x]` Land the `popover-lifecycle` live probe — 18 checks on the shipped
      `Popover`: the panel opens one measured gap below its trigger on the
      trigger's start edge, `align="center"` lands on the trigger's centre line
      (the runtime centres on the containing block), a trigger near the window's
      bottom gets its panel **above** it, `Escape` unpaints and returns the focus
      to the trigger, an outside press reaches the control it landed on and
      dismisses, an inside press does not. Two negative controls measured
      (dropping `align="center"`: `expected 127.5 ± 1, got 192`; moving the low
      trigger up: `expected true, got false`, exit `1` each). The probe's own
      first layout put its outside-press target under the open panel, which
      measured an inside press instead — the target is now pinned top-right, and
      the README records the lesson. Green on 0.11.0 (`--only
      popover-lifecycle`); evidence `.artifacts/live/popover-*.png`.
`[x]` Land the `docking-nested` Tier 4 feasibility probe — a sidebar, a nested
      split and a tabbed pane composed in one layout. Each level keeps its own
      width under the other level's drag; the sidebar is caller-owned (`size`),
      so collapsing it to 0 hands the width to the nested split and reopening
      restores the width it held (not the starting one); a tab switch inside a
      pane repaints it without moving it. 22 assertions / 30 checks; two
      negative controls measured (uncontrolled sidebar: `expected 6 ± 1, got
      206`; inner divider wired to the sidebar: `sidebar=340 editor=260`, exit
      `1` each). `SplitPane` gained an optional controlled `size`, so
      `panel-resize` and `workspace-tab-drag` re-passed (`--only docking-nested
      --only panel-resize --only workspace-tab-drag`).
`[x]` Land the `data-grid-fixed-header` Tier 3 feasibility probe — the fixed
      header and the shared horizontal offset a grid needs. The runtime has no
      sticky (a sticky child inside the scroller moves with the rows, asserted),
      so the header is a sibling above the row scroller and holds its painted y;
      one `overflowX` scroller wraps both, so a header cell and its column's
      cells move together. 15 assertions / 25 checks; one negative control
      measured (no `overflowX`: `expected a value, got none`, exit `1`).
`[x]` Land the `editor-surface` Tier 5 feasibility probe — a `<textarea>` that
      edits lines (Enter as a newline, arrow-key caret movement proved by where
      the next character lands) beside a `<code>` view that paints highlighted
      source in a bounded scroller and a `<diff>` that paints both sides of a
      changed line. The measured gap: no caret/selection API and no decoration
      layer over `<code>`, so an editor is edit-then-display. 8 assertions / 9
      checks; two negative controls measured (an `onSubmit` listener turns Enter
      into a submit, `value=abcd`; no arrow keys, `value=ab\ncdX`).
`[x]` Land the `search-highlights` Tier 3 probe and the `SmokeHost.highlights`
      verb behind it — the runtime's find-in-content API measured on its paint:
      `getPaintedHighlights` reports each wash's run, `[start, end)`, `active`
      and boxes, so the probe asserts three washes for `alpha`, two for `beta`,
      none for a case-sensitive `ALPHA` or a whole-word `alp`, exactly one
      `active` for `activeIndex: 1`, and one for `ranges: [[0, 5)]`. 14
      assertions; two negative controls measured (dropping `activeIndex`: `expected
      1, got 0`; dropping `wholeWord`: `alp,alp,alp`). `packages/testing` gained
      `HighlightWash` + `highlights()` with a fake-renderer test (46 pass).
      `--only search-highlights`, green on 0.11.0.
`[x]` Land the `theme-look` theme-gallery scenario — one row per authored look
      (`luna`, `aero`) painted through `retroTheme` and read back from the
      runtime's style report: mono family, `primary` fill, `lg` radius (3 / 6
      against the base's 8) and an `md` control at each look's density (28 /
      32px). Negative control measured (painting the base radius: `luna large
      radius: expected 3, got 8`, exit `1`); `src/scenarios/theme.test.ts` holds
      the samples to being distinct from the base and each other (4 tests, all
      four fail when a look is collapsed). `--only theme-look --only
      theme-platform`, green (2/2).
`[x]` Land the `tabs-lifecycle` live probe — the shipped `Tabs` in a real
      window: the measured `tabs-indicator` pill covers the selected trigger
      (within 2px on x, width and height), a press selects and moves it, the
      arrows move **real focus** and select, the disabled tab is skipped by an
      arrow and by Home/End, and a press on it does nothing. 17 checks, green on
      0.11.0 (`--only tabs-lifecycle`); two negative controls measured (dropping
      `disabled`: `expected "tabs-archive", got "tabs-settings"`; moving the
      expected pill 40px: `expected 61 ± 2, got 21`, exit `1` each). Measuring it
      found a window-only defect recorded as the interlock row below.
`[x]` Land the `slider-lifecycle` live probe — the shipped Tier 1 `Slider` in a
      real window, on both input paths: a press in the middle of the track
      positions it (`centred=true changes=1`, so the hit-test read the track's
      box), `Home`/`End` jump to 0/100, the arrows step 99 → 100, and a disabled
      track ignores a press. 10 checks, green on 0.11.0 (`--only
      slider-lifecycle`); negative control measured (making the track disabled:
      `expected a string containing "centred=true", got "value=0 changes=0
      centred=false"`, exit `1`). The probe claims nothing about dragging: the
      runtime has no pointer capture, so a drag that leaves the track stops
      there — recorded as a limit, not asserted as a pass.

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
    - [x] CommandMenu close returns focus to its opener — the search field is
      focused by the dialog's `initialFocus` instead of `autoFocus`, so the
      modal records the opener as its restore target and both close paths give
      it back. 1 new native test (`returns focus to the opener when it closes`,
      19 in the suite; it read `None` before the change); the `autoFocus`-in-a-
      modal rule is documented on the Dialog page and the inventory row updated
    - [x] `FieldError` and destructive menu rows paint the status tone's measured
      page role — the error text and a `tone="destructive"` row used the solid
      `destructive` fill role, which no contrast pair measures as text; both now
      use `statusTone(theme, "destructive").foreground`, the role the token
      contract holds to the body floor on `background` and `card`. 1 new native
      test in each theme for the field (7 in its suite) and the dropdown row
      (35 in its suite; dark measured `#FF6B6B` before the change), docs and the
      inventory rows updated
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
    - [x] `packages/primitives` adopts the same contract for Tier 1 (a parts table row is the spec; the package is owned by primitives) — complete, nine ordered steps landed: `StateStyle` on Button/Toggle and the four fields, `CheckboxIndicator`/`SwitchThumb`, `RadioGroupItem`, the slider parts with a custom thumb glyph, the `Progress`/`Meter` track/indicator/label/value parts, the `ScrollArea` frame/viewport with the 0.11.0 scrollbar tint, the `NumberField`/`OTPField` parts, and the records/ledger pass (the stale thumb-glyph and in-track-label rows are corrected). Unit 398, runtime 127; every step landed with its native proof on 0.11.0
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

`[!]` **Two docs-site sessions write `apps/docs` at once — measured 2026-10-21
23:23.** This turn's files (`apps/docs/src/lib/component-index.ts` and its test,
written in `2e557066`) were modified one second before they were measured by a
session that added `partsOf`/`limitationsOf` (search by a documented part name),
and that session had just landed `/docs/examples` and the public symbol index
plus the docs IA ticks. This turn stopped writing under `apps/docs` at the
measurement and left the tree clean of its own edits (its work is pushed at
`53977a27`). Evidence, the rule crossed and the resume condition:
`.agents/slop/blockers/2026-10-21-concurrent-docs-writers.md`; permanent fix is
plan `022-swarm-single-writer.md` (coordinator, `scripts/`).

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
| `@gpuixui/primitives` exports in plan 110 §7 | primitives | pending — **blocking nothing meanwhile**: `internal/button.tsx` is the local `Button`/`IconButton` stand-in (plan 110 §7 amendment), to be deleted when the package lands. The Tier 1 parts contract is complete (TODO → Tier 1), so `Button`, `Checkbox`/`Switch`, `RadioGroupItem` and every other part are available for the stand-in retirement |
| `examples/basic-app`'s `RadioGroup` still calls the deprecated `onChange` (the Tier 1 parts migration moved the in-package callers only) | examples | open — switch it to `onValueChange`; the alias keeps it working until then |
| A `primaryHover` / `destructiveHover` role pair so filled buttons stop using a half-alpha fill for hover | tokens-theme | **resolved without the pair** — `filledHover(theme, action)` / `filledPressed(theme, action)` derive an opaque fill from the action role and the theme's `foreground`, so a brand override follows automatically and the six roles are unnecessary; adoption is the row below |
| Adopt `filledHover` / `filledPressed` and delete the half-alpha hover fills: `components/src/internal/button.tsx`, `primitives/src/recipe/index.ts` (`hover:bg-primary/90`, `active:bg-primary/80` — `core/variants.ts` now holds only the variant table), and the checkbox/radio hover fills in `primitives/src/core/selection.ts` (via `blend`, whose role there is not one of the three actions) | components, primitives | pending — **blocked on `@gpuixui/tw`**: the resting appearance of every migrated primitive is a class recipe, and the hover is still `hover:bg-primary/90` in `packages/tw/src/recipes.ts`, so changing the core resolver alone breaks `src/recipe/recipe.test.ts` and `src/recipe/geometry.test.ts` (measured: 4 failures). The adoptable order is (1) a derived opaque-fill utility in `@gpuixui/tw` — `hover:fill-primary`/`active:fill-primary` resolving through `filledHover`/`filledPressed` — (2) the recipes, (3) the core resolvers and their tests, all in one change; `Toggle`'s pressed accent also needs a general-role helper (accent is not one of the three `FilledAction` roles) |
| The docs theme editor (`/docs/themes`) could show a live contrast readout while a reader edits a role — `contrastRatio` / `contrastFailures` are public and cover the 24 pairs the library itself is tested on | docs-site | **resolved** — `contrastReport`/`formatContrastFailure` in `theme-editor-logic.ts` run `contrastFailures` on the resolved edit; the editor shows a `role="status"` readout under the preview naming each failing pair with its measured ratio and floor, and reporting an unmeasurable (translucent) pair instead of counting it as passed. 3 tests: built-ins pass, a broken primary pair reads `1.00:1 (needs 4.5:1)`, a translucent ring reads `unmeasurable`. Documented on `/docs/themes#contrast` |
| The docs theme editor could report the **whole** audit it already half-shows — `auditTheme(theme)` returns `invalidRoles`, `contrast` and `decorative` in one call, so a reader who edits `border` towards `background` would see the divider disappear instead of only the contrast readout moving | docs-site | **resolved** — the readout is `auditTheme`'s three reports flattened into one list (`auditReport`/`auditFindings` in `theme-editor-logic.ts`), each line worded for the reader (`role` = the value the renderer cannot paint, `contrast` = the pair, `decorative` = the surface); the editor's hand-rolled hex regex and its `contrastReport` are gone, and the persistence boundary (`parseState`) rejects a stored edit through the same `paintsEveryRole` the audit uses, so a URL or `localStorage` value that would paint black cannot be restored. `/docs/themes#the-theme-audit` describes all three reports. Directions measured: dropping the role and decorative maps fails 15 cases in `theme-editor-logic.test.ts` (the divider case reads `border on background — 1.00:1 (needs 1.05:1)`, the role case `primary — "#12345" is not a colour GPUix can paint`, and every editable role's stored-edit case), and the old page's contrast-only section fails `theming-page.test.ts`'s whole-audit case. `theme-editor.test.tsx` holds the editor to mounting the readout as a live status region that reports the defaults as passing all three |
| Paint charts and legends from the theme instead of a literal palette — `apps/docs/src/components/docs/dashboard.tsx`'s `PALETTE` (`#8b5cf6`, `#3b82f6`, …) claims the five are "readable in both themes" and nothing measures it; `seriesColors(theme)` resolves the authored categorical scale and `toCssVars` should publish it so a preview charts in the platform/look it is showing. The future chart component (Tier 3 `Charts`) is the library consumer | docs-site (and components when a chart lands) | open — the tokens half is landed (`seriesColors`, `seriesSurfaces`, `seriesDistinctnessFloor`, `seriesFailures` and the fourth `series` report in `auditTheme`); the dashboard, the CSS bridge, the theme editor's "all three" comment and any chart component still need to read it |
| The docs previews should show a platform's control geometry too — `toCssVars` publishes `--radius`, the families and every colour role, but not density, so the `compact`/`spacious` half of `platformTheme` is invisible in a browser preview | docs-site | **resolved** — `toCssVars` now publishes `--control-height-{sm,md,lg}` and `--control-padding-x-{sm,md,lg}`, `.gx-demo` defaults them to `themes.dark`'s comfortable density, and `.gx-btn*`, `.gx-field` and `.gx-tab` take their geometry from them. `theme-css.test.ts` holds the bridge, the defaults and the consumed rules, and asserts macOS 28 / Linux 36 / Windows 32px for `--control-height-md`. Verified in the dev server on `/docs/components/button?platform=`; no `--row-height` until a list/table preview exists |
| The Theming page's prose carries a hardcoded contract count ("`contrastFailures` checks 24 role pairs"), which is now 28, and its brand snippet still uses the unreadable `#7C5CFF` fill | docs-site | **resolved** — `themes.mdx` imports `contrastPairs` and interpolates `{contrastPairs.length}`, so the page has no count to fall behind (the dev server renders "28 role pairs"); `theming.mdx`'s snippet is the corrected brand from `docs/tokens.md` §Theme API (violet fill + its own white label) with the 4.24:1 story beside it. `apps/docs/src/lib/theming-page.test.ts` reads both pages from disk: the count must be interpolated (a printed one fails), and the snippet's fill/label pair is measured through `contrastRatio` against `contrastFloors.secondary` — all four checks failed on the old pages and pass now. The editor itself needed no change |
| Record the newly measured capability gaps in `docs/gpuix-capabilities.md` (plan 203): the runtime paints **no `position: "sticky"`** (a sticky child scrolls with its scroller — `data-grid-fixed-header`), and it exposes **no caret/selection position and no decoration layer over `<code>`** (so an editor is edit-in-`<textarea>` then display-in-`<code>` — `editor-surface`) | docs-site | **resolved** — the document exists: host elements, the provided surface, ~35 limit rows with a verdict (`supported`, `supported, with limits`, `not supported`, `unverified`), an evidence path and the alternative, the aria/motion cross-cutting gaps, and both measured gaps citing their probe. `/docs/runtime` publishes a *Measured in a window* section with the two probes and links the document. `apps/docs/src/lib/capability-doc.test.ts` holds every row whose capability `@gpuixui/runtime`'s `capabilities` matrix encodes to that matrix in both directions (a row and the code cannot disagree; a matrix key without a row fails by name), requires three `unverified` rows to stay uncertain, and fails when `/docs/runtime` drops either probe. Both directions measured: deleting the sticky row fails the measured-gap case, flipping `gridSpan` to `supported, with limits` fails with the matrix verdict, and removing `editor-surface` from the page fails the page case. It also records the repo's local `zIndex` binding patch, which the published API does not have |
| `packages/components/tsconfig.json` must stop mapping `@gpuix/react/jsx-runtime` (and `jsx-dev-runtime`) to the `.d.ts` files, so the playground can mount the package's components | components | **resolved** — the `paths` mapping is deleted (tokens' JSX pragma removed the reason for it; `tsc --noEmit` stays green without it). Measured both ways through the runner's own loader, 2026-10-21: with the mapping, importing `packages/components/src/index.ts` dies with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`; without it, 194 exports load and `Tabs` is a function. `src/tsconfig.test.ts` guards the mapping's absence and keeps `jsxImportSource` on `@gpuix/react` (2 unit tests, both-direction proven). **The Tier 2 live probes (dialog, menu, toast) are unblocked and landed** — the playground depends on `@gpuixui/components` (the row below records the three probes) |
| Playground mounts the Tier 2 examples and runs a dialog/menu/toast smoke | playground | **resolved** — `apps/playground` depends on `@gpuixui/components` and three live probes mount the shipped components: `dialog-lifecycle` (open by press, focus enters the surface, Escape unpaints and returns focus, the dialog's own close works; 13 checks), `menu-lifecycle` (press/Escape, keyboard open lands on row one, arrows move real focus, Enter and a press activate; 13 checks) and `toast-lifecycle` (the Effect-backed store queues, paints and dismisses in a window; 4 checks). Negative controls measured: `dismissible={false}` fails `Escape unpaints the dialog surface`, a dropped `ArrowDown` fails `an arrow key moves focus to the next row`, a dropped viewport fails its locator. Documented in `apps/playground/README.md` and guarded by `src/live/registry.test.ts` |
| Native proof that `registerFonts` paints the registered face: register a face in the theme gallery and show the fallback and the intended face | playground | **resolved** — the `register-font` live probe (`apps/playground/src/live/`) installs `GpuixTestSquare` through `registerFonts` before the first paint and measures the painted **widths**: installed 80px (its own 4em at 20px), unknown family 44px, theme face 42px. Negative control measured (no face declared → `expected 80 ± 1, got 44`, exit `1`). 4 unit tests guard the fixture's declared family and the expected width; README §`register-font`, `.artifacts/live/register-font.png` |
| Probe that `focusVisible` paints after Tab and not after a mouse press (and on programmatic focus in a dialog) — plan 053's STOP gate | playground | **resolved** — the `focus-visible` live probe measured all five states on 0.11.0 (`apps/playground/README.md` §`focus-visible`): Tab paints the outline and dims other focusables; a mouse press, a native traversal and a programmatic focus before any key paint nothing; a programmatic focus after a Tab paints it. The tokens half shipped `keyboardFocusRing`; adoption is the row below |
| Adopt the keyboard-only ring and delete the manual focus tracking: `components/src/{inline-edit,time-picker,search-input,tabs,date-picker,field,list,accordion,breadcrumb,tag-input,color-picker,mention-input,hotkey-recorder,collapsible,context-menu}.tsx`, `components/src/internal/button.tsx`, `primitives/src/core/{selection,style}.ts`, `primitives/src/components/internal.ts` | components, primitives | **resolved (both halves)** — `core/focus.ts` (`keyboardRing`) declares the `focusVisible` outline at rest and every primitive uses it: Button, Toggle, Checkbox, Switch, RadioGroup, Input/TextArea (`fieldChrome`), NumberField, OTPField, Slider's track, RangeSlider's thumbs and Rating's stars; `internal.ts`'s `focusRingStyle` is deleted. **Components half:** `internal/theme.ts` grew the same `keyboardRing(theme, invalid?)` and every Tier 2 focusable part declares it at rest — tabs, list rows, accordion headers, collapsible/breadcrumb/context-menu triggers, the local Button/IconButton, SearchInput, FieldInput (destructive while invalid), InlineEdit, TagInputField, TimePicker segments and clear, DatePicker days, ColorPicker's hex field, MentionInput and HotkeyRecorder. The manual `focused`→shadow state is gone wherever it existed only for the ring (the public `StateStyle` `focused` flags stay). Composite fields (SearchInput, TagInput, TimePicker, MentionInput) moved the ring from the group to the node that takes focus, since a group never holds it. `focusRing` stays only in the seam for a programmatic focus (the probe's measured gap); no component needs it today. Guarded by `src/behaviour/focus-ring.test.tsx` (5 native tests, both-direction proven) |
| The `focus-visible` live probe carries its own copy of the outline (`apps/playground/src/live/scenarios.tsx` `focusVisibleRing`) | playground | **resolved** — the probe spreads `keyboardFocusRing(theme)` from `@gpuixui/tokens`, so a live pass paints the shipped helper rather than a local duplicate; re-verified on 0.11.0 (`--only focus-visible`, 11/11 checks green) |
| `packages/tokens/src/fonts.ts` says the runtime "re-shapes text that already named the family", while the pinned `@gpuix/native` 0.11.0 `index.d.ts` says a family that did not exist at first layout "has already fallen back to another font" | tokens-theme | **resolved** — the claim was wrong in all three places a consumer reads it (`fonts.ts`, `docs/tokens.md` §Fonts, the package README), and the README's example installed the face from a mount effect, i.e. after the children that paint the text. All three now state the order as the contract — create the renderer, register, then render — and cite the pinned typings; `fonts.test.ts`'s `registration order` suite fails on the retracted phrasing, on a surface that stops stating the order, and on a README snippet that renders before registering (both directions measured). The late-registration failure itself is still unmeasured in a window: the row below |
| Docs site renders `packages/components/docs/*.mdx` and the example registry | docs-site | **resolved for the pages** — every package docs directory is a Fumadocs collection: `/docs/components` (39 pages), `/docs/primitives` (28) and `/docs/icons` (1), all in the sidebar and search; the example registry waits on the playground mounting them |
| Seven primitives pages carried no `## API` section although the package's own page contract (`packages/primitives/docs/README.md` §Page contract) requires one: `meter.mdx`, `number-field.mdx`, `otp-field.mdx`, `range-slider.mdx`, `rating.mdx`, `slider.mdx`, `toggle.mdx` | primitives | **resolved** — each page's prop table now lives under `## API` (their "Variants, sizes and states" heading was the table under another name), and `packages/primitives/src/docs.test.ts` holds all 28 pages to the contract: required sections in order, the `Prop/Type/Default/Consequence` header, a usage snippet importing the package root, frontmatter, and the index. It failed on exactly those seven pages before the fix |
| Keep `packages/components/docs/*.mdx` valid as MDX: quoted YAML frontmatter, no raw `<tag>` in prose | components | open — `mention-input.mdx`, `color-picker.mdx` and `tag-input.mdx` were fixed by docs-site to mount the collection; `apps/docs/src/lib/package-docs.test.ts` fails on a regression |
| `scripts/verify-two-directions.sh` uses `jj`, which is not installed (D1) | tooling | pending |
| `scripts/swarm-commit.sh` commits the **whole pre-staged index**, not only the paths it is given, so one workstream's commit can swallow another's staged work — measured 2026-10-21: a tokens commit (`360cf958`) also committed `apps/playground/src/smoke/host.ts`'s deletion and two foreign `TODO.md` hunks, leaving `master` with `run.ts` importing a file that was gone (restored in `0a49d6a5`; the deletion was **this workstream's** deliberate move to `Native.createTestHost`, landed whole in `7415bcb`, so the restore was a transient false alarm rather than a stray edit). **Measured again 2026-10-21 23:52:** the components workstream staged 40 files and `8e9a061d` (a primitives commit) carried all of them under its own message, leaving an empty index and no commit of its own | repo tooling (`scripts/`) | open — stage the named paths only (a `git reset` to the commit's parent, then `git add -- <paths>`, or `git commit --only -- <paths>`) |
| `COMPONENTS.md`'s Tier 1–5 tables are parsed by the docs site (`apps/docs/src/lib/inventory.ts`): each row must keep the four columns (`Component \| Status \| GPUix support \| Notes / limitations`) and the `Tier N` heading above it. A fifth column or a second table under one heading makes every row "malformed" and empties `/docs/layouts`, `/docs/data-display` and `/docs/workspace`; `inventory.test.ts` fails first, naming the line. | anyone editing `COMPONENTS.md` | **resolved** — the file's intro now says so, names the parser and both guards (the docs-site parser and `packages/tokens/src/inventory.test.ts` for the design-system table), and says one table per heading |
| Correct `docs/component-api.md` §2: "`onValueChange` is the only change callback name" is wrong for boolean parts — base-gpui uses `on_checked_change`, so primitives adopts `onCheckedChange` alongside `onValueChange` (plan 040 §2.1) | components | **resolved** — §2 now documents `onValueChange` for value parts and `onCheckedChange` for boolean parts (an `onChange` alias stays deprecated, new work names neither), the §6 translation table gained the `.on_checked_change(f)` row, and `packages/components/src/api.test.ts` fails when either is missing |
| A `darwin-x64` binding for `@gpuix/native` **0.11.0** (B1, re-opened by the version bump; the store's local build was 0.10.0) | playground | **resolved** — rebuilt from the pinned `2e31b47` with the fixed zed checkout path; 21/21 smoke green on 0.11.0 |
| Decide whether `nub.lock` is committed: it is currently untracked and regenerated per worktree, so every workstream's copy would conflict | tooling | **resolved** — master tracks `nub.lock`; the merge took master's committed copy |
| `LICENSES/`: record GPUI Kit = Apache-2.0 (+ CC BY 4.0 for its docs prose, Lucide ISC for icons, no NOTICE file); shadcn/ui is referenced as design inspiration only, not copied source. The Message Scroller behaviour port (MIT) needs its own `provenance.md` row (plan 206 credits it on the docs page) | licensing | pending |
| `LICENSES/`: record the retro looks' provenance — Windows XP (Luna) and Windows 7 (Aero) are colour values and geometry only (no Microsoft artwork, gradient, bitmap, icon, cursor or logo copied; no font bundled, `sans` stays the `.SystemUIFont` sentinel), and both dark editions are authored by this library rather than reconstructed. The provenance is stated in `packages/tokens/src/retro.ts`'s header, `docs/tokens.md` §Authored looks and the `COMPONENTS.md` row; the licence inventory has no row for it yet | licensing | pending |
| Docs site: offer the authored looks (Luna / Aero) beside the four platform names — a look picker on `/docs/theming` that resolves `retroTheme` for the previews. The library half is landed (`retroStyles`, `retroTheme`, `retroNames`), and the mission's toggle stays macOS · Linux · Windows · Default, so this is an extra control rather than a fifth platform | docs-site | **resolved** — the sidebar switch now has a second group: **Look** offers `Platform` (the platform's own style), `Windows XP (Luna)` and `Windows 7 (Aero)`, resolved by `applyStyle(base, retroStyles[look])` over the platform theme, so a preview paints the look's palette, radii, density and monospace family. `lookOrder` is derived from `retroNames` (a new look without a switch entry fails the parity case), the choice is written to `?look=` and remembered like the platform, and `PreviewSurface` carries `data-look`; `/docs/theming#the-look-picker` documents it and `theme-css.test.ts` proves the bridge publishes the look's `--background`, `--radius` and `--font-mono`. Both directions measured: dropping the `applyStyle` call fails three cases (`carries an authored look's palette…`, `paints the look's palette…`, `distinguishes the two looks…`), and removing the page section fails all three page guards. Verified in the dev server: `/docs/theming?platform=darwin&look=luna` renders the Look group, `data-look="luna"` and `Dark · macOS · Windows XP (Luna)` |
| Native proof that an authored look paints — extend the theme gallery (or a `theme-look` probe) to paint `retroTheme(theme, "luna")` / `"aero"` and read the `primary` fill and `lg` radius back from the runtime's style report. `applyStyle` is the merge rule `theme-platform` already paints through `platformTheme`, and the values are held by `retro.test.ts`; what is unmeasured is a look painted in a window | playground | **resolved in the headless runtime** — the `theme-look` smoke scenario paints one row per look through `retroTheme` in the TestRenderer and reads the runtime's own style report: the mono family (`Lucida Console` / `Consolas`), the `primary` fill, the `lg` radius (3 / 6 against the base's 8) and an `md` control at each look's density (28 / 32px). Both looks are sampled, and the cross-checks require each sample to differ from the base and from the sibling, so a `retroTheme` returning its base fails by name. Negative control measured: painting `base.radius.lg` fails `luna large radius: expected 3, got 8`, exit `1`; restored, `--only theme-look --only theme-platform` is green (2/2). `src/scenarios/theme.test.ts` guards the negative-control premise (4 tests, all four fail when a look is collapsed onto the base). A live-window look probe is not added: the paint path is the same style report `theme-platform` proves, so it would measure the same values. Documentation: `apps/playground/README.md` §The theme gallery |
| A status message painted as text on `background`/`card` has no measured role today: `FieldError` paints the solid `destructive` fill role as text, which no pair measures. The proposed fix was four new `xText` roles plus `statusTone(...).text` — additive but breaking for a hand-built theme literal, so it needed a coordinated tokens → primitives → components commit | tokens-theme | **resolved without new roles** — `statusTone(...).foreground` (the existing `xSoftForeground`) is the status text role: it is already designed and theme-owned, it is the role a soft status surface paints, and it clears the body floor (7:1) as page text on **both** `background` and `card` in every shipped, high-contrast and platform theme (measured by the 8 new pairs). So nothing was added to `ThemeColors`, no hand-built theme literal breaks, and the role count stays 47. `contrastPairs` grows 28 → 36; `contrast.test.ts`'s `status text on the page` suite fails if a tone's page pair is dropped; `styles.test.ts` fails if `statusTone` returns the solid fill role instead (measured: 4 failures, including `gives a status message text the page floor measures`). Docs in `docs/tokens.md` §Status tones and §Contrast, `docs/design-system.md` §9 |
| Adopt `statusTone(theme, tone).foreground` in `FieldError` (and any inline warning or error text) instead of the solid fill role — the role is now measured as page text on `background` and `card`, so the component colours no longer need their own pair | primitives + components | **components half landed** — `packages/components/src/field.tsx`'s `FieldError` and a `tone="destructive"` menu row (`src/menu/item.tsx`, shared by Dropdown and Context menus) paint `statusTone(theme, "destructive").foreground`, proven by the native cases `paints the error text in the status tone's measured page role` and `paints a destructive row in the status tone's measured page role` (dark measured `#FFE0E0`; without the change both painted the `#FF6B6B` fill). `packages/primitives`' `FieldError` still paints `destructive` (owner: primitives) |
| Measure the **late** registration failure in a window: register a family after text naming it was first laid out, and check the painted advances — the documented order (register, then render) comes from the pinned `@gpuix/native` 0.11.0 typings, and the live `register-font` probe only proves the successful order | playground | **resolved** — the `font-registration-late` live probe (0.11.0, `--only font-registration-late`) mounts `GpuixTestSquare` text with no face declared, measures 44px, installs the file through `AsyncSmokeHost.registerFont`, presses a re-layout control and measures **81px** (4em at 20px), while the never-installed control stays 44px. So the typings are conservative: the fallback is not permanent and the next repaint re-lays the text out against the now-known family. Negative control measured: declaring the face at mount fails `the face was not painted before it was installed` (exit `1`). Evidence: `apps/playground/README.md` §`font-registration-late`, `.artifacts/live/late-{before,after}.png` |
| Correct the late-registration claim now that it is measured — `packages/tokens/src/fonts.ts`'s header, `docs/tokens.md` §Fonts, the package README and `COMPONENTS.md`'s "Custom fonts" row all said a face installed afterwards "does not re-shape that text"; the window measured the opposite (44px → 81px on the next repaint). The recommendation (register before the first render) stays, the absoluteness does not; `fonts.test.ts`'s `registration order` suite asserts the current prose, so it must move with the words | tokens-theme | **resolved** — all four surfaces now say the fallback is a frame, not a verdict: the next layout re-lays the text out against the installed face, measured at 44px → 81px by the playground's `font-registration-late` probe, and "create the renderer, register, then render" stays because that first frame is the one the reader sees. `fonts.test.ts` reads all four surfaces (the inventory row included) and fails when one drops the order, the repaint, the measured widths, or returns to either retracted absolute; the four directions were measured (dropping "next layout", restoring "does not re-shape", deleting the inventory row, and a rewritten limitation) |
| Paint a **platform theme's palette, radius and density** in the native gallery — `theme-platform` measures the mono families and `theme-color-roles` measures the base palettes, so `platformTheme`'s repaint is proven by `platforms.test.ts` alone | playground | **resolved** — `theme-platform` now paints one row per platform (darwin/linux/win32) through `platformTheme`: the mono face, the platform's `primary` fill, its `lg` radius and an `md` control at its density, read back from the runtime's style report and `bounds` (17 checks, `--only theme-platform`, green on 0.11.0). macOS measures 28px, Linux 36px, Windows 32px; `@gpuixui/testing`'s `StyleSnapshot` gained `borderRadius` so a radius is a decoded style value rather than a guess. Negative control measured: painting `base.radius.lg` fails `darwin large radius: expected 10, got 8` (exit `1`). Evidence: `apps/playground/README.md` §The theme gallery |
| `packages/tw`'s `LIST_ITEM_TITLE` should carry `text-ellipsis whitespace-nowrap` like `LIST_ITEM_DESCRIPTION`; `ListItemTitle` currently merges the pair in `list.tsx` so a fixed-height row cannot wrap its title | tw (owner of `packages/tw/src/recipes.ts`) | open — move the pair into the recipe and drop the inline merge; the native truncation test in `list.test.tsx` guards either placement |
| The docs and inventory still call the platform palette, radii and density "pure values, not yet painted in a window": `COMPONENTS.md`'s "Platform styles" row, `docs/tokens.md` §Platform styles and `packages/tokens/README.md` §Platform styles all say so. `theme-platform` painted all three per platform on 0.11.0 (28/36/32px densities; radius `expected 10, got 8` as the negative control) | tokens-theme | **resolved** — all four surfaces (the inventory row, `docs/tokens.md` §Platform styles and §Limitations, the package README and `docs/design-system.md` §5) now say the radii and densities are design decisions *measured as painted*: the probe reads each platform's family, `primary` fill, `lg` radius and `md` control height (28 / 36 / 32px) back from the runtime, with `expected 10, got 8` as its negative control. The inventory row moves to plain `done` and cites both `platforms.test.ts` and the gallery registry guard. `platforms.test.ts`'s `platform documentation` suite reads every surface and fails when one returns to "not measured in this runtime" / "not yet painted in a window" / "measures families only" / "pure values", drops the probe's name, or stops citing the heights and the negative control; the three directions were measured (restoring the retracted phrase, renaming the probe, deleting the row), and a fourth removed the negative control |
| `COMPONENTS.md` line 159 (Range slider, from commit `d8523ced`) writes a raw `\|` inside the note — `` `SliderThumb index={0\|1}` `` — so the row has five cells and every docs inventory guard reports it: `apps/docs/src/lib/inventory.test.ts` says "line 159: expected 4 cells under a tier, found 5" and the lane/authoring contract is red until it is escaped or reworded. The parse is deliberately strict because a five-column row would silently empty the lane pages. Fix: write `0 and 1`, `0 \| 1`, or a code span without a pipe | primitives | **resolved** — the Range slider note now reads "`SliderThumb index={0}` or `index={1}`", and `apps/docs/src/lib/inventory.test.ts` is green (14/14, re-measured 2026-10-21) |
| The Primitives section index (`apps/docs/content/docs/primitives/index.mdx`) must link every page the package ships: `package-docs.test.ts` reads the mounted package pages and fails with the URL of any page the index does not link. `IconButton` landed a page at `/docs/primitives/icon-button`, so that guard now names it | docs-site | **resolved** — the Actions table lists `[Icon button](/docs/primitives/icon-button)`, and `nub run --filter @gpuixui/docs test` is green (33 files / 236 tests, re-measured 2026-10-21) |

| `apps/docs`' curated Dialog page still says "The top-right close control is a `✕` text glyph until an icon package lands"; the package page (`packages/components/docs/dialog.mdx`) and the source now paint `@gpuixui/icons`' `x` | docs-site | **resolved** — the limitation now reads "an `@gpuixui/icons` `x` glyph inside an `IconButton` named `Close`", the Dependencies table gained the `@gpuixui/icons` row, and the Button page gained the `@gpuix/react/floating` row it was missing. `component-page-truth.test.ts`'s `list every package the component imports` case derives both rows from the source, so a page cannot list its dependencies from memory: measured before the fix, it named `dialog.mdx: imports @gpuixui/icons` and `button.mdx: imports @gpuix/react/floating` |
| `nub run check:tests` rejects two docs-site tests it cannot see an assertion in — `apps/docs/src/lib/site.test.ts:15` ("is the host the deploy stack publishes", which does call `expect(domain).toBeDefined()`) and `apps/docs/src/lib/component-page-truth.test.ts:84` (reported with a `(dynamic)` title) | docs-site + tooling (`scripts/check-tests.ts`) | **resolved** — `83c54cd6` reworded the two guards so the parse sees their assertions; `nub run check:tests` reports `tests: every test asserts something, and nothing asserts itself`, re-measured 2026-10-21 |
| Two components pages link their sibling by the wrong URL — `packages/components/docs/hotkey-recorder.mdx` links `/docs/keyboard-shortcuts` (twice) and `keyboard-shortcuts.mdx` links `/docs/hotkey-recorder`; the pages are at `/docs/components/keyboard-shortcuts` and `/docs/components/hotkey-recorder`, so the Related links 404. Found while checking every mounted page's links from the docs side | components | **guard landed, three hrefs open** — `apps/docs/src/lib/link-integrity.test.ts` now resolves every in-site link on all 95 mounted pages (markdown, JSX `href`, relative `./` links, `?query` and `#anchor`) against the mounted URLs, and holds the two pages' three links in an argued `knownDeadLinks` list that fails if an entry stops being dead. Both directions measured: a planted `/docs/does-not-exist` and a `#not-a-heading` fail by page and target, and an exemption that points at a live page fails the staleness case. **The three hrefs are the components workstream's to correct** (`/docs/components/keyboard-shortcuts`, `/docs/components/hotkey-recorder`); each fix deletes its row from the list |
| The Tier 1 inventory has no `Grid` row although `packages/primitives/docs/grid.mdx` ships (the Grid is `Stack`'s two-dimensional sibling, documented as "the only grid GPUix draws") | primitives | open — add a `Grid` row to `COMPONENTS.md`'s Tier 1 table with its status, support verdict and limits. The docs status strip exempts the page with that reason until the row lands (`apps/docs/src/lib/inventory-status.ts`), and the exemption guard fails if a third page joins it |
| A modal that focuses a field with `autoFocus` **loses the focus when it closes**: the field takes the focus during the commit that mounts it, before the modal records who held it, so the modal's restore target is a field that is gone by the time the surface unmounts. The shipped `CommandMenu` was affected — its search field carried `autoFocus`, so closing the palette left the focus nowhere and the opener never got it back | components | **resolved for the shipped palette** — the input no longer carries `autoFocus`; the dialog's `initialFocus` focuses it after the opener is recorded, so both close paths return the focus to the opener. `src/behaviour/command-menu.test.tsx`'s `returns focus to the opener when it closes` fails without the change (`expected Some "palette-opener", got None`). The shared rule still depends on the field: a consumer's own `autoFocus` field inside a `Dialog` would lose it, so the rule is documented on `packages/components/docs/dialog.mdx` (§Accessibility and limitations) and measured by the `modal-focus-restore` probe's auto case. Evidence it replaced: the probe's measurements on 0.11.0 (`apps/playground/README.md` §`modal-focus-restore`) |
| The shipped `Tabs` relies on React's `onFocus` to keep its `active` row, but a **real window focuses the trigger without running `onFocus`**: the `tabs-lifecycle` probe's `Tab` traversal leaves the renderer focus id on `tabs-overview` while the trigger's own `onFocus` counter stays `0`, so the first arrow re-anchors on the first enabled tab instead of moving to the next one (the `TestRenderer` fires the handler, which is why no unit suite sees it). The same gap makes any component state fed only by `onFocus` (a `focused` `StateStyle` flag, field focus styling) suspect in a window, although the `focusVisible` ring is declared at rest and still paints | components | open — **measured on 0.11.0** by the playground's `tabs-lifecycle` probe (17 checks; the two defect checks are `an arrow key moves real focus` and `a traversal delivers no onFocus to the trigger`). Fix options: seed `active` from the selected row when it is empty (in `Tabs`' `moveBy`), or track the focused row from the key event; the probe's first-arrow checks flip to `tabs-reports` / `changes=1` with it. Then audit components whose `focused` state comes from `onFocus`. Evidence: `apps/playground/README.md` §`tabs-lifecycle`; negative controls measured (`expected "tabs-archive", got "tabs-settings"`; pill `expected 61 ± 2, got 21`) |
| The `command-palette` live probe asserts the fixed defect — its two checks read `"closing the palette leaves the focus nowhere (known gap…)"` and `"Escape leaves the focus nowhere as well (the same known gap)"`, both expecting `none` | playground | **resolved** — both checks now expect `palette-trigger` (`closing the palette returns the focus to its opener`, `Escape returns the focus to the opener too`), the probe header explains the modal rule instead of the gap, and the README's `command-palette` section records 16 checks and the fix. Green on 0.11.0 (`--only command-palette`); negative control measured (expecting `none`: `expected "none", got "palette-trigger"`, exit `1`). `modal-focus-restore`'s auto case stays as measured: it exercises a raw `autoFocus` field, not the shipped palette |


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
  - [x] `packages/primitives/docs` cites `@gpuix/native@0.10.0` 19 times across 14 pages (owner: primitives). Re-verify each claim against 0.11.0 rather than replacing the version string: this workstream has already found three closed gaps (`aria-description` on a trigger, `scrollbarColor`/`scrollbarWidth` on a scroller, `role`/`aria-level` for headings) and several still-true ones (no `aria-valuenow`, no `aria-checked`, no pointer capture). Record the version each verdict was taken on. — **landed**: every remaining verdict was re-read against the installed `@gpuix/native` 0.11.0 typings (`host.d.ts`): the aria set is still exactly label/description/id/expanded/selected/valuetext/level, so no `aria-valuenow`/`checked`/`pressed`/`labelledby`/`disabled`; `onPaste`, pointer capture, `transform`, a fade mask and `gridColumn`/`gridRow` are still absent; **two claims failed and were corrected rather than relabelled** — `StyleDesc` now accepts `borderStyle: "dashed"` and a linear-gradient `background`, so `box.mdx`/`COMPONENTS.md` no longer call those runtime absences (they are `Box` API gaps, pass them through `style`), and `@gpuix/react` 0.11.0 now publishes a headless `./button` (`Button`/`buttonProps`), so `button.mdx`/`Button.tsx` no longer say it does not exist; 13 docs pages, both `label` comments, seven source headers, the README's capability table (scrollbar tint is present, `./button` published) and `MIGRATION.md` now name 0.11.0. `src/runtime-version.test.ts` walks every docs page, source, runtime suite, example, `README.md` and `MIGRATION.md` and fails on any `@gpuix/<pkg>`/`GPUix` version that is not the workspace pin (both directions measured: a 0.10.0 in `Meter.tsx` and the README table fails by file name), with a floor so a scan that stopped matching cannot pass. The README's own runtime count was stale too and now reads the measured 15 files / 146 tests
  - [ ] `packages/components/docs` still cites `@gpuix/native@0.10.0` 66 times (owner: components). The repo runs 0.11.0, so each claim needs re-verification, not a find-and-replace: some gaps closed (`onLayout` exists, `focusVisible` paints) and some did not (no `aria-current`, no `transform`). Re-measure against `HostProps`/`StyleDesc` and record the version each verdict was taken on.

### Docs information architecture (`docs-site`)

`[x]` `[██████████]` 18/18

`[x]` Architecture page — `/docs/architecture` names all 11 packages, the dependency direction, the recipe pipeline, the Effect boundaries, the testing lanes and where a change goes; `apps/docs/src/lib/architecture.test.ts` fails when a package is added without a row or the page leaves the sidebar
`[x]` Layouts, Workspace and Data display pages — `/docs/layouts`, `/docs/workspace` and `/docs/data-display` are the three composition lanes, each under a Composition sidebar section. Their rows are **generated** from `COMPONENTS.md` by `<LaneTable lane>` (`apps/docs/src/lib/inventory.ts`), so a page cannot call a row shipped while the inventory says `todo`; the summary prints rows/shipped/to-build. Each page names the shipped pieces with links, the gaps with evidence and where a change goes; the layout page carries the window-frame composition preview (`layout-shell`), the workspace page the tabbed-panel preview and the data page links the Dashboard block. `inventory.test.ts` holds the parse (a malformed row is reported, not dropped), `lane-table.test.tsx` proves every row reaches the rendered table, `lane-page.test.ts` proves each page mounts its table, names the inventory and sits in the sidebar. `docs/preview-strategy.md` §"The lane pages" records the template and the no-preview-for-a-missing-component rule. Tests: `nub run --filter @gpuixui/docs test` (10 files, 70 tests), `check-types`, `build`, and the dev server at `/docs/layouts`, `/docs/workspace`, `/docs/data-display`
`[x]` API reference page — `/docs/reference` lists every public entry point, generated from each package's `exports` map by `apps/docs/src/lib/public-api.ts` (specifier, target, pattern/built). It publishes 9 packages and 17 entry points, including `@gpuixui/testing` (a build, so it resolves to `dist/`) and the `@gpuixui/components/*` per-file pattern; `@gpuixui/config` and `@gpuixui/deploy` are named as not published with a reason. `public-api.test.tsx` re-reads every manifest from disk and fails when a declared entry is missing, a target file does not exist, a pattern matches nothing, a specifier repeats, a built entry has no build script, or a package is neither published nor listed as not published; the page test holds the `<ApiReference />` mount and the sidebar place. `nub run --filter @gpuixui/docs test` 11 files / 83 tests, `check-types`, `build`, dev server `/docs/reference`
`[x]` Examples page — `/docs/examples` mounts `<ExamplesIndex />`, generated at build time from `packages/*/examples/*.example.tsx`: one row per shipped example with the page it illustrates (an exact page name wins, a sole `<id>-*` page is accepted, anything ambiguous or grouped goes to its lane index), a summary read from the file's own `<Name> example: …` header, a GitHub link and the source behind a labelled toggle. Nothing is hand-listed, so a new example appears with no docs change. The page states the examples are GPUix modules (the browser shows the source, never a fake preview) and names the primitives runtime command that mounts them; the components' examples are still waiting on the playground registry, which stays the Playground row. `examples.test.ts` reads the filesystem and fails on an unmounted file, a dead link, a grouped row sent to a guessed page, or a summary that does not come from its file (both directions measured); `examples-index.test.tsx` proves every row reaches the markup and that no source leaks into the first paint; `examples-page.test.ts` holds the frontmatter, the mount, the honesty sentence and the Reference/sidebar place. Verified in the dev server: `/docs/examples` renders `50 of 50 examples`, the OTP row links `/docs/primitives/otp-field`, the search index returns the page and `/sitemap.xml` carries it
`[x]` Typography page — `/docs/typography` renders the theme's ten text roles through `<TypeScale>`: each row prints the resolved `size/leading · weight` and paints the specimen at those metrics on the platform surface, so the sidebar switch changes the families and never the sizes; tones, the `.SystemUIFont` sentinel and its browser mapping, `registerFonts`, and the limits (one run per role, no heading semantics, no tracking) are documented. `type-scale.test.tsx` fails when the guidance list and `themes.dark.typography` disagree, when a row's metrics do not match the theme, when the mono roles drift, or when the page leaves the sidebar; the sidebar parse is shared with the lane and reference guards in `sidebar-pages.test-util.ts`. `nub run --filter @gpuixui/docs test` 12 files / 88 tests, `check-types`, `build`, dev server `/docs/typography?platform=linux`
`[x]` License and attribution page — `/docs/license` renders `LICENSES/*.md` through `<LicenseInventory>`: one row per record with the reference, its verified licence, what we take and what we deliberately leave out, read at build time with `import.meta.glob(... ?raw)`, so a record added beside the code appears with no docs change. `apps/docs/src/lib/licenses.ts` is the parse (heading, `Repository`/`Licence` bullets with wrapped continuations, the two provenance sections); a record that lacks any of them is not renderable; `licenses.test.ts` fails on an unreadable file in the directory, on each removed part, and on a sidebar place before `contributing`; `license-table.test.tsx` proves every parsed record reaches the rendered table with its licence and source. The footer names the artefacts `LICENSES/README.md` still requires (`inventory.md`, `provenance.md`, `NOTICE`) from the directory itself, so the page states the release status rather than claiming a complete inventory. Two-direction proof: dropping a record fails the count, and removing the `<LicenseInventory />` mount fails the page guard. Tests: `nub run --filter @gpuixui/docs test` 16 files / 108 tests, `check-types`, dev server `/docs/license`
`[x]` Sidebar structure guard — `sidebar-structure.test.ts` holds the root and every section `meta.json` to the files on disk in both directions: a page file missing from the sidebar is invisible (nothing else in the build notices), and a listed page with no file is a dead link. `sidebar-pages.test-util.ts` is the one `meta.json` parse the lane, reference and typography guards share. Proven by adding `orphan.mdx` and a `ghost` entry (each fails its guard); the search index returns the new pages (`/api/search?query=typography` → `/docs/typography`, `?query=workspace` → `/docs/workspace`)
`[x]` Page metadata and discovery — every docs page publishes its own `title`, description, Open Graph/Twitter tags and an absolute canonical URL built from the page's own frontmatter, with `?platform=` excluded so the four looks stay one page; `/sitemap.xml` is generated from both collections at request time (90 URLs, one per page, a curated page shadowing its package page) and `public/robots.txt` points at it. `site.test.ts` holds the one origin to `DOCS_DOMAIN` in the deploy stack, `page-meta.test.ts` holds the title, the absolute canonical, the description fallback and both route mounts (it found the loader handing the *file* path `components/dialog.mdx` as a canonical), and `sitemap.test.ts` holds the XML shape, the dedupe and the route's use of every collection. Verified in the dev server: `/docs/components/dialog` → `Dialog · GPUIxUI` + its canonical, `/docs/primitives/slider`, `/docs`, `/sitemap.xml` (`200`, `application/xml`, 90 `<loc>`), `/robots.txt`. `nub run --filter @gpuixui/docs test`: 20 files / 124 tests, the only failure the pre-existing `COMPONENTS.md` line 159 row (owner: primitives); `check-types` and `build` green
`[x]` Component index — `/docs/components` mounts `<ComponentIndex />`: a filter over every component and primitive page, generated from the pages' frontmatter at build time (`component-index.ts` + `component-index-data.ts`), so the list cannot advertise a page that does not exist and a new page appears with no docs change; a curated page shadows its package page, `index.mdx` is excluded, and the filter requires every whitespace-separated term across name, description and lane. `component-index.test.ts` holds the URL mapping, the shadowing, the section order and the filter (with the real index held to every `packages/*/docs` file); `component-index.test.tsx` holds every row, the count and the labelled control. Verified in the dev server: `/docs/components` renders `69 of 69 pages`
`[x]` Runtime-version truth on the site's own pages — `theming.mdx`, `dark-mode.mdx` and `contributing.mdx` still said GPUix `0.10.0` on a `0.11.0` repo; all three now name `0.11.0`, and the claim itself was re-checked against the pinned typings (0.11.0 still exposes no OS appearance query — `GpuixTheme.appearance` themes the runtime's own text components, it does not read the OS). `runtime-version.test.ts` reads the pin from the workspace catalogue and fails any `content/docs/**` page naming another version; it failed on exactly those three before the fix, and the scan's floor fails if the pattern stops matching. `nub run --filter @gpuixui/docs test`: 23 files / 141 tests, the only failure the pre-existing `COMPONENTS.md` line 159 row (owner: primitives)
`[x]` Platform styles: the copy-and-own contract — `/docs/theming#take-one-and-make-it-yours` shows a snippet that takes `platformTheme(themes.dark, "win32")` and re-owns the accent (fill, on-colour and ring) plus two radii, states that only what is written changes, and points at `packages/tokens/src/platforms.example.ts` (`resolveHouseTheme`), which the tokens suite executes. `platform-page.test.ts` executes the page's own snippet: the fill differs from the platform's, every untouched role, the density and both families are identical, the label clears `contrastFloors.secondary`, `contrastFailures` reports nothing, the shipped themes are unchanged, and the page still links the example (proven: a light label on the violet fails at 1.55:1). Closes the mission's "a consumer can take one platform theme file, edit it, and ship their own look"
`[x]` Theming page's colour-role count — the page printed "47 semantic roles" twice; both counts are now `{colorRoles.length}` imported from `@gpuixui/tokens`, and `theming-page.test.ts` fails when a printed count returns (both directions measured). The contrast-pair count was already interpolated; this closes the same drift class for the role list
`[x]` Theming: the geometry scales — `/docs/theming#scales` mounts `<TokenScales />`: spacing, radius, border, icon and elevation specimens plus a density table with all three presets and the active one marked, every value read from the theme the platform switch resolves (Linux's spacious 36px controls, macOS's compact 28px). `token-scales.test.tsx` holds each step and its printed pixel value to the theme, the local elevation list to `theme.elevation`'s keys, the density rows to `densityPresets`, and the platform case to Linux's radii and density (proven: dropping `5xl` fails the step guard). Verified in the dev server: `/docs/theming` renders the five groups with `comfortable · active`
`[x]` Curated-page truth pass — the four curated pages (Button, Dialog, Popover, Tabs) claimed 0.10.0 gaps on a 0.11.0 repo, the Button page said the runtime had no `focusVisible` and painted a shadow ring on a mouse press (0.11.0 declares `focusVisible` and a press paints nothing — the live probe measured both), it also reported `COMPONENTS.md`'s Tier 1 rows as `todo` after they were `done`, and Tabs printed 14 native tests for a 19-case suite. Each page now names `@gpuix/native@0.11.0` once and states the runtime's real focus, aria and portal situation (Dialog mirrors `src/dialog.tsx`: the 0.11.0 headless dialog is not wrapped). `apps/docs/src/lib/component-page-truth.test.ts` derives the claims: every semver on the page must be the catalogue's pinned `@gpuix/native`, the `## Status` test count must equal the `it(` count of the named behaviour suite, and the status must contain the parsed inventory row's status — all four guards failed on the old pages. Recorded in `docs/preview-strategy.md` §"A page's claims about the runtime"
`[x]` Patterns page — the last MISSION IA lane, `/docs/patterns`, answers the question a component page cannot: who owns the state when several parts work together. Six workflows (irreversible confirm, validated form, list search, command palette, async save, streaming follow) each carry the situation, a parts table, the state owner, the ordered steps, the failure it prevents and a runnable example; a data-driven chooser answers "which component?" with **when it is the wrong answer** too. `src/lib/patterns.ts` is the one source; `patterns.test.ts` walks `content/docs` and every `packages/*/docs`, requires each link to be a page that exists and to mention the named part, holds each example to the registry, and pairs every pattern with its exact heading on the page; `patterns.test.tsx` proves every part, href, step and limit reaches the markup and an unknown id throws. Both directions measured (a renamed part fails by name; a dropped steps list fails all six cases; a retitled heading fails). `check-types` is clean for these files and `build` + the dev server render the page; `docs/preview-strategy.md` §"The patterns page" records the template and why a workflow gets no browser preview

`[x]` Generated status strip on every package page — `/docs/primitives/*`, `/docs/icons/*` and `/docs/components/*` now open with the `COMPONENTS.md` row the page's title names: its status and its GPUix support verdict, plus a link to the inventory. `src/lib/inventory-status.ts` normalises punctuation and a trailing plural and names the sixteen titles whose row reads differently (`Text` → `Text / typography`, `Toast` → `Toasts / notifications`); `status-strip.test.tsx` proves the strip prints the row's own verdict (a `partial` component cannot read `yes`) and renders nothing for a page without a row, and `inventory-status.test.ts` holds all 69 mounted pages to the inventory (an unmapped page, a stale alias or exemption, or a title two rows could answer fails by name). Both directions measured: dropping the `List` alias fails with `packages/components/docs/list.mdx: COMPONENTS.md has no row for this page`; printing a constant `yes` fails the Button case. Documented in `docs/preview-strategy.md` §"The status strip is generated"

`[x]` The capability record a plan can cite — `docs/gpuix-capabilities.md` is one row per runtime capability with a verdict, the evidence path and the strongest alternative, and `/docs/runtime` publishes the measured half of it. `apps/docs/src/lib/capability-doc.test.ts` holds every row whose capability `@gpuixui/runtime`'s `capabilities` matrix encodes to the matrix in both directions (a row and the code cannot disagree; a matrix key without a row fails by name), keeps three `unverified` rows uncertain, and fails when the site page drops either the `data-grid-fixed-header` or `editor-surface` probe. The page's own hand-written matrix is held to the same code from the other side: every `capabilities` key must have a row whose Status is the code's verdict and, when refused, a workaround (proven by flipping `Grid span` to Supported and by emptying a refused row's workaround). Both directions measured (see the Interlocks row for the three failures). `docs/preview-strategy.md` no longer lists `focusVisible` as an absent capability — 0.11.0 paints it — and the curated pages' Dependencies tables are now derived from their sources by `component-page-truth.test.ts`

`[x]` The look picker — the sidebar switch has a second axis beside the platform: **Look** offers the platform's own style and the two authored looks `@gpuixui/tokens` ships (Luna, Aero), resolved through `applyStyle` so every preview paints the look's palette, radii, density and monospace family. `?look=` shares and remembers it, `PreviewSurface` marks it with `data-look`, and `/docs/theming#the-look-picker` documents the URL, the labels and why a look is not a fifth platform. `platform.test.ts` holds the switch to `retroNames` (a new look without an entry fails), rejects an unknown name, round-trips the query parameter and proves the resolved theme keeps every role the bridge publishes; `theme-css.test.ts` proves the bridge carries the look's values; `theming-page.test.ts` holds the page to the labels. Both directions measured (dropping the `applyStyle` call fails three cases; removing the page section fails three page guards), and the dev server renders `data-look="luna"` on `/docs/theming?platform=darwin&look=luna`

`[x]` Link integrity — `link-integrity.test.ts` resolves every in-site link on every mounted page (the site's 27 pages and the three package collections, 95 in all) against the mounted URLs: markdown links, JSX `href`s, relative `./` targets, `?query` strings and `#anchor`s, with fenced code skipped so a snippet's example URL is not a link. Anchors are held to the slug the rendered page uses, verified against the dev server (`Tray / menu bar` → `tray--menu-bar`, `` `isTerminal()` `` → `isterminal`) and pinned by fixture cases, including a repeated heading's `-1` suffix. A dead link is either fixed or argued in `knownDeadLinks` with its owner, and an entry that stops being dead fails, so the list cannot outlive the defect. Both directions measured: planted `/docs/does-not-exist` and `#not-a-heading` links fail by page and target; an exemption pointing at a live page fails the staleness case. The two component pages' three 404s are the components workstream's fix and are listed with their reasons

`[x]` The site's own ledger — `apps/docs/README.md` names every page it ships and every module the site is built from, and `src/lib/readme-ledger.test.ts` holds it to the tree in the ledger's own format (a line beginning with the path). It had drifted by ten pages (`patterns`, `runtime`, `themes`, `license`, the four blocks, …) and 44 modules, so a contributor reading it could not find the file they were editing. The guard reads `content/docs`, `src` and `plugins`, exempts only the generated `src/routeTree.gen.ts` and the shared `sidebar-pages.test-util.ts` with a reason, floors the scan at 20 pages and 50 modules, and checks that the preview policy it points at is the file on disk. Both directions measured: the pre-repair README fails the two list cases naming `blocks/dashboard.mdx` and 44 modules; the rewritten ledger passes (3 cases). The same pass added the sections the site gained and the README lacked — the look picker, the theme editor, the blocks and the preview-honesty policy

`[x]` The docs site's own palette is measured — `src/styles/app.css` is the one place the Hunter License identity is declared (once for `:root`, once for `.dark`), and `apps/docs/src/lib/docs-theme.test.ts` now reads it and holds every pair a reader reads to the library's own floors (`@gpuixui/tokens`' `contrastRatio`/`contrastFloors`): body text, secondary text, the label on each filled surface, error text, and the focus ring at the 3:1 boundary floor on the page, a card and the sidebar. It found a real defect — the light scheme's ring was `#86b300` at 2.33:1 on the page and 2.48:1 on cards, under the floor — now `#5c7a00` at 4.65:1, while the dark scheme keeps the bright lime at 8.03:1. The guard also fails when a colour exists in one scheme and not the other, so neither can silently inherit a variable from its sibling. Both directions measured: the old ring fails with all three named pairs, a dropped `--sidebar-ring` in `.dark` fails by name, and the current palette passes (4 cases). Written up in `docs/preview-strategy.md` §Theming

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

- [x] Tabs: a measured shared indicator on the **native** component — the rail renders one `tabs-indicator` surface instead of a card background per trigger; each trigger reports its painted box through `onLayout` and a 1×1 `tabs-origin` probe reports where the rail's absolute children start, so the pill's box is exactly the selected trigger's (asserted in both orientations and both themes; 19 native behaviour tests + an `indicator.ts` unit suite). No `transform`, so it jumps rather than slides — the docs demo's slide stays a browser illustration.

## Salvage gaps (from `.agents/slop/salvage-queue/`)


`[x]` `packages/primitives`: blank and text-only accessible names — `accessibleName` drops a blank label at every control's name site, `Button`/`Toggle` publish a plain text child as their name, and `Text` publishes `role="heading"` + `aria-level` for `h1`–`h3` and the code role for `code`/`codeBlock`, proven in the native a11y tree (salvage 026, 058, 059)
`[x]` `packages/primitives`: `Tooltip` content was painted but never announced; a string tip (or explicit `description`) is now cloned onto the host trigger as `aria-description`, proven in the native a11y tree (salvage 071)
`[x]` `packages/primitives`: `Skeleton circle` mirrored its one explicit side — `skeletonSize` keeps a width-only or height-only circle round (both explicit sides stay the caller's), with the component and `skeletonStyle` reading the same rule; both new tests fail on the old fallback (salvage 028)
`[ ]` `packages/primitives`: evaluate adopting the headless primitives the runtime now publishes (salvage 086's neighbours) — `@gpuix/react` 0.11.0 ships `./button` (`Button`/`buttonProps`) and `Select` gained `SelectGroup`/`SelectLabel`/`SelectSeparator`/`SelectScrollUpButton`/`SelectScrollDownButton`, which are the option groups, edge scrolling and highlight reveal `Select` documents as absent. Measured differences to resolve in a plan before touching code: `buttonProps` uses `tabIndex: -1` for disabled (ours removes the stop), fires Space activation on release without the held guard, and exposes no `loading`; the Select parts would replace the options-data API. `StyleDesc` also gained `borderStyle: "dashed"` and a linear-gradient `background`, which `Box` does not expose (pass through `style` today)
`[ ]` `packages/primitives`: no `ToggleGroup` or `CheckboxGroup` control, and disabled options need a roving tab stop (salvage 056, 065)
`[ ]` `packages/primitives`: `Select` has no option groups, its list neither flips off a window edge nor scrolls past the window, and its keyboard highlight cannot be revealed; **the trigger ring landed** (it declares `keyboardRing`, destructive while invalid), so the rest of this row is 066/068/075/083 (salvage 069 closed)
`[x]` `packages/primitives`: `Rating` can show a failed validation — `invalid` paints the chosen stars and the focus ring destructive while empty stars stay muted (salvage 070)
`[x]` `packages/primitives`: `ScrollArea` is a keyboard scroll region and reports its position (salvage 072, 337) — the viewport is a tab stop that moves one theme row per arrow, one measured viewport per PageUp/PageDown and to either end with Home/End through the renderer's `scrollTo`; it only consumes a key when the scroller itself holds focus, so a field inside keeps its arrows. `onScrollChange` forwards the absolute offset, `label` names the region as a `group` and `focusable={false}` opts out. `core/scroll.test.ts` (9) pins the arithmetic; `presentational.test.tsx` the tab stop/role/opts-out; `layout.runtime.test.tsx` measures Down/PageDown/Home/End, the absolute offset and the field guard in a window, plus the negative control (dropping `onKeyDown` fails the keyboard and offset cases)
`[x]` `packages/primitives`: every `OTPField` cell was a tab stop; the group now has one roving stop on the cell the code has reached (or the focused cell), proven natively as Tab-in/Tab-out (salvage 076)
`[x]` `packages/primitives`: `stepNumber` added raw floats, so a 0.1 step reported `0.30000000000000004`; the move is now rounded to the finer of the value's and step's decimal places, with an integer step left exact at 1e15 (salvage 077)
`[ ]` `packages/primitives`: `Text`'s `clamp` is decided by the first identical string the runtime lays out (salvage 082)
`[x]` `packages/primitives`: no `IconButton` (icon-only button) part (salvage 086) — `IconButton` narrows `Button` to the icon-only case with a **required** `label`, an `icon` slot that can never become the name, and an always-square box; ghost by default for toolbars. It is `renderButton(iconButtonProps(props), …)`, so activation, busy and disabled stay `Button`'s one implementation. 7 unit tests + 5 native (the accessibility tree names it with no image node; the painted box measures 32×32 at `md`), an example, a docs page and a `COMPONENTS.md` row. Both directions measured: dropping `square` fails `expected 1256 to be 32`, blanking `label` fails the name case
`[x]` `packages/primitives`: value callbacks use the contract's name (salvage 088) — `Input`, `NumberField`, `OTPField`, `Rating` and `Select` now take `onValueChange` (the name `RadioGroup` and `Slider` already used) with `onChange` kept as a deprecated alias that only runs when the new name is absent. Every value control resolves its callback through the one `valueChange` helper, so the precedence rule cannot drift per component. `src/components/change.test.ts` pins the rule and holds all seven value controls to the helper and the shared `ValueChangeProps` type; the native `fields.runtime.test.tsx` types into an `Input` carrying both names and sees only `onValueChange` fire; the pages, usage snippets and API tables now name the contract callback
`[ ]` `packages/primitives`: state-aware `style` is adopted only by the fields; the controls, group roots and overlays, plus a focus/tab-order matrix over every focusable control, remain (salvage 079, 080, 081, 084, 089, 090)
`[x]` `packages/primitives`: docs still advise putting a `Label` beside a standalone checkbox/switch, which does not name it (salvage 087) — `checkbox.mdx`, `switch.mdx` and the `input.mdx` API row now say a `Label` beside the control is visible text only and does not name it; the control's own `label` prop (built once by `labelledBy`) is the name. The `label` prop comments on `Checkbox` and `Switch` say the same, so a caller reads it in their editor. Proven in a window by `runtime/labelling.runtime.test.tsx` (a Label paints and leaves the box, switch and input unnamed; the same string through `labelledBy` names all three), and held by `src/labelling.test.ts` (3 cases; both directions measured — restoring "pair it with a `Label`" fails by name, and a `labelledBy` that returns a blank name fails the runtime case)
`[x]` `packages/tokens`: status text on `background`/`card` has a measured role without adding one — `statusTone(...).foreground` (the existing `xSoftForeground`) is already designed and theme-owned, and it clears the body floor (7:1) as page text on **both** `background` and `card` in every shipped, high-contrast and platform theme. Eight pairs joined `contrastPairs` for that, so nothing was added to `ThemeColors` and a hand-built theme literal (including `packages/primitives/src/core/testing/theme.fixture.ts`) still compiles; the role count stays 47. `contrast.test.ts`'s `status text on the page` suite fails if a tone's page pair is dropped; `styles.test.ts` fails if `statusTone` returns the solid fill role instead (measured: 4 failures). Docs in `docs/tokens.md` §Status tones and §Contrast, `docs/design-system.md` §9 (salvage 057)
`[x]` `packages/tokens`: measure the ring on the strips a focused control can sit on and a selected row's secondary text — 42 → 45 pairs (`ring`/`muted`, `ring`/`secondary`, `mutedForeground`/`selected`). It found a real miss: Linux dark's `selected` left a row's second line at 4.26:1 against the 4.5 floor, so the palette deepened to `#1B3F60` (`selectedForeground` 7.75 → 8.37). `contrast.test.ts`'s `ring and selection surfaces` suite fails when a pair is dropped or when a role matches the surface it must stand on (five directions measured); docs in `docs/tokens.md` §Contrast and `docs/design-system.md` §9 (salvage 074, 076, 078)
`[x]` `packages/tokens`: the contrast contract now measures the decorative surfaces — dividers (`border` over `background`/`card`/`popover`/`muted`), skeleton fills (`skeleton` over `background`/`card`/`muted`) and the modal veil (`overlay` over `card`/`popover`) — against one stated perceptibility floor, `decorativeFloor` = 1.05:1 (the floor the soft status surfaces already use). A translucent role is composited before it is measured, so the veil is checked by the result a reader sees; an unmeasurable surface is reported, not skipped; `decorativeFailures(theme, floor?)` is public and every shipped and platform theme passes. It found two real misses — macOS light's inherited skeleton at 1.045:1 on its muted strip and Linux dark's at 1.004:1 on its card — so both styles now carry a `skeleton`. The elevation tint stays out on purpose: a shadow is a blurred geometry, so a flat composite would overstate it, and `elevation.test.ts`'s one-shadow rule is its contract. `decorative.test.ts` (every placement, the edge share, both reports, compositing, unmeasurable, floor), `decorative.example.ts`, docs in `docs/tokens.md` §Decorative surfaces and `docs/design-system.md` §7/§9 (salvage 074, 076, 078, 079, 081, 082, 083, 084, 086, 087, 088, 090)
`[x]` `packages/tokens`: `alpha`/`blend` returned `#2559D6NAN` for a non-finite amount and now return the colour unchanged; `docs.test.ts` fails when a README or catalogue import names an export the package does not have; and every persisted union has an ordered index beside a guard that takes `unknown` (`themeModes`, `themeContrasts`, `platformNames`, `retroNames`, `densityNames`, `controlSizes`, `statusTones`), with `guards.test.ts` holding each index to the records it selects and `persisted-choices.example.ts` resolving all seven (salvage 065, 067, 068, 072, 077)
`[x]` `packages/tokens`: the soft status edge is no longer an unmeasured mix — `statusEdgeAlpha` is the one share `statusTone` paints and the decorative-surface contract reads, so the edge a component paints is the edge the contract measures. It is a decorative boundary (the text and icon carry the meaning), held to the 1.05:1 perceptibility floor rather than the 3:1 boundary floor, on the tint it bounds and on `background`/`card`; `decorative.test.ts` measures all four tones in all three placements, proves the share matches `statusTone`, and reports an edge that matches its own tint (measured: every shipped, high-contrast and platform theme clears the floor, the tightest being warning on its soft tint in high-contrast light at 1.12:1) (salvage 090)
`[x]` `packages/tokens`: elevation levels paint literal shadow colours instead of the `shadow` role, so a brand cannot retint them (salvage 085) — a level is now a geometry plus a share of the theme's `shadow` role: `alphaOf(color)` reads the share, `elevationWithTint(elevation, tint)` restates a scale in another tint, and `extendTheme` restates every inherited level when `colors.shadow` changes (a level passed in `elevation` still replaces the whole array, colours and all). The high-contrast themes carry the same geometry in their own role's tint, so every shipped theme's scale follows its own palette. `elevation.test.ts` proves the one-shadow rule, the runtime's five fields, the role's hue and strength per level and per shipped theme, the brand retint and the explicit level that survives it; three directions measured — dropping the `extendTheme` retint fails 3 cases, a literal tint fails 3, a high-contrast theme on the ordinary scale fails 1. Docs in `docs/tokens.md` §Elevation and `docs/design-system.md` §7; an inventory row in `COMPONENTS.md`
`[x]` `apps/playground`: floating layers' left/right sides (and the
      `align="center"` half-panel offset) are never measured by the live suite
      (salvage 095, 098) — the `floating-sides` live probe mounts three anchors
      at rest (`side="right"`, `side="left"`, `side="right" align="center"`) and
      compares each panel's painted box with its anchor's: right/left sit one
      6px gap off the anchor's own edge, `align="start"` holds on both, and
      `align="center"` ends the panel at the anchor's centre line (the quirk the
      components compensate for, now pinned live). 11 checks, `--only
      floating-sides`, green on 0.11.0; negative control measured (mapping the
      left layer to `side="right"` fails `side=left ends one gap left of its
      anchor: expected 254 ± 1, got 546`, exit `1`). Evidence:
      `apps/playground/README.md` §`floating-sides`,
      `.artifacts/live/floating-sides.png`
`[x]` `apps/playground`: dock feasibility measured — the `docking-nested`
      scenario composes a sidebar, a nested split and a tabbed pane in one
      layout: each level keeps its own width (an outer drag moves the inner
      split's origin, an inner drag leaves the sidebar alone), a caller-owned
      sidebar collapses to 0 and reopens at the width it held, and a tab switch
      repaints its pane without moving it. 22 assertions (30 checks with the
      paint guards); two negative controls measured (dropping the controlled
      `size` leaves the layout at 140 while the readout says 0, `expected 6 ± 1,
      got 206`; wiring the inner divider to the sidebar reads
      `sidebar=340 editor=260`, exit `1` each). Its measured limitation — a
      split's `max` is the caller's number, not the container's — is recorded in
      the README. `--only docking-nested`, green on 0.11.0.
`[x]` `apps/playground`: data-grid feasibility measured — the
      `data-grid-fixed-header` scenario proves the only fixed-header pattern the
      runtime supports: the header is a **sibling above** the row scroller (it
      keeps its painted y while the rows scroll), while a `position: "sticky"`
      child *inside* the scroller moves by exactly the scroll amount, i.e. the
      runtime paints no sticky. One `overflowX` scroller wraps header and rows,
      so a horizontal wheel moves a header cell and its column's cells by the
      same x and they stay aligned. 15 assertions (25 checks with the paint and
      offset guards); one negative control measured (no `overflowX` scroller:
      `scroll offset of grid-hscroll: expected a value, got none`, exit `1`).
      `--only data-grid-fixed-header`, green on 0.11.0.
`[x]` `apps/playground`: editor feasibility measured — `editor-surface` proves
      what an editor package can build on and what it cannot: `<textarea>` edits
      lines (Enter inserts a newline; a field with `onSubmit` reports Enter
      instead, measured), the arrow keys move the native caret (positioned by
      where the next character lands), and `<code>`/`<diff>` paint read-only
      highlighted source and a unified diff, including a bounded scrolling code
      viewport. **No caret/selection API and no decoration layer** exist, so a
      highlighted editable surface is not buildable; `COMPONENTS.md`'s "no
      editable code surface" row is corrected to the measured
      textarea-edits/`<code>`-displays split. 8 assertions / 9 checks; two
      negative controls measured (adding `onSubmit`: `value=abcd`; dropping the
      lefts: `value=ab\ncdX`, exit `1` each). `--only editor-surface`, green on
      0.11.0.
`[x]` `apps/playground`: content surfaces measured — the `content-surfaces` live
      probe settles what a chart or an image preview can draw. `<svg source>`
      paints its markup but **as one `style.color` tint** (GPUI's icon element
      paints the mask), so a multi-colour chart is one stacked `<svg>` per
      colour — five layers paint five exact colours, and `<text>` inside the
      markup paints. `<img>` paints a data-URL PNG, and a pixel buffer through
      `setImagePixels` **only from a layout effect** (a passive effect leaves the
      `img: no src` fallback). `<canvas>` tracks no painted bounds and paints
      nothing. 21 checks, `--only content-surfaces`, green on 0.11.0; two
      negative controls measured (every layer on the source tint fails `the bar
      layer paints its own tint`; the upload in a `useEffect` fails `an image
      paints a pixel buffer set after mount`, exit `1` each). Fixtures + guard in
      `src/live/content.ts`/`content.test.ts`; `COMPONENTS.md`'s Charts, Image
      preview and waveform rows now carry the measurement. Evidence:
      `apps/playground/README.md` §`content-surfaces`,
      `.artifacts/live/content.png`
`[ ]` `apps/playground`: native probe backlog — cross-element drag and file drops, drag auto-scroll, tab overflow (salvage 162, 168-169, 172, 174). **Landed since:** the shipped Tier 1 controls now have live probes (Input `text-input`, Checkbox `checkbox-toggle`, Slider `slider-lifecycle`) and tab-strip focus is measured by `tabs-lifecycle` (traversal, arrows, Home/End). Landed already: **text selection** (`text-selection`, salvage 163), **search highlights** (`search-highlights`), **horizontal scroll** (`scroll-horizontal`), **nested panels** (`docking-nested`), **command palette** (`command-palette`), **tabbed workspace panes** (`docking-nested`/`workspace-tab-drag`) and **content surfaces** (`content-surfaces`, salvage 161)
`[x]` `packages/testing`: hoist the native renderer adapter out of `apps/playground/src/smoke/host.ts` into a structural `Native` port, with fake-renderer tests (salvage 178) — `packages/testing/src/native.ts` exports `NativeRenderer`/`NativeElement` (method signatures only, so the package still imports no GPUix type) and `createTestHost`, which owns the `testId` → element lookup, the nearest-painted-ancestor fallback for a `<virtual-list>`/`<anchored>`, the subtree text join, the style decode and the drag synthesis. `apps/playground/src/smoke/host.ts` is deleted — a real `TestRenderer` satisfies the port structurally, so the runner calls `Native.createTestHost(root.renderer)`. 10 fake-renderer tests; both directions measured (dropping the ancestor fallback fails `aims input at the nearest ancestor that paints` and the drag case). Headless re-run green: `--only modal-focus-trap --only panel-resize --only scroll-container`
`[x]` `packages/components`: Tier 2 behaviour gaps — both remaining rows landed (salvage 324, 339).
  - `[x]` Tier 2 icon adoption (salvage 324) — every chrome mark is an `@gpuixui/icons` glyph rather than a text stand-in: the close/dismiss controls (dialog, drawer, toast, alert, tag chip, search/time/hotkey clear), the carets (date picker, combobox), the month arrows, the carousel and pagination chevrons, the selected marks (menu, combobox), the submenu chevron, the accordion indicator and the collapsing ellipses. An ellipsis in a placeholder, a keycap chord and the confirmation dialog's busy `…` stay typography by design. `src/behaviour/icons.test.tsx` (5 native tests) measures the painted `<svg>` where the glyph used to be, the Expand/Collapse and Selected images, and sweeps the source for a returning stand-in; both directions measured (restoring `⌄`/`⌃` fails the indicator case and the sweep). The three live probes that mount these surfaces stay green on 0.11.0 (`--only dialog-lifecycle --only menu-lifecycle --only toast-lifecycle`).
  - `[x]` List row subscriptions (salvage 339) — a `List` re-rendered every row whenever its selection moved because one context value carried it. Each row now reads its own slice from `src/list/store.ts` and subscribes with `useSyncExternalStore`; the store reuses a row's snapshot object while its `active`/`selected`/`tabbable` state is unchanged, which is what lets React skip the untouched rows. The context is stable across selection changes (the row handlers read the latest render through a ref), so only the store decides who repaints. `src/list/store.test.ts` (3 unit tests: snapshot identity, only moved snapshots replaced, unsubscribe) and `src/behaviour/list-subscriptions.test.tsx` (1 native test counting each row's style resolution) guard it; both directions measured (returning a fresh snapshot on every read repaints the untouched row and fails the native case).
  - `[x]` Deterministic toast exits (salvage 337) — a native test freezes the renderer's motion clock, pushes a 120 ms toast and asserts it leaves after a real wait, with a 30 s negative control that stays: the timer is Effect `Clock` time, not animation frames. 2 native tests.
  - `[x]` CommandMenu recents (salvage 329) — caller-owned `recents` action ids shown under one `Recent` heading for an empty query, in recency order; unknown and repeated ids are dropped, a typed query ignores them, a custom filter opts out, and a recent row runs once and closes. 4 native tests, both-direction measured.
  - `[x]` Native text truncation (salvage 335) — the List title was documented as "the row's one line" but wrapped: it now clips with `whiteSpace: "nowrap"` + `textOverflow: "ellipsis"` like the description, and a native test measures both against a wrapping control (title 20px vs 60px without the rule, neither part wider than its row). 1 native test.
  - `[x]` Component API truth (salvage 337) — `src/api.test.ts` executes `docs/component-api.md` §8: every shipped component has a row, every named part is an exported function, and every exported part of a family is named in some row. The Context Menu row was under-specified (`+ the ContextMenu* item parts`) and now names all 11 parts. Both directions measured.
  - `[x]` Combobox create-new (salvage 328) — a single-select `Create "…"` row, offered only when the query matches no option; `onCreate` receives the trimmed query, the popup closes and returns focus, and the selection stays the caller's (no ghost value). 3 native tests + 3 logic tests, both-direction measured.
  - `[x]` NavigationMenu hover-open (salvage 325) — the pointer policy opens after `openDelay`, switches panels across the row, keeps the panel across the 4 px trigger-to-panel gap and closes after leaving both; an explicit press/key cancels a pending hover open, and the panel ignores a press on its own triggers so a press can toggle an open panel shut. 7 new native tests (17 in the suite), both-direction measured for the toggle fix.
  - `[x]` Public subpath load checks (salvage 336) — `src/exports.test.ts` resolves every `@gpuixui/components/...` specifier a docs page shows through the package's real `exports` map, loads the file and asserts each imported name is exported; it caught `docs/field.mdx`'s `validation/logic` import resolving to a `.tsx` that never existed, fixed with an exact `./validation/logic` export
`[~]` `packages/primitives`: Tier 1 behaviour truth — one defect per line below,
each with the test that fails without it (salvage 325, 326, 328, 329, 331, 332,
334, 337, 338)
  - `[x]` Slider maximum as a stop — the snap stranded a `max: 10` / `step: 3`
    slider at 9, so the end of the track was a place the control could not go;
    the range's ends are stops now (`core/value.ts`), proven by a unit case and
    a native key-and-press test
  - `[x]` Progress tone while indeterminate, and the timer a determinate bar
    runs for nothing — the moving segment now paints the bar's own tone, and
    only a bar without a value runs the step timer (`core/loading.ts`'s
    `progressAnimates`), proven by a unit case, a tree-level fill colour and
    two native tests
  - `[x]` NumberField controlled sync (an external value change, a value that
    arrives after mount) and the caret keys it advertises — the field keeps a
    `NumberDraft` (`core/number.ts`) instead of a bare "touched" flag, so an
    owner's value folds in on the render it moves and the raw text being typed
    survives only while it still means that value; `withValue` decides the mode
    per render, so a value that arrives after mount is no longer dropped. Left
    and right leave `ARROW_STEPS`, since the host's text field owns the caret.
    Proof: 8 draft unit cases, 4 runtime cases (both directions measured —
    reverting `withValue` fails `shows the value its owner pushes`, `0` vs `42`;
    restoring the caret keys fails `leaves the caret keys to the host's text
    field`)
  - `[x]` The Space **press** is swallowed on every activating control — the
    runtime 0.11.0 types a handler's event as `KeyEvent` with `preventDefault`,
    and until now nothing used it, so a Space press could also scroll a
    container while activation waited for the release. `swallowKeyDefault`
    (`core/keyboard.ts`) is the decision; Button, IconButton, Toggle, Checkbox,
    Switch and RadioGroup call it, and RadioGroup gained the Space-on-release
    selection its docs already promised (its only key handler was the press, so
    Space did nothing). 3 helper cases + 15 wiring cases (each control swallows
    Space, not the release, not Enter); both directions measured — dropping the
    call from `Toggle` fails `is swallowed by Toggle`, and a dead helper fails
    six cases. The controls runtime suites stay green, so the real event carries
    the method
  - `[x]` Activation once / Space on release across the remaining parts — the
    last part was `Rating`: its stars are `role="radio"` tab stops but only the
    arrows moved the value, so a focused star could not be chosen with `Space`
    or `Enter`. It now follows the shared contract (`Enter` on the press,
    `Space` on the release, a held key ignored, the star holding focus chosen),
    and `src/components/activation.test.tsx` holds Button, IconButton, Toggle,
    Checkbox, Switch, RadioGroup and Rating to **exactly one** activation per
    interaction (the pair must not fire twice). Both directions measured: with
    the Rating branch reverted, 5 cases fail (`expected +0 to be 1`, and the
    native `expected 'unchecked' to be 'checked'`); with it, unit 483 and
    runtime 147 are green
  - `[x]` Disabled-after-focus: a control disabled while focused keeps acting
    and keeps its ring — measured on 0.11.0: the keys are already refused (the
    handlers read the live prop), but every control that had not been migrated
    still **declared** `focusVisible` while disabled, and disabling a focused
    element does not move the runtime's focus, so the ring stayed painted.
    `controlRing(theme, { disabled, invalid })` is the one rule now (none while
    disabled, destructive while invalid), adopted by Button, Toggle, Checkbox,
    Switch, RadioGroup, the four fields, Select, Slider and Rating;
    `focus.test.ts`/`style.test.ts` pin the rule and
    `controls.runtime.test.tsx` focuses a Checkbox, disables it, reads the
    declared style back (no `focusVisible`), proves Space is refused, then
    re-enables it and sees the ring and the toggle return. Both directions
    measured: dropping `disabled` from the checkbox's ring call fails the native
    case
  - `[ ]` Caller handler composition across the interactive parts
  - `[ ]` The switch thumb's motion
  - `[ ]` The native field's hint and selection reach
`[~]` `apps/docs`: docs truth — stated native-test counts and the complete public type index (salvage 310, 324, 326, 330, 333, 335; the example registry page and the copy-and-own platform example contract have landed)
  - `[x]` **The complete public type index** (salvage 324) — `/docs/reference` now
    publishes every symbol the workspace exposes: 1085 names across 9 packages,
    each with its kind (component / hook / function / class / interface / type /
    enum / namespace / constant / external), the file that declares it, the
    specifiers that publish it and the first sentence of its doc comment. The
    entry-point table is unchanged above it. The index is read from the source
    at build time by a Vite plugin (`apps/docs/plugins/public-symbols-plugin.ts`),
    so the browser bundle carries the index and not the 2 MB of TypeScript it
    came from; the reference page imports the component itself, so the index
    travels with that page's chunk and not with every page on the site.
    `apps/docs/src/lib/public-symbols-source.ts` does the reading — it scans a
    module's export statements the way the compiler sees them (an `export` in a
    comment, a string or a template literal is not an export; a statement that
    spans lines is one export), follows the re-exports and resolves each name to
    the module that declares it. `public-symbols.test.ts` pins the scanner's
    rules with fixtures and holds it to the workspace in both directions.
    Verified: the dev server renders `/docs/reference` with the table, the
    production build puts the index in the reference chunk only
    (`page-meta` stays at 945 KB), and `nub run --filter @gpuixui/docs test` is
    green (29 files / 197 tests).
  - `[x]` **Stated native-test counts** (salvage 333, 335) — the package pages
    state how many native cases prove a component; the counts drift. Measured
    2026-10-21: 45 of the 49 count claims in `packages/*/docs/*.mdx` are
    correct, and one was wrong — `packages/components/docs/field.mdx` said
    `(5 tests)` for `src/behaviour/field.test.tsx`, which runs 6. The page now
    states 6 and lists the missing disabled case, and
    `packages/components/src/docs-counts.test.ts` holds every `(N tests)` claim
    in all 39 component pages to the suite it names (a claim that names no suite
    fails; `drawer.mdx`'s "guard (18 tests)" now names Dialog's 13 and
    Confirmation dialog's 5). Both directions measured: restoring `(5 tests)`
    fails `field.mdx:108 says 5, src/behaviour/field.test.tsx runs 6`, and
    returning drawer's prose to the bare count fails `states 18 tests without
    naming a suite`. The four curated pages stay held by
    `apps/docs/src/lib/component-page-truth.test.ts`.
`[x]` `packages/tokens`: the authored house theme finishes its accent **family** — `resolveHouseTheme` now owns `accent`, `accentForeground`, `selected`, `selectedForeground` and `selection` for both modes, because those are surfaces derived from the accent: owning only `primary` painted a violet action inside the platform's blue popover and a blue-tinted selection. The light and dark values are violet tints; `platforms.test.ts` asserts they are the house theme's and not win32's, that `selection` is the brand's alpha, and that both modes clear the contrast and decorative contracts (measured: without the family the new case fails on `expected '#E5F1FB' not to be '#E5F1FB'`); docs in `docs/tokens.md` §Editing a platform style and the inventory row (salvage 330, 331)
`[x]` `packages/tokens`: Windows XP (Luna) and Windows 7 (Aero) recipe styles, plus dark editions — **landed** as authored looks in `src/retro.ts` (`retroStyles`, `retroTheme`, `retroNames`/`isRetroName`), **not** new `platformNames`: that list is the persisted platform key and the mission's toggle is macOS · Linux · Windows · Default, so a look is applied by name. `applyStyle(base, style)` is now the one merge rule (`platformTheme` is `applyStyle` over `platformStyles`), so a consumer can author a third look as data. Each look carries families, a full radius scale, a density preset and per-mode chrome; the dark editions are authored (invented — Luna and Aero shipped no dark mode) and documented as such, with the chrome provenance stated (colour values only, no artwork/gradient/icon/logo copied, no bundled face). `retro.test.ts` (205 cases) holds all four themes to every `contrastPairs` pair through `contrastFailures` and every placement through `decorativeFailures`, holds the dark editions to a real second palette, proves a high-contrast base keeps its colours, executes `retro.example.ts` (`resolveRetroBrand`) and guards the provenance prose plus the catalogue table and the inventory row. Directions measured: a grey `mutedForeground` fails eight named pairs; a changed `radius.md` in the catalogue table fails by look name; a retracted "not a platform" claim fails by file; a removed inventory row fails. Headless re-run after the `applyStyle` refactor: `--only theme-color-roles --only theme-platform` (2/2). Docs in `docs/tokens.md` §Authored looks, `docs/design-system.md` §5/§11, the package README and a `COMPONENTS.md` row (salvage 311, 328)
`[x]` `packages/tokens`: `createTheme` starts from the requested contrast variant (`createTheme({ mode, contrast })`) instead of silently ignoring it, every group merge inherits an explicit `undefined` instead of erasing a role, and each platform style declares the `contrast` variant its palette is designed for — `platformTheme` applies a palette only where that matches the base's. `theme.test.ts` (contrast route, the `undefined` rule per group, one brand over both palettes via `high-contrast.example.ts`) and `platforms.test.ts` (the declaration, no `undefined` role) fail in the corrected direction, each measured; docs in `docs/tokens.md` §Theme API and §Platform styles, `docs/design-system.md` §5, the package README and the two inventory rows (salvage 301, 304, 321, 323)
`[x]` `packages/tokens`: the suite has a time budget — `vitest.config.ts` (the package had none, so it ran on vitest's defaults) states a two-second `testTimeout` and `hookTimeout` and the includes it already ran; `src/suite.test.ts` reads the file and fails when the budget or an include is removed. It is effective, not decorative: with the budget lowered to 50 ms for a probe, a 200 ms test fails with `Test timed out in 50ms` (the guard failed in the same run). Honest limit recorded in the config and docs: a synchronous infinite loop cannot be interrupted by any timeout (salvage 333)
`[ ]` `packages/components`: no native cost model or package-surface performance baseline (salvage 302, 338)
