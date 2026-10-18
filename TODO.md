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

`[x]` `[██░░░░░░░░]` 1/6

`[ ]` Land the workspace, boundaries and package scaffolding that has real content
`[x]` Land tokens and the theming architecture (light + dark, semantic roles)
`[ ]` Land the primitives package
`[ ]` **Native smoke test**: layout, input, focus, overlay and panel primitives in real GPUix
`[ ]` Land one fully working component running in GPUix
`[ ]` Land the docs shell and document that component in Fumadocs

### Design tokens and theming (`tokens-theme`)

`[x]` `[███████░░░]` 133/183

`[x]` Write and index the tokens/theme plan set (plans 010–019, 050–072)
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
`docs/design-system.md` — GPUix 0.10.0 has no `outline*` and no `focusVisible`
(plan 017)
`[x]` Drop `BoxShadow.inset`, document the one-shadow rule and hoist
`elevationShadow(theme, level)` (plan 018)
`[x]` Write `docs/tokens.md` (every token + extension API)
`[x]` Write `docs/design-system.md` (identity, roles, state, accessibility)
`[x]` Add platform type styles for the docs platform toggle (plan 051)
`[x]` Ship four platform style variants — macOS, Linux, Windows and Default — as
editable `platformStyles` themes and `getPlatformTheme(platform, mode, contrast)`,
with the high-contrast colour set winning over platform resemblance (plan 063)
`[x]` Add the design-system rows to `COMPONENTS.md`
`[x]` Hold the Toast's tone on its floating card — it paints its glyph and 3px
bar with `xSoftForeground` on `popover`, which the contract measured only on its
own soft fill, so an edited theme could erase a toast's tone while the checker
returned `[]`; every shipped set passes (11.97:1 at the tightest), so no colour
moves and the contract grows 333 → 337 (plan 348)
`[x]` Hold the contract's own guards to their claims — every "unique pairs"
assertion built a `Set` of tuple arrays, which compares identity, so a repeated
`[foreground, background, class]` could never fail one and the checker could
report a composition twice; each published list is now checked by content and
the guard has a case that proves it can fail. The high-contrast palette's JSDoc
still said 64 roles (66 ship) and is now held to `colorRoles.length` (plan 349)
`[x]` Make the package's own examples honest — `primary-text.example.ts` shipped
in plan 082 with no test importing it and no document linking it, so the snippet
could drift while every gate stayed green; it now runs in `primary-text.test.ts`
and is linked from the reference and README, and a new guard fails if a future
`*.example.ts` is imported by no suite (plan 350)
`[x]` Hold the design-system's accessibility floor table to the contract — it
had no row for the `track` groove or the four marks painted on it (plan 347) and
its mark row omitted the combobox check on a highlighted row's `hover` wash
(plan 341); every `ContrastPairClass` now needs a row, and the mark, track and
Toast role/surface lists are derived from the contract (plan 351)
`[x]` Hold the design-system's boundary row to the contract — it named the
dialog, panel, row washes and soft fills but not the canvas, a card or the
`input` fill, where `borderStrong` is also measured; the row now names its three
roles and a derived case holds each `borderStrong` surface to its own clause
(plan 352)
`[x]` Hold the design-system's interaction-state table to the contract — it was
the last hand-written list on the page: the link row omitted the four soft
status fills plan 346 added, the loading row named four of eight surfaces, and
the focus row named none; every state row now names its roles, and ten derived
cases hold each to the pair list that enforces it (plan 354)
`[x]` Hold the documented snippets to the public API — the fenced `ts`/`tsx`
blocks in `docs/tokens.md` and the package README were the last unguarded
documentation surface, and the platform-recipe snippet rendered
`<ThemeProvider>` without importing it; a new guard checks every named import,
every `theme.colors.*` and scale member, and every public function, component
and type a snippet uses without importing it (plan 355)
`[x]` Hold the source JSDoc examples to the public API — plan 355 called the
docs and README the last unguarded surface, but the `@example` blocks in the
package's own modules were never read: `getPlatformTheme` and
`getPlatformRecipeTheme` both rendered `<ThemeProvider>` without importing it,
and `applyPlatformStyle` applied an undefined `contosoStyle`; the snippet guard
now reads every non-test module, both providers are imported, the deprecated
bridge is a complete block, and the apply example uses `platformStyles.win32`
(plan 356)
`[x]` Publish the generic wash ladder in the public contrast contract — a ghost
or outline control's press was measured only as `active` on a surface, so an
edited theme whose `active` equalled `hover` returned `[]` while the press had
no visible change; `washStepPairs` holds it to the same 1.05:1 `step` floor as
the filled families, every shipped set passes (1.059:1 at the tightest) and the
contract grows 337 → 338 (plan 357)
`[x]` Ship the numeric half of the theme contract — `themeMetricFailures` and
`metricGroups` hold an edited theme's typography, spacing, radii, density,
component dimensions, elevation, motion, border, icon and avatar metrics to the
invariants the components rely on; a zero `borderWidth.strong` removed the focus
ring, a shortened leading clipped text and an inverted ladder changed what a
name means, all while `themeContrastFailures` returned `[]`. Every shipped
theme, platform variant and recipe passes, so no value moves (plan 358)
`[x]` Hold the modal scrim on the two persistent surfaces a dialog opens over —
`selected` is a row state that stays while the pointer moves to the dialog and
`input` is the fill of every field behind a settings or rename dialog, yet plan
099 excluded them with the transient pointer washes; an overlay equal to macOS
light's `selected` measured **1.000:1** on that row while
`themeContrastFailures` returned `[]`. Six scrim pairs now, every shipped set
passes (1.164:1 at the tightest), so no colour moves (plan 359)
`[ ]` Cross-team: `components` moves the secondary Button off the mixed
`secondary` → `hover` → `active` ladder — `internal/button.tsx` rests on
`secondary` and hovers to `hover`, and the pair is under the 1.05:1 step floor in
23 of 24 shipped sets and the *same value* in 19 (identity light and both AAA
sets, macOS light and dark, Linux dark, Windows dark, the XP/Aero dark halves
and the `default` variants), so the shipped secondary control has no hover state
there; use `secondaryHover`/`secondaryActive`, the designed family plan 097
shipped and plan 334 already holds the label on (plan 357; owner: `components`)
`[ ]` Cross-team: `components` moves a selectable `List` row's press off the
neutral `active` wash — `list.tsx` hovers to `accent` and presses to `active`,
which measure **1.004:1** in identity dark and the `default` dark half and
**1.019:1** in the XP light recipe, under the 1.05:1 step floor, so a pressed row
changes hue but not luminance; use `accentActive`, the designed pressed accent
plan 327 shipped and the family steps already measure (plan 357; owner:
`components`)
`[x]` Ship the avatar diameter scale (`avatarSize`) so `components` can delete
its local `DIAMETER` (plan 054)
`[x]` Ship designed `primaryHover` / `destructiveHover` roles so filled controls
stop faking hover with an alpha fill (plan 055)
`[x]` Guard the token catalogue against drift from the implementation (plan 056)
`[x]` Guard the numeric token tables in `docs/tokens.md` (typography,
spacing, radius, density, elevation, motion, borders/icons/avatars) against
drift from the implementation (plan 058)
`[x]` Guard `docs/design-system.md`'s numeric claims — identity metrics, role
count, theme surfaces, type summary, spacing, density, radii, icon/avatar
tiers — against the implementation (plan 062)
`[x]` Ship `platformNames` and `statusTones` as ordered documentation indexes,
derive `PlatformName`/`StatusTone` from them, and guard the unguarded status
table in `docs/tokens.md` (plan 064)
`[x]` Guard `packages/tokens/README.md` — role count, platform table,
type-role count, motion levels and status families — and fix its motion list,
which omitted `none` (plan 065)
`[x]` Name every public value in `docs/tokens.md` — seven value exports were
absent — guard coverage with a namespace-wide test, ship a compiled
`PlatformStyle` authored from scratch, and add the loading state to the design
system (plan 066)
`[x]` Ship `isPlatformName` / `isThemeMode` / `isThemeContrast` so a persisted
choice narrows through the union owner instead of a retyped guard (plan 067)
`[x]` Close the last two unions — `densityNames` / `isDensityName` and
`isStatusTone` — so a stored density and a payload tone narrow through the
package too; the private string check in `theme.ts` is gone and the preset
names are no longer retyped in `scale.test.ts` (plan 068)
`[x]` Name the runtime's reach for the last two unapplied roles: ship
`selectionStyle` for the inherited `selectionColor`, and re-document
`scrollbar` as reserved because 0.10.0 exposes no tint (plan 069)
`[x]` Make the README's install path honest — a workspace dependency while the
package is private — and guard it against the manifest; hold the design-system's
per-platform family sentence to `platformTypes`; document icon alignment, the
last mission-named design-system item (plan 070)
`[ ]` Cross-team: `playground` extends the type gallery to assert leading and
weight through layout bounds, not the retained style — `paintedStyle` reads
`getElement().style`, so it shows what was authored rather than what painted; a
native probe on the pinned 0.10.0 paints a three-line `lineHeight` 20/60 block at
76/196px, which bounds can prove (owner: `playground`)
`[x]` Hold the default label of a list or menu row to its floor on the washes it
paints — a selected title is `foreground` on `selected`, a hovered row is
`foreground` on `accent`, a selected row under the pointer is
`selectedForeground` on `hover`/`active`, and a menu row is `popoverForeground`
on `hover`/`active`; all ten shipped sets pass (7.47:1 at the tightest), the
field edge on `input` joins them, and the checker grows 232 → 239 pairs
(plan 312)
`[x]` Guard the ledger's second role count — the Design tokens row said `62
semantic roles` and “the current 58” in one sentence after plan 311 added four
roles; every numeric role phrase in the row is now held to `colorRoles.length`
(plan 313)
`[x]` Hold the last three compositions the contract never painted — a selected
`Select` option (`popoverForeground` on `selected`), a status dot on the
`muted` sidebar panel, and a `primaryText` link on the `accent`/`selected` row
fills — so an edited theme cannot erase them while the checker returns `[]`;
every shipped set passes (4.53:1 at the tightest) and the contract grows
239 → 246 pairs (plan 314)
`[x]` Hold typed text on the `background` canvas a transparent field paints —
SearchInput, InlineEdit, ColorPicker, TagInput and MentionInput all paint an
input there, but `inputForeground` was measured only on the `input` fill, so an
edited theme could erase a search query while the checker returned `[]`; every
shipped set passes, so no colour moves and the contract grows 246 → 247 pairs
(plan 315)
`[x]` Hold a selected row's inherited label on the `accent` fill a selectable
row hovers — `list.tsx` paints `accent` on hover while the label keeps
`selectedForeground`, and plan 312 measured only `hover`/`active`, so an edited
theme could erase it while the checker returned `[]`; every shipped set passes
(5.81:1 at the tightest), so no colour moves and the contract grows 247 → 248
pairs (plan 316)
`[x]` Hold the placeholder on every surface a field sits on — it was measured
on the `input` fill only, so a transparent SearchInput in a sidebar or a dialog
had no pair, and the identity dark `#7C8595` measured 4.03:1 on `muted` and
`popover` while the XP and Aero dark recipes inherited it; the four `Surface`
tones join the contract (248 → 252), identity dark moves to `#858F9F` and every
shipped set clears 4.5:1 (plan 317)
`[x]` Hold the outlined control's edge on the neutral family's designed hover
and press — plan 097 replaced the generic washes with
`secondaryHover`/`secondaryActive` but the edge was measured only on the pre-097
fills, so macOS light and Windows light measured 1.000:1 and Linux light 1.009:1
on the pressed fill, and both AAA sets sat under their 3:1 floor; the two fills
join the divider contract (252 → 254), the three light pressed steps and the two
AAA dividers move one designed step (plan 318)
`[x]` Hold typed text on every surface a field sits on — `inputForeground` had
pairs on the `input` fill and the `background` canvas only, while the placeholder
gained all four `Surface` tones in plan 317, so a copied style could erase a
search query in a sidebar or a dialog while the checker returned `[]`; the
`card`, `popover` and `muted` surfaces join the body contract (254 → 257) and
every shipped set clears 7:1, so no colour moves (plan 319)
`[x]` Hold default body text on the four soft status fills an Alert paints —
`AlertDescription` and the ghost dismiss control set `foreground` on the
tone-tinted root (`xSoft`), but `foreground` was measured on the plain surfaces
and row washes only, so an edited theme could erase an Alert body while the
checker returned `[]`; every shipped set clears 7:1, so no colour moves and the
contract grows 257 → 261 (plan 320)
`[x]` Make every theme merge total — an explicit `undefined` in a partial
override erased a colour role, a type field, a motion timing, a density metric or
an elevation level, and the last one crashed `elevationShadow`; every group now
treats it as omitted (plan 321)
`[x]` Hold the loading skeleton on the `accent` wash a selectable list row
hovers — `skeletonSurfaces` covered `hover`/`active`/`selected` but not `accent`,
so an edited theme could erase a placeholder row while the checker returned `[]`;
every shipped set passes, so no colour moves and the contract grows 261 → 262
(plan 322)
`[x]` Make an `undefined` platform colour not count as an override —
`applyPlatformStyle(highBase, style, "default")` keyed its contrast declaration
off `Object.keys`, so an all-undefined colour object inherited the AAA palette
but declared `default`; the predicate reads defined values now (plan 323)
`[x]` Name every public type in `docs/tokens.md` — 24 of the 44 exported types,
including `ThemeOverrides`, `PlatformRecipeName` and the contrast contract's
`ContrastPair`, were absent while the value-coverage test stayed green; a
module-walk guard now holds the type index to the entry modules (plan 324)
`[x]` Hold the invalid field edge — `FieldInput` paints a `destructive` border
on `input` and the ColorPicker hex field on `background`, but the contract
measured `destructive` only as a fill, so an edited theme could erase the error
signal while the checker returned `[]`; both pairs join the `boundary` class,
every shipped set passes, so no colour moves (plan 325)
`[x]` Hold the contract's own counts — `docs/tokens.md` still called
`inactivePairs` the nine-surface list after plan 307 made it thirteen, its
verification paragraph omitted the four soft fills from the same list, and the
pair-count history ended at 262 while plan 325 shipped 264; the prose now derives
both from the lists and the audit range names the latest plan (plan 326)
`[x]` Complete the accent family's state matrix — the toggle-on fill still
hovered and pressed at `alpha(accent, 0.9/0.8)`, so the state depended on the
backdrop and had no contrast pair while plan 097 had fixed the other three
families; `accentHover` and `accentActive` are designed, platform-specific,
contrast-checked roles (62 → 64 roles, 264 → 276 pairs), and the primitives
migration is recorded cross-team (plan 327)
`[x]` Make the XP and Aero recipes carry the Windows dark palette their docs
promise — both declared `dark: {}` over the identity base, so a recipe's dark
half was the identity graphite/iris instead of `#202020`/`#4CC2FF`; the recipe
data now names the Windows dark colours, a regression test compares every dark
role with the Windows variant, and the docs no longer claim an era accent in
dark (plan 328)
`[x]` Hold the two shipped recipes to the filled-state matrix — `filled-states`
iterated the identity and three platform variants but not XP/Aero, so a recipe
could collapse a family's hover/press while the suite stayed green; the loop and
a presence case now cover both recipes in both modes (plan 329)
`[x]` Hold the authored platform example to the whole-family rule — it moved
`accent` and `accentForeground` but inherited the identity iris
`accentHover`/`accentActive`, so the documented Contoso toggle turned lavender
while hovered and pressed while every contrast pair stayed green; both states now
belong to the Contoso blue family, and a regression case holds the moved roles to
the base (plan 330)
`[x]` Make the authored example's selection wash follow its accent — every
shipped style ties `selection` to its accent, but `contosoPlatformStyle` kept the
identity iris wash while moving the rest of the family to Contoso blue, so a
copied theme selected text in the wrong hue while `themeContrastFailures`
returned `[]`; the wash is now the Contoso primary at the identity's alpha and a
regression case holds it away from the base (plan 331)
`[x]` Separate a fill from a mark — a solid role painted as a progress segment,
slider fill, slider thumb's ring, rating star, combobox check or timeline dot
was measured only at the 1.05:1 interactive-fill floor, so a theme could collapse
`primary`/`success`/`destructive` into the surface behind a bar or glyph while
the checker returned `[]`; `mark` is a 3:1 (4.5:1 at AAA) pair class with
fourteen pairs (276 → 290), every shipped set already passes, and
`mark-contrast.test.ts` states the erased-mark regressions (plan 332)
`[x]` Make the tokens suite's own gate honest — Vitest's 5 s default timed out
the real TypeScript compile in `react-consumer.test.ts` and a pure 290-pair
palette audit under the 55-file parallel run, so
`nub run --filter @gpuixui/tokens test` failed three times with no code change;
the package now carries a 20 s budget (plan 333)
`[x]` Hold the shipped secondary control's label on the generic washes it
paints — `components/internal/button.tsx` keeps `secondaryForeground` while
hovering and pressing onto `hover`/`active`, but the contract measured only the
designed family, so an edited wash could erase the label while the checker
returned `[]`; every shipped set already passes (10.42:1 at the tightest), so no
colour moves and the contract grows 290 → 292 (plan 334)
`[x]` Hold the control edge on the selected row fill — `list.tsx` paints
`selected` behind arbitrary row children and the outline Button paints no fill
at rest, so an outline action or separator inside a selected row paints `border`
on that fill, which the contract measured only on `hover`/`active`/`accent`;
every shipped set passes (1.113:1 at the tightest), so no colour moves, the
contract grows 292 → 293, and the hand-typed six-fill filter that hid plan 327's
accent steps is now derived from the contract (plan 335)
`[x]` Pin the catalogue's last unpinned tightest figures — the eight current
ratios it quotes (the four row-text values, `successText` on `muted`, the field
edge, the AAA scrim and its wash strength) were computed once by hand and no
test held them, so a palette edit could leave the page quoting a number the
package no longer produces while every pair still passed; `docs.test.ts` now
derives each figure, its theme label and the scrim's percentage (plan 336)
`[x]` Correct the two runtime-reach claims that were one level too broad — the
reference said `selectionColor` themes native text selection and listed
`placeholder` as painted on the `input` fill, but pinned `@gpuix/native@0.10.0`
(`9fcd628`) `<input>` paints its own fixed placeholder (`#8F8F8F`) and
selection (`#7C86FF59`), takes typed text from `style.color` and reads only
`theme.caret`; the fixed grey measures 3.23:1 on the light `input`, the docs and
README now separate the paths, `selectionStyle`'s JSDoc states the limit, and
two `docs.test.ts` cases hold the evidence (plan 337)
`[x]` Ship `filledControl(theme, family)` beside `filledControlFamilies`,
`FilledControlFamily` and `FilledControlStyle`, and pin the measured cost of the
alpha hover the consumers still paint — the primary label falls to **2.06:1** on
a Linux light card at 50% and **3.40:1** at 80% (destructive 2.24:1 / 3.75:1),
under the 4.5:1 on-colour floor; the 50% case is past repair in the palette
(even black at 50% on white reaches only 4.00:1), so the evidence is guarded
prose plus the designed one-call replacement, not a pair (plan 338)
`[x]` Hold the field's own secondary text — a time picker paints its separator
and clear control with `mutedForeground` on the `input` fill, which the contract
measured only on the plain surfaces and the four row washes; every shipped set
passes (8.376:1 at the tightest), so no colour moves and the contract grows
293 → 294 (plan 339)
`[x]` Hold the invalid control's focus ring — `controlFocusStyle` recolours the
ring with `destructive` when a field fails validation, and the runtime can draw
only one ring, but the contract measured that role as a fill and as the field's
own edge, never as the ring on the surface behind the control; every shipped set
passes (3.048:1 at the tightest), so no colour moves and the contract grows
294 → 305 (plan 340)
`[x]` Hold the combobox's selected check on the row wash — `ComboboxItem` marks
a selected option with a `primary` check and `rowStyle` paints `hover` behind it
while highlighted, but `markPairs` measured `primary` only on the plain surfaces
and the slider thumb; every shipped set passes (3.111:1 at the tightest), so no
colour moves and the contract grows 305 → 306 (plan 341)
`[x]` Publish the filled families' step floor in the public contrast contract —
a collapsed hover or press was invisible to `themeContrastFailures` because the
1.05:1 step lived only in `filled-states.test.ts`, which runs on shipped themes;
`stateStepPairs` adds eight `step` pairs (306 → 314), every shipped set already
clears them, so no colour moves (plan 342)
`[x]` Hold the field's pressed edge — `ring` on the `input` fill, the pressed
counterpart to the `borderStrong` hover edge — in the public contrast contract;
every shipped set already clears the boundary floor (identity light is tightest
at 4.218:1), so no colour moves and the contract grows 314 → 315 (plan 343)
`[x]` Ship the inverse selection veil for content painted on a filled action —
a user message bubble paints body text on `primary`, where the accent-tinted
`selection` wash composites to **1.000:1** in six shipped palettes (identity
dark, macOS light and dark, Linux light, Windows light and Aero light);
`selectionOnFill` is a neutral 15% veil,
`selectionStyle(theme, "fill")` applies it, and
`selectionFillPairs`/`selectionFillWashPairs` hold the three families to their
floors with no colour change (6.10:1 text and 1.105:1 wash at the tightest)
(plan 344)
`[x]` Keep a platform's elevation at high contrast — plan 063 skipped it because
a level then carried a colour, but plan 085 made a level geometry plus an alpha
over the `shadow` tint, so every AAA platform variant painted the identity's
shadows while the docs toggle promised a platform preview; the levels now ride
with the structural overrides and the AAA tint stays, so no colour or pair moves
(plan 345)
`[x]` Hold a status panel's caption and link — `mutedForeground` and
`primaryText` had pairs on the plain surfaces, the row washes and the `input`
fill but not the four soft status fills an Alert's description can carry a
caption or a link on, so an edited theme could erase either while the checker
returned `[]`; every shipped set passes (6.61:1 and 5.26:1 at the tightest), so
no colour moves and the contract grows 315 → 323 (plan 346)
`[x]` Ship the value indicator's track — `track` is a role of its own, measured
on the four base surfaces and the persistent `accent`/`selected` fills, with the
four progress fills as marks on it, because `muted` equals the card and popover
in every platform dark style and an indeterminate progress bar painted nothing
on a dark card; the contract grows 323 → 333 (plan 347)
`[ ]` Cross-team: `components` applies `selectionStyle(theme, "fill")` — or
`theme.colors.selectionOnFill` — to the user `Message` bubble in `message.tsx`
`bubble()`, which paints body text on `primary`; the accent-tinted `selection`
wash composites to **1.000:1** there in identity dark, macOS light and dark,
Linux light, Windows light and Aero light, so selecting a sent message shows no
highlight. The token and helper ship in plan 344; the bubble keeps its brand
fill (owner: `components`; plan 344)
`[ ]` Cross-team: `primitives` must not paint an invalid field as a solid
`destructive` surface — `controlStyle` in `src/core/style.ts` sets
`backgroundColor: rest`, and `rest` is `destructive` when `invalid` is true, so
an invalid `Input`/`TextArea`/`Select` paints `inputForeground` on `destructive`
at **1.97:1** (both AAA dark) to **3.48:1** (Aero light), under the 4.5:1 floor,
and its `hover`/`active` variants replace the error border with
`borderStrong`/`ring`, so the error signal disappears under the pointer. Keep
the `input` fill and the `destructive` border in every state (the documented
invalid state), or use `destructiveSoft` + `destructiveSoftForeground`
(measured at 7:1); `destructiveText` carries the message (plan 343; owner:
`primitives`)
`[ ]` Cross-team: `primitives` gives a pressed selection control a perceivable
state — `selectionBoxStyle` and `switchTrackStyle` paint
`active: { borderColor: ring }` on a filled box whose fill is `primary` or
`destructive`, and `ring` measures **1.000:1** on `primary` in the identity dark,
Linux dark, Windows dark, the XP and Aero dark recipes and both AAA dark sets,
1.000:1 on `primary` in the macOS, Linux and Windows light variants, and
1.02–1.42:1 on `destructive` — so a pressed checked checkbox or switch shows no
change on its only state signal; both also hover and press at
`alpha(fill, 0.9/0.8)`, the plan-097 defect one component over.
`filledControl(theme, family)` returns the designed trio and its one foreground,
so the press becomes a measured fill step while the ring stays the focus
indicator (plan 342 audit; owner: `primitives`)
`[ ]` Cross-team: `components` moves the menu row's highlight bar off `accent` —
`menu/item.tsx:91` paints a 2px left border in `accent` on the highlighted row,
and `accent` measures 1.118–1.392:1 on the menu's `popover` and 1.000–1.113:1 on
the `hover` fill the row also paints, under the 3:1 mark floor, so the bar that
exists to show the highlight cannot be seen. Paint `borderStrong` (the functional
boundary, already measured on `popover`/`hover`/`active`) or
`popoverForeground`, the row's own text role (plan 342 audit; owner:
`components`)
`[ ]` Cross-team: `components` moves the Avatar presence dot off the solid status
fills — `avatar.tsx` `statusFill` paints `success`/`warning`/`destructive` on a
`card`-coloured ring, and light `warning` measures **1.78:1** on its card, so the
"away" dot is effectively invisible; use `statusTone(...).text` (`xText`), which
the status-text contract already measures on `card` (plan 332; owner:
`components`)
`[ ]` Cross-team: `components` moves the Timeline upcoming dot off `muted` —
`timeline.tsx` `dotFill` paints `muted` on the canvas, **1.036:1** in the
identity light theme and 1.014:1 on Aero light, so a pending event has no dot;
use `borderStrong`, the 3:1 functional boundary, or `mutedForeground` for the
secondary floor (plan 332; owner: `components`)
`[ ]` Cross-team: `components` moves the menu checkbox item's check glyph off
`accent` — `menu/item.tsx:286` paints `theme.colors.accent` on the menu's
`popover` (1.11–1.39:1) and on the `hover`/`active` row fill (1.00–1.08:1),
under the 3:1 mark floor, so a checked item has no visible check; `accent` is a
wash, not a glyph. Use `popoverForeground` — the row's own text role, already
measured on `popover`/`hover`/`active`/`selected` — as `ComboboxItem` already
does with `primary` (plan 339; owner: `components`)
`[ ]` Cross-team: `components` uses `primaryText` for the Accordion trigger's
hover label — `accordion.tsx:474` sets `color: primary` on hover, and the fill
role measures 4.21:1 on the macOS light canvas and 3.82:1 on a card, under the
4.5:1 secondary floor; `primaryText` is held on the six surfaces a link paints
(plan 332; owner: `components`)
`[ ]` Cross-team: `components` moves the Toast icon and 3px tone bar off
`xSoftForeground` — `toast/viewport.tsx` paints `palette.fg`, the soft-surface
foreground designed for its own tint, on the `popover` card; use
`statusTone(...).text` (`xText`), which the status-text contract measures on
`popover` (plan 332; owner: `components`); the shipped pair is held by
`toastTonePairs` at the secondary floor until this lands (plan 348)
`[ ]` Cross-team: `components` sets the `placeholder` role on the transparent
fields painted on `background` (SearchInput, InlineEdit, ColorPicker, TagInput,
MentionInput) and adds an `input`-fill placeholder only where it owns that fill —
they currently leave placeholder colour to the runtime default; the token is now
measured on the `input` fill and the four `Surface` tones a transparent field
sits on, so painting it on any of them is held by the checker (owner:
`components`; plans 315 and 317)
`[ ]` Cross-team: `primitives` paints an unchecked checkbox/switch border with
`theme.colors.input`, a **background** role — `input` is `#FFFFFF` in every
light set, so an unchecked box on a white card measures 1.000:1 and has no
visible edge (`primitives/src/core/selection.ts` `emptyBorder`, used at
`selectionBoxStyle` and `switchTrackStyle`). It should paint the designed
`borderStrong` control boundary, which plan 084 already holds to 3:1 (4.5:1 at
AAA) on the quiet panel and the row washes (owner: `primitives`; plans 084, 312)
`[ ]` Cross-team: `primitives` stops trusting `nativeTextTheme` for a native
field's hint and selection — pinned `@gpuix/native@0.10.0` (`9fcd628`)
`<input>`/`<textarea>` reads only `theme.caret`, hardcodes the placeholder
(`#8F8F8F`, 3.23:1 on the light `input`, under the 4.5:1 secondary floor) and
the selection wash (`#7C86FF59`), and takes typed text from `style.color`, so
`textFaint`, `textMuted`, `bg`, `accent` and the inherited `selectionColor` do
not reach the field; pass `selectionStyle(theme)` on the field and either draw
the hint as a `<text>` overlay with the `placeholder` role or document the
runtime grey (owner: `primitives`; plan 337)
`[ ]` Cross-team: `docs-site` moves the platform toggle from the pre-063
`platformTheme(base, platform)` API to `getPlatformTheme(platform, mode,
contrast)`, deletes its structural `packages/tokens` copy (still the 47-role
package with no `platformStyles`), and makes every preview read the resolved
theme — otherwise the MISSION acceptance "toggle macOS → Windows and every
preview changes" does not survive the merge (owner: `docs-site`; plans 420 and
063)
`[ ]` Cross-team: `docs-site` imports `platformNames` and `isPlatformName` from
`@gpuixui/tokens` and deletes its local copies in
`src/platform/platform.ts` (owner: `docs-site`; plan 067)
`[x]` Expose `textRoles` and guard it against the `Typography` interface
(plan 059)
`[x]` Guard every documented colour pair — muted text on plain surfaces, input
text, ghost text on `hover`/`active`, the composited `selection` wash (plan 059)
`[x]` Ship the contrast contract a consumer can run — `contrastRatio`,
`compositeOver`, `contrastPairs`, `contrastFloors` and
`themeContrastFailures`, so an edited platform style or brand theme is held to
the same floors the library's own suites enforce, selection wash included
(plan 071)
`[x]` Extend the contrast contract to the surfaces the state table and the
layering model already name — the focus ring on the `hover`/`active`/`selected`
washes a focused row paints, and status text and the control boundary on
`popover` — so an edited theme is held to the pairs an app actually paints
(plan 074)
`[x]` Guard the figures the catalogue quotes in prose — the light
`warning`/`success` ratios, the design-system's warning figure and the selection
wash percentage — derive the `xText` surfaces from `contrastPairs` so the
high-contrast table names `popover`, and correct the `compositeOver` example
that printed `#808080` for a `#7F7F7F` composite (plan 075)
`[x]` Hold the contrast contract to the soft status surfaces and decorative
dividers it never checked, and fix the nine shipped platform pairs below the
1.05:1 floor — Linux dark's `destructiveSoft` measured 1.005:1 on its own card
(plan 076)
`[x]` Make `alpha` total for a computed fraction — `alpha(color, NaN)` emitted
`#2559D6NaN`, which the runtime ignores; a non-clampable amount now returns the
colour unchanged (plan 077)
`[x]` Guard the palette ramps in `docs/tokens.md` — the last hand-written value
table without a drift test (plan 072)
`[x]` Make a theme declare its contrast level so `applyPlatformStyle` and
`themeContrastFailures` default to the floors it was designed against, and hold
the reference's `Theme` block to the interface (plan 073)
`[x]` Make `@gpuixui/tokens/react` consumable under a GPUix `jsxImportSource`
with no tsconfig shim — the entry uses `createElement` and carries no JSX; a
consumer-config type check guards it (plan 061)
`[x]` Correct the runtime's animated-property count (eight, not seven) and the
reserved `overlay` JSDoc; evidence in the pinned `MotionStyle` (plan 060)
`[x]` Ship status text roles (`infoText`/`successText`/`warningText`/
`destructiveText`) so status labels, icons and indicator dots have a readable
colour on plain surfaces — light `warning` was 1.78:1 on `background` — and
expose them as `statusTone(...).text` (plan 057)
`[x]` Add motion tokens (durations/easings); three `primitives` call sites held
`120`/`700` as literals (plan 019)
`[x]` Guard that all four shipped themes carry every theme group (part of plan
019)
`[x]` Document the layering model (tree order, no portal in 0.10.0) and the
deliberate token omissions (plan 050; completes plan 202 §2.3–2.4)
`[x]` Reconcile the two `tokens` branches into one — motion tokens (019) and
platform type styles (051) now live on one branch (plan 053)
`[!]` Custom typefaces: `registerFont` is **absent from pinned GPUix 0.10.0** — it
exists only as an unreleased minor changeset on `references/gpuix` main — so no
registration code lands. Evidence: `@gpuix/native@0.10.0`'s `GpuixRenderer`
declares no such method and `@gpuix/react@0.10.0` re-exports that class. Plan 052
is `blocked (upstream)` and keeps the ready design (idempotent `registerFonts`) and
test plan for the release that exposes it. No font is bundled.
`[x]` Native theme gallery landed in `apps/playground` (plan 150, 14/14 green;
owner: `playground`) — it paints every `colorRoles` entry and every type role
across dark/light/high-contrast dark and asserts the runtime's own
`paintedStyle`, which is the native proof these rows cite
`[x]` Ship Windows XP and Aero platform recipes as editable `PlatformStyle`
values with a resolver and guard, held to the contrast contract in both modes
(plan 311); Recipe B (Omarchy) remains blocked on host verification (plan 433)
`[ ]` Cross-team: the Fumadocs platform toggle (macOS / Linux / Windows /
Default) switches every preview through `getPlatformTheme`, keeps the choice in
shareable page state and remembers it across navigation; document it under
Theming as an illustrative browser approximation (owner: `docs-site`; plan 063)
`[ ]` Cross-team: `docs-site` offers the Windows XP and Aero recipes beside the
platform toggle through `getPlatformRecipeTheme` / `isPlatformRecipeName`,
switchable and shareable in the page URL, and labels the honest limits — dark as
an interpretation, Aero's glass as solid layers, XP's filled selection bar as an
app composition (owner: `docs-site`; plans 311 and 433)
`[ ]` Cross-team: `playground` paints the XP and Aero recipes natively in the
theme gallery, one view per recipe, so the copy-and-own path is verified in the
runtime and not only by the token suite (owner: `playground`; plan 311)
`[ ]` Cross-team: a native visual per-platform comparison built on
`getPlatformTheme` (owner: `playground`; plan 063)
`[ ]` Cross-team: `playground` paints the selection wash through
`selectionStyle` in the theme gallery, so `selectionColor` is verified in the
runtime rather than only in the type and docs (owner: `playground`; plan 069); ignore the `references`
**symlink** — a `references/` rule does not match a symlink, so every worktree
shows it as untracked (owner: repo tooling; `packages/README.md` already lists
`tokens`)
`[ ]` Cross-team: `components` uses `statusTone(...).text` for inline status
text, icons and indicator dots and retires its local `tone()` foreground, which
reads the solid `success`/`warning` fills as text (plan 057; owner: `components`).
`message.tsx` `callStatusColor` paints the solid `success`, `info` and
`destructive` roles as the tool-call status word on a `card`; light `success`
measures 4.540:1, clearing the 4.5:1 floor by 0.04, so an edited theme or a
copied platform style can erase a "done" label while `themeContrastFailures`
returns `[]`. `successText`/`infoText`/`destructiveText` are the roles held on
`card` (6.63:1, 8.42:1 and 7.21:1 in the identity light set).
`[ ]` Cross-team: `components` uses `destructiveText` for every error signal it
paints as text — the `FieldError` and `FieldLabel`'s required asterisk
(`field.tsx`), the `Form` error list (`form.tsx`), and the destructive Menu item
label (`menu/item.tsx`). The solid `destructive` is a fill: it measures 4.04–4.28:1
on the hover wash and 3.29–3.86:1 on the active wash across the shipped light
sets, under the 4.5:1 secondary floor, while `destructiveText` clears every
wash (≥5.28:1). The token contract checks `destructiveText` on
`background`/`card`/`popover` and, since plan 083, on the `hover`/`active`
washes the menu item paints. `primitives` paints the same fill as text through
`TEXT_TONES.destructive` (`src/core/style.ts`), so its `Text tone="destructive"`
and any icon taking that tone need `destructiveText` too (plan 079 audit; owner:
`components`, `primitives`)
`[ ]` Cross-team: `primitives` paints `primary` as text — the Link variant
(`src/core/variants.ts`, `foreground`) and the `primary` text tone
(`src/core/style.ts`, `TEXT_TONES`) — and `components` follows through its
`internal/theme.ts` seam. Both should read `primaryText`, which is held to the
text floor on every surface a link paints; the solid `primary` is a fill. The
old value fails on macOS and Linux (plan 082; owner: `primitives`, `components`)
`[ ]` Cross-team: `primitives` and `components` depend on `@gpuixui/tokens`
directly and delete their structural copies of the theme and role list, their
local focus-ring helpers (`primitives/src/core/style.ts`,
`components/src/internal/theme.ts`) and their first-shadow helpers
(`primitives/src/core/style.ts` `firstShadow`, `components/src/internal/theme.ts`
`elevation`), now that `focusRing` and `elevationShadow` exist and the package
resolves from source. `components` also deletes its local `DIAMETER`, `tone()`,
`withAlpha`, `HOVER_ALPHA` and borrowed `accent` pair: `avatarSize`,
`primaryHover` / `destructiveHover`, the soft status pairs, `alpha` and `info`
now ship in the package (owner: those workstreams; plans 014, 016–018, 054, 055)
`[ ]` Cross-team: `primitives` replaces the `useStep(…, 120)` / `useStep(…, 700)`
literals with `theme.motion.step` / `theme.motion.pulse`, and the Tier 2 overlay
components take enter/exit transitions from `motionTransition` (owner:
`primitives` and `components`; plan 019)
`[!]` Cross-team: `components` plan 112 builds Dialog/Popover on
`Dialog`/`DialogPortal`/`createPortal`. Published `@gpuix/react` 0.10.0 exports
none of them — only `FloatingLayer`/`floatingRootStyle`, the `<anchored>` host
element and `AnimatePresence`; `createPortal` is an unreleased changeset. The
layering rule and the no-portal limitation are documented in `docs/tokens.md`
(plan 050). Owner: `components`
`[ ]` Cross-team: `components` still carries a whole structural copy of the
package (`packages/components/packages/tokens/src`, plus a built `dist/`) — delete
it and import `@gpuixui/tokens` directly once the package is on `main` (owner:
`components`)
`[ ]` Cross-team: `docs-site` generates its type table from `textRoles` instead
of its local role array, so an eleventh role cannot be silently omitted (owner:
`docs-site`; plan 059)
`[ ]` Cross-team: `playground` deletes the `@gpuix/react/jsx-runtime` `paths`
mapping from `tsconfig.check.json` / `tsconfig.build.json`, now that the tokens
React entry carries no JSX (owner: `playground`; plan 061)
`[ ]` Cross-team: `playground` re-runs the theme gallery against the current
role set — the last green run predates the newest roles, and the newest
roles (the four `xText` roles, `primaryHover`/`destructiveHover` and
`primaryText`) are contrast-tested but not painted natively; the
`Design tokens` row then moves from `wip` to `done` (owner: `playground`; plans
150 and 082)
`[ ]` Cross-team: `LICENSES/adabraka-ui.md` (MIT, `Copyright (c) 2025 Adabraka
Team`, "token structure referenced, no assets copied") — plan 202 §7, not this
workstream's path. Owner: licensing
`[x]` Promoted plans 010–019 and 051 to `main` (`458fe10`), then merged `main`
back (plan 053) so motion tokens (019) and platform type styles (051) are one
branch; `main` compiles `@gpuixui/tokens` from source, so `primitives`,
`components` and `docs-site` can drop their structural copies
`[x]` Guard the loading skeleton on every canvas — Linux dark's `skeleton`
measured 1.004:1 on its card — join it to the surface floor and give each dark
platform style its own value (plan 078)
`[x]` Hold secondary text on the `hover`/`active`/`accent`/`selected` washes to
the contrast floors — macOS dark measured 4.41:1 and 3.55:1 (plan 079)
`[x]` Hold the control edge to the perceivability floor on the fills it paints —
the identity pressed wash and the dark secondary/accent fills were the same
value as `border`, so an outlined control lost its edge while pressed (plan 080)
`[x]` Hold the selection wash to the body floor on every surface a selected glyph
paints — high-contrast dark measured 6.48:1 on `hover` and 5.49:1 on `active`,
Linux dark 6.92:1 and Windows dark 6.84:1 on `active`; the three dark wash bases
moved and the selected row keeps the secondary floor (plan 081)
`[x]` Ship `primaryText` for brand-toned text, links and icons — `primary` is a
fill and was only measured as one, so macOS light's accent was 4.21:1 on its
canvas and macOS dark 2.84:1 on `active` while every suite stayed green; the
54th role is held on the six surfaces a link paints (plan 082)
`[x]` Hold status text on the state washes a row paints — a warning label in a
pressed row measured 4.22:1 on macOS light, 4.24:1 on Linux and 4.36:1 on
Windows, and high-contrast light 5.83:1 on `active`, under the floors; the four
tones join the four washes and the two warning steps move (plan 083)
`[x]` Hold the essential control boundary on the quiet panel and the state
washes — a checkbox edge in a pressed row measured 2.52:1 on macOS light, 2.62:1
on the identity and 4.15:1 at high-contrast dark; five values move one step
(plan 084)
`[x]` Make the documented elevation tint real — `colors.shadow` was never read,
so editing it in a copied platform style retinted nothing while three colour
strings duplicated the same value; a level is now geometry plus an alpha resolved
by `elevationShadow`, with `elevationShadows` for a compositing renderer, and
every shipped hex is unchanged (plan 085)
`[x]` Make the contrast contract total — five roles were silently unmeasured with
no stated exemption, and the focus ring missed the `muted` panel and the
`accent` wash a focused row paints; both are closed, and a new guard fails a role
that is neither measured nor argued (plan 086)
`[x]` Hold selected secondary text to its floor through the selection wash —
identity light measured 4.06:1 and identity dark 3.49:1 on a pressed row, and
seven shipped sets failed — and guard the wash's own perceivability so the fix
cannot erase the highlight; seven secondary greys move one step (plan 087)
`[x]` Hold default body text to the body floor on the quiet panel and the
floating surface — an avatar fallback's initials on `muted` and a date picker's
month header on `popover` painted with no pair behind them, which the role-level
completeness guard cannot see (plan 088)
`[x]` Make a density metric override expressible and true to its documentation —
`controlHeight` required all three sizes and the merge replaced the record, so a
theme that changed one control height lost the other two (plan 089)
`[x]` Hold the essential control boundary on the four soft status fills — the
identity dark `borderStrong` measured 2.77:1 on `successSoft`, 2.94:1 on
`destructiveSoft` and 2.97:1 on `infoSoft`, under the 3:1 floor, because a
checkbox or field edge can sit inside an Alert or Toast and plan 084 measured
the boundary only on the `muted` panel and the state washes; the four fills join
the `boundary` class and the identity dark edge moves to `#868FA0` (plan 092)
`[x]` Hold the focus ring on the four soft status fills — a toast's action
button is focused while it sits on `warningSoft` or `destructiveSoft`, but
`ringSoftPairs` now adds the four fills to the `boundary` class; every shipped
variant already cleared the floor, so no colour moves (plan 093)
`[x]` Hold the loading skeleton on the surfaces a loading row paints — seventeen
shipped pairs were under 1.05:1, ten exactly 1.000:1, because the identity and
high-contrast skeletons were the `active` fill; `muted`/`hover`/`active`/
`selected` join the `surface` class and seven skeletons move one ramp step
(plan 094)
`[x]` Hold the decorative `border` on the soft status fills — a divider inside
an Alert or Toast measured 1.015:1 on Windows dark, 1.023:1 on the identity
dark `successSoft`, 1.040:1 on identity dark `destructiveSoft` and 1.047:1 on
Linux dark, under the 1.05 divider floor; the four fills join the `divider`
class and the two dark soft fills move one step darker while keeping the surface
floor (plan 095)
`[x]` Close the last numbered union — `controlSizes` / `isControlSize` — so a
stored control size narrows through the package, and the two test files stop
retyping `"sm" | "md" | "lg"`; a preset-coverage test fails if a size joins the
index without a metric in every density preset (plan 096)
`[x]` Complete the filled-control state matrix — `primaryActive`,
`secondaryHover`, `secondaryActive` and `destructiveActive` — so a filled
control's hover and press are editable, measured fills instead of an alpha
composite over the backdrop; the neutral fill's fake hover measured 1.009:1 and
the light primary's press moved *lighter* than its hover (plan 097)
`[x]` Make the documented brand example a theme the contract accepts — it
inherited the dark `primaryForeground`, which measured 4.243:1 on the brand fill
under the 4.5:1 floor, while `docs/tokens.md` claimed
`themeContrastFailures(brandTheme)` was empty; a brand now moves its whole
primary family and a test holds the example to the checker (plan 098)
`[x]` Hold the modal scrim to the perceivability floor — `overlay` was exempt,
so high-contrast dark's `#000000CC` scrim composited to 1.000:1 on its pure black
canvas and the AAA dialog shipped an invisible backdrop; the scrim is now
measured over the four base surfaces and the AAA dark theme veils with 15% white
(plan 099)
`[x]` Hold the soft status surface on the quiet panel — a badge or Alert in a
sidebar inherited the pastel tints while the platform light styles changed
`muted`, so macOS measured 1.036:1, Linux 1.023:1 and Windows 1.043:1; the four
light tints move one small step and `muted` joins the surface pairs (plan 300)
`[x]` Make an applied platform style declare the contrast it carries —
`applyPlatformStyle(highBase, style, "default")` kept the base's `contrast:
"high"` claim and produced 46 checker failures; the returned declaration now
follows the palette, and a shape-only style keeps the base's level (plan 301)
`[x]` Give the soft status edge a designed `xSoftBorder` role — the 30% mixture
was unmeasured and measured 1.12:1 on the high-contrast light `warning` surface —
and hold it to the divider floor on its own fill (plan 090)
`[x]` Hold the selection wash inside a soft status surface — an Alert's text is
selectable, and identity light `successSoftForeground` measured 5.83:1 through
the wash while Windows dark's wash over `destructiveSoft` measured 1.005:1 — and
add the four soft fills to the selection contract (plan 091)
`[x]` Keep the platform-type helper additive for the merged primitives consumer
— `platformTheme(base, platform)` returns as a deprecated families-and-name-only
bridge, held to its pre-063 contract, after plan 063 deleted it while `master`'s
primitives runtime suite still imports it (plan 302)
`[x]` Guard the design-system ledger — the contrast row still called `overlay`
exempt after plan 099 measured it, and its pair counts, floor table, role/type
counts, motion levels/easings and platform count had no test while both prose
documents did (plan 303)
`[x]` Make `createTheme({ mode, contrast: "high" })` build on the AAA palette —
it only relabelled the default palette and the library's own checker rejected
the result (66 failures light, 32 dark); `contrast` now selects the base through
`getTheme` and the builder has no claim path (plan 304)
`[x]` Ship `themeModes` / `themeContrasts` as ordered indexes and derive the
unions and guards from them — the last two unions without an index, retyped in
sixteen test loops, so a third mode would have shipped untested (plan 305)
`[x]` Make the inactive state readable and shaped — a disabled `Select` item
painted `disabledForeground` on `popover` at 1.99:1 (Linux dark) and 2.26:1
(identity dark), the designed pair measured 2.09:1, `disabled` was exactly
`muted`/`hover`, and nothing held the edge; `inactive` is a 3:1 / 4.5:1 floor on
nine surfaces and `border` on `disabled`/`muted` joins the divider class
(plan 306)
`[x]` Hold the inactive label inside a status panel — an Alert's or Toast's
action can be disabled, but `disabledForeground` was measured on the nine
surfaces of plan 306, not the four soft status fills; the four pairs
(`inactiveSoftPairs`) already pass in every shipped set, so no colour moves and
an edited theme can no longer erase a disabled "Retry" (plan 307)
`[x]` Hold the soft status edge where a chip is actually painted — plan 300
declined a fill pair on a row wash because the designed `xSoftBorder` is the
shape, but the edge was measured only on its own fill, so the macOS light
warning edge measured 1.036:1 and the Linux light one 1.042:1 on their pressed
washes and a warning Badge there had no visible boundary at all; the four edges
are divider pairs on the eight surfaces a chip sits on (plan 308)
`[x]` Hold every interactive fill to the surface it paints on — the identity
light `muted`/`hover`/`secondary` were the same value, the identity dark `hover`
was its `muted` and `popover`, macOS light `selected` measured 1.021:1 on its
canvas, Linux light `accent` 1.001:1 on the panel and the AAA dark `accent`
1.034:1; `stateFillSurfacePairs` adds the 13 fills on the four surfaces (180 →
232 pairs), the light quiet panel moves one step toward the card and the failing
accents one step (plan 309)
`[x]` Hold the copy-and-own platform example to the contract it teaches — it
moved only `primary` and `primaryHover`, inherited the Windows dark black
foreground onto a `#005A9E` fill and measured 2.96:1 on the fill and 2.12:1 on
the hover, while only the brand example ran the checker; both platform examples
now share one Contoso primary family, the authored style names the whole family,
and both are held to `themeContrastFailures` in both modes (plan 310)
`[ ]` Cross-team: `primitives` and `components` replace `opacity: 0.5` disabled
dimming with the designed `disabled` / `disabledForeground` pair plus the
`border` edge — an alpha composite makes the label's readability depend on the
surface behind it (a disabled primary action measures 2.25:1 on the light canvas)
and the `Select` item already paints the role (plan 306; owner: those
workstreams)
`[ ]` Cross-team: `primitives` and `components` read `xHover`/`xActive` for
filled controls and delete the `filled()` alpha helper, `withAlpha` and
`HOVER_ALPHA` — the six roles are measured and platform-specific now (plan 097;
owner: those workstreams)
`[ ]` Cross-team: `components/internal/button.tsx` and
`primitives/src/core/variants.ts` replace the alpha hover/press — `alpha(fill,
0.5)` in `components` (whose comment still claims tokens ship no `primaryHover`)
and `alpha(fill, 0.9/0.8)` in `primitives` — with `filledControl(theme, family)`
or the four roles directly. The label was designed for the opaque fill: the
primary label measures **2.06:1** at 50% (Linux light, card) and **3.40:1** at
80%, destructive **2.24:1** / **3.75:1** (identity light), under the 4.5:1
on-colour floor every designed step clears (plan 338; owner: `components`,
`primitives`)
`[ ]` Cross-team: `primitives` reads `accentHover`/`accentActive` for a toggle
that is on and deletes the `alpha(accent, 0.9/0.8)` hover and press in
`packages/primitives/src/core/variants.ts` (`togglePressedBase`); the two roles
are designed, platform-specific and measured in both modes now, and the outlined
toggle's `border` edge is held on both (plan 327; owner: `primitives`)
`[ ]` Cross-team: `primitives` renders a loading `Button` with an invisible
indicator — `Button.tsx` draws `<Spinner size={theme.iconSize.sm} />` inside the
control, and `core/loading.ts` `spinnerDotStyle` paints the lit dot with the
spinner's default `accent: "primary"` and the trail with `mutedForeground`.
Inside a filled action neither is readable: on a primary button the lit dot is
`primary` on `primary` (**1.000:1** in every set) and the trail measures
**1.100:1** (identity dark) to **2.166:1** (macOS dark); on a destructive button
the default accent is still `primary`, which measures **1.002:1** (Windows light)
to **1.290:1** (identity dark) on the fill, and the trail 1.173–2.023:1 — all
under the 3:1 mark floor. The indicator already carries its motion in per-dot
`opacity`, so it can paint `filledControl(theme, family).foreground` for both the
lit dot and the trail, or take an explicit tone the caller passes; a spinner on a
plain surface keeps `primary` (plan 332's mark pairs). `IconButton` inherits the
same paint through `Button`. Owner: `primitives`; found while auditing plan 345.
`[ ]` Cross-team: `primitives` paints the value indicator's groove with
`theme.colors.track` — `progressTrackStyle` and `sliderRailStyle` still use
`muted`, a surface role; identity dark's `muted` is its `popover` and every
platform dark style's is its card and popover, all at 1.000:1, so an
indeterminate `Progress` (only a track, zero-width fill) paints nothing on a
dark card. The role and its contract ship in plan 347 (owner: `primitives`)
`[ ]` Cross-team: `components` gives the neutral Badge, the Stepper's upcoming
marker and the TagInput chip a visible fill — `badge.tsx`, `stepper.tsx` and
`tag-input.tsx` paint `muted` behind `mutedForeground`, but `muted` is a surface
role: on the identity light theme it measures 1.036:1 on `background`, 1.027:1
on `card`, and 1.000:1 on the `muted` panel it sits on again, so the pill has no
shape. The TagInput chip is the clearest case: it paints on the field's own
`background` and, unlike the Badge, carries no `border` edge at all.
`secondary`/`secondaryForeground` is the designed neutral fill and clears
the surface floor on all four panels (1.064–1.133:1), or the chip can keep
`muted` and paint the designed `border` edge (owner: `components`; found while
auditing plans 328 and 338)
`[ ]` Cross-team: `components` gives the selected `Tabs` trigger a perceivable
fill in the high-contrast light theme — `tabs.tsx` paints
`backgroundColor: theme.colors.card` on the list's `theme.colors.background`,
and both roles are `#FFFFFF` at AAA light, so the selected tab measures
**1.000:1** and the only other signal is the label (`foreground` vs
`mutedForeground`, 1.27:1), under the 3:1 non-text floor. The designed
`accent`/`selected` fills (1.27:1 on that canvas) join
`stateFillSurfacePairs`, or the trigger can paint a `borderStrong` edge; the
AAA dark set already clears the floor at 1.08:1. A `card`-on-`background` pair
is deliberately not added to the contract: a raised card is carried by its
border in the AAA palettes, and the tabs trigger is the composition that paints
no border (owner: `components`; found while auditing plan 338)
`[ ]` Cross-team: `primitives` and `components` read the old elevation shape —
`theme.elevation.md[0].color` in `core/style.test.ts` and their theme fixtures —
and must use `elevationShadow(theme, level).color`; a custom level is now
`{ …geometry, alpha }` (owner: those workstreams; plan 085)
`[ ]` Cross-team: `primitives` paints Tooltip and Select with
`elevation: "overlay"` — the reserved, empty level — so `elevationShadow`
returns `undefined` and both floating surfaces ship with no shadow, against the
design system's "`md` for menus, popovers and tooltips"
(`src/components/Tooltip.tsx:77`, `src/components/Select.tsx:112`; the
`core/style.test.ts` case asserts the empty result instead of a shadow). They
should read `"md"` and the test should assert the shadow (owner: `primitives`;
plan 060 reserved the level; verified against this branch's `elevationShadow`)
`[ ]` Cross-team: `primitives` migrates off the deprecated `platformTheme`
bridge — its `runtime/theme-axes.runtime.test.tsx` imports it and
`docs/theme-provider.mdx` teaches it; both move to `getPlatformTheme(platform,
mode)` and the bridge is then deleted from tokens (owner: `primitives`; plan 302)
`[ ]` Cross-team: `primitives` updates its theme fixture to this branch's token
generation — `src/core/testing/theme.fixture.ts` still declares the 47-role
palette (66 ship now, `track` included), an elevation level as `{ …, color }`
(it is `{ …, alpha }` since plan 085) and a `Theme` without `contrast`, `motion`
or `avatarSize`, so it cannot type-check against the merged package (owner:
`primitives`; plans 019, 054, 073, 085, 302, 347)
`[x]` Ship component dimensions — the fixed surface metrics components still
hardcode: overlay min/default width and scroll height, field minimum and
adornment, chip minimum, toast width and the preview-card range — as
`theme.dimensions`, merged field by field, inherited by every platform variant
and recipe, documented and guarded (plan 353)
`[ ]` Cross-team: `components` reads `theme.dimensions` for its overlay widths
and scroll height, toast width, preview-card range, field minimum, chip minimum
and field adornment instead of the literals in plan 353 §1, settling the
16px/18px adornment split on `fieldAdornmentSize` (owner: `components`; plan
353)
`[ ]` Cross-team: `primitives` reads `theme.dimensions.fieldAdornmentSize` for a
field's clear or search glyph where it paints one (owner: `primitives`; plan
353)
`[ ]` Cross-team: `components` settles two fixed surface metrics that plan 353's
audit table missed on the merged tree — `popover.tsx` gives an overlay a 200px
minimum where the token set has `overlayMinWidth` 180 / `overlayWidth` 220, and
`combobox.tsx` scrolls its list at 280px where `overlayMaxHeight` is 320. Either
read the existing token (the 16px/18px adornment split set the precedent for
settling an outlier on the token) or record the compact overlay as a new
dimension if it is a real concept; do not leave the literal (owner:
`components`; plan 353 audit, re-checked on the merged tree)
`[ ]` Cross-team: the integration owner promotes the reconciled commit to `main`
so the shared `TODO.md`, `COMPONENTS.md` and plan index carry the tokens rows,
and retires the now-redundant `agent/tokens-platform` worktree (its branch is
`main`; `agent/tokens-theme` is the union); this agent was instructed not to push
`main`
`[x]` Close the numeric contract's last two ungoverned members — a probe on the
shipped light theme found `themeMetricFailures` returning `[]` for
`elevation.md[0].offsetX = NaN` (while `elevationShadow` handed the renderer an
unpaintable shadow) and for `controlHeight.md = 40` over the shipped
`rowHeight = 32`, which clips every default control inside a list, table, menu or
tree row; a `finite` rule now governs both offsets, the blur and the spread
(negative offsets stay valid) and `rowHeight` is held to `controlHeight.md`
beside the body-line rule, with no shipped value moving (plan 360)
`[x]` Hold the pill radius to the largest avatar — `radius.full` was bounded by
the largest control (18), but `components/avatar.tsx` paints the 40px
`avatarSize.lg` disc with `full`, so a `full` of 18 or 19 satisfied the checker
and still left the avatar a rounded square while both contracts returned `[]`;
a third bound, `avatarSize.lg / 2`, sits beside the control bound (plan 361)
`[x]` Hold a status panel's selected body and caption — plans 320 and 346 made
`foreground` (an `AlertDescription`, a ghost dismiss control) and
`mutedForeground` (a caption) first-class on the four soft fills, but the
selection contract measured only the tone's `xSoftForeground` through the wash,
so a reader who copied an alert's description had no pair behind it and an
edited theme could erase it while `themeContrastFailures` returned `[]`;
`selectionSoftPairs` grows 4 → 12, every shipped set passes (7.26:1 identity
dark body and 4.78:1 Aero light caption at the tightest), so no colour moves,
and accent-toned text stays the documented omission (plan 362)
`[x]` Hold the card's own text role through a text selection — a card carries the
default `foreground` a `CardTitle` paints and its own `cardForeground`, which a
context menu trigger sets on its `card` fill, but `selectionPairs` named only the
default role, so card text readable at rest could lose its floor under the wash
while `themeContrastFailures` returned `[]`; the two roles are apart in both
Windows recipes, `selectionPairs` grows 18 → 19, every shipped set passes
(Windows dark 9.07:1 at the tightest) and no colour moves (plan 363)
`[x]` Complete the numeric contract's motion group — the timings' ladders checked
the sign but not finiteness, and `motion.ease` was never read, so `pulse:
Infinity`, `ease.enter: [NaN, 0, 0, 1]` and `ease.standard: [2, 0, 0, 1]` all
returned `[]` while the runtime's `validate_seconds`/`validate_ease` reject the
whole transition; every timing now takes `finite` and each bezier tuple is held
to four finite control points with both x values inside `0…1` (y may overshoot),
with no shipped value moving (plan 364)
`[x]` Hold the overlay scroll height to one row — `dimensions.overlayMaxHeight`
was only checked for being positive, so `20` against a `32` row returned `[]`
while every menu and combobox list scrolled in a viewport shorter than one
option; the bound is the active `density.rowHeight`, so a compact theme lowers it
and every shipped 320 still passes (plan 365)

## Phase C — Tier 1–2 components

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Tier 1 foundational components (code + test + example + docs + inventory)
`[ ]` Tier 2 composition/feedback components (same bar)
`[ ]` Verify every component in both themes

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

## Phase G — release readiness

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Clean-environment install and public-export checks
`[ ]` Licence inventory and attribution complete
`[ ]` All gates green (`nub run check`, `nub run lint`, `nub run test`)

## Swarm-owned blockers (fix these)

- **B1** GPUix native bindings fail to install (blocks the playground + every native smoke test).
- **B2** No durable scheduler — the swarm runs on a detached daemon; launchd and cron do not fire here.

Both are specified in `~/GPUIXUI/BLOCKERS.md`; each fix starts with a plan under
`.agents/slop/plans/`.

- **Docs: platform toggle (macOS / Linux / Windows / Default)** — every component preview switches platform style; the styles are real editable token themes in packages/tokens, not docs-only CSS (see MISSION.md).
