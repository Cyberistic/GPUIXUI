# Implementation Plans

**This directory is the swarm's first deliverable.** No implementation work
starts until the plan set below exists and is indexed here.

Each plan is **self-contained for a weaker executor**. That means, at minimum:

- the exact files to create or change, and their exact paths;
- the exact commands to run, and the expected result of each;
- **STOP conditions** — the point at which the executor must stop and report
  rather than improvise;
- a **test plan** — which tests to write, what they must be able to catch, and
  how to prove the test fails without the fix;
- the acceptance criteria that let the executor say "done".

Naming: `NNN-kebab-title.md`, numbered in dependency order. One plan per phase,
one per package, plus a plan for each cross-cutting concern (native smoke test,
licensing, docs site).

**Number blocks.** Plans are counted across every worktree (see `PLAN.md` D7).
Blocks are reserved so concurrent workstreams do not collide:

| Block | Reserved for |
| ----- | ------------ |
| `010–019` | tokens and theming |
| `020–049` | primitives, icons, Phase C |
| `050–099` | free |
| `100–199` | packages, apps, smoke test |
| `200–299` | reference adoption and gap sequencing |
| `300–399` | free |
| `400–499` | docs site |

## The plan set

### `tokens-theme` (block `010–019`, plus overflow plans `050–099`)

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [010](./010-phase-b-design-tokens.md) | Phase B: design tokens and theming | B | Phase A audit | done |
| [011](./011-package-tokens.md) | Package: `@gpuixui/tokens` | B | 010 | done |
| [012](./012-docs-design-system.md) | Docs: design system and token catalogue | B | 011 | done |
| [013](./013-high-contrast-theme.md) | High-contrast accessibility themes | B | 011 | done |
| [014](./014-status-tones-and-colour-helpers.md) | Status tones and colour helpers | B | 011, 013 | done |
| [015](./015-colour-role-index.md) | Colour role index for documentation | B | 011, 013, 014 | done |
| [016](./016-tokens-consumable-exports.md) | `@gpuixui/tokens` resolvable without a prebuilt `dist` | B | 011 | done |
| [017](./017-focus-ring-and-docs-truth.md) | Focus ring helper and the focus documentation truth pass | B | 011, 016 | done |
| [018](./018-elevation-truth.md) | Elevation truth: one shadow, no unsupported fields | B | 011, 016 | done |
| [019](./019-motion-tokens.md) | Motion tokens (durations and easings) | B | 011, 016 | done |
| [050](./050-docs-layering-and-omissions.md) | The layering model and the deliberate token omissions | B | 011, 017–019 | done |
| [051](./051-platform-type-styles.md) | Platform type styles: one real theme per platform | B | 011, 016 | done |
| [052](./052-register-font.md) | `registerFont`: the library's and a consumer's typefaces in the runtime | B | 011, 051 | blocked (upstream: not in 0.10.0) |
| [053](./053-reconcile-tokens-branches.md) | Reconcile the two `tokens` branches into one | B | 010–019, 050–052 | done |
| [054](./054-avatar-size-scale.md) | The avatar diameter scale | B | 011, 016 | done |
| [055](./055-filled-control-hover-roles.md) | Designed hover roles for filled controls | B | 011, 013–016 | done |
| [056](./056-docs-truth-guard.md) | Docs truth guard for the token catalogue | F | 010–019, 050–055 | done |
| [057](./057-status-text-roles.md) | Status text roles: a readable status tonality on plain surfaces | B | 010–019, 050–056 | done |
| [058](./058-docs-numeric-tables-guard.md) | Docs-truth guard for the numeric token tables | F | 056 | done |
| [059](./059-catalogue-index-and-contrast-completeness.md) | The type-role index and the unguarded colour pairs | F | 010–019, 050–058 | done |
| [060](./060-motion-property-count-truth.md) | The animated-property count and the reserved `overlay` level | F | 018, 019, 058, 059 | done |
| [061](./061-react-entry-consumer-jsx.md) | The React entry must not inherit the consumer's JSX runtime | B/F | 011, 016 | done |
| [062](./062-design-system-truth-guard.md) | Hold the design-system narrative to the implementation | F | 056, 058, 059 | done |
| [063](./063-platform-style-variants.md) | Platform style variants: macOS, Linux, Windows and Default | B | 051, 053, 056–062 | done |
| [064](./064-documentation-indexes.md) | Documentation indexes for platforms and status tones | F | 014, 015, 059, 063 | done |
| [065](./065-readme-truth-guard.md) | Guard the package README against drift | F | 056, 058, 059, 062, 064 | done |
| [066](./066-public-value-coverage.md) | Name every public value; author a platform style | F | 056–065 | done |
| [067](./067-persisted-choice-guards.md) | Narrowing guards for the persisted theme choices | F | 063, 064, 066 | done |
| [068](./068-density-and-tone-guards.md) | The last two unions a consumer narrows: density and status tone | F | 064, 066, 067 | done |
| [069](./069-selection-and-scrollbar-reach.md) | Selection and scrollbar: what the pinned runtime reaches | F | 017, 018, 060 | done |
| [070](./070-install-path-and-claim-guards.md) | Install-path truth and the last unguarded design-system claims | F | 062, 065, 066 | done |
| [071](./071-contrast-contract.md) | A contrast contract the consumer can run | F | 013, 014, 057, 059, 063 | done |
| [072](./072-palette-table-guard.md) | Guard the palette ramps in `docs/tokens.md` | F | 058, 066 | done |
| [073](./073-declared-contrast.md) | A theme declares its contrast level | F | 013, 063, 071 | done |
| [074](./074-contrast-state-and-overlay-surfaces.md) | The state washes and floating surfaces the contrast contract never checked | F | 059, 063, 071, 073 | done |
| [075](./075-quoted-contrast-figures.md) | The contrast figures the catalogue quotes | F | 056–059, 071–074 | done |
| [076](./076-contrast-surface-and-divider-pairs.md) | The soft surfaces and dividers the contrast contract never checked | F | 013, 014, 059, 063, 071–075 | done |
| [077](./077-alpha-nan.md) | `alpha` must not emit a colour the runtime ignores | F | 014, 056–059 | done |
| [078](./078-skeleton-surface-pairs.md) | The loading skeleton the contrast contract never checked | F | 014, 019, 063, 071–077 | done |
| [079](./079-secondary-text-state-washes.md) | Secondary text on the state washes | F | 014, 057, 063, 071–078 | done |
| [080](./080-control-edge-on-fills.md) | The control edge on the fills it paints | F | 014, 063, 071–079 | done |
| [081](./081-selection-on-painted-surfaces.md) | The selection wash on the surfaces text is selected on | F | 063, 069, 071–080 | done |
| [082](./082-primary-text-role.md) | The primary role as text | F | 014, 057, 063, 071–081 | done |
| [083](./083-status-text-state-washes.md) | The status text on the state washes | F | 014, 057, 063, 071–082 | done |
| [084](./084-control-boundary-on-state-washes.md) | The control boundary on the washes a row paints | F | 014, 063, 071–083 | done |
| [085](./085-elevation-tint-role.md) | The elevation tint role the theme never painted | F | 011, 018, 056–066 | done |

Plans 010–019 are the `tokens-theme` workstream. They own `packages/tokens`,
`docs/tokens.md` and `docs/design-system.md`; every other plan belongs to the
agent that owns its paths. The block was full at 019 (`010–019` in the table
above) and 020–049 belongs to primitives, icons and Phase C, so the overflow
plans take the free `050–099` block: 050 layering, 051 platform type, 052 font
registration (rescued from the abandoned `agent/fonts` branch, `6fc7641`; its
step 1 was first answered from `references/gpuix` main and then re-checked
against the pinned runtime, which **does not expose the API** — see the plan's
decision section), and 053 the reconciliation of this workstream's two branches.
054 and 055 close the last two open `components` interlocks on the package: the
avatar diameter scale (`components/TODO.md` interlocks, row *"An avatar diameter
scale"*) and the designed filled-control hover roles (the `primaryHover` /
`destructiveHover` row). The earlier interlock rows — the soft status pairs, the
`alpha` helper and the `info` role — were already shipped by plan 014 and only
need the consumer to drop its structural copy. 056 is the Phase F docs-truth
slice for this workstream: it makes `docs/tokens.md`'s colour catalogue fail the
test suite if it drifts from the shipped themes. 057 closes the status-tone
contract: the solid fills are tuned as backgrounds, so status text, icons and
dots drawn on `background`/`card` get their own `xText` tonality (light
`warning` measured 1.78:1 against the canvas). 059 closes the last two drift
surfaces: a `textRoles` index beside `colorRoles` (the docs site had retyped the
ten roles) and the contrast pairs the catalogue claimed but never guarded —
muted text on plain surfaces, typed input text, ghost text on the `hover`/
`active` washes, and the composited `selection` wash. 060 closes the two remaining
false statements in the motion and elevation prose: the runtime animates eight
`MotionStyle` properties, not seven, and the reserved `overlay` level paints
nothing (the "inset ring" comment survived plan 018). 061 closes the last
cross-team interlock on the package's React entry: it carried the package's only
JSX, so a consumer's `jsxImportSource` (`@gpuix/react`) forced the playground to
map a jsx-runtime path that `tokens` must not depend on. The entry now uses
`createElement`, and a consumer-shaped type check guards it. 062 closes the last
unguarded document in this workstream: `docs/design-system.md` carries the
identity metrics, role count, surfaces, type summary and the spacing, density,
radius, icon and avatar scales as prose, and nothing held them to the package
while the catalogue was already guarded. The §9 floor table stays prose because
`color.test.ts` enforces its behaviour on every shipped pair. 063 answers the
platform-style requirement MISSION.md added on 2026-10-17: the platform table
stops being a font-only choice and becomes four editable style variants
(macOS, Linux, Windows, Default) built from the identity through `extendTheme`,
with the high-contrast colour set winning over platform resemblance and the
contrast floors enforced on every variant. 064 closes the last two catalogues
that were still retyped by hand: `platformNames` (the macOS · Linux · Windows ·
Default order the docs toggle and the tables need) and `statusTones` (the four
status families), both derived types, so a fifth platform or tone cannot be
added to the union while a table silently omits it; the status table in
`docs/tokens.md` was unguarded and is now held to the index. 065 closes the last
unguarded document in the package: `packages/tokens/README.md` is the consumer's
front door and repeated the role count, the platform table, the type-role
count, the motion levels and the status families with no test behind them —
its motion paragraph was already missing the `none` level. Both documents are
now built from the implementation one way, like `docs/tokens.md` and
`docs/design-system.md`. 066 closes the last uncovered promise in the reference:
`docs/tokens.md` says “if a token is not here, it is not public”, but seven
public value exports were absent — `defaultDensity`, the four raw colour sets and
the two elevation sets — and nothing enforced coverage. A namespace-wide guard
now fails on any undocumented value export. The same plan makes the platform
“copy a file and edit it” story real: a complete `PlatformStyle` authored from
scratch joins the executed examples, so the documented shape is compiled and
tested, not sketched; the design-system state table also gains the loading row
the mission names. 067 closes the consumer boundary the package was leaving open:
a persisted mode, contrast or platform arrives as `unknown`, and the workstream
that owns the union must ship the narrowing guard. `apps/docs` had already
retyped the platform table and hand-written `isPlatformName`; the package now
exports that guard beside `platformNames`, plus `isThemeMode` and
`isThemeContrast`, and the docs say theming's boundary half is narrowing a
choice, not decoding a theme object. 068 finishes that contract for the two
unions 067 parked: density is a theme choice and a tone is a payload field, so
`densityNames` / `isDensityName` join the preset registry and `isStatusTone`
joins the status index. The package's private `typeof value === "string"` check
is gone — it accepted `"spacious "` and then produced `undefined` metrics through
`extendTheme` — and `scale.test.ts` no longer retypes the preset names. Both
guards narrow `unknown` and are documented under Density, Status tones and Theme
API; the example file resolves a stored density and a payload tone, so the
fallback path runs in the suite rather than being sketched. 069 is the last
truth pass over the role catalogue: the pinned `@gpuix/native@0.10.0` does
declare `selectionColor` and `userSelect` (inherited `StyleDesc` properties), so
`selectionStyle(theme)` now maps the `selection` role to the property the
runtime actually reads, and the reference names the opt-out. The same pinned
types have **no** `scrollbarColor`/`scrollbarWidth` — both are unreleased
changesets on GPUix main — so `scrollbar` is re-described as reserved instead of
a paintable thumb, and no helper ships for a style the runtime ignores. Both
claims are guarded in `docs.test.ts`, because the failure mode is a reference
that silently stops saying how a token is applied. 070 closes the three claims
that survived that pass: the README told a consumer to `nub add` a package that
is private and has never been published; the design-system rationale named the
per-platform mono families with no test behind them; and the mission's
"icon sizing/alignment" item had sizes but no alignment rule. The install guard
reads the manifest's `private` flag, so the README cannot present the wrong half
before or after publication. 071 closes the last promise of the extension story:
the package states WCAG floors and enforces them in its own suites, but a
consumer who edits a copied platform style had no way to apply the same check.
The maths, the 40 documented pairs and the floor table move out of test-only code
into `src/contrast.ts`, and `themeContrastFailures(theme, contrast?)` returns
every pair — including the composited selection wash — that misses its floor, so
an edited theme is held to the library's guarantee in one assertion. Both suites
now consume the same public list and table, so the contract the docs state and
the tests that enforce it cannot drift. 072 closes the last hand-written value
table in the catalogue that no test held: the palette ramps. `color.test.ts`
already proved the palette holds paintable hex, but the values printed in
`docs/tokens.md` could disagree with the export while every suite stayed green.
The guard builds each documented row from `palette` and requires it, so a ramp
edit and a document edit cannot land apart; every value table in the page is now
built from the implementation one way. 073 closes two laxer defaults of the same
family. `applyPlatformStyle(base, style, contrast?)` and
`themeContrastFailures(theme, contrast?)` both defaulted to `"default"`, so a
copied platform style applied to a high-contrast base replaced the AAA palette,
and the one check that exists to catch a broken high-contrast theme measured it
against the default floors. A resolved `Theme` now records the floor set it is
designed against, beside `mode`; both functions default to that declaration, and
`docs/tokens.md`'s `Theme` block is held to the interface so a new field cannot
land undocumented. 074 closes the contract's last blind spot: the list claimed
to hold every documented pair, but it measured the focus ring only against the
canvas, card and popover, status text only against `background` and `card`, and
the control boundary only against `background`, `card` and `input`. Focus and
selection co-occur in every row-based component, so the ring is painted on the
`hover`/`active`/`selected` washes; a control or a status label inside a dialog,
popover or toast is painted on `popover`. The eight missing pairs already pass
in all four colour sets, so no colour moves — the gate now catches a palette
edit that would have shipped a focused selected row with no visible focus.
075 closes the last claims in the catalogue that are sentences rather than
table rows. The status section argues for a separate `xText` tonality with three
measured ratios (light `warning` at 1.78:1 on the canvas and 1.89:1 on `card`,
light `success` at 4.26:1), the design system repeats the first, and the
selection wash is quoted as 24% / 30% in both colour tables and in the
selection section — none of it derived from `lightColors`, so a palette edit
could leave the rationale quoting numbers the theme no longer produces while
`color.test.ts` stayed green. The same audit found the high-contrast table's
four `xText` rows still described the pre-074 contract (no `popover`), and
`compositeOver`'s JSDoc example printed `#808080` for a composite that is
`#7F7F7F`. The guards build each sentence from `contrastRatio`,
`contrastFloors` and the alpha byte, and the `xText` surfaces from
`contrastPairs`, so the next palette, floor or contract edit has to take the
documents with it. 076 closes the two checks the suites ran but the public
contract did not: the 1.05:1 perceivability floor on the soft status surfaces,
and the high-contrast decorative divider. That gap was hiding a real defect —
platform styles changed the canvas but inherited the identity's soft tints, so
nine shipped pairs sat below the library's own floor, the worst being Linux
dark's `destructiveSoft` at 1.005:1 on its card. Five identity soft values move
to tints that clear every shipped canvas with margin, the soft surfaces and the
divider become `surface` and `divider` pairs in `contrastPairs`, and
`themeContrastFailures` now returns them, so an edited platform style is held to
the same guarantee. The pair count moves from 48 to 63, and both documents
derive the new rows and counts from the implementation. 077 fixes a smaller
silent failure on the same palette path: `alpha(color, Number.NaN)` produced
`#2559D6NAN`, a colour GPUix ignores, so a computed fraction with no value could
erase a role. The amount guard returns the input unchanged — the helper's
documented fallback for a value it cannot parse — while `Infinity` and
`-Infinity` keep clamping as before. 078 closes the last painted role the
contract never measured: the loading skeleton. `skeleton` is the fill of a
mission-named state, but it was one of seven roles absent from `contrastPairs`,
so a skeleton could sit invisibly on its card and still pass. The audit found
the same class of platform defect plan 076 fixed for soft tints — Linux dark
measured **1.004:1** on its own card, macOS 1.051 and Windows 1.068, all at or
below the library's 1.05 floor, because every variant inherited the identity's
cool graphite while changing the surface it sits on. The skeleton joins the
`surface` class on `background`/`card`/`popover` (63 → 66 pairs), and the three
real variants now carry their own dark neutral (1.266 / 1.234 / 1.284 on their
cards), matching the identity's own 1.274. Light variants and high contrast are
untouched: the identity value already clears every light canvas, and
`applyPlatformStyle` applies no colours at AAA. 079 closes the last painted
surface the contract never measured, and the same class of platform defect one
role over: secondary text (`mutedForeground`) is painted inside rows whose
background changes with state — a selectable list row uses `accent` on hover,
`active` on press and `selected` when selected, and a combobox option uses
`hover`/`active` — but the pair list checked the role only on `muted`,
`background`, `card` and `popover`. macOS dark measured **4.41:1 on `hover` and
3.55:1 on `active`**, under the 4.5:1 the design system states, while every
other shipped set passed. The four washes join the `secondary` class (66 → 70
pairs), macOS dark lightens `mutedForeground` to `#AEAEB2` and darkens its
pressed wash to `#404042` (5.13 / 4.68 / 5.30 / 5.32 on the four washes), and
`state-text.test.ts` guards both the shipped sets and the exact regression. The
quiet AAA example moves to `#5D5D5D` so it still fails at 7:1 and still passes
the default floors, which is what makes its declared-level assertion meaningful.
080 closes the last decorative role the contract measured only on plain
surfaces: `border`. An outlined control — the secondary Button in `components`,
the `outline` Button and outline toggle in `primitives` — paints its edge on
`secondary`, `hover`, `active` and, when toggled on, `accent`, while the
contract measured it only on `background`, `card` and `popover`. The audit found
the edge and the fill were the **same value** in four colour sets: the identity
light `active`, the identity dark `secondary`/`active`/`accent`, macOS dark
`hover`/`secondary`/`accent`, and high-contrast dark's `active` at 2.53:1 under
the 3:1 AAA divider floor. So an outlined control lost its edge exactly while
pressed. The four fills join the `divider` class
(70 → 74 pairs) and `border` moves one half-step off the fill ladder — light
`#D6DAE1`, dark `#343B47`, macOS dark `#48484A` (Apple's separator grey) and AA
dark `#8A8A8A` — rather than restyling the state fills, which would have pulled
the focus ring or the accent hover wash with them. `control-edge.test.ts` guards
the shipped sets, the exact regression and the public checker, and both
documents derive the new surfaces from the implementation.
081 closes the last painted surface the contrast contract never measured, and
the same class of platform defect one role over: the `selection` wash. It was
measured on `background` and `card`, but text is selected on a dialog's body
(`popover`), in a field (`input`), on a quiet panel (`muted`), on a row under the
pointer (`hover`/`active`), on the accent a selectable row uses, and inside a
selected row. Measuring each surface with the role it actually paints found
four sets under the body floor: high-contrast dark at 6.48:1 on `hover` and
5.49:1 on `active`, Linux dark at 6.92:1 and Windows dark at 6.84:1 on
`active` — each dark variant carried its light accent as the wash base, so the
wash *lightened* the surface white text already sits on. The three washes move
to a darker tint of the same family (`#4C39B54D`, `#1C71D833`, `#0067C033`) with
their alpha unchanged, `selectionPairs` becomes the public nine-surface list, and
`selection-text.test.ts` guards it. The selected row stays a `secondary` pair —
`selectedForeground` over the wash measures 4.80:1 at its lowest, which is the
floor that role already has.
082 closes the last role the contrast contract measured only as a fill.
`primary` is painted as **text** by the primitives Link variant and the
`primary` text tone, but every pair measured only `primaryForeground` on the
fill, so a shipped platform accent could be unreadable as a link while the suite
stayed green. The audit found macOS light at **4.21:1** on the canvas and
**3.44:1** on the pressed wash, macOS dark at **3.82:1** on card/popover and
**2.84:1** on `active`, Linux light at 3.51:1, Linux dark at 4.08:1 and Windows
light at 4.30:1, plus high-contrast dark's `primary` at 6.94:1 under the AAA 7:1
floor. A 54th role, `primaryText`, is the readable tonality — the same
fill-versus-text split plan 057 shipped for status families — measured on the six
surfaces a link actually sits on (`background`, `card`, `popover`, `muted`,
`hover`, `active`), so the pair list moves 74 → 80 and every platform style
carries its own readable step in its own accent family.
083 closes the same blind spot for the status roles: `xText` was measured only on
`background`/`card`/`popover`, but a status label or indicator dot inside a list,
table or menu row sits on the `hover`/`active`/`accent`/`selected` wash the row
paints. Every light set had a warning label below the floor on a pressed row —
macOS **4.22:1**, Linux 4.24:1, Windows 4.36:1 — and high-contrast light failed
all four washes (5.83 on `active`, 6.70 on `accent`/`selected`, 6.92 on `hover`)
under the 7:1 the design system states; Linux and Windows light `selected`
cleared 4.5:1 by four hundredths. The four tones join the four washes (80 → 96
pairs) and the two warning steps move one ramp step each (light `#8E5B00` →
`#6B4500`, high-contrast light `#6B4500` → `#4B3100`), so no other role changes.
084 closes the last functional boundary the contract measured only on plain
surfaces. `borderStrong` is the edge of a field and of an unchecked checkbox or
radio, and those controls sit in rows and quiet panels whose fill changes:
`packages/primitives/src/core/selection.ts` paints the edge on `hover` and
`active`, a selectable row adds `accent` and `selected`, and a settings group
sits on `muted`. Six shipped sets were below the non-text floor there — the
identity light at **2.62:1** on `active` (2.92 on the other four), macOS light at
**2.52:1**, the identity dark at 2.80–2.81, Linux dark at 2.97 on `selected`, and
high-contrast dark at 4.15 under 4.5. The five surfaces join the `boundary`
class (96 → 101 pairs) and five values move one step (identity light `#848E9E` →
`#737C8C`, identity dark `#6B7484` → `#77808F`, high-contrast dark `#A0A0A0` →
`#AAAAAA`, macOS light `#8A8A8E` → `#6E6E73`, Linux dark `#9A9996` → `#A09F9C`).
085 closes the last documented role the package never painted: `shadow` is
described as the elevation tint and every platform style sets it, but no
elevation level read it — `lightElevation` and its dark and platform peers
carried a complete colour per level, so editing `colors.shadow` in a copied
style changed nothing while the same tint was duplicated three times per set.
A level is now geometry plus the alpha to apply to the tint, and
`elevationShadow` composes the runtime's five-field shadow; `elevationShadows`
resolves the whole list for a compositing renderer. The alphas are chosen so
every shipped pixel is unchanged, and a new suite proves that editing the role
retints all three levels.

### Reference adoption (block `200–299`)

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| `200` | Adopt `base-gpui`'s compound-part API contract as the Tier 1–2 public API spec | A | `020`, `030`, `110–117` | planned |
| `201` | Adopt `base-gpui`'s runtime / context / parts state model as our state convention | B | `200`, `020` | planned |
| `202` | Reconcile `adabraka-ui`'s `ThemeTokens` with `@gpuixui/tokens` | B | `010–014`, `020` | done (tokens scope); licensing row open |
| `203` | Adopt `adabraka-ui`'s GPUI limits map as `docs/gpuix-capabilities.md`, re-verified against GPUix 0.10.0 | A | `020`, `110` | planned |
| `204` | Adopt `adabraka-ui`'s workspace and data tiers for Tier 3–4 | A/D | `203`, `020` | planned |
| `205` | Implement the "not provided by GPUix" cluster | C/E | `200`, `201`, `203`, `030`, `110–117` | planned |
| `206` | Port **shadcn/ui's Message Scroller** behaviour — pinned follow, no yank, jump-to-latest, streaming rows | C | `200`, `201`, `203` | planned |
| `207` | Port **shadcn/ui's AI Elements `chat` + `message`** — conversation scaffold and message row (streaming, reasoning, tool calls, sources, retry) | C | `200`, `201`, `206` | planned |

> The `200` block was written by the reference-adoption executor on
> 2026-10-17 from `.agents/slop/reference-research.md`. The per-workstream plans
> (`010–019`, `020–040`, `050–053`, `100–130`, `410–412`) live on their own
> branches and are merged into `main` as each workstream completes; this index is
> the union.

## How to use a plan

1. Read it fully before starting. Do not skim the STOP conditions.
2. Work only inside your own worktree (`workspaces/<workstream>/`).
3. Run every command in the plan; a command that was not run did not pass.
4. On a STOP condition, stop and report with the evidence. Do not improvise a
   workaround that the plan did not authorise.
5. When done, update this table's status column and tick the matching task in
   `TODO.md`.
