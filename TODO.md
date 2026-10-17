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

`[x]` `[████████░░]` 84/110

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
`[ ]` Cross-team: `components` sets the `placeholder` role on the transparent
fields painted on `background` (SearchInput, InlineEdit, ColorPicker, TagInput,
MentionInput) and adds an `input`-fill placeholder only where it owns that fill —
they currently leave placeholder colour to the runtime default, so the
`placeholder` token and its pair apply to the `input` fill alone (owner:
`components`; plan 315)
`[ ]` Cross-team: `primitives` paints an unchecked checkbox/switch border with
`theme.colors.input`, a **background** role — `input` is `#FFFFFF` in every
light set, so an unchecked box on a white card measures 1.000:1 and has no
visible edge (`primitives/src/core/selection.ts` `emptyBorder`, used at
`selectionBoxStyle` and `switchTrackStyle`). It should paint the designed
`borderStrong` control boundary, which plan 084 already holds to 3:1 (4.5:1 at
AAA) on the quiet panel and the row washes (owner: `primitives`; plans 084, 312)
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
reads the solid `success`/`warning` fills as text (plan 057; owner: `components`)
`[ ]` Cross-team: `components` uses `destructiveText` for the Field error text
(`field.tsx:122`, `:154`) and the destructive Menu item label
(`menu/item.tsx:76`). The solid `destructive` is a fill: it measures 4.04–4.28:1
on the hover wash and 3.29–3.86:1 on the active wash across the shipped light
sets, under the 4.5:1 secondary floor, while `destructiveText` clears every
wash (≥5.28:1). The token contract checks `destructiveText` on
`background`/`card`/`popover` and, since plan 083, on the `hover`/`active`
washes the menu item paints (plan 079 audit; owner: `components`)
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
palette (62 ship now), an elevation level as `{ …, color }` (it is `{ …,
alpha }` since plan 085) and a `Theme` without `contrast`, `motion` or
`avatarSize`, so it cannot type-check against the merged package (owner:
`primitives`; plans 019, 054, 073, 085, 302)
`[ ]` Cross-team: the integration owner promotes the reconciled commit to `main`
so the shared `TODO.md`, `COMPONENTS.md` and plan index carry the tokens rows,
and retires the now-redundant `agent/tokens-platform` worktree (its branch is
`main`; `agent/tokens-theme` is the union); this agent was instructed not to push
`main`

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
