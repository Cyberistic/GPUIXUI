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
`[ ]` Cross-team: `scripts/verify-two-directions.sh` is written against `jj`
(`jj workspace root`, `jj diff`, `jj restore`) while PLAN.md D1 pins git, so
the mandated both-directions check cannot run on these worktrees; give it a git
implementation (owner: repo tooling; found while landing plan 550)

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

`[x]` `[████████░░]` 305/381

`[x]` Write and index the tokens/theme plan set (every row the plan index
assigns to this workstream)
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
`[x]` Hold the Default platform variant to the identity's mono — it carried the
literal `Menlo`, so on Linux and Windows `applyPlatformStyle(base,
platformStyles.default)` named a macOS-only family while
`getPlatformTheme("default", mode)` returned `DejaVu Sans Mono` / `Consolas`;
`platformMonos` now owns the installed families, `systemMonoFamily` derives from
it, the Default style carries the running platform's family, and simulated
Linux/Windows cases prove every path agrees (plan 678)
`[x]` Add the design-system rows to `COMPONENTS.md`
`[x]` Hold the Toast's tone on its floating card — it paints its glyph and 3px
bar with `xSoftForeground` on `popover`, which the contract measured only on its
own soft fill, so an edited theme could erase a toast's tone while the checker
returned `[]`; every shipped set passes (11.98:1 at the tightest), so no colour
moves and the contract grows 333 → 337 (plan 348)
`[x]` Give the invalid focus ring a resolver — `invalidRingPairs` publishes the
`destructive` ring an error field shows and the runtime can draw only one ring,
but every other measured state had a one-call helper while this one had none, so
a consumer had to spread `focusRing` and replace its colour (`primitives`
`controlFocusStyle` does exactly that); `invalidFocusRing(theme)` shares the
valid ring's geometry and paints `destructive`, the Focus sections name it and
an executed example paints a failed field's edge and ring (plan 679)
`[x]` Hold the two JSDoc check ordinals to `themeChecks` — `themeRingFailures`
said "the tenth check" and `themeNativeTextFailures` "the ninth", counting the
order the checks were *added*, while the public index, the reference and the
README count the composition order (`ring` fifth, `nativeText` seventh), so the
hover text on two public functions named a position the package's own index
contradicts; `check-ordinals.test.ts` reads every source claim and fails on a
wrong ordinal, an undeclared function or a missing word, the two sentences name
their function first, and the reference names the guard; no colour, pair, floor,
metric or shipped theme moves (plan 681)
`[x]` Give the caret's nine surfaces their two owners — `nativeFieldTheme`'s
JSDoc credited `caretPairs` with publishing all nine, but it publishes the one
`mark` pair on the field's `input` fill; the other eight are the
`primaryTextPairs` text pairs, as the `contrast.ts` JSDoc and the README already
said. The sentence now names both lists, and `native-field-caret.test.ts`
derives the eight non-mark pairs and the one mark pair and holds them to its
nine-surface list, so the sentence cannot credit one pair with nine again; no
colour, pair, floor, metric or shipped theme moves (plan 682)
`[x]` Count the chip surfaces plan 651 grew — `chipSurfaces` holds nine with the
pressed `selectedActive`, and the two reference documents say nine, but three
source JSDoc sentences and the package README still said eight and enumerated the
four washes without the pressed fill, so a reader counted a complete-looking list
that was missing the row the plan added. All four current-state sentences say
nine, the README names `selectedActive`, and `soft-edge-surfaces.test.ts` derives
the nine from `softBorderSurfacePairs` and holds the prose to it; the two
historical “eight” mentions in `COMPONENTS.md` describe plans 308 and 399 and
stay. No colour, pair, floor, metric or shipped theme moves (plan 683)
`[ ]` Cross-team: `primitives` calls `invalidFocusRing(theme)` in
`controlFocusStyle` instead of spreading `focusRing` and replacing
`boxShadow.color`, so the invalid ring has one owner (owner: `primitives`; plan
679)
`[ ]` Cross-team: the root `README.md` still says “Phase A … No implementation
work starts before those plans exist” while tokens, primitives, components,
the docs shell and the playground have shipped; its Status section is the first
thing a reader sees and now contradicts `TODO.md` (owner: repo tooling; found
while landing plan 679)
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
`[x]` Publish the selectable row's press step — a `List` row hovers `accent`
and presses `active`, but the contract measured only `hover` → `active` and
`accent` → `selected`; identity dark (1.004:1) and XP light (1.019:1) changed hue
but not luminance while `themeFailures` returned `[]`. `rowPressStepPairs`
publishes `active`/`accent` under the `step` class, the two `active` values move
one designed step (`#2A303B` → `#2E3543`, `#DDD7BE` → `#D8D2B7`), and every
shipped set clears 1.05:1 (Windows 7 light 1.059:1 at the tightest);
`contrastPairs` grows 420 → 421, no other value moves (plan 619)
`[x]` Hold the fixed surfaces to their own chrome — `toastWidth`,
`notificationPanelWidth` and `overlayMinWidth` were only positive (or only
ordered against their sibling), so a theme could set a toast narrower than its
padding, tone icon and title, or an overlay narrower than a menu row's insets,
icon and label, while `themeMetricFailures` returned `[]`; three `at-least`
rules now read the theme's own spacing, icon and type metrics, every shipped set
clears them (380/320/180 against 66/50/53 at the shipped identity) and no value
moves (plan 620)
`[ ]` Cross-team: `components` moves the secondary Button off the mixed
`secondary` → `hover` → `active` ladder — `internal/button.tsx` rests on
`secondary` and hovers to `hover`, and the pair is under the 1.05:1 step floor in
23 of 24 shipped sets and the *same value* in 19 (identity light and both AAA
sets, macOS light and dark, Linux dark, Windows dark, the XP/Aero dark halves
and the `default` variants), so the shipped secondary control has no hover state
there; use `secondaryHover`/`secondaryActive`, the designed family plan 097
shipped and plan 334 already holds the label on (plan 357; owner: `components`)
`[x]` Resolved by the token palette, no consumer change: a selectable `List`
row's press stays `active`, and `rowPressStepPairs` now holds it one 1.05:1 step
from the `accent` hover; identity dark and XP light moved their `active` one
designed step (1.004:1 → 1.073:1 and 1.019:1 → 1.071:1, Windows 7 light the
tightest shipped at 1.059:1). `accentActive` is a filled control's press, not a
row fill: on macOS dark a row label measures 6.677:1 on it, under the 7:1 body
floor, so the migration the old row proposed is withdrawn (plan 619; owner:
`tokens-theme`)
`[x]` Make every source `@example` a copyable module — the snippet guard's
import case skipped a block with no import as a contextual continuation, so 14
of the package's 44 JSDoc blocks called the API with no import and five painted
with an undeclared `theme` while `snippets.test.ts` stayed green; every block
now imports what it calls and declares its theme with `getTheme`, and the new
case names every block that stops being copyable (plan 655)
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
indicator (plan 342 audit; owner: `primitives`). The designed on-fill focus
indicator is `insetFocusRing(theme, family)` — the family's on-colour at
`borderWidth.strong` (plan 609)
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
`[ ]` Cross-team: `components` paints the Notification centre's unread dot with
the accent ink, not the fill — `notification-centre.tsx:833` marks an unread row
with a 6px `primary` dot, and the row's own states take the dot onto the
`active` pressed wash and the `accent` fill: macOS dark's `primary` measures
**2.836:1** on `active` and **2.748:1** on `selected`, under the 3:1 mark floor,
so a pressed or selected unread notification loses its dot. `primaryText` — the
accent's readable ink — clears the same surfaces at 5.587:1 and 5.675:1 at the
tightest, and the text contract already holds it on all four row washes; this is
the care plan 557 applied to the native field, one glyph over (plan 332's mark
list; owner: `components`; found while auditing plan 585)
`[ ]` Cross-team: `components` moves the menu checkbox item's check glyph off
`accent` — `menu/item.tsx:286` paints `theme.colors.accent` on the menu's
`popover` (1.11–1.39:1) and on the `hover`/`active` row fill (1.00–1.08:1),
under the 3:1 mark floor, so a checked item has no visible check; `accent` is a
wash, not a glyph. `menu/radio.tsx:168` repeats it for `MenuRadioItem`'s selected
dot, which is a 6px `spacing.sm` circle in the same role on the same surfaces, so
a chosen radio option has no visible mark. Use `popoverForeground` — the row's
own text role, already measured on `popover`/`hover`/`active`/`selected` — or
`primaryText` when the mark should stay brand-toned; both clear the mark floor
where `accent` does not (plan 339; owner: `components`; radio found while
auditing plan 389)
`[ ]` Cross-team: `components` gives the ColorPicker's selected swatch a visible
ring — `color-picker.tsx:161` paints the selection ring in `theme.colors.foreground`
on the swatch's own fill, and the six default swatches are `primary`, `secondary`,
`accent`, `muted`, `destructive` and `foreground`, so the ring measures
**1.000:1** on the `foreground` swatch in every theme and 1.56–2.98:1 on
`primary`/`destructive` in most sets, under the 3:1 mark floor. Paint the two
tones from `contrastRing(theme)` — the `background` inner tone as the border and
the `foreground` outer tone as a zero-blur spread shadow, as
`packages/tokens/src/contrast-ring.example.ts` does — which guarantees
`sqrt(contrast(foreground, background))` against any swatch (3.70:1 at the
tightest shipped set) and is held by `themeRingFailures` — or a
`primaryForeground` check glyph on the swatch; no
single palette role can guarantee contrast with a user-supplied colour (plan 389
audit; token half shipped in plan 611; owner: `components`)
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
`[ ]` Cross-team: `components` paints the Toast countdown's 2px groove with
`theme.colors.track` and its bar with `statusTone(theme, tone).text` —
`toast/viewport.tsx:230` paints `muted` on a `popover` card, which is the same
value in the identity dark theme and every default-contrast platform and recipe
dark set (**1.000:1**), so the unfilled remainder has no shape; `track` is the
designed groove (`trackSurfacePairs`, **1.069:1** at the tightest on `popover`,
Windows dark) and `xText` is the readable tone the plan-348 row already asks for.
Copy `countdownStyle` from `packages/tokens/src/toast-countdown.example.ts`
(owner: `components`; plan 603)
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
`[ ]` Cross-team: `docs-site` moves the toggle's URL state to the package codec —
`themeChoiceFromParams`/`themeChoiceParams`/`themeChoiceKeys` — so a shared link
carries the mode, contrast, recipe and density the toggle resolves, not only
`platform`, and the clear-then-set pattern stops a stale axis; its local
`platformNames`, `isPlatformName`, `platformFromParams` and
`applyPlatformToSearch` are deleted. The docs-site platform parser reads one of
five axes and retypes the union (owner: `docs-site`; plan 529)
`[ ]` Cross-team: `docs-site` calls `themeFailures(theme)` on the Theming page,
so the copy-and-own path it teaches holds an edited theme to the colour, contrast
and metric checks in one assertion instead of two of the three, and `isHexColor`
is named for a single stored role (owner: `docs-site`; plans 371 and 383)
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
(`field.tsx`), the shared `ErrorSummary` block (`internal/error-summary.tsx`,
painted by both `form.tsx` and `multi-step-form.tsx`), and the destructive Menu
item label (`menu/item.tsx`). The solid `destructive` is a fill: it measures 4.04–4.28:1
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
`[ ]` Cross-team: `primitives` unifies its theme provider with
`@gpuixui/tokens/react` — its README still says the two contexts will merge
"when `@gpuixui/tokens/react` is consumable without a JSX shim", but plan 061
removed the package's only JSX and a consumer-shaped type check guards it, so
the stated blocker is gone. `ThemeProvider` still keeps a second context with no
fallback while `components` reads the tokens context (which falls back to the
light theme), so an app composing both must mount both; either `primitives`
reads the tokens context (layering its density override and native-focus
tracker) or the nesting is documented as permanent. The docs site already
mounts both; the README's parenthetical is now false (owner: `primitives`; plan
061)
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
`border` edge — GPUI composites an element and its children as one group, so the
label dims with its own fill: a filled primary action's label measures
**1.575:1** on the identity light canvas and **1.468:1** at worst (Linux light, a
card), a disabled field's typed text **3.273:1** on the macOS light `input`
fill, and the `Select` item already paints the role; paint
`disabledControl(theme)`, which returns the three properties (plans 306, 539 and
605; owner: those workstreams). The `TagInput` chip dims at `0.6`
(`tag-input.tsx:286`) and `InlineEdit` at `0.5` (`inline-edit.tsx:242`), so both
take the same designed pair.
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
and scroll height, toast width and tone bar width, preview-card range, field
minimum, chip minimum and field adornment instead of the literals in plan 353
§1, settling the 16px/18px adornment split on `fieldAdornmentSize` (owner:
`components`; plans 353 and 636)
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
`[ ]` Cross-team: `components`, `docs-site`, `playground` and `primitives`
retire the interlock rows in their own `TODO.md` that still call shipped token
work pending — the avatar diameter scale (`avatarSize`, plan 054), the designed
`primaryHover`/`destructiveHover` roles (plan 055), `alpha` and the `info`
family (plan 014) and the `@gpuixui/tokens` JSX-runtime shim (plan 061 removed
the package's only JSX). All five are on this branch; the stale rows invite the
next agent to redo work that exists (owner: those workstreams)
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
`[x]` Hold the status label through a text selection — `xText` is the role for a
status label, icon or dot on the four washes a row paints (plan 083), but no
pair measured it through the composited `selection` wash, so XP light
`successText` measured **3.671:1** on `active`, Aero light 3.721:1 on `selected`
and every high-contrast light tone 6.12–6.72:1 under 7:1 while
`themeContrastFailures` returned `[]`; `selectionStatusPairs` adds the four tones
on the nine surfaces (36 pairs), the six light status roles move one designed
half-step, every shipped set passes (4.661:1 XP light `infoText` on `active`,
7.370:1 at AAA) and the plain 338 pairs do not move (plan 366)
`[x]` Hold the type scale to its two documented ladders — `themeMetricFailures`
checked a role's size was positive and its leading long enough, but the prose
(`display` → `caption`) and code (`code` → `codeBlock`) ladders and the
`bodyStrong` weight variant lived only in `typography.test.ts` as two local
arrays over the shipped constant, so an edited theme rendered `h1` below `h2`,
`codeBlock` above `code`, or emphasis `bodyStrong` at body's weight while both
checkers returned `[]`; the ladders are now exported as `proseLadder` /
`codeLadder`, the contract holds each `non-decreasing` and `bodyStrong` no
smaller and heavier than `body`, and no shipped value moves (plan 367)
`[x]` Hold every numeric metric to finiteness — `finite` covered elevation
geometry (plan 360) and motion (plan 364) but the other eight groups accepted
`Infinity`: a ladder's last step has no successor, so `spacing["5xl"]`,
`radius.full`, `borderWidth.strong`, `iconSize.xl`, `density.rowHeight`,
`dimensions.toastWidth` and an infinite display size returned `[]` while the
renderer casts each to `f32::INFINITY` and paints invalid layout silently; one
`finiteMembers` pass now walks every numeric member of those eight groups and no
shipped value moves (plan 368)
`[x]` Govern a defined `elevation.overlay` — the elevation rule walked `sm`,
`md` and `lg` and exempted `overlay` as "reserved and empty", which is true of
the shipped data but not of the type or the runtime: `extendTheme` replaces a
level's array and `elevationShadow` paints it, so a defined overlay entry with
`offsetX: NaN` and `alpha: 2` returned `[]` from both checkers while the
renderer received an unpaintable shadow with an opaque tint; the loop now walks
all four levels, an empty level stays exempt, and every shipped set ships an
empty overlay so no value moves (plan 369)
`[x]` Make a type weight a governed number — `FontWeight` was the four shipped
literals, so a brand could not name the `450` or `800` its installed family
provides, and `themeMetricFailures` never read the member: `NaN`, `0`, `-1` and
`1001` returned `[]` on eight roles while `textStyle` handed each to the
renderer, so the contract's "every numeric member is finite" sentence was false;
the type is now a CSS number in `1…1000`, every role's weight takes a
`weighable` rule (finite, at-least 1, at-most 1000), and the four shipped
weights are unchanged (plan 370)
`[x]` Hold every colour role to the hex form the token maths parses — `shadow`
is a tint read by `alpha()` rather than a contrast pair, and `alpha` returns an
unparseable value unchanged, so a copied theme with `shadow: "black"` painted a
**fully opaque** shadow at every level (0.08, 0.12 and 0.16 gone) while
`themeContrastFailures` and `themeMetricFailures` both returned `[]`, against the
design-system's claim that tests restrict roles to hex; `isHexColor` publishes
the predicate, `themeColorFailures` names every role outside the form, all 24
shipped sets pass, and no colour moves (plan 371)
`[x]` Hold the named icon and avatar sizes to a positive size, and give the nine
metric rules the ordered index their type index row never had — a zero `xs` was
a non-decreasing ladder that passed all three checks while the glyph or avatar
painted a 0×0 box, and the `MetricRule` row named `ladder`, `fit` and `fraction`,
none of which the contract emits; `metricRules` derives the union, the two size
ladders take a `positive` step rule, and the row is guarded (plan 372)
`[x]` Make a forced default palette whole — `applyPlatformStyle(highBase, style,
"default")` replaced only the roles a style names, so the returned theme declared
`default` while it still carried the AAA soft tints and border: the library's own
checker rejected four shipped combinations (light macOS 1.0248:1, Linux light
1.0162:1, Windows light 1.0133:1/1.0215:1, Linux dark 1.0346–1.0375:1). Asking
for a level now replaces the palette as a set, taking the unnamed roles from the
default-level identity of the same mode; a same-level base keeps its edits and a
style still overrides only what it names, so no token value moves (plan 373)
`[x]` Make a platform style own its dark soft destructive tint — applying macOS
dark, Windows dark, XP or Aero over a Linux dark theme kept Linux's
`destructiveSoft` (`#3A0B0D`, plan 091) on the new canvas, measuring **1.0005:1**
on macOS dark's background and 1.0448:1 on Windows', under the 1.05:1 surface
floor, so the documented call produced an invisible Alert; the two dark sets now
name the identity tint they already paint, no shipped pixel moves, and
`platform-composition.test.ts` holds every shipped base × style pair to all
three checks in both modes, both contrasts and both requested levels
(plan 374)
`[x]` Hold the modal scrim over the filled actions and status panels a window
shows — it covered the layout only (`background`, `card`, `muted`, `input`,
`selected`, `popover`), so a theme whose scrim composited to `primary` or to a
soft status fill left a control or Alert undimmed while the checker returned
`[]`; the four resting filled actions and the four soft status panels join
`overlaySurfaces` (6 → 14 scrim pairs), every shipped set already clears the
1.05:1 floor (1.075:1 at the tightest, AAA dark on `primary`), so no colour
moves (plan 375)
`[x]` Hold the design-system's elevation paragraph to the contract — §7 still
said the scrim covers six surfaces after plan 375 grew it to fourteen, and called
a level "exactly one shadow" while `Elevation` is a list and `elevationShadows`
resolves it; §7 now names all fourteen surfaces and the pointer-state exclusion,
`docs.test.ts` holds each member to `overlaySurfaces` and the level description to
the two helpers, and no token, colour, pair or floor moves (plan 376)
`[x]` Pin the design-system's current figures — the §9 scrim paragraph quoted
1.075:1 (high-contrast dark, `overlay` on `primary`) and the AAA wash-link cost
(6.75:1 on `muted`, 5.48:1 on `active`) with no test, so a palette edit could
leave the page quoting a ratio the package no longer produces while every pair
passed; both are now derived from the 24 shipped sets and no value moves
(plan 377)
`[x]` Hold the token-input chip to the chrome inside it — `dimensions.chipMinWidth`
was only positive, so a chip of 10 passed every check while its content box
(`10 − 2 × spacing.sm`) was negative and could hold neither its caption label
nor its remove control; plan 384 declined the half on the false rationale that
the chip's padding has no token (it is `spacing.sm`). The chip's own minimum now
holds two `spacing.sm` insets, one `caption` glyph, the `spacing.xs` gap and the
`fieldAdornmentSize` remove control, the shipped 80 clears the 44 bound, and
`chip-chrome-fit.test.ts` states the erased-chip regression (plan 667)
`[x]` Give the numeric scales their ordered indexes — a docs table had to cast
`Object.keys(spacing)` back to a key type, the unsafe cast `textRoles` exists to
avoid, and `metricMembers` kept six of the same domains as a second list.
`spacingSteps`, `radiusSteps`, `borderWidthSteps`, `iconSizeSteps`,
`avatarSizeSteps`, `dimensionNames` and `paletteRamps` are typed `keyof` their
scale and documented in the docs-site section; `metricMembers` derives from them,
`scale-indexes.example.ts` builds every table with no cast, and
`scale-indexes.test.ts` fails when a scale gains a member without its index
(plan 668)
`[x]` Hold the metric-member index's documented owner — plan 668 moved
`metricMembers` onto the typed scale indexes, but §*Numeric metrics* still said
"each group's default object" and named `dimensions` (the object) rather than
`dimensionNames`, so a reader building a diagnostics table would write the
`Object.keys` cast 668 removed; the paragraph now names all eleven indexes and a
`docs.test.ts` case fails if one is dropped or the old phrase returns (plan 669)
`[x]` Link every executed example from a consumer document — plan 350 fixed
`primary-text.example.ts` for having "no test importing it and no document
linking it", but its guard enforced only the import, so thirteen examples
(`accent-states`, `control-padding`, `disabled-wash`, `filled-control`,
`font-weights`, `inline-avatar`, `inline-icon`, `motion-levels`,
`native-highlight`, `persisted-choices`, `scale-indexes`, `selection-press`,
`status-panel`) were linked from neither the catalogue, the design system nor the
README; each now sits in the section it belongs to, and `examples.test.ts` fails
on an unlinked example or a link with no file (plan 670)
`[x]` Hold the invalid focus ring on a pressed selected row — plan 651 gave a
chosen row its `selectedActive` press and both documents listed the invalid ring
on "the same surfaces" as `ring`, but `invalidRingPairs` predates that surface,
so a theme whose `destructive` measured **1.0596:1** on light `selectedActive`
cleared the chip's 1.05:1 floor and the boundary check returned `[]` while the
error ring vanished; the pair joins `invalidRingPairs`, every shipped set already
passes (3.761:1 at the tightest, XP light), and the contract grows 460 → 461
(plan 671)
`[x]` Name the pressed row among the link's surfaces — plan 651 changed the
catalogue's "eight surfaces a link paints" to "nine" when it added
`primaryText` on `selectedActive`, but the sentence still enumerated eight, and
the two `primaryText` role-table use cells, the *Brand action* paragraph and the
package README repeated the omission while the design-system guard stayed green.
All five now name the pressed row, and a derived `docs.test.ts` case reads the
nine at-rest surfaces from `contrastPairs` and holds each passage to them; no
token value, pair, floor or metric moves (plan 672)
`[x]` Give the interaction ladders an ordered index — `stateLadders` was the one
interaction catalogue with no typed owner, and every prose surface that retyped
it had drifted one plan behind: `DirectionFailure.ladder` named five of the six
ladders after plan 622 added `rowPress`, `themeDirectionFailures`' JSDoc named
five of the six step-pair lists after plan 651 added
`selectionPressStepPairs`, and the README omitted the selected row's press
entirely. `stateLadderNames` and `StateLadderName` now own the order, both
fields narrow to the union, a copyable `state-ladder-index.example.ts` groups a
theme's failures by ladder, and `direction-reference.test.ts` derives the step
lists from `contrast.ts` and holds the source paragraphs, both pages and the
README to them; no colour, pair, floor, metric or shipped theme moves
(plan 673)
`[x]` Hold the pressed selected row in the rest of the documentation —
`selectionPressPairs` has measured `disabledForeground` on `selectedActive` at
the inactive floor and `border` on it at the divider floor since plan 651, and
the selected row's label tier gained its fifth shared fill, but the §8
`disabled` row, the §9 inactive-label and divider rows, the catalogue's
Verification and tier paragraphs and the README still stopped at the persistent
washes (the tier paragraph even counted four fills while the design system said
five). The `disabled` state row's derived guard read only
`inactivePairs`/`selectionInactivePairs`, and both §9 rows were hand-typed
strings. The prose names the pressed row now, `docs.test.ts` derives every
`disabledForeground` surface, `disabled-press-surfaces.test.ts` derives both
floor rows and every tier count, and `disabledRowStyle` paints the composition
in the executed example; no colour, pair, floor, metric or shipped theme moves
(plan 674)
`[ ]` Cross-team: `components` gives the Carousel's inactive indicator a mark
role — `carousel.tsx:382` paints the dot with `theme.colors.border` on the
canvas, and `border` on `background` is a *divider* pair (1.05:1): it measures
**1.310:1** (Windows light) to 1.865:1 (macOS dark) in every default set, under
the 3:1 mark floor, so an inactive slide has no visible indicator (the AAA sets
clear it at 6.525:1, where the mark floor is 4.5:1). `borderStrong`, the
functional boundary, clears it at 3.953:1 (identity light) on the same canvas and
is already a mark-floor role there (plan 332; owner: `components`).
`[ ]` Cross-team: `components` keeps the DatePicker's "today" ring visible on a
selected day — `date-picker.tsx:630-641` paints `borderColor: primary` on a cell
whose fill is also `primary` when selected, so the ring composites to
**1.000:1** and only the today signal disappears (the fill and
`primaryForeground` still show selection). Paint the selected cell's ring with
`insetFocusRing(theme, "primary")` — the family's on-colour at
`borderWidth.strong` (plan 609) — and keep `primary` on the `popover` at rest;
`primary` on `popover`/`hover` is already a mark pair (plan 341; owner:
`components`).
`[ ]` Cross-team: `components` keeps a selected `List` row's fill under the
pointer — `list.tsx:772` paints `hover: { backgroundColor: accent }` on every
focusable row and `:778` sets `backgroundColor: selected` when selected, so the
hover style replaces the persistent selection; now that plan 381 separates the
two roles (they were the same value in the identity, macOS light and three more
sets), a selected row visibly falls back to the unselected hover wash while the
pointer is over it. Do not paint the unselected hover wash over a selected row:
keep `selected` under hover and paint the designed `selectedActive` on press, a
24% canvas veil that previews deselection one measured step toward the canvas
(`selectionPressStepPairs`), instead of the unselected `active` wash (owner:
`components`; plans 381 and 651).
`[ ]` Cross-team: `components` gives a notification's open row a persistent state —
`notification-centre.tsx` paints the open item with `accent` (the hover wash),
replaces it with `hover`/`active` while the pointer is over the row, and rings it
with `focusRing` whenever it is open rather than when it holds focus, so the row
being read loses the only cue that it is open as soon as the pointer crosses it,
an open row looks focused when it is not, and a selected row of the same component
would use `selected` where this one uses a transient wash. Paint the open row with
`selected` and `selectedForeground` (or keep `foreground` for its title), keep
that fill through hover and press as the `List` row must, and paint the ring from
the row's focus state; the unread dot's `primary` on `accent`/`hover`/`active` is
already recorded (plan 585) (owner: `components`; found while auditing plan 611).
`[x]` Resolve a persisted theme choice in one place — the package owned the
mode, contrast, platform, recipe and density axes and a guard for each, but not
their composition, so every settings screen retyped the precedence; a stored
density must beat the platform's preset (macOS is `compact`), a recipe must beat
a stray platform key, and an unknown density must keep the resolved preset
rather than a hardcoded `comfortable`. `resolveThemeChoice(choice)` composes the
shipped resolvers behind the existing guards, and every shipped combination is
held to the three checks (plan 380)
`[x]` Make the selected row a perceivable step from the hover wash — a
selectable `List` row paints `accent` under the pointer and `selected` once
chosen, and the two roles were the same fill in the identity (both modes and
both contrasts) and macOS light and under the 1.05:1 floor on Windows light,
macOS dark and XP light, so hovering one row looked like selecting another and
the click changed nothing; `selectionStepPairs` publishes the step, eight shipped
sets move `selected` one designed step, macOS light's `selectedForeground` moves
with its deeper fill, every shipped set and both executed examples still pass
all three checks, and the consumer composition is cross-team (plan 381)
`[x]` Hold the accent family's text selection on its filled action — both
fill-selection lists were hand-typed with three of the four shipped families, so
selecting the label on an `accent` fill was unmeasured; with `accent` derived
from `filledControlFamilies` the label measured **4.140:1** on macOS light and
**4.430:1** on Linux dark through the veil, under the 4.5:1 floor, so the two
accent foregrounds move one designed step and the two lists publish eight pairs
(plan 382)
`[x]` Ship one total check for an edited theme — the guarantee is three checks
(colour format, contrast, metrics) and each is total over its own domain, but a
consumer running the contrast check alone accepted a theme with no focus ring or
an opaque `shadow` tint; `themeFailures(theme, contrast)` composes all three into
one tagged list, the docs and README teach one assertion, and the docs-site
interlock now names it (plan 383)
`[x]` Hold the three fit rules to the content box — an icon, a field adornment
and a chip were compared to the **outer** metric (`iconSize.md ≤
controlHeight.sm`, `fieldAdornmentSize ≤ controlHeight.sm`, `chipMinWidth ≤
fieldMinWidth`), so an adornment or icon equal to the control height (a 24px
glyph in a 22px content box) and a chip equal to the field width (80px in a
68px content box at `fieldMinWidth: 90`) returned `[]` while the chrome painted
inside the box overflowed it; the three rules now subtract the control's or
field's two borders and, for the chip, the field's horizontal
`controlPaddingX.md` padding, every shipped set still fits (16 in 24/28/32; 80
in 200) so no value moves, and four new cases fail without the bounds (plan 384)
`[x]` Hold a copied theme's family names to the form the runtime reads — the
docs state that GPUix 0.10.0's `StyleDesc.fontFamily` is one string, so a family
is never a CSS comma stack, but that was held only for the shipped
`platformTypes` table: `sans: "Inter, system-ui, sans-serif"`, `""` and `"   "`
all returned `[]` from the colour, contrast and metric checks, so every label
painted the system fallback while the guarantee said the theme was good;
`themeTypefaceFailures` is the fourth check, `themeFailures` composes it in
colour → typeface → contrast → metric order, and every shipped set passes, so no
family moves (plan 385)
`[x]` Hold the smallest field to a body line — `controlHeight.sm` was held to
one label line while `fieldTextStyle` and `otpCellStyle` paint the body role in
the same box, so a theme with a 30px body line returned `[]` from every check
while a 26px content box clipped a small field (plan 386)
`[x]` Enumerate the shipped themes in one place — the package owned each axis
and resolver but not their composition, so the surfaces that said "every shipped
set" enumerated 4, 20, 24 and 28 (identity repeated through an unfiltered
`platformNames`) and the README quoted a sixth number; `shippedThemes` and
`platformVariants` derive from the axis owners, the three suites that claimed
the full set enumerate them, and the reference, README and ledger state the
derived count (plan 387)
`[x]` Migrate the remaining token suites' hand-built shipped lists to
`shippedThemes` where the case claims "every shipped set" — plan 387 moved
`contrast`, `theme-check` and `metrics`; sixty-five other suites built their own
matrix (some at one contrast level, some with `realPlatforms` retyped), so a
future recipe or platform could be silently omitted. Every full-set claim now
maps the enumeration and labels a set with `theme.name`, and a guard in
`shipped-themes.test.ts` fails a claiming suite that rebuilds its own list
(plan 388)
`[x]` Let a copied platform style own its whole look — `PlatformStyle.structure`
now carries type roles, spacing, border widths, icon/avatar sizes and component
dimensions beside radii, density and motion, applied at both contrast levels and
merged field by field; every shipped style omits them, so no resolved value
moves, and `platform-extension.example.ts` is the complete copyable file
(plan 389)
`[x]` Hold the elevation levels to their ladder — `sm` → `md` → `lg` is an
increasing height in the design system, but `themeMetricFailures` compared only
one level's range, so a `lg` set to the `sm` feather (or a 0px feather) returned
`[]` and a dialog sat closer to the surface than a resting card; the painted
entry's `blurRadius` must now be non-decreasing, opacity stays a design (a
fainter large shadow and a flat theme pass), every shipped set passes and no
value moves, and both docs pages, the README and the ledger state the rule
(plan 390)
`[x]` Hold the published contrast reference to the contract it describes —
`themeContrastFailures`' JSDoc restated surfaces and families instead of naming
its lists and had gone false twice: "the nine surfaces a disabled control paints"
after `inactiveSurfaces` grew to thirteen, and the inverse veil "measured on
`primary`, `secondary` and `destructive`" after plan 382 added `accent`; the
paragraph now names the nine lists it applies plus `filledControlFamilies` and
`themeColorFailures`, states no count, and `contrast-reference.test.ts` fails if
a list loses its name, a family literal returns or a count is restated (plan 391)
`[x]` Hold the text tiers to their hierarchy — secondary text below body copy,
and an unavailable label and a field's hint below secondary text, were documented
in the design system and asserted on the shipped themes at one surface each, while
every public check enforced only minimums: setting `disabledForeground` to
`foreground`, `mutedForeground` to `foreground` or `placeholder` to `foreground`
returned `[]` from `themeFailures` while a disabled control looked enabled and a
caption looked like body copy; `themeTextTierFailures` is the fifth check,
`textTiers` is the ordered list, its surfaces derive from `contrastPairs`, every
shipped set and composed style clears the 1.05:1 step (1.274 / 1.349 / 1.440 at
the tightest) so no colour, pair or metric moves (plan 392)
`[x]` Hold the loading pulse's dim frame — `Skeleton` paints the role at
`skeletonPulseOpacity` (0.6) for half of every cycle and the contract measured
only the opaque value, so identity dark's `#3D4552` on `selected` measured
1.058:1 opaque and **1.008:1** at 60% while `themeContrastFailures` returned
`[]`; `skeletonPulsePairs` composites the frame on the same eight surfaces,
`ContrastFailure` carries the fraction as `opacity`, and the dark skeleton moves
a half-step to `#434C5A` (1.074:1 dim, 1.179:1 opaque) so no other value moves
(plan 393)
`[x]` Give an action inside a soft status panel a designed fill — the canvas
`hover`/`active`/`secondary` fills cannot be perceived on a tone tint: 80 of the
288 shipped fill-on-tint pairs measured under 1.05:1, the worst Windows light
`active` on `destructiveSoft` at **1.0042:1**, so an Alert's ghost dismiss
control had no press state and the documented "Try again" action had no fill
while `themeContrastFailures` returned `[]`; `softAction`,
`softActionHover`, `softActionActive` and `softActionForeground` are the raised
family (66 → 70 roles), `softAction(theme)` resolves it in one call, and
`softActionPairs`/`softActionStepPairs`/`softActionLabelPairs` hold it to the
surface, step, secondary and body floors in all 24 shipped sets (339 → 360
pairs) with no colour moving (plan 394)
`[ ]` Cross-team: `components` paints an action inside a tone-tinted Alert with
`softAction(theme)` — `AlertDescription`'s documented `<Button>Try again</Button>`
and `AlertDismiss` paint the canvas-tuned `secondary` →
`hover` → `active` ladder, which measures 1.0102:1 (Windows dark) to
**1.0042:1** (Windows light `active` on `destructiveSoft`) against the tint, so
the action's press and the filled action's rest have no visible shape; the raised
family and `softActionForeground` are measured on every shipped set in both
modes. The **Toast's** action keeps the canvas neutral family
(`filledControl(theme, "secondary")`): its card is `popover`, where `softAction`
equals the card in every light shipped set (**1.0000:1**), so the raised family
would lose its rest shape (plan 394, scope corrected by plan 397; owner:
`components`)
`[x]` Hold the modal scrim over the panel action — plan 394 made `softAction` a
resting fill a window shows, but `overlaySurfaces` still named only the four
`primary`/`secondary`/`accent`/`destructive` actions and the four soft panels,
so a scrim that composited to the Alert's "Try again" button left it undimmed
while `themeContrastFailures` returned `[]`; the fill joins the scrim contract
(14 → 15 pairs), every shipped set already clears 1.05:1 (1.5519:1 at the
tightest, AAA dark) and the plain 360 pairs do not move (plan 395)
`[x]` Hold the type index's counts and weight claims — plan 394 moved the palette
66 → 70 roles but the `ThemeColors` row and the colour-format paragraph still
said 66, and both the `FontWeight` row and the Typography prose claimed a shipped
`700` no type role uses (the shipped weights are 400, 500 and 600); the counts,
the weight set and the avatar/icon ranges are now derived from `colorRoles`,
`textRoles`, `motion`, `typography`, `avatarSize` and `iconSize` (plan 396)
`[ ]` Cross-team: `primitives` paints a clipped ButtonGroup's focus ring as an
inset border in `ring` on the button's own fill (`core/style.ts`
`clippedFocusRingStyle`, `Button.tsx`, `ButtonGroup.tsx`), and `ring` is
**1.000:1** on `primary` in sixteen shipped sets — both identity dark themes,
every platform light half, the dark half of Linux, Windows, XP and Aero, and
every AAA dark half — so a focused primary button in an attached group has no
focus indicator; paint it with `insetFocusRing(theme, family)` — the family's
on-colour at `borderWidth.strong`, the measured inset ring (plan 609) — or keep
the outer shadow, then the tokens contract can hold `ring` on the filled families
at the boundary floor (owner: `primitives`; found while auditing the contrast
contract for plan 393)
`[x]` Hold the panel action's scope — the reference, the design system, the
README and the JSDoc offered `softAction` to "an Alert, Badge or Toast", but a
Toast is a `popover` card (`toast/viewport.tsx:100`) and `softAction` equals that
card in all 12 light shipped sets (**1.0000:1** in eleven, 1.0190:1 in XP), so
following the guidance produced an invisible rest fill while the checker returned
`[]`; the prose now names a tone-tinted Alert or Badge, the Toast action keeps the
measured canvas neutral family on `popover`, and a guard fails if the phrase
returns or a document loses the distinction. No colour or pair moves (plan 397)
`[x]` Give the five checks an owner — `themeChecks` indexes the kinds and
`ThemeFailureKind` derives from it, so `applied-palette`, `theme-choice` and
`platform-composition` can no longer run a hand-built subset: they ran 3, 3 and 4
of the 5 checks, so a composed theme whose only defect was a CSS family stack or
an inverted text tier passed a case titled "all checks"; the three suites now
ask `themeFailures`, the documents build the guarantee's count from the index
instead of retyping "five", and a docs guard fails on "all three/four checks"
(plan 398)
`[x]` Hold the solid status fill like the fill it is and resolve it in one call —
the documents publish a `Solid fill` column, `ThemeColors.success` is "success
background and indicator" and the design system offers "its solid role for a
fill", but only the on-colour foreground was measured: `stateFillSurfacePairs`
holds the *interactive* fills, and a status chip is not interactive, so a copied
theme whose status fill equalled its card erased a solid chip while all five
checks returned `[]`. `statusTone(theme, tone).solid` now returns the fill and
its on-colour, and `statusFillPairs` holds the four fills to the 1.05:1 surface
floor on the eight surfaces a chip sits on (28 pairs — `destructive`'s four base
surfaces are already the action fill's; 360 → 388), every shipped set passes
(1.262:1 at the tightest, XP light `warning` on `selected`) and no colour moves.
The mark story is unchanged: a status dot or label is `xText`, not the solid fill
(plan 399)

`[x]` Hold the text hierarchy on each surface's *own* body role — `textTiers`
compared `mutedForeground` (and `placeholder`, `disabledForeground`) against the
default `foreground` on every shared surface, but a card, menu and field paint
their own body role (`cardForeground`, `popoverForeground`, `inputForeground`).
A theme that sets `popoverForeground` to its `mutedForeground` therefore renders
every menu label at secondary strength while all five checks returned `[]`; the
three roles were never the brighter tier. The three tiers are now in `textTiers`
(they pass in every shipped set at 1.274:1, so no colour moves),
`selectedForeground` is documented as deliberately not a body tier (it is a
secondary-strength tint; a selected row's title is `foreground`), and the total
check reports it (plan 500)
`[x]` Hold the accessibility floor table's modal scrim row to the contract —
plan 395 added the raised action a status panel carries (`softAction`) to
`overlaySurfaces` and updated §7, the catalogue and the README, but the §9 row
still named fourteen surfaces and the explanation said "fifteen" while listing
fourteen; the exact-row array never included the scrim row and the pair-class
map sends `surface` to the interactive-fill row, so nothing read it. The row and
the explanation now name all fifteen, and two cases derive their members, count
word and floor cells from `overlaySurfaces` and `contrastFloors` (plan 501)
`[x]` Publish the direction of a pointer ladder — the step pairs measured only
the distance, so a copied light theme whose `primaryHover` and `primaryActive`
were *lighter* than `primary` (the plan 097 defect) cleared the 1.05:1 step, the
on-colour floor and every surface pair while `themeFailures` returned `[]`;
`stateLadders` names the four filled families, the panel action, the wash and
the selected step, `themeDirectionFailures` reports a step that moves toward the
canvas, `relativeLuminance` publishes the comparison, and the sixth check kind
`direction` joins `themeChecks` between `hierarchy` and `metric`; an equal pair
stays the step lists' defect and every shipped set already steps the expected
way, so no colour moves (plan 502)
`[x]` Hold the value indicator's groove on the row washes and status panels —
`track` was measured on the six resting surfaces, but an indeterminate progress
bar is only its groove and a slider's rail is the value the pointer is about to
change, so macOS light measured 1.020:1 on `active`, XP light 1.030:1 on `hover`
and 1.007–1.020:1 on the four soft fills, identity light 1.009:1 on
`destructiveSoft`, identity dark 1.019:1 on `infoSoft` and every AAA dark set
1.047:1 on `active`; `trackSurfacePairs` now covers twelve surfaces (388 → 394),
seven values move one designed step and XP light names its own Luna green as the
progress mark, because the inherited identity green is what made the palette
appear infeasible (plan 503)

`[x]` Hold a solid status chip's and the panel action's text selection — a
solid `info`/`success`/`warning` chip carries its own on-colour and so does
`softAction`, but both lists derived from the four *interactive* families, so
the accent-tinted wash had no pair on any of them and measured under 1.05:1 on
eleven shipped chip compositions (worst 1.011:1, Windows light `info`) and on
the AAA dark `softAction` (1.047:1); `selectionFillRoles` now owns the eight
opaque fills, both lists derive from it (4 + 4 → 8 + 8), the AAA dark
`softAction` moves one step darker (`#3A414D` → `#343B47`) so its white label
keeps 7:1 through the veil (7.165:1) while clearing 1.071:1 on every AAA soft
tint, and `statusSolidStyles` paints the veil (plan 504)
`[x]` Hold the elevation tint on the AAA dark canvas — every high-contrast
dark set shipped `shadow: #000000` over `background: #000000`, so
`elevationShadow` resolved `sm`/`md`/`lg` to **1.000:1** on the canvas (and
`sm` to 1.031:1 on the card) while `docs/design-system.md` §7 said the AAA
modal was separated by "a light wash, its own edge and elevation", and no
contract pair measured `shadow` (plan 371 covered only its hex form); the set
now paints with light (`#FFFFFF`) and carries its own alphas
(`highContrastDarkElevation`, 10/14/18%), `elevationSurfaces` publishes the
four surfaces a raised element floats over, and `themeContrastFailures`
composites every defined level at its own alpha over them, reporting the level
and the fraction. At high contrast a platform style now contributes the
level's geometry while the AAA opacity stays with its tint, so a dark
platform's 0.4–0.8 never paints a near-white halo over the light AAA set. Every
shipped set passes (1.061:1 identity dark at the tightest); the AAA dark set
moves from 1.000:1 to 1.207:1 and the branch's three gates are green (plan 505)
`[x]` Hold a selected row's title through the text-selection wash — plan `312`
established that `ListItemTitle` paints `foreground` on `selected` while the
inherited label keeps `selectedForeground`, but only the second was measured
through the wash, so identity dark **6.480:1**, Linux dark 6.648:1 and the
Windows palette 6.908:1 sat under the 7:1 body floor while the checker returned
`[]`; `selectionPairs` gains `foreground` on `selected` (19 → 20), the identity
wash moves to 14%, the Windows/XP/Aero wash to 33% (its soft `destructiveSoft`
highlight still clears 1.071:1) and Linux dark's selected fill one step to
`#27476A`, so the titles measure 7.144 / 7.389 / 7.164:1 with every wash
perceivable and no light or high-contrast value moving (plan 506)
`[x]` Hold the dialog's face on the scrim — `overlayWashPairs` measured the
scrim against everything it covers, but nothing measured the element on it: a
dialog, drawer or command palette paints `popover` over the scrim, so a theme
whose `overlay` composites to its own `popover` shipped a dialog with no face and
only a 1px edge while every check returned `[]`. The shadow cannot be that
separation in the default dark sets — the identity dark `lg` tint paints
**1.035:1** over the `#060709` scrim and pure black reaches only **1.042:1** —
and the content fills are inside the band the scrim compresses the page into
(macOS dark's face meets a scrimmed `primary` at **1.021:1**, where its `border`
carries the silhouette at 1.495:1; raising the scrim to 70% clears `primary` at
1.077:1 but collapses `destructive` to 1.019:1). `dialogSurfacePairs` measures
`popover` over the composited `overlay` on the six page layout surfaces, every
shipped set already clears 1.05:1 (1.210:1 at the tightest) and no colour moves
(plan 507)
`[x]` Hold the solid status chip on the scrim — a Badge's `info`/`success`/
`warning` chip is resting content a dialog opens over, and plan 375's scrim list
named the action families and the soft panels but not the three solid chips plan
399 made first-class fills and plan 504 made selection surfaces; a scrim that
composited to one of them left the Badge undimmed while every check returned
`[]`. The three join `overlaySurfaces` (15 → 18 scrim pairs), every shipped set
already clears 1.05:1 (1.060:1 at the tightest, high-contrast dark `info`), the
checker's new tightest is that pair, and no colour moves (plan 508)
`[x]` Hold the elevation shadow over the two persistent surfaces a raised element
opens over — `elevationSurfaces` named the canvas, a card, the quiet panel and a
floating surface, so a context menu or preview card over a selected row and a
popover flipped above its trigger's `input` fill had no shadow pair while the
checker returned `[]`; the list now derives from the six page layout surfaces
(twelve → eighteen painted pairs), every shipped set already clears 1.05:1
(1.109:1 at the tightest, macOS dark `sm` on `input`), no colour moves and
`contrastPairs` stays 394 (plan 509)
`[x]` Hold an unavailable label through the text-selection wash — `disabledForeground`
was measured on the thirteen surfaces it paints at rest but never through the
inherited `selectionColor`, so a selected disabled label measured **2.586:1** on
Windows light's `selected` fill, 2.604–2.945:1 on the other default light sets
and 3.430 / 4.357:1 in the AAA sets while all six checks returned `[]`;
`selectionInactivePairs` adds the washed pair on each of the thirteen
`inactiveSurfaces`, three values move one designed step away from the panel
(`#6E7787` → `#545D6C`, `#5A5A5A` → `#444444`, `#A9A9A9` → `#B0B0B0`) and every
shipped set passes at 3.177:1 or better (4.722:1 at AAA), with `contrastPairs`
staying 394 (plan 510)
`[x]` Own the native field's caret — the pinned editor reads exactly one field
from its `theme` prop (`caret`), but the package shipped no value, so a field
kept the runtime's built-in dark `#7C86FF`: **3.129:1** on the AAA light `input`
and **2.795:1** on its quiet panel, under the 4.5:1 mark floor, while every
check returned `[]`. `nativeFieldTheme(theme)` returns the prop from the accent,
which `markPairs` already holds on the `input` fill and the four `Surface` tones,
so no role is duplicated and a copied style follows its own accent (plan 511)
`[x]` Hold the panel action's label through the text-selection wash — plan 394
moved a ghost action to `softActionForeground` but `selectionSoftPairs` still
measured only the `foreground` its description paints, so identity light with
`softActionForeground: "#444444"` measured 7.35:1 at rest and **5.685:1**
through the wash on `destructiveSoft` while every check returned `[]`; the four
soft fills join the list (12 → 16), every shipped set clears 8.667:1 at the
tightest so no colour moves, and the stale `softAction` JSDoc that still
recommended the canvas washes is corrected (plan 512)
`[x]` Hold the inverse veil's pointer-state gap and its stale rationale — a
filled control's label can be selected while its fill steps to
`xHover`/`xActive`, and at the shipped 15% veil **60 of the 360** filled-family
label pairs miss the on-colour floor (worst **3.353:1**, macOS dark
`accentActive`, 20 of 24 sets) while no single neutral alpha clears both that
floor and the 1.05:1 veil floor on the AAA light set; the state fills stay out
of `selectionFillRoles`, the documents state the gap and recommend
`userSelect: "none"` on a control's chrome, and the role's JSDoc no longer says
"fourteen" or that the AAA dark `softAction` measures 1.047:1 (it is 1.574:1
after plan 504); no colour, pair or floor moves (plan 513)
`[x]` Hold the disabled action inside a status panel — a raised action kept no
disabled state, and the canvas `disabled` fill is not a panel shape (1.0066:1 on
XP light's `warningSoft`), so it keeps the resting `softAction` fill and paints
`disabledForeground` (identity dark 5.148:1, AAA dark 7.310:1, after plan 520 moved the dark value), while `textTiers`
holds that label a step below `softActionForeground` (2.156:1 at the tightest);
`contrastPairs` grows 394 → 395 and no colour moves (plan 514)
`[x]` Hold the focus ring on the value groove — a focused slider's shadow is
painted around a thumb centred on the rail, so its arcs land on `track`, but the
ring was measured only on the plain surfaces, the washes and the soft fills;
identity light `#7567F2` measured **2.983:1** on the light groove, under the 3:1
boundary floor, while every other set passed. The identity light ring moves one
ramp step to `#4C39B5` (5.802:1 on the groove, and every existing ring pair
gains contrast), `ringTrackPairs` publishes the pair and `contrastPairs` grows
395 → 396 (plan 516)
`[x]` Hold the keycap's fixed surface to its caption line — `Keycap` paints the
caption role inside the literals `minWidth: 20, height: 20`, so a copied theme
that raised the caption leading clipped every shortcut label while
`themeMetricFailures` returned `[]`; `dimensions.keycapSize` is the fixed
surface (20px, inherited by every shipped theme, platform variant and recipe)
and the metric contract holds it to one `caption` line plus its two borders
(plan 517)
`[x]` Ship `fontWeights`, the ascending weight set the shipped type scale uses,
derived from the roles, and correct the two surfaces that still claimed four —
the public `FontWeight` JSDoc named a `700` no role uses and
`docs/design-system.md` said “The four weights” while the catalogue said three;
a new guard holds both sentences and a stale literal, and the executed font
manifest is the copyable list a bundler loads (plan 518)
`[x]` Ship `motionLevels` and `motionPhases` as the ordered owners of the motion
scale, derive `MotionLevel`/`MotionPhase` from them, and move the two docs
suites off `Object.keys(motion)` — a `string[]` that would adopt a new field
before the documents did; a completeness guard fails a timing or phase added
without the index (plan 519)
`[ ]` Cross-team: `components` reads `theme.dimensions.keycapSize` for the
keycap's `minWidth` and `height` instead of the 20px literals in
`keyboard-shortcuts.tsx` (owner: `components`; plan 517)
`[ ]` Cross-team: `primitives` passes `nativeFieldTheme(theme)` to every native
`<input>`/`<textarea>` it renders, so a field's caret follows the theme instead
of the runtime's built-in dark value (owner: `primitives`; plan 511)
`[ ]` Cross-team: `primitives` `controlStyle` and `components`
`internal/button.tsx` set `userSelect: "none"` on a filled control's chrome, so
its label is not selectable while the fill is `xHover`/`xActive`, where the 15%
veil measures **60 of 360** label pairs under the on-colour floor (worst
3.353:1, macOS dark `accentActive`) and no neutral alpha holds both floors at
AAA light (owner: those workstreams; plan 513)
`[ ]` Cross-team: `components` paints a disabled action inside a tone-tinted
Alert or Badge with the resting `softAction` fill and `disabledForeground`, not
the canvas `disabled` fill (1.0066:1 on XP light's `warningSoft`) and not a
pointer step; a ghost disabled action keeps no fill. The resting pair and the
enabled/disabled step ship in plan 514 (owner: `components`)
`[x]` Hold the disabled panel action through the inverse selection veil —
`inactivePanelActionPairs` measures its resting label and `selectionFillPairs`
the enabled one, but no pair measured `disabledForeground` through the
`selectionOnFill` veil over `softAction`; identity dark measured **2.799:1** and
AAA dark **3.304:1** there, under the inactive floor, while every check returned
`[]`. `selectionFillInactivePairs` publishes the composition, the two dark
`disabledForeground` values move one designed step (`#B0B8C6`, `#D0D0D0`), and
every shipped set passes (plan 520)
`[x]` Hold an inline icon to its line box — `iconSize` was a positive,
non-decreasing ladder, but `scale.ts` describes `xs` as inline with a caption and
`sm` with a label and the design system says inline icons "do not raise the line
box"; a theme with `iconSize.xs` 17, or with a tighter `caption.lineHeight`,
returned `[]` from every check while a caption line grew to hold the glyph. Two
`at-most` rules bound the inline sizes by the theme's own leading; every shipped
set passes and no value moves (plan 521)

`[x]` Hold an inline avatar to the dense row it leads — `scale.ts` calls
`avatarSize.xs` the inline tier and `ListItem` fixes a dense row at
`density.rowHeight` with its leading slot documented for an avatar, but the
contract never compared them; a theme whose whole avatar ladder rose to
40/44/48/52 returned `[]` from all six checks while the 40px mark could not fit
a 28–32px row. One `at-most` rule bounds `xs` by the theme's own row; the other
three tiers stay unbounded because `md` in a dense row is a composition
decision, not a size error. Every shipped set passes and no value moves
(plan 522)

`[x]` Hold a control's horizontal padding to a paint — `controlPaddingX` was the
only density metric with no floor: `extendTheme(light, { density: {
controlPaddingX: { sm: 0, md: 0, lg: 0 } } })` returned `[]` from all six checks
while every labelled control painted its glyph on its own border. The ladder now
asks for `positive` and each size is `atLeast` the theme's own hairline
(`spacing["2xs"]`); every shipped set ships 6–14px, so no value moves (plan 523)
`[x]` Hold the selection wash on the unavailable control's fill — plan `510`
measures `disabledForeground` through the paint on the `disabled` fill, but
`selectionWashPairs` measured the wash only on the nine `selectionSurfaces` and
the four soft fills, so a theme whose `selection` equalled its `disabled`
returned `[]` for the composition while the highlight was gone; the pair joins
the list (9 → 10 wash pairs) and every shipped set already clears the 1.05:1
floor (1.125:1 at the tightest, high-contrast dark), so no colour moves (plan 524)
`[x]` Hold the row's own text through a text selection — `selectionPairs`
assumed one body role per surface, so a menu row's `popoverForeground` on the
`hover`/`active`/`selected` washes and a selected row's inherited
`selectedForeground` on `hover`/`active`/`accent` were measured at rest but
never through the composited wash; high-contrast light's inherited label
measured **6.693:1** on the pressed row, under 7:1, in all six AAA light sets
while every check returned `[]`. The role moves one iris step to `#1C1547`
(8.533:1 at the tightest of its four fills), the six pairs join the list
(20 → 26), and every shipped set passes (4.898:1 macOS light at the tightest)
(plan 525)
`[x]` Hold the dialog's face over the content a window shows — plan 507 measured
`popover` over the scrim on the six layout surfaces only, so macOS dark's face
met its own `primary` action at **1.021:1** and the `border` it was said to rely
on measures **1.006:1** on a scrimmed `success` chip, under the divider floor,
while every check returned `[]`; `dialogSurfacePairs` derives from
`overlaySurfaces` (6 → 18 pairs), the macOS dark scrim deepens to 82%
(`#000000D0`) so every shipped face clears 1.05:1 (1.079:1 at the tightest), the
executed brand example owns its 85% scrim after the inherited one left its face
at 1.038:1, and the documents stop naming the 1.495:1 edge as the carrier
(plan 526)

`[x]` Hold a field's typed text and hint on the row washes an in-place editor
paints — plan 317 excluded “a field on a row wash”, but `InlineEdit` swaps a
row's text for a field in place and the shipped `placeholder` missed its floor on
at least one wash in all twenty-four sets (identity dark **3.132:1** on
`selected`, macOS light 3.714:1 on `active`, Windows dark 3.939:1, XP light
3.877:1, and both AAA palettes under 7:1 at 5.665:1 and 5.009:1) while
`themeContrastFailures` returned `[]`; `inputForeground` and `placeholder` join
the four washes (396 → 404 pairs), fourteen shipped hints move one designed step
(identity dark `#858F9F` → `#A8B0BD`, AAA light `#4A4F58` → `#3D4047`, AAA dark
`#B0B0B0` → `#D1D1D1`), every shipped set passes (4.651:1 at the tightest, Linux
dark on `active`; 7.113:1 at AAA) and the hint stays 1.157:1 below
`mutedForeground` at the tightest (plan 527)
`[x]` Hold a brand-toned link through the text-selection wash — `primaryText` is
a text role, and a link in a paragraph, row or Alert is selected with the copy
around it, but the selection contract called it “the one deliberate omission”
(plan 087) while twelve of the twenty-four shipped sets missed their floor: AAA
light **5.376:1** on `destructiveSoft` under 7:1, macOS dark 3.708:1 on
`selected`, Windows light 3.995:1, XP light 4.378:1, Aero light 4.022:1, macOS
light 4.106:1 and Linux dark 4.485:1, all under 4.5:1, while every check
returned `[]`; `selectionLinkPairs` adds thirteen pairs (nine surfaces + the
four soft fills), seven values move one designed step inside their own families
(AAA light `#3B2C8F` → `#241C5C`, macOS `#0055B3` → `#004A9A` / `#64B5FF` →
`#96CDFF`, Linux dark `#99C1F1` → `#A5CBF5`, Windows light `#005BA1` →
`#004F8A`, XP `#0046BD` → `#003FA8`, Aero `#0F55A3` → `#0C4A8C`), every
shipped set passes (4.729:1 at the tightest, Windows dark; 7.484:1 at AAA) and
the plain 404 pairs do not move (plan 528)
`[x]` Own the shareable theme choice — `ThemeChoice` documented “a shareable
URL” but nothing read or wrote one, so every consumer retyped the five keys and
the docs platform toggle parsed only `platform` while plan 380's recipe,
contrast and density axes had no URL form at all; `themeChoiceFromParams`,
`themeChoiceParams` and `themeChoiceKeys` decode through the existing guards,
write only the axes whose absence would change the theme (a recipe suppresses
the platform it overrides, a stored density is always written because the
platform supplies the preset), and the exported key order is the clear list that
stops a stale axis surviving; the full matrix round-trips through a real
`URLSearchParams` and `contrastPairs` stays 404 (plan 529)
`[x]` Ship the fixed surface metrics plan 353 left in consumers — the drawer's
320/400/560 width and 240/320/420 height triples, the 160px message viewport and
the carousel's 18/8 mark were still literals in `packages/components`, so no
theme or copied `PlatformStyle` could own them and the numeric contract could
not report a broken one; `theme.dimensions` gains the nine fields with two
increasing drawer ladders, a viewport floor of one `density.rowHeight`, a
carousel floor of its idle dot and a runnable copy-and-own example, with no
colour, pair, floor or existing metric moving (plan 530)
`[x]` Hold the numeric contract's "every numeric member is finite" claim — the
finite pass was a hand-maintained list per group, so plan 530 had to add
nine `Dimensions` members by hand and the next field would ship ungoverned while
both checks returned `[]`; the pass now walks each group's value, `metricMembers`
publishes the ordered domain, and an unlisted-member regression fails on the
hand-list code (plan 531)
`[x]` Keep one diagnostic per non-finite metric — `density.rowHeight: Infinity`
reported the finite failure and then blamed the overlay height and the message
viewport, and a non-finite spacing step or drawer width blamed its neighbour;
a ladder or bound now skips a comparison whose side the finite rule rejects, so
the cause is not blamed on its neighbour (`-Infinity` still reports its sign as
an independent defect) (plan 532)
`[x]` Hold the typeface to the exact family name — `non-empty` and
`single-family` let a padded name (`" Inter"`) and a CSS generic keyword
(`system-ui`) pass all six checks and paint GPUI's silent system fallback; the
`trimmed` and `css-generic` rules report them, `cssGenericFamilies` indexes the
CSS Fonts 4 keywords, and a whitespace-only value stays the `non-empty`
diagnostic alone (plan 533)
`[x]` Report a CSS-quoted family name — `'"Helvetica Neue"'`, the canonical CSS
spelling for a multi-word family, returned `[]` from all seven checks while the
runtime looked up a family literally named `"Helvetica Neue"` and painted the
system fallback; the fifth `quoted` rule reports a quoted or half-quoted name,
leaves `D'Nealian` and every shipped family alone, and joins `typefaceRules`,
the catalogue, README, design system and ledger (plan 564)
`[x]` Let a platform style own the metrics inside its density preset —
`PlatformStyleStructure.density` was preset-only, so the macOS file a consumer
copies could name `compact` or drop density but never raise a control height,
and a `{ preset, rowHeight }` override silently merged over the **base** preset
and produced comfortable-sized controls; the override now names the preset it
starts from and the style field accepts `DensityName | DensityOverrides`
(plan 534)
`[ ]` Cross-team: `components` reads `theme.dimensions.drawerWidthSm/Md/Lg` and
`drawerHeightSm/Md/Lg` for `Drawer`'s local `WIDTH`/`HEIGHT` maps
(`packages/components/src/drawer.tsx:57-67`) instead of 320/400/560 and
240/320/420 (owner: `components`; plan 530)
`[ ]` Cross-team: `components` reads `theme.dimensions.chatViewportMinHeight`
for `ChatMessages`' 160px viewport minimum
(`packages/components/src/chat.tsx:168`) (owner: `components`; plan 530)
`[ ]` Cross-team: `components` reads `theme.dimensions.carouselIndicatorSize`
and `carouselIndicatorActiveWidth` for the carousel's 8px/18px marks
(`packages/components/src/carousel.tsx:399-400`) (owner: `components`; plan 530)
`[x]` Hold the platform story to the values it ships — the catalogue and README
platform/recipe rows were built from a style's override record, so a partial
radius printed `undefined` and a `{ preset, … }` density printed
`[object Object]` while the guard accepted the false row, and macOS'
focus-ring rationale quoted 2.50:1 for a wash that measures 2.836:1; the rows
now derive from `applyPlatformStyle`, both documents state that, and
`platform-claims.test.ts` derives every current ratio the three platform files
quote (plan 535)
`[x]` Hold the catalogue's present-tense figures to the shipped themes — three
claims had drifted while every suite stayed green: the Toast's tone margin is
**11.98:1**, not the 11.97 plan 348 quoted (the same figure was copied into
`COMPONENTS.md` and this file); the disabled panel action measures **5.148:1**
identity dark and **7.310:1** AAA dark after plan 520 moved
`disabledForeground`, not the 4.343/5.199 plan 514 measured; and the value
groove's "tightest" pair is Linux light `track` on `active` at **1.050:1**,
while `docs.test.ts` measured only the `selected` surface and agreed with a
superlative over a list it never read; `figures.test.ts` derives each figure
from `shippedThemes` with the checker's own measurement and asserts the set the
sentence names, and the three sentences are corrected (plan 536)

`[x]` Derive the text hierarchy's tier figures — the two documents quoted two
numbers the package does not produce: the catalogue attributed the panel action's
1.542:1 step to identity dark (which measures 1.877:1; the minimum is
high-contrast dark), and the design system still quoted plan 392's 1.440:1 for
the hint after plan 527 moved it to 1.157:1; the case meant to guard them
asserted each minimum appeared *somewhere* in the paragraph and never read the
design system. `figures.ts` gains `tierSurfaces`, `deriveTierFigure` and
`tierMinimum`, the seven catalogue claims are pinned with the set and surface
each sentence names, the design-system summary is rebuilt from the tier groups,
and a case proves the table and `themeTextTierFailures` compare the same
surfaces (plan 537)

`[x]` Derive the tier paragraph's surface counts — the seven counts ("twelve
shared surfaces", "one `card`", "four for `popoverForeground`", …) and the panel
action's "five surfaces the two labels share" were prose no test measured, so a
surface joining both roles' pairs could leave the paragraph quoting the old set
while every tier figure still passed; the two numerals take the paragraph's word
style and one case derives all eight phrases through `tierSurfaces` (plan 538)

`[x]` Correct the disabled dim's documented figure — both pages quoted
**2.25:1** for a filled primary action at 50% opacity and `docs/tokens.md`
claimed a disabled field "reads `disabledForeground`", while GPUI composites an
element and its children as one group (the label dims with its own fill), so the
composition measures **1.575:1** on the identity light canvas and **1.468:1** at
worst (Linux light, a card), and a dimmed field's typed text **3.273:1** on the
macOS light `input` fill; the three figures join `figures.ts` through a new
`"dim"` kind, `src/disabled-state.example.ts` ships the three roles a control
paints instead, and `disabled-state.test.ts` holds the brand dim below the
inactive floor in all 24 shipped sets (plan 539)
`[x]` Ship the alpha half of the theme contract — `themeOpacityFailures` asks
for the alpha a role is painted with: the three veils (`selection`, `overlay`,
`selectionOnFill`) need a byte strictly between `00` and `FF` and every other
role is opaque, because `elevationShadow` writes the level's alpha into the
`shadow` tint (a tint authored at 50% painted at 12%) and a solid `overlay`
hides the window; the seventh check makes the guarantee seven, the docs' "third
check" ordinal is gone, and the README no longer claims the composition suites
run three separate checks (plan 540)
`[x]` Make the requested contrast level total — `applyPlatformStyle(base, style,
"high")` on a default base returned a `default` theme (the caller asked for the
accessibility level and got the other one, while `themeContrastFailures(result,
"high")` reported 180 pairs), a default request on an AAA base returned the
default palette under the name "High contrast light · macOS", and a shape-only
style kept the AAA palette while painting the style's default-level alpha
(`#FFFFFFA6`, the near-white halo plan 505 forbids). The level now decides the
palette, and the palette decides the name, the declaration and the elevation
opacity; no shipped theme moves (plan 541)
`[x]` Correct the shareable choice's density rule — `themeChoiceParams` was
documented as emitting "only the axes whose omission would change the resolved
theme" while deliberately writing density even when it equals the preset (macOS
is `compact`), and the guard named "on every platform" derived the platform from
`theme.name.startsWith("macOS")`, which no shipped name satisfies, so it
exercised `win32` twelve times and never the compact preset that makes the rule
matter; the catalogue, README and JSDoc now state the omission rule and the
density exception separately, the case derives each axis from `shippedThemes`,
a canonical-stability case was added, and a prose guard fails if the old
sentence returns (plan 542)
`[x]` Give the contrast contract's floor classes an ordered owner —
`ContrastPairClass` was the last exported union without an index, and the
ledger's floor table was rebuilt from eight named fields, so a ninth class would
gain a floor at both levels and a design-system row (both compile-enforced) while
`COMPONENTS.md` kept publishing an eight-value table and `inventory.test.ts`
stayed green; the reference's floor snippet also took its order from the
`contrastFloors` object literal. `contrastPairClasses` is the index, the type
derives from it, the ledger and the reference enumerate it, and a class with a
floor but no pair is reported; no colour, pair or floor moves (plan 543)
`[x]` Measure every quoted tightest figure on every shipped set — the catalogue
calls the ratios beside each contract list "the tightest shipped pair", "the
weakest shipped set" and "the weakest the shipped themes produce", but
`docs.test.ts` derived them from **ten** of the twenty-four sets (identity and
platform variants at the default contrast, recipes in light only), so both AAA
identity sets, all six AAA platform variants and the four remaining recipe sets
were unmeasured while every case stayed green; `quotedSets` now derives from
`shippedThemes` with a label that carries ` high` at AAA, an extent case fails on
any narrower list, the alpha-hover figures narrow explicitly to the light
composition their sentences name, and the Verification paragraph names both
owners (`figures.ts`/`figures.test.ts` for the sixteen-entry table and
`docs.test.ts` for the quoted figures). A probe over all 24 sets finds every
quoted minimum unchanged, so no document value or colour moves (plan 544)
`[x]` Make re-applying a style a no-op — `applyPlatformStyle` named its result
`${palette.name} · ${label}`, and a same-level base keeps its own name, so
applying the style a theme already carried appended the label again:
`Light · Windows` became `Light · Windows · Windows`, a palette the package
does not ship, printed by the preview the name exists for. A probe found the
second application deep-equal in every field except `name`, so only the label
drifted; one helper appends a label only when the name does not already end
with it, `applyPlatformStyle` and the deprecated `platformTheme` bridge share
it, and a different style still appends its own label once (plan 545)
`[x]` Make the uniqueness guarantee own its inventory — `docs/tokens.md` says
"every exported pair list is held to content uniqueness", but
`contrast.test.ts` checked a hand-typed 28-entry array while the package exports
35 lists: `ringTrackPairs`, `selectionInactivePairs`, `skeletonPulsePairs`,
`softActionPairs`, `softActionStepPairs`, `softActionLabelPairs` and
`inactivePanelActionPairs` were checked only through `contrastPairs` (six of
them) or not at all (`selectionInactivePairs`, whose duplicate reports one
composition twice while every suite stays green — a probe passes 33/33); the
inventory is now a record keyed by the package's own export names, so a new list
fails `check-types` until it is covered, and the catalogue sentence names that
owner (plan 546)
`[x]` Make the interactive-fill contract own the families it derives from —
`docs/tokens.md` said "a fifth surface or a new filled family joins one place",
but `stateFillRoles` retyped the four families by hand, so a fifth family added
to `filledControlFamilies` gained its step pairs, direction ladder, selection
pairs and `filledControl` helper while its three fills were never measured
against a panel; `stateFillRoles` now derives from the index, the test derives
its expectation from the index too, and the catalogue names that owner
(plan 547)
`[x]` Make the soft-status contract own the tones it derives from — the solid
fill, the `xText` roles, the chip edge and the selection list all derived from
`statusTones`, but the soft fill was retyped by hand in six places
(`softSurfaceRoles`, `trackSurfaces`, `softBorderPairs`, the body-text literals,
`selectionSoftWashPairs` and `contentFillSurfaces`), so a fifth tone's Alert
tint skipped about ten lists while every check returned `[]`; all six now derive
from the tone index and a new guard takes its expectation from it (plan 548)
`[x]` Make the status-text contract own the tones it derives from — plan 548
made every soft-fill list follow `statusTones` and said the `xText` roles already
did, but those were still a separate four-name `statusTextTones` plus twelve
literal pairs, so a fifth family's label on `background`/`card`/`popover`/`muted`
and the four row washes would have shipped unmeasured; `statusTextSurfaces` is
the public surface index now, the pairs derive from it and the tone index, and a
new guard takes its expectation from the index (plan 549)
`[x]` Hold the strong border to the thin one — `borderWidth.strong` is the
spread of the only focus indicator (GPUix 0.10.0 has no `outline*`) and `thin`
is a decorative divider, but `themeMetricFailures` held each on its own, so a
copied theme with `thin: 1, strong: 0.5` returned `[]` from all seven checks
while every focus ring painted a sub-pixel spread thinner than a border;
`strong` is now at least `thin` (equality stays a design), every shipped set
already passes, so no value moves, and the catalogue, design system, README and
ledger state the rule (plan 550)

`[x]` Make an `undefined` platform colour inherit the palette it asked for — a
copied style with one defined colour and one `undefined` colour applied to an
AAA base at `"default"` spread the `undefined` key over the default palette and
then let `extendTheme` fall back to the AAA base, so the result mixed two primary
families and `themeFailures` reported a direction failure; the palette merge now
drops the key before the base sees it (plan 551)
`[x]` Hold every size ladder to the theme's own scale — the finite pass walked a
theme's values but the ladder half read the shipped names, so
`extendTheme(light, { spacing: { ...spacing, "6xl": 1 } })` returned `[]` while
the catalogue promised every named ladder must not step backwards; the six
ladders now walk the theme's own objects, with `radius.none`/`full` keeping
their own rules (plan 552)
`[x]` Hold the documented brand to the theme it builds — the docs and README
brand snippets omitted `track`, so a copied brand shipped `primary` as a
progress segment on the identity groove at **2.225:1**, under the 3:1 mark
floor, while the page called the executed example "this exact family"; the
`extendTheme`/`createTheme` JSDoc examples moved only `primary` and each built a
theme the checker rejected three times. The three documented palettes now match
the executed example role for role, `snippets.test.ts` builds every documented
colour map and holds it to `themeFailures` (with a case that rebuilds the
pre-fix map and proves the guard can fail), and the brand rationale's groove
figure is derived after plan 503 moved it (plan 553)
`[x]` Hold every surface metric and border width to a sign — the positive
dimension checks and the non-negative width were hand-named, so a theme carrying
an extra dimension of 0 or an extra border of -1 was finite-checked and
`themeMetricFailures` returned `[]` while the contract promised every surface
metric is a positive size; both rules now walk the theme's own group, with
`strong` keeping its stricter positive rule (plan 554)
`[x]` Hold the design system's border rationale to the contract — §7 named six
of the eight fills a bordered control paints (it omitted `accentHover` and
`accentActive`) and five of the thirteen surfaces the functional boundary is
measured on, while printing the strong-over-thin rule twice; `controlFillRoles`
is exported as the fills' owner, both bullets name every measured member, and
`docs.test.ts` derives the lists from `contrastPairs` so a ninth fill or a
fourteenth surface fails the page until it is named (plan 555)
`[x]` Ship the dialog, calendar, time-segment and avatar-presence metrics — the
design system promised a brand could widen a dialog through `theme.dimensions`
while `dialog.tsx` kept 360/480/640 as a local `MAX_WIDTH`; the calendar day cell
(34), the time segment (26) and the avatar presence dot (10) were the same class
of literal, so all four join `dimensions` with a dialog ladder, a cell fit, a
segment em and a dot bound (plan 556)
`[ ]` Cross-team: `components` reads `theme.dimensions.dialogWidthSm/Md/Lg` for
`DialogContent`'s local `MAX_WIDTH` in `dialog.tsx`, `calendarCellSize` for the
date-picker's `CELL`, `timeSegmentWidth` for the time-picker's `SEGMENT_WIDTH`
and `avatarPresenceDotSize` for the avatar's `DOT` instead of the literals
(owner: `components`; plan 556)

`[x]` Ship the caret as ink, not a fill — `nativeFieldTheme` returned the
`primary` fill, which plan 527's in-place field paints on the row washes, and
macOS dark's fill measures **2.748:1** on `selected` and **2.836:1** on `active`,
under the 3:1 mark floor, while every check returned `[]`; the caret is
`primaryText` and `caretPairs` holds it on the field's `input` fill beside the
eight text surfaces (plan 557)

`[x]` Make the maths read the opaque `FF` spelling the format checks accept —
`themeColorFailures` and `themeOpacityFailures` returned `[]` for
`foreground: "#191D25FF"`, while `contrastRatio`, `relativeLuminance` and
`compositeOver` read only six digits and the total check reported **35**
failures (23 of them contrast, ratio `NaN`; dark `card` gave **67** with 62
contrast); the opaque parser now accepts a fully opaque alpha byte, a partial
alpha still fails, and the two halves of the contract agree (plan 558)

`[x]` Let a copied platform style own its easings — `PlatformStyleStructure.motion`
was `Partial<Omit<Motion, "ease">>` while `extendTheme` merged a partial `ease`
phase by phase, so a copy-and-own file could name a timing but not a platform's
curve, and a style that named one failed `check-types` even though the resolver
already forwarded it; `MotionOverrides` is the one shape behind both, the
authored example names a timing and a curve, and `platform-motion.test.ts`
proves the phase merge, the inherited phases, the runtime's curve rules on a
copied style and the shipped styles' unchanged easings (plan 559)
`[x]` Put the caret inside the mark list — plan 557 published `caretPairs`
(`primaryText` on the `input` fill) straight to `contrastPairs` while `markPairs`
is documented as every mark, so a consumer building a mark report from the public
list — and the design system's graphic-marks floor row, which `docs.test.ts`
derives from it — omitted the only mark a native field paints while
`themeContrastFailures` enforced it; `caretPairs` is now part of `markPairs`, the
row names it, `contrastPairs` stays 405 and no colour moves (plan 563)
`[x]` Give the alpha form an ordered owner — `ColorForm` was the package's last
exported union without an index, so the `Types` row, a diagnostics view and the
opacity example retyped `"opaque"` / `"translucent"` and a third form would
join the type with nothing to notice it had no role; `colorForms` is the
ordered index, `ColorForm` derives from it, and `rolesByForm` in the executed
example groups every role by its form. No guard ships — a form is a diagnostics
payload, never an input (plan 565)

`[x]` Put a defined `overlay` on the elevation feather ladder — the design
system says the level names are an order and plans 369/390 made a consumer's
`overlay` a governed level, but `featherLadder` walked a hand-typed
`sm`/`md`/`lg`, so a defined `overlay` with a 0px feather sat above the shipped
40px `lg` while `themeMetricFailures` returned `[]`; the ladder now walks
`elevationLevels`, keeps the shipped empty `overlay` exempt, and the example,
JSDoc, catalogue, design system, README and ledger state the rule. No colour,
pair, floor, metric or shipped theme moves (plan 566)

`[x]` Give the guarantee's two counts one owner each — five sentences still said
"all six checks returned `[]`" after the seventh check landed, because the old
guard was a blacklist of two numerals, and both documents restated the shipped
enumeration's size ("all 24", "of the twenty-four") while `themeChecks` and
`shippedThemes` own them; every such mention is now count-free, the one derived
guarantee sentence stays held verbatim, four test headers drop their `six`, and
three `docs.test.ts` cases hold both documents to the two indexes, including a
case proving the patterns reject a planted stale phrase. No colour, pair, floor,
metric, platform style, recipe or shipped theme moves (plan 567)

`[x]` Make the shape bounds read the theme's own extremes — the ladders walk a
theme's own scale since plan 552, but `radius.full` was still bounded by the
shipped `xl` and `lg` names and the presence dot by the shipped `xs`, so a copied or
decoded scale with an 80px avatar, a 48px control, a 24px corner or an 8px
avatar painted a rounded square or an oversized dot while `themeMetricFailures`
returned `[]` and both documents' "largest"/"smallest" sentences were false;
the bounds now derive from the theme's own values (by value, not order), an
unordered scale yields no bound so one broken ladder keeps one diagnostic, six
cases cover the four extensions and the shipped pass, and no shipped value,
pair, floor, metric, platform style, recipe or theme moves (plan 568)

`[x]` Ship the native text theme — `nativeTextTheme(theme)` returns the
`theme` prop `<code>`, `<diff>` and `<markdown>` read: `appearance` from the
mode (the runtime's built-in default is a dark Comet theme, so a light app that
omits the prop paints every document dark), four text tiers from the body,
secondary, hint and secondary roles, `accent`/caret/code ink from `primaryText`,
inline code on the `accent` wash, diff add/delete from the status **text**
roles, a 24-capture syntax palette mapped to text roles (never a solid fill),
and the layout from `codeBlock`/`body`/`h1`–`h3`/spacing/radius; the runtime's
fixed fade fractions and 3.5% ink wash are held on every shipped set, the
syntax palette joins the public checker at the body floor on `card`
(`nativeSyntaxPairs`), and `bg` is the one field a canvas document overrides
(plan 569)
`[x]` Scale the native text metrics with the type they hold — `nativeTextTheme`
sent `codeTextSize`/`diffTextSize` from `codeBlock` and `mdTextSize` from
`body`, but left the code gutter's per-digit width (7px at 12.5px), the diff
gutter minimum (36px at 12px) and the two markdown table floors (96/48px at
14px) at the runtime's defaults, so a copied theme with a 24px code role asked
7px per line-number digit while the glyph advanced ~13px and a 16px body role
squeezed table columns; the four fields now resolve the runtime's own
proportions against those roles, still 7/36/96/48px at the shipped sizes, and
the example's larger code role is held by the suite (plan 572)
`[x]` Ship the find-highlight contract — the runtime seeds a native document's
find washes from the text theme's `accent` at 30%/65%, and `nativeTextTheme`
maps that field to `primaryText`, an ink: body text measured **2.81:1** through
the active default and **6.80:1** through the match default in identity dark,
under the body floor, while every check returned `[]`. `nativeHighlight(theme)`
returns the `selection` role and one `nativeHighlightStep` stronger for the
active match, `nativeHighlightPairs` holds every matchable role to the secondary
floor on the four surfaces `bg` may name, and `themeHighlightFailures` is the
eighth check composed into `themeFailures` (plan 573)
`[x]` Hold the native syntax palette on every document surface — the reference
said every role a native document returns was measured on all four `Surface`
tones, but `nativeSyntaxPairs` measured the captures on `card` only; on Windows
XP light the inherited `infoText` and `warningText` measured **6.903:1** and
**6.951:1** on the beige canvas and the runtime's 3.5% ink wash put six more
pairs under the body floor across XP and Aero while every check returned `[]`.
`nativeTextSurfaces` owns the four tones, `nativeSyntaxPairs` publishes 24 pairs
(up from six), the suite holds them opaque and painted, and eight light platform
text roles take one designed step (macOS/Windows/XP/Aero `infoText`, XP
`successText`/`warningText`/`destructiveText`, Aero `warningText`), so the
tightest opaque pair is **7.562:1** and the tightest inked **7.008:1**
(plan 574)
`[x]` Publish the find bar's active-match step — `nativeHighlightStep` is an
absolute alpha, so an edited `selection` close to opaque painted both washes the
same colour while every text pair and `themeFailures` returned `[]`; the check
now reports a `pairClass: "step"` failure on the four surfaces `bg` may name,
the union is documented in the type index, and every shipped set already clears
the floor (plan 581)
`[x]` Hold the find highlight on the code block's painted surface — the runtime
paints `<code>`, `<diff>` and `<markdown>` on `bg` under a fixed 3.5% ink wash
(plan 574), but `themeHighlightFailures` composited the wash over the plain tone,
so a match inside fenced code sat behind two washes the check never measured; on
Aero light the inherited `successText`/`destructiveText` measured **4.429–4.496:1**
through the active match on the canvas and quiet panel, under the 4.5:1
secondary floor, while every check returned `[]`. `nativeInk(theme, surface)`
owns the runtime's fraction and ink choice, the check measures both washes over
it, Aero light names the XP steps (`#0E5135`, `#7E1D21`), and every shipped set
passes (opaque minima 5.59/4.80, painted 5.21/4.51; no pair count, floor or
check kind moves) (plan 582)
`[x]` Publish the native document's fades and ink wash — the runtime paints a
diff line at 92%, its markers at 90%, the row tint at 5.5%, the quote wash at
5%, the list marker at 85%, the gutter at 80%/50% and code on a 3.5% ink wash,
but only `card` and only shipped themes were guarded; two valid edits
(`successText: "#bebebe"` and `mutedForeground: "#bebebe"` on `Dark · Linux`)
measured **6.405:1** through the ink and **6.335:1** in a quote while
`themeFailures` returned `[]`; `themeNativeTextFailures` is the ninth check and
`nativeTextFades`/`nativeTextOverFades` own the fractions (plan 583)
`[x]` Hold a floating menu's shadow on the content it opens over — the `md`
shadow was measured only on the six page surfaces, but a dropdown opens across
the button beside its trigger and a context menu over a Badge, so an edited
theme whose `shadow` met `primary`, `info` or a soft status fill returned `[]`
while the only depth cue disappeared; `elevationContentSurfaces` publishes the
twelve resting content fills, the `md` walk measures the page surfaces and those
fills (`sm` cards and `lg` dialogs stay on the page), every shipped set passes
(1.058:1 at the tightest, AAA dark `md` on `info`) and no colour or
`contrastPairs` count moves (plan 584)
`[x]` Let a brand own the runtime's two token-less native-text metrics — the
docs said to "set them on the returned object", but `NativeTextMetrics` declared
neither `codeGutterMinWidth` nor `diffAccentBarWidth`, so the documented override
failed `check-types` with TS2561; both are optional members now, the bridge
leaves them unset so the runtime's 28px/3px defaults apply, and the same
paragraphs no longer call the derived per-digit width and table floors runtime
defaults (plan 585)
`[ ]` Cross-team: `components` passes `nativeTextTheme(theme)` to every
`<markdown>`, `<code>` and `<diff>` — `message.tsx` renders `<markdown
source={text} />` with no prop, so an assistant message is painted with the
runtime's built-in dark theme in the light identity, every light platform
variant and both AAA light sets; a document on the canvas overrides `bg` with
`theme.colors.background` (owner: `components`; plan 569)
`[x]` Hold the native document's chrome washes — plan 583 named the runtime's
3.5% code-body ink and its per-role fades but not the ink it paints inside its
own chrome: a code block's language header (2% under `textMuted`, with the
theme's `border` on the same wash) and a diff file header (2.5% under
`textMuted`/`diffAdd`/`diffDel`, and 5% under the pointer, shared by the
show-more row). A `border` that cleared every plain-surface divider pair still
measured **1.002:1** on `Dark · macOS`'s code header while `themeFailures`
returned `[]`; `nativeTextWashes` publishes the four fractions, the check holds
them on all four `nativeTextSurfaces`, every shipped set passes (so no colour
moves) and the type index, reference, design system, README and ledger name it
(plan 588)
`[x]` Hold the native code block's own frame on its body ink wash — a fenced
block paints the theme's `border` around a body on the runtime's 3.5% ink wash,
but plan 588 measured that role only on the 2% language-header wash, so on
`Dark` a `border: "#222222"` that cleared every plain-surface divider pair
measured **1.036:1** inside the block while `themeFailures` returned `[]`;
`nativeTextWashes` now owns the body frame beside the header separator, every
shipped set already clears the 1.05:1 floor (1.130:1 at the tightest,
`Dark · Linux`) so no colour moves, and the reference, design system, README and
ledger name it (plan 589)
`[x]` Hold the native diff row tint — the runtime paints a changed diff line
on a 5.5% tint of its status role and every child (gutter, marker, accent bar,
syntax runs) sits on it, but the contract measured those paints on the plain
tone only, so five shipped pairs missed the body floor while every check returned
`[]`; `nativeSyntaxTints` and six extended `nativeTextOverFades` entries hold the
row, four light inks take one designed step, and the tightest tinted pair is
**7.008:1** (plan 591)
`[x]` Hold inline code on its accent wash — a markdown document paints
`codeText` (`primaryText`) on an opaque `codeWash` (`accent`) quad, but the only
pair for that combination was the accent row fill's secondary floor, so four
shipped sets measured 6.506:1 (`Light · Windows XP`), 6.898:1 (`Dark · Linux`),
6.953:1 (`Light · Windows`) and 6.960:1 (`Dark · macOS`) under the body floor
while `themeFailures` returned `[]`; `nativeInlineCode` owns the pair at the
body floor, the four inks (and macOS light's three-decimal 7.006:1 pass) take
one designed step, the tightest is 7.102:1 (`Light · Windows XP`), and the
reference, design system, README and ledger name it (plan 590)
`[x]` Hold the native diff chrome to the type the runtime paints — the meta line
is 10.5px, the gutter, hunk header, notice and file counts 11px and the file
path 12px, each on GPUI's golden-ratio line box, while the four heights and the
marker column followed the theme's roles; a compact theme with
`caption`/`label`/`codeBlock` at 8/8 and spacing at `0` returned `[]` from
`themeFailures` and resolved **8 / 8 / 8 / 8** and a **0px** marker, which the
runtime painted 11–12px chrome through. `nativeTextChrome` and
`nativeTextLineRatio` publish the fixed type, `nativeTextTheme` floors the four
boxes at **19 / 18 / 18 / 18** and the marker at one code em, and no shipped box
moves (plan 592)
`[x]` Hold every interactive fill on the field's `input` fill — the
`NumberField` steppers paint `hover`/`active` inside a field whose chrome is
`input`, and a theme with `input = hover` passed all nine checks while the
stepper's wash measured **1.000:1** (the same wash on the card was still
1.133:1); the surface joins `stateFillSurfaces` (60 → 75 fill-on-surface pairs,
405 → 420 in the contract), every shipped set already clears 1.05:1 on it
(1.1176:1 at the tightest, Dark · Windows `accent`) and no colour moves
(plan 595)

`[x]` Hold each control to the icon tier that matches its size — `IconButton`
paints `iconSize[size]` in `controlHeight[size]` and a slider's thumb is that
tall in the same track, but only `controlHeight.sm` was measured against the
default `iconSize.md`, so `iconSize.lg: 48` returned `[]` from all nine checks
while a large glyph overflowed its control; every size is now held to its own
content box, every shipped pair keeps at least 8px and no value moves
(plan 596).
`[x]` Ship the notification inbox's fixed surface metrics — the panel is 320×380,
its scrolling list holds 280px and its unread marker is 6px, all literals in
`notification-centre.tsx`, so a brand could not own the inbox and
`themeMetricFailures` returned `[]` for a panel shorter than its list or a
viewport below one row; the four values join `theme.dimensions` with the two
containment floors, every shipped set passes and no pixel moves (plan 598)
`[ ]` Cross-team: `components` reads `theme.dimensions.notificationPanelWidth`,
`notificationPanelMaxHeight`, `notificationListMaxHeight` and
`notificationUnreadDotSize` for `notification-centre.tsx`'s `panelStyle`, list
`maxHeight` and unread dot (owner: `components`; plan 598)

`[x]` Ship the date trigger's fixed width and correct the overlay claim — the
date picker paints a 220px field around its own insets and gap, but the width
was a literal and `overlayWidth` was documented as the calendar width, which is
content-sized at seven `calendarCellSize` cells; `dateFieldWidth` owns the
field, a content-fit rule holds it, and the calendar is documented by the metric
that sizes it (plan 601)
`[ ]` Cross-team: `components` reads `theme.dimensions.dateFieldWidth` for
`date-picker.tsx`'s trigger width, beside `calendarCellSize` for `CELL`
(owner: `components`; plan 601)

`[x]` Hold every document that retypes the diagnostic order to `themeChecks` —
the README named seven of the nine checks and called `themeTextTierFailures`
“the fifth” and `themeDirectionFailures` “the sixth” after plans 573 and 583
inserted `highlight` and `nativeText`, its payload list omitted
`HighlightFailure` and `NativeTextFailure`, and the design system omitted both
checks and `themeNativeTextFailures`, while only the count was guarded; the
README, the design system, the catalogue and the ledger now derive their order,
functions, payloads and ordinals from the index (plan 602)
`[x]` Name the Toast countdown's groove as the second shipped value indicator —
its 2px track paints `muted` on `popover` (1.000:1 in the identity dark theme and
every default-contrast platform and recipe dark set) while `track` clears the
floor at 1.069:1 in the tightest set; a copyable `countdownStyle` example, the
catalogue and design-system sentences, the ledger clause and derived docs guards
ship, with no token or pair change (plan 603)

`[x]` Ship the timeline marker's fixed metrics — `timelineMarkerSize` (8) and
`timelineMarkerColumnWidth` (16) replace the 16/8 literals in
`components/timeline.tsx`, and the metric contract holds the dot to the rail's
`borderWidth.thin` and to the column that centres it; the copy-and-own
dimensions example sizes both, and no shipped pixel moves (plan 604)
`[ ]` Cross-team: `components` reads `theme.dimensions.timelineMarkerSize` and
`theme.dimensions.timelineMarkerColumnWidth` for `timeline.tsx`'s 16px marker
column and 8px dot instead of the literals (owner: `components`; plan 604)

`[x]` Ship the designed disabled state as one call — `disabledControl(theme)`
and `DisabledControlStyle` join the state helpers, so a consumer no longer
copies the three properties out of an example: the helper returns `opacity: 1`,
the `disabled` fill, the `disabledForeground` label and the `border` edge; the
example builds a full Button shape from it, the catalogue, design system and
README name it, and the helper's label and edge are held to the inactive and
divider floors on every shipped set with no colour, pair or metric moving
(plan 605)
`[x]` Own the find wash's corner — GPUix 0.10.0's `HighlightSpec` defaults
`radius` to 2px and `nativeHighlight` never set it, so a square copied style
still painted a rounded match while every check returned `[]`;
`nativeHighlight(theme).radius` is the theme's inline-mark step (`radius.sm`,
the same step inline code uses), the docs and README name it, and no colour,
pair, floor or metric moves (plan 607)
`[x]` Ship the inset focus indicator — a clipped ButtonGroup, a selected
calendar day and a pressed selection control paint their ring on the control's
own fill, where `ring` is **1.000:1** on `primary` in sixteen shipped sets and
never above 1.374:1; `insetFocusRing(theme, family)` returns the family's
on-colour at `borderWidth.strong` (4.697:1 at the tightest on a fill), the
three cross-team rows point at one call, and no colour, pair, floor, metric or
shipped theme moves (plan 609)
`[x]` Hold the modal scrim and the floating menu's shadow over the three resting
fills it excluded — a dark theme with `disabled`, `skeleton` and `track` set to
`#000000` passed all nine checks while the shipped black scrim composited to
**1.000:1** on each, so a disabled control, a loading row and a progress groove
sat undimmed behind a dialog; the three join `contentFillSurfaces`, taking the
scrim and dialog-face walks 18 → 21 pairs and the `md` elevation walk 12 → 15
fills, every shipped set already clears 1.05:1 (1.284:1 at the tightest) and no
colour moves (plan 610)
`[x]` Ship a ring that stays visible on arbitrary content — a selected swatch
ringed in one role vanishes on a swatch of that colour (the ColorPicker's
`foreground` swatch measured **1.000:1**), so `contrastRing(theme)` returns the
theme's `background` beside the content and `foreground` outside it at
`borderWidth.strong`, whose worst case over any colour is
`sqrt(contrast(foreground, background))` (3.70:1 at the tightest shipped set,
4.58:1 at AAA); `themeRingFailures` reports a theme below the `mark` floor and
`themeFailures` composes it as the tenth kind, `ring`; the executed one-element
composition is a border plus a spread shadow, and no colour, pair, floor or
metric moves (plan 611)
`[x]` Hold the content ring's quoted figures — plan 611 wrote 3.98/4.58/3.70 and
the 15.86/21 pair figures into `docs/tokens.md`, `docs/design-system.md`, the
README, `COMPONENTS.md` and the `ring.ts` JSDoc, but only the catalogue's three
numbers were derived (as a presence check) and nothing held the named set or the
other four surfaces, so a palette edit could leave `Dark · Linux` named after
another set became tightest, or leave four pages and the JSDoc quoting a bound
the package no longer produces; `figures.ts` gains the `ring` measurement
(`sqrt` of the pair's contrast) and twelve entries across the five surfaces, and
the table's size sentence moves to **28** (plan 613)
`[x]` Audit the token contract after plans 609–611 — re-ran the ten checks over all
24 shipped sets, walked every role, pair list, numeric group, native-text bridge
and documented figure, and compared the contract against every composition the
shipped `components`/`primitives` trees paint. Every role a consumer paints is
measured on the surface it paints and the numeric rules cover the fixed surfaces;
the audit's one new token-side finding is the content ring's quoted figures
outside the catalogue's presence check, closed by plan 613. Its consumer-side
finding is the Notification centre's open row, which uses the transient
`accent` wash, loses it under the pointer and rings itself while unfocused
(recorded cross-team); the TagInput chip's `0.6` dim joins the existing
disabled-dim row (2026-10-19 audit)
`[x]` Resolve the catalogue's four dead source links — `docs/tokens.md` linked
the native field, the two find-highlight suites and the native-text example as
`./src/…`, which from `docs/` resolves to a `docs/src/` that does not exist, so
four "runnable" links were dead while no test read a target; the paths now climb
to `../packages/tokens/src/…`, and `docs-links.test.ts` resolves every relative
Markdown link in the catalogue, the design system and the README against the
document's own directory, with synthetic cases proving it reports a
document-relative miss and accepts a target that climbs out (plan 616)
`[x]` Give the ledger's check counts one owner — plan 611 made `ring` the tenth
check, but the **Total theme check** row still said `inventory.test.ts` held
"this row's nine names", its present-tense "the ten kinds" had no test, and four
historical audits in the contrast and metric rows still retyped `six`/`nine`
checks against plan 567's rule; the row now names the test without a count, the
one present-tense count is held to `themeChecks.length`, the four audits say
"every check", and no token, pair, floor or metric moves (plan 617)
`[x]` Make a default request own its elevation — `applyPlatformStyle`'s
`"default"` branch merged a style's partial elevation over the **base**, so a
copied style that named a colour but no level, applied to an AAA base asking for
`"default"`, declared the default palette with its black `shadow` tint but kept
the AAA alphas (0.10/0.14/0.18 instead of 0.40/0.65/0.80) and `themeFailures`
reported 15 elevation pairs (worst 1.0175:1); the levels a style does not name
now come from the requested palette, a named level still wins, a same-level
base keeps its edits, and every shipped style already names `sm`/`md`/`lg`, so
no shipped pixel moves (plan 618)
`[x]` Hold the time segment to the two digits it paints — `timeSegmentWidth`
was checked against one `body` em, so a copied theme with a 24px body and a
24px segment returned `[]` while the `HH`/`MM` value it edits could not be
shown; the bound is 1.3 body ems (two tabular digits at a 0.65em advance),
rounded up, and every shipped 26px segment still passes at 19 (plan 621)
`[x]` Walk the selectable row's press in the direction check — plan 619
published the press **distance** (`rowPressStepPairs`: `active` one 1.05:1 step
from the `accent` hover) but `stateLadders` named only the filled families, the
panel action, the wash and the selected step, so a copied dark theme whose row
pressed **darker** than its hover returned `[]` from every check while the
1.094:1 step passed; the row press is now its own ladder (`accent` → `active`),
derived in the suite from the published pair so the two cannot drift, and every
shipped set already steps the expected way (plan 622)
`[x]` Hold the selected row's inherited label a perceivable step below its
title — a theme could raise `selectedForeground` to (or above) `foreground` on
the four row fills while `themeContrastFailures` and the hierarchy check both
returned `[]`; `textTiers` gains the state pair, every shipped set already
clears the step (1.106:1 at the tightest, `Dark · Windows` on `hover`) and no
colour moves (plan 623)
`[x]` Hold the field minimum to the query row it documents — `fieldMinWidth`
was checked only against a chip, so a copied style with `chipMinWidth: 10` and
`fieldMinWidth: 60` returned `[]` while a search field's clear control
overlapped its query; the chip rule now takes the larger of the chip's content
box and the field's own padding, leading glyph, gap, query glyph, gap and
action, every shipped set still passes at the 102px chip bound and no value
moves (plan 624)
`[x]` Hold the dialog and drawer shells to their close control — plan 620 left
the two ladders alone as reflow containers, but their padding and close control
do not reflow, so a copied style with `dialogWidthSm: 40`, `drawerWidthSm: 40`
and `drawerHeightSm: 50` returned `[]` while the shell painted a 28px control
into a 40px surface; three `at-least` rules now read the theme's own spacing,
control and type metrics, every shipped set clears them (360/320/240 against
88/88/96) and no value moves (plan 625)
`[x]` Hold the fixed surfaces to their own border — plan 384 made a size fit its
content box, but the menu minimum, Toast card, inbox and the dialog/drawer shells
compared the outer metric, so a theme with `borderWidth.thin: 12` and
`dialogWidthSm: 88` painted a 72px chrome into a 64px content box while
`themeFailures` returned `[]`; seven bounds now include `2 * borderWidth.thin`,
every shipped set clears them (90/90/98/68/52/55 and 282) and no value moves
(plan 627)
`[x]` Hold the notification inbox's header inside its panel — the panel maximum
was held only to the list plus its two borders, but the inbox always paints a
header (two `spacing.lg` insets, a `sm` action, a bottom rule), so a theme with
`notificationPanelMaxHeight: 300` and a 280px list returned `[]` while the
header and list needed 335; the bound now counts the header, every shipped set
clears it (380 against 335) and no value moves (plan 629)
`[x]` Hold the Toast's dismiss control inside its card — the card bound counted
its padding, tone icon, one gap and one title glyph, but `toast/viewport.tsx`
always paints a square `sm` `IconButton` after another `spacing.lg` gap, so a
theme with `toastWidth: 100` returned `[]` while the card needed 108 and
`overflow: "hidden"` clipped the control; the bound now counts the gap and the
dismiss control, every shipped set still passes (380 against 108) and no value
moves (plan 631)
`[x]` Charge the date trigger the icon it paints — `dateFieldWidth` was held to
its insets, gap, one `label` glyph and a `caption` disclosure glyph, but
`DatePickerTrigger` paints `<Icon size="sm" />`, which resolves to
`iconSize.sm`; a theme at the old 51px bound returned `[]` while the trigger
needed 53, and a lifted icon tier was never read. The bound now charges
`iconSize.sm`, every shipped set still passes (220 against 53) and no value
moves (plan 632)
`[x]` Charge the field's query row the icon it paints — `fieldMinWidth`
charged both glyphs of the query row as `fieldAdornmentSize`, but `SearchInput`
paints its leading magnifier as `<Icon size="md" />`, which resolves through
`iconSize.md`; a copied theme that lifted the icon tier to 20 returned `[]`
while the query row needed 82 against the old 78, so the field could clip its
own leading glyph. The bound now reads `iconSize.md` for the lead and
`fieldAdornmentSize` for the trailing action, every shipped set passes (200
against the larger 102px chip bound) and no shipped value moves (plan 634)
`[x]` Own the Toast's tone bar and hold the card to it — `toastWidth`'s bound
left out the 3px tone bar `ToastCard` paints inside the card as a sibling of
its content row, calling it consumer chrome, so a copied theme at 110 returned
`[]` while the content row needed 111 under `overflow: "hidden"`, and the bar
was the last fixed mark in the dimensions group with no token;
`toastToneBarWidth` (3) now ships beside `toastWidth`, the bound charges it,
every shipped set passes (380 against 111) and no colour, pair, floor or other
metric moves (plan 636)
`[x]` Give the panel action's rationale one owner — the `softAction` story
quoted "80 of the 288" in two catalogue sections and the `softActionPairs`
JSDoc while the shipped count is **84**, its light band `0.742–0.765` omitted
the AAA light set (`destructiveSoft` is `0.657`) and "the identity light press"
named a ratio that is not its tightest (`active` on `infoSoft`, **1.0202:1**),
and no test read any of it; the count, total, both bands and the two named
ratios are derived in `soft-action.test.ts`, the five quoting surfaces are held
by `docs.test.ts`, three 80s and the band are corrected and no colour, pair,
floor or metric moves (plan 637)
`[x]` Hold a field's adornment to the caption glyph it paints —
`fieldAdornmentSize` was held only to a positive size and to fitting the smallest
control, while the four shipped clear/remove controls inside a field
(SearchInput, TimePicker, HotkeyRecorder and the TagInput chip) paint the
`caption` role's `✕` in that square; a copied theme with a 20px caption leading
and the 16px adornment returned `[]` from every check while the glyph overflowed
its box. The `dimensions` rule now reads the theme's own `caption.lineHeight`,
every shipped set passes at equality (16) and no shipped value moves (plan 638)
`[x]` Stop a broken line or row from blaming the mark that fits inside it — the
three `atMost` fits (`iconSize.xs` against `caption.lineHeight`, `iconSize.sm`
against `label.lineHeight`, `avatarSize.xs` against `density.rowHeight`)
compared a zero or negative bound and reported the correct icon or avatar as
well as the broken metric; all three now read their bound through
`usableBound`, every shipped set passes unchanged and no value moves (plan 641)
`[x]` Report the second elevation shape the runtime never paints — the metric
contract validated every shape in a level and required one, but never capped the
count, so a copied theme with two shapes returned `[]` from every check while
`elevationShadow` painted only the first; every level now holds at most one
shape, every shipped set passes unchanged and no value moves (plan 642)
`[x]` Hold every fixed mark to a stroke that paints — the Toast's tone bar, the
inbox's unread dot, a carousel indicator and an avatar's presence dot were only
`positive`, so `toastToneBarWidth: 0.1` returned `[]` from every check while
painting a sub-hairline smear; each is now at least the theme's own hairline
(`borderWidth.thin`), the rule the timeline marker already applies to its rail,
a zero or non-finite mark keeps its single `positive` diagnostic, and every
shipped set passes unchanged (plan 643)
`[x]` Count every inset a fixed surface paints — five bounds charged only part
of the chrome inside them, so a message viewport at one `density.rowHeight` had
no content box for that row, a 10px preview card was narrower than its padding,
the menu minimum omitted the surface's `spacing.xs`, the field's query row
omitted the field's two borders that the chip row charged, and a dialog or
drawer reserved `2 * spacing["2xl"]` for the close control even when the control
reached `spacing.lg + controlHeight.sm` further; all five now charge the full
painted chrome, every shipped set passes unchanged and no colour, pair, floor,
figure, shipped metric or component source moves (plan 645)
`[x]` Hold a metric to the renderer's 32-bit cast — the `finite` rule checked
`Number.isFinite`, which is true for a JavaScript number beyond `f32`'s range;
the renderer casts every metric with `value as f32`, so `1e39` became an
infinity Taffy rejects and the element painted nothing while every check
returned `[]`, and `1e-50` became zero so a positive surface size painted
nothing while `positive` passed. A huge `density.rowHeight` also cascaded into
four dependent bounds that blamed the rows and surfaces. `paints` now means
finite after the cast, `positive`/`non-negative` read the painted value, and
dependent bounds wait for a paintable one; every shipped set passes unchanged
and no colour, pair, floor, figure or shipped metric moves (plan 646)
`[x]` Hold the find highlight on the native diff's row tint — the check measured
the wash over the code block's 3.5% ink only, while `<diff>` paints a changed
row directly on `bg` under a 5.5% `diffAdd`/`diffDel` tint; on Aero light the
active match put `mutedForeground` at 4.437:1 and `primaryText` at 4.481:1 on
the quiet panel, under the 4.5:1 floor, while `themeHighlightFailures` returned
`[]`. The check now walks both tints for the match, the active match and the
step, the payload names the tint and its fraction, Aero light's two inks take
one designed step, every shipped set passes (plan 649)
`[x]` Hold the designed disabled field on its own fill — the catalogue said a
disabled field is out of scope for the body pairs because `disabledForeground`
is what it reads and "which `inactivePairs` measures", but the inactive surface
list omitted the field's `input` fill, so a coherent theme passed all ten checks
with its disabled label at **2.494:1** on `input`; `input` joins the one owner,
`inactivePairs` and `selectionInactivePairs` grow 13 → 14, `contrastPairs` grows
421 → **422**, every shipped set already passes (6.610:1 at rest, 4.944:1
washed) and no colour moves (plan 650)

`[x]` Give a **selected** row its press — the design system claimed a chosen
row "still presses to `active` … and walk[s] away from the canvas like every
ladder", but identity light measured **1.001:1** on that press (the selection
and the press wash are the same luminance), eleven of twelve default palettes
sat under the 1.05:1 step floor and eight moved the wrong way while both the
contrast and direction checks returned `[]`. The press is the one state that
previews deselection, so `selectedActive` is a 24% canvas veil over `selected`
(the one `stateLadders` entry with `direction: "toward"`),
`selectionPressStepPairs` publishes its step, `selectionPressPairs` holds the
text and chrome a pressed row paints, `statusTextSurfaces` adds the fill, and
`selectedActive` joins the interactive-fill, skeleton and track surfaces, the
solid chip fill and the soft chip edge; every shipped set passes as-is, the
contract grows 422 → 451 and no existing value moves (plan 651)
`[x]` Make every copyable block declare the theme it paints with — plan 655
promised a source example "declares `getTheme`" but the guard only checked
imports, so twenty-two blocks that begin with a package import (two source
`@example`s, fourteen catalogue snippets and six README snippets) passed a bare
`theme` to a helper or read `theme.colors` and threw `ReferenceError` when
copied. A new case holds every package-importing block to a local binding, a
typed parameter or a destructured callback, the seven blocks the first probe
missed are recorded, and every block now resolves its own theme; no token
value, pair, floor, metric or check moves (plan 656)
`[x]` Make the documented recipe edit own its whole family — the recipe block
edited only `primary`, so a copied Aero theme kept the Windows black
foreground and the old pointer states and `themeFailures` rejected it seven
times (the label 3.999:1, the fill as a mark 2.233–2.882:1) while no suite ran
the block; the page now moves the whole family, `recipe-edit.example.ts` is the
executed owner, and `snippets.test.ts` builds the documented map and keeps the
pre-fix edit as its can-fail fixture (plan 658)
`[x]` Hold the field's own content inside a status panel and a pressed selected
row — `softFieldPairs` measures `inputForeground` and `placeholder` on the four
soft status fills a documented Alert field sits on, `selectionPressPairs` gains
typed text on `selectedActive`, and the identity light hint (**4.439:1** on
`destructiveSoft`) and the AAA light hint (6.993:1) move a half-step;
`contrastPairs` grows 451 → 460 and every shipped set passes (plan 659)
`[x]` Hold the pressed selected row's prose to its published pairs — plan 651
put `selectedForeground` on `selectedActive` and plan 659 added typed text, so
the pair carries six text roles and the inherited label is measured on five
fills, but the catalogue said "five text roles" and "all four fills it keeps"
in three places (the row-text paragraph named only three washes beside
`selected`) and the design system's `selected` row omitted the pressed fill;
both documents now name every fill, and two guards derive the count and the
list from `selectionPairs`, `selectionPressPairs` and `contrastPairs`; no
colour, pair, floor or metric moves (plan 663)
`[x]` Make the ledger count the pairs it names — plan 659 added a seventh
`selectionPressPairs` entry, so the contrast row's "9 pressed-row pairs" was one
short, and five further counts in the same row (the pressed row's status labels,
the inactive-selection, both fill-selection lists and the panel-action pair)
were hand-typed with no owner; the total-check row and the design system also
said the hierarchy compares the selected label on "the four fills it keeps"
after plan 651 made `selectedActive` a fifth. Every count now derives from its
list, the tier word from `tierSurfaces`, and no colour, pair, floor, metric or
shipped theme moves (plan 664)
`[x]` Name every fill in the elevation-content prose — plan 610 added
`disabled`, `skeleton` and `track` to `elevationContentSurfaces`, but the three
paragraphs describing the `md` walk in the catalogue and the design system
still listed the original twelve fills while the floor table and the scrim
paragraph said fifteen. All three enumerate the fifteen-name list now, and a
guard reads every enumerating paragraph (dash, not a comma reference),
normalises its wrap and derives both the count word and the members from
`elevationContentSurfaces`; no colour, pair, floor, metric or shipped theme
moves (plan 665)
`[x]` Name the three status chips in the scrim explanation — the contrast audit
paragraph enumerated 18 of the 21 surfaces `overlaySurfaces` names while its
next sentence quoted "the tightest of the twenty-one pairs", and its rationale
called the missing group "the three resting fills", a phrase that names
nothing. It now enumerates all twenty-one, names `info`/`success`/`warning` in
the rationale and derives both the count and the member list from
`overlaySurfaces` in a new guard; no colour, pair, floor, metric or shipped
theme moves (plan 666)

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
