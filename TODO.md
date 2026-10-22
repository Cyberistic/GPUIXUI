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

`[x]` `[██████████]` 69/69

`[x]` Measure the **secondary text** inside a selection wash — `selectionPairs` carried only each surface's body role, so the `mutedForeground` line a reader selects (a caption, a table's second line, a log row) was measured by nothing; the wash left it at 4.25–4.44:1 on the light styles and 3.27–4.13:1 on the dark ones against its 4.5:1 floor, because the grey ramp's 600 and 400 steps sat at the floor with no headroom for any visible wash. **The palette moved, not the wash**: three pairs joined `selectionPairs` (4 → 7, `floor: "secondary"` on `background`/`card`/`popover`), base light `mutedForeground` is `#4B5362`, base dark `#C1C7D1`, Luna dark `#B4C6DD`, Aero dark `#BCCEDF`, and the high-contrast dark wash carries 26% (`#C7CBFF42`) so its 7:1 secondary text clears the composite. `selection.test.ts` holds the coverage, the per-surface floor, the regression (the pre-fix `palette.neutral[600]` on macOS light reports `4.30` while its resting pair passes) and the 16-theme sweep; `catalogue-values.test.ts` holds the printed cells. Directions measured: removing the three pairs fails 4 cases by name, reverting the dark value fails the sweep as `Dark`, and deleting the page's secondary claim fails the docs case. Docs in `docs/tokens.md` §Text selection, `docs/design-system.md` §8/§9/§11, the package README and the `Text selection wash` row

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
`[x]` Truth pass on the remaining `0.10.0` ring claims — **both halves landed**:
every ring claim in `packages/primitives/docs` and its inventory rows names
`focusVisible`, `COMPONENTS.md`'s Tier 1 rows no longer say a press paints the
ring, and the components package adopted the same rule (`internal/theme.ts`
returns `keyboardFocusRing(theme)`'s outline at rest, no source calls
`focusRing(`, and `src/behaviour/focus-ring.test.tsx` holds the declaration in
the native renderer). The audit's design-system `Focus state` row records both
packages as done. The one `0.10.0` claim left in the repository is the
capability-map preamble in `COMPONENTS.md` §"Not provided by GPUix", which is a
separate interlock row (primitives + docs-site); nothing in this workstream's
documents depends on it now
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
owns its on-colour per mode (`#B49CFF` with the near-black iris in dark,
`#6A45F0` with white in light, because the fill is also a progress mark), the
house platform theme carries a mode-appropriate ring, and
`theme.test.ts`/`platforms.test.ts` assert both checks.
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
`[x]` Document the layering model (plan 202 §2.3) — the one design-system capability with no token to encode, because the published `@gpuix/native@0.11.0` `StyleDesc` has no `zIndex` and paint order is tree order. `docs/tokens.md` §Layering names the five mount layers (inline → anchored → tip → modal → notice), the toast viewport last in the app root, the topmost-layer dismissal stack (`packages/components/src/internal/dismiss-layer.ts`), and keeps the `overlay` **scrim colour** apart from the reserved, empty `elevation.overlay` level; `docs/design-system.md` §7/§10 point at it and §Limitations now records the absent breakpoints and z scale, so plan 202 §2.3/§2.4 is closed without the numeric z scale the plan refuses. `packages/tokens/src/layering.test.ts` (8 tests) holds the page to it — the layer order, the dismissal rule, the scrim/elevation split, the inventory rows it names, the reserved level staying empty in every shipped theme, and the package exporting no `z` scale — and four directions were measured: deleting the section fails 5 cases by name, moving the notice layer above the modal fails the order case, filling `lightElevation.overlay` fails the reserved-level case, and a `zScale` export fails the stacking case. `COMPONENTS.md` gains a `Layering` row citing the overlay probes
`[x]` Ship the pressable-target floor — `targetSize` (24px, WCAG 2.2 SC 2.5.8 AA; 44px, WCAG 2.1 SC 2.5.5 AAA) and `targetInset(visual, floor?)`, the padding each side a smaller drawing reserves so its press box reaches a floor. A checkbox draws at `iconSize.md` (16px) and a chevron at `xs` (12px), so the drawing was the click target and neither is a theme group: a floor a brand could lower would stop being a conformance claim. The shortest shipped control (`compact` `sm`) is exactly 24px, so every control built at a control height already conforms; the inset is for the icon-sized parts. Tests: `target.test.ts` (8 — exact insets, the odd-gap round-up, the non-finite guard, every control height in every density, every icon step reserving to the floor), `catalogue-values.test.ts` holds the printed 24/44 and `design-system-docs.test.ts` the page's sentence. Four directions measured: a 26px printed value fails the catalogue case, deleting the page's sentence fails the floors case, `compact` `sm` at 20px fails the density case, and `Math.floor` in place of the round-up fails the odd-gap case. Docs in `docs/tokens.md` §Target sizes and `docs/design-system.md` §6/§9; adoption is the interlock row below
`[x]` Measure the text-selection wash — `selection` was documented as the wash behind a reader's selection, carried by all four colour sets and every platform and authored style, and measured by **nothing**: `contrastRatio` refuses a translucent value, so the text contract skipped the wash and the text inside it, and a theme could hide what it selects and pass the whole gate. `selectionPairs` names the four content surfaces body text is selected from (`input`, `background`, `card`, `popover`, each keeping the text role it already carries) and `selectionFailures(theme, floors?)` composites the wash over each surface and holds it to two floors — visible against what it covers (`decorativeFloor`, 1.05:1) and readable inside it (the theme variant's body floor, 7:1) — returning `visibility`/`legibility`, the composited colour and the ratio, and reporting a surface it cannot composite rather than skipping it; `auditTheme` reports it as its fifth contract. **It found three shipped styles under the floor**: Linux dark at 6.63:1 on its card, Windows dark at 6.33:1 and Windows XP Luna dark at 6.80:1 on its popover, all a 30% accent wash over cards lighter than the base theme's, so each now carries the base dark theme's 24% share. `selection.test.ts` holds all 16 shipped/platform/look themes to both floors, reports the pre-fix Linux value by name (`6.63`, floor `7`), both broken brands, the unmeasurable surface and a caller's stricter floors; `selection.example.ts` is executed and `COMPONENTS.md` gains a `Text selection wash` row. The palette values are painted by the gallery's `theme-color-roles` (`--only theme-color-roles`, green); the wash itself has no consumer yet, which is the interlock. Docs in `docs/tokens.md` §Text selection and `docs/design-system.md` §8/§9/§10. Adoption by the components that can paint a selection is the interlock row below
`[x]` Measure a control boundary on the strip it sits on — `borderStrong` was measured on `background`, `card` and `input` only, so an outline button in a `muted` toolbar or a bordered control on a `secondary` fill drew a 3:1 edge that nothing checked. Two pairs joined `contrastPairs` (45 → 47, the same two strips the ring is measured on), and they found three misses: the base light theme shipped `#848E9E` at 2.92:1 on `muted`, the base dark theme `#6B7484` at 2.81:1 on `secondary` and Linux light `#8A8884` at 2.97:1 on its own muted strip — all under the 3:1 boundary floor. The three values are now `#7B8595` (min 3.29), `#748091` (3.31) and `#84827E` (3.22) on every surface a control sits on; the catalogue's two printed tables and its pair count move with them, and `docs/design-system.md` §7/§9 state the surfaces. `contrast.test.ts`'s `a control boundary on the strip it sits on` suite holds the coverage, reports the pre-fix light value at 2.92 by name and reports a boundary that matches its strip; `color.test.ts`, `platforms.test.ts` and `retro.test.ts` run the new pairs over every shipped, platform and look theme (reverting the light value fails 9 cases by name, two of them the new pair), and the gallery paints the values back (`--only theme-color-roles`, green)
`[-]` Merge `main` into `agent/tokens-theme` once plan 019 (motion tokens) lands
there — cancelled: plan 019's subject moved to `@gpuixui/motion`, and this
workstream now lands on `master` directly, so there is nothing to merge. The
`agent/tokens-theme` / `agent/tokens-platform` branches are historical (they were
a workaround for two live sessions sharing one worktree; see
`.agents/slop/blockers/2026-10-17-concurrent-tokens-writers.md`)
`[x]` Hold the contract to its own scope — `coverage.test.ts` reads `colorRoles` (the inventory of what a theme carries) and fails when a role appears in no contract: not as either side of a `contrastPairs` pair, not in a `decorativeSurfaces` placement, and not named in the two-entry exemption map. It found two roles that had shipped, been documented and been painted, and been measured by **nothing**: `disabledForeground` (closed by the disabled floor above) and `scrollbar`, which `ScrollAreaViewport` tints the platform-drawn thumb from — so the thumb now joins `decorativeSurfaces` on the four strips a scroller can sit on at `decorativeFloor` (1.05:1; every theme clears it, tightest Linux dark 1.21:1 on a popover). The remaining two are named with their contract rather than exempted: `selection` by `selectionFailures`, `shadow` by `elevation.test.ts`; an exemption that stopped being needed fails the same guard. Directions measured: dropping the scrollbar placements fails the coverage case with `['scrollbar']` and both decorative cases, and dropping the disabled pairs fails the coverage case naming `disabledForeground`. Docs in `docs/tokens.md` §Every role is measured and §Decorative surfaces, `docs/design-system.md` §9 and the `Contrast contract` inventory row
`[x]` Measure the disabled state controls actually paint — the recipes and primitive cores fade a control (`disabled:opacity-50` in `@gpuixui/tw` and `packages/primitives/src/recipe/index.ts`, `opacity = 0.5` in `packages/primitives/src/core/style.ts`, a menu row in `packages/components/src/menu/item.tsx`) and `contrastRatio` refuses a translucent control, so the mechanism most components use was measured by nothing. `disabledOpacity` is that share (0.5, a design constant rather than a `Theme` group), `disabledFadePairs` names the three filled actions on the page plus a field on `background`/`card`/`popover`, and `disabledFadeFailures(theme, floor?)` composites **twice** — the label over the faded fill, not over the page — returning the pair, the ratio (or `undefined`) and the floor at `contrastFloors.disabled`. Every shipped, high-contrast, platform and look theme clears 1.5:1 (a filled label measures 1.51:1–2.83:1), but a high-contrast theme lands at 1.74:1–2.23:1, under the 3:1 its variant asks — so the fade cannot carry the state there and the role pair is the contract. `disabled.test.ts` (8 cases) holds the constants, the placements, the composite order, the erased-label case, the unmeasurable role, a caller's floor and that measured gap; `docs.test.ts` documents the exports. Directions measured: dropping the popover placement fails the placement case, and compositing the label over the page instead of the faded fill fails both the 1.57:1 case and the erased-label case. Docs in `docs/tokens.md` §The fade a disabled control paints, `docs/design-system.md` §8 and the `Contrast contract` inventory row; adopting the role pair in those packages is the interlock row below
`[x]` Give the disabled state a contract — `disabled`/`disabledForeground` are painted as a pair by a disabled field, a select's value and a fieldset legend, and **no** pair measured them, so a palette edit could set the unavailable label to its own fill and every suite stayed green. `ContrastFloors` gained `disabled` (1.5:1; `highContrastFloors.disabled` 3:1) and four pairs joined `contrastPairs` (51 → 55): the label on its own fill and on `background`, `card` and `popover`. The floor is deliberately **not** a readability claim — WCAG exempts an inactive component from 1.4.3/1.4.11 — it says the state is still seen; every shipped, high-contrast, platform and authored theme already cleared it (tightest: Linux dark 1.76:1 on a popover), so no palette moved. `contrast.test.ts`'s `disabled text` suite holds the coverage, the floor's relation to `secondary`, a label painted into its fill at 1.00:1 and one matching the page; `design-system-docs.test.ts` holds the page's printed 1.5/3 to the exports. Directions measured: removing the four pairs fails the three contrast cases by name, and deleting the page row fails the docs guard. Docs in `docs/tokens.md` §The disabled floor, `docs/design-system.md` §8/§9 and the `Contrast contract` inventory row
`[x]` Measure the chart scale for a colour-blind reader — the categorical series was held to its plot surface and to itself, and **nothing** asked whether two swatches still differ for a reader with a colour-vision deficiency; two hues can be 0.286 apart for a full-colour reader and 0.024 apart to a deuteranope, which every suite called a pass. `colorVisionDeficiencies` (protanopia, deuteranopia, tritanopia), `simulateColorVision(color, deficiency)` (Machado, Oliveira and Fernandes 2009, severity 1.0, linear sRGB; `undefined` rather than a guess for a value it cannot read) and `seriesDeficiencyFloor` (0.05 OKLab) make it a third contract; `seriesFailures` gains `deficiencies` and `auditTheme.passed` reads it. **All four shipped tables collapsed somewhere** — light 2/3 at 0.030 and high-contrast light 2/3 at 0.011 under tritanopia, dark 2/3 at 0.026 under tritanopia and high-contrast dark 3/5 at 0.016 under deuteranopia — so all four are redesigned (the normal floor stays 0.06 and the tightest simulated pair is now 0.054) and the documented brand scale moved with them. `series.test.ts` (26 cases) holds every shipped, platform and retro theme to the third contract, names the deuteranope's red/green pair, an unmeasurable swatch, a caller's floor and the report line; `catalogue-values.test.ts` holds the printed table and both floors, `design-system-docs.test.ts` the page's two series rows, and `COMPONENTS.md`'s `Data series` row moves with them. Docs in `docs/tokens.md` §Data series and `docs/design-system.md` §3/§9; the docs-site readout and prose are the interlock row below
`[x]` Audit the elevation colours a brand supplies — `invalidColorRoles` reads `colors`, so a level passed to `extendTheme`'s `elevation` override replaces the array whole and its colours were measured by **nothing**: the runtime ignores a shadow colour it cannot parse, so the card or dialog paints flat and every suite stayed green. `isPaintableColor(value)` is the grammar the role report already used, `invalidShadowColors(theme)` names the level, the position and the value, and `auditTheme` reports them as a sixth contract (`invalidShadows`, counted in `passed`). `elevation.test.ts`'s `unpaintable shadow colours` suite holds the shipped scales, a bad colour at position 1 behind a valid one (the case `elevationShadow`'s first-entry read would hide), the 6/8-digit grammar against a named colour and an empty string, and the role-retint path; `audit.test.ts` proves the gate fails on a supplied level, that the role report cannot see it, and that a valid level still audits clean. Three directions measured: the report returning `[]` fails 5 cases by name, `passed` ignoring `invalidShadows` fails the gate case, and reading only a level's first shadow fails both position cases. Docs in `docs/tokens.md` §Checking your own theme/§Paint-ready values/§Elevation, `docs/design-system.md` §9/§11, the package README and the `Elevation`/`Contrast contract` inventory rows; the theme editor's "all five" wording is the interlock row below
`[x]` Measure the **indicator marks** a component paints — a progress fill, a spinner's lit dot, a slider's filled span, a switch's on-state, an avatar's presence dot — because no part of the contrast table covered one: `primary` was measured only against its own on-colour, so a bar or dot painted in a role that matched the page passed every suite. `indicatorRoles` (8: `primary`, `success`, `destructive`, `mutedForeground` and each status tone's readable role) and `indicatorSurfaces` (4: `background`, `card`, `popover`, `muted`) are the table, and `indicatorFailures(theme, floors?)` holds every placement to the theme's non-text floor (3:1; 4.5:1 high contrast), reporting an unmeasurable role rather than skipping it. **A status mark paints the tone's readable role, not the solid fill**: light `warning` is a pale amber designed to carry near-black text and measures 1.78:1 on the page, so a dot in it would be the one mark nobody can find. The contract immediately found the documented brand: its dark primary `#6A45F0` carried a white label (5.6:1) but sat at 2.66:1–2.99:1 as a mark on the dark card, popover and muted strip, so the example and the house platform theme now own their on-colour **per mode** (dark `#B49CFF` with the near-black iris, light `#6A45F0` with white). `auditTheme` reports it as a seventh contract (`indicators`, counted in `passed`), so a brand is held to the same gate. `indicator.test.ts` (8 cases) holds the 16-theme sweep and its tightest placement (Luna light `success`/`muted` 3.30:1), the status rule, the unmeasurable case, a caller's stricter floor and the catalogue counts; `audit.test.ts` proves the gate fails on a mark no contrast pair can see; `platforms.test.ts` audits the house theme in both modes. Directions measured: removing a tone's mark role fails three cases (`warning/background`, `[ 'warning' ]`, and the printed count); `indicatorFailures` returning `[]` fails three; `passed` ignoring the report fails the gate case; and reverting the dark brand to `#6A45F0` fails the brand audit at 2.66:1. Docs in `docs/tokens.md` §Indicator marks, `docs/design-system.md` §8/§9, the package README and the `Indicator marks` inventory row

`[x]` Measure the numbers a theme carries — the audit checked every colour and **no number**, so a brand built from a scale factor or a stored preference could carry `NaN`/`Infinity` and ship. A style batch is serialised with `JSON.stringify` before it reaches native (`@gpuix/native@0.11.0`, `dist/mutations.js`), so those values arrive as `null` and the property is dropped: measured in the test renderer, `borderRadius: NaN` beside a valid `borderWidth`, `fontSize` and `backgroundColor` kept the three and dropped only the radius, and `fontSize: -4` was accepted and laid a text element out at height 0. `invalidNumbers(theme)` reports every numeric token that cannot be laid out (group, path, value, rule) — spacing, radius, border width, icon size, type size and leading, density metrics and every shadow number — with a rule that follows the design: a negative shadow offset or spread passes, a zero radius passes, a control height, icon or type size must be positive. `auditTheme` folds it into `passed` as its third report (eight now), and `numbers.test.ts` holds all 16 shipped, platform and authored themes to an empty report, proves each group with a broken value, proves both directions (removing the radius inspection fails 4 cases; dropping the field from `passed` fails 2; restored 14/14), reports a shadow's second entry behind a valid first, and executes `numbers.example.ts`. Docs in `docs/tokens.md` §Numbers/§Verification, `docs/design-system.md` §9–§11 and the package README; a `Token numbers` inventory row.

`[x]` Fold the **disabled fade** into the gate — `auditTheme` shipped eight reports while `disabledFadeFailures` (the mechanism `@gpuixui/tw`, the primitive cores and a menu row actually use) was not one of them, so a brand whose `primaryForeground` composites into its own faded fill passed the gate it is told to run. `ThemeAudit` gains `disabledFade` and `passed` reads it (nine reports now); the report deliberately keeps `contrastFloors.disabled` in every variant instead of inheriting `contrastFloorsFor(theme)`, because the fade cannot reach a high-contrast variant's 3:1 and folding the variant's floors in would fail every shipped high-contrast theme for a mechanism it does not use. `audit.test.ts` builds the brand that isolates it — `primary: "#101010"`, `primaryForeground: "#7E7E7E"` passes the enabled pair at 4.69:1 and lands at 1.04:1 when faded, with `contrast` and `indicators` both empty — and proves the fade report reads the same for a high-contrast theme at either floor set. `docs.test.ts` gains `the audit's report list`: every key `auditTheme` returns must be named in `docs/tokens.md`, the README and `docs/design-system.md`, no `audit.<name>` the gate does not return may be named, and the printed count word is derived from the gate's own keys. Five directions measured: dropping `disabledFade` from `passed` fails the erased-label case, returning `[]` fails it on the report, deleting the catalogue's line fails the name case (`docs/tokens.md: audit.disabledFade`), printing "eight" fails the count case, and planting `audit.nope` fails the stale case. Docs in `docs/tokens.md` §Checking your own theme and §The fade a disabled control paints, `docs/design-system.md` §8/§9/§11, the package README and the `Contrast contract` inventory row. The docs-site readout is the interlock row below.

`[x]` Measure the **state washes** — `hover`, `active`, `selected` and `accent` are the surfaces a control tints behind its content, and the contrast table measured only the *text on them*: a wash that carried the strip's own value was a colour the suite could not see. It was not hypothetical — the base dark theme shipped `hover` equal to `popover`, so hovering a menu row repainted the surface it already sat on; the base light theme's `hover` was its `muted` toolbar; macOS light's was its own muted strip; Windows light's and Linux dark's `hover` were within 1.05:1 of the strips they tint (measured 1.028 and 1.045). The washes join `decorativeSurfaces` as a sixth `stateWash` surface (four roles × `background`/`card`/`popover`/`muted`), held to the same `decorativeFloor` (1.05:1) the divider and skeleton use, so the existing `decorative` report and the audit gate cover them with no new API. Twenty-eight values moved in one change: the base light `hover` `#E4E9F0`, `accent`/`selected` `iris[100]`, the base dark `hover` `#272D37` and `active` `#333A46`, the macOS light/dark hovers, the Linux light/dark hovers and both accents, the Windows light hover/active/accent, the Luna and Aero light accents and Aero's light selected/active, the high-contrast dark accent/selected, and the house/Aero brand examples' accent families; all still clear every text pair and boundary. `decorative.test.ts` gains the 16-placement coverage case and a broken brand whose `hover` is its `muted` strip, and both directions were measured (removing the placements fails both cases; reverting dark `hover` fails the sweep naming `Dark`). Docs in `docs/tokens.md` §Colour roles/§Decorative surfaces/§Verification, `docs/design-system.md` §8/§9, the package README and the `Contrast contract` inventory row.

`[x]` Measure the **filled action's resting surface** — `secondary` is the one filled variant with no brand colour and no border (`packages/primitives/src/core/variants.ts` paints `border: undefined`), so its fill is the whole button, and nothing measured it. It joins `decorativeSurfaces` as a seventh surface kind, `filledAction`, on the four strips a control can sit on (`background`/`card`/`popover`/`muted`) at `decorativeFloor` (1.05:1), so the existing `decorative` report and the audit gate cover it with no new API. **It found a shipped alias and nine style misses**: the base light theme shipped `secondary` as the `muted` value (`#EEF1F5`, 1.000:1), so a secondary button inside a muted toolbar was a label with no button around it; macOS light's window sat 1.015:1 from it, Linux light 1.040:1, Windows light 1.021:1, and the dark macOS/Windows/Luna/Aero palettes landed at 1.021–1.049:1 on their lighter popovers. The base light `secondary` is now `neutral[200]` `#E1E5EC` (one step above `muted`), its `active` wash `#D6DBE4` (so a resting control is not the value of a pressed ghost) and `borderStrong` `#75808F` (the new fill had taken the boundary pair to 2.95:1; it now clears 3.17 on `secondary` and 3.54 on `muted`), and each `darwin` set, all three dark sets and both authored looks own their control face. `decorative.test.ts` gains the four-placement coverage case and a broken brand whose `secondary` is its `muted`, both measured failing before the fix, and `decorative.example.ts` ships that brand as `flatActionBrand` so the documented call site reports the line; the shipped and platform sweeps fail when a face is reverted (measured: removing darwin dark's `secondary` fails `passes every platform style in both modes`; restoring light `secondary` fails three cases by name). Docs in `docs/tokens.md` §Colour roles/§Action fills/§Decorative surfaces/§Platform styles/§Verification, `docs/design-system.md` §7/§8/§9, the package README, the platform chrome table and the `Contrast contract` inventory row. The `outline` variant's own edge is the interlock row below.

`[x]` Measure the **invalid state's edge** — validation failure swaps a control's border and its `focusVisible` line to `destructive` (`keyboardFocusRing(theme)` with the invalid colour in `packages/components/src/internal/theme.ts`, each primitive's `controlRing`), and every contract left it unmeasured on the surfaces it is painted on: `destructive` was a mark on the page, card, popover and `muted` strips, and the six strips a control sits on were covered by no pair at all for this role. Two pairs joined `contrastPairs` (55 → 57) — `destructive` on a field's own fill (`input`) and on a filled panel (`secondary`), the two strips the mark contract does not reach — both at `contrastFloors.boundary` (3:1; 4.5:1 high contrast), so the existing `contrast` report and the audit gate cover the edge with no new API. No palette moved: every shipped, high-contrast, platform and authored theme already cleared the floor, the tightest being Windows XP Luna's dark `secondary` at 3.26:1. `contrast.test.ts`'s `the invalid state's edge` suite holds the coverage jointly with `indicatorRoles`/`indicatorSurfaces` (so neither contract may drop the role and leave the surface unmeasured), reports an invalid edge painted in the field's own fill (1.00:1 by name) and sweeps all six strips in the four colour sets. Four directions measured: removing the two pairs fails the coverage case with `[ 'input', 'secondary' ]` and the brand case with `undefined`; the sweep fails when a theme's `destructive` matches a strip. **It also found a real defect the contract cannot rescue**: `FIELD_INVALID` in `packages/primitives/src/recipe/index.ts` paints `aria-invalid:bg-destructive`, so an invalid field becomes a solid destructive box while its value keeps `inputForeground` — 3.31:1 light, 2.45:1 dark, 2.08:1 high contrast, placeholder 1.02:1 — and the components package's `FieldInput` already keeps the fill. Docs in `docs/tokens.md` §The invalid state, `docs/design-system.md` §8/§9, the package README and the `Contrast contract` inventory row; the primitives fix is the interlock row below.

`[x]` Correct the retracted **filled-hover** limitation — `docs/tokens.md` §Limitations said "the component packages still paint a translucent hover" and named `packages/components/src/internal/button.tsx`, which had already moved to `filledHover`/`filledPressed` (commit 90f98987); only `packages/primitives` still paints `hover:bg-primary/90` / `active:bg-primary/80`. The bullet now names the adopter and the remaining deviation, and `docs.test.ts`'s `filled action adoption claim` suite reads both sources: the components file must still paint the derived fill, the primitives recipe must still contain the translucent class, and the page must name the file that carries each. Three directions measured: restoring the retracted sentence fails by name, and dropping the primitives path/class fails the deviation case.

`[x]` Resolve an inventory citation at any depth — the design-system guard checked a cited test file only in a package root or directly under `src/`, so a real proof at `src/components/RadioGroup.test.tsx` (named as `RadioGroup.test.tsx` by the Target sizes row) read as missing and the package suite was red. The check now walks every package (skipping `node_modules`, `dist` and dot directories, and not following symlinks so the read-only `references` clone stays out) and matches a bare filename at any depth, while a genuine path still resolves. `inventory.test.ts` gains two cases: a nested filename resolves, and a fabricated one does not. Three directions measured — the old resolver fails the row case naming `Target sizes` and the nested case (`expected false to be true`), an always-true resolver fails the fabricated case (`expected true to be false`), and the walk passes with 1235 tests green.

`[x]` Measure the dim the runtime paints on every other focusable — `keyboardFocusDim` is on by default, so pressing Tab fades every other control's fill and text, and nothing measured it because `contrastRatio` refuses a translucent result. `keyboardFocusDimOpacity` records the share (`0.4`) measured from the `keyboard-focus-dim` window capture, not assumed: the dark `muted` fill `#222730` paints `#181C23` and the `foreground` text `#EEF1F5` paints `#6E7177` over that fill — both `blend(colour, behind, 1 - 0.4)`, and the text over the *dimmed fill* rather than the page, so the disabled fade's composite is the shared rule (`src/fade.ts`). `keyboardDimPairs` names the 32 placements (three filled actions, a field and its placeholder, a focusable row's own text, a selected row, on the four strips) and `keyboardDimFailures(theme, floor?)` measures them at `decorativeFloor` — the dim is a where-can-Tab-go cue, not a reading mode: the tightest shipped placement is Linux light's `primary` over a card at 1.27:1, which is the measured reason a control whose text must stay readable opts out with `keyboardFocusDim: false`. `focus-dim.test.ts` (9 cases) holds the capture values, all 16 shipped/platform/high-contrast/look themes, the erased label, the unmeasurable role and a caller's stricter floor; `design-system-docs.test.ts` holds the page to the exports. Docs in `docs/tokens.md` §The dim a control paints while Tab is elsewhere, `docs/design-system.md` §8/§9, the package README and a new inventory row. Directions measured: label over the page fails the capture case (`#696C72`), an empty report fails three cases, a 0.5 share fails the capture and the tightest placement, and dropping the selected placements fails the coverage case.

`[x]` Give **brand-coloured text** a measured colour — a link, a text action and a breadcrumb's current page are written in `primary`, which is a **fill** designed to carry `primaryForeground`: no contract measured the role as text (only the mark contract reads it, at the 3:1 a bar or dot needs), so a link passed every suite while unreadable. Measured, the fill role is under the 4.5:1 text floor on the six surfaces a link can sit on in most styles — the base light brand **4.30:1** on the `active` wash a pressed link tints behind itself, macOS dark **3.10:1** on `active` (3.81:1 on its popover), Linux light 3.44:1, Luna light 3.53:1, Aero light 3.83:1, and Windows XP's page 4.31:1. `brandText(theme, floors?)` returns the theme's own `primary` where it already reads (base dark, high-contrast light, Linux/Windows/Aero dark) and otherwise moves it toward the theme's `foreground` in 2% steps until the worst of `brandTextSurfaces` (background, card, popover, muted, plus the `hover` and `active` washes) clears `contrastFloorsFor(theme).secondary` — 4.5:1 default, 7:1 high contrast, so the high-contrast dark brand's 6.94:1 steps once. It stops at `foreground` and returns an unmeasurable brand unchanged rather than inventing a colour. `brand-text.test.ts` (12 cases) holds the premise by name, all 16 shipped, high-contrast, platform and authored themes on all six surfaces, opaque output, minimality, the channel move, the variant floor, a pale brand, an unpaintable and a translucent brand, the foreground cap and the executed example; both directions measured (returning the raw brand fails 6 cases, jumping to `foreground` fails 3). Docs in `docs/tokens.md` §Brand text, `docs/design-system.md` §3/§8/§9, the package README and a `COMPONENTS.md` row. Adoption is the interlock row below

`[x]` Hold a **theme's control heights** to the pressable floor — `targetSize` fixes 24px and `target.test.ts` held every *shipped preset* to it, but the gate a brand is told to run only asked for `> 0`: `extendTheme(lightTheme, { density: { controlHeight: { sm: 20 } } })` passed every report while every control built at that height — the library reserves no hit-area padding on top of `controlHeight` — became a target WCAG 2.2 SC 2.5.8 says a reader cannot reliably hit, and `docs/design-system.md` §6's claim ("a control built at a control height never needs extra hit-area padding") became false in silence. `NumberRule` gains `pressable` (finite, `>= targetSize.minimum`) and the `controlHeight` group is inspected with it, so the report — and `auditTheme.passed`, which already reads it — names the size: `numbers.test.ts` proves a 20px height reports `{group: "density", path: "controlHeight.sm", value: 20, rule: "pressable"}`, that the floor itself passes (which is why `compact` `sm` at exactly 24 still ships), that only the sizes a shrunken density puts under it are reported, and that a brand whose only defect is a 20px height fails the gate with every colour report empty. No palette or metric moved. Docs in `docs/tokens.md` §Numbers/§Target sizes, `docs/design-system.md` §6, the package README and the `Token numbers`/`Target sizes` rows; `design-system-docs.test.ts` fails if the page drops the rule. Three directions measured: reverting the rule to `positive` fails four cases by name, deleting the page's sentence fails the docs guard, and a `radius.lg` below `radius.md` fails the new shipped-scale ordering case. Same commit adds the missing hierarchy guards for the shipped **radius, border and icon** scales — `scale.test.ts` only ordered spacing, density and avatars, so an inverted radius or icon step could ship.

`[x]` Measure a **bordered control's edge on the wash it tints** — `borderStrong` was held to 3:1 on the surfaces a control *rests* on, and the second action changes its fill the moment a pointer arrives: `packages/components/src/internal/button.tsx`'s `secondary` variant paints `borderColor: borderStrong`, then hands the same element to `hover`/`active` as its background, so its edge sits on the wash — a strip no pair measured. Two pairs joined `contrastPairs` (57 → 59) at `contrastFloors.boundary`, and they found four shipped misses: the base light theme's pressed secondary at **2.88:1**, the base dark theme's at **2.86:1**, high-contrast dark at **4.15:1** against its own 4.5 floor (the default floors called it a pass), and Linux light at **2.96:1** hovered and **2.77:1** pressed. The four `borderStrong` values moved the least distance that clears every strip — `#727D8C` (was `#75808F`), `#788494` (`#748091`), `#A7A7A7` (`#A0A0A0`) and Linux light's `#7E7C79` (`#84827E`) — and every pair they already carried still clears its floor (the tightest is the base light edge on `active` at 3.01:1). `contrast.test.ts`'s boundary suite now requires `hover` and `active` in its coverage, reports both pre-fix values by name (`2.88` at the default floor, `4.15` at the high-contrast one), and reports a brand whose edge equals its own wash at 1.00:1; `color.test.ts` and `platforms.test.ts` enumerate the pair table per theme, so reverting a value fails by name (`light: borderStrong on active meets 3:1`, `linux light: borderStrong on active meets 3:1`) and the audit sweep fails too — measured both ways. `catalogue-values.test.ts` named the four stale printed cells before the pages moved. Docs in `docs/tokens.md` §Contrast/§Action fills, `docs/design-system.md` §7/§9 and the `Contrast contract` row.

`[x]` Decide what carries a **field** — `docs/design-system.md` §7 claimed `borderStrong` is the boundary "input and control boundaries" draw while both shipped painters rest on the decorative `border` role, and §8 plus `docs/tokens.md` still said the primitives' field recipe paints a destructive **fill** behind the value, which stopped when `FIELD_INVALID` became `aria-invalid:border-destructive` (`c193954e`). **Decision: the edge carries a field, not its fill** — a field sits on the page, a card, a popover and a `muted` toolbar, and in the light palettes the page (`#F6F8FA`) and a card (`#FFFFFF`) are only 1.06:1 apart, less than the perceptibility floor applied twice, so no fill can be seen against both (light `input` is `#FFFFFF`, the same value as `card` and `popover`). Both pages now state the rule, the measured reason and the shipped deviation (`fieldVariant` and `FieldInput` paint `border`, 1.19:1 on the light page, and reach `borderStrong` only on hover), and retract the destructive-fill claim. `field-boundary.test.ts` (5 cases) reads the two painters: adopting `borderStrong` fails until §7's deviation sentence moves, restoring `aria-invalid:bg-destructive` fails by name, a page that stops naming the file it describes fails, and each printed ratio (1.06, 1.00, 1.19, 1.26, 3.31) is held to `contrastRatio`. Four directions measured — deleting the deviation sentence, adopting `borderStrong` in both painters, restoring the invalid fill, and changing the printed resting-edge ratio each fail the named case. Docs in `docs/tokens.md` §Contrast/§The invalid state/§Limitations and `docs/design-system.md` §7/§8. Adoption is the interlock row below

`[x]` Hold a **type role's leading to its own size** — `invalidNumbers` checked that a type size and a leading were finite and positive, and never that the two numbers meant anything together: a type scale computed from a factor (`lineHeight: size * 0.7`) keeps every value finite and positive while the next baseline starts inside this line's glyph box, so consecutive lines collide and every suite stayed green. `NumberRule` gains `leading` — the one rule about two tokens, applied where the pair sits together in `inspectType`, so a zero or non-finite leading is still reported once as `positive` rather than twice — and `auditTheme.passed` reads it through the existing `invalidNumbers` report, so no gate shape, count or docs-site readout changed. `numbers.test.ts` (28 cases) proves the report by name, accepts a leading exactly equal to the size (lines touch, they do not overlap), proves the single-report rule for an unusable leading, holds every shipped role above the floor, and executes the new `crushedTypeTheme`/`crushedTypeAudit` in `numbers.example.ts`. Four directions measured: dropping the comparison fails 4 cases by name, a shipped `body` leading of 12 fails the 16-theme sweep and the scale case, a catalogue row that drops the rule fails the docs case, and a design-system sentence without it fails the prose case. Docs in `docs/tokens.md` §Numbers (the rule table, the reason, and a snippet whose report is the one the code returns), `docs/design-system.md` §9/§10, the package README and the `Token numbers` row

`[x]` Measure a **disabled label in the group strip it sits in** — the disabled pairs covered its own `disabled` fill and the three page surfaces, and a disabled control also sits inside a toolbar (`muted`) and a segmented panel (`secondary`), where the base light `disabled` fill *is* the `muted` value: the label has no fill of its own and the strip is its only background. Two pairs joined `contrastPairs` (59 → 61) at `contrastFloors.disabled`, and no palette moved — every shipped, high-contrast, platform and authored theme already cleared the floor. The least headroom in the whole set is now Linux dark's label on its `secondary` panel at 1.56:1 (0.06 above the floor); the page placements' tightest is still its popover at 1.76:1. `contrast.test.ts`'s `disabled text` suite holds the six-placement coverage, reports a brand whose label matches the toolbar strip by name, and computes the tightest placement over all 16 themes against the number `docs/tokens.md` prints; `design-system-docs.test.ts` now derives the row's surface list from `contrastPairs`, so a pair the contract gains cannot go unprinted. Directions measured: removing the two pairs fails the coverage and brand cases, a theme whose `disabledForeground` lands on its `secondary` strip fails the tightest case (`expected '1.11' to be '1.56'`), and the catalogue's printed count falling back to 59 fails `docs.test.ts`. Docs in `docs/tokens.md` §Contrast/§The disabled floor, `docs/design-system.md` §9 and the `Contrast contract` row

`[x]` Decide the **faded control on a card** — `disabledFadePairs` holds the three filled actions on the page and a field on `background`/`card`/`popover`, and a fade's composite depends on the strip its fill is faded over. Measured while closing the disabled-label strip coverage (2026-10-22): the same faded `primary` label lands at **1.47:1** on Linux light's card, 1.48:1 on Windows XP (Luna), 1.49:1 on Windows 7 (Aero) and 1.49:1 on macOS light — under the 1.5:1 floor the gate applies on the page. Adding those placements would fail the shipped themes' own audit (measured: three cases red, the sweep naming `Light · macOS`), and darkening six light `primary` fills to satisfy a mechanism the design system calls the deviation is the wrong trade. **Decision: the fade is a page mechanism for a filled action, and the role pair is the off-page paint.** `disabledFadePairs` keeps the three filled actions on `background` only, and `disabledAction(theme)` returns the neutral paint — `backgroundColor: colors.disabled`, `color: colors.disabledForeground` — so a disabled action on a card, a popover or a group strip is the pair `contrastPairs` already measures there instead of a composite nothing checks; a field keeps fading on all three content surfaces, because its fill is `input` and the faded label clears the floor on each. `disabled.test.ts`'s `the fade's page scope` suite holds the page-only table, the four measured card ratios (a palette that fixes the card fails with the new numbers), the replacement's floor in all 16 shipped/platform/look themes and the example's fourth state (`styles.test.ts`); `docs.test.ts` derives the printed 1.47–1.49 range from the same computation and reads both pages, and `action-states.example.ts` spreads the paint as the disabled state. Directions measured: adding the card placement fails the page-only case and the audit sweep; painting the action's own fill fails both the replacement and the example case; a changed printed range fails the docs case. Docs in `docs/tokens.md` §The fade a disabled control paints, `docs/design-system.md` §8, the package README and the interlock row that now carries the scope and the paint

`[x]` Hold a **row height** to the pressable floor — `invalidNumbers` held `controlHeight` to `targetSize.minimum` (24px) and held `rowHeight` to merely finite and `> 0`, but a `dense` list row is built at exactly `density.rowHeight` (`packages/components/src/list.tsx`) and that row takes a `tabIndex`, a press, a hover wash and the keyboard ring — so `extendTheme(lightTheme, { density: { rowHeight: 20 } })` passed the gate with every colour report empty while every dense list row shipped a 20px target WCAG 2.2 SC 2.5.8 says a reader cannot reliably hit. `rowHeight` now takes the same `pressable` rule (no API change, no reports added), which is why the type already had one rule for the box a pointer presses. `numbers.test.ts` gains `a row height a pointer cannot reach` (the 20px report by path and rule, the floor itself passing, the shipped presets clearing it, and the gate failing with no colour report involved), the existing `-1` case moves from `positive` to `pressable`, `squatDensityTheme` shaves its row so the documented example walks the new rule, `target.test.ts` sweeps every preset's row height and `scale.test.ts` holds the same ordering guard to the floor. Docs in `docs/tokens.md` §Numbers (the rule table, why a row is a box, the snippet's real report), `docs/design-system.md` §6/§9/§Target sizes, the package README, and the `Token numbers`/`Target sizes` inventory rows. Directions measured: reverting the rule to `positive` fails five cases by name, removing the page's row sentence fails the design-system case, and rewording the catalogue's row cell fails the catalogue case. **The guard itself was measured too** — the first version asserted `expect(regex.exec(doc)).toBeDefined()`, which passes for `null`; it now reads the match's text, and the removed-sentence direction above is the proof.

### Playground and native smoke (`apps/playground`, `packages/testing`)

`[x]` `[██████████]` 53/53

`[x]` Land the `a11y-tree` headless scenario and measure **what assistive
      technology is told** — the library documents `aria-description`, an
      `aria-selected` row, a dialog role and a roving tree, and nothing had ever
      read the tree those claims are about: `paintedText` cannot see an
      attribute and a window's automation protocol has no a11y verb. The
      offscreen renderer's `getA11yTree()` is now a host verb:
      `@gpuixui/testing` decodes its dump into `Smoke.A11yTree`/`A11yNode`
      (`Schema`, Options, ephemeral node keys flattened), the port types the raw
      dump `unknown` because the pinned `index.d.ts` says `string` while the JS
      returns the parsed object, and a dump that does not decode reports `null`
      rather than an empty tree (`native.test.ts`, 2 new cases). Measured on
      0.11.0: the ARIA token becomes the **platform's role name** (`button` →
      `Button`, `option` → `ListBoxOption`, `heading` → `Heading`,
      `progressbar` → `ProgressIndicator`); `aria-label`/`aria-description`/
      `aria-id` reach `label`/`description`/`author_id`;
      `aria-selected`/`aria-expanded`/`aria-level`/`aria-valuetext` reach
      `selected`/`expanded`/`level`/`value`; `onClick`+`tabIndex` surface as the
      `Click` and `Focus` actions; a `<text>` is a `Label` with its content; and
      **a node needs a role to exist at all** — a div carrying only an
      `aria-label` paints no node and `role="none"` is dropped. 19 checks,
      `--only a11y-tree`, green on 0.11.0; full headless suite re-run 38/38. Two
      negative controls measured (dropping the button's `role`: `the tree
      describes "Save project" — expected a value, got none`; dropping its
      `aria-description`: `aria-description reaches the tree — expected "Writes
      the file", got ""`, exit `1` each). Evidence:
      `apps/playground/README.md` §The accessibility tree

`[x]` Land the `dock-reflow` headless scenario and measure **the re-clamp signal
      a dock needs** — `docking-nested` pins a fixed-width split because a
      split's `max` is the caller's number and an inner split does not re-clamp
      when its parent shrinks, and the stated way out ("a dock passes its own
      bounds", via `onLayout`) had never been measured: an `onLayout` that fired
      only for the first paint would make the workaround useless. A 560px row of
      a 120px sidebar, a flexible centre and a fixed 100px inspector; `Widen
      sidebar` takes 100px from the centre. Measured on 0.11.0: the commit's
      layout pass arrives **before** the new width applies and reports the box
      the pane still has (`w=340 reports=2`); the settled pass reads `w=240` on
      the next frame and equals the pane's painted `bounds`; the 100px inspector
      keeps its box and **still receives a report** (its count reaches 2); and
      narrowing reports the original 340 again. So the signal exists, but a
      report is not a "you changed" event — a stale pass arrives first and an
      unchanged pane is reported to — so a re-clamp acts on the width the payload
      carries and is idempotent. 12 checks, `--only dock-reflow`, green on
      0.11.0 (the counts behind it re-run three times); full headless suite
      re-run 37/37. Two negative controls measured (a centre that does not flex:
      `the widened sidebar shrinks the centre by exactly what it took — expected
      240, got 289`; dropping the inspector's `onLayout`: `a pane that kept its
      box still got a report — expected 2, got 1`, exit `1` each). Evidence:
      `apps/playground/README.md` §Dock reflow

`[x]` Land the `virtual-list-expand` headless scenario and measure **a row that
      expands while it is painted** — `virtual-list-rows` measured rows of
      different heights and a row that grows *outside* the window, so the case
      an expandable row (Tier 3, and an expandable table row in a data grid)
      needs was unmeasured: the reader presses an on-screen row, its detail
      opens, and the layout below must follow with no scroll to prompt a
      re-measure. 200 rows of 32px with row 3 opening to 32 + 88px: the painted
      row re-measures on the next frame (120px) with no offset change, the rows
      above do not move, and the list — which paints whole rows only — leaves
      24px of its 240px viewport, so the row below drops out of the painted
      window until one wheel repaints it at `row 3 + 120`, where a press selects
      it. Collapsing returns the pitch and unpaints the detail; `scrollToItem(150)`
      with the row open lands that row on the viewport's top edge (the growth
      joined the estimate, so a reveal is not 88px out); and the opened row keeps
      its 120px after leaving the window and returning. 18 checks,
      `--only virtual-list-expand`, green on 0.11.0; full headless suite re-run
      36/36. Two negative controls measured (an expansion that does not change
      the row's height: `the expanded row re-measures without a scroll — expected
      120, got 32`; a 56px detail that leaves a whole row free: `the row below
      leaves the painted window until the reader scrolls — expected true, got
      false`, exit `1` each). `expand-fixture.test.ts` (3 cases) guards the
      geometry those checks depend on — a changed `DETAIL` fails
      `leaves less than one row of viewport below the grown row`. Evidence:
      `apps/playground/README.md` §An expanded row

`[x]` Land the `data-grid-frozen-column` headless scenario — the runtime has no
      sticky, and a frozen first column is the header rule on the other axis: its
      own vertical scroller beside the grid's, kept in step by the app. A 120px
      label pane and a 240px grid over 60 × 28px rows: both panes start at `0`
      with row 0 at the same `y`; a wheel over the grid moves both to `-300` and
      a wheel over the frozen column moves both to `-600` (a two-way
      `onScrollChange` → `scrollTo` mirror, guarded by a ref because `scrollTo`
      paints synchronously); the row under the reader shares its `y` across the
      panes; a `deltaX` wheel moves the grid's row 200px left and leaves the
      frozen column where it is; a press on a frozen cell selects the row for the
      whole grid; and a `-10000` wheel clamps both at `-1440`. 25 checks,
      `--only data-grid-frozen-column`, green on 0.11.0; full headless suite
      re-run 35/35. Two negative controls measured (dropping the grid → frozen
      mirror: `the frozen column follows the grid — expected -300 ± 1, got 0`;
      dropping the grid's `overflowX`: `a horizontal wheel pans the grid —
      expected -200 ± 2, got 0`, exit `1` each). Evidence:
      `apps/playground/README.md` §A frozen data-grid column

`[x]` Land the `virtual-list-rows` headless scenario and measure **variable row
      heights** — every virtual-list probe declared fixed rows, so "rows do not
      need equal heights" was the runtime's claim, and a table with a wrapped
      description, a tree with a two-line label or an expandable row depends on
      it. 400 rows cycling 24 / 48 / 72px: the first three paint at exactly those
      heights and each starts where the previous ended; `scrollToItem(150)` lands
      that row at the viewport's top edge with its own height even though the
      rows above it were only estimated; growing row 0 by 40px while the reader
      sits at row 150 leaves both the painted rows **and** the offset untouched,
      because a row outside the window is not remeasured until it paints again;
      and after `Back to top` row 0 paints 64px with row 1 moved down by the
      growth. 15 checks, `--only virtual-list-rows`, green on 0.11.0; full
      headless suite re-run 34/34. Three negative controls measured (a uniform
      32px row: `the first row keeps its declared height — expected 24, got 32`;
      ignoring the grow: `the grown first row paints its new height — expected
      64, got 24`; dropping the reveal's `scrollToItem`: `the revealed row is
      painted — expected a string containing "Row 150"`, exit `1` each).
      Evidence: `apps/playground/README.md` §The virtual list's variable rows

`[x]` Land the `virtual-list-windowed` headless scenario and measure
      `<virtual-list>`'s **itemCount** mode — every other probe used the children
      form, where React and the retained tree hold all rows and only build/paint
      are skipped, so nothing supported a table of 100 000 rows. A 60-row window
      over 100 000 stated rows: `wrow-0`..`wrow-59` are retained and `wrow-60` is
      not, row 59 is mounted but unpainted (the estimate positions it), every
      painted row sits inside the mounted window, two `-560` wheels move the
      list's own offset and `onVisibleRange` reports **absolute** indices
      (`20..27`) rather than window offsets, the handler's window move keeps the
      paint covered, a press reports the row's absolute index, and
      `Reveal 90000` paints `File 90000` with the offset at `-90000 × 28`
      (within one row) while the previous window leaves the tree. Measured rule:
      the range event lags the paint by one gesture here too (event `20..27`
      while the paint reached `40..46`), so the window must exceed viewport +
      overdraw; a reveal moves the app window first, then calls `scrollToItem`.
      22 checks, `--only virtual-list-windowed`, green on 0.11.0; full headless
      suite re-run 33/33. Two negative controls measured (dropping the reveal's
      `scrollToItem`: `the revealed row is painted — expected a string
      containing "File 90000", got "…"`; mounting one row past the window:
      `the row after the window is never mounted — expected true, got false`,
      exit `1` each). Evidence: `apps/playground/README.md` §The windowed
      virtual list; the docs-site capability row is the interlock below

`[x]` Land the `pointer-capture` live probe and settle what a drag control may
      rely on — GPUix arms pointer capture on left mouse down **only** for an
      element that listens to both `mouseDown` and `mouseMove` (`renderer.rs`'s
      `capture_pointer`), so a splitter, drag handle and the shipped `Slider`
      keep receiving moves after the pointer leaves their box, while a
      move-only element does not and the element under the pointer receives
      them instead. The probe mounts both cases side by side and drags each
      120px onto a sibling (`both=8 bothUnder=0 bothUp=1`; `move=1
      moveUnder=8`), then drags the shipped `Slider` 60px right and 120px down
      off its track (`slider=66 sliderChanges=9`) and the shipped `RangeSlider`
      the same way (`[10, 30]` → the nearer end follows the pointer to ~65 while
      the other thumb stays at 10, so the range's drag is measured on the range
      rather than inferred from the single slider). 6 checks, `--only
      pointer-capture`, green on 0.11.0; negative control measured (removing
      the sample's `onMouseMove` so capture is not armed: `both=0
      bothUnder=8 bothUp=0`, exit `1`). The probe retracted the "no pointer
      capture" claim the primitives docs and the `AsyncSmokeHost.drag` comment
      made, and both halves now cite it — the interlock row below records the
      retraction and its headless twin. Evidence: `apps/playground/README.md`
      §`pointer-capture`, `.artifacts/live/pointer-capture.png`

`[x]` Measure the modal **Tab trap in a window** — `dialog-lifecycle` now presses
      Tab six times inside the shipped `Dialog`: the focus never names
      `dialog-trigger`, reaches the probe's two fields and cycles back to the
      first (the surface is `tabIndex: -1`, so it is not a stop itself);
      Shift-Tab stays inside too. A control run with the dialog closed proves the
      same focused-id read names the trigger, so a leak could not hide. 19
      checks, `--only dialog-lifecycle`, green on 0.11.0. The built-in top-right
      close control is left unnamed, so one reading is `none` — the assertion is
      that the trigger is never reached. Evidence: `apps/playground/README.md`
      §`dialog-lifecycle`.
`[x]` Land the `tooltip-lifecycle` live probe and the `hover` verb behind it —
      the shipped `Tooltip` measured in a window: hover opens it above its
      trigger (`side="top"`, overlapping horizontally), leaving closes it after
      the runtime's 80ms timer, a second hover reopens it and Escape dismisses
      it while the focus stays on the trigger. It also measures the gap the
      components workstream owns: a `Tab` traversal focuses the trigger but the
      tip stays closed, because the runtime does not deliver React's `onFocus`.
      12 checks, `--only tooltip-lifecycle`, green on 0.11.0; negative control
      measured (the trigger without the `Tooltip` wrapper fails
      `a hover opens the tip with its own content`, `expected true, got false`,
      exit `1`). `AsyncSmokeHost.hover(testId)` drives the automation protocol's
      real pointer move; the box comes from the content's own `onLayout` because
      the automation tree does not address a tooltip's layer by `testId`
      (recorded in the README). Evidence: `apps/playground/README.md`
      §`tooltip-lifecycle`, `.artifacts/live/tooltip-open.png`.
`[x]` Land the flipped `tabs-lifecycle` probe after the `Tabs` fix — the first
      arrow now moves off the traversal's trigger (`tabs-reports changes=1`) with
      `focuses=0` still asserted, because that runtime gap is what the
      key-origin anchor compensates for; the rest of the sequence
      (`tabs-archive`, Home/End, a press) follows the same counts. 27 checks,
      `--only tabs-lifecycle`, green on 0.11.0; the old expectation failed
      (`expected "tabs-overview", got "tabs-reports"`, exit `1`). README
      §`tabs-lifecycle` records the fix and the retained measurement.
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
`[x]` Land the `drag-between-panes` live probe and the `AsyncSmokeHost.drag`
      verb behind it — a cross-pane drag in a real window: the item records the
      press, the pane under the pointer counts the travel and resolves the
      release, and item → right pane and back are both asserted (`drops=1`, then
      `drops=2`). Measuring it found a window-only **timing** rule: the protocol
      delivers press, eight moves and release before React commits the press's
      render, so a drag gated on `dragging` state never starts — the flag must be
      a ref. `packages/testing`'s `AsyncSmokeHost` gained `drag(testId, deltaX,
      deltaY)` over the automation protocol's real drag (`pressedButton` set on
      each move). Green on 0.11.0 (`--only drag-between-panes`); negative control
      measured (forcing the release's side to `left`: `expected a string
      containing "zone=right", got "zone=left leftMoves=3 rightMoves=4 drops=1
      dragging=false"`, exit `1`). The pointer-capture limit documented on
      `Slider` applies: the drop target needs its own listeners.
`[x]` Land the `file-drop` headless scenario and `SmokeHost.fileDrop` — the
      renderer's own `nativeSimulateFileDrop` dispatches the same
      `FileDrop::Entered`/`Submit` pair a Finder drag produces, so the scenario
      proves `onFileDrop` receives `/tmp/alpha.txt` and `/tmp/beta.txt` in order
      (`drops=1`), and a drop on a sibling element reaches no handler (`drops=1`
      unchanged). The host verb aims at the centre of the nearest painted
      ancestor, held by a fake-renderer test (`drop 100,50
      /tmp/alpha.txt,/tmp/beta.txt`; 47 tests in `packages/testing`). Green
      (`--only file-drop`); negative control measured (aiming the outside drop
      at the zone: `drops=2`, exit `1`). A **live** file drop is not automatable:
      the window protocol has no file-drop command and the OS drop needs Finder;
      the headless renderer is the measured path.
`[x]` Land the `tab-overflow` scenario and measure the reveal a tab strip owes a
      clipped selection: two identical eight-tab rails (320px viewport, 640px of
      tabs) — the plain one keeps `x = 0` after `End` selects the off-screen tab
      (the runtime does not reveal a selection), the revealing one calls the
      tab's `scrollIntoView()` and lands at `x = -320` with the tab wholly
      inside the rail. The same probe measures the limitation: with the tabs
      inside a flex row, `scrollIntoView()` reaches only the row (`x = -1`), so
      tabs must be **direct children** of the `overflowX` scroller. 10 checks,
      `--only tab-overflow`, full suite 30/30 green on 0.11.0; two negative
      controls measured (dropping the reveal fails `scrollIntoView moves the
      rail left`; a 720px rail fails `the last tab starts past the rail's right
      edge`, exit `1` each). Evidence: `apps/playground/README.md` §Tab overflow
`[x]` Land the `drag-autoscroll` scenario and settle the drag backlog's last
      question: a drag that rests in a scroller's edge band does **not** move it
      (the plain rail's offset stays `0` across eight moves), so auto-scroll is
      caller-driven — the probe's `onMouseMove` reads the rail's own
      `getElementBounds`, tests the 24px band and calls
      `renderer.scrollTo(id, 0, offset - 16)`, reaching `moves=8` and `y = -128`.
      Measuring it found an ordering rule: `scrollTo` paints synchronously, so a
      state write after it is not committed when the drag returns (the probe now
      increments first and keeps the offset in a ref). 6 checks, `--only
      drag-autoscroll`, full suite 31/31 green on 0.11.0; two negative controls
      measured (handler off: `moves=0`; the plain rail given the handler:
      `expected 0, got -128`, exit `1` each). Evidence:
      `apps/playground/README.md` §Drag auto-scroll
`[x]` Land the `scroll-lifecycle` live probe — the window's own scroll path,
      which no probe covered: the wheel is **hit-tested** (a wheel over a
      sibling leaves the strip at 0 and fires no `onScroll`), `-200` moves the
      strip by its own delta and both events report it, a huge positive wheel
      clamps at 0, the last row's `scrollIntoView` lands at the content's end
      (`-760`, and the row is wholly inside the viewport), and a huge negative
      wheel clamps there. 20 checks, `--only scroll-lifecycle`, green on
      0.11.0; two negative controls measured (no `overflow: "scroll"`:
      `the scroller reports a scroll offset: expected a value, got none`;
      expected end `-700`: `expected -700 ± 1, got -760`, exit `1` each).
      `AsyncSmokeHost` gained `wheel(testId, dx, dy)` (the protocol locator aims
      at the painted centre) and `scrollOffset(testId)`; the README records the
      measured split between `onScroll`'s input delta and `onScrollChange`'s
      clamped pair. Evidence: `apps/playground/README.md` §`scroll-lifecycle`,
      `.artifacts/live/scroll-end.png`
`[x]` Land the `split-pane-lifecycle` live probe and fix the window-only resize
      defect it found — the playground's `SplitPane` in a real window: a press on
      the divider, `+80` grows the pane to 400 (state and painted width agree),
      all 8 drag moves reach the divider although it is 6px wide, `-320` clamps
      at 80, `+600` clamps at the caller's 520, and a drag on the pane itself
      resizes nothing. The press was React state, so a window's press + 8 moves
      all arrived before the press's commit and the pane never followed;
      `SplitPane` holds it in a ref (the `drag-between-panes` rule). 12 checks,
      `--only split-pane-lifecycle`, green on 0.11.0; negative control measured
      (press back in state: `a drag grows the pane by its travel: expected
      "split=400", got "split=320"`, exit `1`). Headless re-run
      `--only panel-resize --only docking-nested --only workspace-tab-drag`
      green (3/3). Evidence: `apps/playground/README.md`
      §`split-pane-lifecycle`, `.artifacts/live/split-resized.png`
`[x]` Land the `virtual-list-lifecycle` live probe — 5 000 fixed 32px rows in a
      280px viewport, read through `getPaintedText`: the first row paints, the
      last of 5 000 does not, fewer than 40 row lines exist, and **no** range is
      reported before the first scroll. A wheel then moves the painted window
      (rows 13–21 in the capture) and fires one `onVisibleRange` that still
      carries the pre-scroll range (`first=0`); a second scroll's report catches
      up. Measured gap: the event **lags one scroll**, so a table must read the
      painted window (as `virtualized-table` already does). Also measured:
      `<virtual-list>` reports no painted bounds, so the wheel is aimed at the
      frame it fills. 10 checks, `--only virtual-list-lifecycle`, green on
      0.11.0; negative control measured (handler dropped: `the first report
      still starts at the first row (measured lag): expected true, got false`,
      exit `1`). Evidence: `apps/playground/README.md`
      §`virtual-list-lifecycle`, `.artifacts/live/vlist-scrolled.png`
`[x]` Land the `window-shortcut-lifecycle` live probe — the app-level key path a
      command palette or application menu needs: the **live runner** now installs
      the window handler once (`render({ onKeyDown })`) and forwards to whatever
      the mounted probe registered with `useWindowKey`, the same seam the shell
      uses. `cmd-k` reaches it, opens the palette (`open=true last=cmd-k`) and
      paints it; `Escape` closes it; after a press moves the focus to a control
      with no key handler, `cmd-k` still opens it. 6 checks,
      `--only window-shortcut-lifecycle`, green on 0.11.0; negative control
      measured (the runner's `onKeyDown` forwarding dropped: `cmd-k reaches the
      window handler: expected "open=true last=cmd-k", got "open=false
      last=none"`, exit `1`). Evidence: `apps/playground/README.md`
      §`window-shortcut-lifecycle`, `.artifacts/live/shortcut-open.png`
`[x]` Land the `context-menu-lifecycle` live probe and the `rightClick` host verb
      behind it — the one overlay whose opening input is a **right press**, which
      no window probe had produced (the headless suites synthesise the aux click
      themselves). Measured on 0.11.0: a primary press opens nothing; a right
      press on the trigger opens the shipped `ContextMenu` at the **press point**
      on both axes and the surface takes the focus; arrows move real focus row by
      row and `Enter` runs the row; `Escape`, an outside press and activation all
      unpaint it; a pointer-opened menu leaves the focus `none`, while the
      `Shift+F10` route places the surface at the trigger's own bounds and hands
      the focus back on dismiss; a right press on a sibling opens nothing and
      dismisses an open menu without opening a second one. 24 checks,
      `--only context-menu-lifecycle`, green; negative control measured (primary
      press: `expected a string containing "opens=1", got "opens=0 closes=0
      last=none"`, exit `1`). `AsyncSmokeHost` gained `rightClick` over the
      protocol's button-2 press (`host.ts`'s `rightPress`), held by a unit test
      so a primary-button regression cannot turn the probe into a no-op. Evidence:
      `apps/playground/README.md` §`context-menu-lifecycle`,
      `.artifacts/live/context-open.png`
`[x]` Land the `motion-geometry` live probe — the runtime's `motion` measured on
      **painted geometry**, which no window probe had done although Tier 3's
      "expandable rows" (`motion` height) and Tier 4's "collapsible sidebars"
      (`motion` width as an outer clipping box) both name it. A 120×40 box tweens
      to 240×240: eight heights ~50ms apart read
      `40, 43, 117, 123, 221, 240, 240, 240` (a tween, not a jump), the box lands
      exactly on 240×240, `onMotionComplete` fires once, the reverse run tweens
      too (`240, 240, 167, 63, 59.5, 40, 40, 40`) and lands back on 40 with
      `completes=2`. A fixed 320×200 child keeps its size while the box is
      120×40 and while it is 240×240, so a collapse animates the **outer** box
      and clips instead of reflowing the content — the Tier 4 claim, now
      measured. 35 checks, `--only motion-geometry`, green three runs in a row
      inside a three-probe selection; negative control measured
      (`transition={{ duration: 0 }}` fails
      `the growth paints a frame between the two sizes`, exit `1`). Two probe
      rules came out of it and are in the README and the steps' header: a
      screenshot stalls the animation clock (a capture between the press and the
      samples made the box read `240, 238, 40, 40` until the captures moved
      after the sampling), and a probe must settle ~800ms after mounting — run
      behind another probe's capture, the growth's intermediate frames were
      missed until it did. Also measured: `duration` is not a wall-clock promise
      (the same 200px travel sampled as a ~100ms step, a ~250ms tween and a
      ~400ms sweep), so a component drives its next step from
      `onMotionComplete`, never a timer. Evidence: `apps/playground/README.md`
      §`motion-geometry`, `.artifacts/live/motion-grown.png`

`[x]` Land the `select-lifecycle` live probe — the runtime's own `Select` was
      the one overlay surface no window had painted, although `COMPONENTS.md`
      rests its "open state, positioning and dismissal are the runtime's" claim
      on `TestRenderer` cases alone. The probe mounts the runtime's parts
      (`@gpuix/react/select`) rather than the shipped wrapper, because
      `SelectProps` carries one root `testId` and the trigger and rows paint
      nothing a locator can address (the interlock row below). Measured: the
      list is absent at rest, one press paints it in its own layer one 6px gap
      below the trigger on its start edge and moves the focus **into** it, a
      press on a row selects it and repaints the trigger's label, the list opens
      on the selected row so one arrow moves the highlight and `Enter` selects
      the row it landed on, an arrow from the last enabled row wraps past the
      disabled one, `Escape` unpaints without choosing and gives the focus back
      to the trigger, an outside press reaches its target and dismisses without
      choosing, a second trigger press closes, a disabled row changes nothing
      and leaves the list open, and a disabled select ignores the press. 26
      checks, `--only select-lifecycle`, green on 0.11.0; two negative controls
      measured (dropping `sideOffset`: `expected 6 ± 1, got 0`; enabling the
      disabled row: `expected "value=daily changes=3", got "value=archived
      changes=3"`, exit `1` each). Evidence: `apps/playground/README.md`
      §`select-lifecycle`, `.artifacts/live/select-open.png`,
      `.artifacts/live/select-picked.png`

`[x]` Land the `clipboard-lifecycle` live probe — the binding publishes **no
      clipboard API** (no read, no write in `index.d.ts`/`host.d.ts`), so the
      only clipboard a desktop surface can reach is the platform's own text
      action inside a focused field. The probe mounts two shipped `Input`s and
      drives select-all → copy → paste → cut with real keys, against a marker
      **unique to each mount** (a fixed string would pass on the previous run's
      clipboard) and a `cmd-k` control that proves the window seam works. 9
      checks, `--only clipboard-lifecycle`, green twice on 0.11.0; negative
      control measured (dropping `cmd-c`: the paste reports the previous run's
      marker, `expected "gpuix clipboard q6uuii", got "gpuix clipboard pt6c88"`,
      exit `1`). Measured split: copy/paste/cut reach `onChange` in a field,
      while `cmd-a`/`cmd-c`/`cmd-v`/`cmd-x` never reach the app's window handler
      (a `cmd-k` from a plain focusable control does). A selected `<text>` run
      **can** be copied by the platform — `selection-lifecycle` measured `Cmd+C`
      over a drag selection pasting that run into a field — so the user's own
      gesture works; what has no path is an application-initiated copy. Evidence:
      `apps/playground/README.md`
      §`clipboard-lifecycle`, `.artifacts/live/clipboard-pasted.png`; the
      capability row is the docs-site interlock below.

`[x]` Land the `selection-lifecycle` live probe and settle what a clicked-drag
      selection is — the only selection proof was the headless `text-selection`
      scenario's renderer `dragSelect`, so "a drag selects" had never been
      produced by a **pointer** in a window. The probe drags with the automation
      protocol over the shipped `Text`, with the theme's `selection` role
      overridden to an opaque `#00FF00` so the wash is a pixel count rather than
      a coordinate, and the line's box hugging its text (`alignSelf: "start"` —
      a stretched box puts the press past the last glyph and selects nothing,
      measured while building it). Measured: 0 wash pixels before the drag,
      4 764 after it, `getSelectedText()` reports `ection world`, `Cmd+C` over
      that run pastes the same text into a field, `clearSelection()` returns the
      count to 0, and the same drag over the default `Text` paints none. Nine
      checks, `--only selection-lifecycle`, green on 0.11.0; negative control
      measured (dropping `selectable`: `expected true, got false`, exit `1`).
      **This corrected the `clipboard-lifecycle` row's inference**: a selected
      `<text>` run *can* be copied by the platform, so the limitation is only
      that an app cannot initiate a copy. Evidence: `apps/playground/README.md`
      §`selection-lifecycle`, `.artifacts/live/selection-dragged.png`

`[x]` Land the `examples-mount` headless scenario and close the examples
      interlock — the components registry now lists all 39 examples and publishes
      `@gpuixui/components/examples`, so the gallery pages through every entry in
      sorted id order (one screen mounted at a time: 39 screens at once lay out a
      very tall tree and leave a timer or `Effect` fiber running behind the next
      one). Per page, from the renderer: the readout names the id, the wrapper
      paints and lays out a height of its own, and the wrapper's **own** subtree
      text is non-empty — the id label and the readout sit above it, so its text
      is the screen's. The last press must leave the gallery empty, which proves
      the plan ends where the registry does. 39 pages / 158 checks, `--only
      examples-mount`, green on 0.11.0; two negative controls measured (an id with
      no registry entry: `no-such-example lays out a height of its own — expected
      true, got false`; every page mounted from one component: `no two examples
      paint the same screen — expected 39, got 1`, exit `1` each). Full headless
      suite re-run green, 32/32. Evidence: `apps/playground/README.md`
      §The example gallery

`[x]` Guard the README's printed totals against the registry —
      `src/scenarios/registry.test.ts` reads the page that a release report and
      the docs site cite and fails when its `N/N green` / `N/N scenarios passed`
      lines or its `capabilities:` list stop matching `registry.ts`. The bug it
      guards is the one this workstream just lived through: the headline stayed
      at 31/31 after the example gallery landed, because both numbers are derived
      in code and written by hand. Both directions measured (one total edited to
      31/31: `expected [ '31/31', '32/32' ] to deeply equal [ '32/32' ]`;
      `editor=verified` dropped from the list: the capability case fails), and
      `nub run check:tests` accepts it. Evidence: `apps/playground/README.md`
      §Structure and §What is proven here

`[x]` Fix the inert `SmokeHost` fixture — `src/test-support.ts` never gained
      `fileDrop` when the verb joined the `SmokeHost` contract, so
      `nub run --filter @gpuixui/testing check-types` (and therefore the
      repo-wide `check-types` gate) failed with TS2741 while every runtime test
      stayed green. The fixture now reports the empty drop, and the package's
      `check-types` and 47 tests pass. The guard is the contract itself: a
      structural interface member added without the fixture is a compile error
      (measured before the line, gone after). It is also why this row exists —
      nothing ran `check-types` for this package since `file-drop` landed

`[x]` Land the `virtual-tree-lifecycle` live probe and settle the Tier 3/4
      file-tree question — a 4 000-row flattened tree (40 directories × 99
      files) as one `<virtual-list>`, so windowing and hierarchy meet in one
      component. Only a ten-row window paints at every size; `Right` opens a
      directory in place (40 → 139 rows) and a second `Right` enters its first
      child while the focus stays on the directory until then; `Left` collapses
      or returns to the parent; `down`/`up` move a row at a time; a file is a
      leaf; a depth-1 label indents 16px. The arrows move **native** focus from
      the row's own key handler through `useGpuix().renderer.focusElement`, so
      the roving-focus model plan `153` called impossible from a component is
      measured working. `scrollToItem(3000)` reveals `dir 030` — a row that was
      never mounted — and `getListScrollTop` anchors at `itemIndex=3000` with
      the list's own viewport (278: the frame's 280 minus two 1px borders). A
      programmatic reveal fires **no** `onVisibleRange`, and changing the row
      count reports indices (`1..2`, `0..1`) that describe the spliced child
      list rather than the painted window, so a tree reads the painted rows or
      the anchor. 30 checks, `--only virtual-tree-lifecycle`, green on 0.11.0;
      two negative controls measured (revealing index 0:
      `the reveal paints the directory the index names — expected true, got
      false`; dropping `focusElement`: `Right on an open directory enters its
      first child — expected "tree-row-file-dir-000/000", got
      "tree-row-dir-000"`, exit `1` each). `AsyncSmokeHost` gained
      `scrollToItem(testId, index, offsetInItem?)` and `listAnchor(testId)`
      (`listAnchorOf` refuses a short tuple: 3 unit tests), and the fixture's
      flattening is guarded by `src/live/virtual-tree.test.ts` (6 tests).
      Evidence: `apps/playground/README.md` §`virtual-tree-lifecycle`,
      `.artifacts/live/vtree-expanded.png`,
      `.artifacts/live/vtree-revealed.png`

`[x]` Land the `portal-layer` live probe and measure `createPortal` in a window —
      the published escape hatch both the headless dialog migration and a
      detached tab name, which nothing had rendered outside a `TestRenderer`.
      A clipped child paints nothing while the same card through a portal into a
      sibling layer paints inside the **target's** box, keeps the caller's React
      context (`ctx=portal-context`), takes a pointer press (`presses=1`) and
      takes keys in its field (`typed=hi`); removing the portal unpaints and
      drops it from the tree, and re-adding it paints again. Two measured rules:
      `getPaintedText` still lists a clipped sibling's glyphs (a clip is a pixel
      fact, proven from the capture), and the clipping box must be the child's
      containing block — an unpositioned `overflow: hidden` box does not clip an
      absolutely positioned child, measuring 23 780 magenta pixels until
      `position: relative` was added. 19 checks, `--only portal-layer`, green on
      0.11.0; two negative controls measured (dropping `overflow: hidden`:
      `the clipped sibling paints no pixel — expected 0, got 23780`; pointing
      the portal at the clip: `the card paints inside its target's box —
      expected true, got false`, exit `1` each). It does not prove a tab in its
      own window — the binding opens one window and has no drag host feature.
      Evidence: `apps/playground/README.md` §`portal-layer`,
      `.artifacts/live/portal-attached.png`,
      `.artifacts/live/portal-reattached.png`

## Phase C — Tier 1–2 components

`[x]` `[██████████]` 3/3

`[x]` Tier 1 foundational components (code + test + example + docs + inventory):
      all 19 components have code, tests, a runtime-verified interaction, an
      in-package docs page, a mounted example and an inventory row;
      `packages/primitives/src/inventory.test.ts` holds the 27
      `COMPONENTS.md` rows to the code, so that table cannot drift again;
      their pages now render on the site at `/docs/primitives/<name>` (and the
      icon page at `/docs/icons/icon`), linked from the Primitives section index
`[x]` `packages/primitives`: a field's own content is the control — two measured
      defects. **The `NumberField`'s keyboard ring was declared on its wrapper**,
      and the runtime paints `focusVisible` only on an element it tracks focus
      for (the rule `runtime/groups.runtime.test.tsx` measured), so Tab painted no
      ring on that field at all; the ring now sits on the `<input>`.
      **Every field dimmed its own value**: while another control holds keyboard
      focus the runtime fades every other focusable element to 40%, which
      composites a field's value and placeholder into the field's own fill, so
      `Input`, `TextArea`, the `NumberField`'s input, every `OTPField` cell and
      `Select`'s trigger declare `keyboardFocusDim: false` (one `keepContent`
      declaration in `core/focus.ts`, shared with the filled-button rule). Proof:
      `src/components/keyboard-dim.test.tsx` (the five field nodes, a caller's
      `style` putting the cue back, and `Toggle`/`Slider` keeping it),
      `NumberField.test.tsx` + `runtime/number-field.runtime.test.tsx` (Tab lands
      on the input, which declares the ring while the wrapper declares none).
      Both directions measured: removing the five declarations fails six cases by
      name, and putting the ring back on the wrapper fails the unit and window
      cases. Docs on the five pages, the docs index's guard list and the five
      Tier 1 inventory rows; adopting it in `packages/components`' own fields is
      the interlock row below
`[x]` `packages/icons`: the icon page's printed set size and size table are
      held to the package — the description said "Forty-seven monochrome icons"
      while `ICON_NAMES` shipped 48, and the `xs`…`xl` table printed pixels that
      nothing compared with the token scale. `src/docs.test.ts` reads
      `docs/icon.mdx` and fails on a stale count or a stale step, both
      directions measured (restoring "Forty-seven" and changing `md` to 18 each
      fail by name)
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
    - [x] Tabs' first arrow moves from the selected tab in a real window — a Tab
      traversal focuses the trigger without delivering `onFocus` (measured by
      `tabs-lifecycle`), so `moveOrigin` anchors on the key's own trigger, then
      the recorded row, then the selection. 1 new native test (20 in the suite;
      it focused `tab-profile` from the old anchor where `tab-danger` was
      expected) and 4 unit cases; `--only tabs-lifecycle` now measures
      `expected "tabs-overview", got "tabs-reports"`, so the probe flip is the
      playground's half of the interlock row
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
    - [x] The §8 reservation table in `docs/component-api.md` called `TagInput`, `Countdown` and `InlineEdit` "not implemented" long after all three shipped, so the spec denied components a consumer could already import. The table now reserves only `Chat` and `Message` (plan 207), and `src/api.test.ts`'s `keeps a planned part out of the package until its row lands` case fails on any planned part the package exports (measured: restoring the three rows fails it with all five names). 5 unit tests in the file
  - [x] `Message` and `Chat` — plan 207 landed. `MessageRoot`/`MessageAvatar`/`MessageContent`/`MessageActions` with the reasoning, tool-call, source and streaming slots as data props (no boolean proliferation), and `ChatRoot`/`ChatMessages`/`ChatComposer` over the shipped `MessageScroller`; the status machine is `chat/logic.ts` (`ChatStatus` a schema, `chatMove` the one rule set, shared with the consumer). Enter/Shift+Enter/Escape were measured in a window before the composer was written: a textarea's Enter reaches `onSubmit` only when that listener exists (otherwise the runtime consumes it as a newline and no keydown arrives), Shift+Enter inserts a newline and reaches no handler at all, Escape arrives as a keydown. 12 logic + 12 Message + 11 Chat native tests, recipes in `@gpuixui/tw`, both docs pages and both examples registered. **Still outside this package:** `LICENSES/` owes shadcn/ui's AI Elements a provenance row for the behaviour port (plan 207's acceptance line) — recorded as the interlock row below, owner licensing, because `LICENSES/` is not this workstream's
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
| An avatar diameter scale (20/26/32/40) so `DIAMETER` in `avatar.tsx` can be deleted | tokens-theme | **resolved (both halves)** — `avatarSize` is exported from `@gpuixui/tokens` and `packages/components` reads it through the theme seam: `AvatarSize` is `keyof typeof avatarSize`, the local `DIAMETER` table is deleted, and `src/behaviour/avatar.test.tsx` derives its expected diameters from the same scale. It is a fixed scale, not a `Theme` group (a new group breaks hand-built theme literals) |
| Platform style variants wider than typography (colour, radius, density per macOS/Linux/Windows) so the docs switch visibly repaints, not only re-types | tokens-theme | **resolved** — `platformTheme` applies the platform palette, radius and density; the docs bridge now publishes the control heights and paddings as CSS variables, so the preview controls resize too (macOS 28 / Linux 36 / Windows 32px at `md`), verified live on `/docs/components/button?platform=darwin|linux|win32|default` |
| `@gpuixui/primitives` exports in plan 110 §7 | primitives | **claimed: plan `160`** (`2026-10-22`) — `internal/button.tsx` is the local `Button`/`IconButton` stand-in (222 LOC, its own activation and paint path), and the Tier 1 parts contract is complete, so the retirement is planned rather than waiting. Two prerequisites block it, both measured today: primitives' filled hover/press still use `alpha()` lifts (`core/variants.ts:35-36`, `hover:bg-primary/90`) where the components button has painted the opaque `filledHover`/`filledPressed` since `90f98987`, and primitives' `outline` still paints `colors.border` (`core/variants.ts:68`) where the components secondary look now carries the measured `borderStrong` edge (`d54b24e2`). Adopting primitives' `Button` before both land would regress two audited fixes, so the plan's Phase 0 is a gate; once they pass, the adapter → public-prop → deletion phases make this package import `Button` from `@gpuixui/primitives` and delete `internal/button.tsx` |
| `examples/basic-app`'s `RadioGroup` still calls the deprecated `onChange` (the Tier 1 parts migration moved the in-package callers only) | examples | open — switch it to `onValueChange`; the alias keeps it working until then |
| A `primaryHover` / `destructiveHover` role pair so filled buttons stop using a half-alpha fill for hover | tokens-theme | **resolved without the pair** — `filledHover(theme, action)` / `filledPressed(theme, action)` derive an opaque fill from the action role and the theme's `foreground`, so a brand override follows automatically and the six roles are unnecessary; adoption is the row below |
| Adopt `filledHover` / `filledPressed` and delete the half-alpha hover fills: `components/src/internal/button.tsx`, `primitives/src/recipe/index.ts` (`hover:bg-primary/90`, `active:bg-primary/80` — `core/variants.ts` now holds only the variant table), and the checkbox/radio hover fills in `primitives/src/core/selection.ts` (via `blend`, whose role there is not one of the three actions) | components, primitives | **components half landed** — the local `Button`/`IconButton` is not a class recipe, so it was not blocked by `@gpuixui/tw` at all: `internal/button.tsx`'s `primary` and `danger` variants now paint `filledHover(theme, action)` / `filledPressed(theme, action)` (`action` = `primary` / `destructive`) instead of `alpha(fill, 0.5)`, so a hovered filled button is one opaque colour on a card, a dialog and the page. `src/behaviour/button.test.tsx` hovers the control in the renderer and reads the resolved `hover`/`active` styles, fails on the old half-alpha fill, and holds `secondary` to the measured `hover`/`active` roles it already used. Remaining (same `@gpuixui/tw` order as below): the resting appearance of every migrated primitive is a class recipe, and the hover is still `hover:bg-primary/90` in `packages/tw/src/recipes.ts`, so changing the core resolver alone breaks `src/recipe/recipe.test.ts` and `src/recipe/geometry.test.ts` (measured: 4 failures). The adoptable order is (1) a derived opaque-fill utility in `@gpuixui/tw` — `hover:fill-primary`/`active:fill-primary` resolving through `filledHover`/`filledPressed` — (2) the recipes, (3) the core resolvers and their tests, all in one change; `Toggle`'s pressed accent also needs a general-role helper (accent is not one of the three `FilledAction` roles) |
| The docs theme editor (`/docs/themes`) could show a live contrast readout while a reader edits a role — `contrastRatio` / `contrastFailures` are public and cover the 24 pairs the library itself is tested on | docs-site | **resolved** — `contrastReport`/`formatContrastFailure` in `theme-editor-logic.ts` run `contrastFailures` on the resolved edit; the editor shows a `role="status"` readout under the preview naming each failing pair with its measured ratio and floor, and reporting an unmeasurable (translucent) pair instead of counting it as passed. 3 tests: built-ins pass, a broken primary pair reads `1.00:1 (needs 4.5:1)`, a translucent ring reads `unmeasurable`. Documented on `/docs/themes#contrast` |
| The docs theme editor could report the **whole** audit it already half-shows — `auditTheme(theme)` returns `invalidRoles`, `contrast` and `decorative` in one call, so a reader who edits `border` towards `background` would see the divider disappear instead of only the contrast readout moving | docs-site | **resolved** — the readout is `auditTheme`'s reports flattened into one list (`auditReport`/`auditFindings` in `theme-editor-logic.ts`), each line worded for the reader (`role` = the value the renderer cannot paint, `contrast` = the pair, `decorative` = the surface, `series` = the swatch, `selection` = the wash); the editor's hand-rolled hex regex and its `contrastReport` are gone, and the persistence boundary (`parseState`) rejects a stored edit through the same `paintsEveryRole` the audit uses, so a URL or `localStorage` value that would paint black cannot be restored. `/docs/themes#the-theme-audit` describes every report (four when it landed, five now that the selection wash is measured). Directions measured: dropping the role and decorative maps fails 15 cases in `theme-editor-logic.test.ts` (the divider case reads `border on background — 1.00:1 (needs 1.05:1)`, the role case `primary — "#12345" is not a colour GPUix can paint`, and every editable role's stored-edit case), dropping the series map fails the brand-series case, and the old page's contrast-only section fails `theming-page.test.ts`'s whole-audit case. `theme-editor.test.tsx` holds the editor to mounting the readout as a live status region that reports the defaults as passing every report |
| Paint charts and legends from the theme instead of a literal palette — `apps/docs/src/components/docs/dashboard.tsx`'s `PALETTE` (`#8b5cf6`, `#3b82f6`, …) claims the five are "readable in both themes" and nothing measures it; `seriesColors(theme)` resolves the authored categorical scale and `toCssVars` should publish it so a preview charts in the platform/look it is showing. The future chart component (Tier 3 `Charts`) is the library consumer | docs-site (and components when a chart lands) | **resolved (docs half)** — `toCssVars` publishes `seriesColors(theme)` as `--series-1` to `--series-5`; the dashboard's `PALETTE` is gone and every bar, donut segment, stacked column and legend dot reads `--dash-series-N`, which defers to the surface's `--series-N` and falls back to `darkSeries` on the landing (which renders outside a preview surface), with the landing's two modes mapping to `lightSeries`/`darkSeries`. `/docs/theming#data-series` mounts `<SeriesSwatches />` generated from the resolved theme, and the dashboard block page says its colours are the theme's scale. `theme-css.test.ts` holds the bridge, both fallback maps and the no-literal rule (`series-swatches.test.tsx`: 5 cases, all five fail against a fixed palette). A chart component, when it lands, reads `seriesColors` the same way |
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
| `scripts/check-tests.ts`'s comment stripper can swallow every test after a regex that starts a line — `regexStart()` only accepts `([{,;:!&\|?=+\-*%<>~^` and a newline as the character before a `/`, so a regex written on its own indented line (the previous character is a **space**) is not recognised; the scanner then walks into the pattern, and a quote character inside it opens a string that never closes, so every later `it(` in that file is copied into one un-stripped blob and reported as `(dynamic)`/assertionless or, worse, not reported at all. Measured while adding a backtick-aware version pattern to `apps/docs/src/lib/runtime-version.test.ts`: the guard was real but the gate failed it as "no expect()" because the backtick inside `[\`*]*` leaked. Avoided at the call site with `\x60`; the stripper still needs the fix so the next author does not have to know this | repo tooling (`scripts/`) | open — accept whitespace before a regex, or document that a regex must begin right after `(`/`=`, and add a self-test case: a regex containing a backtick followed by an asserting test |
| `scripts/swarm-commit.sh` commits the **whole pre-staged index**, not only the paths it is given, so one workstream's commit can swallow another's staged work — measured 2026-10-21: a tokens commit (`360cf958`) also committed `apps/playground/src/smoke/host.ts`'s deletion and two foreign `TODO.md` hunks, leaving `master` with `run.ts` importing a file that was gone (restored in `0a49d6a5`; the deletion was **this workstream's** deliberate move to `Native.createTestHost`, landed whole in `7415bcb`, so the restore was a transient false alarm rather than a stray edit). **Measured again 2026-10-21 23:52:** the components workstream staged 40 files and `8e9a061d` (a primitives commit) carried all of them under its own message, leaving an empty index and no commit of its own | repo tooling (`scripts/`) | open — stage the named paths only (a `git reset` to the commit's parent, then `git add -- <paths>`, or `git commit --only -- <paths>`). **Measured again 2026-10-22 03:4x, twice in one components turn:** each `TODO.md` hunk this workstream wrote was already on `master` inside another agent's commit by the time its own `swarm-commit.sh` ran (`git diff -- TODO.md` was empty and the commit reported one file), so the ledger edit survives but under a message that does not mention it — `d3d8f037` (docs-site) carried the keyboard-dim row and an earlier commit carried the §8 reservation tick |
| The shared index was found staged with a **repo-wide deletion** — 970 files, 176 460 deletions, including `TODO.md`, `COMPONENTS.md`, every plan and every app source — so the next `swarm-commit.sh` call by any agent would have committed the checkout away. Measured 2026-10-22 while committing the playground's `portal-layer` probe; the working tree was intact (every file still present and modified as expected), so it was an index-only fault and `git reset` restored the index to `HEAD` with no working change. Cause not identified in this workstream's commands; the plausible source is an agent running `git rm -r --cached`/`git add -A` against the shared index | repo tooling (`scripts/`) | open — `swarm-commit.sh` should refuse a staged change set that deletes more than the paths it was given (a cheap guard: `git diff --cached --diff-filter=D --name-only` and fail if any path is outside the argument list), and every agent should run `git diff --cached --stat` before committing. Evidence: the index reset is unrecorded in git by nature; re-check with `git diff --cached --stat` on each commit |
| `AGENTS.md` §6 calls `main` the integration branch and tells agents to merge into it, but this repository has only `master` (no `origin/main`, and every workstream pushes `master`). A reader or agent following the rule looks for a branch that does not exist; `/docs/contributing` said the same until the docs-site pass corrected its own page | repo tooling (`AGENTS.md` is the owner's file) | open — rename the rule's branch to `master`, or restore the branch the rule names. The docs page is fixed and guarded (`apps/docs/src/lib/contributing-page.test.ts` fails on `` `main` ``), so the two disagree until this lands |
| `docs/component-api.md` still writes the runtime as `GPUix 0.10.0` in five places (the intro, "`@gpuix/react/floating` (published in 0.10.0)", the missing-aria sentence, and the Selects/Tooltips rows' "GPUix 0.10.0 `Select`" cells), on a workspace pinned to 0.11.0. It is the shared API spec a component plan reads | components (owns the spec) | **resolved** — all five references now name the pinned 0.11.0: the intro, the missing-aria sentence, both source cells, and the `floating` note, which now says "part of the pinned release" rather than citing a release number the guard would have to keep re-editing. The claims were re-read against the pinned typings and are still true (the aria set is unchanged; `floating` is still published; the Select/Tooltip wrappers still target that release), so this was the version re-read the row predicted. `packages/components/src/runtime-version.test.ts` scans the spec as well as the package's own prose, reading it from the repo root and labelling a failure with its repo-relative path: reverting one cell fails `docs/component-api.md:201: says 0.10.0, the workspace pins 0.11.0`, and the clean tree passes. The other root documents are **not** added, and the reason is recorded at the seam: they belong to the workstreams that write them and each has its own guard, and `docs/preview-strategy.md` quotes a historical version on purpose |
| `COMPONENTS.md`'s Tier 1–5 tables are parsed by the docs site (`apps/docs/src/lib/inventory.ts`): each row must keep the four columns (`Component \| Status \| GPUix support \| Notes / limitations`) and the `Tier N` heading above it. A fifth column or a second table under one heading makes every row "malformed" and empties `/docs/layouts`, `/docs/data-display` and `/docs/workspace`; `inventory.test.ts` fails first, naming the line. | anyone editing `COMPONENTS.md` | **resolved** — the file's intro now says so, names the parser and both guards (the docs-site parser and `packages/tokens/src/inventory.test.ts` for the design-system table), and says one table per heading |
| Correct `docs/component-api.md` §2: "`onValueChange` is the only change callback name" is wrong for boolean parts — base-gpui uses `on_checked_change`, so primitives adopts `onCheckedChange` alongside `onValueChange` (plan 040 §2.1) | components | **resolved** — §2 now documents `onValueChange` for value parts and `onCheckedChange` for boolean parts (an `onChange` alias stays deprecated, new work names neither), the §6 translation table gained the `.on_checked_change(f)` row, and `packages/components/src/api.test.ts` fails when either is missing |
| A `darwin-x64` binding for `@gpuix/native` **0.11.0** (B1, re-opened by the version bump; the store's local build was 0.10.0) | playground | **resolved** — rebuilt from the pinned `2e31b47` with the fixed zed checkout path; 21/21 smoke green on 0.11.0 |
| Decide whether `nub.lock` is committed: it is currently untracked and regenerated per worktree, so every workstream's copy would conflict | tooling | **resolved** — master tracks `nub.lock`; the merge took master's committed copy |
| `LICENSES/`: record shadcn/ui's **AI Elements** (`chat` and `message`) — the behaviour port behind `packages/components/src/chat.tsx` and `message.tsx` (plan 207). The pages credit the source and its MIT licence, but the licence inventory has no row for it yet | licensing | pending — the components half (credit on both pages, behaviour port, tests) landed with plan 207; only the `LICENSES/` entry is missing |
| `LICENSES/`: record GPUI Kit = Apache-2.0 (+ CC BY 4.0 for its docs prose, Lucide ISC for icons, no NOTICE file); shadcn/ui is referenced as design inspiration only, not copied source. The Message Scroller behaviour port (MIT) needs its own `provenance.md` row (plan 206 credits it on the docs page) | licensing | pending |
| `LICENSES/`: record the retro looks' provenance — Windows XP (Luna) and Windows 7 (Aero) are colour values and geometry only (no Microsoft artwork, gradient, bitmap, icon, cursor or logo copied; no font bundled, `sans` stays the `.SystemUIFont` sentinel), and both dark editions are authored by this library rather than reconstructed. The provenance is stated in `packages/tokens/src/retro.ts`'s header, `docs/tokens.md` §Authored looks and the `COMPONENTS.md` row; the licence inventory has no row for it yet | licensing | pending |
| Docs site: offer the authored looks (Luna / Aero) beside the four platform names — a look picker on `/docs/theming` that resolves `retroTheme` for the previews. The library half is landed (`retroStyles`, `retroTheme`, `retroNames`), and the mission's toggle stays macOS · Linux · Windows · Default, so this is an extra control rather than a fifth platform | docs-site | **resolved** — the sidebar switch now has a second group: **Look** offers `Platform` (the platform's own style), `Windows XP (Luna)` and `Windows 7 (Aero)`, resolved by `applyStyle(base, retroStyles[look])` over the platform theme, so a preview paints the look's palette, radii, density and monospace family. `lookOrder` is derived from `retroNames` (a new look without a switch entry fails the parity case), the choice is written to `?look=` and remembered like the platform, and `PreviewSurface` carries `data-look`; `/docs/theming#the-look-picker` documents it and `theme-css.test.ts` proves the bridge publishes the look's `--background`, `--radius` and `--font-mono`. Both directions measured: dropping the `applyStyle` call fails three cases (`carries an authored look's palette…`, `paints the look's palette…`, `distinguishes the two looks…`), and removing the page section fails all three page guards. Verified in the dev server: `/docs/theming?platform=darwin&look=luna` renders the Look group, `data-look="luna"` and `Dark · macOS · Windows XP (Luna)` |
| Native proof that an authored look paints — extend the theme gallery (or a `theme-look` probe) to paint `retroTheme(theme, "luna")` / `"aero"` and read the `primary` fill and `lg` radius back from the runtime's style report. `applyStyle` is the merge rule `theme-platform` already paints through `platformTheme`, and the values are held by `retro.test.ts`; what is unmeasured is a look painted in a window | playground | **resolved in the headless runtime** — the `theme-look` smoke scenario paints one row per look through `retroTheme` in the TestRenderer and reads the runtime's own style report: the mono family (`Lucida Console` / `Consolas`), the `primary` fill, the `lg` radius (3 / 6 against the base's 8) and an `md` control at each look's density (28 / 32px). Both looks are sampled, and the cross-checks require each sample to differ from the base and from the sibling, so a `retroTheme` returning its base fails by name. Negative control measured: painting `base.radius.lg` fails `luna large radius: expected 3, got 8`, exit `1`; restored, `--only theme-look --only theme-platform` is green (2/2). `src/scenarios/theme.test.ts` guards the negative-control premise (4 tests, all four fail when a look is collapsed onto the base). A live-window look probe is not added: the paint path is the same style report `theme-platform` proves, so it would measure the same values. Documentation: `apps/playground/README.md` §The theme gallery |
| A status message painted as text on `background`/`card` has no measured role today: `FieldError` paints the solid `destructive` fill role as text, which no pair measures. The proposed fix was four new `xText` roles plus `statusTone(...).text` — additive but breaking for a hand-built theme literal, so it needed a coordinated tokens → primitives → components commit | tokens-theme | **resolved without new roles** — `statusTone(...).foreground` (the existing `xSoftForeground`) is the status text role: it is already designed and theme-owned, it is the role a soft status surface paints, and it clears the body floor (7:1) as page text on **both** `background` and `card` in every shipped, high-contrast and platform theme (measured by the 8 new pairs). So nothing was added to `ThemeColors`, no hand-built theme literal breaks, and the role count stays 47. `contrastPairs` grows 28 → 36; `contrast.test.ts`'s `status text on the page` suite fails if a tone's page pair is dropped; `styles.test.ts` fails if `statusTone` returns the solid fill role instead (measured: 4 failures, including `gives a status message text the page floor measures`). Docs in `docs/tokens.md` §Status tones and §Contrast, `docs/design-system.md` §9 |
| Adopt `statusTone(theme, tone).foreground` in `FieldError` (and any inline warning or error text) instead of the solid fill role — the role is now measured as page text on `background` and `card`, so the component colours no longer need their own pair | primitives + components | **both halves landed** — `packages/components/src/field.tsx`'s `FieldError` and a `tone="destructive"` menu row (`src/menu/item.tsx`, shared by Dropdown and Context menus) paint `statusTone(theme, "destructive").foreground`, proven by the native cases `paints the error text in the status tone's measured page role` and `paints a destructive row in the status tone's measured page role` (dark measured `#FFE0E0`; without the change both painted the `#FF6B6B` fill). `packages/primitives` ships no `FieldError`: its error text is `Text tone="destructive"`, which paints `colors.destructiveSoftForeground` (`core/style.ts:209`, `recipe/index.ts`'s `TEXT` tone class) and is held there by `src/components/presentational.test.tsx`'s destructive-tone case, so the row's remaining claim was stale |
| Measure the status text roles on `popover` — the four `xSoftForeground` roles are measured as page text on `background`/`card` only, and the components package already paints a destructive menu row (and `Text tone="destructive"`) on the popover surface, so that pair is used without a measurement | tokens-theme | **resolved** — the four `xSoftForeground`/`popover` pairs joined `contrastPairs` (47 → 51, body floor 7:1), so a tone's text is measured on the third surface a component writes it on: a destructive menu row inside a popover. Every shipped, high-contrast, platform and authored-look theme already cleared the floor, so no palette moved. `contrast.test.ts`'s `status text on a surface` suite now names all three surfaces and reports a tone's text painted `popover`-coloured at 1.00:1; both directions measured (removing the four pairs fails the coverage case with `infoSoftForeground/popover` and the 1.00:1 case with `expected undefined to match object`). Docs in `docs/tokens.md` §Contrast, `docs/design-system.md` §9 and the `Contrast contract` inventory row |
| Measure the **late** registration failure in a window: register a family after text naming it was first laid out, and check the painted advances — the documented order (register, then render) comes from the pinned `@gpuix/native` 0.11.0 typings, and the live `register-font` probe only proves the successful order | playground | **resolved** — the `font-registration-late` live probe (0.11.0, `--only font-registration-late`) mounts `GpuixTestSquare` text with no face declared, measures 44px, installs the file through `AsyncSmokeHost.registerFont`, presses a re-layout control and measures **81px** (4em at 20px), while the never-installed control stays 44px. So the typings are conservative: the fallback is not permanent and the next repaint re-lays the text out against the now-known family. Negative control measured: declaring the face at mount fails `the face was not painted before it was installed` (exit `1`). Evidence: `apps/playground/README.md` §`font-registration-late`, `.artifacts/live/late-{before,after}.png` |
| Correct the late-registration claim now that it is measured — `packages/tokens/src/fonts.ts`'s header, `docs/tokens.md` §Fonts, the package README and `COMPONENTS.md`'s "Custom fonts" row all said a face installed afterwards "does not re-shape that text"; the window measured the opposite (44px → 81px on the next repaint). The recommendation (register before the first render) stays, the absoluteness does not; `fonts.test.ts`'s `registration order` suite asserts the current prose, so it must move with the words | tokens-theme | **resolved** — all four surfaces now say the fallback is a frame, not a verdict: the next layout re-lays the text out against the installed face, measured at 44px → 81px by the playground's `font-registration-late` probe, and "create the renderer, register, then render" stays because that first frame is the one the reader sees. `fonts.test.ts` reads all four surfaces (the inventory row included) and fails when one drops the order, the repaint, the measured widths, or returns to either retracted absolute; the four directions were measured (dropping "next layout", restoring "does not re-shape", deleting the inventory row, and a rewritten limitation) |
| Paint a **platform theme's palette, radius and density** in the native gallery — `theme-platform` measures the mono families and `theme-color-roles` measures the base palettes, so `platformTheme`'s repaint is proven by `platforms.test.ts` alone | playground | **resolved** — `theme-platform` now paints one row per platform (darwin/linux/win32) through `platformTheme`: the mono face, the platform's `primary` fill, its `lg` radius and an `md` control at its density, read back from the runtime's style report and `bounds` (17 checks, `--only theme-platform`, green on 0.11.0). macOS measures 28px, Linux 36px, Windows 32px; `@gpuixui/testing`'s `StyleSnapshot` gained `borderRadius` so a radius is a decoded style value rather than a guess. Negative control measured: painting `base.radius.lg` fails `darwin large radius: expected 10, got 8` (exit `1`). Evidence: `apps/playground/README.md` §The theme gallery |
| `packages/tw`'s `LIST_ITEM_TITLE` should carry `text-ellipsis whitespace-nowrap` like `LIST_ITEM_DESCRIPTION`; `ListItemTitle` currently merges the pair in `list.tsx` so a fixed-height row cannot wrap its title | tw (owner of `packages/tw/src/recipes.ts`) | open — move the pair into the recipe and drop the inline merge; the native truncation test in `list.test.tsx` guards either placement |
| The docs and inventory still call the platform palette, radii and density "pure values, not yet painted in a window": `COMPONENTS.md`'s "Platform styles" row, `docs/tokens.md` §Platform styles and `packages/tokens/README.md` §Platform styles all say so. `theme-platform` painted all three per platform on 0.11.0 (28/36/32px densities; radius `expected 10, got 8` as the negative control) | tokens-theme | **resolved** — all four surfaces (the inventory row, `docs/tokens.md` §Platform styles and §Limitations, the package README and `docs/design-system.md` §5) now say the radii and densities are design decisions *measured as painted*: the probe reads each platform's family, `primary` fill, `lg` radius and `md` control height (28 / 36 / 32px) back from the runtime, with `expected 10, got 8` as its negative control. The inventory row moves to plain `done` and cites both `platforms.test.ts` and the gallery registry guard. `platforms.test.ts`'s `platform documentation` suite reads every surface and fails when one returns to "not measured in this runtime" / "not yet painted in a window" / "measures families only" / "pure values", drops the probe's name, or stops citing the heights and the negative control; the three directions were measured (restoring the retracted phrase, renaming the probe, deleting the row), and a fourth removed the negative control |
| `COMPONENTS.md` line 159 (Range slider, from commit `d8523ced`) writes a raw `\|` inside the note — `` `SliderThumb index={0\|1}` `` — so the row has five cells and every docs inventory guard reports it: `apps/docs/src/lib/inventory.test.ts` says "line 159: expected 4 cells under a tier, found 5" and the lane/authoring contract is red until it is escaped or reworded. The parse is deliberately strict because a five-column row would silently empty the lane pages. Fix: write `0 and 1`, `0 \| 1`, or a code span without a pipe | primitives | **resolved** — the Range slider note now reads "`SliderThumb index={0}` or `index={1}`", and `apps/docs/src/lib/inventory.test.ts` is green (14/14, re-measured 2026-10-21) |
| The Primitives section index (`apps/docs/content/docs/primitives/index.mdx`) must link every page the package ships: `package-docs.test.ts` reads the mounted package pages and fails with the URL of any page the index does not link. `IconButton` landed a page at `/docs/primitives/icon-button`, so that guard now names it | docs-site | **resolved** — the Actions table lists `[Icon button](/docs/primitives/icon-button)`, and `nub run --filter @gpuixui/docs test` is green (33 files / 236 tests, re-measured 2026-10-21) |

| `apps/docs`' curated Dialog page still says "The top-right close control is a `✕` text glyph until an icon package lands"; the package page (`packages/components/docs/dialog.mdx`) and the source now paint `@gpuixui/icons`' `x` | docs-site | **resolved** — the limitation now reads "an `@gpuixui/icons` `x` glyph inside an `IconButton` named `Close`", the Dependencies table gained the `@gpuixui/icons` row, and the Button page gained the `@gpuix/react/floating` row it was missing. `component-page-truth.test.ts`'s `list every package the component imports` case derives both rows from the source, so a page cannot list its dependencies from memory: measured before the fix, it named `dialog.mdx: imports @gpuixui/icons` and `button.mdx: imports @gpuix/react/floating` |
| `nub run check:tests` rejects two docs-site tests it cannot see an assertion in — `apps/docs/src/lib/site.test.ts:15` ("is the host the deploy stack publishes", which does call `expect(domain).toBeDefined()`) and `apps/docs/src/lib/component-page-truth.test.ts:84` (reported with a `(dynamic)` title) | docs-site + tooling (`scripts/check-tests.ts`) | **resolved** — `83c54cd6` reworded the two guards so the parse sees their assertions; `nub run check:tests` reports `tests: every test asserts something, and nothing asserts itself`, re-measured 2026-10-21 |
| Two components pages link their sibling by the wrong URL — `packages/components/docs/hotkey-recorder.mdx` links `/docs/keyboard-shortcuts` (twice) and `keyboard-shortcuts.mdx` links `/docs/hotkey-recorder`; the pages are at `/docs/components/keyboard-shortcuts` and `/docs/components/hotkey-recorder`, so the Related links 404. Found while checking every mounted page's links from the docs side | components | **resolved** — the three hrefs now carry the `/docs/components` prefix, and `knownDeadLinks` in `apps/docs/src/lib/link-integrity.test.ts` is an empty list with the story in its header. Both directions measured: restoring one unprefixed href fails `packages/components/docs/keyboard-shortcuts.mdx: /docs/hotkey-recorder — no mounted page at /docs/hotkey-recorder`, and with the fix the file's four cases are green (the guard's staleness case proves an exemption that points at a live page fails, so the list cannot quietly grow back) |
| The Tier 1 inventory has no `Grid` row although `packages/primitives/docs/grid.mdx` ships (the Grid is `Stack`'s two-dimensional sibling, documented as "the only grid GPUix draws") | primitives | **resolved** — the row landed with the exemption removed in one change, as the row required: `COMPONENTS.md` Tier 1 now carries `Grid` (`done`, `yes`) naming the numeric column/row contract, the floored track counts, the absent CSS-grid surface (auto-flow, spans, named areas, templates), the recommended `Stack`-row alternative and its two proofs (`src/core/layout.test.ts`, the native `layout.runtime.test.tsx`); `inventory-status.ts`'s `withoutRow` keeps only `ThemeProvider`, and `/docs/primitives` links the page. `status-strip.test.tsx` now proves both directions — `ThemeProvider` renders no strip and `Grid` renders one — and `inventory-status.test.ts`'s page sweep no longer names Grid. `nub run --filter @gpuixui/docs test` green apart from the two `checkbox-group`/`toggle-group` pages the primitives workstream is landing without rows yet (their commit) |
| A modal that focuses a field with `autoFocus` **loses the focus when it closes**: the field takes the focus during the commit that mounts it, before the modal records who held it, so the modal's restore target is a field that is gone by the time the surface unmounts. The shipped `CommandMenu` was affected — its search field carried `autoFocus`, so closing the palette left the focus nowhere and the opener never got it back | components | **resolved for the shipped palette** — the input no longer carries `autoFocus`; the dialog's `initialFocus` focuses it after the opener is recorded, so both close paths return the focus to the opener. `src/behaviour/command-menu.test.tsx`'s `returns focus to the opener when it closes` fails without the change (`expected Some "palette-opener", got None`). The shared rule still depends on the field: a consumer's own `autoFocus` field inside a `Dialog` would lose it, so the rule is documented on `packages/components/docs/dialog.mdx` (§Accessibility and limitations) and measured by the `modal-focus-restore` probe's auto case. Evidence it replaced: the probe's measurements on 0.11.0 (`apps/playground/README.md` §`modal-focus-restore`) |
| The **outline variant's edge is the decorative `border` role**, not `borderStrong`: `packages/primitives/src/core/variants.ts:68` paints `border: theme.colors.border`, `packages/components/src/internal/button.tsx:79` the same, and `@gpuixui/tw`'s `button` outline variant asks for `border-input`, which `packages/tw/src/utilities.ts:201` maps to `theme.colors.border`. Measured on the light theme: `border` `#E1E5EC` is 1.16:1 on the page, while the design system's control-boundary claim is `borderStrong` at 3:1 (`docs/design-system.md` §7, `contrastPairs`' ring/boundary strips). A component that needs a hard edge already has the 3:1 role and the `border-strong` utility; the three call sites need to paint it. Found while measuring the filled action's fill (`TODO.md` → Design tokens), which is the same "a control has no shape" class | primitives + tw + components | **primitives and components halves landed** — the components package's local `Button`/`IconButton` stand-in's `secondary` variant painted `theme.colors.border`, which in both shipped themes is the same value as the `secondary` fill it outlines (dark `#2A303B`), so the control drew its outline in its own fill at 1.00:1 and the shape was the fill alone. It now paints `borderStrong`, the role `contrastPairs` holds to the 3:1 boundary floor (4.5:1 high contrast) on `background`, `card`, `muted` and `secondary` (`src/behaviour/button.test.tsx` measures it both ways: restoring `colors.border` fails `expected '#2A303B' to be '#748091'`). The **primitives half landed** the same way: `core/variants.ts`'s `outline` paints `borderStrong` (and an `outline` `Toggle` keeps it while pressed), the primitives' `buttonClass`/`toggleClass` recipes ask for `border-strong` (the utility landed with the components wave), so the recipe oracle holds both expressions. `Button.test.tsx`'s `draws an outlined action's edge in the measured boundary role` holds the painted role to the floor on `background`, `card`, `popover`, `muted` and `secondary` and measures the decorative role under it; `runtime/controls.runtime.test.tsx` reads the edge back off the painted window. Both directions measured (the old class fails the unit case and the native case; the old resolver fails `style.test.ts` and the recipe oracle). The tokens half is measured: `borderStrong` clears 3:1 on `background`, `card`, `input`, `muted` and `secondary` in every shipped theme. **Remaining: `@gpuixui/tw`'s `button` outline variant** (`border-input`), which is the components package's dependency |
| The shipped `Tabs` relies on React's `onFocus` to keep its `active` row, but a **real window focuses the trigger without running `onFocus`**: the `tabs-lifecycle` probe's `Tab` traversal leaves the renderer focus id on `tabs-overview` while the trigger's own `onFocus` counter stays `0`, so the first arrow re-anchors on the first enabled tab instead of moving to the next one (the `TestRenderer` fires the handler, which is why no unit suite sees it). The same gap makes any component state fed only by `onFocus` (a `focused` `StateStyle` flag, field focus styling) suspect in a window, although the `focusVisible` ring is declared at rest and still paints | components + playground | **components fix landed** — `moveOrigin` (`src/tabs/logic.ts`) anchors an arrow move on the trigger that sent the key (`event.elementId`), then the row `onFocus` recorded, then the selection; `src/behaviour/tabs.test.tsx`'s `moves from the selection when no trigger reported focus` sends a key at the rail with no focus event and fails on the old anchor (`expected tab-danger, got tab-profile`), and `src/tabs/logic.test.ts` holds the four precedence cases. **Playground half landed too** — the probe now asserts the fixed direction (first `right` → `tabs-reports changes=1`, moving off the traversal's tab; second → `tabs-archive changes=2`; Home/End → 3/4; a press → 5) and still checks `focuses=0`, because that runtime gap is what the key-origin anchor compensates for. Both directions measured: on the old expectation it failed `the first arrow re-anchors on the first tab: expected "tabs-overview", got "tabs-reports"` (exit `1`); after the flip `--only tabs-lifecycle` is green (27 checks, exit `0`). README §`tabs-lifecycle` records the fixed measurement. The cosmetic audit of other components whose `focused` state comes only from `onFocus` remains with `components` (the ring is declared at rest, so it is not a visible defect). Evidence: `apps/playground/README.md` §`tabs-lifecycle`; negative controls previously measured (`expected "tabs-archive", got "tabs-settings"`; pill `expected 61 ± 2, got 21`) |
| The `command-palette` live probe asserts the fixed defect — its two checks read `"closing the palette leaves the focus nowhere (known gap…)"` and `"Escape leaves the focus nowhere as well (the same known gap)"`, both expecting `none` | playground | **resolved** — both checks now expect `palette-trigger` (`closing the palette returns the focus to its opener`, `Escape returns the focus to the opener too`), the probe header explains the modal rule instead of the gap, and the README's `command-palette` section records 16 checks and the fix. Green on 0.11.0 (`--only command-palette`); negative control measured (expecting `none`: `expected "none", got "palette-trigger"`, exit `1`). `modal-focus-restore`'s auto case stays as measured: it exercises a raw `autoFocus` field, not the shipped palette |
| Fifteen `packages/components/docs` pages document no props at all — no `## API` (or `## Props`) heading and no `| Prop` table: `accordion`, `breadcrumb`, `collapsible`, `combobox`, `command-menu`, `context-menu`, `date-picker`, `dropdown-menu`, `field`, `pagination`, `popover`, `search-input`, `tabs`, `time-picker`, `toast`. MISSION requires API/prop docs on every component page, `docs/component-api.md` is the shared spec, and `packages/primitives` already enforces the section on all 28 of its pages (`src/docs.test.ts`). Five of the fifteen (`dialog`, `dropdown-menu`, `popover`, `tabs`, `toast`) are shadowed by a curated page that does carry an API table, so the reader-facing gap is the other ten — and the package file is what a consumer who copies the component reads | components | **resolved** — all fifteen pages now carry an `## API` section read from the source's prop interfaces: per-part prop tables (the mode union on `Accordion`, the placement props on `PopoverContent`/`DropdownMenuContent`/`ComboboxContent`/`DatePickerContent`, the shared menu rows named on both menus, the `useToast()` API, the `HH:mm`/ISO value contracts). `src/docs.test.ts` is the package's own page contract: every page has frontmatter, a copyable `@gpuixui/components` import and an `## API` table headed `Part`/`Prop` whose rows name a part and keep the header's cell count (escaped `\|` is text, not a column). Both directions measured — the 15 pages failed `no ## API section` by name before the pass, and emptying one table fails `collapsible.mdx: ## API table has no rows`; `nub run --filter @gpuixui/docs test` stays green (43 files / 366 tests), so the site's page and prop-index guards accept the tables |
| `COMPONENTS.md`'s **Not provided by GPUix** preamble and cross-cutting verdicts are still against the published 0.10.0 ("the version this repo pins"), while the workspace pins 0.11.0: it publishes a headless `Button` (`@gpuix/react/button`), `Dialog` parts and `createPortal`, so the rows that call those absent are false. The Tier 1 and design-system halves have their own truth passes; this map is the shared one | primitives + docs-site (capability map) | **resolved** — the preamble now states 0.11.0 as the pinned release, names the pinned typings a consumer compiles against (a path that exists, not a deleted worktree) and points at `docs/gpuix-capabilities.md` for the measured rows. The provided table's Text row moves to "measured on 0.11.0". The not-provided paragraph is rewritten: Buttons and Dialogs are published as **headless** parts in 0.11.0 (`./button` with `Button`/`buttonProps`, `./dialog` with `Dialog`/`DialogPopup`/`DialogTitle`/`DialogPortal`, `createPortal` from the root) and the styled compound contract stays ours, with the reason recorded in `components/src/dialog.tsx` and the adoption cost in the salvage row; `<canvas>` moves from "unverified / planned" to the measured **not supported** (`content-surfaces`: blank, no painted bounds), so a chart paints with `<svg>` and an image preview with `<img>`. The Tier 1 note's `0.10.0 TestRenderer` becomes the pinned 0.11.0, and **Terminal surfaces** — the one Tier 4 row still calling the terminal unverified — now records `render(<App />, { terminal: true })`, `isTerminal()` and `terminal: supported` in the runtime matrix, with an embedded PTY pane still honestly unverified. `runtime-version.test.ts` now scans `COMPONENTS.md`, `README.md` and `docs/gpuix-capabilities.md` as well as every page, and its version pattern reads **through a closing backtick** — the old one stopped at `` `@gpuix/native` ``, which is exactly how the inventory wrote the stale pin and why it reported a clean bill. Both directions measured: planting `@gpuix/native` 0.10.0 in the Text row fails `COMPONENTS.md: 0.10.0 (pinned 0.11.0)`, and the corrected map is green. `nub run --filter @gpuixui/docs test` 43 files / 364 tests, `check-types` green |
| `elevation.overlay` is a **public level that lifts nothing**: `elevationShadow(theme, "overlay")` returns `undefined`, and a caller can still select it (`Box`'s `elevation` prop; `packages/primitives/src/core/style.test.ts` and `src/recipe/recipe.test.ts` assert it paints nothing). Decide whether to design the level (a surface floating over another overlay needs a step above `lg`) or drop it from `Elevation` — either way `docs/tokens.md` §Elevation/§Layering, `packages/tokens/src/elevation.test.ts` (the one-shadow rule) and primitives' assertion at `core/style.test.ts:220` move in one change | tokens-theme + primitives | **resolved (decision: keep it reserved)** — dropping the key is a breaking type change for every hand-built theme literal and every `elevation` override, and a designed step above `lg` has no consumer, so the slot stays empty and `elevationShadow` keeps returning `undefined` for it; the scrim role and the level stay named apart. `docs/tokens.md` §Layering now records the decision and its reason instead of pointing at this row, and `layering.test.ts`'s `records the decision to keep the reserved level` case fails if the page drops either (measured: removing the sentence fails it by name). No primitives change is needed, so the row closes rather than waiting on a cross-workstream commit |
| Adopt the disabled role pair in place of the 50% opacity fade — `disabled:opacity-50` in `packages/tw/src/recipes.ts` (10 occurrences) and `packages/primitives/src/recipe/index.ts`, `opacity = 0.5` in `packages/primitives/src/core/style.ts` (two helpers) and `packages/components/src/menu/item.tsx` (a row's own `opacity: disabled ? 0.5 : 1`) | tw + primitives + components | **tokens half landed** — the scope is decided: a fade composites with the strip behind it, so the fade carries a filled action on the **page** only — the faded `primary` label measures 1.47:1–1.49:1 on the card of the four light styles whose page is lighter than their card — and `disabledAction(theme)` ships the neutral pair a disabled action paints on a card, a popover or a group strip instead. The fade is still measured: `disabledFadeFailures` composites the fade and every theme clears the default 1.5:1 floor, but a **high-contrast** theme fades a filled action's label to 1.74:1–2.23:1 against the 3:1 its variant asks, so a faded control cannot express that mode. The pair (`disabled` + `disabledForeground`) is what `contrastPairs` measures and what `Field`, `Select` and `FieldSet` already paint; a filled action that must keep its identity in a default theme can still fade, but the high-contrast route needs the pair. `disabledOpacity` is the one share to replace (not a hardcoded 0.5); `disabled.test.ts` holds the measurement and the page scope, and `docs/design-system.md` §8 states the split | tw + primitives + components | **components half landed** — the shared menu row (`src/menu/item.tsx`'s `menuRowStyle`, painted by `DropdownMenu`, `ContextMenu` and `CommandMenu`) faded itself with `opacity: 0.5` when disabled, which composited the label into the row's own fill; it now paints `colors.disabledForeground`, one of the pairs `contrastPairs` measures on `popover`, and drops its hover/press fills without fading. `src/behaviour/dropdown-menu.test.tsx`'s `paints a disabled row with the measured disabled pair, not a fade` reads the row's colour and opacity in both themes and holds `disabledForeground`/`popover` to `contrastFloors.disabled` (both directions measured: restoring the fade fails `expected 0.5 not to be 0.5`). `docs/dropdown-menu.mdx` §Theming/§Style by state no longer teaches a caller to fade the state, and the `COMPONENTS.md` row records it. Remaining: `@gpuixui/tw`'s `disabled:opacity-50` recipes and `packages/primitives`' `opacity = 0.5` helpers — `disabledAction(theme)` is the paint to adopt there |
| Adopt the keyboard dim's opt-out and fold the report into the gate — the runtime fades every other focusable element to 40% while one has keyboard focus (`keyboardFocusDimOpacity`), and `keyboardDimFailures` measures the composite at `decorativeFloor`: a dimmed label stays *seen*, but a filled action's label lands as low as 1.27:1 (Linux light `primary` over a card), so a control whose text must stay readable while Tab is elsewhere needs `keyboardFocusDim: false` — the filled actions and the fields are where it matters. The report is not yet one of `auditTheme`'s nine, because the docs site's readout derives its printed count and words every report; `keyboardDimFailures` should become `audit.keyboardDim` together with a tenth `AuditKind` line on `/docs/themes` (and the count on `/docs/theming`) | tokens-theme + components + primitives + docs-site | **components half landed** — `internal/button.tsx`'s three filled variants (`primary`, `danger`, `secondary`) paint `keyboardFocusDim: false`, so a filled action keeps its label while Tab is elsewhere; a `ghost` action has no fill to collapse into and keeps the cue. `src/behaviour/button.test.tsx` holds the declaration in the renderer in both themes, reads the collapse back off `keyboardDimFailures(theme, contrastFloors.secondary)` (5.0–10.5:1 at rest → 1.3–3.2:1 on all four strips, every filled pair reported by name), proves a caller's `style` can put the dim back, and fails without the opt-out (`expected undefined to be false`). **primitives half landed** — `core/variants.ts`'s `paintsFilledSurface` reads the variant table (a variant with a `background` is filled), and `Button` merges `keyboardFocusDim: false` for those variants before the keyboard ring, so `primary`/`secondary`/`destructive` keep a full-opacity label while `outline`/`ghost`/`link` keep the cue; `IconButton` and `ButtonGroup` inherit through `renderButton`. `Button.test.tsx` names the collapsed pair per mode (`keyboardDimFailures`), holds the rest pair to 4.5:1, proves the three filled variants declare the opt-out and the three unfilled variants do not, and that a caller's `style` can put it back (both directions measured: a `paintsFilledSurface` returning `false` fails `expected undefined to be false`); `runtime/controls.runtime.test.tsx` reads the declaration off the painted filled and ghost buttons. Docs in `docs/button.mdx` §The keyboard dim. Remaining: the tokens half's `auditTheme` report (owner: tokens-theme) |
| Adopt the field keyboard-dim opt-out in `packages/components` — the primitives' fields keep their value and placeholder lit while Tab is elsewhere (`keyboardFocusDim: false`, `src/components/keyboard-dim.test.tsx`), and this package's own field hosts still paint no declaration: `FieldInput`, `SearchInput`, `TagInputField`, `TimePickerSegment`, `MentionInput`, `ColorPicker`'s hex field, `CommandMenuInput` and the input `InlineEdit` swaps in. A components field therefore still dims the reader's own value into its own fill | components | open — the measurement (`keyboardDimFailures`) and the primitives half are landed; the fix is one declaration per field host, held by one native case per suite |
| Adopt `brandText(theme)` for brand-coloured text — the tokens half is measured (`brandText`, `brandTextSurfaces`, `brand-text.test.ts`, `docs/tokens.md` §Brand text): `primary` is a fill and reads at 4.30:1 on the base light theme's pressed wash and 3.10:1 in macOS dark, so a link painted in it is unreadable. The sites are `packages/tw/src/recipes.ts`'s `button` `link` variant (`text-primary`) and the `link` `ControlVariant` in `packages/primitives/src/core/variants.ts` (`foreground: (theme) => theme.colors.primary`, which is what a real `link` button paints); `@gpuixui/tw` needs a utility that resolves the derived colour (`text-brand`), then both call sites, then their recipes' oracles (`src/recipe/recipe.test.ts`, `geometry.test.ts`) — the same order the half-alpha hover fill took. A **mark** (the combobox's `text-primary` check glyph) keeps `primary`: it is measured at the 3:1 mark floor, not as text | tw + primitives + components | open — nothing outside `packages/tokens` paints `brandText` yet, so the fix is a cross-package change; `docs/design-system.md` §3/§8 and the `COMPONENTS.md` `Brand text` row record it as the known deviation |
| Stop an invalid field painting a **destructive fill** — `FIELD_INVALID` in `packages/primitives/src/recipe/index.ts` was `aria-invalid:bg-destructive aria-invalid:border-destructive`, so `Input`, `TextArea`, an `OTPField` cell, a `Select` trigger and `NumberField` merged the invalid bucket's background and became a solid destructive box while the value kept `inputForeground` and the placeholder kept `placeholder`: measured 3.31:1 light / 2.45:1 dark / 2.08:1 high contrast for the value against the 7:1 body floor, and 1.02:1 for the placeholder against 4.5:1 | primitives | **resolved** — the invalid state is an edge in the code now, not only in the docs: `FIELD_INVALID` carries `aria-invalid:border-destructive` alone and `core/style.ts`'s `controlStyle` keeps the variant's fill (`const rest = paint(variant.background, theme)`) while the border switches to `destructive`, so every field family keeps the `input` fill the `contrastPairs` table measures and only the edge and the `focusVisible` line say invalid. Three guards, both directions measured: `src/recipe/recipe.test.ts` asserts the invalid bucket is `{ borderColor }` and the merged fill is `input`, and holds `inputForeground` on the painted fill to `contrastFloors.body` in both shipped themes while the solid `destructive` fill fails it; `runtime/fields.runtime.test.tsx`'s `paints an invalid field's edge, not its fill` reads `backgroundColor`/`borderColor` back off the field the runtime retained; the OTP and Select equivalence cases moved with the oracle. Proven failing on the old recipe (4 recipe cases and the native case), green after. Docs: `packages/primitives/docs/input.mdx` §Theming states why the fill stays |
| 
| | Correct `docs/design-system.md` §8's invalid-state paragraph — it still says "the primitives' field recipe still does" paint a destructive fill behind the value and that "§9's table cannot make that text readable"; the primitives recipe now paints only the edge (`FIELD_INVALID` = `aria-invalid:border-destructive`, `controlStyle` keeps the variant's fill), so the paragraph describes a defect that no longer exists | tokens-theme (owns the design system) | **resolved** — §8 now states the edge-only rule and names both painters (the primitives' `aria-invalid:border-destructive`, the components' `FieldInput` over `input`) plus the tests that hold them, and `docs/tokens.md` §The invalid state carries the same correction. The stale sentence is retracted from both pages, and the remaining claim is kept honest about the *fill* rather than the shipped code: `inputForeground` on `destructive` is printed as 3.31:1 and measured. `field-boundary.test.ts`'s `retracts the destructive fill` case reads `packages/primitives/src/recipe/index.ts` and fails when either page carries the retracted claim, when the recipe regains `aria-invalid:bg-destructive` (measured: the restored class fails the case), or when the printed 3.31 drifts |
| A field's **resting** edge is the decorative `border` role, while `docs/design-system.md` §7 says `borderStrong` is functional — "input and control boundaries". `core/variants.ts`'s `fieldVariant` rests at `colors.border` and only hovers to `borderStrong`; the components package's `field.tsx` `FieldInput` and `@gpuixui/tw`'s input recipe do the same, and 1.19:1 on the light page is not a boundary. The outline-button fix is the same class of change and landed first (`variants.ts`, `button.mdx`); the field family needs one coordinated move across primitives, components and tw, or the design system needs to say a field is carried by its fill alone | primitives + components + tw (and tokens-theme for the §7 claim) | **tokens half landed** — the decision is recorded, and it is the **edge**, not the fill: a field lands on the page, a card, a popover and a `muted` toolbar, and in the light palettes the page and a card are only 1.06:1 apart, less than the perceptibility floor applied twice, so no fill can clear it against both (light `input` is `#FFFFFF`, the same value as `card` and `popover`). §7 states the rule, the measured reason and the shipped deviation, §Limitations repeats it, and `field-boundary.test.ts` reads `fieldVariant` and `FieldInput` so the sentence cannot outlive the code: adopting `borderStrong` in both painters fails the deviation case until the page moves (measured), and a painter still on `border` after the page moves fails the same case. The floor itself was already measured (`contrastPairs`' `borderStrong` on `input` and the four strips), so what remains is the three-package adoption: `fieldVariant` (`packages/primitives/src/core/variants.ts`), `FieldInput` (`packages/components/src/field.tsx`) and the `border-input` utilities in `@gpuixui/tw` |
| Two `ThemeProvider`s — `packages/primitives/src/components/ThemeProvider.tsx` (with `MissingThemeProviderError` and `useTheme`) and the shared `@gpuixui/tokens/react` provider are separate contexts, so a page mixing primitives and components must wrap it twice and the two themes can disagree. The components package has **one** provider: `internal/theme.ts` re-exports the token package's `ThemeProvider`/`useTheme`, and `internal/theme.test.ts` holds the seam (`ThemeProvider`/`useTheme` are that module's own exports, no file under `src/` declares a second `ThemeContext`, and the seam calls no `createContext`), so the remaining duplication is primitives' provider — it adds the `density` override and a fail-loud default — and either primitives consumes the shared provider (with `withDensity` applied by its own hook) or tokens' provider grows the density prop | primitives (components half done) | **components half resolved** — `internal/theme.ts` has re-exported `@gpuixui/tokens/react` since the seam landed (commit `206e198c`); the row's earlier reading of a components-local implementation was stale. `src/internal/theme.test.ts` now measures it: the two exports are the token module's functions by identity, no non-test source declares a `ThemeContext` or `MissingThemeProviderError`, and the seam itself calls no `createContext` (three directions measured — planting `internal/temp-provider.tsx` fails naming that file, appending a `createContext` mention to the seam fails by line, and an unchanged tree passes). What remains is primitives': it owns the only second provider, so a page that mixes the two packages still needs both wrappers until primitives adopts the shared provider or tokens' provider takes `density` |
| Adopt the pressable-target floor in the icon-sized parts — every icon-sized press target | primitives + components | **resolved** — three waves: the components package's four clear/remove controls (`SearchInput`, `TagInputChip`, `TimePickerClear`, `HotkeyRecorder`) grew to 24px with `flexShrink: 0` (`packages/components/src/behaviour/targets.test.tsx` measures each); the group controls in `packages/primitives` made the **row** the control, so `RadioGroup`/`CheckboxGroup` rows reserve the floor through `optionRowStyle` (a single-line row measured 17px) and declare the ring the runtime actually applies, held by `runtime/groups.runtime.test.tsx` and the two group unit suites; and the standalone `Checkbox`/`Switch` now draw at their icon step inside a 24px target that owns the role, the focus and the ring (`selectionTargetStyle`/`switchTargetStyle`), with the drawing at `pointerEvents: "none"` so a press on either toggles exactly once (`runtime/selection-targets.runtime.test.tsx`). The measured rule behind the last two: a painted element owns a mouse-blocking hitbox, and `pointerEvents: "none"` removes the blocking but not the hitbox, so the drawing stays hoverable while the press falls through — forcing the press with `"auto"` would `occlude()` and stop a parent scroller's wheel (measured both ways). `IconButton` already conformed (square at its density's control height, 24px at `compact` `sm`), and colour-picker swatches measure at a control height. **The `Rating` star landed too** — the padded star box was 20px at `md` (16px icon plus a 2px hairline) and 18px at `sm`, so the glyph was the target; the box now reserves `targetSize.minimum` in both axes with the glyph centred, through the primitives' own `min-target` derived utility and `ratingStarStyle`. `Rating.test.tsx` asserts the floor on every star and `runtime/rating.runtime.test.tsx` measures the painted box at `sm` (the smallest glyph), both proven failing without it. Remaining: the tree chevrons when a tree view lands |
| A selected run paints the design system's `selection` wash — pass `theme.colors.selection` to the runtime's `selectionColor` style property on the selectable hosts (`packages/primitives/src/core/style.ts`'s `nativeTextTheme` for `<input>`/`<textarea>`/`<code>`, and every `<text selectable>`), whose own default is the theme accent at 35% — a colour this package measures nowhere | primitives + components | **both halves landed** — a selectable `<text>` and every field (whose recipe carries `select-text`) now paint `theme.colors.selection`: the primitives' `select-text` utility resolves the role beside `userSelect: "text"`, and `textStyle`/`fieldTextStyle` agree, so the recipe oracle stays equal. `core/style.test.ts` pins the rule (chrome paints no wash) and `runtime/fields.runtime.test.tsx` reads the declared `selectionColor` back off a selectable `Text` and an `Input` (both directions measured: without the role the runtime case fails `expected undefined to be '#00001940'`). **Components half landed** — `internal/theme.ts` exports `selectionWash(theme)` and every selectable host in the package declares it: `FieldInput`, `SearchInput`, both `TimePickerSegment`s, `TagInputField`, `MentionInput`, `ColorPicker`'s hex field, `CommandMenuInput` and the input `InlineEdit` swaps in. `src/behaviour/selection.test.tsx` mounts all nine in the renderer and reads the declared wash back (removing one declaration fails by component name: `SearchInput: expected undefined to be '#A7A9FF3D'`), plus a case that the role is not the runtime's unmeasured accent default. The property inherits down a subtree (`@gpuix/native@0.11.0` `StyleDesc.selectionColor`), so one value per selectable host is enough; `selection.test.ts` holds the palette it paints to 7:1 body text and 1.05:1 visibility on all 16 shipped, platform and look themes |
| The docs theme editor's readout shows four of the audit's five reports — `auditTheme` now returns `selection` beside `invalidRoles`/`contrast`/`decorative`/`series`, so a reader who edits `selection` sees no line for a wash that hides the text it selects, although `/docs/themes` calls the readout "the whole audit" | docs-site | **resolved** — `AuditKind` gained `selection` and `formatSelectionFailure` words both jobs (`selection wash over background — 1.00:1 (needs 1.05:1)` for a wash nobody can see, `foreground on the selection wash over background — 1.06:1 (needs 7:1)` for text it buries), `auditFindings` flattens the report, and the editor's pass sentence and `/docs/themes#the-theme-audit` say five (the page lists the two floors and adds `selectionFailures` to the copy-theme note). `theme-editor-logic.test.ts` holds two brand themes — an opaque white wash and a zero-opacity one — proves the other four reports are empty on the first, so only the new line can fail `auditTheme(...).passed`, and fails on the old four-report mapping (`expected [] to have a length of 1`-style, measured); removing the selection map fails both cases, printing four → three fails `theming-page.test.ts`, and dropping the pass sentence fails `theme-editor.test.tsx` (all measured). `nub run --filter @gpuixui/docs test` green (41 files / 330 tests) |
| A tooltip does not open on **keyboard focus** in a window — the `tooltip-lifecycle` live probe's `Tab` traversal focuses `tooltip-trigger` (`getFocusedElementId` reports it) but React's `onFocus` never runs, so the GPUix tooltip (which opens on `onFocus`) stays closed; hover opens it, leaving closes it and Escape dismisses it. The tip's text still reaches a screen reader as the trigger's `aria-description` | primitives (and `docs-site` for `docs/gpuix-capabilities.md`) | **primitives half landed (documented, not fixed)** — no focus signal exists for a trigger with no key event, so the measured behaviour is now the documented contract: `docs/tooltip.mdx` §Keyboard/§Limitations says a `Tab` traversal does not open the tip and hover is the only open path, the `COMPONENTS.md` Tooltips row carries the same verdict with `partial` support, and `src/docs.test.ts`'s prose guard fails when the page re-claims keyboard open or drops the probe (`keyboard: false` measured). **The docs half landed too** — the capability record no longer calls focus events plainly `supported`: §3's row reads `supported, with limits` carrying both probes' evidence and the workaround, §4 states the rule once, `/docs/runtime#measured-in-a-window` publishes it as a measured gap (its intro prints no count to fall behind), and `capability-doc.test.ts` fails when the row's verdict or either probe citation is dropped. **Row resolved by documenting**: the runtime still delivers no focus event on a traversal, so `aria-description` stays the assistive-technology path. Measured evidence: `apps/playground/README.md` §`tooltip-lifecycle`, 12 checks green on 0.11.0, with the hover path as the negative control (`expected true, got false` without the wrapper) |

| Record the measured difference between the two scroll events — `onScroll`'s `deltaY` is the **input** the window received (a `-100000` wheel reports `-100000` even though the offset moved 200px and clamped), while `onScrollChange` carries the clamped absolute `scrollX`/`scrollY` pair `getScrollOffset` returns; a scrollbar or a "follow the tail" scroller needs the second. `docs/gpuix-capabilities.md`'s event row names both listeners without saying which reports what | docs-site | **resolved** — the events row is now *Pointer, keyboard and focus events*, and a new **Scroll events** row carries the distinction: `onScroll`'s `deltaX`/`deltaY` is the wheel input the window received (a `-100000` wheel reports `-100000` after the offset travelled 200px and clamped), `onScrollChange`'s `scrollX`/`scrollY` is the clamped absolute pair `getScrollOffset` returns, and the workaround names `onScrollChange` for a scrollbar, a saved position or a follow-the-tail scroller. `/docs/runtime`'s *Measured in a window* table gains the same row and `scroll-lifecycle` joins §5's owed-probe list. `capability-doc.test.ts` gained two cases — the doc row (verdict, both listeners, `getScrollOffset`, the workaround) and the page's own row parsed out of its table — and the page-probe case now names `scroll-lifecycle`. Both directions measured: deleting the doc row fails `records what each scroll event reports…` (`expected "supported, with limits", received undefined`), deleting the page row fails `the page's measured table has no scroll-event row` plus the probe case. `nub run --filter @gpuixui/docs test` green (42 files / 341 tests), `check-types` and `build` green |

| Reconcile the two pointer-drag claims — the `split-pane-lifecycle` probe dragged a 6px divider by 80px and the divider's own `onMouseMove` received all eight moves (`moves=8`), 80px outside its box, while `packages/primitives/docs/slider.mdx` and `range-slider.mdx` say a drag that leaves the track stops updating ("no pointer capture") and the capability record has no pointer-capture row. Either the runtime delivers a drag to the element that took the press (and the Slider's own handler/geometry is why it stops) or the slider claim is stale | primitives + docs-site | **resolved (measured, and the stale claims retracted)** — the runtime **does** capture: `renderer.rs` arms `capture_pointer` on left mouse down only for an element that listens to both `mouseDown` and `mouseMove`, and the `pointer-capture` live probe measured both cases on 0.11.0 — the paired sample kept all eight moves and the release outside its box (`both=8 bothUnder=0 bothUp=1`), while a move-only sample got only the pre-press move and the sibling got the eight drag moves (`move=1 moveUnder=8`). The shipped `Slider`, which has the pair, followed a 60px-right / 120px-down drag that left its track entirely (`slider=66 sliderChanges=9`), so its "drag stops when the pointer leaves the track" claim is **wrong**, as is the same sentence in `range-slider.mdx`, the `Slider.tsx` header, the `number-field.mdx` aside and the two `COMPONENTS.md` rows. The `packages/testing` `AsyncSmokeHost.drag` comment (which repeated "no pointer capture") is corrected. **Docs half landed** — `docs/gpuix-capabilities.md` §3 has the `Pointer capture` row: `supported, with limits`, the two-listener rule, the three measured samples, the shipped `Slider` following the drag, and the workaround (subscribe to both `onMouseDown` and `onMouseMove`); §5 adds the probe to the ids the record owes, and `/docs/runtime#measured-in-a-window` publishes the same row. `capability-doc.test.ts` holds both files to it from both sides (two cases fail without either row, measured). **Primitives half landed**: the "no pointer capture" sentence is retracted from `src/components/Slider.tsx`'s header, `docs/slider.mdx`, `docs/range-slider.mdx`, `docs/number-field.mdx`'s drag-to-scrub aside, the package README's capability table, both inventory records and both `COMPONENTS.md` rows; `docs/slider.mdx` and `docs/range-slider.mdx` now state the capture, and `runtime/value.runtime.test.tsx` holds the headless renderer to it — the shipped `Slider` keeps following a drag 200px past its track (30 → 100) and stops on the release, and a `RangeSlider` grabs the nearer end and follows it past the track until it stops on the other end. Both directions measured: dropping the track's `onMouseMove` (so capture is never armed) fails with `expected 30 to be 100` (exit `1`); restored, 18/18 in that suite and 165/165 in the runtime package. That `range-slider` drag was the unmeasured half the probe did not mount. Evidence: `apps/playground/README.md` §`pointer-capture`, 4 checks green, negative control `both=0 bothUnder=8 bothUp=0` (exit `1`) |

| The theme editor's readout carries the series **deficiency** half — `auditTheme`'s series report now has `deficiencies` (protanopia/deuteranopia/tritanopia) beside `surfaces`/`distinctness`, and `auditFindings` on `/docs/themes` flattens only the first two, so a scale that collapses only for a colour-blind reader passes the readout; `/docs/themes` and `/docs/theming` also still describe the scale as two contracts | docs-site | **resolved** — `AuditKind` gains `deficiency` and `formatSeriesVisionFailure` words the line (`deuteranopia: series 2 and series 3 — 0.029 apart (needs 0.05)`); `auditFindings` flattens `report.series.deficiencies`, so a scale that collapses only for a colour-blind reader fails the readout. `/docs/themes` §The theme audit and `/docs/theming` §Data series now state the third contract and its floor. `theme-editor-logic.test.ts` builds a red/green pair that clears the plot-surface and full-colour distinctness contracts and collapses only under deuteranopia at 0.029, proves it fails `auditTheme(...).passed`, and fails when the map is dropped or the kind is printed as `series` (both measured); `theming-page.test.ts` reads both pages from disk and fails when the third contract or any `colorVisionDeficiencies` entry is missing (measured: three cases); the pass sentence names the deficiency and `theme-editor.test.tsx` fails without it |
| The theme editor's readout still says the audit has **five** reports and `AuditKind` has no shadow line — `auditTheme` now returns a sixth (`invalidShadows`, from `invalidShadowColors`), and `auditFindings`/`theme-editor-logic.ts`'s comment say all five. The editor pins roles, radius and family only, so its own edits cannot produce a shadow failure; the wording is what is stale | docs-site | **resolved** — `AuditKind` gains `shadow` and `formatInvalidShadow` words the line (`elevation md (shadow 1) — "#00000" is not a colour GPUix can paint`); `auditFindings` flattens `report.invalidShadows`, the "all five" comment and the pass sentence now say six, and the sentence gained "every shadow level paints its colour". `/docs/themes` gains the Elevation shadows bullet and prints "six independent failures"; `theming-page.test.ts` holds the count and the `invalidShadowColors` reference, `theme-editor-logic.test.ts` builds an `elevation` override with an unpaintable tint and proves it fails `auditTheme(...).passed` with no role failure, `theme-editor.test.tsx` holds the sentence. Directions measured: dropping the `invalidShadows` map fails the shadow case (`expected [] to deeply equal [ Array(1) ]`) and printing "five" fails the page case |

| The landing dashboard's series **fallbacks** still paint the previous tables — `apps/docs/src/styles/blocks.css` (`.gx-dash`'s `--dash-series-*`) and `landing.css`'s `.landing .gx-dash` / `.dark .landing .gx-dash` blocks mirror `darkSeries`/`lightSeries`, held by `theme-css.test.ts`. The tokens workstream redesigned all four tables for the colour-vision contract, so `keeps the dashboard's fallbacks on the dark theme's scale` and `re-maps the landing's two modes to the matching scale` fail today (343/345 docs cases pass) | docs-site | **resolved** (commit `496d18f1`, before this row was read) — both style sheets carry the redesigned tables: `blocks.css`'s fallbacks are `darkSeries` (`#a7a9ff #6e9cff #1fa968 #ffde8a #ff9e9e`), and `landing.css` maps light to `lightSeries` (`#5f4bdb #1b45ac #158754 #b57600 #a5262b`) and dark to `darkSeries`; `theme-css.test.ts`'s two cases pass and the full docs suite is green (348 tests) |

| The theme editor's readout carries **six of the seven** audit reports — `auditTheme` now returns `indicators` too (`indicatorFailures`), and `auditFindings`/`AuditKind` in `apps/docs/src/components/docs/theme-editor-logic.ts` map six, so `/docs/themes` calls itself "the whole audit" while a mark that disappears on the card reports nothing; `themes.mdx` also still says "six independent failures" | docs-site | **resolved** (commit `e5f750e8`, verified before closing this row) — `AuditKind` has `indicator`, `formatIndicatorFailure` words the line (`mark primary on card — 2.66:1 (needs 3:1)`), `auditFindings` flattens `report.indicators`, `themes.mdx` §The theme audit says seven independent failures with the `indicatorFailures` bullet, and the pass sentence names the mark. `theme-editor-logic.test.ts`'s `reports an indicator mark that vanishes into the strip it is drawn on` is the case this row asked for (a brand whose primary is the page, so only the mark line can see it), and `/docs/theming` §Indicator marks is held by `theming-page.test.ts` |
| The theme editor's readout carries **seven of the eight** audit reports — the editor now maps `indicators` (`AuditKind` in `apps/docs/src/components/docs/theme-editor-logic.ts`) but not `invalidNumbers`, so `/docs/themes` calls itself "the whole audit" while a `NaN` radius — a token the renderer drops in silence — reports nothing | docs-site | **resolved** — `AuditKind` gains `number`, `formatInvalidNumber` words the rule in the reader's terms (`radius md — NaN cannot be laid out (needs a length of zero or more)`, `typography body.fontSize — -1 cannot be laid out (needs a size greater than zero)`), and `auditFindings` flattens `report.invalidNumbers`. `/docs/themes` §The theme audit says nine and carries the Numbers bullet (the JSON boundary that turns `NaN` into a dropped property, the accepted negative size), and the copy-theme note names `invalidNumbers`. `theme-editor-logic.test.ts` builds a `radius.md` of `NaN` and proves only the number line can see it (the seven colour reports and the fade are empty, `auditTheme(...).passed` false); `theming-page.test.ts` derives the printed word from `auditTheme`'s own keys, so a tenth report cannot land while the page still promises nine. Directions measured: dropping the number map fails the case (`expected [] to deeply equal [ Array(1) ]`), and printing "eight" fails the page case by name |
| The theme editor's readout is now **two reports behind**: `auditTheme` returns nine and the editor's `auditFindings` maps seven. The ninth is `disabledFade` — a brand whose enabled label clears 4.5:1 can still composite into its faded fill at 1.04:1 when the control is disabled, which `theme-editor-logic.test.ts` can build with `primary: "#101010"` / `primaryForeground: "#7E7E7E"` (the brand `audit.test.ts` already isolates) | docs-site | **resolved** — `AuditKind` gains `disabled`, `formatDisabledFade` words the composite (`primary disabled on background — 1.04:1 (needs 1.5:1)`), and `auditFindings` flattens `report.disabledFade`; the pass sentence gained "every number lays out" and "every disabled control keeps its faded label", and `/docs/themes` §The theme audit carries the disabled-fade bullet (the label composited over the faded fill, the 1.5:1 mechanism floor, why WCAG's inactive-component exemption does not make it a pass) with `disabledFadeFailures` in the copy-theme note. `theme-editor-logic.test.ts` builds the `#101010`/`#7E7E7E` brand and proves the contrast and indicator reports are silent while the fade fails the gate; the editor and page guards hold both new clauses. Directions measured: dropping the fade map fails `expected [] to include 'primary disabled on background — 1.04…'`; removing either pass-sentence clause fails `theme-editor.test.tsx` |
| The docs' brand snippets still teach the retracted dark pairing — `apps/docs/content/docs/theming.mdx` (two snippets) shows a dark brand with `primary: "#6A45F0"` and a white label, which carries its label at 5.6:1 but sits at 2.66:1–2.99:1 as a **mark** on the dark card/popover/muted strip. `packages/tokens/src/brand-theme.example.ts` now owns its on-colour per mode (dark `#B49CFF` with the near-black iris, light `#6A45F0` with white), and the README and `docs/tokens.md` moved with it | docs-site | **resolved** — `/docs/theming` teaches the per-mode pair in both snippets: §Override a theme is now a light and a dark `createTheme` (dark `#B49CFF` with the `#1C1547` iris, light `#6A45F0` with white) with the reason stated — a `primary` is also the role a progress fill, a spinner's lit dot and a slider's span paint, so a fill a reader cannot find on the card fails even when its label clears 5.6:1 — and §Take one and make it yours re-owns the Windows accent as `#B49CFF`/`#1C1547`, naming the three things a brand owns (label, mark, measurement) and pointing at `auditTheme`. `theming-page.test.ts` replaces its single-snippet read with a guard that **executes** every `createTheme` block on the page and holds each to the label floor, `indicatorFailures` and `auditTheme(...).passed`, plus a case requiring the section to say why (`indicatorFailures`, `spinner`, the executed example); `platform-page.test.ts` gains the same mark case for the platform snippet, which resolves through the platform's own card. Both directions measured: the old dark snippets failed the mark case at 2.99:1 on the card, 2.66:1 on the popover and muted strip (and the one-snippet page failed the two-mode case), while `platform-page.test.ts` reported the old Windows snippet at 2.89/2.51/2.44:1 on background/card/popover. `nub run --filter @gpuixui/docs test` green (42 files / 359 tests) |
| The shipped `Spinner` inside a **filled** button paints the fill it sits on — `Button`'s `loading` branch renders `<Spinner>` with its default `accent: "primary"`, whose lit dot is `bg-primary`, so a `variant="primary"` button paints `primary` on `primary` (1.00:1) and the busy indicator disappears exactly where it matters; the resting dots are `mutedForeground`, so the spinner reads as a stopped trail rather than as working | primitives | **resolved** — `SPINNER_ACCENTS` gained the three on-colours (`on-primary`, `on-secondary`, `on-destructive`) and `variantSpinnerAccent(variant)` maps a filled button to its own label's role, while outline/ghost/link keep the brand accent the mark contract measures on the page. **The trail changed with it**: every dot painted the accent and only the opacity steps, because a muted trail on a filled control is the same 1.00:1 problem one dot over. Proof: `core/loading.test.ts` holds the accent on every dot and each on-colour role; `Button.test.tsx` fails without the mapping (`accentOf("primary")` reads `on-primary`); `runtime/loading.runtime.test.tsx` reads the dots back off a window — a busy primary button's three dots are `#000008` (`primaryForeground`, against the `#000007` primary the unfixed code painted — measured) and a secondary one's are its `secondaryForeground` — and the lit-dot probe now finds the opaque dot instead of the accent-coloured one. Docs in `docs/spinner.mdx` §Theming/§API/§Limitations, `docs/button.mdx` and the two `COMPONENTS.md` rows |
| `Avatar`'s `away` presence dot paints the **solid** `warning` role on `card`, which is 1.89:1 in the light theme — 1.55:1 on Luna light's card — below the new mark floor, because `warning` is a pale amber designed to carry near-black text rather than to be found as a 10px dot | components | **resolved** — `statusFill` paints `statusTone(theme, "warning").foreground` for `away`, so all four presence states are roles `indicatorRoles` measures at the mark floor. `src/behaviour/avatar.test.tsx` holds the painted dot for every state to `indicatorRoles` (measured both ways: restoring the solid `warning` fill fails `paints the presence dot from the theme's status roles` — `expected '#FFC94D' to deeply equal '#FFEFC6'` — and `paints every dot in a role the token contract measures as a mark`). `docs/avatar.mdx` §Presence explains why a dot is not a text role and the `COMPONENTS.md` row records it |
| The `Context menus` inventory row's right-press path is now measured in a real window (the probe mounts the shipped component: a right press opens the surface at the pointer, arrows move real focus, `Enter` runs the row, `Shift+F10` places from the trigger and restores focus, and a pointer-opened menu leaves the focus `none`) | components | **resolved** — the `COMPONENTS.md` row cites `context-menu-lifecycle` (24 checks on 0.11.0) and says the `partial` is the missing `onContextMenu`/`aria-haspopup`, **not** the opening path, with the probe's negative control (`opens=0` for a primary press) named. The page (`docs/context-menu.mdx`) gains §Measured in a real window and now tells the measured pointer-open focus rule instead of the euphemism: a pointer-opened menu records no restore target, so dismissing it leaves the native focus `none`, and a consumer that wants it back uses `Shift+F10` or a controlled `open`. That rule is now also held headlessly: `src/behaviour/context-menu.test.tsx`'s `leaves the focus nowhere when a pointer-opened menu dismisses` (18 tests), proven both ways — making the pointer path record a restore target fails it with `expected Some "row", got None` |
| Mount the components' examples in the playground — `packages/components/examples/index.ts` is the registry the playground is meant to mount (its header says so), and it lists **24 of the 39** `*.example.tsx` files; the package also publishes no `./examples` subpath, so `apps/playground` cannot import it at all (a relative import would leave `rootDir: src`). The 15 unregistered examples are `carousel`, `color-picker`, `countdown`, `drawer`, `fieldset`, `form`, `hotkey-recorder`, `inline-edit`, `keyboard-shortcuts`, `mention-input`, `navigation-menu`, `preview-card`, `stepper`, `tag-input` and `timeline` — every one the Tier 2 wave landed after the registry was written | components (registry + package export); then playground | **both halves landed** — the registry is 39/39, alphabetical, and `package.json` publishes `"./examples": "./examples/index.ts"` (an exact key, so it wins over the `"./*"` pattern). `src/examples.test.ts` holds the registry to the directory in both directions: every `*.example.tsx` file is registered under its own name, every entry imports that file, the file exports the symbol the entry registers (a file may export more than one — `drawer` and `tabs` do), no id repeats, and the subpath stays exported. The first case failed on the 15 missing ids before the fix and passes now (`nub --filter @gpuixui/components test` 385). **Playground half landed too** — the `examples-mount` headless scenario mounts the registry one screen at a time, in sorted id order, and asserts the readout names the next id, the wrapper lays out a height of its own, its own subtree text is non-empty (a screen that renders nothing paints no text) and, after the last press, that the gallery is empty — so the plan covers exactly the registry. 39 pages / 158 checks, `--only examples-mount` green on 0.11.0; two negative controls measured (an id with no registry entry: `no-such-example lays out a height of its own — expected true, got false`; every page mounted from one component: `no two examples paint the same screen — expected 39, got 1`, exit `1` each). Full headless suite 32/32 green. Evidence: `apps/playground/README.md` §The example gallery. `/docs/examples` already lists all 39 from the filesystem |
| `/docs/examples` still says the components' examples "are not mounted in the playground yet — that registry is a tracked task in `TODO.md`", which stopped being true when the registry reached 39/39 and the playground gained `examples-mount` | docs-site | **resolved** — §Running one now teaches both native mounts: the primitives command it already printed, and the components' registry through `examples-mount` (`nub run --filter playground build`, then `nub apps/playground/dist/smoke/run.js --only examples-mount`), with what the scenario asserts (one screen at a time in sorted id order, each wrapper paints a height and its own text, no two entries paint the same screen) and a pointer to `apps/playground/README.md` §The example gallery for the checks and negative controls. The honesty paragraph above it is unchanged. `examples-page.test.ts` grew two cases: the printed command is resolved to the app's manifest (`name` filter, `build` script, the `dist/smoke/run.js` path in `smoke`) and to the scenario registry (`id: "examples-mount"` plus its `index.ts` view binding), and the record it cites must carry the named heading. The old sentence is the regression: restoring "not mounted" fails `expected … not to contain 'not mounted'`, swapping the id for `example-gallery` fails `expected … to contain '--only examples-mount'` (both measured); `nub run --filter @gpuixui/docs test` green (45 files / 385 tests), `check-types` and `build` green |
| Record the **clipboard** capability — the binding has no clipboard read or write, and the window probe measured what a consumer can actually do: `cmd-a`/`cmd-c`/`cmd-v`/`cmd-x` inside a focused field reach `onChange` (select-all, copy, paste, cut all work), while none of those keys reach the app's window handler, so a component cannot offer "copy" for a selected text run, a table row or a `<code>` block. `docs/gpuix-capabilities.md` §3 and `/docs/runtime`'s measured table have no clipboard row, and the Tier 3/4 rows (log viewers, tables, code viewer) do not state the measured alternative (a read-only field the user selects and copies) | docs-site | **resolved** — §3 carries two rows: **App-level clipboard** (`not supported` — no read/write in `index.d.ts`/`host.d.ts`, and the keys never reach the window handler, with the read-only-field workaround) and **Clipboard keys inside a focused field** (`supported, with limits` — select-all/copy/paste/cut reach `onChange` against a per-mount marker). `/docs/runtime#measured-in-a-window` publishes the one row a reader needs, §5 names the probe it owes, and `capability-doc.test.ts` gained the doc-row case, the page-row case and `clipboard-lifecycle` in the required-probes case. Both directions measured: deleting the two doc rows fails `expected undefined to be 'not supported'`, and deleting the page row fails the page case (`the page's measured table has no clipboard row`) plus the required-probes case. Evidence: `apps/playground/README.md` §`clipboard-lifecycle`, 9 checks on 0.11.0 with `expected "gpuix clipboard q6uuii", got "gpuix clipboard pt6c88"` as its negative control. Exposing a `Clipboard` inventory row or a component-level copy action is not possible without a runtime API, so no library change follows |
| Cite `selection-lifecycle` where selection is described — the window measured a **pointer** drag over a selectable `Text` (the wash paints, `getSelectedText()` reports the run, `Cmd+C` copies it, a default node opts out), which the headless `text-selection` scenario could not: it drives the renderer's `dragSelect`. `docs/gpuix-capabilities.md`'s **Text selection** row and `/docs/runtime`'s measured table rest on that synthetic verb, and the selection row also owes the measured geometry rule (the line's box must hug its glyphs, or the press lands past the last glyph and selects nothing) | docs-site | **resolved** — the **Text selection** row now records the pointer measurement (wash paints, `getSelectedText()` reports `ection world`, `Cmd+C` pastes the run into a field, `clearSelection()` clears it, a default `Text` paints none) beside the synthetic `dragSelect` it replaces, and states both limits: the box must hug its glyphs (`alignSelf: "start"`) or the press selects nothing, and an **initiated** copy has no API though the user's own gesture works. `/docs/runtime#measured-in-a-window` gains the same row, and §5's owed-probe list names `selection-lifecycle`. `capability-doc.test.ts` gained two cases (the doc row and the page row) and the required-probes case names the probe; four repeated table parses were hoisted into `measuredRow` at the same time. Directions measured: removing the probe from the doc row fails `expected … to contain 'selection-lifecycle'`, deleting the page row fails the page case (`the page's measured table has no text-selection row`) and the required-probes case, and the full docs suite is green (45 files / 380 tests) with `check-types` clean. Evidence: `apps/playground/README.md` §`selection-lifecycle`, `.artifacts/live/selection-dragged.png` |
| Record the `<virtual-list>` **itemCount window mode** — the capability record's Virtualized list row described only the children form ("retains thousands of rows and paints a window"), while a table of 100 000 rows needs `itemCount` + `estimatedItemHeight` + `windowStart`, where the app renders the slice. The playground's `virtual-list-windowed` measured that mode: only the 60-row window is retained (`wrow-60` absent), the estimate positions mounted-but-unpainted rows, `onVisibleRange` reports **absolute** indices but still lags the paint by one gesture (the event read `20..27` while the paint had reached `40..46`), a press reports the row's absolute index, and `scrollToItem(90000)` paints `File 90000` at `-90000 × 28` after the app moved its window. Two rules a table must carry: the window must exceed viewport + overdraw, and a reveal moves the app window before calling `scrollToItem` | docs-site (capability record + `/docs/runtime`), and the Tier 3 data-grid component that reads the mode | **resolved (docs half)** — the record's Virtualized list row now names both modes, the `itemCount` one measured by `virtual-list-windowed` (only the window retained, the estimate's mounted-but-unpainted rows, the absolute `20..27` range lagging the `40..46` paint, the absolute press, the `-90000 × 28` reveal), and the workaround carries the two rules (a window wider than viewport + overdraw, and move `windowStart` before `scrollToItem`). `/docs/runtime#measured-in-a-window` publishes the same row, §1 of the record describes both modes, §5's owed-probe list names `virtual-list-windowed`, and `capability-doc.test.ts` gains the record-row and page-row cases plus the probe in the required list. Directions measured: with the rows untouched the three cases failed on `itemCount` (record and page) and on `virtual-list-windowed` (required probes); they pass with the rows. The Tier 3 data-grid component that reads the mode is still the component workstream's |
| Record the `<virtual-list>` **variable row heights** — the capability record and the Virtualized list inventory row say rows are measured, and every probe declared fixed heights, so nothing measured it. The playground's `virtual-list-rows` (15 checks, 0.11.0) measured 400 rows cycling 24/48/72px: each paints its own height and starts where the previous ended, `scrollToItem(150)` lands that row at the viewport's top edge from estimates, and growing row 0 by 40px while the reader sits at row 150 leaves both the painted rows and the offset untouched because a row outside the window is not remeasured until it paints; after returning to the top the grown row paints 64px and row 1 moves down by the growth. Three negative controls measured. | docs-site (capability record + `/docs/runtime`) | **resolved** — the record's Virtualized list row carries the `virtual-list-rows` measurement (each row's own height, the estimate-positioned reveal at row 150, the untouched offset while row 0 grew outside the window, the 64px repaint on return) and its workaround says an expandable or streamed row must be measured while it is **on screen**. `/docs/runtime#measured-in-a-window` publishes the same row, §5's owed-probe list names `virtual-list-rows`, and `capability-doc.test.ts` gains the record-row and page-row case plus the probe in the required list. Directions measured: with the rows untouched the case failed on `virtual-list-rows` and the required-probes case on the page; both pass with them. Evidence: `apps/playground/README.md` §The virtual list's variable rows |
| Record **floating layer placement** — `FloatingLayer`/`<anchored>` are named in the record's §2 provided list, so a plan building its own menu had "positioning works" and nothing about the box. The live `floating-sides` probe measured the horizontal sides and the runtime's centre rule: `side="right"` puts the panel one 6px gap off the anchor's right edge, `side="left"` mirrors it, `align="start"` holds the top, and **`align="center"` ends the panel at the anchor's centre line instead of centring it** — the quirk the overlay components compensate for with a measured start offset. The headless `floating-placement` scenario runs the engine against the `TestRenderer`, and the two can differ | docs-site (capability record + `/docs/runtime`) | **resolved** — the record gains a **Floating layer placement** row (`supported, with limits`) with the four measured placements, the centre quirk and the workaround (`align="start"` when the box matters; offset a centred panel yourself by half its measured height). `/docs/runtime#measured-in-a-window` publishes the row and §5's owed-probe list names `floating-sides`. `capability-doc.test.ts` gained the record-row and page-row case plus the probe in the required list. Directions measured: with the rows untouched both cases failed (`expected undefined to be 'supported, with limits'` and the page missing `floating-sides`); they pass with the rows. Evidence: `apps/playground/README.md` §`floating-sides` |
| Record the **Select option reveal** gap — `@gpuix/react`'s `Select` is named in the capability record's provided list (§2), so the record read as "a Select is just a wrapper over a working list". Two measurements say more: the live `select-lifecycle` probe measured the overlay half (one 6px gap below the trigger's start edge, focus into the list, opens on the selected row, arrows wrap past a disabled row, `Enter` selects, `Escape`/outside press dismiss and return focus), and `packages/primitives/runtime/fields.runtime.test.tsx` measured the half a keyboard user loses — the runtime sets no max height or overflow, `SelectScrollUpButton`/`SelectScrollDownButton` are empty elements in 0.11.0, and twenty `ArrowDown`s leave a 40-option list's 320px scroller at the offset the wheel put it | docs-site (capability record + `/docs/runtime`) | **resolved** — the record gains a **Select option reveal** row (`supported, with limits`) carrying the window's overlay facts and the measured keyboard gap (the 320px cap, the wheel's `-200`, the twenty arrows that move nothing), with the workaround (own the scroller, keep a keyboard-critical list short, or use a `Combobox`/`SearchInput`); `/docs/runtime#measured-in-a-window` publishes the row and §5's owed-probe list names `select-lifecycle`. `capability-doc.test.ts` gained the record-row and page-row case plus the probe in the required list. Directions measured: with the rows untouched both cases failed (`expected undefined to be 'supported, with limits'` and the page missing `select-lifecycle`); they pass with the rows. Evidence: `apps/playground/README.md` §`select-lifecycle` |
| Record the **frozen data-grid column** a table composes — the playground landed `data-grid-frozen-column` (25 checks) and `COMPONENTS.md`'s Tables row names the composition, but `docs/gpuix-capabilities.md` and `/docs/runtime` said only that sticky is absent and the header is a sibling, and the Data display lane page stopped at the header. A table plan reading the record therefore had no pinned-column rule at all: it would have tried `position: "sticky"` or one scroller, and the measured composition — two panes mirrored in both directions through `onScrollChange` → `scrollTo`, guarded by a ref, with the horizontal pan on the data pane alone — was invisible | docs-site (capability record + `/docs/runtime` + the Data display lane page) | **resolved** — the record gains a **Frozen column** row (`supported, with limits`: composed, not provided) carrying the measurement (both panes move to `-300` and `-600`, the row under the reader keeps its `y`, a `deltaX` wheel leaves the column still, a frozen-cell press selects the row for the whole grid, both clamp at `-1440`) and the workaround (a ref guard on the mirror, `overflowX` on the data pane, no single-scroller freeze). `/docs/runtime#measured-in-a-window` publishes the row, §5's owed-probe list names `data-grid-frozen-column`, and the Data display page's fixed-header bullet gains the other-axis rule. Guards: `capability-doc.test.ts` gained the record-row and page-row case, the required-probes case names the probe, and `lane-page.test.ts` holds the page to the record's row. Directions measured: with the rows untouched the three cases failed (`expected undefined to be 'supported, with limits'`, the page missing `data-grid-frozen-column`, and `no row named Frozen column`); they pass with the rows. Evidence: `apps/playground/README.md` §A frozen data-grid column |
| Record the `<virtual-list>` **reveal and range** measurement — `docs/gpuix-capabilities.md` §3's Virtualized list row said only "`<virtual-list>` retains thousands of rows and paints a window (~9 rows in the probe)" and "read the painted window, not the index", and `/docs/runtime`'s measured table had no virtual-list row, so a reader looking for "how do I reveal a file deep in a tree" or "can I paginate from `onVisibleRange`" had nothing to read. The playground's `virtual-tree-lifecycle` measured: `renderer.scrollToItem(list, 3000)` reveals a row that was never mounted and `getListScrollTop` anchors at `itemIndex=3000` with the list's own viewport; a programmatic reveal fires **no** `onVisibleRange`; changing the flattened child count reports indices (`1..2`, `0..1`) computed against the spliced child list, not the painted rows; and roving focus from a row's key handler works through `useGpuix().renderer.focusElement` | docs-site (capability record + `/docs/runtime`), and the Tier 3/4 components that read the event | **resolved** — the record's Virtualized list row carries both probes (`virtual-tree-lifecycle` for the reveal, the anchor and the roving focus, `virtual-list-lifecycle` for the lag: rows 13–21 paint while the report still reads `first=0 last=9`) and the consumer rule — reveal with `scrollToItem`, read the painted rows or the anchor rather than the index, never paginate from `onVisibleRange` across a row-count change, and a tree moves native focus instead of mounting a tab stop per row. `/docs/runtime#measured-in-a-window` publishes the same row, and the Data display lane page's virtualization bullet and Hierarchical-data gap carry the rule so a table or tree plan reads it where it will be built. Guards: `capability-doc.test.ts` gained the record-row and page-row cases (both in `virtual-tree-lifecycle`) and the required-probes case names the probe; `lane-page.test.ts` gained a case holding the page to the record's row. Directions measured: dropping the probe from the page row fails the page case and the required-probes case, replacing the record's reveal with the old wording fails the row case, and rewording the page's reveal fails the lane case. Probe evidence: 30 checks on 0.11.0 with two negative controls (`apps/playground/README.md` §`virtual-tree-lifecycle`) |
| Record the **`createPortal`** measurement — `docs/gpuix-capabilities.md` §3 and `/docs/runtime`'s measured table had no portal row, and `@gpuix/react`'s own example was the only documentation a consumer had; the Tier 4 Detachable-tabs row and the Dialog page's "future migration" both depend on a portal working in a window. The playground's `portal-layer` measured: a portalled card paints inside its target's box and outside an ancestor's clip, keeps the caller's React context, receives a pointer press and keys in a field, and unpaints when detached; `getPaintedText` still lists a clipped sibling's glyphs, so a clip must be proven from a capture; and the clipping box has to be the child's containing block (an unpositioned `overflow: hidden` box does not clip an absolutely positioned child) | docs-site (capability record + `/docs/runtime`), and the components' Dialog/Toast migration | **resolved** — the record gains a **Portals** row (`supported, with limits`: `createPortal` is published; the measurement, the two limits and the workaround are on the row) and `/docs/runtime#measured-in-a-window` publishes it. Two stale page claims moved with it: **Workspace** sent a detachable tab away with "needs a portal or drag model; the runtime has neither" — the row now says the portal exists and a window measured it, and the remaining gap is the **second OS window** (one window per process, no drag host), so a tab can move to another layer or pane through `createPortal`; the curated **Popover** page's "There is no portal" became "it paints an anchored surface rather than a portalled one". Guards: `capability-doc.test.ts` gained the record-row, page-row and Popover-page cases (the required-probes list names `portal-layer`), and `lane-page.test.ts` holds the Workspace row to the record. Directions measured: dropping `portal-layer` from the record fails the row case, dropping it from the page row fails the page and required-probes cases, restoring "the runtime has neither" fails the lane case, and restoring "There is no portal" fails the component-page case; restored, 46/46 green. Evidence: `apps/playground/README.md` §`portal-layer`, 19 checks with two negative controls, `.artifacts/live/portal-attached.png` |
| The shipped `Select` cannot be driven from an automation test: `SelectProps` passes a **root** `testId` to `GpuixSelect` and nothing to `SelectTrigger`, `SelectContent` or `SelectItem`, so a locator can address neither the control nor an option. The window probe (`select-lifecycle`) therefore mounts the runtime's own parts, which measure the behaviour the wrapper inherits; the `COMPONENTS.md` Selects row likewise cites no probe. Add `triggerTestId`/`itemTestId` (or accept `testId` on the parts), then the probe can mount the wrapper and the row can cite it | primitives (and the Selects inventory row) | **resolved, both halves** — `SelectProps` now takes `triggerTestId` (the element that opens the list) and `itemTestId(value)` (one locator per data-driven row), and `renderSelect` forwards each to the part it names; the root `testId` stays on the wrapper that paints only its width. `src/components/Select.test.tsx`'s `Select locators` suite holds the trigger id, the per-row derivation and the rule that a root id alone leaves the control unaddressable; `runtime/fields.runtime.test.tsx`'s `addresses a Select's trigger and an option row by test id` presses the trigger and the row by locator in a real renderer (measured both ways: without the forwarding `runtime.element("fruit-trigger")` is `none`). `docs/select.mdx` and the `COMPONENTS.md` row record the contract. **Playground half now landed** — the `select-lifecycle` probe mounts the shipped wrapper beside the runtime parts, addressing it only through `triggerTestId`/`itemTestId`: the trigger opens its list on a press, a press on `shipped-row-weekly` selects it (`value=weekly changes=1`) and repaints the trigger, `down`+`Enter` chooses the next row, and `Escape` closes it with the focus back on the trigger. 36 checks (26 on the runtime's parts, 10 on the wrapper) green on 0.11.0 (`--only select-lifecycle`); negative control measured (a constant row locator: `a press on the shipped trigger opens its list — expected true, got false`, exit `1`). Evidence: `apps/playground/README.md` §`select-lifecycle` |

| The site's snippet guard covers only `apps/docs/content/docs`; the package pages are not read, so a renamed export in `packages/*/docs` still renders as copyable code. Measured by pointing this pass's walk at the three collections: **one real defect**, `packages/primitives/docs/tooltip.mdx` imports `Icon` from `@gpuixui/primitives` (that package does not export it — `Icon` is `@gpuixui/icons`); every other package page resolves | primitives | **docs half landed** — `apps/docs/src/lib/page-snippets.test.ts` walks the site's pages plus every `packages/*/docs` directory (98 pages) and reads `ts` as well as `tsx` fences, and it records this one page with its owner: an unrecorded problem fails by page and name, and the entry fails once the page is fixed (`nub run --filter @gpuixui/docs test` green, 53 files / 440 tests). **primitives half landed too** — `packages/primitives/docs/tooltip.mdx` imports `Icon` from `@gpuixui/icons` (and takes its colour from `useTheme()` instead of an undefined `colour` variable), the page gains a `Dependencies` table naming `@gpuix/react/tooltip` and `@gpuixui/icons`, and `packages/primitives/src/docs.test.ts`'s `imports only names the package exports` case resolves every `@gpuixui/primitives` named import across all 28 pages against the package namespace (both directions measured: restoring `import { Icon, Tooltip }` fails `tooltip.mdx: imports Icon, which @gpuixui/primitives does not export`). **docs-site half landed** — its `knownGaps` exemption is deleted, so the site's snippet walk covers this page with no recorded defect and `nub run --filter @gpuixui/docs test` is green (450/450, re-measured 2026-10-22). The row is closed in both directions: the page imports only what it can resolve, and the site's walk now reads every `packages/*/docs` page |
| The `message-scroller` page ships no `## Related` section, so the only page a reader lands on for the component does not name its siblings, while every other component page does. Found by the new package-page template guard, which holds all 70+ pages under `packages/*/docs` to four sections: `## API`, an accessibility or limitations section, the evidence section (`## Verification` or `## Testing`) and `## Related` | components (owns the page) | open — add `## Related` naming the siblings (`Toast`, `MessageScroller`'s list/scroll parts, `List`, `ScrollArea`) and the guard's `knownGaps` entry in `apps/docs/src/lib/package-page-template.test.ts` is deleted in the same change; its staleness case fails while the entry outlives the gap |
| Prove the filled-action keyboard-dim opt-out in a window — the components' three filled variants paint `keyboardFocusDim: false` and `src/behaviour/button.test.tsx` holds the declaration and the composited collapse headlessly, but no probe reads the painted opacity back off a filled button while another control has keyboard focus. The `keyboard-focus-dim` capture measured the mechanism on a sample, not the shipped `Button` | playground | **resolved** — the `filled-action-dim` live probe mounts the shipped actions and counts each one's own pixels: a filled `secondary` keeps **66 008 → 66 008** exact-fill pixels while the focus moves away and back, a `ghost` action's `success`-tinted label goes **611 → 0**, and a `destructive` action whose caller forces `keyboardFocusDim: true` goes **65 483 → 0**. 12 checks green on 0.11.0 (`--only filled-action-dim`). Two negative controls measured: forcing the filled action into the cue fails `expected 66008, got 0`, and opting the ghost out fails `expected 0, got 611` (exit `1` each). The probe also measured that a **text field is not a dim target** (`renderer.rs` `keyboard_focus_path` skips the dim while an `input`/`textarea` has focus), so it focuses a fourth action; that fact is owed to the token pages by the row below. Evidence: `apps/playground/README.md` §`filled-action-dim`, `.artifacts/live/{pointer,keyboard}.png` |
| Say that the keyboard dim **skips a focused text field** — `docs/tokens.md` §The dim a control paints and `docs/design-system.md` §8 say "every other focusable keeps 40% of itself while one control has keyboard focus", and the runtime does not: `renderer.rs`'s `keyboard_focus_path` returns no path when the focused element is an `input`/`textarea` ("typing is keyboard input too, and dimming the window while someone types is noise"). Measured by the playground's `filled-action-dim`: tabbing into a shipped `Input` left the ghost action's 611 label pixels untouched, while the fourth-action focus target dimmed them to 0 | tokens-theme (docs) and docs-site (the measured table) | open — state the exclusion on both pages (a field is exempt, so a filled action beside a form does not need the opt-out to stay legible while a reader types) and hold it with `focus-dim.test.ts`'s prose guard; the probe evidence is `apps/playground/README.md` §`filled-action-dim` |

| `/docs/themes`'s **Text selection** bullet still describes the old contract: it says `selectionFailures` measures "the four content surfaces body text can be selected from" against "two floors", while `selectionPairs` now also carries `mutedForeground` on the page, a card and a popover at the secondary floor (the tokens workstream measured it and moved the palettes' secondary text). The readout itself needs no new line — the editor never edits `selection`, and `formatSelectionFailure` already words any pair the report returns | docs-site | **resolved** — the bullet now interpolates the pair count (`{selectionPairs.length}`) and both floors (`{contrastFloors.body}` / `{contrastFloors.secondary}`) from the package, names the four content surfaces plus the `mutedForeground` line on the three prose surfaces, and says the caption or second line under a heading is measured too. `theming-page.test.ts` gained a case holding the page to `selectionPairs`: the import must carry `selectionPairs` and `contrastFloors`, every surface the report composites over must be named, both floors must be interpolated, and the retracted "four content surfaces" sentence must not return (measured: the case failed on the import before the fix, and fails on the old sentence if restored) |

| Cite the measured **accessibility tree** where the record promises an AT path — `docs/gpuix-capabilities.md` §3's aria row lists the closed set (`role` plus seven `aria-*` attributes) and the fourteen absences, and says the tooltip's tip text "reaches a screen reader as the trigger's `aria-description`", while nothing had read the tree. The playground's `a11y-tree` (19 checks, 0.11.0) measured the mapping: the token becomes the platform's role name, `aria-label`/`description`/`id`, `selected`/`expanded`/`level`/`valuetext` reach their fields, `onClick`+`tabIndex` surface as `Click`/`Focus`, a `<text>` is a `Label`, and a node needs a role to exist (a div with only an `aria-label` is absent; `role="none"` is dropped). It is a `TestRenderer` fact: a window's automation protocol has no a11y verb | docs-site (capability record + `/docs/runtime`), and primitives for the shipped `Tooltip` row's claim | **docs half landed** — §3 carries the **Accessibility tree (`getA11yTree()`)** row (`supported, with limits`, the platform role names, the four attribute fields, the `Click`/`Focus` actions, the `<text>` `Label`, the role-required rule and the `TestRenderer` limit, with the workaround naming `role` + label and `aria-valuetext`), §4 states the measured mapping beside the existing "needs a role to exist" sentence, and §5's owed-probe list names `a11y-tree`. `/docs/runtime` publishes it in a new **Measured offscreen** section rather than the window table, because no paint proves it. `capability-doc.test.ts` gained the record-row, page-row and offscreen-section cases, `a11y-tree` in the measured-gaps case, and a cross-file case: every probe a page row cites in `(`id`)` form must be declared by `apps/playground`'s headless or live registry **and** be named in §5 — which caught a pre-existing omission (`virtual-list-lifecycle` was cited by the virtual-list row while §5 owed it none) now added. Four directions measured: dropping `a11y-tree` from §5 fails naming it (`expected [ 'a11y-tree' ] to deeply equal []`), a mistyped page citation fails the registry case (`[ 'a11y-tre' ]`), deleting the record row fails `expected undefined to be 'supported, with limits'`, and deleting the page row fails both page cases. `Tooltip`'s inventory claim is still primitives' half. Evidence: `apps/playground/README.md` §The accessibility tree |
| Record the **expandable-row** rule the runtime measured — the capability record's Virtualized list row covers the rows' heights (`virtual-list-rows`) but says nothing about a row that grows **while it is painted**, which is what an expandable row or an expandable table row is. The playground's `virtual-list-expand` (18 checks on 0.11.0) measured: the row re-measures on the next frame with no scroll and no offset change; the rows below shift by the growth and a press lands on the shifted row; the measured height is remembered across the window round-trip; the grown height joins `scrollToItem`'s arithmetic; and the list paints whole rows, so a growth that leaves less than a row of the 240px viewport drops the following row out of the painted window until a scroll | docs-site (capability record + `/docs/runtime`), and the Tier 3 Expandable rows component | **docs half landed** — the Virtualized list row now carries the `virtual-list-expand` measurement (the 120px re-measure with no scroll, the shifted row and the press that lands on it, the following row leaving the painted window, the remembered height, the estimate) and its workaround says to size an expandable table's viewport against the **open** row height. §3 gains the missing composition row, **Resizable panels and dock reflow** (`supported, with limits`): `panel-resize`, `split-pane-lifecycle` (all eight moves 80px outside a 6px divider) and `docking-nested` for the drag and nesting, `dock-reflow` for the re-clamp signal — the settled `onLayout` payload equals the painted box (`w=240`), the reflow's **first** pass reports the old box (`w=340`, `reports=2`), and an unchanged pane is still reported to, so the handler is idempotent. `/docs/runtime` publishes **Expandable rows** and **Dock reflow**, and §5's owed-probe list names `virtual-list-expand`, `dock-reflow`, `docking-nested`, `panel-resize` and `split-pane-lifecycle`. `capability-doc.test.ts` gained the two record-and-page cases; three directions measured: removing the two cited probes from §5 fails `expected [ 'dock-reflow', 'virtual-list-expand' ] to deeply equal []`, deleting the page's Dock reflow row fails `the page's measured table has no dock-reflow row`, and deleting the record row fails `expected undefined to be 'supported, with limits'`. `nub run --filter @gpuixui/docs test` 56 files / 458 tests, `check-types` and `build` green. Evidence: `apps/playground/README.md` §An expanded row, §Dock reflow |

| The `/docs/themes` Numbers bullet names a control height as the only press-target token — `invalidNumbers` now holds `density.rowHeight` to `targetSize.minimum` too, because a `dense` list row (built at exactly that height) takes a press. The page's sentence "A control height is also the box a pointer presses" should name the row beside it; `themes.mdx` §The theme audit is the only site surface that enumerates the rules, so nothing else on the site changes | docs-site | **resolved** — the Numbers bullet reads "A control height — and a list row, which a `dense` row builds at exactly `density.rowHeight` — is also the box a pointer presses, so both are held to the library's {targetSize.minimum}px target floor", still interpolating the floor from `targetSize` rather than printing it. `theming-page.test.ts` gained `names the row height the pressable rule also holds`: it builds `extendTheme(themes.light, { density: { rowHeight: 20 } })` and requires the report to be exactly `[{ group: "density", path: "rowHeight", value: 20, rule: "pressable" }]`, so the rule is read from the code rather than restated, and it fails on the retracted sentence. Direction measured: restoring the old sentence fails with `expected … to contain 'rowHeight'`. `nub run --filter @gpuixui/docs test` green, `check-types` clean |

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

`[ ]` `[███░░░░░░░]` 1/3

`[ ]` Consistency, keyboard, themes, composability pass
`[ ]` Performance and packaging
`[x]` Docs truth pass against the implementation
  - [x] `packages/primitives/docs` cites `@gpuix/native@0.10.0` 19 times across 14 pages (owner: primitives). Re-verify each claim against 0.11.0 rather than replacing the version string: this workstream has already found three closed gaps (`aria-description` on a trigger, `scrollbarColor`/`scrollbarWidth` on a scroller, `role`/`aria-level` for headings) and several still-true ones (no `aria-valuenow`, no `aria-checked`, no pointer capture). Record the version each verdict was taken on. — **landed**: every remaining verdict was re-read against the installed `@gpuix/native` 0.11.0 typings (`host.d.ts`): the aria set is still exactly label/description/id/expanded/selected/valuetext/level, so no `aria-valuenow`/`checked`/`pressed`/`labelledby`/`disabled`; `onPaste`, pointer capture, `transform`, a fade mask and `gridColumn`/`gridRow` are still absent; **two claims failed and were corrected rather than relabelled** — `StyleDesc` now accepts `borderStyle: "dashed"` and a linear-gradient `background`, so `box.mdx`/`COMPONENTS.md` no longer call those runtime absences (they are `Box` API gaps, pass them through `style`), and `@gpuix/react` 0.11.0 now publishes a headless `./button` (`Button`/`buttonProps`), so `button.mdx`/`Button.tsx` no longer say it does not exist; 13 docs pages, both `label` comments, seven source headers, the README's capability table (scrollbar tint is present, `./button` published) and `MIGRATION.md` now name 0.11.0. `src/runtime-version.test.ts` walks every docs page, source, runtime suite, example, `README.md` and `MIGRATION.md` and fails on any `@gpuix/<pkg>`/`GPUix` version that is not the workspace pin (both directions measured: a 0.10.0 in `Meter.tsx` and the README table fails by file name), with a floor so a scan that stopped matching cannot pass. The README's own runtime count was stale too and now reads the measured 15 files / 146 tests
  - [x] `packages/components` cited the **previous runtime** in 148 places across
    78 files (66 of them docs pages). Each claim was re-read against the
    installed 0.11.0 typings (`HostProps`, `StyleDesc`, `MotionStyle`,
    `ElementType`, the `@gpuix/react` exports), not find-and-replaced: the aria
    set is still exactly label/description/id/expanded/selected/valuetext/level,
    with no `aria-current`/`checked`/`pressed`/`disabled`/`labelledby`/
    `describedby`/`haspopup`/`activedescendant`/`live`, and there is still no
    transform, pointer capture, sticky position, `fieldset`, `href`, caret API or
    `onContextMenu`. The claims that had **closed** were corrected instead of
    relabelled: List's ring is the keyboard-only `focusVisible` outline;
    `preventDefault` exists, so `HotkeyRecorder` now swallows a recorded key (a
    new native test measures Tab being recorded while focus stays put, 9 in the
    suite); Dialog/Drawer say they do not use the published portal rather than
    claiming none exists; the local Button says `@gpuix/react/button` is
    published while the styled contract stays in primitives; the runtime
    publishes a `win32-arm64` binding (added to the guard's host list) and motion
    animates box geometry and opacity (Carousel's wording); Countdown drops the
    unverified timer-role claim for the measured `aria-live` gap. Guard:
    `src/runtime-version.test.ts` (two cases; a planted `0.10.0` in
    `command-menu.mdx` fails by file and line, and the floor fails a scan that
    stops matching).

   - [x] The **Data display** lane's drawing claims were a version behind the record: its Charts gap row called `<canvas>` "documented as planned and is **unverified**" and §Where a data change goes sent a chart away "until a native drawing surface is verified", while `docs/gpuix-capabilities.md` has measured the surface (`Inline SVG painting` `supported, with limits` — one tint, one `<svg>` per colour; `Image painting` — a pixel buffer only from a layout effect; `Canvas drawing` `not supported` — blank). The row now states all three and the workaround (one stacked `<svg>` per series; `<img>` for pixels), and the hand-off says a chart waits on a reusable component, not on a surface. `lane-page.test.ts` gained three cases: the page's row must carry **one tint** and **blank** and must not say `unverified`/`planned`; it must carry the `stacked`/`layout effect` workaround, with both facts re-read from the record's own rows; and the retracted sentence must not return. Directions measured: restoring the old row fails two cases (`expected … to contain 'one tint'`, `… 'stacked'`), and restoring the retracted sentence fails the third by name. The same pass added the measured **fixed header** rule to the table design (the runtime paints no `position: "sticky"`, so the header is a sibling outside the row scroller and both share one horizontal scroller) with a case held to the record's `Sticky positioning` row and `data-grid-fixed-header`; replacing it with a "sticky header" recommendation fails by name. `nub run --filter @gpuixui/docs test` green (45 files / 390 tests)

   - [x] The **Workspace** lane denied pointer capture ("no pointer capture, so a drag ends when the pointer leaves the divider") and called every terminal surface unverified, both of which a window has measured since. The page now states the rule — capture is armed on a left press only for an element that listens to both `onMouseDown` and `onMouseMove`, so a divider declaring both keeps the drag and its release outside its own box while a move-only one loses it to its sibling — and separates **rendering the app into a terminal** (`render(<App />, { terminal: true })` with `isTerminal()`, supported) from **hosting a PTY inside a window** (no host element, unverified). `lane-page.test.ts` holds both claims to the record's `Pointer capture` and `Terminal rendering` rows and fails the old wording by name. Directions measured: restoring "no pointer capture"/"No terminal host element" fails both cases, and dropping the two-listener rule fails the capture case (`expected … to contain` the `onMouseDown` token)

### Docs information architecture (`docs-site`)


`[x]` `[██████████]` 62/62

`[x]` The snippet guard reads **every mounted page and both fence languages** — it walked only `apps/docs/content/docs` and only ```tsx fences, so a renamed export on one of the 71 pages the packages ship still rendered as copyable code, and `/docs/runtime`'s plain ```ts snippet (`capabilities`, `unsupportedFeature`) was never resolved. `src/lib/page-snippets.test.ts` now walks the site's pages plus every `packages/*/docs` directory (98 pages; floors of 90 pages and 60 that import a workspace package) and `doc-snippets.test-util.ts`'s parse reads `ts` and `tsx` fences. The walk found the one defect `TODO.md` already recorded — `packages/primitives/docs/tooltip.mdx` imports `Icon` from `@gpuixui/primitives`, which publishes no such symbol — and, because that page belongs to another workstream, records it with its owner rather than fixing it: an unrecorded problem fails by page and name, and an entry that stops being a problem fails so the list cannot outlive the defect. Directions measured: emptying the record fails `import only names the packages publish` with the tooltip line, a planted entry fails `records no defect a page no longer has`, and reverting the parse to ```tsx fails `reads a plain TypeScript fence, not only a tsx one`. Docs in `docs/preview-strategy.md` §Pages the package writes and the site README.

`[x]` The theme editor words the **leading** rule — `@gpuixui/tokens` added a fifth `NumberRule` (`leading`: a type role's line height reaches its own font size), and `numberRequirement` in `theme-editor-logic.ts` mapped four, so `check-types` failed (TS2741) and the readout would have printed `needs undefined` for a leading that stacks the next line into this one. The map gained the rule's sentence in the reader's terms (`typography body.lineHeight — 12 cannot be laid out (needs a line height at least its own font size)`), `/docs/themes` §The theme audit's Numbers bullet states the two-token rule, and `theme-editor-logic.test.ts` builds that brand and asserts the exact line — measured: dropping the map entry fails it with `needs undefined`. `theming-page.test.ts` holds the page to the rule `invalidNumbers` actually returns (the short-leading brand reports `leading`, and the bullet names the rule and its `own font size`), so a rewrite cannot drop it. `check-types` and `nub run --filter @gpuixui/docs test` green (53 files / 440 tests)

`[x]` The preview policy's examples section teaches a registry that exists — `docs/preview-strategy.md` still told a contributor the components' examples were "the copy-target for their pages and have no runtime registry yet — that is a tracked task", long after `examples-mount` mounted all 39 and `/docs/examples` was corrected (the policy half was missed). It now names both native mounts (the primitives' `runtime/examples.runtime.test.tsx` and the playground's `examples-mount`), says what the scenario asserts, and points at `apps/playground/README.md` §The example gallery. `examples-page.test.ts` gained a case holding the policy to the command the page prints — the old sentence fails on "no runtime registry", a renamed scenario fails on `examples-mount`, and a policy that drops the primitives command fails too — so the file a page author reads before writing cannot promise a registry that is gone or deny one that exists.

`[x]` The landing page's links are held to the mounted pages — the front door
writes its CTAs in components, not MDX, so the page-level link guard never read
it: a renamed or never-mounted page behind a CTA would 404 from the only page a
first-time reader sees, and the build would stay green. `landing-links.test.ts`
walks the four collections to build the mounted URL set and reads every
`href="/…"` in `src/components/landing`, then fails a target the site does not
serve; a second case keeps the quick-start and component-index CTAs. Floor: eight
links and fifty mounted URLs, so a scan that stopped matching cannot pass.
Directions measured: `/docs/get-started` in `deck.tsx` fails both cases and names
the file

`[x]` The platform switch's navigation memory is tested — the mission promises the
choice is "remembered across navigation", the URL half was tested and the local
storage half was not: `src/lib/platform-storage.ts` now owns it
(`readRememberedChoice` / `writeRememberedChoice` over a minimal `ChoiceStorage`,
so a test can stand in), the provider calls it instead of writing two keys
inline, and `platform-storage.test.ts` (4 cases) proves both axes read back, an
unusable stored value falls back **per axis** (a bad platform does not reset a
good look), a deliberate `native` overwrites an old Luna, and the switch has no
key literal of its own. Directions measured: dropping the look write leaves the
old `luna` in place (case fails) and making the look fallback depend on the
platform resets `aero` (case fails)

`[x]` The theme editor words the **pressable** number rule — `NumberRule`
gained a fourth value when the token package started holding a control height to
the 24px target floor, and `apps/docs`' `numberRequirement` map had three keys, so
the editor the docs call "the whole audit" would have printed `needs undefined`
for a short control. The map now reads
`pressable: a pressable height of ${targetSize.minimum} or more` (the floor is
interpolated, not retyped), and `/docs/themes` §The theme audit says a control
height is also the box a pointer presses, with `{targetSize.minimum}px` on the
page. `theme-editor-logic.test.ts` builds a dark theme with
`controlHeight.md = 20` and asserts the exact line
(`density controlHeight.md — 20 cannot be laid out (needs a pressable height of 24 or more)`) while `audit.contrast` stays empty; rewording the map fails it.
`theming-page.test.ts` holds the page's interpolation, and its import case now
accepts the wider import list (it pinned the exact statement). Directions
measured: the old three-key map fails to compile, and the reworded map fails the
new case; `nub run --filter @gpuixui/docs test` green (50 files / 407 tests),
`check-types` clean

`[x]` Every TypeScript snippet the site prints imports real symbols — the
introduction, getting-started and installation pages had their own guards while
the other site pages' copyable code was unchecked. `src/lib/page-snippets.test.ts`
walks `apps/docs/content/docs`, parses each page's `tsx` fences and resolves every
`@gpuixui/*` named import through the shared `doc-snippets.test-util` (the parse
skips inline `type` names, which the value-symbol index cannot describe). It
found a real defect: `/docs/runtime`'s spring snippet imported `layoutSpring` from
`@gpuixui/motion/react`, which re-exports the hooks but not the physics — the page
now imports it from `@gpuixui/motion`. Directions measured: restoring the old
snippet fails with the page's name, and renaming an import on the installation
page fails with `@gpuixui/primitives does not export Buton`. The package pages are
outside this workstream's paths and are recorded as an interlock row

`[x]` The introduction names exactly the runtime's host elements — the page a
reader meets first listed eleven `<tag>` names and nothing held the list to the
runtime, so an element added to `@gpuix` or removed from it would leave the page
describing a different runtime than the library uses. `introduction-page.test.ts`
reads the union from `docs/gpuix-capabilities.md` and the sentence from
`content/docs/index.mdx` and compares them in both directions, plus resolves the
page's `@gpuixui/*` imports through the shared snippet helper. Directions
measured: deleting `virtual-list` **and** adding `fieldset` both fail the set case.
The same pass hoisted the snippet parse and symbol index out of
`getting-started.test.ts` and `installation-page.test.ts` into
`src/lib/doc-snippets.test-util.ts`, so a third consumer did not copy a fourth
parser

`[x]` The installation page's commands are held to the workspace — it is the
first page a reader follows and nothing read it: `src/lib/installation-page.test.ts`
(4 cases) holds the page's Node version to `.node-version` and its manager name to
the root manifest's `devEngines`, every `nub add @gpuixui/<pkg>@workspace:*` to a
package the workspace ships, every printed `nub run [--filter <pkg>] <script>` to
that manifest's own scripts, and every `@gpuixui/*` named import to a symbol
`buildWorkspaceSymbolIndex` reads from the source. Directions measured: a changed
Node version, a package that does not exist and `nub run playground` each fail by
name (three cases). The call-site also hit the known `check-tests` regex-stripper
bug (a regex on its own indented line), so the regex begins after `(`.

`[x]` The search index's shadowing rule has a test — the route merged four
collections inline and nothing held the rule that a curated page keeps the URL of
the package page it shadows, so a duplicated URL would hand the index two
documents with one id. `src/lib/search-index.ts` is the merge now
(`uniqueSearchPages`: site pages first, then each package page whose URL is still
free, package order kept) and `search-index.test.ts` proves the curated page wins
over its package twin, a free package page survives in collection order, no
collection can repeat a URL, and the route calls the shared rule instead of
carrying a copy. Directions measured: deleting the dedupe fails the shadowing
case (`expected [ …(2) ] to deeply equal [ …(1) ]`) and the repetition case;
`check-types` caught the helper's readonly return where the loader wants a
mutable list

`[x]` The block pages are held to their registry, and the dashboard teaches the
measured drawing rule — `blocks.tsx` and `content/docs/blocks/*.mdx` were two
inventories nothing compared: a page naming a key the registry lacks throws at
render, a registered block with no page is dead code, and the sidebar could omit
either. `src/lib/block-page.test.ts` parses each registry entry's own `name`/`slug`
(mapping key = block name), requires a page file per slug and the matching
`<BlockPreview name>` on it, and checks `blocks/meta.json` lists every page plus
the root sidebar's `blocks` entry. The same page's chart gap was wrong: it said
GPUix paints `<svg source>` "natively, so this is not a DOM widget" while one
element paints **one tint** (measured by `content-surfaces`), so the page now
labels its preview a browser reproduction, states the one-tint rule and the
one-stacked-element-per-colour workaround, and the recipe's `Chart` takes its
colour as a prop. Directions measured: `name="dashboard-02"` fails the mount case,
and restoring the "not a DOM widget" sentence fails the honesty case (both
named); `nub run --filter @gpuixui/docs test` green (46 files / 396 tests),
`check-types` green

`[x]` The component index searches the API metadata a page already carries —
the filter matched a page's name, description, lane, parts and limitations, so a
reader who knew the prop but not the component had nothing to search.
`propsOf` reads the pages' API tables (`## API` / `## Props`, skipping a
part-headed row like `` `Dialog` prop `` and ignoring a fenced example) and
indexes each prop name plus the capitalised types its type column names, so
`onCheckedChange` finds the switch and `StateStyle` finds every page whose props
take it. The same pass found a real defect: the curated pages' parts live under
`## Composition`, which `partsOf` did not read, so the Components page's own
promise that `DialogFooter` finds the dialog was false; that heading is read
now. `component-index.test.ts` also holds every example query the page prints to
returning a page. The pages write three table shapes — one prop per row
(`Prop | Type`), a part per row with a prop and type column (`Part | Prop |
Type`), and a part per row with its props in a sentence (`Part | Renders |
Props`) — and the first pass read each as the first shape, so a part name
(`TagInput`) was indexed as a prop of its own page; the parser is shape-aware
now, and a real-index case refuses a capitalised prop name.
Directions measured: removing the props half fails 5 cases, removing
`Composition` fails 3 (`DialogFooter` was the only unresolved query), reading a
part table as a prop table fails 3 (a part name as a prop), dropping the prop
column fails 6, and `nub run --filter @gpuixui/docs test` is green (39 files /
318 tests).

`[x]` Architecture page — `/docs/architecture` names all 11 packages, the dependency direction, the recipe pipeline, the Effect boundaries, the testing lanes and where a change goes; `apps/docs/src/lib/architecture.test.ts` fails when a package is added without a row or the page leaves the sidebar
`[x]` Layouts, Workspace and Data display pages — `/docs/layouts`, `/docs/workspace` and `/docs/data-display` are the three composition lanes, each under a Composition sidebar section. Their rows are **generated** from `COMPONENTS.md` by `<LaneTable lane>` (`apps/docs/src/lib/inventory.ts`), so a page cannot call a row shipped while the inventory says `todo`; the summary prints rows/shipped/to-build. Each page names the shipped pieces with links, the gaps with evidence and where a change goes; the layout page carries the window-frame composition preview (`layout-shell`), the workspace page the tabbed-panel preview and the data page links the Dashboard block. `inventory.test.ts` holds the parse (a malformed row is reported, not dropped), `lane-table.test.tsx` proves every row reaches the rendered table, `lane-page.test.ts` proves each page mounts its table, names the inventory and sits in the sidebar. `docs/preview-strategy.md` §"The lane pages" records the template and the no-preview-for-a-missing-component rule. Tests: `nub run --filter @gpuixui/docs test` (10 files, 70 tests), `check-types`, `build`, and the dev server at `/docs/layouts`, `/docs/workspace`, `/docs/data-display`
`[x]` API reference page — `/docs/reference` lists every public entry point, generated from each package's `exports` map by `apps/docs/src/lib/public-api.ts` (specifier, target, pattern/built). It publishes 9 packages and 17 entry points, including `@gpuixui/testing` (a build, so it resolves to `dist/`) and the `@gpuixui/components/*` per-file pattern; `@gpuixui/config` and `@gpuixui/deploy` are named as not published with a reason. `public-api.test.tsx` re-reads every manifest from disk and fails when a declared entry is missing, a target file does not exist, a pattern matches nothing, a specifier repeats, a built entry has no build script, or a package is neither published nor listed as not published; the page test holds the `<ApiReference />` mount and the sidebar place. `nub run --filter @gpuixui/docs test` 11 files / 83 tests, `check-types`, `build`, dev server `/docs/reference`
`[x]` Examples page — `/docs/examples` mounts `<ExamplesIndex />`, generated at build time from `packages/*/examples/*.example.tsx`: one row per shipped example with the page it illustrates (an exact page name wins, a sole `<id>-*` page is accepted, anything ambiguous or grouped goes to its lane index), a summary read from the file's own `<Name> example: …` header, a GitHub link and the source behind a labelled toggle. Nothing is hand-listed, so a new example appears with no docs change. The page states the examples are GPUix modules (the browser shows the source, never a fake preview) and names the primitives runtime command that mounts them; the components' examples run through the playground's `examples-mount` scenario (page §Running one). `examples.test.ts` reads the filesystem and fails on an unmounted file, a dead link, a grouped row sent to a guessed page, or a summary that does not come from its file (both directions measured); `examples-index.test.tsx` proves every row reaches the markup and that no source leaks into the first paint; `examples-page.test.ts` holds the frontmatter, the mount, the honesty sentence and the Reference/sidebar place. Verified in the dev server: `/docs/examples` renders `50 of 50 examples`, the OTP row links `/docs/primitives/otp-field`, the search index returns the page and `/sitemap.xml` carries it
`[x]` Typography page — `/docs/typography` renders the theme's ten text roles through `<TypeScale>`: each row prints the resolved `size/leading · weight` and paints the specimen at those metrics on the platform surface, so the sidebar switch changes the families and never the sizes; tones, the `.SystemUIFont` sentinel and its browser mapping, `registerFonts`, and the limits (one run per role, no heading semantics, no tracking) are documented. `type-scale.test.tsx` fails when the guidance list and `themes.dark.typography` disagree, when a row's metrics do not match the theme, when the mono roles drift, or when the page leaves the sidebar; the sidebar parse is shared with the lane and reference guards in `sidebar-pages.test-util.ts`. `nub run --filter @gpuixui/docs test` 12 files / 88 tests, `check-types`, `build`, dev server `/docs/typography?platform=linux`
`[x]` License and attribution page — `/docs/license` renders `LICENSES/*.md` through `<LicenseInventory>`: one row per record with the reference, its verified licence, what we take and what we deliberately leave out, read at build time with `import.meta.glob(... ?raw)`, so a record added beside the code appears with no docs change. `apps/docs/src/lib/licenses.ts` is the parse (heading, `Repository`/`Licence` bullets with wrapped continuations, the two provenance sections); a record that lacks any of them is not renderable; `licenses.test.ts` fails on an unreadable file in the directory, on each removed part, and on a sidebar place before `contributing`; `license-table.test.tsx` proves every parsed record reaches the rendered table with its licence and source. The footer names the artefacts `LICENSES/README.md` still requires (`inventory.md`, `provenance.md`, `NOTICE`) from the directory itself, so the page states the release status rather than claiming a complete inventory. Two-direction proof: dropping a record fails the count, and removing the `<LicenseInventory />` mount fails the page guard. Tests: `nub run --filter @gpuixui/docs test` 16 files / 108 tests, `check-types`, dev server `/docs/license`
`[x]` Sidebar structure guard — `sidebar-structure.test.ts` holds the root and every section `meta.json` to the files on disk in both directions: a page file missing from the sidebar is invisible (nothing else in the build notices), and a listed page with no file is a dead link. `sidebar-pages.test-util.ts` is the one `meta.json` parse the lane, reference and typography guards share. Proven by adding `orphan.mdx` and a `ghost` entry (each fails its guard); the search index returns the new pages (`/api/search?query=typography` → `/docs/typography`, `?query=workspace` → `/docs/workspace`)
`[x]` Page metadata and discovery — every docs page publishes its own `title`, description, Open Graph/Twitter tags and an absolute canonical URL built from the page's own frontmatter, with `?platform=` excluded so the four looks stay one page; `/sitemap.xml` is generated from both collections at request time (90 URLs, one per page, a curated page shadowing its package page) and `public/robots.txt` points at it. `site.test.ts` holds the one origin to `DOCS_DOMAIN` in the deploy stack, `page-meta.test.ts` holds the title, the absolute canonical, the description fallback and both route mounts (it found the loader handing the *file* path `components/dialog.mdx` as a canonical), and `sitemap.test.ts` holds the XML shape, the dedupe and the route's use of every collection. Verified in the dev server: `/docs/components/dialog` → `Dialog · GPUIxUI` + its canonical, `/docs/primitives/slider`, `/docs`, `/sitemap.xml` (`200`, `application/xml`, 90 `<loc>`), `/robots.txt`. `nub run --filter @gpuixui/docs test`: 20 files / 124 tests, the only failure the pre-existing `COMPONENTS.md` line 159 row (owner: primitives); `check-types` and `build` green
`[x]` Component index — `/docs/components` mounts `<ComponentIndex />`: a filter over every component and primitive page, generated from the pages' frontmatter at build time (`component-index.ts` + `component-index-data.ts`), so the list cannot advertise a page that does not exist and a new page appears with no docs change; a curated page shadows its package page, `index.mdx` is excluded, and the filter requires every whitespace-separated term across name, description, lane, parts, props, prop types and limitations. `component-index.test.ts` holds the URL mapping, the shadowing, the section order and the filter (with the real index held to every `packages/*/docs` file); `component-index.test.tsx` holds every row, the count and the labelled control. Verified in the dev server: `/docs/components` renders `69 of 69 pages`
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

`[x]` The landing page's own metadata — `/` is a route, not a collection document, so it never went through `docsMetadata`: a shared link showed a title and no description, no Open Graph or Twitter card, and its title and description were inline strings a unit could not read (the route imports `@/` components, which the docs vitest config cannot load). The landing's head is now `landingMeta()`/`landingTitle`/`landingDescription` in `src/lib/page-meta.ts`, the route mounts it beside its stylesheet link, and `page-meta.test.ts` holds the title, the description, all four Open Graph tags, the Twitter card and the absolute URL (`https://gpuixui.sudokw.com/`, no doubled slash) — plus that the route still mounts it. Both directions measured: dropping `og:description` fails by name (`expected undefined to be …`), and the old route assertion on `absoluteUrl("/")` was replaced by the `landingMeta()` mount check. Verified in the dev server: `/` serves `og:type`, `og:title`, `og:description`, `og:url`, `twitter:card` and the canonical

`[x]` The charts paint the theme's data series — `toCssVars` publishes `seriesColors(theme)` as `--series-1` to `--series-5`, and the dashboard block's `PALETTE` (five hexes described as "readable in both themes", measured by nothing) is deleted: every bar, donut segment, stacked column and legend dot paints `var(--dash-series-N)`, which defers to the surface's `--series-N` and falls back to the dark theme's scale on the landing, which renders outside a preview surface. `/docs/theming#data-series` names the scale — length interpolated from `seriesColors`, not printed — and mounts `<SeriesSwatches />`, generated from the theme the platform/look switch resolves; `/docs/blocks/dashboard` says its colours are the theme's scale. `theme-css.test.ts` holds the bridge to `seriesColors` (dark, light and a look's base), the dashboard's fallbacks to `darkSeries`, both landing maps to their mode's scale, and fails on a colour literal returning to `dashboard.tsx`; `series-swatches.test.tsx` holds every swatch to its theme, both high-contrast variants and a theme that carries its own `series` — all five cases fail against a fixed palette (measured). Verified in the dev server: `/docs/theming` renders the five swatches and `--series-1:#A7A9FF`, `/docs/blocks/dashboard` paints `var(--dash-series-N)` and none of the old hexes

`[x]` The theme editor's readout carries the audit's **fourth** report — `auditTheme` gained a `series` report when the categorical scale landed, and `auditFindings` still flattened three, so a theme whose chart colours collapse onto their plot surface (or onto each other) passed the readout `/docs/themes` calls "the whole audit". `AuditKind` gains `series` and two formatters word a surface failure (`card: series 2 — 1.14:1 (needs 3:1)`) and a distinctness failure (`series 1 and series 2 — 0.000 apart (needs 0.06)`); the pass sentence names the series, and `/docs/themes#the-theme-audit` says four reports, lists the series bullet and adds `seriesFailures` to the copy-theme note. `theme-editor-logic.test.ts` builds a brand theme whose series repeats the page colour and asserts both lines, that the contrast and decorative reports are empty on the same theme and that `auditTheme(...).passed` is still false (fails with the series half removed — measured); `theme-editor.test.tsx` holds the pass sentence (fails without it — measured) and `theming-page.test.ts` holds the page to `seriesFailures`. Verified in the dev server: `/docs/themes` renders "four independent failures" and the series sentence

`[x]` The Dropdown menu page, so the platform switch shows a **menu** — the mission's acceptance names "a Button, a Tab, a Panel, a menu and a table", and none of the curated previews was a menu. `/docs/components/dropdown-menu` is the fifth curated page: an interactive `DropdownMenuDemo` on a realistic file row (pointer-open leaves the surface focused with no row highlighted, `ArrowDown`/`Up` move real focus and the highlight together, a disabled row is skipped, the checkbox row toggles without closing, the destructive row paints the status tone's page role, `Escape`/outside press/choosing a row close and return the focus to the trigger), the template's sections in order, the 36-case suite count, and a Dependencies table derived from the source. The row arithmetic lives in `src/components/docs/menu-preview.ts` so it is testable: `menu-preview.test.ts` (5 cases) fails when the disabled filter is dropped (`expected 'duplicate' to be 'hidden'`). `src/lib/component-preview.test.ts` is the new registry guard from both sides — a page naming an unregistered demo fails by page and key (measured: `components/dropdown-menu.mdx: no demo named "dropdown-menu"`), a demo no page mounts fails as dead code, and an empty Code tab fails — so `<ComponentPreview>` can no longer throw in the browser while the build stays green. `component-page-truth.test.ts` gained the page (its count, inventory row and dependency claims are derived), `package-docs.test.ts`'s curated set gained its URL (the shadow list is held in both directions: dropping the URL fails by name), the sidebar and `/docs/theming` name it, and the preview-strategy + `apps/docs/README.md` ledgers list it. `component-preview.test.ts` also holds the announcement from both sides: every curated page must be linked from `/docs/theming`'s switch section and named in `docs/preview-strategy.md`'s "Curated today" line (removing either fails by slug — measured: `expected [ 'dropdown-menu' ]` and `expected [ 'tabs' ]`), so a sixth page cannot land without telling a reader previews exist. `nub run --filter @gpuixui/docs test` 41 files / 331 tests, `check-types`, `build` and the dev server green (`/docs/components/dropdown-menu` renders the file row, the readout, the `partial` status strip, its canonical, and the search index returns its API table for `onSelect`); `/docs/components` now counts 70 pages. The demo's click/key path was not driven by a browser-automation tool (none is installed) — the row arithmetic, the SSR markup, the guards and the build are the evidence

`[x]` The theme editor reads the **whole** audit — `auditTheme` grew a fifth report when the selection wash landed, and `auditFindings` still flattened four, so `/docs/themes` called a four-line readout "the whole audit" while a wash that buries the text it selects had no line. `AuditKind` gains `selection`, `formatSelectionFailure` words the two jobs (invisible wash, unreadable text), and the page and pass sentence say five reports with the two floors. `theme-editor-logic.test.ts` proves a brand whose only defect is the wash fails `auditTheme(...).passed` and prints both lines (fails when the map is removed — measured); dropping the pass sentence fails `theme-editor.test.tsx` and printing "four" fails `theming-page.test.ts` (both measured). Closes the tokens workstream's interlock row

`[x]` The Theming page's colour-role table is **measured** — `/docs/theming` printed a hand-written Light/Dark table that nothing held to the package, so the dark palette's selection fix left both `borderStrong` cells teaching the previous hexes (`#848E9E` / `#6B7484` against the shipped `#7B8595` / `#748091`). `theming-page.test.ts` now parses the page's own rows and holds every printed cell to `themes.light.colors` / `themes.dark.colors`, every role to `colorRoles`, and the table to at least twelve rows so it cannot silently empty; it failed on exactly the two stale cells before the fix (`borderStrong: light prints #848E9E, the theme has #7B8595`), and a palette edit now fails by role and cell. The same run caught `demos.css`'s `.gx-demo` defaults still on the old dark `borderStrong`, which `theme-css.test.ts` refused — updated to the shipped role

`[x]` The capability record's measured **keyboard-focus** gap — §3's events row called focus events `supported` while two window probes measure a `Tab` traversal moving the focus without running React's `onFocus` (`tooltip-lifecycle`: the trigger is focused and the tip stays closed; `tabs-lifecycle`: `focuses=0`), which is the row a component plan reads before opening a surface on focus. The row is now `supported, with limits` with both probes' evidence and the workaround (read the key event's own `elementId` or `getFocusedElementId`; publish focus-only content as `aria-description`), §4 states the rule once, and `/docs/runtime#measured-in-a-window` lists it as a measured gap — the section's intro no longer prints a count to fall behind, and `docs/gpuix-capabilities.md` §5 names all four probe ids it now owes. `capability-doc.test.ts` gained a case for the events row and holds the page to both probes; both failed on the old row and page (`expected 'supported' to be 'supported, with limits'`, `expected … to contain "tooltip-lifecycle"`) and pass now. Closes the tooltip interlock's docs half; `nub run --filter @gpuixui/docs test` green (41 files / 335 tests)

`[x]` The capability record's measured **pointer-capture** rule — the record had no pointer-capture row, so the only statement a component author could find was the Slider's page saying a drag that leaves the track stops, which a window measured as false: `renderer.rs` arms capture on a left press **only** for an element that listens to both `onMouseDown` and `onMouseMove`, the paired sample kept all eight moves and its release 120px outside its box (`both=8 bothUnder=0 bothUp=1`) while a move-only sample got the pre-press move and the sibling received the eight (`move=1 moveUnder=8`), and the shipped `Slider` followed a drag off its track (`slider=66 sliderChanges=9` — `pointer-capture`). §3 now carries the row (`supported, with limits`, the rule, the three samples, the workaround), §5 adds the probe to the ids the record owes, and `/docs/runtime#measured-in-a-window` publishes the same rule. `capability-doc.test.ts` gained the doc-row case and the page-row case, and the existing required-probes case names `pointer-capture`; all three failed before the rows existed. Closes the docs half of the pointer-drag interlock (primitives retracts its five surfaces)

`[x]` The package-page note names the **command**, not the app — 68 mounted pages said "run it natively in `apps/playground`", which tells a reader the app but not how to open it, and `docs/preview-strategy.md` claimed the note named the example file (it named nothing). `src/components/docs/native-run-note.tsx` is now the one note the page frame mounts: it quotes the root manifest's `dev:playground` script as `nub run dev:playground` (exported, never retyped), links `/docs/installation#run-the-playground`, and still says a browser preview is not available for the collection's kind. `native-run-note.test.ts` (4 cases) reads the root manifest and the installation page from disk — so a renamed script, a changed command string or a moved heading fails — and holds `docs-view.tsx` to mounting the note instead of writing one inline. Directions measured: the command changed to `nub run playground` failed the manifest and installation cases (`expected 'nub run playground' to be 'nub run dev:playground'`; the page case names the missing string); dropping the `<NativeRunNote>` mount failed the mount case. The new module also tripped `readme-ledger.test.ts`, whose `apps/docs/README.md` line was added in the same change. `nub run --filter @gpuixui/docs test` green (42 files / 339 tests), `check-types` and `build` green

`[x]` A share card for every page — docs pages and the landing published `og:title`/`og:description` and no image, so a shared link rendered as a blank card. Both now publish `socialImage` (the site's 512px mark in `public/logo.png`) with its type, width/height and alt text, plus `twitter:image`/`twitter:image:alt`; `page-meta.test.ts` holds the URL to the file that ships and to the absolute origin (proven: dropping the tags fails both image cases). `nub run --filter @gpuixui/docs test`: 41 files / 335 tests green

`[x]` The theme editor reads the audit's **seventh** report — `auditTheme` gained `indicators` when the mark contract landed, and `auditFindings` flattened six, so `/docs/themes` called its readout "the whole audit" while a progress bar or spinner dot painted into the page had no line. `AuditKind` gains `indicator` and `formatIndicatorFailure` words the finding (`mark primary on background — 1.00:1 (needs 3:1)`), the pass sentence names the mark, and `/docs/themes` §The theme audit says seven reports with the `indicatorFailures` bullet (roles, the four strips, the non-text floor, and why a status mark paints `statusTone(...).foreground` rather than the solid fill) while the copy-theme note names the export. `/docs/theming` gains §Indicator marks, held by a new `theming-page.test.ts` case to `indicatorRoles`/`indicatorSurfaces`/`indicatorFailures`, `contrastFloors.boundary` and `statusTone`. Directions measured: dropping the `indicators` map fails `reports an indicator mark that vanishes into the strip it is drawn on` (the brand paints `primary` as the page, so only the mark line can see it), and renaming the theming section fails the page case

`[x]` The capability record's measured **content surfaces** — the record's only drawing rows said `canvas` is blank and pointed at `svg`, which reads as "SVG is a general drawing surface" and "image bytes just work". `content-surfaces` measured otherwise: `<svg source>` paints its markup **as one tint** (the whole element is masked in `style.color`, so a shape's own `fill` never reaches the frame), five stacked `<svg>` elements each paint their own tint while `<text>` inside the markup paints, `<img>` paints a path/URL/data-URL and a `setImagePixels` buffer **only from a layout effect**, and `<canvas>` tracks no painted bounds either. §3 now carries `Inline SVG painting` and `Image painting` (`supported, with limits`, with the workaround a chart or preview needs) and `Canvas drawing` gains the bounds measurement; §5 names the probe, and `/docs/runtime#measured-in-a-window` publishes both rows plus the canvas detail in its matrix row. `capability-doc.test.ts` gained two cases (doc rows and page rows) and the required-probes case names `content-surfaces`; both new cases failed with the rows removed, measured. Closes the docs half of the Charts / Image preview capability rows in `COMPONENTS.md`

`[x]` The theme editor follows the platform switch — the editor copied the built-in theme into its state at mount, so a reader who chose Windows still saw the identity's roles and `/docs/themes` was the one preview the site's "every preview changes" promise did not cover. Its state is now the **pins** a reader set (`ThemePins` — only the roles they touched, plus an optional radius and family), resolved by `resolveTheme(mode, pins, base)` over `platformThemes(platform, look)`; the switch therefore re-bases the preview, the colour inputs and the audit while the edits stay, `Copy theme` prints the resolved values (what a reader copies is what they saw), and `Reset` clears the pins back to the selected style. The persistence boundary reads the pin set (`parseState`/`decodeState`), rejecting an unpaintable value, an unknown role, a NaN radius or a non-string family, and the `usePlatformOptional` hook lets the editor render standalone (tests, SSR) on the built-in identity while a preview still refuses to render without a switch. Docs: `/docs/themes` §Starting from a platform/§How it works/§Copy theme, `/docs/theming#the-switch-on-this-site`, `docs/preview-strategy.md` §Theming. Verified in the dev server: `/docs/themes` prints `background #F6F8FA`, `?platform=win32` prints `#F3F3F3`. Both directions measured: `resolveTheme` pinned to the built-in base fails `takes the base theme as the whole of every role the reader did not pin` and `prints the resolved platform values`; `ThemeEditorSurface` using `themes[mode]` fails `starts from the base theme it is handed, not a copy of the identity` (`expected … to contain 'value="#F3F3F3"'`). `nub run --filter @gpuixui/docs test` green (42 files / 345 tests), `check-types` and `build` green

`[x]` The Components index tells the truth about its own section — `/docs/components` still listed **four** curated pages after the Dropdown menu landed (a reader was told the curated set had no menu), and it said "every package page names the example file that does", which the package note never did: `NativeRunNote` names the Markdown path and the playground command. The sentence now imports `playgroundCommand` and links `/docs/installation#run-the-playground` (rendered, not printed — the first attempt wrapped the expression in backticks and the page showed `{playgroundCommand}`; the guard requires `<code>{playgroundCommand}</code>`). `component-page.test.ts` gained three cases: every curated page's frontmatter title must appear on the index (so a sixth fails), the command claim is held to the exported constant and refuses "example file", and every row of the "How to read a page" table must name a `##` section some mounted page carries (a dead row fails). Directions measured: restoring the four-name list fails the title case naming `Dropdown menu`, restoring "names the example file" fails the note case, and a renamed table row fails the section case. Verified in the dev server: `/docs/components` renders `Dropdown menu` and `nub run dev:playground`.

`[x]` The Theming page's colour-role table is **generated**, not transcribed — the hand-written Light/Dark cells rotted on every palette edit (this pass caught the light `accent` still teaching `#EEF0FF` against the shipped `#E0E3FF`), so each cell is now `{themes.light.colors.<role>}` / `{themes.dark.colors.<role>}` and the page has no hex to fall behind. `theming-page.test.ts` holds the row shape instead of a copy of the values: a role that is not in `colorRoles`, a light/dark cell naming a different role, fewer than twelve rows, or any hex literal returning to the section fails. The same run fixed `demos.css`'s `.gx-demo` `--hover` default, which still painted the previous dark popover value. The table also gained the three state washes (`hover`/`active`/`selected`), which the tokens package began measuring as decorative surfaces and the site never named. Verified in the dev server: `/docs/theming` renders `#E0E3FF` for `accent` and the three washes; `nub run build` and `check-types` green, docs suite 43 files / 369 tests.

`[x]` The capability record states the **clipboard** rule — the binding publishes no clipboard read or write, so the only clipboard a desktop surface reaches is the platform's own text action inside a focused field; the `clipboard-lifecycle` probe measured both halves (copy/paste/cut reach `onChange`, the keys never reach the app's window handler) but nothing on the site said so. `docs/gpuix-capabilities.md` §3 gained **App-level clipboard** (`not supported`, with the read-only-field workaround) and **Clipboard keys inside a focused field** (`supported, with limits`), `/docs/runtime#measured-in-a-window` gained the row a reader needs, and §5 names the probe it now owes. `capability-doc.test.ts` holds the two doc rows, the page row (`onChange`, `clipboard-lifecycle`, the workaround) and the required-probe list. Both directions measured: dropping the doc rows fails `expected undefined to be 'not supported'`; dropping the page row fails the page case and the probe case. `nub run --filter @gpuixui/docs test` 43 files / 371 tests green.

`[x]` The contributing page teaches commands and a branch that exist — it told a reader to run `nub run test:behaviour` from the root, where only `packages/components/package.json` declares that script; it called `main` the integration branch of a repository whose only branch is `master`; and it sent a new component's page to `apps/docs/content/docs/components`, while the page a component ships is `packages/<package>/docs` and the curated file is an optional overlay. The page now teaches the gate, the recursive suite, the two filtered native suites, the docs guards and the headless smoke run (with `--filter` naming the manifest's own package name and the live suite marked a release gate, `--only <id>` while iterating), works on `master` through `scripts/swarm-commit.sh`, and names both page locations with the package's file as the one that has to exist. `src/lib/contributing-page.test.ts` reads every workspace manifest and resolves each `nub run` command the page prints to a script that manifest declares, requires the gate/suite/native trio to stay taught, holds the branch name, and holds both page locations. Directions measured: restoring `nub run test:behaviour` fails the script case (`gpuixui has no test:behaviour`) and `main` fails the branch case; the corrected page is green. `nub run --filter @gpuixui/docs test` 43 files / 363 tests, `check-types` green

`[x]` The MISSION IA's **Getting started** page — the sidebar jumped from Installation to Architecture, so a reader's first working screen lived in scattered snippets on component pages. `/docs/getting-started` now builds a project-settings card in four steps: the theme provider (and why the app owns the mode), the real `Card` + `Input`/`Switch`/`Button` composition with the parts contract and the `label`-not-`aria-labelledby` rule, the ownership table for its three `useState` values, and the native run (`nub run dev:playground`, terminal mode, the two native suites). It is held to the workspace rather than reviewed by eye: `src/lib/getting-started.test.ts` (5 cases) reads the page's snippets and resolves every `@gpuixui/*` import to a symbol `buildWorkspaceSymbolIndex` reads from the package source, holds `nub run dev:playground` to the root manifest, requires every numbered step to link the page it depends on, and pairs each `useState` value with a row in the ownership table. Three directions measured: renaming the snippet's `Button` import fails by name (`@gpuixui/primitives does not export Buton`), dropping the sidebar entry fails the placement case (`expected -1 to be 3`), and deleting the `autoSave` row fails with the declared/explained sets. The page sits after Installation in `meta.json`, is listed in the site's README ledger, and `docs/preview-strategy.md` §"The getting-started page" records why it has no preview. `nub run --filter @gpuixui/docs test` 44 files / 376 tests green; `check-types` and `build` green

`[x]` The site's **404** now stays inside the docs — a missing address fell through to the router's default, which is outside the docs chrome (no brand, no navigation, no way back but editing the URL). `src/components/not-found.tsx` is the root route's `notFoundComponent`: it says the address has no page and links Introduction, Installation, Getting started, Components, Patterns and API reference, plus the filterable component index. `src/components/not-found.test.tsx` (2 cases) holds the rendered markup to all six destinations and `__root.tsx` to mounting it. Directions measured: dropping `notFoundComponent: NotFound` fails the wiring case, and a `/docs/patternz` href fails the link case naming `/docs/patterns`. Verified in the preview server: `/docs/does-not-exist` and `/totally-missing` both answer `404` and render `Page not found` with the links. `nub run --filter @gpuixui/docs test` 45 files / 378 tests green; `check-types` and `build` green

`[x]` The capability record cites the **pointer** selection probe — its **Text selection** row rested on the headless `text-selection` scenario's synthetic `dragSelect`, so the pointer path a log viewer or code block depends on had no window proof. `selection-lifecycle` measured it (the wash paints, `getSelectedText()` reports `ection world`, `Cmd+C` pastes that run into a field, `clearSelection()` clears the wash, a default `Text` opts out), and the row now carries it, the geometry a selectable line owes the hit test (a box that hugs its glyphs, or a press past the last glyph selects nothing) and the limit that an **initiated** copy has no API while the user's own gesture works. `/docs/runtime#measured-in-a-window` publishes the same row, §5's owed-probe list names the probe, and `capability-doc.test.ts` gained two cases (doc row, page row) plus the required-probe assertion; the four copied measured-table parses were hoisted into `measuredRow`. Directions measured: removing the probe from the doc row fails `expected … to contain 'selection-lifecycle'`; deleting the page row fails the page case and the required-probes case. `nub run --filter @gpuixui/docs test` 45 files / 380 tests green, `check-types` green

`[x]` The capability record names the **typed absences the inventory relies on** — the `COMPONENTS.md` rows recorded them one at a time (Breadcrumb/Navigation Menu/Lists "no `href`", Fieldset "no `fieldset`", Context menus "no `onContextMenu`", OTP Field "no `onPaste`", Toast/Countdown/Message scroller "no `aria-live`"), while `docs/gpuix-capabilities.md` — the record a component plan cites — named none, so a plan reading only the record could pass an `href` and paint a dead link. Four rows joined §3: **Links and anchors** (`not supported`; `ElementType` has no `a`, `HostProps` no `href`), **Form grouping** (`no fieldset`), **Context menu event** (`supported, with limits`; a right press arrives as `onAuxClick`, the path `context-menu-lifecycle` measured on the shipped menu) and **Paste event** (`not supported`; a paste reaches a focused field's `onChange`, measured by `clipboard-lifecycle`). The `role`/`aria-*` row now states the closed set — `role` plus seven attributes — and the fourteen absences, so a page cannot promise an announced toast on a runtime with no live region. `/docs/runtime` gained a **Not in the typings** section with the five rows a reader needs, and §5 says the same guard holds them. `capability-doc.test.ts` gained two cases (the doc rows plus every `aria-*` absence the inventory cites, and the page's five rows); the page parser was generalised into `sectionRows` so both tables and the measured one share it. Directions measured: deleting the doc's links row fails `expected undefined to be 'not supported'`, deleting `aria-haspopup` from the aria row fails with `[ 'aria-haspopup' ]`, deleting the page's paste row fails `the page has no paste row`. The same full-suite run caught a foreign drift and it is fixed here: the curated Dropdown menu page printed 36 native cases for a 37-case suite. `nub run --filter @gpuixui/docs test` 45 files / 382 tests green, `check-types` green

`[x]` The capability record retires its **unverified file-drop row** — it said `onFileDrop` is declared but "no probe mounts a drop", so a plan was told to route a file through `promptForPaths` only. The headless `file-drop` scenario (landed by the playground workstream) drives the renderer's own `nativeSimulateFileDrop`, the `FileDrop::Entered` then `Submit` pair a Finder drag produces, and measures the payload: two absolute paths in order (`/tmp/alpha.txt,/tmp/beta.txt`) and a sibling target that receives nothing. The row is now `supported, with limits`, citing the scenario and both measured facts, and naming the two real limits — a **live** OS drop is not automatable (the window protocol has no file-drop command) and a drop is swallowed while a text field holds the platform's input session until a press ends it — with `promptForPaths` kept as the keyboard path. `capability-doc.test.ts` gained the row case and replaced the "at least three unverified" floor with an exact two (`Window backdrop`, `Reduced-motion`) asserted by name, so the remaining uncertainty cannot be silently promoted either. Directions measured: restoring `unverified` fails both the row case (`expected 'unverified' to be 'supported, with limits'`) and the uncertainty case (`expected [ …(3) ] to have a length of 2`); suite 45 files / 383 tests green, `check-types` green

`[x]` The source accordion prints the file it names — `<ComponentSource>` takes a key into `src/components/docs/sources.ts`, MDX does not typecheck that prop, and the Dropdown menu page passed the **demo** key `dropdown-menu-demo`: the accordion under Installation rendered a code block with no code and the build stayed green. The registry gained `dropdownMenu` (and the page its key), and `src/lib/component-source.test.ts` (5 cases) holds the three things that must agree — the key is registered, the `file` the page labels the accordion with is the file the registry's `?raw` import resolves to, and that file exists — plus the registry from the other side (a key no page mounts fails as dead code, and an `?raw` import that resolves to nothing fails as an empty source). Directions measured: the old demo key fails `dropdown-menu.mdx: no source named "dropdown-menu-demo"` and the file case, a changed `file` fails naming both paths, and dropping the mount fails the stale-key case.

`[x]` The **Command menu** page, so the platform switch shows a palette — the sixth curated page (`/docs/components/command-menu`): a realistic editor palette whose query, highlight, disabled-row skip, arrow/Home/End wrap, `Enter` and focus return are reproduced in the browser, the template's sections in order, the 19-case native suite count, and a Dependencies table derived from the source. The matcher is the component's, not a lookalike: `src/components/docs/command-preview.ts` mirrors `menu/fuzzy.ts` (a case-insensitive subsequence, ten points a character, eight more at a word start, two per character in the current run, ranked **within** each group while the caller's group order survives), and `command-preview.test.ts` (6 cases) pins the non-contiguous match, the word-start score, the group order that outlives a higher-scoring later group, declaration order for an empty query, and a disabled row never taking the highlight. Directions measured: dropping the word-start bonus, ranking globally instead of per group, and filtering disabled rows each fail a named case. `component-page-truth.test.ts` gained the page, `package-docs.test.ts` the shadow override, and the page is in the sidebar, the Components index, `/docs/theming`'s switch section, `docs/preview-strategy.md` and the app README ledger. Verified in the preview server: `/docs/components/command-menu` and `?platform=win32` answer `200`, `/api/search?query=command` returns it and `/sitemap.xml` carries it. Suite 55 files / 450 tests, `check-types` and `build` green.

`[x]` The install block is resolved, not transcribed — `<Install packageName importName>` writes the `nub add` command and the `import { … } from …` line as strings, and MDX checks neither prop, so a renamed package or a misspelled export would teach a command that cannot resolve on the first section a reader follows; the page-snippet walk only ever read fenced code. `src/lib/install-block.test.ts` (3 cases) resolves both props through the workspace symbol index: the package must be an entry point the workspace publishes and the name must be one that entry point exports, with a floor of six blocks so a walk that stopped matching cannot pass. Directions measured: `importName="CommandMenus"` fails `components/command-menu.mdx: @gpuixui/components does not export CommandMenus`, and `packageName="@gpuixui/component"` fails both the entry-point and the export case by name. `docs/preview-strategy.md` §"A snippet is code, not prose" records the rule. Suite 56 files / 453 tests, `check-types` green.

`[x]` The capability record finally reads the **accessibility tree** — it promised AT paths (the tooltip's `aria-description`, a row's `aria-selected`, a dialog's role) and no document had read the tree they describe; `paintedText` cannot see an attribute and a window's automation protocol has no a11y verb. §3 gains **Accessibility tree (`getA11yTree()`)** (`supported, with limits`): the ARIA token arrives as the platform's own role name (`button` → `Button`, `option` → `ListBoxOption`, `heading` → `Heading`, `progressbar` → `ProgressIndicator`), the seven attributes land on `label`/`description`/`author_id`/`selected`/`expanded`/`level`/`value`, `onClick` + `tabIndex` surface as `Click`/`Focus`, a `<text>` is a `Label`, and **a node needs a role** (a roleless div with an `aria-label` is absent; `role="none"` is dropped) — a `TestRenderer` fact, since no window verb reads the tree. `/docs/runtime` publishes it in a new **Measured offscreen** section rather than mislabelling it a paint, and §4/§5 move with it. `capability-doc.test.ts` gained three cases (record row, page row, offscreen section) plus a cross-file guard: every probe a page row cites as `(`id`)` must be declared by the playground's headless or live registry **and** named in §5 — it found `virtual-list-lifecycle` cited but never owed, now added. Four directions measured: removing `a11y-tree` from §5 fails `expected [ 'a11y-tree' ] to deeply equal []`, a mistyped citation fails the registry case, and deleting either row fails its case. `nub run --filter @gpuixui/docs check-types` clean; the capability suite 37/37 green; `Tooltip`'s inventory claim stays primitives'.

`[x]` The component page template now requires the section its policy already promised — `docs/preview-strategy.md`'s template table has a `Keyboard` row and MISSION.md requires keyboard notes on every component page, but `component-page.test.ts`'s required list omitted it, so a curated page could drop its keyboard contract and stay green. `Keyboard` is required now, and the policy's table is **parsed** instead of trusted: every required section must have a row and the required order must follow the table. That cross-check found a second drift — the policy put Accessibility and limitations before Dependencies (MISSION.md's order) while all six curated pages and the guard had the two the other way round — so the pages were reordered to the policy's order and the `Keyboard` sentence in the policy now says a curated page states "no keyboard path" rather than omitting the section. Directions measured: renaming the policy row fails `expected [ 'Keyboard' ] to deeply equal []`, moving that row after API reference fails the order case, removing `## Keyboard` from a page fails `button.mdx: no ## Keyboard`, and moving it above Composition fails as out of order. Suite 56 files / 460 tests, `check-types` and `build` green.

`[x]` The theme editor's Numbers bullet names the **row height** the pressable rule holds — `invalidNumbers` began holding `density.rowHeight` to the 24px target floor because a `dense` list row is built at exactly that height and takes a press, and `/docs/themes` §The theme audit still described a control height as the only press-target token. The bullet now names the row beside it, keeps the floor interpolated from `targetSize`, and `theming-page.test.ts` builds `density.rowHeight: 20` and holds the page to the report the code returns (`[{ group: "density", path: "rowHeight", value: 20, rule: "pressable" }]`) instead of to a printed rule. Restoring the old sentence fails the case by name (`expected … to contain 'rowHeight'`). Closes the tokens interlock row.

`[x]` The capability record covers the rows that **grow while painted** and the **dock re-clamp signal** — the Virtualized list row measured rows of different heights and a row that grew *outside* the window, which is not the case an expandable row has; and §3 had no split-pane row at all, so a panel plan could read the whole record and never learn that `onLayout` is the signal a dock re-clamps on. The virtual-list row now carries `virtual-list-expand` (the 120px re-measure on the next frame with no scroll, the rows below shifting and a press landing on the moved row, the following row leaving the painted window until a scroll, the remembered height, the estimate), and §3 gains **Resizable panels and dock reflow** (`supported, with limits`): the divider's capture (`split-pane-lifecycle`), nested widths (`docking-nested`) and `dock-reflow`'s three facts — the settled payload equals the painted box, the first pass of a reflow is stale (`w=340`, `reports=2`), and an unchanged pane is still reported to. `/docs/runtime` publishes **Expandable rows** and **Dock reflow**; §5 owes all five probes. `capability-doc.test.ts` gained both record-and-page cases and its cross-file probe guard now holds the new citations. Three directions measured: dropping the two cited probes from §5 fails `expected [ 'dock-reflow', 'virtual-list-expand' ] to deeply equal []`, deleting the page's Dock reflow row fails `the page's measured table has no dock-reflow row`, and deleting the record row fails `expected undefined to be 'supported, with limits'`. Suite 56 files / 458 tests, `check-types` and `build` green.

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
`[x]` `packages/primitives`: evaluated adopting the headless primitives the runtime now publishes (salvage 086's neighbours) — **decision: adopt the Select group parts only, which already landed; decline the rest.** `@gpuix/react` 0.11.0's `./button` was read against this package's contract: `buttonProps` sets `tabIndex: -1` for a disabled button (this package removes the stop), resolves `style` from `{ disabled }` only (this one reports `focused` too), has no `loading`/`Spinner` and no `aria-description="Loading"`, and its Space release has no held-key guard. Adopting it would regress four documented behaviours and delete no code (this `Button` is the recipe + parts layer over the same host element), so `Button` keeps its contract and `docs/button.mdx` records the comparison so it is not re-litigated. `SelectGroup`/`SelectLabel`/`SelectSeparator` are adopted (option groups, painted and measured); `SelectScrollUpButton`/`SelectScrollDownButton` are **empty `div`s** in 0.11.0 (read in `dist/components/select.js`), so there is no part to adopt — the wrapper bounds and scrolls the list itself (`selectContentStyle`), and the keyboard reveal stays the measured runtime gap. The options-data API stays: the parts are primitives, not a replacement for a typed option list. `StyleDesc`'s `borderStyle: "dashed"` and `LinearGradientBackground` stay reachable through `Box`'s `style` prop rather than a new prop — `core/style.test.ts`'s surface case holds the resolver to choosing no line style, so a theme cannot silently dash every card. No plan was needed: the measured outcome is "no code change", recorded here and on the Button page
`[x]` `packages/primitives`: no `ToggleGroup` or `CheckboxGroup` control, and disabled options need a roving tab stop (salvage 056, 065) — **`ToggleGroup` and `CheckboxGroup` landed** over one shared group layer (`components/group.tsx` holds the option shape, the row body and the native-focus hook; `core/roving.ts` holds the tab-stop decision), so the radio, checkbox and toggle groups cannot drift. `ToggleGroup` is discriminated by `type` (`single` → `onValueChange(next: string)`, `multiple` → `(next: ReadonlyArray<string>)`) and arrows move focus **without** pressing. `CheckboxGroup` keeps several independent values with one tab stop; arrows move focus only. **The roving fix**: `rovingIndex` never leaves the stop on a disabled option — a group whose value was a disabled option had no reachable stop at all — and all three groups now prove it. Examples in `selection.example.tsx` and `toggle.example.tsx`; docs pages + docs index; COMPONENTS.md rows + `inventory.ts` records. Proof: `core/roving.test.ts` (5), `CheckboxGroup.test.tsx` (11), `ToggleGroup.test.tsx` (14), a new `RadioGroup` stop case, and four native cases in `runtime/controls.runtime.test.tsx` (real click; a key delivered to the focused row moves focus through GPUI's dispatcher without changing a value). Both directions measured: dropping the stop fallback fails the three tab-stop cases; `nub run --filter @gpuixui/primitives test` 46 files / 622 tests and `test:runtime` 16 files / 171 tests green
`[x]` `packages/primitives`: `Select`'s option groups, edge behaviour and scrolling (salvage 066/068/075/083; 069 closed) — **option groups landed**: `options` takes `{ label, options }` entries painted as a muted caption and a rule through the runtime's `SelectGroup`/`SelectLabel`/`SelectSeparator`, while the runtime still receives one flat list in render order, so the arrows cross a group like any row; the caption is painted, not announced (the 0.11.0 parts are plain divs with no role), and `docs/select.mdx` says so. Proof: four `Select.test.tsx` cases and a native grouped-list case — dropping the group render fails two unit cases and the native one, measured. **The edge half is measured and retracted**: `<anchored>` uses `fit: "snap"` with the wrapper's 8px `snapMargin`, so a bottom-edge trigger opens a list painted inside the window (new case in `runtime/fields.runtime.test.tsx`). **The scroll half landed in the wrapper**: the runtime's content sets no maxHeight/overflow and its edge-scroll parts are empty in 0.11.0, so `selectContentStyle` now caps the surface at the menus' 320px and makes it a scroller. Measured in a window: a 40-option list paints a 320px box, the wheel moves its offset to `-200` (and back to `0` on a positive wheel), and the runtime paints its scrollbar. The **reveal** is the remaining runtime gap, now measured rather than assumed: twenty ArrowDowns leave the offset at `0`, because the runtime never scrolls the highlighted row into view — so a keyboard user cannot reach a row past the edge and a keyboard-critical list must stay short. `runtime/fields.runtime.test.tsx` holds the cap, both wheel directions and the missing reveal (it read a 320px cap on the old code as `the list painted no bounded scroller`); `src/components/Select.test.tsx` holds the style contract, and `docs/select.mdx`, the `COMPONENTS.md` Selects row and the inventory record teach the measured behaviour. The trigger ring stays from the earlier pass
`[x]` `packages/primitives`: `Rating` can show a failed validation — `invalid` paints the chosen stars and the focus ring destructive while empty stars stay muted (salvage 070)
`[x]` `packages/primitives`: `ScrollArea` is a keyboard scroll region and reports its position (salvage 072, 337) — the viewport is a tab stop that moves one theme row per arrow, one measured viewport per PageUp/PageDown and to either end with Home/End through the renderer's `scrollTo`; it only consumes a key when the scroller itself holds focus, so a field inside keeps its arrows. `onScrollChange` forwards the absolute offset, `label` names the region as a `group` and `focusable={false}` opts out. `core/scroll.test.ts` (9) pins the arithmetic; `presentational.test.tsx` the tab stop/role/opts-out; `layout.runtime.test.tsx` measures Down/PageDown/Home/End, the absolute offset and the field guard in a window, plus the negative control (dropping `onKeyDown` fails the keyboard and offset cases)
`[x]` `packages/primitives`: every `OTPField` cell was a tab stop; the group now has one roving stop on the cell the code has reached (or the focused cell), proven natively as Tab-in/Tab-out (salvage 076)
`[x]` `packages/primitives`: `stepNumber` added raw floats, so a 0.1 step reported `0.30000000000000004`; the move is now rounded to the finer of the value's and step's decimal places, with an integer step left exact at 1e15 (salvage 077)
`[x]` `packages/primitives`: `Text`'s `clamp` is decided by the first identical string the runtime lays out (salvage 082) — **measured and resolved as a runtime limitation, not worked around.** GPUix lays a string out once per window and reuses that layout for the same copy, so the first identical string painted decides the line count: a fresh window mounting `clamp={2}` above `clamp={1}` on the same text paints both at two lines, and swapping the order paints both at one (measured both ways). No style-level workaround exists — `maxHeight`/`overflow` neither grow the height nor re-measure the string. `runtime/layout.runtime.test.tsx` now pins **both directions**: unique copy honours its own clamp (1 line / 2 lines against the theme's line height), and identical copy shares the first layout. The limitation is written on `docs/text.mdx` §Limitations and the `COMPONENTS.md` Text row, including the honest alternative (give duplicate copy a distinct string), and the pinned case fails if a runtime upgrade fixes the cache so the note cannot outlive the bug
`[x]` `packages/primitives`: no `IconButton` (icon-only button) part (salvage 086) — `IconButton` narrows `Button` to the icon-only case with a **required** `label`, an `icon` slot that can never become the name, and an always-square box; ghost by default for toolbars. It is `renderButton(iconButtonProps(props), …)`, so activation, busy and disabled stay `Button`'s one implementation. 7 unit tests + 5 native (the accessibility tree names it with no image node; the painted box measures 32×32 at `md`), an example, a docs page and a `COMPONENTS.md` row. Both directions measured: dropping `square` fails `expected 1256 to be 32`, blanking `label` fails the name case
`[x]` `packages/primitives`: value callbacks use the contract's name (salvage 088) — `Input`, `NumberField`, `OTPField`, `Rating` and `Select` now take `onValueChange` (the name `RadioGroup` and `Slider` already used) with `onChange` kept as a deprecated alias that only runs when the new name is absent. Every value control resolves its callback through the one `valueChange` helper, so the precedence rule cannot drift per component. `src/components/change.test.ts` pins the rule and holds all seven value controls to the helper and the shared `ValueChangeProps` type; the native `fields.runtime.test.tsx` types into an `Input` carrying both names and sees only `onValueChange` fire; the pages, usage snippets and API tables now name the contract callback
`[x]` `packages/primitives`: state-aware `style` reaches every control, group root and field, and a focus/tab-order matrix holds the whole set (salvage 079, 080, 081, 084, 089, 090) — **Checkbox and Switch landed**: each takes `StateStyle<CheckboxState>` (`disabled`/`focused`/`checked`/`indeterminate`/`invalid`) or `StateStyle<SwitchState>` (`disabled`/`focused`/`checked`/`invalid`) and merges the result after every role decision, so a callback is the last word; a case in each component suite proves the callback sees the live state and its property wins. **Slider and RangeSlider landed**: both take `StateStyle<SliderState>` (`disabled`/`focused`/`invalid`, with a range reporting focus anywhere in the group) merged after the ring on the track; `Slider.test.tsx` gains a case per component, and both failed when the raw prop was merged again (`expected undefined …`). **The group roots landed**: `Rating` takes `StateStyle<RatingState>` (`disabled`/`readOnly`/`focused`/`invalid`) and `RadioGroup` takes `StateStyle<RadioGroupState>` (`disabled`/`focused`) plus `itemStyle: StateStyle<RadioItemState>` (`disabled`/`focused`/`checked`) resolved **per option row**, so a data-driven group can paint its selected row — the per-item gap (salvage 081) is closed for radios. Three new cases, all failed when the raw prop was merged again. **Select landed**: `triggerStyle: StateStyle<SelectTriggerState>` (GPUix's `{ open, disabled, placeholder }`) and `itemStyle: StateStyle<SelectItemState>` (`{ selected, highlighted, disabled }`) resolve per trigger and per option row and merge last, so a data-driven list can style its rows; its root `style` stays a plain `StyleDesc` because that wrapper has no live state. Two cases failed when the raw callbacks were dropped. **The focus matrix landed**: `src/components/focus-matrix.test.tsx` renders 13 focusable controls (Button, IconButton, Toggle, Checkbox, Switch, RadioGroup, Rating, Slider, RangeSlider, Input, TextArea, NumberField, OTPField) and holds each row to the tab stops it owes at rest and to zero stops and zero rings while disabled; `Select` is excluded because its trigger and items are GPUix's own components, and its ring and stops stay pinned on its page and in the runtime suite. Both directions measured (a Checkbox left at `tabIndex={0}` while disabled fails its disabled case; a Switch with its `controlRing` removed fails its rest case). **No overlay adopts it**: `Tooltip` is the only overlay this package ships, it has no caller style prop and GPUix's `TooltipContent` reports no state (the content exists only while open), so there is nothing for a callback to read
`[x]` `packages/primitives`: docs still advise putting a `Label` beside a standalone checkbox/switch, which does not name it (salvage 087) — `checkbox.mdx`, `switch.mdx` and the `input.mdx` API row now say a `Label` beside the control is visible text only and does not name it; the control's own `label` prop (built once by `labelledBy`) is the name. The `label` prop comments on `Checkbox` and `Switch` say the same, so a caller reads it in their editor. Proven in a window by `runtime/labelling.runtime.test.tsx` (a Label paints and leaves the box, switch and input unnamed; the same string through `labelledBy` names all three), and held by `src/labelling.test.ts` (3 cases; both directions measured — restoring "pair it with a `Label`" fails by name, and a `labelledBy` that returns a blank name fails the runtime case)
`[x]` `packages/primitives`: a selected `Select` row was only a tint, so a reader who cannot rely on colour had no mark (salvage 343) — each item's children are now a function of the state GPUix reports for that row (`SelectItem` supports function children), so the selected row paints an `@gpuixui/icons` check in the `popoverForeground` role at its end and an uncontrolled select keeps no mirror of its value. It is decorative (`role="presentation"`; the row is already `aria-selected`). Proof: `src/components/Select.test.tsx` walks the part tree, calls the row with `selected` true/false and pins the mark's name and role colour; `runtime/fields.runtime.test.tsx` opens the list and measures **exactly one** `<svg>` and that it moves to the row that becomes selected after a click. Both directions measured: rendering the label alone fails `expected [] to have a length of 1`. `docs/select.mdx` §Theming/§Verification and the `COMPONENTS.md` row record it
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
`[x]` `apps/playground`: the native probe backlog is closed — drag edge auto-scroll (`drag-autoscroll`: caller-driven `scrollTo` in the edge band; the runtime does nothing on its own), tab overflow (`tab-overflow`), file drops (`file-drop`, headless `nativeSimulateFileDrop`), cross-element drag (`drag-between-panes`, plus `AsyncSmokeHost.drag`), the shipped Tier 1 controls (Input `text-input`, Checkbox `checkbox-toggle`, Slider `slider-lifecycle`) and tab-strip focus (`tabs-lifecycle`: traversal, arrows, Home/End). Landed already: **text selection** (`text-selection`, salvage 163), **search highlights** (`search-highlights`), **horizontal scroll** (`scroll-horizontal`), **nested panels** (`docking-nested`), **command palette** (`command-palette`), **tabbed workspace panes** (`docking-nested`/`workspace-tab-drag`) and **content surfaces** (`content-surfaces`, salvage 161)
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
`[x]` `packages/primitives`: Tier 1 behaviour truth — one defect per line below,
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
  - `[x]` Caller handler composition across the interactive parts — every
    interactive part now accepts `InteractionProps` (`onClick`, `onKeyDown`,
    `onKeyUp`, `onFocus`, `onBlur`) and composes it with its own handler through
    `composeEvent`, never substituting it: the caller's runs first and the part
    still acts. A disabled/blocked control installs **no** `onClick` at all
    (`composePress`, matching the components package's list rows) while its keys
    and focus stay observable; a field is an observation surface and keeps them.
    Adopted by `Button`, `IconButton`, `Toggle`, `Checkbox`, `Switch`, `Input`
    and `TextArea` first, then by the parts that compose several elements —
    `RadioGroup` (keys on the root, press and focus per option row), `Rating`
    (keys on the root, press and focus per star), `Slider` and `RangeSlider`
    (the track's press and keys; a range's keys and focus per thumb),
    `NumberField` (the input's press, keys and focus, and both steppers' press)
    and `OTPField` (every cell) — so the caller observes the interaction
    wherever it landed. `handlers.test.tsx` is the guard (50 cases: click order,
    one activation, no press while blocked, keys and focus through every part,
    disabled-field observability); both directions measured per part (dropping a
    part's composition fails its cases by name). `runtime/controls.runtime.test.tsx`
    proves GPUI's own focus, pointer and key dispatch reaches both handlers
    (without the composition: `expected [] to strictly equal [ 'focus' ]`), and
    `runtime/value.runtime.test.tsx` measures a real press and a real key on a
    `Slider` reaching the caller (without the track's `onClick`:
    `expected [] to strictly equal [ 'click' ]`). `Tooltip` stays out: it has no
    caller style or handler surface — GPUix's `TooltipContent` exists only while
    open and the trigger is the caller's own element, so there is nothing to
    compose onto.
  - `[x]` The switch thumb's motion — the knob was positioned by the track's
    `justifyContent`, which the runtime cannot animate, so it jumped. It is now
    an absolutely positioned child placed by its `left` inset (`core/selection.ts`
    owns the geometry, the registry's `switch-thumb-on-<size>` resolves the far
    position) and the component hands that same value to `motion`'s `motion.div`
    (150 ms `easeOut`, `initial: false` so the first paint is at rest). The
    runtime test samples the frames on the motion clock: the paint is still at
    the resting offset in the click's frame and at the far offset after
    `clockFastForward(300)`, and the knob stays inside the pill in both states.
    Both directions measured: without `motion`, the knob is at the far edge in
    the click's frame (`expected 27 to be 15`, exit `1`); with it,
    `--only`-less `runtime/switch.runtime.test.tsx` is 3/3. Docs, inventory row
    and `MIGRATION.md` name the slide and its one measured gap (no reduced-motion
    opt-out: the runtime exposes no preference)
  - `[x]` The native field's hint and selection reach — the empty-state hint and
    the selected text were the two things a field asks the runtime to paint, and
    neither was measured. `runtime/fields.runtime.test.tsx` now mounts an empty
    field beside a filled one: the hint paints once, the value replaces it (and
    typing clears the last hint), and the host `<input>` carries the whole text
    theme back — `text` = `inputForeground`, `textFaint` = the `placeholder`
    role, `bg` = `input` — plus the `selection` wash on both a selectable `Text`
    and the field. Both directions measured: dropping the field's `theme` prop
    fails with `hint handed the runtime no text theme` (exit `1`); with it,
    `runtime/fields.runtime.test.tsx` is 17/17. `docs/input.mdx` §Theming names
    the hint role and §Verification the measurement
  - `[x]` The standalone checkbox and switch were their own press target —
    an icon-sized drawing with nothing around it, under WCAG 2.2 SC 2.5.8's 24px
    floor. Each now draws inside a target that carries the role, the focus and
    the ring (`selectionTargetStyle`, `switchTargetStyle`; `targetInset` is the
    floor arithmetic), while the drawing takes `pointerEvents: "none"`. That one
    property is what makes the larger target safe **and** keeps the drawing's
    hover: it removes the mouse-blocking hitbox, not the element's hitbox — so a
    press anywhere reaches the target exactly once and the hover refinement still
    paints. The alternative, forcing the press with `pointerEvents: "auto"`,
    makes the drawing `occlude()`, which also stops a parent scroller's wheel
    (both measured). `runtime/selection-targets.runtime.test.tsx` presses the
    padding and the drawing and reports one change each; the two unit suites hold
    the geometry, the guard and the ring's placement; `switch.runtime.test.tsx`
    and `theme-axes.runtime.test.tsx` now read the drawing by child id, since the
    `testId` addresses the target. Both directions measured: with the two
    components reverted to `HEAD`, both new runtime cases fail on the missing
    target (`expected 16 to be greater than or equal to 24`) and the unit cases
    fail by name; with the change, unit 636 and runtime 180 are green
  - `[x]` A group option's row is the control, its ring and its press target —
    three measured defects in one place. **The ring never painted**:
    `RadioGroup` and `CheckboxGroup` declared `focusVisible` on the decorative
    circle/box, and the runtime applies that refinement only to an element it
    tracks focus for (`apply_focus_visible` is gated on a focus handle), so both
    groups had no keyboard focus indicator at all. **A checked box was a dead
    zone**: a painted element owns a mouse-blocking hitbox (`should_occlude`), so
    the filled box swallowed the press before the row's handler ran — a checked
    option could not be unchecked by pressing its own box. **The row measured
    17px tall**, under the 24px floor. `group.tsx` now owns the two rules
    (`optionRowStyle`: the ring and the floor; `optionBoxStyle`:
    `pointerEvents: "none"`), and `runtime/groups.runtime.test.tsx` measures all
    three in a window (pressing the box reports `changes 1` and `unchecked`; the
    focused row declares the ring and the box does not; every row is ≥ 24px).
    Both directions measured: before the fix that file failed those three cases by
    name (`expected +0 to be 1`, `expected false to be true`, `expected 17 to be
    greater than or equal to 24`), while now the runtime suite is 178/178; with
    the rule reverted the unit cases in `RadioGroup.test.tsx` and
    `CheckboxGroup.test.tsx` fail too (4 cases, two of them the focus matrix).
    Docs on both pages and the inventory rows carry the rule
`[x]` `apps/docs`: docs truth — stated native-test counts and the complete public type index (salvage 310, 324, 326, 330, 333, 335; the example registry page and the copy-and-own platform example contract have landed) — **complete, re-verified 2026-10-22**: `nub run --filter @gpuixui/docs test` is green (42 files / 341 tests) with `public-symbols.test.ts` holding the index to the workspace's exports, and `nub run --filter @gpuixui/components test src/docs-counts.test.ts` is 3/3, so no stated `(N tests)` claim in the 39 package pages is unheld
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
`[x]` `packages/components`: the paint path's cost model — one recipe compile measures ~0.25 ms and the package has 154 recipe sites, so a full repaint re-parsed every part's appearance. `internal/recipe.ts` now compiles once per recipe per theme: a `WeakMap` keyed by the theme object, up to 512 recipes, and the compiled `StyleDesc` frozen because every later render shares it; a recipe past the limit compiles but is not stored, so a caller's dynamic `className` cannot grow the cache. `src/internal/recipe.test.ts` (5 cases) holds it and 4 fail without the cache (`expected "vi.fn()" to be called 1 times, but got 2 times`). The same pass removed the suite's load-sensitivity: `internal/interaction.ts` gained `waitFor` (poll to a deadline, rethrow the check's own failure) and the timer-driven assertions in `navigation-menu`/`preview-card` use it instead of a fixed 40 ms sleep — measured 2026-10-22, one full behaviour run failed 8 navigation-menu timer cases that passed in isolation on a busy box. `waitFor` has its own 3-case suite, which fails when the helper swallows the deadline (`promise resolved "undefined" instead of rejecting`). Docs: the package README §What a repaint costs, and a live re-check after the cache (`--only dialog-lifecycle --only toast-lifecycle`, 2/2 on 0.11.0). Still open: no wall-clock baseline for the package surface (import cost, module graph) — the row below
`[x]` `packages/components`: the package surface has a baseline — the entry
reaches **85 modules / 548 KiB** of its own source, **129 modules / ≈817 KiB**
with the workspace packages it pulls (`@gpuixui/tokens` 22, `@gpuixui/tw` 9,
`@gpuixui/keyboard` 8, `@gpuixui/icons` 5), and its own modules import exactly
`@gpuix/react`, `effect` and `react`. Cold import, three fresh processes each:
the runtime alone 168 ms, one family through its subpath
(`@gpuixui/components/badge`) 528 ms, the barrel 876 ms — so the barrel costs
~350 ms more than the one family a consumer asked for (one shared-machine run
measured 1.96 s, so the README states the shape, not the digit). `src/surface.ts`
is the pure walk (runtime specifiers only; `import type` is erased),
`scripts/surface-io.ts` the workspace resolver the report and the gate share,
`src/surface.budget.ts` the record (85 modules exact, 600 KiB, the three
packages) and `src/surface.test.ts` the guard (14 cases, including the scanner's
own rules: a multi-line clause, a type-only statement, an exported string that is
not an import). Directions measured: the budget at 84 fails `keeps the entry
graph at the recorded module count`; dropping `react` fails `imports only the
packages the budget records`; a planted `import "node:fs"` fails the same case
naming the extra package; a planted `import "./does-not-exist.js"` fails `reaches
every module it imports`. Docs: `packages/components/README.md` §What the entry
costs to load; the command is
`nub run --filter @gpuixui/components measure:surface` (`--import` for the cold
numbers).
`[x]` `packages/components`: one key dispatch dismissed two nested overlays (salvage 366, 398) — the dismiss stack identified an event by payload object, but GPUix hands every enclosing handler its own payload for one keystroke, so Escape with a combobox or popover open inside a dialog closed **both**. The stack now identifies a key dispatch by the runtime's `keystrokeId` (a pointer event stays one shared object, so the `WeakSet` is kept), and clears it when the stack empties because a renderer numbers keystrokes from its own start. The combobox also joins the stack while open — it pushed no layer, so its popup had no claim above the dialog. Proof: `src/internal/dismiss-layer.test.ts` (3 new cases: one dispatch across payloads, the next dispatch counted separately, the id forgotten when the stack empties), the native `src/behaviour/combobox.test.tsx` case `closes only its own popup on Escape inside a dialog` and `src/behaviour/overlay-layering.test.tsx`'s `dismisses a popover opened inside a dialog one layer at a time`. Both native cases measured failing in both directions (reverting the layer: the popup never closed for the dialog to survive; reverting the id guard: `dialog-panel` was `undefined` after one Escape). Combobox 20 → 21 native tests (unit 364, behaviour 491); docs and the inventory row updated
`[x]` `packages/components`: two overlays **open in the first render** pushed child-first, because React runs a child's layout effect before its parent's, so the parent was topmost and took the first Escape — the dialog closed while the popover inside it stayed open. The stack now orders surfaces by **containment depth**, not by push: `internal/dismiss-scope.tsx` gives each open surface's children its depth, `pushDismissLayer` takes that depth, and equal depths keep push order (the later one is above). Proof: `src/internal/dismiss-layer.test.ts` (3 new cases: the deeper surface wins although it pushed first, its container is reached once it closes, equal depths keep push order) and the native `src/behaviour/overlay-layering.test.tsx` case `puts a popover declared open inside a dialog above it in the first render`. Both directions measured — with the stack ordered by push again, the native case failed with the dialog gone (`expected undefined to be defined`, exit `1`) and 3 unit cases failed. Live re-check on 0.11.0: `--only dialog-lifecycle --only popover-lifecycle --only menu-lifecycle --only context-menu-lifecycle --only command-palette` (5/5). Docs: the Dialog page's §Dismissal, the package README and the Dialog inventory row; behaviour 498, unit 367
`[x]` `packages/components`: disabled triggers were not inert (salvage 393, 394) — `CollapsibleTrigger` had no `disabled` at all, `DropdownMenuTrigger` kept a raw `onKeyDown` (the local button deliberately leaves keys observable so a wrapper sees them, and the trigger opened on ArrowDown/Enter), and `PreviewCardTrigger`/`NavigationMenuTrigger` still opened on hover and on a programmatic focus. Each trigger now refuses its own open paths while `disabled`, leaves the tab order, dims, drops its hover/press styling and its focus ring; the Collapsible trigger's `StateStyle` gained `disabled` (`{ open, closed, focused, disabled }`). Proof: one native case per component (`keeps a disabled trigger out of the tab order and closed`, `stays closed from a disabled trigger on hover, focus or press`, `keeps a disabled trigger from opening on hover, press or key`, `keeps a disabled trigger out of the tab order and closed`) — all four measured failing against the previous sources. Counts: collapsible 4 → 5, dropdown 35 → 36, navigation menu 17 → 18, preview card 8 → 9 (behaviour 495); docs pages and the four inventory rows updated
`[x]` `packages/components`: Form's messages were a copied list that only a second submit could refresh (salvage 397) — the reported reason was "an inline value object cannot tell an edit from a re-render", but the identity of `value` is not what the messages need: the state is now the `showErrors` flag and the messages are **derived from the caller's live value** on each render. Fixing a field clears its message and breaking another adds one without a second submit; a form that has never been submitted still shows nothing (the flag starts false, so nothing nags while typing). Proof: `src/behaviour/form.test.tsx`'s `revalidates on an edit after a failed submit, and clears when fixed` (measured failing before: the stale messages stayed) plus `shows nothing before the first submit, however the value changes` as the direction that must hold either way. Form 7 → 9 native tests (behaviour 497); `form.mdx`'s lifecycle/limitations/verification, the inventory row and `formMeta` updated
`[x]` `packages/components`: a held key re-ran every activation, and a wrapped test count escaped its guard — `isActivation` (`internal/key.ts`) accepted Enter/Space on key **down** without reading the runtime's `isHeld` repeat flag, so holding Enter on a focused menu row ran its action again on every platform repeat (a checkbox row toggled back) and holding Space flipped an accordion section shut again. It now refuses a repeat, which is the guard `@gpuix/react`'s own headless `button` already uses, and the two inline clear controls that bypassed the predicate (`SearchInput`, `TimePickerClear`) share it. Space-on-**up** and `defaultPrevented` still need `packages/primitives`' keyboard module, so the package keeps activating Space on the press and the deviation is recorded in `docs/component-api.md` §4. Proof: `src/internal/key.test.ts`'s repeat case, and three native cases — `button.test.tsx`'s `activates once per keypress while Enter or Space is held` (`expected "vi.fn()" to be called 1 times, but got 2 times` before), `dropdown-menu.test.tsx`'s `toggles a checkbox row once while Enter is held` (same measurement) and `accordion.test.tsx`'s `does not close the section again on a repeat while Enter is held` (`expected undefined to be defined`). Both directions measured: with the guard removed each new case fails in isolation and the rest of its file cascades; restored, unit 401 and behaviour 512 are green. The same pass found `docs-counts.test.ts` blind to a claim a page wrapped onto the next line: its pattern required a space between the number and `tests`, so `dropdown-menu.mdx`'s `(36` / `tests)` was never read and the page had drifted a case behind its 37-case suite; the pattern now accepts the break, a fixture case holds it, and fixing it immediately reported both drifted pages (`accordion.mdx:131 says 13 … runs 14`, `dropdown-menu.mdx:260 says 36 … runs 38`). Docs: `docs/component-api.md` §4, `docs/dropdown-menu.mdx` and `docs/accordion.mdx` §Keyboard/§Verification, the two inventory rows and their counts.
