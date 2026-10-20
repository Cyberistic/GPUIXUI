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
| `500–699` | tokens and theming overflow (this workstream; numbers are shared across worktrees, so take the next free — `599` and `600` are in use by `playground`) |

A number is a **global identity**, not a per-branch one. Before writing a plan,
check every tree:

```sh
find /Users/cyberistic/GPUIXUI/workspaces -path "*/.agents/slop/plans/NNN-*"
```

If two plans already share a number and only one has been executed, the
unexecuted one renumbers (that is plan `688`); an executed plan keeps its number
and the duplicate is recorded for repo tooling, because renaming history rewrites
references without buying correctness.

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
| [086](./086-total-contrast-contract.md) | A total contrast contract, and the ring on every surface a control sits on | F | 059, 071–085 | done |
| [087](./087-selected-secondary-text.md) | Selected secondary text, and the wash that must stay visible | F | 057, 071, 079, 081, 086 | done |
| [088](./088-body-text-on-panels.md) | Default body text on the quiet panel and the floating surface | F | 071, 079, 086, 087 | done |
| [089](./089-density-metric-merge.md) | Density metrics merge by size | B/F | 011, 068, 070 | done |
| [090](./090-soft-status-border-role.md) | The soft status edge: a designed role, held to its floor | F | 014, 057, 071, 076, 083, 086 | done |
| [091](./091-selection-in-soft-surfaces.md) | Selection inside a soft status surface | F | 014, 063, 071, 081, 087, 090 | done |
| [092](./092-control-boundary-soft-fills.md) | The control boundary on the soft status fills | F | 084, 090, 091 | done |
| [093](./093-ring-on-soft-fills.md) | The focus ring on the soft status fills | F | 086, 090, 092 | done |
| [094](./094-skeleton-on-row-washes.md) | The loading skeleton on the row washes | F | 078, 079, 087, 093 | done |
| [095](./095-soft-fill-divider.md) | The decorative divider on the soft status fills | F | 076, 080, 090, 094 | done |
| [096](./096-control-size-index.md) | The control size index and its narrowing guard | F | 011, 016, 067, 068, 089 | done |
| [097](./097-filled-control-states.md) | Designed hover and pressed roles for every filled control | F | 011, 014, 055, 063, 071, 080, 084 | done |
| [098](./098-brand-theme-truth.md) | The documented brand theme must pass the contract it teaches | F | 011, 013, 055, 071, 082, 097 | done |
| [099](./099-modal-scrim-perceivability.md) | The modal scrim must be perceivable on every surface it covers | F | 013, 071, 073, 076, 086, 087, 094 | done |
| [300](./300-soft-status-quiet-panel.md) | The soft status surface on the quiet panel | F | 014, 063, 071, 076, 090, 094 | done |
| [301](./301-applied-style-contrast-claim.md) | An applied platform style must declare the contrast it carries | F | 063, 071, 073 | done |
| [302](./302-platform-type-bridge.md) | The removed `platformTheme` and its merged consumer | F | 051, 063, primitives `021`/`055` on `master` | done |
| [303](./303-inventory-truth-guard.md) | The inventory row that still called `overlay` exempt | F | 056, 062, 099 | done |
| [304](./304-create-theme-contrast-selection.md) | `createTheme` starts from the contrast variant it names | F | 013, 071, 073, 301 | done |
| [305](./305-theme-axis-indexes.md) | The last two unions without an ordered index | F | 067, 068, 096, 304 | done |
| [306](./306-inactive-control-state.md) | The inactive control: a readable label and an edge that holds its shape | F | 014, 056–062, 071, 073, 076, 084, 086–088, 094, 095, 097 | done |
| [307](./307-inactive-label-soft-fills.md) | The inactive label inside a status panel | F | 090–093, 306 | done |
| [308](./308-soft-edge-surfaces.md) | The soft status edge on the surfaces a badge sits on | F | 090–095, 300, 306 | done |
| [309](./309-state-fills-on-panels.md) | The state fills on the panel they paint on | F | 063, 076–095, 300, 306–308 | done |
| [310](./310-platform-edit-example-contract.md) | The copy-and-own platform example the contract rejects | F | 063, 098, 301, 309 | done |
| [311](./311-platform-recipe-styles.md) | Platform recipe styles: Windows XP (Luna) and Aero | F | 063, 071, 097, 301, 309, 310 | done |
| [312](./312-row-text-on-washes.md) | The row's own text on the washes it paints | F | 059, 071–095, 300, 306–309 | done |
| [313](./313-ledger-role-count.md) | The ledger's second role count | F | 015, 056–066, 303, 311 | done |
| [314](./314-row-surface-text.md) | The selected menu row, the sidebar status label and the link on a row fill | F | 057, 071–095, 300, 306–313 | done |
| [315](./315-canvas-input-text.md) | Typed text on the canvas field | F | 059, 071–095, 088, 306–314 | done |
| [316](./316-selected-label-accent-wash.md) | The selected row's inherited label on the accent wash | F | 059, 071–095, 300, 306–315 | done |
| [317](./317-placeholder-surfaces.md) | The placeholder on every surface a field sits on | F | 059, 071–095, 300, 306–316 | done |
| [318](./318-neutral-press-edge.md) | The neutral control's edge on its designed hover and press | F | 055, 071–095, 097, 306–317 | done |
| [319](./319-input-text-surfaces.md) | Typed text on every surface a field sits on | F | 059, 071–095, 300, 306–318 | done |
| [320](./320-soft-body-text.md) | Default body text on the soft status fills | F | 071, 074, 088, 300, 306–319 | done |
| [321](./321-total-theme-merges.md) | Total theme merges: an explicit `undefined` must inherit | F | 011, 085, 089, 097, 304, 310, 311 | done |
| [322](./322-skeleton-accent-wash.md) | The loading skeleton on the accent a selectable row hovers | F | 071, 078, 094, 300, 309, 312, 314, 316 | done |
| [323](./323-undefined-platform-colour.md) | An `undefined` platform colour is not a colour override | F | 301, 310, 311, 321 | done |
| [324](./324-public-type-index.md) | Name every public type in the reference | F | 066, 071, 086, 311 | done |
| [325](./325-invalid-field-edge.md) | The invalid field edge the contract never measures | F | 057, 071, 074, 084, 092, 306, 312 | done |
| [326](./326-contract-count-truth.md) | The contract's surface counts and pair history | F | 086, 306, 307, 325 | done |
| [327](./327-accent-states.md) | The accent family's missing hover and press | F | 063, 071, 080, 097, 309, 311, 318 | done |
| [328](./328-recipe-windows-dark.md) | A recipe is an edition of Windows in dark too | F | 063, 071, 311 | done |
| [329](./329-recipe-filled-states.md) | The filled-state matrix must include the shipped recipes | F | 097, 311, 328 | done |
| [330](./330-authored-accent-family.md) | The authored platform example's unfinished accent family | F | 063, 310, 327 | done |
| [331](./331-authored-selection-wash.md) | The authored example's selection wash stays on the identity iris | F | 069, 330 | done |
| [332](./332-mark-contrast.md) | The fill as a mark: a graphic needs more than 1.05:1 | F | 057, 082, 097, 309, 314 | done |
| [333](./333-tokens-suite-timeout-budget.md) | The tokens suite must not fail its own gate | F | 061, 311, 332 | done |
| [334](./334-secondary-wash-text.md) | The secondary control's label on the washes it paints | F | 097, 309, 318, 332 | done |
| [335](./335-selected-row-edge.md) | The control edge on the selected row fill | F | 080, 097, 309, 312, 316, 318, 327, 334 | done |
| [336](./336-quoted-figure-guards.md) | The catalogue's last unpinned tightest figures | F | 071, 075, 326, 335 | done |
| [337](./337-native-field-reach.md) | The native field's own hint and selection | F | 069, 317, 319, 331, 335 | done |
| [338](./338-filled-control-family.md) | The filled control's designed family, in one call | F | 055, 097, 327, 334 | done |
| [339](./339-field-adornment-text.md) | The field's adornment text and the check the accent cannot carry | F | 059, 071–095, 300, 306–319, 335 | done |
| [340](./340-invalid-control-ring.md) | The invalid control's focus ring | F | 017, 071–095, 300, 325, 339 | done |
| [341](./341-combobox-check-mark.md) | The combobox check on a highlighted option | F | 071–095, 300, 306–332, 339–340 | done |
| [342](./342-filled-state-steps.md) | The filled family's step in the public contract | F | 071, 097, 306, 327, 338, 341 | done |
| [343](./343-field-pressed-edge.md) | The field's pressed edge in the public contract | F | 071, 084, 325, 340–342 | done |
| [344](./344-selection-on-fill.md) | The selection veil for content on a filled action | F | 069, 071, 081, 087, 091, 099, 343 | done |
| [345](./345-contrast-platform-elevation.md) | A high-contrast platform variant keeps its elevation | F | 063, 073, 085, 301, 311, 323 | done |
| [346](./346-soft-panel-text.md) | The caption and link inside a status panel | F | 071, 076, 082, 088, 307, 320, 339 | done |
| [347](./347-value-track-role.md) | The value indicator's track | F | 071, 076, 300, 309, 332, 338 | done |
| [348](./348-toast-tone-on-floating-card.md) | The toast's tone on its floating card | F | 071, 074, 332, 334, 339, 346, 347 | done |
| [349](./349-pair-uniqueness-and-role-count-guards.md) | Two guards that were not guarding: pair uniqueness and the palette's role count | F | 071, 303, 306, 313, 333, 347 | done |
| [350](./350-runnable-examples.md) | The brand-text example no test runs | F | 082, 349 | done |
| [351](./351-floor-table-pair-classes.md) | The accessibility floor table omits the pair classes it claims to publish | F | 071, 303, 336, 341, 347, 348 | done |
| [352](./352-boundary-row-surfaces.md) | The boundary row omits the surfaces the contract measures | F | 084, 092, 325, 340, 343, 351 | done |
| [353](./353-component-dimensions.md) | Component dimensions: the surface metrics components still hardcode | B | 010, 011, 056–062, 089, 096, 321 | done |
| [354](./354-interaction-state-table.md) | The interaction-state table names the surfaces the contract measures | F | 346, 351, 352 | done |
| [355](./355-documented-snippets.md) | The documented snippets nothing compiles | F | 056, 066, 324, 350 | done |
| [356](./356-jsdoc-example-guard.md) | The source JSDoc examples are unguarded | F | 324, 350, 355 | done |
| [357](./357-wash-state-steps.md) | The generic wash ladder's press | F | 071, 097, 306, 309, 334, 342, 354, 356 | done |
| [358](./358-metric-contract.md) | The numeric half of an editable theme | F | 010–019, 050–072, 071, 086, 089, 096, 342, 353, 355–357 | done |
| [359](./359-modal-scrim-surfaces.md) | The scrim over the surfaces a window actually shows | F | 099, 309, 326, 337, 347, 358 | done |
| [360](./360-metric-completeness.md) | The numeric contract's last ungoverned members | F | 077, 353, 358, 359 | done |
| [361](./361-pill-rounds-largest-avatar.md) | The pill radius must round the largest avatar | F | 054, 353, 358, 360 | done |
| [362](./362-selection-status-panel-text.md) | Text selection in a status panel | F | 091, 320, 346, 351 | done |
| [363](./363-selection-card-foreground.md) | The card's own foreground through a text selection | F | 071, 081, 087, 362 | done |
| [364](./364-motion-contract.md) | The motion group the numeric contract left half-governed | F | 019, 358, 360 | done |
| [365](./365-overlay-scroll-height.md) | The overlay list must fit a row | F | 353, 360 | done |
| [366](./366-status-selection.md) | The status label through a text selection | F | 083, 087, 354, 362 | done |
| [367](./367-type-scale-contract.md) | The type scale must stay a scale | F | 058, 059, 358, 360 | done |
| [368](./368-finite-metrics.md) | Every numeric metric must be paint | F | 358, 360, 364, 367 | done |
| [369](./369-defined-overlay-elevation.md) | A defined elevation level is a level, `overlay` included | F | 085, 358, 360, 368 | done |
| [370](./370-font-weight-metric.md) | A type weight is a paintable number | F | 058, 358, 364, 367, 368 | done |
| [371](./371-colour-role-format.md) | Every colour role is a hex colour the helpers parse | F | 011, 014, 071, 085, 099, 306 | done |
| [372](./372-positive-named-sizes.md) | A named size is a positive size, and the rule index is the type | F | 054, 058, 358, 360–371 | done |
| [373](./373-applied-default-palette.md) | The default palette a caller asked for | F | 011, 063, 073, 301, 323, 345 | done |
| [374](./374-platform-style-over-platform.md) | A platform style applied over another platform's theme | F | 063, 071, 073, 091, 301, 311, 328, 373 | done |
| [375](./375-scrim-over-filled-actions.md) | The modal scrim over the filled actions and status panels a window shows | F | 071, 099, 309, 311, 359 | done |
| [376](./376-design-system-elevation-truth.md) | The design-system's elevation paragraph | F | 315, 326, 337, 345, 352, 359, 375 | done |
| [377](./377-design-system-figures.md) | The design-system's current scrim and wash-link figures | F | 062, 075, 087, 336, 375, 376 | done |
| [380](./380-stored-theme-choice.md) | The persisted theme choice, resolved in one place | F | 051, 063, 067, 068, 096, 301, 304, 305, 311, 323, 373, 374 | done |
| [381](./381-selected-row-step.md) | The selected row is a perceivable step from the hover wash | F | 016, 059, 081, 097, 309, 327, 342, 357, 380 | done |
| [382](./382-accent-fill-selection.md) | The accent family's text selection on its filled action | F | 097, 327, 344, 381 | done |
| [383](./383-total-theme-check.md) | One total check for an edited theme | F | 071, 073, 358, 371, 380 | done |
| [384](./384-content-box-fit.md) | A size that must fit must fit the content box | F | 353, 358, 360, 365, 372 | done |
| [385](./385-typeface-contract.md) | The typeface half of an editable theme | F | 011, 051, 070, 324, 358, 371, 383 | done |
| [386](./386-body-line-fit.md) | The smallest field must fit a body line | F | 011, 353, 358, 360, 367, 384 | done |
| [387](./387-shipped-theme-enumeration.md) | The shipped-theme enumeration the package owns | F | 063, 305, 311, 380, 383 | done |
| [388](./388-shipped-list-migration.md) | Every "every shipped set" suite enumerates the one shipped set | F | 387 | done |
| [389](./389-platform-style-numeric-groups.md) | A platform style carries every numeric scale | B | 051, 063, 311, 321, 353, 358 | done |
| [390](./390-elevation-ladder.md) | The elevation ladder | F | 085, 358, 368, 369 | done |
| [391](./391-contrast-reference.md) | The contrast reference names its lists | F | 071, 086, 307, 344, 375, 382 | done |
| [392](./392-text-hierarchy.md) | The text tiers must stay a hierarchy | F | 306, 309, 317, 351, 383, 387, 388, 391 | done |
| [393](./393-loading-pulse.md) | The loading pulse must stay visible | F | 019, 094, 309, 322, 358, 391, 392 | done |
| [394](./394-soft-status-panel-action.md) | The action inside a soft status panel | F | 014, 090, 092, 093, 097, 300, 309, 338, 356, 371, 383, 387, 393 | done |
| [395](./395-scrim-over-panel-action.md) | The scrim over the panel action | F | 099, 359, 375, 394 | done |
| [396](./396-type-index-claims.md) | The type index's counts, its weight claim and the colour-format count | F | 324, 370, 394, 395 | done |
| [397](./397-status-panel-action-scope.md) | The panel action's scope: a tinted panel, not a floating card | F | 348, 362, 392, 394, 395, 396 | done |
| [398](./398-theme-check-index.md) | The check count and the composition suites' subset | F | 071, 358–364, 371, 383, 385, 392, 396 | done |
| [399](./399-solid-status-fill.md) | The solid status fill and its one call | F | 014, 057, 071, 083, 090, 300, 308, 309, 314, 332, 347, 371, 383, 387, 388, 394, 398 | done |
| [500](./500-text-hierarchy-surface-body-roles.md) | The text hierarchy on each surface's own body role | F | 059, 071, 315, 319, 371, 383, 387, 388, 391, 392, 398 | done |
| [501](./501-floor-table-scrim-row.md) | The accessibility floor table's modal scrim row | F | 099, 359, 375, 395, 351, 352, 354, 398, 500 | done |
| [502](./502-interaction-direction.md) | The interaction ladder's direction in the total check | F | 097, 327, 342, 357, 381, 383, 387, 388, 394, 398 | done |
| [503](./503-track-row-washes.md) | The value indicator's groove on the row washes and status panels | F | 347, 094, 322, 300, 309, 366, 381, 388 | done |
| [504](./504-solid-status-chip-selection.md) | The solid status chip and the panel action on the inverse selection veil | F | 344, 382, 394, 399 | done |
| [505](./505-elevation-tint-aaa-dark.md) | The elevation tint on the AAA dark canvas | F | 085, 099, 345, 371, 390, 393 | done |
| [506](./506-selected-row-title-selection.md) | The selected row's title through the text-selection wash | F | 081, 087, 312, 363, 381, 387, 391 | done |
| [507](./507-dialog-face-on-scrim.md) | The dialog's face on the scrim | F | 099, 359, 375, 395, 505, 506 | done |
| [508](./508-solid-chip-on-scrim.md) | The solid status chip on the scrim | F | 099, 359, 375, 395, 399, 504, 507 | done |
| [509](./509-elevation-persistent-surfaces.md) | The elevation shadow over the persistent selected row and the field a drop-up opens over | F | 085, 099, 359, 505, 507 | done |
| [510](./510-inactive-label-selection-wash.md) | The unavailable label through the text-selection wash | F | 306, 087, 091, 362, 366, 392, 506 | done |
| [511](./511-native-field-caret.md) | The native field's caret is the accent | F | 337, 332, 315–319, 350, 387 | done |
| [512](./512-panel-action-selection.md) | The panel action's label through the text-selection wash | F | 091, 362, 394, 506, 510, 387 | done |
| [513](./513-selection-veil-pointer-states.md) | The inverse veil's pointer-state gap and its stale rationale | F | 344, 382, 504, 506, 510, 387 | done |
| [514](./514-disabled-panel-action.md) | The disabled action inside a status panel | F | 306, 307, 392, 394, 397, 500, 502, 512, 513 | done |
| [516](./516-ring-on-value-groove.md) | The focus ring on the value groove | F | 086, 093, 332, 342, 347, 354, 384, 503 | done |
| [517](./517-keycap-surface-metric.md) | The keycap surface a theme cannot own or check | F | 011, 353, 358, 360, 367, 384, 386 | done |
| [518](./518-shipped-weight-claims.md) | The shipped weight set, in one index and two last claims | F | 011, 367, 370, 387, 391, 396 | done |
| [519](./519-motion-scale-indexes.md) | The motion scale's ordered indexes | F | 019, 064, 096, 305, 364, 372, 387, 518 | done |
| [520](./520-disabled-panel-action-selection.md) | The disabled panel action through the inverse selection veil | F | 306, 344, 394, 397, 399, 504, 510, 512, 513, 514 | done |
| [521](./521-inline-icon-line-fit.md) | The inline icon must fit its line box | F | 353, 358, 367, 372, 384, 386 | done |
| [522](./522-inline-avatar-row-fit.md) | The inline avatar must fit the dense row it leads | F | 054, 358, 360, 372, 386, 521 | done |
| [523](./523-control-horizontal-padding.md) | A control's horizontal padding is a shape, not a number | F | 089, 358, 368, 372, 384, 517 | done |
| [524](./524-disabled-selection-wash.md) | The selection wash on the unavailable control's fill | F | 071, 081, 087, 306, 307, 510 | done |
| [525](./525-row-text-selection.md) | The row's own text through a text selection | F | 071, 081, 087, 312, 316, 363, 506, 510 | done |
| [526](./526-dialog-face-on-content.md) | The dialog's face over the content a window shows | F | 099, 359, 371, 375, 383, 395, 507, 508, 509, 525 | done |
| [527](./527-field-text-row-washes.md) | The field's typed text and hint on the row washes | F | 071, 081, 087, 306, 315, 317, 319, 392, 500, 506 | done |
| [528](./528-link-through-text-selection.md) | The link through a text selection | F | 071, 081, 082, 087, 314, 346, 351, 362, 366, 377, 391, 500, 506, 510, 525, 527 | done |
| [529](./529-shareable-theme-choice.md) | A shareable theme choice: the URL boundary | F | 067, 068, 096, 305, 311, 380, 383, 387 | done |
| [530](./530-drawer-chat-carousel-dimensions.md) | The fixed surface metrics plan 353 left in consumers | B | 353, 358, 368, 384, 389, 396 | done |
| [531](./531-metric-member-completeness.md) | The numeric contract's member completeness | F | 358, 360, 364, 368, 369, 370, 372, 530 | done |
| [532](./532-non-finite-diagnostics.md) | One diagnostic per non-finite metric | F | 358, 360, 364, 393, 531 | done |
| [533](./533-typeface-exact-family.md) | The typeface form: padded and CSS-generic family names | F | 051, 385, 396, 518, 532 | done |
| [534](./534-platform-density-metrics.md) | A platform style owns the metrics inside its density preset | F | 011, 089, 353, 380, 389, 529 | done |
| [535](./535-platform-table-and-figures.md) | The platform table and files tell the truth about the values they ship | F | 389, 506, 526, 528, 534 | done |
| [536](./536-present-tense-figures.md) | The catalogue's present-tense figures | F | 336, 348, 377, 503, 514, 520 | done |
| [537](./537-tier-figures.md) | The tier figures the two documents quote | F | 392, 500, 510, 520, 527, 536 | done |
| [538](./538-tier-surface-counts.md) | The tier paragraph's surface counts | F | 392, 500, 527, 537 | done |
| [539](./539-disabled-dim-figure.md) | The disabled dim's documented figure | F | 306, 336, 537, 538 | done |
| [540](./540-colour-role-opacity-form.md) | The alpha form of a colour role | F | 371, 383, 398, 505, 508, 509 | done |
| [541](./541-applied-level-palette-name-elevation.md) | The applied theme's level, name, palette and elevation agree | F | 073, 301, 323, 373, 505 | done |
| [542](./542-shareable-choice-density-rule.md) | The shareable choice's density rule | F | 380, 529, 534 | done |
| [543](./543-contrast-floor-class-index.md) | The contrast contract's floor classes have no owner | F | 071, 303, 313, 326, 351, 372, 519 | done |
| [544](./544-quoted-figure-extent.md) | The catalogue's quoted tightest figures are measured on ten of twenty-four sets | F | 380, 387, 388, 536–538 | done |
| [545](./545-applied-style-name-idempotence.md) | Applying a platform style twice appends its label twice | F | 371, 373, 374, 541 | done |
| [546](./546-pair-list-uniqueness-owner.md) | "Every exported pair list" checked 28 of 35 | F | 071, 339, 340, 349, 393, 394, 510, 514, 516 | done |
| [547](./547-interactive-fill-family-index.md) | The interactive-fill index retypes the families it says it derives | F | 097, 309, 327, 342, 502, 546 | done |
| [548](./548-soft-status-tone-index.md) | The soft-status lists retype the tone index | F | 014, 057, 090, 091, 300, 307, 347, 394, 503, 508, 546, 547 | done |
| [549](./549-status-text-tone-index.md) | The status-text pairs retype the tone index | F | 014, 057, 083, 314, 546–548 | done |
| [550](./550-border-width-ladder.md) | The strong border may not be thinner than the thin one | F | 017, 358, 360, 372, 523, 533 | done |
| [551](./551-undefined-platform-colour-palette.md) | An `undefined` platform colour inherits the palette it asked for | F | 301, 321, 323, 373, 545 | done |
| [552](./552-scale-ladder-totality.md) | Every size ladder walks the theme's own scale | F | 358, 360, 519, 531, 547–550 | done |
| [553](./553-documented-brand-and-builder-examples.md) | The documented brand is a theme the contract rejects | F | 098, 347, 355, 356, 526 | done |
| [554](./554-surface-metric-sign.md) | Every surface metric is a size, and every border is a width | F | 358, 360, 530, 531, 552 | done |
| [555](./555-border-rationale-and-duplicate-claim.md) | The border rationale names five of the measured surfaces, and prints one rule twice | F | 080, 084, 300, 318, 327, 352, 550 | done |
| [556](./556-dialog-calendar-and-mark-dimensions.md) | The dialog, calendar and mark metrics the dimension audits missed | B/F | 353, 389, 530, 550, 554 | done |
| [557](./557-native-field-caret-mark.md) | The native field's caret is ink, not a fill | F | 082, 332, 337, 511, 527, 546 | done |
| [558](./558-opaque-alpha-suffix.md) | The opaque `FF` spelling the format checks accept and the maths cannot read | F | 371, 540, 557 | done |
| [559](./559-platform-easing.md) | A copied platform style owns its easings | B/F | 019, 321, 364, 389 | done |
| [563](./563-caret-mark-list.md) | The caret mark outside the mark list | F | 332, 341, 351, 399, 557 | done |
| [564](./564-quoted-family-name.md) | A quoted family name is CSS syntax, not a family | F | 385, 533, 540, 558 | done |
| [565](./565-colour-form-index.md) | The alpha form owns its two members | F | 540, 543, 558 | done |
| [566](./566-overlay-feather-ladder.md) | A defined `overlay` joins the elevation feather ladder | F | 369, 390, 552 | done |
| [567](./567-contract-prose-counts.md) | The guarantee's two counts have one owner each | F | 387, 398, 540, 543, 544 | done |
| [568](./568-theme-extreme-bounds.md) | The largest and smallest are the theme's own | F | 361, 372, 531, 552, 554, 566 | done |
| [569](./569-native-text-theme.md) | The native text theme: code, diff and markdown | F | 011, 051, 082, 332, 337, 399, 511, 527, 557 | done |
| [572](./572-native-text-metric-scale.md) | The native text metrics that hold type | F | 367, 569 | done |
| [573](./573-native-find-highlight.md) | The find-highlight wash the native text theme feeds | F | 069, 081, 087, 337, 569 | done |
| [574](./574-native-syntax-document-surfaces.md) | The native syntax palette on every document surface | F | 088, 319, 503, 528, 569, 572, 573 | done |
| [581](./581-native-highlight-step.md) | The active find match must be a perceivable step | F | 342, 381, 573 | done |
| [582](./582-native-highlight-code-surface.md) | The find highlight on the painted code surface | F | 569, 573, 574, 581 | done |
| [583](./583-native-text-fades.md) | The native document's fades and ink wash in the public contract | F | 071, 399, 569, 572–574, 581–582 | done |
| [584](./584-elevation-on-content.md) | The floating element's shadow on the content it opens over | F | 375, 508, 509, 526 | done |
| [585](./585-native-text-runtime-metrics.md) | The two native-text metrics a brand is told it can set | F | 569, 572, 583 | done |
| [588](./588-native-chrome-washes.md) | The native document's chrome washes | F | 569, 572–574, 583, 585 | done |
| [589](./589-native-code-block-edge.md) | The native code block's own edge on its body ink wash | F | 574, 583, 585, 588 | done |
| [590](./590-inline-code-accent-wash.md) | Inline code text on its accent wash | F | 082, 314, 528, 569, 574, 589 | done |
| [591](./591-native-diff-row-tint.md) | The native diff row tint | F | 332, 574, 582, 583, 588–590 | done |
| [592](./592-native-diff-chrome-type.md) | The native diff chrome must fit the type the runtime paints | F | 569, 572, 585, 588, 591 | done |
| [595](./595-field-control-fill.md) | The interactive fill a control paints inside a field | F | 309, 353, 357, 394, 503, 527 | done |
| [596](./596-control-glyph-fit.md) | The matching icon must fit its control | F | 358, 372, 384, 517, 521, 552 | done |
| [598](./598-notification-panel-dimensions.md) | The notification inbox's fixed surface metrics | F | 353, 358, 365, 384, 530, 556, 568 | done |
| [601](./601-date-field-width.md) | The date field's fixed width and the overlay's false calendar claim | F | 353, 358, 384, 556, 598 | done |
| [602](./602-diagnostic-order-truth.md) | The diagnostic order the documents retype | F | 383, 398, 540, 573, 583 | done |
| [603](./603-toast-countdown-groove.md) | The Toast countdown's groove | F | 347, 348, 503, 602 | done |
| [604](./604-timeline-marker-metrics.md) | The Timeline marker's fixed metrics | B/F | 353, 358, 530, 552, 554, 556, 568, 598, 601 | done |
| [605](./605-disabled-control-helper.md) | The disabled state as one call | F | 306, 307, 510, 514, 520, 524, 539 | done |
| [607](./607-highlight-radius.md) | The find wash's corner is the theme's | F | 573, 581, 582, 590 | done |
| [609](./609-inset-focus-ring.md) | The focus indicator on a filled control | F | 017, 085, 097, 327, 338, 340, 394, 605 | done |
| [610](./610-scrim-over-resting-fills.md) | The scrim over the fills it excluded | F | 099, 359, 375, 394, 395, 399, 508, 509, 584 | done |
| [611](./611-content-ring.md) | A ring that stays visible on arbitrary content | F | 017, 069, 071, 332, 383, 391, 398, 399, 609, 610 | done |
| [613](./613-ring-figures.md) | The content ring's quoted figures | F | 544, 611 | done |
| [616](./616-docs-source-links.md) | The catalogue's four dead source links, and a link guard | F | 355, 356, 613 | done |
| [617](./617-ledger-check-counts.md) | The ledger's check counts, in one owner | F | 398, 567, 602, 611 | done |
| [618](./618-applied-default-elevation.md) | A default request takes the requested palette's elevation opacity | F | 301, 373, 505, 541, 545, 551 | done |
| [619](./619-selection-row-press.md) | The selectable row's press step | F | 327, 357, 381, 502, 595 | done |
| [620](./620-fixed-surface-chrome.md) | The fixed surfaces hold their own chrome | F | 353, 358, 384, 531, 556, 598, 601, 604, 619 | done |
| [621](./621-time-segment-two-digits.md) | The time segment holds two digits | F | 358, 384, 552, 556, 620 | done |
| [622](./622-row-press-direction.md) | The selectable row's press direction | F | 502, 619, 621 | done |
| [623](./623-selected-label-tier.md) | The selected row's label is a tier below its title | F | 312, 316, 381, 500 | done |
| [624](./624-field-query-and-action.md) | The field minimum holds the query and the action it documents | F | 353, 358, 384, 523, 620 | done |
| [625](./625-dialog-drawer-shell-chrome.md) | The dialog and drawer shells hold their close control | F | 353, 358, 556, 598, 620, 624 | done |
| [627](./627-surface-border-fit.md) | The fixed surfaces fit their own border | F | 353, 358, 384, 598, 620, 625 | done |
| [629](./629-notification-inbox-header.md) | The notification inbox holds its header | F | 353, 358, 598, 620, 625, 627 | done |
| [631](./631-toast-dismiss-control.md) | The Toast card holds its dismiss control | F | 353, 358, 620, 627, 629 | done |
| [632](./632-date-disclosure-icon.md) | The date field's disclosure glyph is the icon tier it paints | F | 353, 358, 384, 556, 601, 627, 631 | done |
| [634](./634-field-query-leading-icon.md) | The field's query row charges the icon it paints | F | 353, 358, 384, 624, 632 | done |
| [636](./636-toast-tone-bar-token.md) | The Toast's tone bar is a token the card holds | B | 353, 358, 620, 627, 631 | done |
| [637](./637-panel-action-figures.md) | The panel action's rationale figures have one owner | F | 394, 397, 399, 503, 619 | done |
| [638](./638-field-adornment-glyph-fit.md) | The field's adornment holds the glyph it paints | F | 353, 358, 386, 517, 620, 624, 634 | done |
| [641](./641-fit-bound-usability.md) | A fit bound that is no bound | F | 358, 521, 522, 532 | done |
| [642](./642-elevation-shape-count.md) | A level the runtime half-paints | F | 018, 085, 369, 566, 641 | done |
| [643](./643-mark-stroke-floor.md) | A mark thinner than the hairline | F | 332, 353, 556, 598, 601, 604, 636 | done |
| [645](./645-fixed-surface-insets.md) | The fixed surfaces count every inset they paint | F | 353, 365, 384, 523, 625, 627, 629, 634, 636 | done |
| [646](./646-f32-metric-range.md) | A metric must survive the renderer's 32-bit cast | F | 358, 360, 364, 368, 531, 532, 641, 643 | done |
| [649](./649-native-highlight-diff-tint.md) | The find highlight on the native diff's row tint | F | 569, 573, 574, 581, 582, 591, 602 | done |
| [650](./650-disabled-field-input.md) | The disabled field's label on the fill it edits | F | 306, 317, 510, 524, 539 | done |
| [651](./651-selected-row-press.md) | The selected row's press | F | 381, 506, 619, 623 | done |
| [655](./655-source-example-imports.md) | Every source `@example` is a copyable module | F | 355, 356 | done |
| [656](./656-copyable-theme-declarations.md) | Every copyable block declares the theme it paints with | F | 355, 356, 655 | done |
| [658](./658-recipe-edit-family.md) | The documented recipe edit must own its whole family | F | 310, 311, 318, 327, 330, 331, 355, 389 | done |
| [659](./659-field-content-surfaces.md) | The field's own content inside a status panel and a pressed selected row | F | 092, 306, 307, 315, 317, 319, 391, 527, 649, 651 | done |
| [663](./663-selected-label-fills.md) | The pressed selected row's label and text-role count in the prose | F | 316, 506, 623, 651, 659 | done |
| [664](./664-ledger-pair-counts.md) | The ledger's pair counts and the pressed fill in the hierarchy | F | 071, 398, 525, 617, 651, 659, 663 | done |
| [665](./665-elevation-content-prose.md) | The elevation-content prose names every fill, not nine of fifteen | F | 376, 584, 610, 617 | done |
| [666](./666-scrim-explanation-chips.md) | The scrim explanation names the three chips it counts | F | 099, 375, 508, 610, 617 | done |
| [667](./667-chip-chrome-fit.md) | The chip holds the chrome inside it | F | 353, 384, 624, 636, 638 | done |
| [668](./668-scale-indexes.md) | The numeric scales' ordered indexes | F | 056, 058, 324, 358, 519, 531, 552, 066 | done |
| [669](./669-metric-member-index-owner.md) | The metric-member index's documented owner | F | 324, 531, 668 | done |
| [670](./670-example-links.md) | Every executed example is linked from a consumer document | F | 350, 355, 356, 616, 668 | done |
| [671](./671-invalid-ring-pressed-row.md) | The invalid focus ring on a pressed selected row | F | 325, 340, 352, 354, 383, 651 | done |
| [672](./672-link-pressed-row-surfaces.md) | The pressed row among the link's surface lists | F | 314, 346, 528, 651, 671 | done |
| [673](./673-state-ladder-index.md) | The interaction ladders' ordered index | F | 502, 622, 651, 668, 672 | done |
| [674](./674-disabled-press-surfaces.md) | The disabled label and the divider on the pressed selected row | F | 306, 335, 510, 650, 651, 671 | done |
| [678](./678-default-platform-mono.md) | The Default platform variant must carry the identity's mono | B/F | 051, 063, 070, 535 | done |
| [679](./679-invalid-focus-ring.md) | The invalid focus ring is a state with no resolver | F | 017, 340, 609, 671 | done |
| [681](./681-check-ordinals.md) | The check ordinals the JSDoc retyped | F | 056, 602, 617 | done |
| [682](./682-caret-surface-owner.md) | The caret sentence publishes one pair as nine | F | 557, 681 | done |
| [683](./683-chip-surface-count.md) | The chip surface count plan 651 left at eight | F | 308, 399, 651, 682 | done |
| [684](./684-remaining-eight-surface-counts.md) | The last two eight-surface counts after plan 651 | F | 308, 399, 651, 683 | done |
| [685](./685-theme-diff.md) | The inverse of `extendTheme`: an edited theme as overrides | F | 011, 051, 063, 085, 089, 321, 353, 389, 529 | done |
| [686](./686-density-boundary-truth.md) | A stale density keeps the preset; the page says it empties the metrics | F | 068, 089, 380, 534, 685 | done |
| [688](./688-plan-number-collision.md) | The plan-number collision at `433`, and the rule it exposes | F | 311, 052 | done |
| [689](./689-field-text-selection.md) | A field's typed text through a text selection | F | 071, 087, 362, 506, 510, 527, 528, 659 | done |
| [692](./692-platform-variant-owner.md) | The platform registry's retyped variant lists | F | 051, 063, 067, 387, 609, 678 | done |
| [695](./695-blockquote-body-role.md) | The blockquote's painted body role | F | 569, 583, 588, 649 | done |
| [698](./698-selected-option-check.md) | The selected option's check on its selected fill | F | 332, 341, 557, 651 | done |
| [700](./700-pressed-option-label.md) | A menu option's label on the pressed selected fill | F | 314, 359, 651, 659, 698 | done |
| [703](./703-design-system-inactive-surface-count.md) | The design system's inactive-label surface count | F | 510, 650, 674, 689 | done |
| [705](./705-caret-fill-figures.md) | The caret's shipped fill figures after plan 698 | F | 511, 557, 682, 698 | done |
| [706](./706-track-rejected-roles.md) | The value groove's rejected roles | F | 309, 332, 347, 503, 698, 705 | done |
| [709](./709-primary-text-cell-washes.md) | The brand-toned text cells' washes | F | 082, 314, 528, 651, 672 | done |
| [710](./710-row-press-rejected-fill.md) | The row press's rejected fill | F | 332, 502, 619, 622, 651, 698, 705, 706 | done |
| [711](./711-composition-matrix-budget.md) | The composition matrix's own budget | F | 333, 374, 398, 618 | done |
| [713](./713-no-mutation-contract.md) | The extension mechanism's no-mutation contract | F | 011, 016, 063, 311, 321, 389, 685 | done |
| [714](./714-caret-pair-figure.md) | The caret pair's quoted tightest figure | F | 557, 563, 590, 698, 705, 706, 710 | done |
| [716](./716-highlight-figures.md) | The find-highlight JSDoc figures no test derives | F | 573, 574, 581, 590, 649, 710, 714 | done |
| [717](./717-jsdoc-figures.md) | The figures the package's own JSDoc and five page sentences state, and the one hard set count | F | 536, 544, 613, 637, 705, 706, 714, 716 | done |
| [720](./720-density-consumer-exception.md) | The density promise the shipped field family and Button no longer keep | F | 010, 089, 353, 389, primitives `370`–`372` | done |
| [723](./723-pressed-row-selection-wash.md) | The pressed selected row's text selection | F | 081, 524, 651, 689, 700 | done |
| [725](./725-scale-ladder-indexes.md) | The scale ladders the tests still retype | F | 068, 096, 305, 372, 552, 668 | done |
| [727](./727-stored-theme-edit-base.md) | A stored edit records the base it was made against | F | 063, 311, 380, 529, 685, 713 | done |
| [729](./729-soft-panel-caption-tier.md) | The soft status panel's caption is not a tier below its ink | F | 320, 346, 362, 392, 500, 623, 703 | done |
| [733](./733-unchecked-selection-control.md) | The unchecked selection control's off switch and its unmeasured knob | F | 084, 332, 347, 503, 601, 651 | done |
| [737](./737-disabled-fill-surface.md) | The disabled fill is a fill: measured on the panel it paints on | F | 306, 309, 595, 610, 733 | done |
| [742](./742-pressed-row-exclusion-reason.md) | The pressed row's exclusion reason, after plan 723 | F | 359, 651, 663, 674, 700, 723 | done |
| [744](./744-brand-edit-storage.md) | The brand edit `ThemeEdit` already carries | F | 685, 727, 742 | done |
| [745](./745-light-brand-total-check.md) | The documented light brand fails the one-call guarantee | F | 098, 553, 574, 611–617, 742, 744 | done |
| [747](./747-disabled-fill-exemption-claims.md) | The disabled fill's exemption, in the three passages plan 737 missed | F | 306, 737, 742 | done |
| [749](./749-placeholder-surface-claims.md) | The placeholder role's surface claims | F | 317, 527, 651, 659, 747 | done |
| [750](./750-disabled-fill-palette-and-status-claims.md) | The disabled fill's reason in the palette doc and the status paragraph | F | 306, 737, 747, 749 | done |
| [753](./753-dimensions-consumer-reach.md) | The dimensions promise the shipped components do not keep | F | 353, 556, 720 | done |
| [754](./754-pair-enforcement.md) | A published pair list is enforced, not only unique | F | 071, 349, 546, 651, 737 | done |
| [755](./755-canonical-density.md) | The canonical link writes the density it resolves | F | 380, 529, 534, 542, 688 | done |
| [757](./757-tint-measurement-claims.md) | The tint is measured, and three passages still say it is not | F | 085, 371, 505, 747–750, 754 | done |
| [758](./758-theme-edit-member-boundary.md) | The edit artifact that drops a scale member the theme declares | F | 685, 727, 744 | done |
| [760](./760-native-text-figures.md) | The native-text figures have one owner | F | 071, 544, 569–592, 717 | done |
| [766](./766-status-row-surface-claims.md) | The status row counts a list of eight and names seven surfaces | F | 399, 548, 549, 651, 683 | done |
| [767](./767-status-fill-chip-count.md) | The package front door counts eight solid chip surfaces | F | 399, 651, 683, 766 | done |
| [770](./770-washed-inactive-figure.md) | The washed unavailable label's AAA figure is stale, and three more washed figures have no owner | F | 510, 512, 520, 714, 717, 745, 760 | done |
| [772](./772-inset-ring-figures.md) | The inset ring's figure and count have one owner, and the source-count guard cannot see `sixteen` | F | 609, 717, 760, 770 | done |
| [774](./774-index-paragraph-counts.md) | The index paragraph states four catalogue sizes, and none has an owner | F | 059, 064, 066, 327, 398, 611 | done |
| [775](./775-readme-index-counts.md) | The front door's index paragraph states four catalogue sizes, and none has an owner | F | 064, 519, 774 | done |
| [777](./777-readme-elevation-paragraph.md) | The front door's elevation paragraph, and the twelve fills it states of fifteen | F | 347, 584, 610, 619, 665, 737, 749, 775 | done |
| [778](./778-aaa-elevation-tint.md) | The AAA elevation tint and its three alphas, in three unguarded passages | F | 085, 099, 376, 505, 777 | done |
| [780](./780-hex-guard-boundary.md) | The one boundary guard that cannot take a boundary value | F | 067, 068, 096, 371, 540, 565 | done |
| [781](./781-platform-style-text-step.md) | The three platform headers that name the wrong readable ink | F | 063, 082, 528, 591 | done |
| [785](./785-brand-example-figures.md) | The brand example's quoted figures have one owner | F | 098, 526, 536, 544, 698, 760 | done |
| [787](./787-ledger-scale-ranges.md) | The ledger's scale ranges: the avatar range and the density ladder it hid | F | 054, 062, 303, 313, 664, 725, 766, 767 | done |
| [789](./789-selection-press-veil.md) | The pressed selected row's veil: the mode's extreme, not the canvas | F | 081, 651, 723, 742 | done |
| [792](./792-native-syntax-capture-table.md) | The native syntax capture paragraph: its roles and its three counts | F | 569, 574, 583, 592, 717, 760 | done |
| [793](./793-native-field-table.md) | The native field table's role assignments | F | 569, 574, 583, 592, 792 | done |
| [794](./794-edit-artifact-defined-overlay.md) | The edit artifact refuses a defined `overlay` level it can carry | F | 685, 758 | done |
| [795](./795-platform-disabled-step-figures.md) | The disabled fill's step off its platform surfaces has no owner | F | 535, 737, 781 | done |
| [798](./798-linux-wash-premise.md) | The Linux wash rationale's figure and its premise | F | 506, 535, 710, 781, 795 | done |
| [799](./799-aero-disabled-rationale.md) | The Aero recipe's disabled-fill rationale has no owner | F | 535, 737, 795 | done |
| [800](./800-recipe-status-ink-ranges.md) | The recipes' three inherited status-ink ranges have no owner | F | 535, 574, 582, 649, 799 | done |
| [803](./803-palette-rationale-figures.md) | The palette's inline rationale figures have no owner | F | 504, 528, 729, 737, 800 | done |

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
086 makes the contract total, which is the end state of the 076–084 sequence.
The focus ring is measured on the eight surfaces a focused control can sit on —
plan 074 had added the three state washes but not the `muted` panel a sidebar
control sits on or the `accent` wash a selectable row paints. Both shipped pairs
already cleared the floor, so no colour moves (101 → 103 pairs). The same plan
turns the one-at-a-time audit into a guard: a completeness suite fails when a
colour role is neither measured by `contrastPairs`/`selectionPairs` nor on a
declared exemption list with a reason (`disabled`/`disabledForeground`,
`overlay`, `scrollbar`, `shadow`), so a 55th role cannot ship with no contrast
story.
087 closes the other half of plan 081's selection story: the wash was measured
with the body text role each surface uses, but a drag-select also covers the
`mutedForeground` row description, card caption, table metadata and timestamp
under it. Seven of the ten shipped sets were below the 4.5:1 secondary floor
there — identity light 4.06:1 and identity dark 3.49:1 on a pressed row, macOS
light 3.96:1, macOS dark 3.89:1, Linux light 3.87:1, Linux dark 4.10:1 on a
selected row and Windows light 3.88:1. The same audit found the wash itself had
no perceivability pair: a future edit could make the new pairs pass by erasing
the highlight. `mutedForeground` moves one step away from the canvas in the
seven failing sets (identity to neutral 700/300, each platform inside its own
grey family), `selectionPairs` gains the nine secondary pairs (9 → 18),
`selectionWashPairs` adds one `surface` pair per surface a glyph is selected on
(9), and `themeContrastFailures` reports both. Windows dark and both
high-contrast sets already passed and do not move. Accent-toned text under a
wash is documented as a deliberate omission: at AAA no wash that stays visible
can keep a link or status tone at 7:1 (high-contrast light's `primaryText`
measures 6.75:1 on the `muted` panel and 5.48:1 on `active` with the shipped
wash).

088 closes the surface gap the role-level guard from 086 cannot see: `foreground`
is measured, but on four of the six surfaces it paints. An avatar's fallback
initials sit on the `muted` disc and a date picker's month header sits on its
`popover`, and the primitives make both compositions first-class — `Surface`
accepts `muted` and `popover`, and the default `Text` tone is `foreground`. Both
pairs pass in all ten shipped colour sets (11.65:1 at the lowest), so no colour
moves; the pair list grows 103 → 105 and the gate now catches an edited theme
that darkens its quiet panel or floating surface.

089 closes a gap between the documentation and the extension mechanism rather
than between two checks: `docs/tokens.md` promised `density` accepts "partial
metrics", but `Partial<Density>` only made each *field* optional — a consumer
changing one control height had to retype all three sizes — and `mergeDensity`
replaced the record wholesale, so a forced partial override dropped the sizes it
omitted. `DensityOverrides` makes the promise expressible and the merge
deep-merges `controlHeight` and `controlPaddingX` size by size, the way
typography merges field by field; a preset name still selects the whole preset
and keeps its identity, and the base preset's name is never overridable.

090 closes the last painted value that was not a role: `statusTone(...).border`
is the edge an Alert, Badge or Toast paints around its soft status surface, and
it was a 30% alpha mixture of the solid role recomputed at runtime — unmeasured,
un-editable in a copied platform style, and 1.12:1 on the high-contrast light
`warning` surface, under the 3:1 the design system gives a decorative divider.
Four `xSoftBorder` roles join the palette (54 → 58), the default sets keep
today's pixels exactly (each value is the composite it replaces), the AAA sets
get a designed ramp step (4.41:1 at the lowest), and the edge joins the
`divider` class on its own fill (105 → 109 pairs), so an edited theme is held to
the floor `themeContrastFailures` already enforces for every other divider.

091 closes the same class of gap one composition over: the selection contract
named nine surfaces but not the four soft status fills an Alert, Badge or Toast
paints, so selecting their text was unmeasured. Identity light
`successSoftForeground` measured 5.83:1 through the wash — under the 7:1 body
floor — and Windows dark's wash over `destructiveSoft` measured 1.005:1, an
invisible highlight. `selectionSoftPairs` and `selectionSoftWashPairs` join the
checker (4 + 4 pairs), the light soft foregrounds move one family step darker,
the dark ones one step lighter with a 20% identity wash (the alpha every platform
dark style already used), Windows dark's wash moves to 40%, and Linux dark's soft
destructive fill moves to `#3A0B0D` so its light-accent wash stays visible while
the body text keeps its floor on the pressed wash.

092 closes the same surface gap one composition over: the control boundary was
measured on the plain surfaces, the quiet panel and the four row washes, but not
the four soft status fills an Alert, Badge or Toast paints, where an action
button, a field or a "don't show again" checkbox sits. Identity dark's
`borderStrong` measured 2.77:1 on `successSoft`, 2.94:1 on `destructiveSoft` and
2.97:1 on `infoSoft`, under the 3:1 boundary floor, while every other shipped set
already cleared it. The four fills join the `boundary` class (109 → 113 pairs)
and the identity dark edge moves one half-step lighter to `#868FA0`, which also
lifts its tightest existing pair from 3.31:1 to 4.06:1 without touching any fill.
The focus ring on the same four fills follows in plan 093.

093 closes the last composition plan 092 left open: the ring was measured on the
eight surfaces a focused control sits on, but a toast's action button is focused
while it sits directly on a soft status fill. No shipped set fails — identity
light `warningSoft` at 3.37:1 is the tightest — so no colour moves; the four
fills join the `boundary` class (113 → 117 pairs) so an edited theme cannot make
a focused control lose its only focus indicator there.

094 closes the last painted surface the audits of plans `076` and `078` left
unguarded: the loading skeleton was measured on the canvas, card and popover, but
a skeleton row is hovered, pressed and selected like any other, and it also sits
in the `muted` panel of a sidebar list. Seventeen shipped pairs were under
1.05:1, ten of them exactly **1.000:1** — the identity and high-contrast
skeletons *were* the `active` fill — so a pressed loading row erased the
placeholder. The four surfaces join the `surface` class (117 → 121 pairs) and the
skeleton moves one ramp step in seven sets; no wash moves, because washes are
shared by five other contracts.

095 closes the decorative divider on the soft status fills: a status panel
separates a footer or an action row with a line, but `border` was measured on the
plain surfaces and the control fills only. The inherited dark `successSoft`
measured 1.015:1 on Windows, 1.023:1 on the identity and 1.047:1 on Linux, and
identity dark's `destructiveSoft` 1.040:1, under the 1.05 divider floor. Moving
the greys was rejected — they collide with their own pressed washes — so the two
identity soft fills move one step darker (card 1.53 → 1.39, Linux card 1.20 →
1.09, both above the surface floor) and the four fills join the `divider` class
(121 → 125 pairs).

096 closes the last union neither 067 nor 068 reached: `ControlSize` was a bare
`"sm" | "md" | "lg"` with no ordered index and no narrowing guard, so a consumer
persisting a component size — a table's row setting, a toolbar control, a URL
parameter — had to retype the union or cast, exactly the gap those plans removed
for platforms, mode, contrast, density and status tone. `controlSizes` is the
ordered index, `ControlSize` derives from it, and `isControlSize` narrows an
`unknown`; `scale.test.ts` and `styles.test.ts` stop retyping the three literals,
and a preset-coverage test fails if a size is added to the index without a metric
in every density preset. The persisted-choice example resolves a stored size, so
the fallback path runs in the suite.

097 closes the filled-control state matrix plan 055 left half-built. Plan 055's
decision declined a neutral hover role and every pressed pair because "the
secondary and ghost variants already read the generic `hover` / `active`
washes" — but the consumer's `filled()` helper composites `alpha(fill, 0.9)` /
`alpha(fill, 0.8)` for all three filled variants, so the state took its colour
from whatever sat behind the control. The measured result was worse than a
missing token: the light primary's hover (`#6E5CDE`) was *lighter* than its
resting fill (`#5F4BDB`) and its press lighter still, the dark primary's hover
moved the wrong way too, and the neutral fill's hover was a 1.009:1 change (1–2
RGB) — an invisible state. Four roles complete the matrix — `primaryActive`,
`secondaryHover`, `secondaryActive` and `destructiveActive` — as opaque steps
away from the canvas in both modes, with platform-specific primary and neutral
values in all three real styles, measured against their on-colour foregrounds
(129 contrast pairs). `filled-states.test.ts` proves presence, perceivability,
direction and platform ownership on all sixteen shipped themes, and the generic
washes are documented as the ghost/outline mechanism they always were.

098 closes a truth gap in the extension example rather than in the palette: the
executed `brand-theme.example.ts` changed only `primary` (and `ring`), while
`docs/tokens.md` taught that `themeContrastFailures(brandTheme)` returned an
empty array. It returned one failure — the inherited dark foreground measured
**4.243:1** on the brand fill, under the 4.5:1 on-colour floor — and nothing ran
the checker on the example. Both examples now carry the complete primary family
(fill, foreground, hover, pressed and text) in values that clear every floor, the
hover/pressed steps belong to the brand rather than the base iris, and
`theme.test.ts` holds both to `themeContrastFailures` and to the family rule. The
"change a fill, move the family" rule is stated in the Theme API section, the
design system and the README, with the documented snippet identical to the
executed example.

099 closes the last role the contrast contract left unmeasured by choice:
`colors.overlay` is the wash a Dialog paints across the whole window, and it was
exempt on the reasoning that "the content beneath it is the measured surface" —
which confuses the content with the scrim. The scrim's job is to change the
surface beneath it, so a scrim that composites to that surface is invisible. The
audit found the defect at the accessibility end: high-contrast dark's
`#000000CC` **is** `#000000` after compositing on its pure black canvas, a
**1.000:1** modal backdrop in the theme that exists to be unmistakable, while the
other nine sets cleared 1.05:1. `overlayWashPairs` measures the scrim over the
four base surfaces (`background`, `card`, `muted`, `popover`) at the `surface`
floor, `overlay` leaves the exemption list, and the AAA dark theme veils with
light (`#FFFFFF26`) because a dark veil cannot darken black. The other nine
scrims keep their exact pixels.

300 closes plan 076's defect one surface over. The soft status tints were held to
1.05:1 on `background`, `card` and `popover`, but not on the quiet `muted` panel
a sidebar or settings group paints — the fourth base surface, which
`packages/primitives` exposes as a `Surface` tone. The platform light variants
change `muted` (macOS `#ECECF0`, Linux `#EBEBEA`, Windows `#EDEDED`) while
inheriting the pastel tints, so a status badge in a sidebar measured **1.023:1**
on Linux, 1.036:1 on macOS and 1.043:1 on Windows, under the library's own floor.
`muted` joins the soft-surface pairs (129 → 133) and the four light tints move one
small step deeper — `#DEE9FF` → `#D6E3FF`, `#C2F4D6` → `#B8EDCE`, `#FFE3A3` →
`#FFDF9A`, `#FFE0E0` → `#FFD6D6` — clearing the darkest quiet panel at
1.081–1.111 while keeping the soft text (≥9.87:1) and edge (≥1.096:1) floors. A
soft chip inside a hovered or selected row is deliberately not a fill pair: it is
bounded by its designed `xSoftBorder` edge, unlike a full Alert panel.

301 closes a truth gap in the extension mechanism rather than in the palette.
Plan 073 made a theme declare the floors it is designed against, but
`applyPlatformStyle(highBase, style, "default")` applied the platform's default
colours and left the base's `contrast: "high"` claim in place — so the library's
own checker reported **46** failures for a theme the caller had built on purpose,
and `theme.contrast` described a palette the theme no longer carried. The
returned declaration now follows the palette: applied platform colours declare
`default` (the shipped platform palettes are designed at the default floors; AAA
applies only families and shape), while the no-argument call and a shape-only
style with no colour overrides keep the base's level. No colour moves, and plan
073's default-call guarantee is unchanged.

304 closes the same class of gap one entry point over: `ThemeConfig extends
ThemeOverrides`, so `contrast` on `createTheme` was the `extendTheme` **claim**
rather than a choice of palette. `createTheme({ mode, contrast: "high" })` — the
call that reads as "build me the AAA theme" — returned the default palette with
the AAA declaration, and the library's own checker reported **66** failures for
light and **32** for dark. The builder simply cannot reach the high-contrast
sets without first knowing `getTheme` or `extendTheme`. `ThemeConfig` now omits
the claim and re-adds `contrast` as a selector, so `createTheme` starts from
`getTheme(mode, contrast)` and the builder has no claim path; `extendTheme`
keeps the claim, which is what `applyPlatformStyle` relies on. The default call
is unchanged, the name follows the selected variant, and the suite rebuilds all
four shipped variants from their own `mode`/`contrast` and holds each to
`themeContrastFailures`.

305 closes the index gap plans 067, 068 and 096 left behind. Every persisted
union gained an ordered index beside its narrowing guard — `platformNames`,
`densityNames`, `statusTones`, `controlSizes` — except `ThemeMode` and
`ThemeContrast`, which shipped guards built from literal comparisons. The cost
was not cosmetic: sixteen suites wrote `["light", "dark"]` and `["default",
"high"]` by hand, so a third mode would have compiled (the `themes` record
demands a value) while every contrast audit kept testing two. `themeModes` and
`themeContrasts` now own both axes, the unions derive from them, and the guards
scan them, so a new member is one edit at the union owner. Every suite iterates
the indexes, `guards.test.ts` holds the indexes to the shipped records and
proves every mode has both variants, and `themeFromStoredChoice` executes the
persisted mode/contrast path the docs describe.

306 closes the last state the contract exempted wholesale: `disabled` and
`disabledForeground` were "inactive, so WCAG exempts them", which left a
**shipped** composition unmeasured — a disabled `Select` item paints
`disabledForeground` straight onto the menu's `popover` with no fill behind it
(`packages/primitives/src/components/Select.tsx:98`), measuring **1.99:1** on
Linux dark and 2.09:1 on the identity while the designed pair itself was
2.09:1. Meanwhile every disabled control in both consumer packages is an
`opacity: 0.5` composite, so the same label measures 2.25:1 on the light canvas
and 3.05:1 on the dark one and takes its colour from whatever is behind it —
plan 097's alpha-composite defect, one state over. The fill cannot carry the
shape either: identity light `disabled` *is* `muted` and `hover` (1.000:1) and
identity dark's *is* `popover`, `muted` and `hover`, because no neutral can clear
both a white card and a quiet panel at 1.05:1. So the state gets a floor and an
edge: `inactive` is a new pair class at 3:1 (4.5:1 at AAA) on nine surfaces — the
`disabled` fill, the four plain surfaces and the four row washes — the inactive
label moves in three sets (`#6E7787` light, `#A1A9B7` dark, `#A9A9A9` AAA dark;
AAA light already cleared), and `border` on `disabled` plus the previously
unmeasured `border` on `muted` join the divider class, so a disabled control's
outline survives on any panel. The `disabled` fill stays exempt with the
corrected reason, `disabledForeground` does not, and the consumer migration off
`opacity: 0.5` is recorded cross-team rather than edited in another workstream's
tree.

307 closes the same floor one composition over: plans 090–093 treat the four soft
status fills as surfaces a composition paints on — the surface, its edge, the
selection wash, the essential boundary and the focus ring — but a disabled
"Retry" in a Toast or Alert had no pair behind it. `inactiveSoftPairs` adds the
four fills to the inactive contract (144 → 148 pairs); every shipped set already
clears 3:1 / 4.5:1 there (3.41 at the lowest, light `destructiveSoft`), so no
colour moves, and the public checker now reports an edited theme that erases the
label on its own status panel.

308 closes the rationale plan 300 left half-measured. 300 declined a fill pair
for a soft chip on a row wash because the chip is "bounded by its designed
`xSoftBorder` edge", but the edge was measured only on its own fill, so the
boundary a reader actually sees was unmeasured on every surface a badge sits on.
The audit found the macOS light `warningSoftBorder` at **1.036:1** and the Linux
light one at **1.042:1** on their own pressed washes — with the fill also at
1.00–1.04:1, a warning Badge in a pressed row had no visible boundary at all.
The four edges join the `divider` class on the eight surfaces a chip occupies
(148 → 180 pairs), the identity light warning edge moves one designed step
(`#FCD47B` → `#EFC055`: 1.246–1.265:1 on the three platform pressed washes,
1.319:1 on its own fill), and every other shipped set already clears the floor,
so no other colour moves.

309 closes the gap every earlier perceivability plan left: the contract measured
what is painted *on* a fill but never the fill itself against the surface behind
it. `hover`, `active`, `accent`, `selected` and the `secondary` family are the
shape a row or a filled control paints, and the `muted` panel is the surface a
sidebar or settings group uses — a composition plans 084 and 086 already treat as
first class. The audit found **21 shipped pairs** under the library's own 1.05:1
floor in seven themes: the identity light `muted`, `hover` and `secondary` were
the same value (`#EEF1F5`), so a sidebar row had no hover feedback, a secondary
button had no shape and a selected row was invisible; the identity dark `hover`
was its `muted` and `popover`, so a menu item did not react to the pointer;
macOS light `selected` measured 1.021:1 on its own canvas, Windows light
`secondary` was its panel and Linux light `accent` was 1.001:1 on it; the AAA
dark `accent` sat 1.034:1 from the quiet panel. `stateFillSurfacePairs` is the
13 interactive fills × the four surfaces they paint on (`background`, `card`,
`popover`, `muted`) at the `surface` floor, so `contrastPairs` moves 180 → 232.
The fix moves the **quiet panel one step toward the card in light mode**
(identity `#EEF1F5` → `#FBFCFD`, macOS → `#F7F7FA`, Linux → `#FBFBFA`, Windows
→ `#F7F7F7`) rather than darkening five shared washes that sit within 1.05:1 of
the `border` edge and the `secondaryHover`/`secondaryActive` steps; the two light
accents the canvas also failed move one step (`#E7F1FF` → `#D9EAFD` on macOS,
`#E5F1FB` → `#DCEBF8` on Windows), the identity dark `hover` becomes a designed
step between the 850 panel and the 800 press (`#262C36`, 1.068 on the panel,
1.059 vs the press), and the AAA dark accent lightens to `#251B5C` (1.152 on
`muted`, 1.219 on `popover`). No text, edge, ring, selection, soft-tint or scrim
pair moves; every pair measured on the light panel gains contrast.

310 closes the same truth gap plan 098 fixed for the brand theme, one example
over: `docs/tokens.md` teaches the platform copy-and-own story with a snippet
that names only `primary` and `primaryHover`, and the executed
`resolveEditedPlatformTheme` was that snippet. It inherited the Windows dark
`primaryForeground` (`#000000`, designed for `#4CC2FF`) onto a `#005A9E` fill, so
the documented path produced **2.96:1** on the fill and **2.12:1** on the hover,
under the 4.5:1 on-colour floor the package states — and nothing ran the example
through `themeContrastFailures`, while the brand example already was. Both
examples now share one Contoso primary family (fill, foreground, hover, pressed
and text), the authored `contosoPlatformStyle` names the whole family instead of
two roles, and a test holds both helpers in both modes to the public checker and
to the family rule. No shipped theme, pair, floor or platform file changes.

311 proves the "copy a platform style and own it" promise one era over: the
shipped Windows variant is reshaped into Windows XP (Luna) and Windows 7
(Aero) as plain `PlatformStyle` data, resolved through the same
`applyPlatformStyle` path as a shipped variant and held to `themeContrastFailures`
in both modes. The recipes are deliberately **not** a fifth platform — they stay
out of `platformNames` and the docs platform toggle — because the mission's
platform axis stays macOS · Linux · Windows · Default. Both dark variants are
documented as interpretations: neither Windows XP nor Windows 7 shipped a dark
mode, so they keep the Windows dark palette and carry the era's shape — the dark
accent is the Windows step — rather than inventing a palette. Plan 328 makes the
recipe data carry that palette, which the first cut only described. Aero's glass is a two-surface
approximation, because 0.10.0 has no backdrop blur, inset shadow or gradient.
Recipe B of plan 687 (Omarchy's live system theme) stays out of this plan: its
own STOP condition requires the on-disk palette contract to be verified on a
real Linux host, which this workstream does not have.

312 closes the last text roles the contract measured only on plain surfaces: the
default label of a list or menu row. Plans 079, 083 and 086 added secondary
text, status text and the focus ring to the four row washes, but not the role a
row's own title uses. A selectable list row paints `foreground` on `accent`
(hover) and on `selected`, a selected row under the pointer keeps its inherited
`selectedForeground` on `accent`/`active`, and a menu row paints
`popoverForeground` on `hover`/`active`. `ListItemTitle` overriding the row's
inherited colour is why the selected title is `foreground`, not
`selectedForeground` — the composition the earlier audits did not see. All ten
shipped sets clear their floors (7.47:1 at the tightest), so no colour moves;
the six pairs plus the field edge on its own `input` fill bring
`contrastPairs` from 232 to 239.

313 closes the ledger contradiction plan 311 left: the Design tokens row stated
`62 semantic roles` and, later in the same sentence, “the current **58**” — the
count before the four soft edges landed. `inventory.test.ts` guarded the first
phrase but not a second count written as prose, so the ledger was false while
every gate stayed green. The sentence now names no count, and a guard holds every
numeric role phrase in the row to `colorRoles.length`; the TODO row that still
called the gallery's target a `54`-role package is corrected at the same time.

314 closes the last three compositions the 079–095 and 300–312 surface audits
did not name. A selected `Select` option paints `popoverForeground` on
`selected` (`selectItemStyle`), but `rowTextPairs` measured that role only on
`hover`/`active` — an edited `selected` could erase the option's label while the
checker returned `[]`. A status label or dot in a sidebar paints `xText` on the
quiet `muted` panel that plans 300 and 309 made first class, while plan 083
measured only the four row washes. A `primaryText` link nested in a selectable
row paints on `accent`/`selected`, the two fills plan 312 had just added for a
row's own title. The seven pairs join `contrastPairs` (239 → 246); every shipped
set already clears its declared floor (4.53:1 at the tightest), so no colour
moves, and `row-surface-text.test.ts` states the four regressions that the
public checker now reports.

315 closes the last text role measured on only one of the fills it paints:
`inputForeground` was checked on the `input` fill, but SearchInput, InlineEdit,
ColorPicker, TagInput and MentionInput paint a transparent input on the
`background` canvas, so a copied platform style that retinted the canvas could
erase typed text while `themeContrastFailures` returned `[]`. The one pair is
`body` (7:1 / 7:1), every shipped set clears it, and the contract moves 246 →
247. The same audit records a cross-team `components` task: those transparent
fields leave placeholder colour to the runtime default instead of painting the
`placeholder` role.

316 closes the mismatch plan 312 left between its own reasoning and its pair
list: the §1 table, the `wash-text.test.ts` header and `docs/tokens.md` all said
a selected row under the pointer keeps `selectedForeground` on the `accent` fill
`list.tsx` paints on hover, but only `hover`/`active` were added to
`contrastPairs`, so the documented `accent` composition had no pair. The audit
found every shipped set already clears the 4.5:1 secondary floor there (5.81:1
on macOS light), so no colour moves and the contract grows 247 → 248. The
regression case sets `accent` to the light `selectedForeground` and asserts the
public checker reports the pair, and the §9 design-system row now names the
three pointer fills instead of two.

317 closes the same class of gap for the placeholder, which was measured on the
`input` fill alone because the transparent fields plan 315 audited leave the
colour to the runtime default. A field is not tied to one surface: `primitives`
exposes four `Surface` tones, so a sidebar search sits on `muted`, a command
palette's field on `popover`, a settings form on `card` and the canvas is plan
315's case. The audit found the shipped defect the missing surfaces hid: the
identity dark `placeholder` (`#7C8595`) measures **4.03:1** on both `muted` and
`popover` (`#222730`), under the 4.5:1 secondary floor, and the `default`
platform variant plus the XP and Aero dark recipes inherit it. The four
`Surface` tones join the contract (248 → 252), the dark value moves one designed
step to `#858F9F` (4.59:1 on the quiet panel, 5.17 on the input fill, 5.95 on
the canvas) while staying dimmer than `mutedForeground`, and the field on a row
wash and the disabled field are documented as out of scope — the latter reads
`disabledForeground`, which plan 306 measures.

318 closes the edge plan 080 fixed, one role generation later. 080 held the
decorative `border` on the fill a bordered control paints — `secondary` at
rest, the `hover`/`active` washes and the toggle-on `accent` — because an
outlined control lost its edge exactly while pressed. Plan 097 then gave every
filled control a designed family (`x` → `xHover` → `xActive`), so a secondary
control now paints `secondaryHover` and `secondaryActive` instead of the generic
washes, and the two new fills had no pair. The audit found the same defect the
older pair list was written to prevent: macOS light and Windows light
`secondaryActive` **are** their `border` (1.000:1) and Linux light measured
1.009:1, while every other default-contrast set clears the 1.05:1 divider floor;
the two AAA sets are held to 3:1 and the neutral press step sat at 2.310:1
(light) and 2.567:1 (dark). The two fills join the `divider` class (252 → 254
pairs), the three light pressed steps move one designed step (`#C7C7CC`,
`#CAC8C6`, `#CCCCCC`), each 1.105–1.107 from its divider and still clearing the
hover→press step and the on-colour floor, and the two AAA dividers move away from
their neutral ladder (`#575E6B` light, `#A0A0A0` dark, 3.289 / 3.389 on the press)
because a fill cannot recede past its mode direction. `neutral-press-edge.test.ts`
states the shipped ratios and holds the public checker to them, and both
documents now name the designed steps beside the washes they replaced.

319 closes the other half of plan 317: the placeholder was given a pair on the
four `Surface` tones a transparent field can sit on, but the typed text it
replaces was still measured on the `background` canvas alone. A sidebar search
on `muted`, a command palette's field on `popover` and a settings form on `card`
are the same compositions plan 317 made first class, so a copied platform style
could retint one of those surfaces, keep the identity's `inputForeground` and
erase a query while `themeContrastFailures` returned `[]`. `card`, `popover` and
`muted` join the `body` contract (254 → 257 pairs); every shipped set already
clears 7:1 on all three (the quiet panel is the tightest), so no colour moves,
and `canvas-input-text.test.ts` now states the four-surface contract and the
erased-text regression the public checker catches.

320 closes the last default body-text surface the 088–319 audits left: an Alert's
description (`components/alert.tsx:181`) and its ghost dismiss control
(`internal/button.tsx:84`) paint `foreground` inside the tone-tinted root
(`toneSurface`, i.e. `xSoft`), but the contract measured `foreground` only on the
plain surfaces and the row washes. A copied platform style or brand theme could
darken one soft fill until an Alert's body disappeared while
`themeContrastFailures` returned `[]`. The four soft status fills join the body
contract (257 → 261); every shipped identity, platform and recipe set clears 7:1
(the tightest dark pair is above 10:1), so no colour moves, and
`soft-body-text.test.ts` states the four pairs and the erased-description
regression. The Alert composition is the third time the series has found a
composition the role-level completeness guard cannot see: `foreground` is
measured somewhere, just not on the surface the component paints it on.

321 fixes the one place the extension mechanism contradicted its own documented
merge rule. `extendTheme` spread each override group over the base, so an
**explicitly `undefined`** value — which TypeScript accepts, because the repo does
not enable `exactOptionalPropertyTypes`, and which a partial config spread
produces naturally — overwrote the base value instead of being omitted. A colour
role, a type field, a motion timing, a density metric or an elevation level could
therefore become `undefined` with no error, and an undefined elevation level
crashed `elevationShadow` with `TypeError: undefined is not iterable`. A probe on
the shipped light theme reproduced all three. Every flat group and the nested
typography, motion and density merges now route through one `mergeDefined`
helper that copies only defined entries; a defined value still wins, a preset
density name still selects the preset, and elevation keeps its replace-a-level
semantics for a defined array. No token value moves.

322 closes the last row wash the skeleton list omitted. Plans 312, 314 and 316
established that `accent` is the fill a **selectable** list row paints on hover
(`list.tsx`), and plan 094 had already held the skeleton on `hover`, `active` and
`selected`, so a placeholder row inside a selectable list could sit on the one
wash the list did not cover. Unlike a soft status chip, the skeleton has no
designed edge to keep its shape, so a copied style could erase it while
`themeContrastFailures` returned `[]`. `skeletonSurfaces` gains `accent` between
`active` and `selected` (261 → 262 pairs); a probe over the identity themes, every
shipped platform variant and both recipes in both modes found every set already
clears 1.05:1, so no colour moves.

323 closes the declaration the merge fix one plan earlier made falsifiable.
Plan 321 lets a copied `PlatformStyle` carry `{ primary: undefined }` and still
inherit the role, but `applyPlatformStyle` decided whether a style carried
platform colours with `Object.keys(colors).length`: one undefined key, no applied
colour, and an AAA theme declared `default` while it still carried the AAA
palette. The predicate now reads defined values, so an undefined colour is not an
override and the base's level stays; one defined colour still declares `default`.
`platform-claim.test.ts` states both directions, and no theme, style or pair
changes.

324 closes the type half of plan 066. The catalogue promised “if a token is not
here, it is not public”, but its coverage guard enumerated `Object.keys` of the
runtime namespace, so it could only see values. Types do not exist at runtime:
a walk of the two entry modules — following `export *` and named re-exports —
finds **44** public types, and **24** were absent from the reference, including
`ThemeOverrides` (the extension mechanism's own input), `PlatformRecipeName`
(plan 311's resolver parameter), `ThemeConfig`, `DensityOverrides` and the three
contrast-contract types (`ContrastPair`, `ContrastPairClass`,
`ContrastFailure`). A consumer had to infer each from a signature. `docs/tokens.md`
now has a `## Types` index naming all 44 once, alphabetically, and
`public-types.test.ts` compares the table with the module walk in both
directions, so a new export cannot ship unnamed and a stale row cannot linger.
No value, token, pair or floor changes.

325 closes the last functional boundary the contract measured only as a fill.
An invalid field signals its error with a `destructive` border — `FieldInput`
paints it on the `input` fill and the ColorPicker hex field on the `background`
canvas — but `destructive` was measured as a fill (its on-colour foreground, its
hover and pressed steps, and its perceivability on a surface), never as an edge.
An edited theme whose `destructive` approaches `input` could therefore erase the
only error signal while `themeContrastFailures` returned `[]`. The two pairs join
the `boundary` class (262 → 264) and every shipped set already clears the floor
(Aero light is the tightest at 4.18:1 default; the AAA sets are above 10:1), so
no colour moves. `invalid-field-edge.test.ts` states the shipped guarantee and
the erased-error regression, and the design system gains the `invalid` state and
its floor row.

326 closes the last place the catalogue described the contract's *size* rather
than its content. Plan 307 grew `inactivePairs` from nine surfaces to thirteen
when a disabled action inside a Toast or Alert gained a pair, but the
Verification paragraph still called it "the nine-surface inactive list", and its
second present-tense description of the same list still stopped at the four row
washes. Plan 325 then added the invalid field edge while the pair-count history
still ended at "261 to **262**", so a reader following the page's arithmetic
arrived at a contract two pairs smaller than the 264 `contrast.test.ts` and the
ledger enforce. `docs.test.ts` now derives the selection, inactive and chip-edge
counts from `selectionSurfaces`, `inactiveSurfaces` and
`softBorderSurfacePairs`, holds the history's last step to `contrastPairs.length`,
and names the audit series through plan 325. No token, pair, floor or colour
changes.

327 closes the last filled family plan 097 left as an alpha composite. `accent`
is a surface with a foreground — the toggle-on paint and the selected surface of
a row — but only `primary`, `secondary` and `destructive` gained designed hover
and pressed roles; the shipped `togglePressedBase` still paints
`alpha(accent, 0.9)` and `alpha(accent, 0.8)`, so a pressed toggle's state took
its colour from the surface behind it, moved *toward* the canvas in dark mode and
had no pair the contract could measure. `accentHover` and `accentActive` join the
palette (62 → 64 roles) in every identity set, platform variant and recipe light
half, each chosen to step away from the canvas, keep `accentForeground` at its
floor and keep the outlined toggle's `border` edge perceivable on the fill; the
on-colour and edge pairs plus the two fills as surfaces move the contract
264 → 276. `accent-states.test.ts` states the regression, and the primitives
migration off the alpha composite is recorded cross-team rather than edited in
another workstream's tree.

333 fixes the gate rather than a token: `nub run --filter @gpuixui/tokens test`
failed three times in a row on 2026-10-18 with Vitest's **5 s default** — twice
on the compiler probe (`react-consumer.test.ts`) and once on a pure palette
audit (`platform-recipes.test.ts`) — while both pass comfortably alone (2.3 s and
0.8 s). The suite is 55 isolated files on a 12-core box, so a worker can be
descheduled past a unit-test budget with no code change, and a randomly red gate
makes a real regression indistinguishable from scheduling noise. The package now
carries a `vitest.config.ts` with an explicit 20 s budget: headroom for a loaded
worker, still short enough to fail a hung subprocess. No test, token, theme,
platform style, recipe or document value changes; the proof is three consecutive
green full-suite runs after the two failing runs before it.

334 closes the composition plan 097's designed family left behind in the
consumer. The shipped secondary Button (`components/internal/button.tsx` on
`master`) keeps `secondaryForeground` while its fill becomes the generic
`hover`/`active` wash, not the designed `secondaryHover`/`secondaryActive`; the
contract measured the label only on the designed family, so an edited wash could
erase a neutral button's label mid-interaction while `themeContrastFailures`
returned `[]`. The two pairs join the `secondary` class (290 → 292); every
shipped set already clears its floor (10.42:1 and 9.44:1 at the tightest), so no
colour moves. The designed family stays the target for the consumer migration
recorded cross-team; the pair guards what ships in the meantime.

335 closes the last row fill the control-edge contract never measured. A
selectable row paints `selected` behind arbitrary children, and the `outline`
Button variant paints no fill at rest — only a `border` edge — so an outline
action, or a separator, inside a selected row paints the divider directly on
that persistent fill, while the contract measured `border` only on
`hover`/`active`/`accent`. The pair joins the `divider` class (292 → 293); every
shipped set already clears its floor (1.113:1 on Windows dark at the tightest),
so no colour moves. The same audit found the guard that should have caught the
gap filtered `contrastPairs` through a hand-typed six-name list, which is why
plan 327's `accentHover`/`accentActive` pairs never reached the verification
paragraph; the guard now derives the fills from the contract, so a new edge pair
cannot ship unmentioned.

336 pins the last current figures the catalogue quotes without a test. The
pair list already holds every one of them to its floor, but the *figure* — which
set is tightest and what it measures — was computed once by hand: the four
row-text values, `successText` on `muted`, the field edge and the AAA scrim with
its 15% wash. `docs.test.ts` now derives each figure, its theme label and the
scrim's percentage from the shipped themes, so a palette edit cannot leave the
page quoting a ratio the package no longer produces. No token, pair, floor or
document value changes.

337 closes the two reach claims the 069/317 audits left one level too broad. The
catalogue said native text selection is themeable through `selectionColor` and
listed `placeholder` as text on the `input` fill; both hold for text the library
paints itself, not for a GPUix `<input>`. At the pinned
`@gpuix/native@0.10.0` tag (`9fcd628`) the editor paints its placeholder and
selection with constants — `rgba(0x8f8f8fff)` and `rgba(0x7c86ff59)` — takes
typed text from `style.color`, and reads the `theme` prop only for `caret`. The
measured consequence is a real floor miss the contract cannot see: the fixed
placeholder is **3.23:1** on the identity light `input` and 4.08–4.38:1 on the
dark platform inputs, under the 4.5:1 secondary floor, while the designed
`placeholder` role clears 5:1. The reference and the README now separate the two
paths, `selectionStyle`'s JSDoc states the field limit, two `docs.test.ts` cases
hold the claims, and the consumer fix — a `<text>` hint over the input, or the
documented grey — is recorded for `primitives`. No colour, pair or floor
changes.

338 closes the gap between the designed filled-control matrix and what the two
shipped consumers paint. Plan 097 shipped `x` → `xHover` → `xActive` for all
four families and the contract measures the label on all three, but
`components/internal/button.tsx` still hovers at `alpha(primary, 0.5)` (with the
now-false comment *"Tokens ship no `primaryHover`"*) and `primitives` hovers and
presses at `alpha(fill, 0.9)` / `alpha(fill, 0.8)`. A translucent fill takes its
colour from the surface behind the control while the label was designed for the
opaque fill, and nothing measured the result: the label falls to **2.06:1**
(primary at 50% on a Linux light card) and **3.40:1** (primary at 80% on the
same), with destructive at 2.24:1 / 3.75:1 (identity light), all under the
4.5:1 on-colour floor every designed step clears. The 50% case is past repair in
the palette — even a black fill tinted at 50% over a white card carries white
text at only 4.00:1 — so the fix is the designed step, and the package makes it
one call: `filledControl(theme, family)` returns the resting, hover and pressed
fills with the one foreground, beside `filledControlFamilies`,
`FilledControlFamily` and `FilledControlStyle`. A pair for the alpha composite
would bless a composition no palette can pass, so the evidence is a TODO row
plus guarded prose instead. No colour, pair or floor changes.

339 closes the last surface of the secondary-text role. `mutedForeground` was
measured on the four plain surfaces and the four row washes a description can
sit on, but a time picker paints its separator and clear control on the `input`
fill a field creates for its own chrome, so an edited theme could set the role
to the field's own value and erase both while `themeContrastFailures` returned
`[]`. The pair joins the `secondary` class (293 → 294); every shipped set already
clears 4.5:1 / 7:1 (8.376:1 at the tightest), so no colour moves. The same audit
found a defect no pair can fix: `MenuCheckboxItem` paints its check glyph with
`accent` — a pale selected-row wash — on the menu's `popover` (1.11–1.39:1) and
on the `hover`/`active` fill (1.00–1.08:1), under the 3:1 mark floor, so a
checked item has no visible check. The role must be the row's own
`popoverForeground`, which the contract already measures on all four fills;
because the file belongs to `components`, the fix is recorded cross-team with its
measured evidence instead of adding a pair the shipped palette fails.

340 closes the invalid half of the focus story. GPUix 0.10.0 has no `outline*`
and no `focusVisible`, so the ring is a spread shadow — the only focus indicator
the runtime can draw — and `controlFocusStyle` recolours it with `destructive`
when a field fails validation. The contract measured `destructive` as a fill and,
since plan 325, as the field's own edge, but never as the ring painted on the
surface behind the control, so an edited theme could set the error colour close
to a card, popover, row wash or soft status fill and erase the focus indicator
while the checker returned `[]`. The eleven boundary pairs join the contract
(294 → 305); every shipped set already clears 3:1 / 4.5:1 (3.048:1 at the
tightest), so no colour moves.

341 closes the last mark composition plan 332 left: `ComboboxItem` marks a
selected option with a `primary` check, and `rowStyle` paints the `hover` wash
behind the row while it is highlighted, but `markPairs` measured `primary` only
on the plain surfaces and the slider thumb. The pair is a guard (3.111:1 on
macOS dark at the tightest), so no colour moves; the menu checkbox's `accent`
glyph — the wrong role — stays the cross-team finding recorded by plan 339.

342 publishes the last rule the library enforced only on its own themes: each
filled family's `xHover` must be one perceivable step (1.05:1) from its `x`, and
its `xActive` from its `xHover`, but that floor lived in `filled-states.test.ts`,
which iterates the shipped themes. A consumer theme whose `primaryHover` equalled
`primary` therefore returned `[]` from `themeContrastFailures` while its primary
button had no hover — `stateFillSurfacePairs` measures each fill against the
surfaces behind it, and a fill equal to the fill before it still clears every
surface pair. `stateStepPairs` (eight pairs) joins the contract under a new
`step` class at 1.05:1 on both levels, because a state step is not a surface
against a panel and the existing `surface` filters key on fill roles. No colour
moves: every shipped identity, platform and recipe theme already clears the
floor (306 → 314 pairs).

343 closes the field's last unmeasured pointer edge. `fieldVariant.active` in
`primitives` repaints a pressed field's border with `ring` on the field's own
`input` fill, the way hover repaints it with `borderStrong` — and the hover edge
was already a `boundary` pair. The contract measured `ring` only on the eight
surfaces a focus shadow sits on plus the four soft status fills, because the
focus ring is painted outside the control, so a consumer theme whose `ring`
equalled `input` returned `[]` while its pressed field had no visible edge.
`fieldPressedEdgePairs` adds `ring` on `input` as a `boundary` pair (314 → 315);
every shipped identity, platform and recipe theme already clears the 3:1 / 4.5:1
floor (identity light is tightest at 4.218:1), so no colour moves. The same
audit found a real `primitives` defect rather than a missing pair: an invalid
field is painted with a solid `destructive` **fill** behind `inputForeground`
(1.97:1 on both AAA dark sets, 3.48:1 on Aero light) and its `hover`/`active`
variants replace the error border with `borderStrong`/`ring`, so the error
signal disappears under the pointer. The designed fix — keep the `input` fill
and the `destructive` border, or use `destructiveSoft` +
`destructiveSoftForeground` (measured at 7:1) — is recorded as a cross-team
`TODO.md` row with the evidence.

344 closes the last content surface the selection contract never reached. A
user message bubble paints body text on `primary` (`components/message.tsx`
`bubble()`), and the accent-tinted `selection` wash **is** the accent, so it
composites to **1.000:1** there in six shipped palettes — identity dark, macOS
light and dark, Linux light, Windows light and Aero light (the `default`
platform's dark half is the identity dark palette) — while `primaryForeground`
through the wash sits at 4.70:1 at the tightest. The nine content surfaces and
four soft status fills plans 081, 087 and 091 added never included a filled
action. `selectionOnFill` is a neutral 15% veil (`#00000026` light,
`#FFFFFF26` dark) that steps away from the fill in both modes instead of taking
its hue from it: measured on `primary`, `secondary` and `destructive` with each
family's own foreground, the tightest default pair is 6.10:1 of text and 1.105:1
of veil, and the tightest high-contrast pair 8.45:1 and 1.075:1, so no colour
moves and the existing on-colour and surface floors hold in all 24 sets.
`selectionStyle(theme, "fill")` applies it, `selectionFillPairs` and
`selectionFillWashPairs` (3 + 3) publish it through `themeContrastFailures`, and
the `components` migration — the bubble keeps its brand fill and takes the
inverse veil — is recorded cross-team with the measured evidence. The rejected
alternatives are recorded in the plan: restyling the bubble loses the brand
fill and leaves the system without an answer, deriving the veil from
`alpha(familyForeground, 0.15)` repeats the alpha-composite defect plans
055/097/327 removed, and changing `selection` itself would break the
accent-follows-identity rule plan 331 states.

345 closes the last axis on which a platform variant silently reverted to the
identity. Plan 063 decided to apply "only `structure` and `types`" at high
contrast because an elevation level then carried a colour per level, so replacing
it could weaken the AAA palette. Plan 085 changed that representation: a level is
geometry plus an alpha over the single `shadow` tint, and the tint is a colour
role the AAA theme keeps. Skipping elevation now only removes the platform's
depth, so `getPlatformTheme(platform, mode, "high")` and both recipes painted the
identity's shadows and the docs toggle's four variants were identical on that
axis. The levels move into the structural overrides and apply at every contrast
level; the AAA `shadow` tint stays, so no colour, pair or floor moves and the
public checker still returns `[]`. `platform-contrast-elevation.test.ts` states
the regression and the tint/geometry split, and the docs, README and ledger now
say that a high-contrast variant keeps its platform's elevation while the AAA
colour set wins.

346 closes the last two text roles the soft status fills were never measured
for. Plans 307, 320, 092, 093, 095 and 340 hold the inactive label, body text,
the control boundary, the focus ring and the divider on those fills, but not the
quiet caption (`mutedForeground`) or a brand-toned link (`primaryText`).
`AlertDescription` is documented as a container that may hold an action, and the
primitives `Link` paints `primaryText`, so both compositions are invited by the
shipped API. `softPanelTextPairs` adds the two roles on all four fills at the
secondary floor (315 → 323); every shipped set already passes (6.61:1 and
5.26:1 at the tightest), so no colour moves, and
`soft-panel-text.test.ts` states the erased-caption and erased-link
regressions.

347 closes the last painted state a value indicator has: its unfilled groove.
`Progress`, `Meter` and `Slider` painted it with `muted`, a surface role.
Identity dark's `muted` is its `popover`, and every platform dark style's
`muted` is its card and popover — all at 1.000:1 — so an indeterminate progress
bar, which is only its track because the fill is zero-width, painted nothing on
a dark card, and a slider's unfilled span had no shape. `muted` cannot become a
fill (plan 309 tuned it as the panel ladder), `border` is a line role (the
primary mark measures 1.43:1 on the AAA divider) and `active` is a pressed wash
(2.84:1 on macOS dark), so `track` is a designed neutral step in every palette
(65 → 66 roles). `trackSurfacePairs` holds it on the four base surfaces and the
persistent `accent`/`selected` fills; `trackMarkPairs` holds the four
`PROGRESS_TONES` to the mark floor on it (323 → 333). Every shipped set already
passes (1.06:1 and 3.15:1 at the tightest), so no existing colour moves; the
brand example gains its own groove because its lighter primary measured 2.67:1
on the identity one, and the `primitives` migration is a cross-team row.

348 closes the last shipped composition a status role is painted on outside its
own surface. The Toast paints its tone glyph and its 3px tone bar with
`statusTone(...).foreground` — `xSoftForeground`, the role designed for the
`xSoft` fill — directly on its floating `popover` card
(`components/src/toast/viewport.tsx`), and the contract measured each soft
foreground only on its own fill. An edited platform style or brand theme that
set `warningSoftForeground` close to its `popover` therefore erased the glyph
and the bar while `themeContrastFailures` returned `[]`. `toastTonePairs` holds
the four roles on `popover` at the secondary floor (333 → 337); every shipped
set already clears it with a wide margin (**11.97:1** at the tightest, Linux
dark `infoSoftForeground`), so no colour moves. The pair is documented as the
shipped composition, not the recommended one: plan 334 set the precedent for
the secondary Button's generic washes, and the `components` migration to
`statusTone(...).text` remains a cross-team row.

353 closes the last MISSION-named design-system item with no token
representation: **component dimensions**. Spacing, radii, density, elevation,
borders, icons and avatars all ship, but the fixed surface metrics a component
needs at any density were literals in consumers — overlay widths of 180/220px, a
320px scroll height, a 380px toast, a 240–360px preview card, a 200px field
minimum, an 80px chip minimum and a 16px field adornment (with two components
using 18px instead). None could be changed through a theme. `theme.dimensions`
adds the nine metrics as a flat group that merges field by field, inherits
through every platform variant and recipe, and is documented and guarded beside
the other numeric scales. Consumers migrate cross-team; this workstream adds no
colour role and no contrast pair.

354 closes the last hand-written list on the design-system page: the
**interaction-state table** (§8). Plans 351 and 352 made the accessibility table
derive its rows from the contract, but §8 stayed prose and had drifted — the
link row omitted the four soft status fills plan 346 added, the loading row said
"every surface" while naming four of eight, the focus row named none, and the
disabled, selected, hover, pressed and status rows used aliases ("canvas",
"quiet panel") or omitted surfaces the checker measures. Every state row now
names its roles, and nine derived cases hold each row to the pair list that
enforces it. No colour, pair or floor moves; every shipped set already passed.

355 closes the last unguarded documentation surface: the fenced `ts`/`tsx`
snippets in `docs/tokens.md` and the package README are what a reader copies,
and nothing checked them against the package. Plan 350 made every
`*.example.ts` run, but a snippet has no suite behind it. The audit found the
defect that proves the gap: the platform-recipe snippet rendered
`<ThemeProvider>` without importing it from `@gpuixui/tokens/react`, so a
reader who copied it got `Cannot find name 'ThemeProvider'` while every gate
stayed green. `snippets.test.ts` now checks that every named import is a real
export, every `theme.colors.*` names a shipped role, every `theme.<group>.*`
names a member of the shipped scale, and every public function, component or
type a copyable block uses is imported by that block. A block with no package
import is a contextual continuation (an expression or a shape sketch), not a
module, so the import rule applies only to blocks that present themselves as
one. No token value, pair or floor changes.

356 closes the surface 355 had called closed: the `@example` blocks in the
package's own modules are fenced snippets a doc generator renders and a reader
copies, and no test read them. The audit found the same defect one surface
over — `getPlatformTheme` and `getPlatformRecipeTheme` both rendered
`<ThemeProvider>` with a package import and no provider import — plus
`applyPlatformStyle` applying an undefined `contosoStyle`. `snippets.test.ts`
now reads every non-test, non-`*.example.ts` module, strips the JSDoc line
prefix, and applies the same import, role and scale-member checks it runs on the
docs; the two providers are imported, the deprecated `platformTheme` bridge is a
complete block, and the apply example uses `platformStyles.win32` so it runs.
No token value, pair or floor changes.

357 closes the generic counterpart of plan 342's ladder. 342 published the
filled families' `x` → `xHover` → `xActive` step; the generic `hover` → `active`
pair — what a ghost or outline control paints, and what the shipped secondary
Button still paints (plan 334 holds its label there) — was measured only as two
washes against surfaces, so a theme whose `active` equalled `hover` returned
`[]` while the press had no visible state. `washStepPairs` holds it to the same
1.05:1 `step` floor at both contrast levels; every shipped set already clears it
(identity dark is tightest at 1.059:1), so no colour moves and the contract grows
337 → 338. The same audit found two shipped compositions on the wrong role pair
and recorded them cross-team rather than blessing them: a secondary control whose
resting `secondary` fill and hover `hover` fill are the same value in 19 of the
24 sets (the pair is under the floor in 23), and a selectable row that hovers to
`accent` and presses to `active`, measuring 1.004:1 in identity dark. The
designed `secondaryHover`/`secondaryActive` and `accentActive` families already
exist and are measured.

358 closes the other half of the extension guarantee plan 071 opened. The
package promises that a consumer can copy a platform style, edit it and ship
their own look, and it hands them `themeContrastFailures` so the edited
**colours** are held to the library's floors. Nothing held the **numbers**: every
metric invariant — type leading above its size, ordered spacing/radius/icon/
avatar/density/motion ladders, positive dimensions, elevation alphas inside
`0…1` — lived in test-only code asserted on the shipped constants. The measured
worst case is not hypothetical: `focusRing` spreads by `borderWidth.strong`, and
that shadow is the only focus indicator GPUix 0.10.0 can draw, so an edited theme
with `strong: 0` had no focus ring at all while `themeContrastFailures` returned
`[]`; the same edit path clipped a type role by shrinking its leading or the
smallest control below one label line, and inverted a ladder's meaning. The
audit also rejected two rules the shipped styles themselves would fail: strict
radius ladders (Linux and Windows ship `lg === xl`) and strict motion ladders
(Windows ships `fast === step`), so the contract asks for non-decreasing steps.
`themeMetricFailures` and `metricGroups` publish the ten groups; every shipped
identity theme, platform variant and recipe already passes, so no token value
moves, and a coverage case keeps a future group from shipping unmeasured.

359 corrects the reasoning plan 099 used to leave the row washes out of the
scrim contract. It excluded the *transient* pointer washes because reaching a
dialog removes the pointer from the row, which is right — but it also excluded
`selected`, which is a persistent row state a table, list or tree keeps while a
modal opens over it, and `input`, which is the fill of every field in the layout
behind a settings or rename dialog. The audit measured the gap: macOS light's
own `selected` fill used as `overlay` composites to **1.000:1** on a selected
row, and `themeContrastFailures` returned `[]` because every measured surface
passed. The two surfaces join `overlaySurfaces` (four → six scrim pairs); a
24-set probe finds the tightest pair at 1.164:1 (macOS dark, `overlay` on
`input`), so no colour moves and the regression case now reports the invisible
row.

360 closes the numeric contract's last two ungoverned members. Plan 358 promised
that `themeMetricFailures` holds an edited theme's numbers to the invariants the
components paint with, but a probe on the shipped light theme found two edits
that returned `[]`: `elevation.md[0].offsetX = NaN` (the checker accepted it and
`elevationShadow` handed the renderer `{ offsetX: NaN, … }`, a shadow it cannot
paint) and `controlHeight.md = 40` with the shipped `rowHeight = 32` (every row
is painted at `density.rowHeight`, and the default control a row holds is `md`,
so every action, checkbox or badge inside a list, table, menu or tree row clips).
The elevation case generalises: `offsetX`, `offsetY`, `spreadRadius` and an
infinite `blurRadius` were never checked at all, while `alpha` was. A `finite`
`MetricRule` joins the contract for the four geometry fields — a negative offset
or spread is a direction, not breakage; the shipped light level already ships
`spreadRadius: -2` — and `rowHeight` is held to `controlHeight.md` beside the
body-line rule. Every shipped theme, platform variant and recipe already
satisfies both (all three density presets ship `rowHeight === controlHeight.md`),
so no token, colour, pair or floor moves; the two new cases fail on the pre-fix
`metrics.ts` and pass after it.

361 closes the same class of gap one rule over. Plan 358 held `radius.full` to
the largest corner radius and half the largest **control**, but `full` is also
the **avatar** radius, and the largest avatar is bigger than the largest control:
`packages/components/src/avatar.tsx` paints an `avatarSize.lg` disc (40px) with
`radius.full`, so a `full` of 18 or 19 satisfies the control bound (18) and still
leaves the avatar a rounded square — and the probe returned `[]`. A third bound,
`avatarSize.lg / 2`, now sits beside the control bound, so each shape keeps its
own diagnostic and `full` must round both. Every shipped theme,
platform variant and recipe ships `full` 9999, so no value moves; the new case
fails on the pre-fix `metrics.ts` and passes after it.

362 closes the last three text roles a status panel carries that the selection
contract measured only on the fill. Plan 091 measured the tone's own foreground
through the wash, plan 320 added the body text an `AlertDescription` and ghost
dismiss control paint, and plan 346 added the caption and link — but the body and
caption went into the *fill* contract only, so a reader who selects an Alert's
description or a Toast's caption had no pair behind it and an edited theme could
erase it while `themeContrastFailures` returned `[]`. The probe over the 24
shipped sets finds every set already clears the floors — identity dark
`foreground` on `infoSoft` at **7.26:1** is the tightest body pair and Aero light
`mutedForeground` on `destructiveSoft` at **4.78:1** the tightest caption — so no
colour moves; `selectionSoftPairs` grows 4 → 12 (the plain `contrastPairs` count
stays 338). Accent-toned text stays the documented omission: macOS light's
`primaryText` measures 4.16–4.32:1 through the wash on the four fills, under the
default secondary floor, and every AAA light set 5.38–5.90:1 under 7:1, so no
perceivable wash can carry a link there.

363 closes the one surface whose *own* text role the selection map never named.
A card carries two: the default `foreground` a `CardTitle` paints and its public
`cardForeground`, which `components/context-menu.tsx` sets on the trigger's
`card` fill. The static pair measured it on the card, but nothing measured it
through the selection wash, and the two roles are not aliases: both Windows
recipes ship them apart (`xp` light `#191D25` / `#1A1A1A`, `aero` light
`#191D25` / `#101828`). `selectionPairs` grows 18 → 19 (the plain
`contrastPairs` count stays 338); every shipped set already clears the body
floor through the wash — Windows dark is the tightest at **9.07:1** — so no
colour moves, and the regression case sets `cardForeground` to the composited
wash to prove the pair is reported.

364 closes the half of the numeric contract the `motion` group never read. The
group governed the six timing ladders (`none` zero, `step` → `pulse`
non-decreasing) and never looked at `motion.ease`, and a timing's ladder does not
require finiteness. Three edits on the shipped light theme therefore returned
`[]`: `pulse: Infinity`, `ease.enter: [NaN, 0, 0, 1]` and
`ease.standard: [2, 0, 0, 1]`. The pinned `@gpuix/native@0.10.0` type accepts the
tuple as four plain numbers, while the runtime's `validate_seconds` rejects a
non-finite duration and `validate_ease` rejects a non-finite control point or an
x value outside `0…1`, and `MotionState::invalid` then drops the transition — so
the animation silently does not run. The timings gain the `finite` rule and each
easing tuple is held to the runtime's control points: the two x values finite and
inside `0…1`, the two y values finite with no range bound, because an overshoot
curve is a design choice. A named easing is constrained by `MotionEasing` itself.
No shipped set carries a tuple or a non-finite timing, so no token value moves;
`motion-contract.test.ts` states the three silent edits and the overshoot the
rule must not reject.

365 closes the last `dimensions` member with a documented relationship but no
rule. `overlayMaxHeight` is described as "the height at which a long overlay list
starts to scroll", yet it was only checked for being positive, so a theme that
set it to **20** while `density.rowHeight` is **32** returned `[]` — and every
menu, select and combobox list using the token would scroll in a viewport
shorter than one of its rows, clipping every option. Plan 360 had already held
`rowHeight` to the default `md` control it holds; the overlay's own bound is one
row, because a list item is a row. Every shipped set ships 320 against a row of
28–36, so no token value moves; `overlay-height.test.ts` states the 20/32 edit,
the one-row floor and the compact density that lowers the bound.

366 closes the last text role the selection contract never painted, and the
omission plan 087's summary had grouped with accent-toned links. `xText` is the
documented role for a status label, icon or dot on the four washes a row paints
(plans 083 and 314), and a selectable row's label is dragged over with the copy
around it like any description — but no pair measured it through the composited
`selection` wash. The probe over the 24 shipped sets found **162** pairs under a
declared floor: XP light `successText` **3.671:1** on `active`, macOS light
3.826:1, Aero light 3.721:1 on `selected`, identity light 4.049:1, and every
high-contrast light tone 6.12–6.72:1 under 7:1, while `themeContrastFailures`
returned `[]`. `selectionStatusPairs` (four tones × nine surfaces, 36 pairs)
joins the checker, the six light status roles move one designed half-step between
the ramp steps they used, and every shipped set clears (4.661:1 XP light
`infoText` on `active`, 7.370:1 AAA light `warningText` on `active`). No dark
value, `contrastPairs` count, platform style or recipe changes; `primaryText`
remains the one documented omission, now scoped to links.

367 closes the last ladder the numeric contract left ungoverned: its typography
group held a role's size positive and its leading above that size, but the scale
the design system publishes — two ladders, prose `display` → `caption` and code
`code` → `codeBlock`, with `bodyStrong` as the weight variant of `body` — lived
only in `typography.test.ts` as two local arrays asserted on the shipped
constants. A probe on the shipped light theme returned `[]` from both checkers
for four edits: `h1` below `h2`, `codeBlock` above `code`, `bodyStrong` at body's
weight, and `bodyStrong` smaller than body. The compositions are first-class —
`card.tsx` paints `CardTitle` with `h3`, `alert.tsx` and `toast/viewport.tsx`
paint `bodyStrong` for the panel title, and `field.tsx` paints helper text with
`caption` — so an inverted scale renders a card title smaller than the body
inside it and a flattened one makes an Alert title indistinguishable from its
description. `proseLadder` and `codeLadder` move into `typography.ts`, both the
test and the contract read them, and the contract holds each ladder
`non-decreasing` in size plus `bodyStrong` no smaller than `body` and heavier
than it. Every shipped theme, platform variant and recipe shares the identity
type scale, so no value moves.

368 closes the same rule one group over: the `finite` rule shipped for elevation
geometry (plan 360) and completed for motion (plan 364) covered two of the ten
groups, so the other eight accepted `Infinity`. A ladder's last step has no
successor and a standalone metric has no comparison, so a probe on the shipped
light theme returned `[]` for `spacing["5xl"]`, `radius.full`,
`borderWidth.strong`, `iconSize.xl`, `density.rowHeight`, `dimensions.toastWidth`
and an infinite display size. The renderer does not guard them: `renderer.rs`
casts each length to `f32` unchecked, and the runtime's own theme metrics
document the result — invalid Taffy geometry it paints as nothing, with no
error. One `finiteMembers` pass now walks every numeric member of the other
eight groups, built from the same `textRoles`, `controlSizes` and step lists the
ladders use. Every shipped set is finite, so no value moves.

369 closes the level plan 368's own sentence still excepted. The elevation rule
loop walked `sm`, `md` and `lg`, and `overlay` was exempt as "reserved and
empty": true of the shipped data, false of the type and of the runtime path.
`ElevationLevel` includes `"overlay"`, `extendTheme` replaces a level's array,
and `elevationShadow(theme, "overlay")` paints the first entry — so a probe
defining an overlay entry with `offsetX: NaN` and `alpha: 2` returned `[]` from
both checkers while the renderer would receive a NaN shadow with an opaque tint
(`alpha()` clamps the fraction). The rule now walks all four levels: the three
designed levels still require an entry, an empty `overlay` is the reserved case
and stays exempt, and a defined entry takes the same `finite`, `non-negative`
and `within` rules as the rest. Every shipped set ships an empty overlay, so no
value moves and the "every numeric metric" sentence becomes true as written.

370 closes the last numeric member the word "every" still did not cover, and the
public type that made it unreachable. `FontWeight` was the four shipped literals
(`400 | 500 | 600 | 700`), while the pinned `@gpuix/native@0.10.0` `StyleDesc`
accepts `fontWeight?: string | number` and GPUI takes an `f32`: a brand that
installs a variable family could not name its `450` body or an `800` display
weight through `extendTheme` without a cast. The checker did not read the member
either — a probe on the shipped light theme returned `[]` for `NaN`, `0`, `-1`
and `1001` on eight roles, while `textStyle` handed each value straight to the
renderer; `body` and `bodyStrong` were caught only incidentally when the
weight-variant ladder saw a negative or a `NaN`. The literal union also made the
defect untestable without an `as`, so the two halves are one fix: `FontWeight`
is a numeric CSS weight in `1…1000`, and every role takes a `weighable` rule
(finite, at-least 1, at-most 1000), reported once for a non-finite value instead
of three times. The shipped four weights are a scale choice, not a type
boundary, so no shipped value, pair, floor, platform style or recipe moves.

371 closes the last role the colour contract left exempt without a format
guarantee. `shadow` is a tint rather than a pair, and plan 085 made every
elevation level an alpha applied to it, so the role is read by `alpha()` — which
parses only `#RRGGBB`/`#RRGGBBAA` and returns an unparseable value unchanged
(plan 077's fallback). The pinned runtime accepts every CSS form
(`csscolorparser` handles `rebeccapurple`, `rgb(…)` and `#f00f`), so a copied
theme with `shadow: "black"` painted a **fully opaque** shadow at every level —
0.08, 0.12 and 0.16 all gone — while both checkers returned `[]`, and
`docs/design-system.md` claimed "tests restrict roles to hex" with nothing
holding the exempt role. Measured roles are caught incidentally as `NaN` by
`contrastRatio`; the two tints were not. `isHexColor` publishes the predicate,
`themeColorFailures(theme)` walks all 66 roles and names each value outside the
form, and the ledger, both documents and the README state the format half beside
the contrast and metric halves. All 24 shipped sets are hex, so no token value,
colour, pair or floor moves.

372 closes the last numeric member a ladder accepted at zero. `iconSize` and
`avatarSize` were held only to a non-decreasing ladder, so `iconSize.xs: 0` or
`avatarSize.xs: 0` returned `[]` from all three checks while an `xs` icon or
avatar painted a 0×0 box — a missing glyph or identity mark, not a size. The
ladder helper now takes the rule each step is held to, defaults to
`non-negative`, and the two size ladders ask for `positive`; a ladder of zeroes
names every step, and `xs: 1` stays valid, so the rule is zero, not a house
minimum. The same audit found the `MetricRule` row in `docs/tokens.md` naming
`ladder`, `fit` and `fraction` — none of which the contract emits — because the
union had no ordered index. `metricRules` is now the nine-rule index and
`MetricRule` derives from it, the row is built from the index, and a test fails
on a missing or retired rule. No shipped theme, platform variant or recipe
carries a zero size, so no token value, colour, pair or floor moves.

373 closes the last failing shipped call in the extension mechanism. Plan 301 made
`applyPlatformStyle(highBase, style, "default")` declare the level of the palette
it carries, but the declaration only followed the roles the style *named*; the
roles it left out stayed at the AAA level, so the returned `default` theme carried
half an AAA palette and the library's own checker rejected four mode × style
combinations (light macOS `border` on `destructiveSoft` 1.0248:1, Linux light
1.0162:1, Windows light 1.0133:1 on `infoSoft` and 1.0215:1 on `destructiveSoft`,
Linux dark 1.0375:1 and 1.0346:1 on its card, popover and quiet panel). Asking for
a level now replaces the palette as a set — the unnamed roles come from the
default-level identity of the same mode — so every shipped style applied this way
passes all three checks and its `colors` equal the default-level platform
variant's. A base already at the requested level keeps its own colours and edits,
so a style still overrides only what it names, and a style with no defined colour
keeps the base's level (plan 323). No shipped theme, platform variant or recipe
changes, so no token value, colour, pair or floor moves.

374 closes the last failing shipped call the 301/323/373 series left, one
composition over: `applyPlatformStyle` takes **any** base, including a theme that
already carries another platform's style, and a style only overrides the roles it
names. Linux dark is the one shipped style that names `destructiveSoft`
(`#3A0B0D`, plan 091, because the light-accent selection wash had to stay visible
on the soft destructive fill), while macOS dark, Windows dark, XP and Aero
inherit the identity tint (`#66191B`). Applying any of them over a Linux dark
theme therefore kept Linux's tint on a different canvas: **1.0005:1** on macOS
dark's background and 1.0448:1 on Windows', under the 1.05:1 floor, so an Alert,
Badge or Toast had an invisible surface while the checker reported it only to a
consumer who ran it — the documented call itself returned a theme the package's
contract rejects. The two dark sets now name the identity tint they already
paint (`darkColors.destructiveSoft`), which moves no pixel on any documented
path and gives the applied style its own canvas's value. `platform-composition`
applies every shipped style and recipe to every shipped base — identity,
`createTheme`, macOS, Linux, Windows, XP and Aero — in both modes, both contrasts
and both requested levels, and holds each result to all three public checks, so
a future style that changes a role another style does not name fails the
cross-product instead of shipping a hybrid.

375 closes the last scrim composition plan 359's list left out. The contract
composited `overlay` over the layout — canvas, card, quiet panel, field fill,
persistent selected row and floating surface — but a window also shows filled
actions and status panels, and a dialog opens over both. An edited theme whose
scrim composited to `primary` or to a soft status fill left the control or the
Alert undimmed while `themeContrastFailures` returned `[]`. The probe over the
24 shipped colour sets finds every proposed surface already clears 1.05:1 —
high-contrast dark is the tightest at **1.075:1** on `primary` — so no colour
moves; the four filled actions (`primary`, `secondary`, `accent`, `destructive`)
and the four soft status panels join `overlaySurfaces` (6 → 14 scrim pairs).
The transient pointer washes and the filled families' hover/press steps stay
out, as do `disabled`, `skeleton` and `track`; none is the content a dialog
opens over.

376 closes the truth gap plan 375 left in the same document. `overlaySurfaces`
grew from six to fourteen, and `docs/tokens.md`, the §9 accessibility table row
and the §9 explanation state fourteen, but the §7 elevation paragraph still said
"the six surfaces it covers — `background`, `card`, the `muted` panel, the
`input` fill …, the persistent `selected` fill … and `popover`", so the page
contradicted itself in two places. Nothing read §7: the floor-table guard is
built from `overlaySurfaces`, the paragraph was not. The same paragraph called a
level "exactly one shadow" while `Elevation` is `ElevationShape[]`, a shipped
level carries at most one entry and `elevationShadows` resolves the list for a
web renderer — the opposite of what `elevation.ts` and `docs/tokens.md` state —
and it called the transient pointer washes "the one exclusion" though the filled
families' `xHover`/`xActive` steps are excluded too. §7 now groups the fourteen
surfaces the way the reference does, names both pointer-state exclusions and
describes the level as the list the helpers read. `docs.test.ts` slices the
paragraph and holds every member of `overlaySurfaces`, the derived count word
and the two helper names to it, so the next surface added to the scrim contract
cannot ship with a stale rationale. No token value, colour, pair or floor moves.

377 pins the two figures the same page derives from the palette but no test
read. The §9 scrim explanation states "The tightest of the fourteen pairs is
**1.075:1** (high-contrast dark, `overlay` on `primary`)", the minimum over the
fourteen `overlaySurfaces` and all 24 shipped colour sets; the "Not covered,
deliberately" list states that accent-toned text cannot clear 7:1 through the
AAA light wash, quoting `primaryText` at **6.75:1** on `muted` and **5.48:1** on
`active`. Both are correct today (the probe measured 1.0745, 6.748 and 5.48),
but a palette edit could move either without failing a pair: a slightly stronger
AAA dark scrim still clears 1.05:1, and a moved iris step changes the wash
figure while the plain `primaryText` pairs still pass. `docs.test.ts` now builds
a labelled 24-set list, reduces the scrim ratios, derives the two wash ratios
from `getTheme("light", "high")` and asserts the page's own sentences, so the
page cannot quote a number the package no longer produces. No value moves.

380 closes the last composition the extension mechanism left to every caller.
The package owned every axis a theme is chosen by — `themeModes`,
`themeContrasts`, `platformNames`, `platformRecipeNames`, `densityNames` — and a
narrowing guard for each, but not the act of turning them into a theme: the
example `themeFromStoredChoice` resolved `mode` and `contrast` only and was not
public, so a settings screen or the docs platform toggle had to invent the
precedence itself. Two rules are easy to get wrong. A platform style carries its
own density preset — macOS is `compact`, Linux and Windows are `comfortable` —
so a stored density must be applied **after** the style or it silently reverts.
A recipe is an edition of Windows offered beside the platform axis, so a
malformed stored object carrying both must resolve the recipe, the more specific
answer. Fallbacks are the third half: an unknown density keeps the resolved
platform's preset rather than a hardcoded `comfortable`, which would turn a
macOS workspace comfortable because a settings row was hand-edited. The new leaf
module ships `ThemeChoice` (five `unknown` fields — the shape is still the
caller's `Schema` boundary) and `resolveThemeChoice`, which narrows each axis
through the package's own guards and composes `getPlatformTheme` /
`getPlatformRecipeTheme` / `extendTheme`. It stays a leaf so
`theme-choice → platform-recipes → theme` keeps its direction.
`theme-choice.test.ts` holds every shipped combination to the three checks and
proves both precedence rules and the three fallbacks. No token value, pair,
floor, metric, platform style or recipe moves.

381 closes the selection state the contract never compared with the state before
it. A selectable `List` row paints `accent` under the pointer and `selected` once
chosen, but the two roles are the **same fill** in the identity (light and dark,
default and high contrast) and in macOS light, and within the 1.05:1 step floor
on Windows light, macOS dark and XP light — so hovering one row looked like
selecting another and clicking a hovered row changed nothing. `selected` is now
a `step` pair against `accent` (`selectionStepPairs`, the same class plans 342
and 357 publish for the filled and wash ladders), and eight shipped sets move
`selected` one designed step; macOS light's `selectedForeground` moves with it
because no step deep enough for the pair kept the old blue at 4.5:1. Linux
light/dark, Windows dark, Aero light and the authored Contoso light style already
cleared the floor or move one step inside their own family. No new role, no
change to `accent`, and the consumer half — a selected row should not repaint
with the unselected hover wash while the pointer is over it — is recorded
cross-team.

382 closes the fourth filled family in the inverse-selection contract. The
package ships `primary`, `secondary`, `destructive` and `accent`
(`filledControlFamilies`), but `selectionFillPairs` and `selectionFillWashPairs`
were hand-typed with three names, so selecting the label on an accent fill was
unmeasured. Deriving both lists from the family index found a real shipped
defect: the accent foreground through the neutral veil measured **4.140:1** on
macOS light and **4.430:1** on Linux dark, under the 4.5:1 the on-colour role
has, while `themeContrastFailures` returned `[]`. The two accent foregrounds
move one designed step (`#0055B3` → `#004A9E`, `#A8CBF0` → `#B4D5F7`), both
lists publish four pairs each, and every other shipped set already cleared the
floor. The corrected tightest figures — 4.827:1 text (macOS dark) and 1.075:1
veil (identity dark high) — replace the stale 6.10:1 and 1.105:1 the page had
quoted without a test; the new case derives both from the shipped sets. No new
role.

383 closes the last partial gate in the extension mechanism. A consumer copying
a platform style is taught three checks — colour format, contrast and numeric
metrics — and each is total over its own domain, but the guarantee is only total
when all three run. The reference introduces contrast first, so a theme whose
only defect is a zero focus-ring spread or a `shadow: "black"` tint returns
`[]` from the check most likely to be adopted alone; the `docs-site` interlock
row is the first real consumer of that mistake. `themeFailures(theme, contrast =
theme.contrast)` composes the three into one discriminated list in diagnostic
order (format, contrast, metrics), the `ThemeFailure` union names the `kind`,
and the `contrast` argument reaches the contrast half unchanged. No role, pair,
floor, metric or shipped value moves; the new suite holds every shipped set to
`[]` and proves a partial check cannot pass a broken theme.

384 closes the last three fit rules that compared an item to the **outer**
metric. The contract already claimed that an icon and a field adornment "fit the
smallest control" and that a chip "fits in a field", but a control paints its
two borders inside its height and a field paints its borders and horizontal
padding inside its minimum width — from `primitives/src/core/style.ts`, whose
`height` is `controlHeight[size]`, `borderWidth` is `borderWidth.thin` and
padding is `controlPaddingX[size]`. The probes returned `[]` for an adornment
equal to the control height (a 24px glyph in a 22px content box), a chip equal
to the field width (80px in a 68px content box at `fieldMinWidth: 90`) and an
icon equal to the control height. The three bounds now name the container —
`controlHeight.sm ≥ iconSize.md + 2 × borderWidth.thin`,
`controlHeight.sm ≥ fieldAdornmentSize + 2 × borderWidth.thin`, and
`fieldMinWidth ≥ chipMinWidth + 2 × controlPaddingX.md + 2 × borderWidth.thin` —
so the check reports the metric a reader must raise. Every shipped set fits
comfortably (16 in 24/28/32; 80 in 200), so no token value moves; the four new
cases fail without the bounds and `metrics.test.ts`'s icon case moves from the
removed `at-most` rule to the density member.

385 closes the last documented form the three checks never read. `docs/tokens.md`
states that GPUix 0.10.0's `StyleDesc.fontFamily` is a **single** string, not a
CSS stack, "so an entry never contains a comma; a family the machine does not
have falls back silently" — but that was held only for the shipped
`platformTypes` table. A probe over an edited theme returned `[]` from
`themeColorFailures`, `themeContrastFailures`, `themeMetricFailures` and
`themeFailures` for `sans: "Inter, system-ui, sans-serif"` (the CSS habit every
consumer brings), for `""` and for `"   "`. A comma stack is one family name to
GPUI, no machine has it, and every label paints the system fallback while the
guarantee says the theme is good. `themeTypefaceFailures(theme)` is the fourth
check: it reports a family that misses `non-empty` or `single-family`, for both
`sans` and `mono`, with `typefaceRoles` and `typefaceRules` as the ordered
indexes. `themeFailures` composes it in colour → typeface → contrast → metric
order, because a malformed family belongs beside the malformed role and before
the measurements painted with it. A name with spaces inside (`Helvetica Neue`)
and the `.SystemUIFont` sentinel pass; every shipped identity theme, platform
variant and recipe passes, so no family moves.

386 closes the last fit rule the numeric contract stated for the wrong role. It
held `controlHeight.sm` to one **label** line plus its two borders, but a field
does not paint the label role: `fieldTextStyle` and `otpCellStyle` in
`primitives` set the body size, leading and weight inside the same box, and
`controlStyle` fixes that box at `controlHeight[size]` with its borders painted
inside. A probe with `body.lineHeight` 30 returned `[]` from all four checks
while the shipped 28px `sm` control leaves a 26px content box — a clipped line on
every small input — because the `rowHeight` rule only reads the row, and 32
clears 30. The label bound becomes the taller of the label and body lines, so one
member carries one bound and the `at-least` rule keeps its place in
`metricRules`. No shipped set moves: every platform compact control is 24px and
the identity is 28, both above 20 + 2. The catalogue, design system, README and
ledger now say both lines, and `body-line-fit.test.ts` proves the rule can fail,
the content-box subtraction, the label/body maximum and the other checks'
blindness to it.

387 closes the composition gap plan 380 left on the other half of the axis
story. 380 gave the persisted choices one resolver, but the package still owned
each theme axis (`themeModes`, `themeContrasts`, `platformNames`,
`platformRecipeNames`) and each resolver without owning their **enumeration**, so
every surface that said "every shipped set" built its own list — and they
disagreed: `contrast.test.ts` enumerated 4 (identity only), `theme-check.test.ts`
20 (recipes at the default contrast only), `color-format.test.ts` 24, and
`metrics.test.ts` iterated `platformNames` unfiltered, repeating the identity
four times at one contrast, while the README quoted a sixth number ("all 20").
`shippedThemes` derives from the axis owners and calls the three public
resolvers, so the 24 sets — 4 identity, 12 styled platform variants and 8
recipes, each at its mode and contrast — and their provenance are one edit at
the owner; `platformVariants` is the styled subset, because `default` is the
identity rather than a fourth look. The three suites that claim the full set now
enumerate it, `shipped-themes.example.ts` is the copyable loop, `docs.test.ts`
holds the page's derived count, `readme.test.ts` holds the front door's, and the
reference, design system, README and ledger name the enumeration. No colour,
role, pair, floor, metric, platform style, recipe or theme value moves.

388 finishes the migration plan 387 started. The first audit moved the three
largest lists; this one finds sixty-five more suites whose guard case says "every
shipped theme" while building its own matrix — **4** (identity only: `focus`,
`motion`), **10** (identity and the styled variants: `control-boundary`,
`wash-text`, and eighteen more), **14** (variants and recipes at the default
contrast only: `filled-states`, `typeface`, and four more), **16** with the
identity counted twice, **20** or **28** with `default` folded back in, and one
(`elevation-tint`) that also misses every AAA variant and recipe. The missing
half is almost always the **AAA recipe** — eight real editable sets the docs
toggle offers — and `motion.test.ts` went further, asserting that every shipped
theme shares the identity's motion, which Windows' `fast === step` falsifies.
Every full-set claim now maps `shippedThemes` and labels a set with
`theme.name`; the three `quoted` subsets stay because they are the figures the
catalogue quotes. A new guard in `shipped-themes.test.ts` reads every suite and
fails when a case title claims "every shipped set/theme" without importing the
enumeration, with synthetic sources proving both directions. No assertion,
colour, pair, floor or metric changes.

389 closes the last gap in the "copy a platform file and own the look" story.
`PlatformStyle` could carry a platform's families, radii, density, motion, colours
and elevation, but not its **type scale, spacing, border widths, icon and avatar
sizes or component dimensions** — the six numeric groups `extendTheme` already
accepts. A consumer who copied `platform-styles/macos.ts` therefore had to leave
the file they own and call `extendTheme` for a 15px body, 10px section spacing or
a 240px overlay. The groups join `PlatformStyleStructure` as optional fields,
`applyPlatformStyle` passes them through the structural overrides (so they apply
at both contrast levels), and each merges field by field like every other group.
Every shipped style omits them, so no theme, platform variant, recipe, colour,
pair, floor or shipped metric moves; `platform-extension.example.ts` is the
copyable file and `platform-extension.test.ts` proves each group applies, omitted
groups inherit and an explicit `undefined` is ignored.

390 closes the one named scale plan 358's ladder list left out: elevation. The
design system publishes `sm` → `md` → `lg` as increasing heights (resting cards,
menus, dialogs), and `elevationShadow` paints a level's first entry, but
`themeMetricFailures` compared only the range of a single shadow — four finite
geometry fields, a non-negative blur and an alpha inside `0…1`. A probe on the
shipped light theme returned `[]` for setting the largest level to the resting
card's feather and for a `lg` with a 0px feather, so a copied theme could make
"large elevation" the closest to the surface while every check stayed green. The
rule compares the painted entry's `blurRadius` across `sm`, `md` and `lg` and
holds it non-decreasing; opacity is deliberately not a step, because a fainter
large shadow and a flat theme are designs. Every shipped identity theme, platform
variant and recipe is monotone in the feather (identity 2 → 12 → 40 light,
2 → 24 → 56 dark; the three platform styles and both recipes likewise), so no
token value, colour, pair, floor or metric moves.

391 closes the same class of drift one surface over: the published JSDoc for
`themeContrastFailures` — the paragraph a doc generator renders and a consumer
reads before trusting the check — restated the contract's surfaces and families
instead of naming its lists, and had gone false twice. It still said "the nine
surfaces a disabled control paints" after plan 307 grew `inactiveSurfaces` to
thirteen, and called the inverse `selectionOnFill` veil "measured on `primary`,
`secondary` and `destructive`" after plan 382 derived both veil lists from
`filledControlFamilies` and added `accent`. `snippets.test.ts` guards the
`@example` fences and `docs.test.ts` the two Markdown pages, so nothing read
this prose. The paragraph now names the nine lists the function applies — the
`contrastPairs` union, the five selection lists, the two inverse-veil lists and
`overlayWashPairs` — plus `filledControlFamilies` and `themeColorFailures`, and
states no count. `contrast-reference.test.ts` reads the source, slices the block
and fails if a list loses its name, a family literal returns or a count is
restated. No role, pair, floor, metric or function body changes.

392 closes a hierarchy the documents state and the checks never enforced. The
design system calls `mutedForeground` secondary text, `disabledForeground` a
"readable dim … well below secondary text" and `placeholder` a hint dimmer than
a caption; the public contract enforces only minimums, so raising a tier to body
strength returned `[]` from `themeFailures` while a disabled control looked
enabled. The rule survived as two shipped-theme assertions on one surface each.
`themeTextTierFailures` is the fifth check: `textTiers` is the ordered
`[dimmer, brighter]` list, the comparison runs on the surfaces where both roles
already have a documented pair (derived from `contrastPairs` — 12 + 12 + 5 at
the time; plan 500 adds the three surface body roles), and each tier must sit
one `contrastFloors[level].step` below the one above it.
Every shipped set and every base × style composition clears it (1.274 / 1.349 /
1.440 at the tightest), so no colour, pair, floor or metric moves. The one total
call now composes five checks in colour → typeface → contrast → hierarchy →
metric order.

393 closes the same "a state must be perceivable" rule one paint further. A
`Skeleton` paints the role at `skeletonPulseOpacity` (0.6) for half of every
cycle, but the contract measured only the opaque value: identity dark's
`#3D4552` on `selected` was 1.058:1 opaque and **1.008:1** at 60%, so the
placeholder vanished on a selected row for half the pulse while
`themeContrastFailures` returned `[]`. `skeletonPulsePairs` composites the dim
frame on the same eight surfaces, `ContrastFailure` gains the optional
`opacity`, and the dark skeleton moves a half-step to `#434C5A` (1.074:1 dim,
1.179:1 opaque) so every shipped set passes. No other colour, pair, floor or
metric moves. The audit that found it also recorded two follow-ups in `TODO.md`:
the fills an action paints inside a soft status panel (80 shipped pairs under
1.05:1) and the clipped ButtonGroup's inset ring on a filled button (seven sets
at 1.000:1), which is a `primitives` fix.

Plan `685` closes the extension mechanism's last direction. `extendTheme(base,
overrides)` derives a theme; nothing expressed an edited theme back as the
overrides that produced it, so a runtime editor held a whole `Theme` and could
only persist it as a whole object — the boundary the catalogue deliberately
leaves to the application's `Schema`. `themeOverrides(base, theme)` returns the
minimal `ThemeOverrides` that `extendTheme` reproduces, comparing each group
field by field; a tuned density is emitted against the preset it names, an
elevation level is replaced whole, and a different mode returns `undefined`
because the mode is not overridable. The suite round-trips all 24 shipped sets,
a platform over another platform, a high base to an explicit default, and an
edit touching every expressible group, and pins the minimal shapes. No colour,
pair, floor, metric or shipped theme moves.

Plan `686` corrects one sentence the density section states and nothing held to
the code.
The page told a reader that an un-narrowed stored density "becomes a theme with
no metrics"; a stale string keeps the base's preset, and the documented
`themeWithDensity` helper returns the theme unchanged — both already executed and
guarded. The paragraph now names `isDensityName`, `themeWithDensity` and the
shared `resolveThemeChoice` rule instead of the false consequence, and a
`docs.test.ts` case fails on the old claim or a missing helper name. No code,
colour, pair, floor, metric or shipped theme moves.

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
| `687` | **Platform theme recipes** — reshape the Windows variant into XP (Luna) / 7 (Aero), and follow Omarchy's live system theme | E | `063`, `203`, `200` | partial — A done (`311`); B blocked on a Linux host; renumbered from `433` by `688` |

> The `200` block was written by the reference-adoption executor on
> 2026-10-17 from `.agents/slop/reference-research.md`. The per-workstream plans
> (`010–019`, `020–040`, `050–053`, `100–130`, `410–412`) live on their own
> branches and are merged into `main` as each workstream completes; this index is
> the union.

Plan `394` closes the last unmeasured state the tests' own audits recorded: an
action inside a soft status panel. `components` paints the default Button —
`secondary` at rest, the generic `hover` wash under the pointer, `active` while
pressed — and a ghost dismiss control on the panel's tone-tinted root, and no
pair measured any of the three against the tint. The audit found **80 of 288**
shipped fill-on-tint pairs under the 1.05:1 floor, the worst Windows light
`active` on `destructiveSoft` at **1.0042:1**; a neutral wash tuned for the
canvas cannot be perceived on the four tints, which sit in one narrow luminance
band in each mode, so the fix is a designed raised family
(`softAction`/`softActionHover`/`softActionActive`/`softActionForeground`) and a
`softAction(theme)` resolver rather than a palette move. The contract grows
339 → 360 pairs and 66 → 70 roles, every shipped set passes, and the `components`
migration is recorded cross-team.

Plan `395` closes the gap plan `394` opened in an earlier list: `softAction` is a
resting fill a window shows, but the modal scrim contract still named only the
four `primary`/`secondary`/`accent`/`destructive` actions and the four soft
panels, so an `overlay` that composited to the Alert's "Try again" button left it
undimmed while the checker returned `[]`. The fill joins `overlaySurfaces`
(14 → 15 scrim pairs); every shipped set already clears 1.05:1 (1.5519:1 at the
tightest, AAA dark), so no colour moves.

Plan `396` closes the documentation drift plan `394` left behind. The palette
moved 66 → 70 roles and the two sentences `color.test.ts` already read were
updated, but the `ThemeColors` row of the type index and the colour-format
paragraph still said 66, and the `FontWeight` row and the Typography prose
claimed a shipped `700` no `typography` role uses (the scale's strongest weight
is 600). `docs.test.ts` never parsed the type table, so the page disagreed with
the package while every suite stayed green. The two counts and the two weight
sentences are corrected, and a new case derives every count and ordered range in
the type table from
`colorRoles`, `textRoles`, `motion`, `typography`, `avatarSize` and `iconSize`,
so a future value edit has to take the document with it.

Plan `397` corrects the scope of the family plan `394` shipped. Every document
offered `softAction` to "an Alert, Badge or Toast", but a Toast is a `popover`
card (`toast/viewport.tsx:100`), not a tone-tinted panel: `softAction` against
`popover` measures **1.0000:1** in eleven of the twelve light shipped sets and
1.0190:1 in the twelfth (XP light), all under the 1.05:1 surface floor — so a
consumer following the reference would give a Toast an invisible rest fill while
`themeContrastFailures` returned `[]` (the family is correctly measured on the
four soft fills only). The prose now names a tone-tinted Alert or Badge, the
Toast action keeps the canvas neutral family (`filledControl(theme,
"secondary")`) that `stateFillSurfacePairs` measures on `popover`, and the pair
rationales no longer credit a Toast with a tint it never paints. A
`soft-action.test.ts` case states the floating-card failure (all twelve light
sets, identity at exactly 1) and proves the canvas family clears the same
floors; a `docs.test.ts` guard fails if the stale phrase returns to the
reference, the design system, the README or the package's public JSDoc. No
colour, pair or count moves.

Plan `398` closes the same class of gap one layer inside the package: three
composition suites ran a hand-built subset of `themeFailures` and called it the
guarantee — `applied-palette` and `theme-choice` ran contrast, metric and colour
(3 of 5, missing typeface and hierarchy), `platform-composition` ran four
(missing hierarchy) — so a composed theme whose only defect was a CSS family
stack or an inverted text tier passed while the suite's title said “all checks”.
`themeChecks` indexes the five kinds, `ThemeFailureKind` derives from it and
`ThemeFailure` is a mapped type over it, so the three suites now call the total
check and a future sixth check reaches them. The documents and test titles build
the count from `themeChecks.length`; `docs/tokens.md` no longer calls four checks
the guarantee. A `docs.test.ts` case fails on “all three checks” / “all four
checks”, and a `theme-check.test.ts` case fails if the composition emits a kind
outside the index or in a different order. No colour, pair, floor or metric
moves.

Plan `399` closes the last half of the status family's contract. The documents
publish three tonalities per status — a solid fill with one readable foreground,
the soft surface and edge, and `xText` for plain surfaces — and `markPairs`
already treats the solid roles as *glyphs* (`success`, `destructive`, `primary`;
not `warning`, whose light fill is 1.78:1 on the canvas). But the solid role as
a **fill** was measured only against its own foreground: `stateFillSurfacePairs`
covers the interactive fills, and a status chip is not interactive. A copied
platform style that set a status fill near its panel erased a solid Badge while
`themeFailures` returned `[]`, and `statusTone` resolved every tonality except
the solid pair, so a consumer retyped `theme.colors[tone]` /
`theme.colors[`${tone}Foreground`]` by hand. `statusFillPairs` holds each of the
four solid fills to 1.05:1 on the eight surfaces a chip sits on (`chipSurfaces`,
the list plan 308 already owns for the soft edge), `statusTone(...).solid`
resolves the pair in one call, and the contract moves 360 → 388. Every shipped
set already clears the floor — the tightest is **1.262:1** (XP light `warning`
on `selected`) — so no colour moves. The documents now state the distinction the
mark series assumed: a solid fill is a fill on the eight chip surfaces, a dot or
label is `xText`.

Plan `500` closes the hierarchy's last blind spot. `textTiers` compared secondary
text with `foreground`, but a card, a menu/dialog and a field paint their **own**
body role — `cardForeground`, `popoverForeground`, `inputForeground` — and those
roles were never the brighter side of a tier. A copied theme that set one of
them to `mutedForeground` rendered every card value, menu label or field entry
at secondary strength while all five checks returned `[]`: identity light's
secondary text measures **9.671:1** on a card and on a field, so the 7:1 body
floor cannot see the inversion. The three tiers are now in `textTiers`, the
surfaces derive from `contrastPairs` (one card, four popover surfaces — the
popover and the three row washes it shares — and the five surfaces typed text is
documented on), and every shipped set clears the step at **1.274:1** (high
contrast light), so no colour, pair, floor or metric moves. `selectedForeground`
is deliberately not a body tier: it is the secondary-strength tint an inherited
label keeps inside a selected row, whose title is `foreground`.

Plan `501` closes the floor table's last stale row. Plan `395` added the raised
action a status panel carries (`softAction`) to `overlaySurfaces` and updated
§7, the catalogue and the README, but the §9 accessibility floor table still
listed fourteen surfaces and the explanation said "fifteen" while naming
fourteen. No test parsed the row: the exact-row array omitted the modal scrim
entirely, and the pair-class map sends `surface` to the interactive-fill row.
The row and the explanation now name all fifteen, and two cases derive their
members, the count word and the row's floor cells from `overlaySurfaces` and
`contrastFloors`, so the next scrim surface cannot leave either behind. No
token value, pair, floor or metric moves.

Plan `502` closes the one rule the step contract could not express. Plans 342,
357 and 381 publish each pointer state's **distance** — one 1.05:1 step — but a
ratio is symmetric, so they cannot see a step that moves the wrong way. Plan
097's original defect was exactly that: the light primary's hover and press came
out *lighter* than the resting fill, toward the white canvas. Every shipped
theme now steps away from the canvas (darker in light, lighter in dark) and
`filled-states.test.ts` asserts it on the shipped constants, but a copied theme
could reintroduce the defect and still return `[]` from all five checks. A probe
made the gap concrete: `primary #1E1060 → #2A1A7A → #372394` clears the on-colour
floor (11.47:1 at the tightest) and the step floor (1.176 and 1.199), while both
steps move *lighter*. `stateLadders` names the four filled families (derived
from `filledControlFamilies`), the panel action, the generic wash and the
selected step; `themeDirectionFailures` reports a step that moves toward the
canvas, and `relativeLuminance` publishes the comparison it makes. A sixth
check kind, `direction`, joins `themeChecks` between `hierarchy` and `metric`;
an **equal** pair stays the step lists' defect, so one collapsed edit does not
produce two diagnostics. Every shipped set already passes (the four families,
`softAction`, the wash and the selection step included), so no colour, pair,
floor or metric moves.

Plan `503` closes the surface plan `347` deliberately left out of the groove's
contract. `track` was measured on the six resting surfaces, with `hover`/`active`
excluded on the argument that "the filled part still carries the value" and that
XP light has no track that clears both the wash floor and the mark floor. Both
halves fail: an *indeterminate* progress bar is only its groove (the case plan
347 itself used), and a slider's unfilled rail is the span the reader is about to
change — while a selectable `List` or table row is hovered and pressed before it
is used, and the four soft status fills have been first-class surfaces since
plans 090–095, 307, 320, 340 and 346, so a progress or slider inside an Alert is
invited by the shipped API. The audit found shipped pairs under 1.05:1: identity
light `track` on `destructiveSoft` at **1.009:1** and `infoSoft` 1.038, identity
dark on `infoSoft` **1.019:1**, macOS light on `active` **1.020:1**, Linux light
1.047, XP light on `warningSoft` **1.007:1** and `hover` 1.030, and every
high-contrast dark set (which inherits the AAA palette) on `active` **1.047:1**
and `warningSoft` 1.030. The XP blocker was real but was a *mark* constraint, not
a groove one: the inherited identity `success` forces the groove above 0.643
while XP's own `active` forces it below 0.618. A recipe that owns its era's
palette names a deeper Luna green (`#0E6B40`, plan 328 made both recipes own
their dark palette and plan 366 moved six light status roles for a contract), and
the window opens. `trackSurfacePairs` now names twelve surfaces — the six plus
`hover`/`active` and the four soft fills (388 → 394 pairs) — and seven values
move one designed step: identity light `#D5D9E2`, identity dark
`palette.neutral[700]`, AAA dark `#414141`, macOS light `#D3D3D8`, Linux light
`#D8D8D8` and XP light `#D2CCB4` with its own `success`. Every shipped set
passes `themeFailures` and the four mark pairs, so no other role moves and no
floor changes; `track-contrast.test.ts` states the erased-groove regressions and
both docs pages, the README and the ledger derive the new surface list and the
tightest figures from the contract.

Plan `504` closes the fill family the selection-veil contract never reached.
Plan `344` shipped `selectionOnFill` for content on a filled action and plan
`382` derived both fill lists from `filledControlFamilies` — the four
**interactive** families. Two documented opaque fills are outside that index: a
solid status chip, whose `Solid fill` column and `statusSolidStyles` example
paint a label a reader can drag over (plan `399` made the fill a surface), and
`softAction`, which is literally the action a tone-tinted panel carries (plans
`394`/`397`) and was missing from the list its own documentation describes. The
accent-tinted wash has no pair on any of them, and on fourteen shipped
compositions it is not perceivable: identity light `success` **1.0456:1**,
identity dark `success` 1.0240 and `info` 1.0274, macOS light `success`
1.0259, Linux light `success` 1.0266 and `info` 1.0474, Windows light and
Windows 7 light `info` 1.0109 / 1.0108, and every high-contrast dark set on
`softAction` 1.0468 — under the 1.05:1 floor, so selecting a status chip's
label or a Retry action shows no highlight. `selectionFillRoles` is the one
index — the four families, the three solid status chips that are not already an
action fill, and `softAction` — and both lists derive from it, so a fifth tone
or a new panel action joins one place. The AAA dark `softAction` is the one
value that moves (`#3A414D` → `#343B47`): a 15% white veil over the old fill left
its white label at **6.623:1**, under the AAA 7:1 floor, and a weaker veil stops
being perceivable on `primary` (1.048:1 at 10%), so the fill takes one darker
step instead — the label now measures **7.165:1** through the veil and the raised
action 1.071:1 on every AAA soft tint, and the accent wash over it becomes
perceivable. Every other value holds: the tightest veil is **1.060:1**
(high-contrast dark, `info`) and the tightest text **4.827:1** (macOS dark,
`accent`), and the solid-chip example now applies the fill selector. The
eleven-composition regression list, the public-checker cases and the docs guards
live in `selection-on-fill.test.ts`, `docs.test.ts` and `status-solid.test.ts`.

Plan `505` closes the last unmeasured painted value. Plan `099` established that
the AAA dark scrim must veil with light — a dark wash cannot darken a pure black
canvas — but the elevation kept a black tint on that canvas and measured
**1.000:1** at every level, while §7 of the design system claimed the AAA modal
was separated by "a light wash, its own edge and elevation". Nothing caught it
because `shadow` was the one role still in the contract's exemption list; plan
`371` holds only its hex form, and a copied palette could therefore erase every
shadow while all six checks returned `[]`. The set now paints with light
(`shadow: #FFFFFF`) and carries its own alphas
(`highContrastDarkElevation`, 10/14/18%), like the scrim. The second half is the
platform path: plan `345` applies a platform's level at high contrast, and a
dark platform's 0.4–0.8 opacity over a light tint would paint a near-white halo,
so at high contrast a style now lends the level's **geometry** while the base's
**alpha** stays with its tint. `elevationSurfaces` publishes the four surfaces a
raised element floats over, and `themeContrastFailures` composites every defined
level at its own alpha over them, reporting the level and the fraction. Every
shipped set passes; the tightest is 1.061:1 (identity dark, `sm` on
`background`) and AAA dark moves from 1.000:1 to 1.207:1.

Plan `506` closes the last text role a selected row paints. Plan `312`
established that a selected row's title is `foreground` — `ListItemTitle`
overrides the row's inherited colour — while the label beside it keeps the
secondary-strength `selectedForeground`; plan `363` had already added a card's
second body role for the same reason. The selection contract measured only
`selectedForeground` and `mutedForeground` on the `selected` fill, so dragging
across a selected title had no pair behind it: identity dark measured
**6.480:1**, Linux dark 6.648:1 and the Windows palette 6.908:1 — five dark
sets under the 7:1 body floor while all six checks returned `[]`. `selectionPairs`
now carries `foreground` on `selected` beside the inherited label (19 → 20), and
three dark values move: the identity wash from 20% to 14%, the Windows (and XP
and Aero) wash from 40% to 33%, and Linux dark's selected fill one designed step
darker (`#2B4F76` → `#27476A`), because its wash cannot soften far enough without
falling under the 1.05:1 highlight floor. The Windows wash carries two floors —
the title on `selected` and the highlight plan 091 tuned for the soft
`destructiveSoft` fill — and 33% is the narrow window that clears both. The
titles now measure 7.144 / 7.389 / 7.164:1, every wash stays perceivable
(1.264 / 1.125 / 1.136:1, and 1.071:1 on the Windows soft fill), and Linux dark
keeps a 1.216:1 step past its accent wash. No light or high-contrast value moves,
and the plain `contrastPairs` count stays 394.

Plan `507` measures the element the modal scrim carries. Plans `099`, `359`, `375`
and `395` hold the scrim against everything it covers, but nothing measured the
dialog painted **on** it: `components/dialog.tsx` paints `popover` at :181 and the
scrim at :248, so a theme whose `overlay` composites to its own `popover` ships a
dialog with no face and only a 1px edge while all six checks return `[]`. The
elevation contract does not cover it either — plan `505` measures each level over
the four page surfaces, and a dialog's shadow lands on the scrim: on the identity
dark scrim (`#060709`) the `lg` tint paints **1.0353:1**, and no black tint can
clear the floor (pure black reaches **1.0421:1**). `dialogSurfacePairs` composites
`overlay` over the six page layout surfaces (`background`, `card`, `muted`,
`input`, `selected`, `popover`) and holds `popover` to the 1.05:1 `surface` floor.
Every shipped set clears it (tightest 1.2100:1, identity dark on `selected`), so no
colour moves. The content fills behind the scrim are deliberately not face pairs:
their band is narrow enough that macOS dark's face meets the scrim over a
`primary` action at **1.0213:1**, where the dialog's `border` carries the
silhouette at 1.4954:1, and no `popover` value leaves the band — lightening the
face to `#343436` fails five existing pairs, and raising the scrim to 70% clears
`primary` (1.0775:1) but collapses `destructive` (1.0185:1). The documents now say
what the measurements support: a modal is separated by its scrim, its face on the
layout and its edge, not by its shadow.

Plan `508` closes the last resting content family the scrim list omitted: a
Badge's solid status chip. Plan 399 made the solid fill a first-class fill and
plan 504 made it a selection surface, but `overlaySurfaces` still named only the
four action families, the raised panel action and the four soft panels, so a
scrim that composited to `info`, `success` or `warning` left the chip undimmed
while the checker returned `[]` (`destructive` is already an action fill). The
three join the list (15 → 18 scrim pairs); every shipped set already clears
1.05:1 — high-contrast dark `info` is tightest at **1.0599:1** — so no colour
moves and that figure becomes the scrim contract's published tightest.

Plan `509` gives the elevation walk the two persistent surfaces plan `359`
added to the scrim. `elevationSurfaces` named the canvas, a card, the quiet
panel and a floating surface, so a context menu or preview card opened over a
selected row had no shadow pair, and neither did a popover flipped above its
trigger, whose shadow lands on the field's `input` fill. `layoutSurfaces` is
already the six persistent page surfaces, so the elevation list now derives
from it rather than repeating four of them; the walk moves from twelve to
eighteen painted pairs (three levels over six surfaces), every shipped set
already clears 1.05:1 (1.109:1 at the tightest, macOS dark `sm` on `input`),
and no colour moves. The suite that proves the shipped guarantee drops its own
hand-typed four-surface copy for the public list, and a regression case holds a
`shadow` equal to `selected` or `input` to the checker.

Plan `510` measures the unavailable label through the text-selection wash. Every
other text role the library paints is held through the inherited `selectionColor`
— body, secondary, status, soft-panel and on-fill text — but `disabledForeground`
was measured only at rest, on the thirteen surfaces plan `306` enumerated. A
disabled control's label is selected with the copy around it, and the accent wash
composites over the surface beneath it: the previous light `#6E7787` measured
**2.586:1** on Windows light's `selected` fill and 2.604–2.945:1 on the other
default light sets, and the AAA sets **3.430:1** (light, `destructiveSoft`) and
**4.357:1** (dark, `active`), under the 3:1 / 4.5:1 inactive floor, while all six
checks returned `[]`. `selectionInactivePairs` adds a washed pair on each
`inactiveSurfaces` entry (thirteen), and three values move one designed step away
from the panel: identity light `#6E7787` → `#545D6C`, AAA light `#5A5A5A` →
`#444444` and AAA dark `#A9A9A9` → `#B0B0B0`. Every high-contrast platform
variant inherits the AAA palettes; XP and Aero light already passed. Each value
stays 1.455 / 1.69 / 1.643:1 below `mutedForeground` at the tightest, so the
inactive tier does not collapse into secondary text. Every shipped set passes
(3.177:1 at the tightest, Aero light `destructiveSoft`; 4.722:1 at AAA),
`contrastPairs` stays **394**, and the two suites that filtered `inactive`
failures by class alone now name the role and the wash they mean.
`selection-inactive.test.ts` states the erased-label regression, the at-rest
passes that hid it, and the live AAA edge one step lighter.

Plan `511` closes the one paint the theme could reach but never owned. Plan `337`
established that a pinned native `<input>`/`<textarea>` reads exactly one field
from its `theme` prop — `caret` — and the package shipped no value or helper for
it, so every field kept the runtime's built-in dark caret (`#7C86FF`). Measured
with the library's own `contrastRatio`, that caret is **3.129:1** on the AAA
light `input` and **2.795:1** on its quiet panel, under the 4.5:1 mark floor the
AAA theme declares, while every check returned `[]` because no pair paints the
runtime default. The fix adds no role: the caret is the accent, and `markPairs`
already holds `primary` on the `input` fill and the four `Surface` tones a
transparent field sits on. `nativeFieldTheme(theme)` returns the runtime `theme`
prop from `theme.colors.primary`, so a copied platform style or brand theme
follows its own accent and `themeContrastFailures` already reports a collapsed
one; a consumer that wants another caret replaces the field. A cross-team row
asks `primitives` to pass the helper to the fields it renders. No colour, pair or
floor moves.

Plan `513` measures the one text-selection composition the inverse veil cannot
cover and retires the rationale that no longer matches the palette. A filled
control's label is a plain text child and neither control implementation opts it
out of selection, so dragging over it selects the label while the fill steps to
`xHover`/`xActive`. At the shipped 15% veil **60 of the 360** shipped state-fill
label pairs miss the on-colour floor in **20 of 24** sets (worst **3.353:1**,
macOS dark `accentActive`). The gap is not a missing pair: probed over every
integer alpha from 1% to 30%, in both directions, no single neutral veil clears
both the on-colour floor and the 1.05:1 perceivability floor on the high-contrast
light set, so a state-fill pair would publish a guarantee the AAA palette cannot
meet. The design rule is explicit instead — a filled control's chrome sets
`userSelect: "none"`, and the resting pairs cover content that keeps its fill (a
message bubble, a solid chip, the panel action); the cross-team change is in
`TODO.md`. The same audit corrects the stale pre-506 figures: 17 shipped
compositions across the eight resting fills are under the floor, not fourteen;
six are the accent wash on `primary` (the exact list is six, not seven); the AAA
dark `softAction` veil is **1.574:1**, not 1.047:1. No colour, pair or floor
moves; `contrastPairs` stays **394**.

Plan `514` gives the disabled action inside a tone-tinted status panel its
state. `softAction` is the raised fill an Alert or Badge action paints, but the
contract defined only its available states: a disabled "Try again" had no
presentation and no pair. The canvas `disabled` fill cannot be the panel shape —
it measures **1.0066:1** on XP light's `warningSoft` and **1.0242:1** on the
high-contrast dark `destructiveSoft` — so a raised action keeps `softAction`
when it is disabled and paints `disabledForeground` (4.343:1 identity dark,
5.199:1 AAA dark, so no colour moves), and it does not step because a disabled
control receives no pointer state. `inactivePanelActionPairs` publishes the
resting pair (`contrastPairs` 394 → **395**), and a `textTiers` entry holds the
unavailable label a perceivable step below `softActionForeground` on the five
surfaces they share (2.156:1 at the tightest, high-contrast light on
`successSoft`), so a copied theme cannot make a disabled action look enabled.
The ghost state was already covered by `inactiveSoftPairs`. The consumer
migration is a cross-team row; no colour, floor or type moves.

Plan `516` measures the one surface a focused slider paints its ring on but the
contract never named. The thumb is centred on the rail, so the focus shadow's
left and right arcs land on the groove plan 503 introduced as `track` (the
`primitives` migration from `muted` is already a cross-team row). Identity light
`ring` (`#7567F2`) measured **2.983:1** on the light groove, under the 3:1
boundary floor, while every other shipped set passed; the pair is invisible to
`themeContrastFailures` because `ringSurfaces` stops at the plain surfaces, the
washes and the soft fills. `ringTrackPairs` adds `ring` on `track` as a
boundary pair (395 → **396**), and the identity light ring moves one ramp step to
`iris[700]` `#4C39B5` (7.24:1 on the groove; every existing ring pair gains
contrast). `iris[700]` rather than `iris[600]` keeps the ring distinct from
`primary`, because the known `primitives` clipped inset ring paints `ring` on
the primary fill and a ring equal to it is invisible there. The invalid slider
keeps the accent ring, so the groove is deliberately not an `invalidRingPairs`
surface. No other role, floor, type, metric or platform value moves.

Plan `517` closes the one text-bearing surface plan 353's component-dimension
audit never reached. `Keycap` (in `keyboard-shortcuts.tsx`) paints the caption
role on `muted` with a `border` edge and `radius.sm`, but its box is the literals
`minWidth: 20, height: 20`, so a brand can theme the keycap's fill, edge and
radius and not its size. The gap was measurable: raising the caption leading to
22px leaves the keycap's 18px content box (20px less its two borders) unable to
hold the line, `themeMetricFailures` returns `[]`, and every shortcut label
clips. `dimensions.keycapSize` is the fixed surface (20px, so no pixel moves),
inherited by every shipped theme, platform variant and recipe, and the metric
contract holds it to one `caption` line plus its two borders — the same
content-box rule plans 384 and 386 apply to a glyph and a body line. The other
literals the newer components added are deliberately not tokens: a carousel
dot's diameter, a timeline dot's diameter and the toast's 3px tone bar are mark
and chrome geometry, not surfaces a theme owns. The `components` migration to
read the token is a cross-team row.

Plan `518` publishes `fontWeights`, the ascending weight set the shipped type
scale actually uses, derived from `textRoles`/`typography` rather than a second
literal, and corrects the two surfaces plan `396` left behind: the public
`FontWeight` JSDoc named a `700` no role uses and `docs/design-system.md` still
said "The four weights", while `docs/tokens.md` and its guard already said three.
The JSDoc, the design-system sentence and the catalogue now name the same
derived list, `font-weights.example.ts` is the font manifest a bundler copies,
and `font-weights.test.ts` fails on both pre-fix sentences and on a stale
literal. No colour, pair, floor, metric or shipped weight moves.

Plan `519` closes the last scale without an ordered index. `MotionLevel` and
`MotionPhase` were key-only types (`Exclude<keyof Motion, "ease">`,
`keyof MotionEasings`), so `docs.test.ts` and `inventory.test.ts` derived the
levels with `Object.keys(motion)` — a `string[]` that would silently adopt a new
field — and `motion-contract.test.ts` retyped five of the six levels by hand.
`motionLevels` and `motionPhases` are the ordered owners, the two types derive
from them, the two documentation suites read them, and `motion-index.test.ts`
fails when a timing or phase is added without the index. `motion-levels.example.ts`
is the table a docs site or a settings row copies. No timing, easing, colour,
pair, floor or metric moves.

Plan `520` closes the last disabled-state composition the `504`/`510`/`514`
sequence left. Plan `514` gave the disabled action inside a tone-tinted status
panel a resting label (`disabledForeground` on `softAction`) and plan `504`
routes content on an opaque fill through the inverse `selectionOnFill` veil, but
`selectionFillPairs` measures only the fill's **enabled** foreground — the
disabled label had no pair, and a probe over the 24 shipped sets found identity
dark **2.799:1** and high-contrast dark **3.304:1** through the veil, under the
3:1 / 4.5:1 `inactive` floor, while all six checks returned `[]`. The two
contracts each believed the other covered it. `selectionFillInactivePairs` adds
the one resting composition (the disabled state does not step, so the hover and
press fills stay out), the two `disabledForeground` values move one designed
step (`#A1A9B7` → `#B0B8C6` and `#B0B0B0` → `#D0D0D0`, 3.317:1 and 4.645:1),
and every shipped set passes; the other five checks stay blind to the edit, so
the contrast pair is the only guard. `contrastPairs` stays **396**.

Plan `521` closes the last alignment rule the design system publishes without a
check. §6 says inline icons take `xs` "so they do not raise the line box", and
`scale.ts` names the partners — `xs` inline with caption text, `sm` with label
text — but `themeMetricFailures` only held the icon ladder positive and ordered,
plus `md` inside the smallest control. A probe returned `[]` from all six checks
for `iconSize.xs: 17` against the shipped 16px caption leading (the ladder still
ascended, `md` still fitted), and for a theme whose `caption.lineHeight` was 11
with the shipped icon; a 19px `sm` against the 18px label line did the same. Two
`at-most` rules now bound the two inline sizes by the theme's **own** leading, so
a brand that raises its type gets the allowance and one that raises only the
glyph is reported; equality stays legal, because the rule is "does not raise the
line box". Every shipped identity theme, platform variant and recipe passes
(12 ≤ 16, 14 ≤ 18), so no colour, pair, floor or metric moves and `contrastPairs`
stays **396**.

Plan `522` closes the row half of the same rule. `scale.ts` calls `avatarSize.xs`
the inline tier ("inline with a dense row") and a shipped `ListItem` fixes a
dense row at `theme.density.rowHeight`, with its leading slot documented for "an
avatar, an icon" — but `themeMetricFailures` only held the avatar ladder positive
and ordered, and related `radius.full` to the largest tier. A probe whose whole
ladder rose to 40/44/48/52 (so no other rule fired) returned `[]` from all six
checks while the inline mark was 12–20px taller than the 28px row the macOS and XP
presets ship and taller still than any row it could lead: a mark centred in a
fixed-height row paints outside it. One `at-most` rule now bounds `avatarSize.xs`
by the theme's own `density.rowHeight`, so a roomier density raises the allowance
and equality stays legal; the other three tiers stay unbounded, because `md` in a
dense row is a composition decision — bounding it would reject the shipped macOS
compact variant — recorded as a cross-team note instead. Every shipped set passes
(20 ≤ 28), so no colour, pair, floor or metric moves and `contrastPairs` stays
**396**.

Plan `523` closes the last density metric without a floor. `controlPaddingX` is
the inset between a control's label and the border the control paints inside its
own box — every button, field and pagination item reads it — but
`themeMetricFailures` only held it finite, ordered and non-negative. A probe
whose whole ladder fell to zero returned `[]` from all six checks while every
labelled control painted its glyph on its own border, and a 1px inset did the
same against the 2px hairline the spacing scale defines for padding. The ladder
now asks for `positive` and each size is `atLeast` the theme's own
`spacing["2xs"]`, so a brand that widens its hairline gets the allowance and one
that flushes its controls is reported; every shipped set ships 6–14px, so no
colour, pair, floor or metric moves and `contrastPairs` stays **396**.

Plan `524` closes the one surface where a washed label is measured but the wash
itself is not. Plan `510` holds `disabledForeground` through the composited
`selection` wash on `inactiveSurfaces`, which begins with the `disabled` fill,
but `selectionWashPairs` named only the nine `selectionSurfaces` and the four
soft status fills. A theme whose `selection` equalled its `disabled` fill
therefore returned `[]` for the composition — the label is exactly as readable
as it was at rest, so the text pair passed — while the highlight was gone. The
pair joins the wash list (9 → 10 wash pairs; `contrastPairs` stays 396); every
shipped set already clears the 1.05:1 floor (1.125:1 at the tightest,
high-contrast dark), so no colour moves.

Plan `525` closes the second body role a surface can carry. `selectionPairs`
named one role per surface — `foreground` on the washes, `popoverForeground` on
`popover`, `selectedForeground` on `selected` — but a menu row paints
`popoverForeground` on `hover`/`active`/`selected` (plan `312`) and a selected
row keeps its inherited `selectedForeground` on `hover`/`active`/`accent`
(plan `316`). Both are selectable text and `selectionColor` inherits into them,
yet no pair measured either through the wash. The audit found a shipped defect:
high-contrast light's `selectedForeground` (`#2E2370`) measured **6.693:1**
through the wash on `active`, under the 7:1 floor in all six AAA light sets,
while all six checks returned `[]`. The role moves one iris step to
`palette.iris[950]` (`#1C1547`, 8.533:1 at the tightest of the four fills), the
six pairs join `selectionPairs` (20 → 26), and every shipped set passes (4.898:1
macOS light at the tightest); `contrastPairs` stays **396**.

Plan `526` closes the face plan `507` measured over half the window. A dialog's
face was held to the surface floor on the six page layout surfaces only, with the
rationale that macOS dark's face met the scrim over its `primary` at **1.021:1**
and the dialog's `border` carried that patch at 1.495:1. The excluded pair was a
real failure the checker could not see, and the edge does not carry the rest of
the content: the same `border` measures **1.006:1** over Windows dark's scrimmed
`success` chip, under the divider floor, so a dialog over a Badge had neither a
face nor an edge. The face is the carrier — `dialogSurfacePairs` now derives from
`overlaySurfaces` (6 → 18 pairs) — and macOS dark's scrim deepens to 82%
(`#000000D0`) so the scrimmed content sits below the face. Every shipped set
passes (1.079:1 at the tightest, Linux dark on `destructive`), the executed brand
example deepens its own scrim to 85% because its darker accent put the inherited
one at 1.038:1, and `contrastPairs` stays **396**.

Plan `527` closes the field composition plan `317` excluded. The placeholder
and typed text were measured on the `input` fill and the four `Surface` tones a
transparent field sits on, and the reference said “a field on a row wash … is
deliberately out of scope”. It is not: `InlineEdit` swaps a row's text for a
field in place, and a row paints `hover`, `active`, `accent` and `selected`
behind its content, while the field's edge, boundary, ring and secondary chrome
text were already measured there. The audit found the shipped hint below its
floor on at least one wash in all twenty-four sets — identity dark **3.132:1**
on `selected`, macOS light 3.714:1 on `active`, Windows dark 3.939:1, XP light
3.877:1, and both AAA palettes under 7:1 at 5.665:1 and 5.009:1 — while all six
checks returned `[]`. `inputForeground` and `placeholder` join the four washes
(396 → 404 pairs), fourteen shipped hints move one designed step (identity dark
`#858F9F` → `#A8B0BD`, AAA light `#4A4F58` → `#3D4047`, AAA dark `#B0B0B0` →
`#D1D1D1`), every shipped set passes (4.651:1 at the tightest, Linux dark on
`active`; 7.113:1 at AAA), and the hint stays 1.157:1 below `mutedForeground` at
the tightest.

Plan `528` closes the last text role the selection contract excluded. The
reference called an accent-toned link under a text selection “the one deliberate
omission”, on the reasoning that no visible wash keeps a link at 7:1 at AAA —
which plan `366` had already disproved for the four status tones. `primaryText`
is a text role, and a link in a paragraph, list row or Alert is selected with the
copy around it. The audit found twelve of the twenty-four shipped sets below
their floor through the wash: the AAA light link measured **5.376:1** on
`destructiveSoft` under 7:1, macOS dark **3.708:1** on `selected`, Windows light
3.995:1, XP light 4.378:1, Aero light 4.022:1, macOS light 4.106:1 and Linux
dark 4.485:1 under 4.5:1, while every check returned `[]`. `selectionLinkPairs`
adds thirteen pairs (the nine surfaces plus the four soft status fills), seven
values move one designed step inside their own families (AAA light `#3B2C8F` →
`#241C5C`, macOS `#0055B3` → `#004A9A` in light and `#64B5FF` → `#96CDFF` in
dark, Linux dark `#99C1F1` → `#A5CBF5`, Windows light `#005BA1` → `#004F8A`, XP
`#0046BD` → `#003FA8`, Aero `#0F55A3` → `#0C4A8C`), every shipped set passes
(4.729:1 at the tightest, Windows dark; 7.484:1 at AAA) and `contrastPairs`
stays **404**.

Plan `529` owns the boundary plan `380` documented but left unbuilt: a
`ThemeChoice` "arrives from ... a shareable URL", yet nothing in the package read
or wrote one. Every consumer retyped the five query keys and the guard each used;
the one shipped toggle (`apps/docs/src/platform/platform.ts`) parses only
`platform` and retypes the union, so plan `380`'s recipe, contrast and density
axes have no URL form at all. `themeChoiceFromParams(source)` decodes all five
through the existing guards (a real `URLSearchParams` satisfies the structural
`ThemeParamSource`, so the package gains no runtime dependency), and
`themeChoiceParams(choice)` writes only the axes whose absence would change the
resolved theme — `dark`, `high`, a non-`default` platform, a valid recipe that
suppresses the platform it overrides, and any valid density, because the platform
supplies its fallback preset. `themeChoiceKeys` is the key order and the clear
list, so a link cannot keep an axis the new choice replaced. The full matrix
round-trips through a real URL, no colour, pair, floor, metric, platform style,
recipe or theme moves, and `contrastPairs` stays **404**.

Plan `530` finishes the surface half of plan `353`. Six fixed surface metrics
still live in `packages/components`: the drawer's 320/400/560 width and
240/320/420 height maps (`drawer.tsx:57-67`), the 160px message viewport
(`chat.tsx:168`) and the carousel's 8px idle / 18px active marks
(`carousel.tsx:399-400`). None can be changed through a theme, a copied
`PlatformStyle` cannot own them, and the numeric contract cannot report a broken
one. The nine fields join `theme.dimensions` at today's pixels; the drawer trios
are increasing ladders, the chat viewport is held to one `density.rowHeight`, the
active carousel mark to its idle dot, and a runnable example owns the merge. The
three consumer migrations are recorded cross-team. No colour, pair, floor or
existing metric moves.

Plan `534` closes the one numeric group a copied platform style could not own.
`PlatformStyleStructure.density` accepted only a `DensityName`, while every
sibling group is a partial, so the macOS file the copy-and-own story uses could
name `compact` or drop density — never tune it. `DensityOverrides` had the same
hole from the other side: it merged over the **base** theme's preset, so a
`{ preset, rowHeight }` record silently produced comfortable-sized controls and a
30px row while naming neither. The override now carries the `preset` its metrics
start from, `mergeDensity` resolves it first, and the style field widens to
`DensityName | DensityOverrides`. The authored example names compact and raises
its row height inside it, every shipped style keeps its name-only density, and no
colour, pair, floor or metric moves.

Plan `535` closes the two claims that were still read from the wrong subject. The
catalogue and README platform/recipe rows were built from a `PlatformStyle`'s
override record, but `structure.radius` is partial and `structure.density` may be
`{ preset, … }`: a style the type contract allows printed `undefined` radius
cells and `[object Object]` for its density, and the doc guard compared its own
wrong string with the document. The row now derives from
`applyPlatformStyle(getTheme(mode), style)` through `platform-table.ts`, both
documents state that a row describes the resolved theme, and
`platform-table.test.ts` fails against the old record. The same audit found the
macOS focus-ring rationale quoting 2.50:1 for a wash that measures 2.836:1;
`platform-claims.test.ts` derives every current ratio the three platform files
quote, so the next palette edit takes them with it. No shipped row, colour,
pair, floor or metric moves.

Plan `536` applies the same rule to the three figures the catalogue still states
in the present tense without a derivation behind them. The Toast's tone margin
is **11.98:1**, not the 11.97:1 plan 348 quoted — and the same figure is copied
into `COMPONENTS.md` and `TODO.md`. The disabled panel action measures
**5.148:1** identity dark and **7.310:1** AAA dark after plan 520 moved
`disabledForeground`, not the 4.343/5.199 plan 514 measured. The track's
"tightest" pair is Linux light `track` on the `active` wash at **1.050:1**, not
identity dark on `selected` (1.058:1); `docs.test.ts` measured only the
`selected` surface, so it agreed with a superlative over a list it never read —
the plan-350 failure mode. `figures.ts` derives a figure from `shippedThemes`
with the measurement the checker uses and returns the *provenance* of the set
that produces the minimum, so a sentence that names the wrong set fails even
when its number is right. The three sentences are corrected; no colour, pair,
floor or metric moves.

Plan `537` extends that table to the **text tiers**, which are ratios of ratios
rather than pairs. Two present-tense claims were false: the catalogue's panel
action step named **identity dark** (1.877:1) for a minimum that is
**high-contrast dark** (1.542:1), and the design system still quoted plan 392's
**1.440:1** for the hint — plan 527 moved it to **1.157:1**. The old
`docs.test.ts` case asserted each tier's minimum appeared *somewhere* in the
paragraph, so any of the four figures satisfied every tier and a wrong
attribution could not fail; the design-system sentence was never read at all.
`figures.ts` gains `tierSurfaces`, `deriveTierFigure` and `tierMinimum`, the
seven catalogue parentheticals are pinned with their set and surface, the design
system's summary is derived from the tier groups, and a case proves the figure
table and `themeTextTierFailures` compare the same surfaces. No colour, pair,
floor or metric moves.

Plan `538` closes the count beside those figures. The same paragraph states each
tier's surface-set size as prose ("12 shared surfaces", "one `card`", "four for
`popoverForeground`", …) and no test derived it: a surface joining both roles'
pairs changes the set a tier is compared on, and if its step is larger than the
minimum every plan-537 figure still passes while the count is stale. The two
numerals become the paragraph's own word style (`twelve`) and one case derives
all eight phrases — seven tier counts and the panel action's "five surfaces the
two labels share" — through `tierSurfaces`.

Plan `539` corrects the last disabled-state claims the documents state in the
present tense. Both pages quoted **2.25:1** for a filled primary action at 50%
opacity; GPUI composites an element and its children as one group
(`references/gpui-ce/crates/gpui/src/styled.rs`, GPUix passes `StyleDesc.opacity`
straight to it), so the label is dimmed with its own fill — **1.575:1** on the
identity light canvas and **1.468:1** at worst (Linux light, a card). The same
audit found `docs/tokens.md` claiming a disabled field "reads
`disabledForeground`": the shipped primitives dim the field at 50%, which
measures **3.273:1** on the macOS light `input` fill. The three figures join the
`figures.ts` table through a new `"dim"` kind and are derived from
`shippedThemes`, and `src/disabled-state.example.ts` ships the three roles a
control paints instead. No colour, pair, floor or check moves.

Plan `540` completes the total check's last domain: the **alpha channel** of a
role. `themeColorFailures` accepts six- and eight-digit hex because the maths
parses both, so `shadow: "#191D2580"` passed every check while
`elevationShadow` replaced the authored 50% with the level's own 12% —
`alpha()` writes the fourth byte rather than composing it — and
`overlay: "#000000"` passed while a solid scrim hid the window the role exists
to keep recognisable. `themeOpacityFailures` is the seventh check: the three
veils (`translucentRoles` — `selection`, `overlay`, `selectionOnFill`) need a
byte strictly between `00` and `FF`, every other role is opaque (`roleForm` is
the total rule), and a value the hex parser cannot read stays the colour check's
diagnostic. The docs' "third check" ordinal and the README's claim that the
composition suites run three separate checks are corrected in the same pass. No
colour, pair, floor or metric moves.

Plan `541` makes the requested contrast level total. `applyPlatformStyle`
derived four level-dependent outputs from three inputs: the palette came from the
style's colours, the name from the base, the elevation opacity from the
`contrast` argument and the declaration from the palette. Three documented calls
returned a theme that lied about itself: a `"high"` request on a default base
returned a `default` theme while `themeContrastFailures(result, "high")` reported
**180** pairs; a `"default"` request on an AAA base returned the default palette
under the name **"High contrast light · macOS"**; and a shape-only style kept the
AAA palette (plan 301) while taking the style's default-level alpha, painting
**`#FFFFFFA6`** — the near-white halo plan 505 forbids — with every check
returning `[]`. The level now decides the palette, and the palette decides the
name, the declaration and the elevation's opacity; a same-level base keeps its
own palette, name and edits, a shape-only style keeps the base's level, and a
high request always builds the AAA set, which a platform's colours never
repaint. No shipped name, colour, pair, floor or metric moves.

Plan `542` corrects the rule the URL writer documents. `themeChoiceParams` said
it "emits only the axes whose omission would change the resolved theme" and then
exempted density, which is written even when it equals the resolved preset —
on macOS, `compact` already is that preset, so the stated rule was false for the
shipped case it was written about. The behaviour is right (a stored density must
survive a platform edit in a shared link) and the prose is what moves: the
catalogue, the package README and the JSDoc now state the omission rule and the
density exception separately. The guard named "on every platform" derived the
platform from the theme's display name, `theme.name.startsWith("macOS")`, which
is never true for `Light · macOS`, so it exercised `win32` twelve times and never
the compact preset that makes the rule matter. The case now derives each axis
from `shippedThemes`, the writer gains a canonical-stability case, and a prose
guard fails if the false sentence returns. No colour, metric or pair moves.

Plan `543` gives the contrast contract's floor classes an owner. `ContrastPairClass`
was the last exported domain union without an ordered index, while every sibling
(`colorRoles`, `metricRules`, `motionLevels`, `themeChecks`, …) had gained one for
the same reason. The cost was concrete: `inventory.test.ts` rebuilt the ledger's
floor table from eight named fields in a fixed order, so a ninth class would have
forced a floor at both levels and a design-system row (both compile-enforced)
while `COMPONENTS.md` kept publishing an eight-value table and the guard stayed
green — and the reference's floor snippet took its order from the
`contrastFloors` object literal, a second owner. `contrastPairClasses` is the
ordered list, `ContrastPairClass` derives from it, and the ledger, the reference
and the design system enumerate it; a class with a floor but no pair is reported.
No colour, pair, floor or metric moves.

Plan `544` closes the last figure set measured on a hand-built list. The
catalogue calls the ratios beside each contract list "the tightest shipped
pair", "the weakest shipped set" and "the weakest … the shipped themes produce",
but `docs.test.ts` derived them from ten of the twenty-four shipped sets — the
identity and platform variants at the default contrast and the recipes in light
only — so both AAA identity sets, all six AAA platform variants, the two recipe
darks and the two recipe AAA sets were unmeasured, and plan 388's guard does not
see the file because its titles never say "every shipped set". The alpha-hover
figures the same describe holds are a different claim — the light composition
the shipped consumers paint — and now narrow explicitly instead of relying on
the subset. A probe over the full enumeration finds every quoted minimum still
produced by the set its sentence names (5.68 / 8.44 / 8.98 / 6.22 / 6.93 /
7.68 / 6.61 / 6.19 / 1.25 / 3.04 / 1.262), so no document value or colour
moves; `quotedSets` derives from `shippedThemes` with a label that carries
` high` at AAA, an extent case fails on any narrower list, and the Verification
paragraph now names both owners — `figures.ts`/`figures.test.ts` for the
sixteen-entry current-figure table and `docs.test.ts` for the quoted tightest
figures.

Plan `545` closes the last false claim in the applied theme's display name.
`platformOverrides` named its result `${palette.name} · ${label}`, and a
same-level base keeps its own palette (plan 373), so applying the style a theme
already carried appended the label again: `getPlatformTheme("win32", "light")`
reads `Light · Windows`, and one re-application read
`Light · Windows · Windows` — a palette the package does not ship, printed by
the preview the name exists for. A probe on the merged tree found the second
application deep-equal to the first in **every field except `name`**, so the
composition was already idempotent and only the label drifted. One helper,
`appliedStyleName`, appends a label only when the name does not already end
with it; `applyPlatformStyle` and the deprecated `platformTheme` bridge both use
it, so re-applying a stored choice or a settings row is a no-op and a *different*
style still appends its own label once (provenance, not accumulation: Windows →
macOS reads `Light · Windows · macOS` because the second style names only the
roles it owns, plan 374). The catalogue, the README and the design system state
the rule and `docs.test.ts` holds all three; the executed
`acmeWindowsReapplied` example runs in `applied-level.test.ts`, and the new
`applied-style-name.test.ts` fails on the pre-fix append. No colour, pair,
floor, metric, platform style, recipe or shipped theme name moves.

Plan `546` closes the gap between the catalogue's uniqueness guarantee and the
suite that enforces it. `docs/tokens.md` says “every exported pair list is held
to content uniqueness”, but `contrast.test.ts` checked a hand-typed array of
**28** entries while the package exports **35** `*Pairs` values. Six of the
seven omitted lists were still caught through `contrastPairs` (they are folded
into it), so the catalogue's “inside each list” was false there but not the
guarantee; the seventh, `selectionInactivePairs`, is applied by
`textOverWashFailures` and in no master list, so a duplicate in it made the
checker report one missed composition twice while the pre-fix suite passed
**33/33** — the plan-349 defect, one list over. The inventory is now a
`Record` whose key type derives from `keyof typeof Tokens` filtered to `*Pairs`,
so a 36th list fails `check-types` until it is listed (proved by a scratch
export) and every list — nested or direct — is asserted by name. The catalogue
sentence now states that owner and `docs.test.ts` holds it. No colour role,
pair, floor, metric, theme, platform style or recipe value changes; 131 files /
5641 tests pass.

Plan `547` closes the same class one list over. `docs/tokens.md` promised
“`stateFillRoles` is the fill list and `stateFillSurfaces` the surface list, so
a fifth surface or a new filled family joins one place”, but `stateFillRoles`
retyped the four families from `filledControlFamilies` by hand. `filledControl`,
`stateStepPairs`, `stateLadders` and `selectionFillRoles` all derive from the
index, so a fifth family added where the docs say to add it gained its steps,
direction, selection pairs and helper — and no fill-on-surface pair. A probe on
the pre-fix tree added the near-complete `warning` family to the index (only
`warningHover`/`warningActive` were missing), made `warningHover` equal the
canvas, and the checker returned no pair; with the derivation it reports one.
The list now derives from the family index, the suite's expectation derives
from it too, and the catalogue names the owner. No colour, pair, floor, metric,
theme, platform style or recipe value moves; 131 files / 5641 tests pass.

Plan `548` closes the same class one index over. The solid status fills, the
chip edge and the selection list all derived from `statusTones`, but the
**soft** fill was retyped by hand in six places:
`softSurfaceRoles`, `trackSurfaces`, `softBorderPairs`, the soft body-text
literals in `contrastPairs`, `selectionSoftWashPairs` and
`contentFillSurfaces`. A fifth tone added to the index therefore joined the
solid, text and chip lists automatically and skipped about ten soft lists — its
Alert tint, text over the selection wash, edge, ring, inactive label, groove,
scrim and dialog face. A probe added a fifth `neutral` family, made its tint the
canvas, and the checker returned no soft pair; with the six lists derived from
the tone index the same probe reports every one, and the new
`soft-surface-index.test.ts` derives its expectation from the index too. No
colour, pair, floor, metric, theme, platform style or recipe value moves; 132
files / 5649 tests pass.

Plan `549` finishes the half plan 548 claimed but did not reach: the **status
text** roles were still a separate `statusTextTones` array plus twelve literal
pairs for `background`/`card`/`popover`, so a fifth tone joined the solid, soft
and chip lists but shipped its label on the canvas, a card, a popover, the
quiet panel and the four row washes unpainted by the contract. The surfaces are
now a public index (`statusTextSurfaces`) and the pairs derive from it and
`statusTones`; `status-text-index.test.ts` derives its expectation the same way,
so the probe that adds a fifth tone fails before the change (`4 × 8` pairs where
the index asks for `5 × 8`) and passes after it. No colour, pair or floor moves
and the contract still holds 404 plain pairs; 133 files / 5653 tests pass.

Plan `550` closes the last ungoverned relation between two numeric roles:
`borderWidth.strong` is the spread of the only focus indicator in GPUix 0.10.0
(there is no `outline*`), and `borderWidth.thin` is a decorative divider, but
`themeMetricFailures` held each on its own, so a copied theme with `thin: 1` and
`strong: 0.5` returned `[]` from all seven checks while every focus ring painted
a sub-pixel spread thinner than a border. `strong` is now at least `thin` —
equality stays a design — every shipped set already passes, so no value moves,
and the catalogue, design system, README and ledger state the rule.

Plan `551` closes the seam between two rules plan `323` and plan `373` stated
separately. `applyPlatformStyle` rebased a forced `"default"` request on the
default-level palette, but it spread the style's colour object verbatim: a key
the copied style set to `undefined` was copied over the palette and then treated
as omitted by `extendTheme`, which fell back to the AAA **base**. A style with
`{ primary: undefined, background: "#FAFAFA" }` applied to an AAA base therefore
took its `primary` from AAA and its `primaryHover` from the default identity,
and `themeFailures` reported a `direction` failure for the theme the builder had
just returned. The palette merge now uses `mergeDefined`, so an `undefined`
colour inherits from the requested level's palette — the base still wins when
the style contributes no colour at all, which is plan 323's case, and a
same-level base keeps its edits. No colour, pair, floor, metric, theme, platform
style or recipe value moves; 135 files / 5663 tests pass.

Plan `552` closes the last domain split inside the numeric contract. Plan `531`
made the **finite** half total by walking a theme's group value, but the
**ladder** half still read hand-typed lists of the shipped member names, so a
member the theme carried outside that list was never compared:
`extendTheme(light, { spacing: { ...spacing, "6xl": 1 } })` kept the step and
`themeMetricFailures` returned `[]`, while the catalogue promised every named
ladder must not step backwards. `extendTheme` copies the base group and appends
the override's members, so the theme's own insertion order *is* the authored
ladder; the six ladders (`spacing`, `radius`, `iconSize`, `avatarSize`,
`controlHeight`, `controlPaddingX`) now walk the theme's object through the same
`numericMembers` walker the finite pass uses. `radius.none` and `radius.full`
stay out of the ladder because each has its own rule, so one defect keeps one
report. The new `scale-ladder-totality.test.ts` fails on five extra steps
before the change and passes after it, every shipped set still returns `[]`, and
no colour, pair, floor, metric, theme, platform style or recipe value moves.

Plan `553` closes the last place where the package's documentation and its own
contract disagreed about the same theme. Plans `098` and `355`/`356` held the
executed brand example to `themeContrastFailures` and held every snippet to the
public API, but nobody built the theme a snippet *writes*. The docs page and the
README showed the executed brand palette without `track`, so a reader who copied
it shipped `primary` as a progress segment on the identity groove at **2.225:1**,
under the 3:1 mark floor, while the page said the example was "this exact
family"; the `extendTheme` and `createTheme` JSDoc examples moved only
`primary`, so each built a theme three checks rejected (the inherited
foreground at 4.243:1, the groove at 2.225:1 and the dialog face over the
brand's action at 1.038:1). The three documented palettes now carry the executed
example's groove, the builder JSDoc shows the complete brand (and a shape-only
`extendTheme`), and `snippets.test.ts` builds every documented colour map and
holds it to `themeFailures` — with a case that rebuilds the pre-fix map and
proves the guard can fail. `theme.test.ts` now derives the brand rationale's
groove figure, which plan `503` had moved from 2.67:1 to 2.23:1 while the
sentence stayed. No colour, pair, floor, metric, theme, platform style or recipe
value moves; 136 files / 5675 tests pass.

Plan `554` finishes the completeness unit plan `552` left half-done. `552` made
every size *ladder* walk the theme's own scale object, but the *sign* rules still
read hand-typed lists: eighteen `positive` calls over `dimensions` and exactly
two border widths. `extendTheme` keeps a member it does not know, so
`extendTheme(light, { dimensions: { ...dimensions, extraSurface: 0 } })` and
`extendTheme(light, { borderWidth: { ...borderWidth, hairline: -1 } })` were
finite-checked and accepted while `themeMetricFailures` returned `[]`, against
the JSDoc's "every surface metric is positive" and the catalogue's "a negative
stroke is not a width". Both rules now walk the theme's own group; `strong` is
filtered out of the generic non-negative walk so its stricter positive rule
keeps one value to one diagnostic, and a zero `thin` or extra width stays a
borderless design. The new `dimension-sign-totality.test.ts` has three cases
that fail before the change and three that guard it after; every shipped set
still returns `[]`, and no colour, pair, floor, metric, theme, platform style or
recipe value moves.

Plan `555` makes the design system's border rationale say what the contract
measures. §7's `border` bullet named six of the eight fills a bordered control
paints — it left out `accentHover` and `accentActive`, the two steps an outline
toggle presses through that plan `327` added — and the `borderStrong` bullet
named eight of the thirteen surfaces the functional boundary is measured on,
omitting a `card`, a `popover` and the `input` fill a field paints. The same
paragraph, edited by plan `550`, printed the strong-over-thin rule twice. The
cause is the one plans 547–549 removed from code: the list had no owner.
`controlFillRoles` is exported as that owner, the two bullets name every member,
and `docs.test.ts` derives both surface lists from `contrastPairs` — so a ninth
control fill or a fourteenth boundary surface fails the page until it is named.
The three cases fail on the pre-fix page and pass after it; no colour, pair,
floor, metric, theme, platform style or recipe value moves.

Plan `556` closes a promise the design system already made in §6 — "They live in
`theme.dimensions` so a brand can widen a dialog or a toast" — that was false:
`dialog.tsx` kept `MAX_WIDTH` as a local `{ sm: 360, md: 480, lg: 640 }`.
Auditing the same class of fixed metric in the consumer found the calendar day
cell (34), the time segment (26) and the avatar presence dot (10), three more
values a theme could not own. The six members join `dimensions`, every shipped
theme, platform variant and recipe inherits them, and the metric contract holds
the dialog ladder to grow, a day cell to fit the small control, a segment to be
at least one body em and the dot to stay at most half the smallest avatar — the
same rules the drawer ladders, carousel mark and inline avatar already carry.
The four consumer migrations are recorded cross-team rather than edited in
another workstream's tree; no colour, type, pair, floor or existing metric moves.

Plan `557` closes the last composition the caret story missed. Plan `511` gave
`nativeFieldTheme` the `primary` **fill** because the accent is a `mark` pair on
the `input` fill and the four `Surface` tones — but plan `527` established that
`InlineEdit` swaps a row's text for a field in place, on the four row washes, and
the caret inherits there. On macOS dark the fill measures **2.748:1** on
`selected` and **2.836:1** on `active`, under the 3:1 mark floor, so a caret in a
selected inline edit vanished while every check returned `[]`; `primaryText` is
the accent's readable ink, clears the floor on all nine surfaces in every
shipped set (5.587:1 at the tightest), and now carries the caret through a
published `caretPairs` list. No colour moves: the role already existed, and the
only new pairs are the contract stating a composition the components paint.

Plan `558` closes a contradiction between the two halves of the editable-theme
guarantee rather than a palette gap. Plan `540` shipped `themeOpacityFailures`
with the promise that an opaque role written `#RRGGBBFF` is accepted "because it
paints the same colour either way", and `themeColorFailures` agreed; the colour
maths did not. `contrastRatio`, `relativeLuminance` and `compositeOver` parsed
only six digits, so `foreground: "#191D25FF"` returned `[]` from both format
checks while the total check reported **35** failures — 23 contrast pairs and the
hierarchy cases that read the same `NaN` — and dark `card` reported **67**. The
opaque parser now reads a fully opaque `FF` byte, a partial alpha is still
unmeasurable and stays the opacity check's diagnostic, and the new suite proves
both directions: with the parser reverted three cases fail, with a permissive
parser the partial-alpha guard and the contrast suite's `NaN` case fail. No
colour, pair, floor, metric, theme, platform style or recipe value moves; 139
files / 5,713 tests pass.

Plan `559` closes the last value a copied platform style cannot own. Plan `389`
gave `structure` the type scale, spacing, borders, icon/avatar sizes and
component dimensions, so the copy-and-own file owned the whole shape — but
`structure.motion` was typed `Partial<Omit<Motion, "ease">>`, and its own JSDoc
said "easings are shared". `extendTheme` already merges a partial `ease` phase
by phase, so the one path the reference teaches for owning a look was the one
that rejected a platform's curve; a style naming one failed `check-types`
(TS2353) although `platformOverrides` forwards `structure.motion` unchanged.
`MotionOverrides` is the one shape now used by `ThemeOverrides` and
`PlatformStyleStructure`, the authored example names a timing and an easing, and
`platform-motion.test.ts` proves the phase merge, the inherited phases, the
curve contract on a copied style, the shipped styles' unchanged easings and the
example end to end. No shipped value moves; only the capability and its
documentation.

Plan `563` closes the last mark outside the mark list. Plan `557` published the
native field's caret as `caretPairs` — `primaryText` on the `input` fill at the
`mark` floor — but appended it to `contrastPairs` directly instead of to
`markPairs`, the list documented as "every mark on every surface it can sit on".
A consumer building a mark report from the public list, and the design system's
graphic-marks floor row (which `docs.test.ts` derives from that list), therefore
omitted the only mark the runtime paints inside a field; the checker enforced the
pair all along, so nothing could erase a caret, but the list and the page were
incomplete and the guard could not see it. `caretPairs` now sits inside
`markPairs`, `contrastPairs` keeps one copy, the graphic-marks row names it, and
`caret-mark-list.test.ts` fails on the pre-fix tree. No colour, pair count or
floor moves: `contrastPairs` stays 405.

Plan `564` closes the last CSS habit the typeface contract accepts. Plan 533
closed the padded name and the CSS generic keyword and plan 385 the comma stack,
but a family wrapped in CSS quotes — `'"Helvetica Neue"'`, the canonical CSS
spelling for a multi-word family — still returned `[]` from all seven checks.
The runtime passes `StyleDesc.fontFamily` to its font collection as
`QueryFamily::Named(name)` without unquoting it, so the theme paints the system
fallback silently while the guarantee says it is good. A fifth `quoted` rule
reports a quoted (or half-quoted) name, leaves an internal apostrophe
(`D'Nealian`) and every shipped family alone, and joins `typefaceRules`; the
catalogue, README, design system and ledger enumerate the rule from the index,
and `typeface-quoted.test.ts` fails on the pre-fix tree. No family, colour, pair,
floor or metric moves.

Plan `565` closes the last exported union without an ordered owner. Plan 558
deferred `ColorForm` as "a separate, smaller unit": it is a diagnostics payload
with no stored boundary, so it takes plan 543's `contrastPairClasses` precedent —
an index and no narrowing guard. `colorForms` is `["opaque", "translucent"]`,
`ColorForm` derives from it, and the executed `opacity.example.ts` groups every
`colorRoles` member by its form through `rolesByForm`. The `Types` row and the
Role opacity paragraph derive their members from the index, `color-forms.test.ts`
proves every form has a role and the example partitions the palette exactly once,
and a temporary third form fails the guard. No colour, pair, floor, metric or
shipped theme moves.

Plan `566` puts the defined `overlay` back on the elevation ladder plan `390`
built. Plans `369` and `390` together say a consumer-defined `overlay` takes
every range rule and that the level names are an order, but `featherLadder`
walked a hand-typed `sm`/`md`/`lg`, so a defined `overlay` could feather at 0px
above a 40px `lg` while `themeMetricFailures` returned `[]` — a command palette
closer to the surface than a resting card, against `docs/design-system.md` §7
("each level's painted feather … no smaller than the level below it") and the
catalogue's "`overlay` included". The ladder now walks `elevationLevels` and
compares the defined levels in that order, so the shipped empty `overlay` stays
exempt and a future level joins one place; `elevation-overlay.example.ts` ships
the valid topmost edit and `elevation-overlay.test.ts` proves both directions.
No colour, pair, floor, metric or shipped theme moves.

Plan `567` gives the guarantee's two dimensions the owner each has had since
plans `398` and `387`, and stops the contract prose retyping them. The page and
the design system said "all six checks returned `[]`" in five places after the
seventh check landed, because the guard was a blacklist of two old numerals
(`three`, `four`); and both documents stated the shipped enumeration's size five
times ("all 24", "of the twenty-four", "the same twenty-four") while
`shippedThemes` owns it and only the README derives it. Every such mention is now
count-free — "every check", "those checks", "eight sets" — the one derived
sentence (`The guarantee is seven checks — …`) remains held verbatim, the four
historical test headers drop their `six`, and three `docs.test.ts` cases hold the
two documents to it, including a case proving the patterns reject a planted
stale phrase. A fifth platform or an eighth check now fails the docs guard
instead of leaving a stale total behind. No colour, pair, floor, metric, platform
style, recipe or shipped theme moves.

Plan `568` finishes the migration plans `552` and `554` began. The numeric
contract walks a theme's own scale, but four shape bounds still read the shipped
member's name: `radius.full` against `radius.xl`, `density.controlHeight.lg` and
`avatarSize.lg`, and the presence dot against `avatarSize.xs`. A theme carrying
a wider scale — a copied or decoded one — could therefore paint an 80px avatar,
a 48px control or a 24px corner at `full` 20 as a rounded square, or carry an 8px
avatar under a 10px dot, while `themeMetricFailures` returned `[]`; both
documents' "largest"/"smallest" sentences were false for exactly the shape they
invite. The extremes are now derived from the theme's own values (by value, not
insertion order), a non-finite member stays the finite rule's diagnostic, and an
unordered scale yields no bound so one broken ladder keeps one report — the
first cut cascaded into the presence dot until `orderedScale` gated it. Six
cases cover the avatar, control and corner extensions, the decoded smaller
avatar, the valid bound and the shipped pass; no shipped value, pair, floor,
metric, platform style, recipe or theme moves.

Plan `572` finishes the native text bridge plan `569` began. `nativeTextTheme`
sent the native engine's type sizes from `codeBlock`/`body`, but left four layout
fields at the runtime's defaults — the code gutter's 7px per digit (tuned to
12.5px code), the 36px diff gutter (12px) and the 96/48px markdown table floors
(14px). A copied theme with a 24px code role therefore reserved 7px per
line-number digit while the glyph advanced about 13px, and a 16px body role
squeezed table columns; every check returned `[]` because the native metrics are
not part of `Theme`. The four fields now resolve the runtime's own proportions
against the role that decides the text they hold, with `Math.ceil` and an exact
integer multiply so the shipped sizes resolve to the same 7/36/96/48px and no
pixel moves; the remaining runtime fields (the code gutter floor, the diff accent
bar and the runtime's per-digit and max-content estimates) stay defaults and the
catalogue says why. `native-text.example.ts` ships a larger code role and
`native-text.test.ts` holds both directions.

Plan `573` closes the last paint the native text bridge feeds without measuring.
The runtime seeds a `<code>`, `<diff>` or `<markdown>` find bar's washes from the
text theme's `accent` at 30%/65%, and `nativeTextTheme` maps that field to
`primaryText` — an ink, not a wash: body text measured 6.80:1 through the match
default and 2.81:1 through the active one in identity dark, under the 7:1 body
floor, while every check returned `[]`. `nativeHighlight(theme)` returns the
`selection` role plus one `nativeHighlightStep` (0.1) for the active match,
`nativeHighlightPairs` publishes the matchable roles on the four surfaces `bg`
may name, and `themeHighlightFailures` is the eighth check `themeFailures`
composes. A highlight cannot keep a syntax token at body strength and stay
visible, so the pairs are held at the secondary floor (5.34:1 match, 4.61:1
active) with body text above the body floor; the reference, README, design
system and ledger state the same derived facts, and no colour moves.

Plan `574` closes the last surface the native text bridge's syntax palette was
never measured on. `nativeSyntaxPairs` held every capture to the body floor on
`card`, but the catalogue said the prop's roles were measured on all four
`Surface` tones a `bg` override may name; on Windows XP (Luna) light the
inherited `infoText` and `warningText` measured 6.903:1 and 6.951:1 on the beige
canvas while every check returned `[]`. `nativeTextSurfaces` becomes the one
owner of the four tones, `nativeSyntaxPairs` publishes six roles on each (24
pairs, `contrastPairs` unchanged at 405), and the suite holds the same palette
through the runtime's 3.5% ink wash on every surface, which found six more
under-floor pairs on XP and Aero. Eight platform text roles take one designed
family step darker — local to macOS, Windows, XP and Aero light — so every
shipped set clears the body floor both opaque and painted, and the reference's
two hand-computed native figures (7.83/7.06) become derived.

Plan `581` publishes the last hand-held promise of the native find bar. Plan
`573` said the active match is one `nativeHighlightStep` above the match, but
the check compared highlighted text only: an edited `selection` at 98.8% alpha
paints both washes as the same colour (**1.000:1**) while every text pair and
`themeFailures` return `[]`. `themeHighlightFailures` gains a `step` arm — the
same 1.05:1 floor plan 342 published for the filled families and plan 381 for
the selected row — discriminated by `pairClass`, so `themeFailures` reports a
collapsed active match without a ninth check kind. No shipped value, pair,
floor or count moves.

Plan `582` measures the find highlight where the runtime paints it. Plan 574
established that a code block paints on the document tone under a fixed 3.5% ink
wash, and plan 573 held every matchable role through the highlight on the plain
tone only; a find inside fenced code therefore sat behind two washes the check
never composited. On Aero light the inherited `successText` and
`destructiveText` measured **4.445:1** on the canvas and **4.429:1** on the
quiet panel through the active match, under the 4.5:1 secondary floor, while
every check returned `[]`. A new internal `nativeInk(theme, surface)` owns the
runtime's fraction and ink choice, `themeHighlightFailures` composites both
washes over it, and Aero light names the XP recipe's own steps (`#0E5135`,
`#7E1D21`). The opaque minima are now 5.59/4.80 and the painted minima
5.21/4.51; the Aero step also moves the status-selection tightest to 4.858:1
(Windows light `warningText` on `selected`) and `successText`/`muted` to 8.03:1
(Windows light). No pair count, floor or check kind moves, and no other colour
changes.

Plan `583` publishes the fades and ink wash the native document paints, which
only the shipped-theme suite held and only on `card`. The runtime fades a diff
line at 92%, its markers at 90%, the row tint at 5.5%, the blockquote rail at
60% and its wash at 5%, the list marker at 85% and the gutter at 80%/50%, and
paints code on a 3.5% ink wash; the `nativeTextTheme` JSDoc claimed
`themeContrastFailures` held them while the catalogue said the suite did, and
neither held a consumer's theme. Two valid edits prove it: `successText`
`#bebebe` on identity dark measures **6.405:1** through the ink and
`mutedForeground` `#bebebe` **6.335:1** in a blockquote, while `themeFailures`
returned `[]`. `nativeTextFades` and `nativeTextOverFades` own the fractions,
`themeNativeTextFailures` is the ninth check on all four `nativeTextSurfaces`,
and the word-level 28% diff wash is documented as a deliberate omission with its
measured 4.389:1. No colour, pair, floor or metric moves.

Plan `584` closes the elevation contract's last content surface. Plans 509 and
375 made the scrim total over the resting actions, status chips and soft status
panels a window shows, but the `md` shadow a menu or popover casts was still
measured only on the six page layout surfaces — yet a dropdown opens across the
button beside its trigger, a context menu over a Badge and a combobox list over
an Alert. `elevationContentSurfaces` publishes the twelve resting content fills,
the `md` walk measures the page surfaces and those fills (a `sm` card is placed
in the layout and a `lg` dialog sits on the scrim), and the tightest shipped
pair is 1.058:1 (AAA dark, `md` on `info`) while the page-surface walk keeps its
1.061:1 and the AAA dark page pair its 1.207:1. Every shipped theme already
passes, so no colour, role, floor or `contrastPairs` count moves.

Plan `585` closes the last promise the native-text bridge made without a type.
The documents tell a brand that needs the runtime's token-less chrome metrics to
"set them on the returned object", but `NativeTextMetrics` declared neither
`codeGutterMinWidth` (the 28px gutter floor) nor `diffAccentBarWidth` (the 3px
diff bar), so the documented override failed `check-types` with TS2561. Both are
optional members now, the bridge leaves them unset so the runtime's own values
apply, and a copyable example proves the override compiles. The same paragraphs
no longer list the per-digit width or the table's max-content floor among the
runtime defaults — plan `572` derives them from `codeBlock`/`body`. No colour,
pair, floor or metric value moves.

Plan `591` closes the last surface the native-document contract never painted.
The runtime paints a changed diff line on a **5.5% tint** of its status role, and
every child — gutter, number, marker, 3px bar and the syntax runs at full alpha —
sits on it, but the fades were measured on the plain tone only. Five light pairs
measured 6.950–6.990:1 there under the 7:1 body floor while `themeFailures`
returned `[]`. `nativeSyntaxTints` owns the two tints, six `nativeTextOverFades`
entries own the changed row's chrome, and macOS/Windows `warningText` plus
XP/Aero `successText` take one designed step. The tightest tinted pair is
7.008:1 (`Light`, `primaryText` on the `destructiveText` tint); the identity
brand ink is deliberately unchanged. No role is added and the plain contract's
count does not move.

Plan `592` closes the last native-text box that did not hold its own paint. The
runtime lays out a diff's meta line at 10.5px, its gutter, hunk header, notice
and file-header counts at 11px and its file path at 12px, each on GPUI's default
golden-ratio line box (17/18/19px), but the four heights and the marker column
followed the theme's roles. A compact theme that returns `[]` from
`themeFailures` — `caption`/`label`/`codeBlock` at 8/8, spacing at `0` — resolved
**8 / 8 / 8 / 8** and a **0px** marker. `nativeTextChrome` publishes the fixed
sizes, `nativeTextLineRatio` the line ratio, and `nativeTextTheme` floors the
boxes at the lines and the marker at one code em; no shipped metric moves.

Plan `595` closes a contrast composition the fill-on-surface contract omitted.
A field is a surface that hosts controls: the NumberField steppers paint the
`hover` and `active` washes inside a field whose chrome is the `input` fill, and
an adornment action or a chip sits there too. `stateFillSurfaces` named only the
canvas, card, popover and quiet panel, so a copied theme with `input = hover`
returned `[]` from all nine checks while the stepper's wash measured **1.000:1**
(hover on the card was still 1.133:1). The field fill joins the list, the
fifteen fills are held on five surfaces (60 → 75 in `stateFillSurfacePairs`, 405
→ 420 in the contract), every shipped set already clears 1.05:1 there
(**1.1176:1** at the tightest, `accent` on `input` in Dark · Windows) so no
colour moves, and the reference, design system, README and ledger name the
composition.

Plan `596` closes the numeric contract's other half for a control's glyph. A
control paints the icon tier that matches its size — `IconButton` maps
`sm`/`md`/`lg` to the same `iconSize` tier, and a slider's thumb is
`iconSize[size]` tall inside a `controlHeight[size]` track — but the contract
held only the default `iconSize.md` against the **smallest** control (plan 384).
A theme that raised only the large tier, `iconSize: { lg: 48, xl: 48 }`,
returned `[]` from all nine checks while a 48px glyph painted in a 36px large
control (a 34px content box); a large slider thumb outgrew the same track. Every
control size is now held to its matching tier plus its two borders, the plan-384
rule keeps its single diagnostic, and every shipped pair keeps at least 8px of
content (compact), so no token value moves.

Plan `601` closes the last fixed field metric and a false claim beside it. The
date trigger paints a 220px field around its own `spacing.md` insets, gap and
disclosure glyph, but the width was a component literal, while `overlayWidth`
was documented as the "combobox and calendar width" — the calendar is
content-sized at seven `calendarCellSize` cells (238px before padding). The
field becomes `dimensions.dateFieldWidth`, a content-fit rule holds it to its
own insets, gap, one `label` glyph and its `caption` chevron, and the documents
derive the calendar's grid from `calendarCellSize`. No shipped colour, pair or
pixel moves.

Plan `603` closes the second shipped instance of the track audit plan `503`
left in a consumer. `Progress`, `Meter` and `Slider` paint their unfilled groove
with `track`, but the Toast countdown paints its 2px groove with `muted`
(`components/src/toast/viewport.tsx:230`) on a `popover` card; `muted` is
`popover` in the identity dark theme and every platform and recipe dark set, so
the groove measures **1.000:1** and the unfilled remainder of the countdown has
no shape, while the designed `track` clears the floor at **1.069:1** in the
tightest shipped set (Dark · Windows). The catalogue's sentence named only
`primitives` and said the migration was recorded, but no `TODO.md` row named the
Toast. This plan records the `components` handoff and ships the copyable
two-role composition (`track` groove, `statusTone(...).text` bar) as an executed
example with a test, plus the catalogue, design-system, ledger and TODO
sentences. No colour, pair, floor, metric or theme moves: `track` on `popover`
is already measured and the bar's `xText` is held on its surfaces, so a new
pair would be a guard no consistent palette can fail.

Plan `617` applies plan `567`'s count rule to the last prose document that
retyped the guarantee: `COMPONENTS.md`. Plan `611` made `ring` the tenth check,
but the **Total theme check** row still said `inventory.test.ts` held "this
row's nine names", its present-tense "the ten kinds" was the only count with no
test, and four historical audits in the contrast and metric rows still said
`six`/`nine` checks. The name sentence is count-free now, the one present-tense
count is held to `countWord(themeChecks.length)`, the four audits say "every
check", and the new `inventory.test.ts` case proves its pattern rejects both
historical spellings. No token, pair, floor, metric or theme moves.

Plan `618` closes the last branch of plan `541`'s "the level decides the palette,
and the palette decides the elevation opacity". The `"default"` branch of
`applyPlatformStyle` merged a style's partial elevation over the **base**, so a
copied style that named a colour but no elevation level, applied to an AAA base
requesting `"default"`, declared the default palette and its black `shadow` tint
while keeping the AAA dark alphas (0.10/0.14/0.18 instead of 0.40/0.65/0.80);
`themeFailures` rejected the library's own result with 15 elevation pairs, worst
**1.0175:1**. A level the style does not name now comes from the requested
palette's elevation, a named level still wins, and a same-level base keeps its
edits. Every shipped style names `sm`/`md`/`lg`, so no shipped pixel moves; the
new `applied-level-elevation.test.ts` states the pre-fix composition and the
executed example gains the copied colour-only style.

Plan `619` closes the last pointer state a row paints without a measured step.
A selectable `List` row hovers `accent` and presses `active`, but the contract
measured the generic `hover` → `active` wash ladder and the `accent` → `selected`
selection step, never the transition the shipped row makes. Identity dark
measured **1.004:1** and XP light **1.019:1** on that press — it changed hue but
not luminance — while `themeFailures` returned `[]`; the old cross-team row told
`components` to move the press to `accentActive`, but that is a filled control's
press: on macOS dark a row label measures **6.677:1** on it, under the 7:1 body
floor. `rowPressStepPairs` publishes `active`/`accent` under the `step` class,
identity dark `active` moves `#2A303B` → `#2E3543` and XP light `#DDD7BE` →
`#D8D2B7`, every shipped set clears 1.05:1 (Windows 7 light 1.059:1 at the
tightest), and the contract grows 420 → 421. The wider `active` move shifts a
few quoted tightest figures — the invalid ring, the field hint, the selection
link, the neutral fill-on-tint band and the generic wash ladder — and every one
is re-derived by its guard; no other colour, role, floor or metric moves.

Plan `620` closes the last fixed surfaces whose horizontal chrome never wraps.
`themeMetricFailures` held `toastWidth`, `notificationPanelWidth` and
`overlayMinWidth` only as positive sizes (or only ordered against a sibling), so
a copied platform style could set a 20px toast card — narrower than its own
`spacing.lg` padding, `md` tone icon, gap and title — and `themeFailures`
returned `[]`. Three `at-least` rules now derive each bound from the theme's own
spacing, icon and type metrics: the toast `2·lg + md + lg + bodyStrong`, the
notification panel `2·lg + unreadDot + sm + bodyStrong`, and the overlay
`2·md + md + md + label`. Every shipped set clears them (380/320/180 against
66/50/53 at the shipped identity), so no value moves; the guards protect the
`components` migrations `TODO.md` already schedules.

Plan `621` closes the last fixed text surface whose content does not wrap.
`timeSegmentWidth` was held to **one `body` em**, but `TimePickerSegment` paints
the padded two-digit `HH`/`MM` value; a copied theme with a 24px body and a 24px
segment passed every check while the segment could not show its own value. The
bound is now two tabular digits at a 0.65em advance, rounded up to a paintable
pixel — `Math.ceil(2 * 0.65 * body.fontSize)`, 19px at the shipped 14px body, so
the shipped 26px segment still passes (1.37×) and no token moves. The rule names
its font assumption: a theme that chooses a face with wider digits must widen
the segment. The new suite proves the pre-fix pass and the post-fix failure in
both directions, and the old one-em case in `fixed-surface-metrics.test.ts`
moves with the rule.

Plan `622` closes the last pointer ladder the direction check did not walk. Plan
`619` published the selectable row's press **distance** — `active` one 1.05:1
step from the `accent` hover a row paints under the pointer
(`rowPressStepPairs`) — but `stateLadders` named only the filled families, the
panel action, the generic wash and the selected step. A ratio is symmetric, so a
copied dark theme can press a row **darker** than its hover, toward the canvas,
while the step passes and `themeFailures` returns `[]`; the planted theme in the
suite does exactly that at 1.094:1. `stateLadders` now carries the row press as
its own ladder (`accent` → `active`), the new suite derives the ladder from the
published pair so the two cannot drift, and every shipped set already steps the
expected way, so no colour moves. The example is executed and linked from the
catalogue.

Plan `623` closes the last relationship in the text hierarchy. A selected row
paints its title in `foreground` and its inherited label in
`selectedForeground`; each has its own floor pairs, but `textTiers` named no
pair for the relationship, so a theme could raise the label to the title's
strength (or above it) while `themeContrastFailures` and `themeFailures` both
returned `[]`. The planted identity dark theme with
`selectedForeground: "#FFFFFF"` measures **10.23:1** on `selected` against the
title's **9.03:1**, and still passed every check. The pair joins `textTiers` as
a **state** tier — `selectedForeground` below `foreground` — compared on the
four fills both roles are documented on (`hover`, `active`, `accent`,
`selected`). Every shipped set already clears the 1.05:1 step, so no colour
moves; the tightest is **1.106:1** (`Dark · Windows` on `hover`), which the
catalogue now derives and the page states. The old rationale in three documents
— that adding the pair “would demand a step the design does not have and report
every shipped set” — was false and is replaced.

Plan `624` closes the last unmeasured composition in a field's minimum width.
`dimensions.fieldMinWidth` is documented as "narrowest field that shows a query
and an action", but plan 384 had only measured the **chip** inside it: a theme
that lowered `chipMinWidth` to 10 and `fieldMinWidth` to 60 cleared every rule
while a `SearchInput` paints 62px of padding, leading glyph, gap, query, gap and
clear control in a 42px content box. The rule now takes the larger of the chip's
content box and the field's own query row — `2 * spacing.md + 2 *
fieldAdornmentSize + 2 * spacing.md + body.fontSize` — so one member keeps one
diagnostic and plan 384's 102px bound is unchanged at the shipped metrics. The
query row needs 78px, every shipped 200px field clears the larger bound at
1.96×, and no token value moves. The suite proves both directions: the new
cases fail on the pre-fix rule and pass after it.

Plan `625` answers plan 620's own exclusion. Plan 620 held the fixed surfaces
whose chrome never wraps and left the dialog and drawer ladders alone because a
card and a dialog "are reflow containers, so one glyph is not the minimum" — true
of the title, false of the padding and the always-painted `sm` close control.
A copied style with `dialogWidthSm: 40`, `drawerWidthSm: 40` and
`drawerHeightSm: 50` cleared every rule while the shell painted 24px of padding
and a 28px control into a 40px surface. Three `at-least` rules now hold the
widths to `3 * spacing["2xl"] + h3.fontSize` (88px) and the bottom-drawer height
to the close zone, one row and the bottom padding (96px); the shipped
360/320/240 clear them at 4.09×/3.64×/2.50×, so no value moves. The suite fails
five cases on the pre-fix tree and passes all seven after it.

Plan `627` applies plan 384's content-box rule to the fixed surfaces that landed
after it. A control, a field, a keycap and a date trigger subtract
`2 * borderWidth.thin`; the menu minimum, Toast card, notification inbox and the
dialog/drawer shells did not, and every one of those surfaces paints its border
**inside** its own width or height. A coherent theme with
`borderWidth.thin: 12` and `dialogWidthSm: 88` — exactly the plan-625 bound —
painted a 72px padding-and-close-control chrome into a 64px content box while
`themeMetricFailures` and `themeFailures` both returned `[]`; the same held for
the Toast at 80/66, the drawer widths and the bottom-drawer height. Seven bounds
now include the surface's two borders: the shipped identities move from
53/66/50/88/88/96/280 to **55/68/52/90/90/98/282**, and the shipped
180/380/320/360/320/240/380 clear them at 3.27×/5.59×/6.15×/4.00×/3.56×/2.45×/
1.35×, so no token value moves. The suite states the shipped bounds, proves each
surface can fail on its own, reads a theme's own border instead of the fixture's
12, and carries one case through the total check.

Plan `629` closes the header plan `627` left out of the inbox's height. The
panel maximum was held to the list plus its two borders, but
`NotificationCentreHeader` always paints above the list: `spacing.lg` padding on
both sides, a `sm` action (or a shorter `label` title) and its own
`borderWidth.thin` bottom rule. A coherent theme with
`notificationPanelMaxHeight: 300` and the documented 280px list returned `[]`
from all ten checks while the header and list need 335 inside the panel's
borders, so the panel's `overflow: hidden` squeezed the header or made the
documented list viewport unreachable. One term now reads the header from the
theme's own spacing, density and border metrics; the shipped 380 clears the
335px bound at 1.13×, so no value moves, and the suite proves the old
list-and-borders bound fails.

Plan `631` closes the last always-painted control inside a fixed surface that
plan `627`'s audit left out. The Toast card bound counted its padding, tone
icon, one gap and one title glyph, but `toast/viewport.tsx` also paints an
unconditional `IconButton label="Dismiss" size="sm"` after a second
`spacing.lg` gap, and `IconButton` is a square `controlHeight.sm`. A theme with
`toastWidth: 100` returned `[]` from all ten checks while the card needed 108
inside its `overflow: hidden`; a coherent theme with a lifted `sm` control hit
the same gap at 128. The bound now counts the gap and the square control; the
shipped 380 clears 108 at 3.52×, so no colour, pair, floor, metric or shipped
theme value moves. This supersedes the Toast's 68px bound and 5.59× figure
quoted in plan `627`'s summary; its other six bounds are unchanged.

Plan `632` closes the sibling undercount plan `631`'s audit left behind. The
date trigger's bound charged `typography.caption.fontSize` for its disclosure
marker, but `DatePickerTrigger` paints `<Icon size="sm" />`, which
`packages/icons` resolves through `iconSize` — 14px against the caption type's
12px at the shipped identity. A copied theme at the old `51`px bound returned
`[]` from every check while the trigger needed `53`, and a theme that lifted
`iconSize.sm` to 16 was read as `12`. The bound now charges the theme's own
`iconSize.sm` beside the one `label` glyph; the shipped `220` clears the
corrected `53` at `4.15×`, so no colour, pair, floor, metric or shipped theme
value moves. The suite states the 53, the 52px plant, the lifted 55 and the
total-check entry, and the catalogue, design system and JSDoc name the `sm`
disclosure icon.

Plan `634` closes the sibling undercount plan `632`'s audit claimed did not
exist. `fieldMinWidth`'s query-row bound — the second bound plan `624` added
beside the token-input chip — charged **both** glyphs of the row as
`fieldAdornmentSize`, but `SearchInput` paints its leading magnifier as
`<Icon size="md" />`, which `packages/icons` resolves through `iconSize.md`;
only the trailing clear control is the adornment the token names. At the
shipped identity the two tiers are both 16, so the 78px bound hid the gap. A
copied theme that lifted `iconSize.md` to 20 returned `[]` from every check
while the query row needed 82; the field would clip or shove its own leading
glyph. The bound now reads `iconSize.md` for the lead and `fieldAdornmentSize`
for the action, the shipped bound stays 78, every shipped set passes (200
against the larger 102px chip bound), and no colour, pair, floor, metric or
shipped theme value moves. The suite states the tier equality, plants the 81px
field, accepts the corrected 82 and carries the failure through the total
check; the catalogue and JSDoc name the `md` icon.

Plan `636` closes the last fixed mark in the `dimensions` group with no token.
Plan `631` left the Toast's 3px tone bar out of the card bound as "consumer
chrome", but `ToastCard` paints the bar itself as a sibling of its content row
inside the card's width, so the row gets `toastWidth` less its two borders and
the bar; a copied theme at 110 returned `[]` from every check while the row
needed 111 under `overflow: "hidden"`. The bar was also a hardcoded literal
while the unread dot, carousel marks and timeline marker are dimensions. The
plan ships `toastToneBarWidth` (3) beside `toastWidth`, charges it in the bound
(108 → 111), states the ownership and a lifted-bar case, and keeps the shipped
380 clearing at `3.42×`; no colour, pair, floor or other metric moves. The
components migration joins the existing `theme.dimensions` cross-team row.

Plan `637` closes the last prose figures the panel-action story quotes. The
rationale said "80 of the 288" in two catalogue sections and the `softActionPairs`
JSDoc while `soft-action.test.ts` measured **84**; its light luminance band
`0.742–0.765` described the default palettes only and omitted the AAA light
tints (`0.657`); and "the identity light press was 1.0492:1" named a pair that
is not the identity's tightest (`active` on `infoSoft`, 1.0202:1). The count,
total, both bands and both named ratios are now derived — in
`soft-action.test.ts` as the shipped guarantee, and in `docs.test.ts` across the
catalogue, the design system, the README and the two JSDoc blocks, so a palette
edit has to take the prose with it. No colour, pair, floor or metric moves.

Plan `638` closes the last fixed square the numeric contract held in one
direction only. `dimensions.fieldAdornmentSize` fits inside the smallest
control, but the four shipped clear/remove controls that paint it — SearchInput,
TimePicker, HotkeyRecorder and the TagInput chip — put the `caption` role's `✕`
inside that square, so the token has to hold a caption line the way
`keycapSize` does. A copied theme with a 20px caption leading and the 16px
adornment returned `[]` from every check while the glyph overflowed its box. One
`at-least` rule reads the theme's own `caption.lineHeight`; every shipped set
passes at equality (16), so no colour, pair, floor or metric moves.

Plan `641` closes the sign half of the diagnostic rule plan `532` started on
non-finite values. Three `atMost` fits — the inline icon against its caption or
label line and the inline avatar against its dense row — compared a bound that
could be zero or negative, so a broken line or row also reported the correct
icon or avatar as an `at-most` failure. All three now read the bound through
`usableBound`; a usable bound still catches a real overflow, every shipped set
passes unchanged and no value moves.

Plan `642` closes the one count the elevation rules never held. The metric
contract validated every shape a level carried and required `sm`/`md`/`lg` to
hold at least one, but never capped the count, while the native runtime paints
one shadow per element and `elevationShadow` reads the first entry. A copied
theme with `elevation: { md: [a, b] }` returned `[]` from every check and
silently painted only `a`; the shipped-only guard in `elevation.test.ts` never
saw a consumer's level. Every level, the defined `overlay` included, is now
held to `at-most 1` shape, a single-shape theme and every shipped set pass
unchanged, and `elevationShadows` remains the web list. No colour, pair, floor,
figure or shipped metric moves.

Plan `643` closes the last family of fixed marks without a stroke floor. The
timeline marker already read the rail it marks, but the Toast's tone bar, the
inbox's unread dot, a carousel indicator and an avatar's presence dot were only
`positive`, so `toastToneBarWidth: 0.1` returned `[]` from every check while
painting a sub-hairline smear. Each now holds at least the theme's own hairline
(`borderWidth.thin`), a zero or non-finite mark keeps its single `positive`
diagnostic, a borderless theme invents no bound, and every shipped set passes
unchanged. No colour, pair, floor, figure or other metric moves.

Plan `645` closes the fixed-surface bounds that still counted only part of the
chrome painted inside them. A message viewport at one row had no content box
once its `spacing.md` padding and two borders were painted; a preview card at
10px was narrower than its own padding; the menu minimum omitted the surface's
`spacing.xs`; the field's query row omitted the field's two borders while the
chip row charged them; and a dialog or drawer reserved `2 * spacing["2xl"]` for
the close control even when the control reached `spacing.lg +
controlHeight.sm` further. Each bound now charges the full painted chrome, every
shipped set passes unchanged (the shipped `160`, `240`, `180`, `200`, `360` and
`320` are far above the new minima) and no colour, pair, floor, figure or
shipped metric moves.

Plan `646` makes `finite` mean finite **after the renderer's cast**. The style
path casts every metric with `value as f32`
(`references/gpuix/packages/native/src/renderer.rs`), and the runtime's own
`Metrics::apply` names the consequence — a value that overflows `f32` becomes an
infinity Taffy rejects and gpui renders nothing. `Number.isFinite` passed `1e39`,
so a metric in every group (`spacing`, `radius`, `borderWidth`, `iconSize`,
`avatarSize`, `dimensions`, `typography`, `elevation`, `motion`) returned `[]`
for a value that painted nothing; `1e-50` passed `positive` and painted at size
zero; and a huge `density.rowHeight` cascaded into four dependent bounds that
blamed the rows and surfaces. `paints` is now
`Number.isFinite(Math.fround(value))`, every
bound and ladder waits for a paintable value, the sign rules read the cast, and
the theme's extremes skip an unpaintable step, so one broken number keeps one
diagnostic. Every shipped set passes unchanged and no colour, pair, floor,
figure or shipped metric moves.

Plan `649` closes the last native-text surface the find highlight was not
measured on. Plan `582` moved the check from the plain document tone to the code
block's 3.5% ink wash, but a changed diff row is painted directly on `bg` under
a 5.5% tint of `diffAdd`/`diffDel` (`nativeSyntaxTints`), so a match there sits
behind the selection wash **and** a tint neither check measured. On Aero light
the active match over those tints put `mutedForeground` at 4.437:1 and
`primaryText` at 4.481:1 on the quiet panel, under the 4.5:1 secondary floor,
while `themeHighlightFailures` and `themeFailures` returned `[]`.
`themeHighlightFailures` now walks both tints for the match, the active match and
the step, the failure names the tint role and its fraction beside the surface,
and Aero light's two inks take one designed step (`#3D4C5F` → `#36455A`,
`#0C4A8C` → `#0A417A`). Every shipped set passes (4.586:1 at the tightest tint
pair), the code-ink arm still names its own fraction, and no other colour, pair,
floor or metric moves.

Plan `650` closes the last surface the inactive label was not measured on. The
catalogue said a disabled field is out of scope for the body pairs because the
designed state reads `disabledForeground`, "which `inactivePairs` measures", but
`inactiveBaseSurfaces` held the `disabled` fill and the four plain surfaces and
never the field's own `input` fill — the fill `disabledControl(theme)` keeps a
field on. A planted theme with a coherent `input` fill passed all ten checks on
the pre-650 tree while its disabled label measured **2.494:1** on `input`, under
the 3:1 inactive floor. `input` joins the one owner, so `inactivePairs` and
`selectionInactivePairs` each grow 13 → 14 and `contrastPairs` 421 → 422; the
wash pair already exists because `input` is one of the nine `selectionSurfaces`,
and every shipped set already clears both new pairs (6.610:1 at rest and
4.944:1 washed at the tightest), so no colour moves.

Plan `651` closes the selected row's missing press. Plans `381` and `619` hold the row's hover-to-selection step and the press of an *unselected* row, but nothing held the press of a selected one: the design system claimed it "still presses to `active` … and walk[s] away from the canvas like every ladder", while identity light measured **1.001:1** (the selection and the press wash are the same luminance), eleven of twelve default palettes sat under the 1.05:1 step floor and eight moved the wrong way — and both the contrast and direction checks returned `[]`. The press is a different state: it previews the row's return to the canvas when a click deselects it. `selectedActive` is the designed fill, a 24% canvas veil over `selected` (derived with `compositeOver`, shipped as an editable literal in every palette), `selectionPressStepPairs` publishes its step, `selectionPressPairs` holds the ten inks and three chrome roles a pressed row paints, and `StateLadder` gains a per-ladder `direction` so the one toward-canvas ladder can exist. Every shipped set passes as-is — no existing value moves — and the opaque fill keeps the selection readable while the pointer is down.

Plan `655` closes the half of plan `356` that the source-snippet guard skipped. Plan `356` extended `snippets.test.ts` to every non-test module, but its import case filtered out a block with no import as a contextual continuation — right for a Markdown page that sequences blocks, wrong for a source `@example`, which stands alone. Fourteen of the package's 44 source examples called the API with no import and five painted with an undeclared `theme`, so a reader copying `statusTone`, `filledControl`, `textStyle`, `focusRing`, `selectionStyle`, `elevationShadow`, `elevationShadows`, `motionTransition` or `getTheme` got a `ReferenceError` while the suite stayed green. Every source block now imports what it calls and declares its theme with `getTheme("light")` (or `"dark"`); a new case lists every block that stops being copyable, and the pre-fix tree fails it with the fourteen labels. No token value, colour, pair, metric or floor moves.

Plan `656` closes the other half of plan `655`'s promise. The guard read exported names, so a bare `theme` was invisible: twenty-two blocks that begin with a package import (two source `@example`s, fourteen catalogue snippets and six README snippets) passed `theme` to a helper or read `theme.colors`, and a reader who copied one got `ReferenceError: theme is not defined`. The first probe found seven through `theme.` property access; a second pass for a bare argument found fifteen more. `usesUndeclaredTheme` now holds every package-importing block to a local binding, a typed parameter, or a destructured callback, and accepts a JSX `theme={…}` prop and the word "theme" in a label; the synthetic case proves both directions. Every block resolves its own theme (`nativeTextTheme`'s source example uses `getTheme("dark")`, the rest light), the README block drops its unused `alpha` import, and no token value, colour, pair, floor, metric or check moves.

Plan `658` closes the last copyable block that taught a theme the package rejects. The recipe section told a reader to "copy it, edit a value" and its block changed only `primary`, so the copied Aero theme kept the Windows dark black foreground and the old hover/pressed family: `themeFailures` returned seven failures — the label at **3.999:1** on the new fill and the fill as a mark at 2.696:1 on a card, popover, the quiet panel and a field, 2.882:1 on the value groove and 2.233:1 on the hover wash. The page already warned against exactly that (plan `310`), but no suite ran the block: `snippets.test.ts` only held the brand maps, and no executed example owned a recipe edit. `recipe-edit.example.ts` now moves the whole Contoso primary family on the Aero dark base and is held to `themeFailures`; the snippet guard reads the documented nested map, requires it to equal the example's family, builds it, and reconstructs the pre-fix one-role edit to prove it fails. No token value, pair, floor, metric, count or shipped theme moves.

Plan `659` closes the last content a field paints with no pair behind it. A
tone-tinted Alert carries a field — the package's own `controlBoundarySoftPairs`
records that composition, and plan `092` measured the field's edge there — but
the two roles the field's content paints were measured only on the `input` fill,
the four `Surface` tones and the four row washes. A probe of the shipped identity
light theme found the hint at **4.439:1** on `destructiveSoft` and 4.4954:1 on
`successSoft`, and the AAA light hint at 6.993:1 on `destructiveSoft` under its
7:1 floor, while `themeFailures` returned `[]`. The pressed selected row plan
`651` added carried the hint but not the typed text a transparent `InlineEdit`
paints there. `softFieldPairs` publishes `inputForeground` and `placeholder` on
the four soft fills, `selectionPressPairs` gains typed text on `selectedActive`,
and the two shipped hints move one half-step (`#5C6574` → `#5A6372`,
`#3D4047` → `#3B3E45`). The contract grows 451 → **460**; every shipped set
clears the new pairs (4.575:1 for the hint, 10.455:1 for typed text in a panel
and 11.432:1 on the pressed row at the tightest), and `soft-field.test.ts` states
both bugs and reconstructs the pre-fix values to prove the guard can fail.

Plan `663` follows plan `659`'s own edit into the prose. `selectionPressPairs`
grew a typed-text role and already held `selectedForeground` on the pressed
`selectedActive` from plan `651`, so the list carries **six** text roles and the
inherited label is measured on **five** fills. The catalogue said five roles in
the pressed-row paragraph and "all four fills it keeps" in three label sentences
(the row-text paragraph named only three washes besides `selected`), and the
design system's `selected` interaction row omitted the pressed fill. Two derived
guards now read the count and the fill list from `selectionPressPairs`,
`selectionPairs` and `contrastPairs`, so a seventh role or a sixth fill moves the
words with it. No colour, pair, floor, metric or shipped theme moves.

Plan `664` finishes the truth pass the previous plan started, one surface over.
Plan `659` added a seventh `selectionPressPairs` entry, so the ledger's
"9 pressed-row pairs" under-reported the list by one, and six further phrases in
the same row — the pressed row's status labels, the inactive-selection, two
fill-selection lists and the panel-action pair — were hand-typed with no owner.
The total-check row and the design system also still said the hierarchy compares
the selected label on "the four fills it keeps", but plan `651` made
`selectedActive` a fifth. Six phrases now derive from their lists, the tier word
derives from `tierSurfaces`, and `figures.test.ts` builds the sentence from the
same helper the hierarchy check uses. No colour, pair, floor, metric or shipped
theme moves.

Plan `665` follows plan `610` into the elevation prose. That plan joined
`disabled`, `skeleton` and `track` to `elevationContentSurfaces`, but the three
paragraphs that describe the `md` walk in the catalogue and the design system
still listed the original twelve fills, while the floor table and the scrim
paragraph already said fifteen. All three enumerate the index now, and one guard
reads every paragraph that enumerates it — count and members both derived, with
the wrap normalised — so a fourth enumeration cannot start citing the index
without listing what it holds. No colour, pair, floor, metric or shipped theme
moves.

Plan `666` applies the same rule to the scrim. The catalogue has two
present-tense explanations of `overlayWashPairs`; plan 508 added the three solid
status chips to the first, but the contrast-audit paragraph kept the pre-508
list while its own next sentence counted twenty-one pairs, and called the
missing group "the three resting fills" — a phrase that names nothing. The
paragraph now enumerates all twenty-one surfaces, says which chips its rationale
sentence means, and a guard derives both the count and the member list from
`overlaySurfaces`. No colour, pair, floor, metric or shipped theme moves.

Plan `667` closes the half plan `384` deferred. `dimensions.chipMinWidth` was
only positive, so a theme with `{ chipMinWidth: 10, fieldMinWidth: 100 }`
returned `[]` from every check while the chip's content box
(`10 − 2 × spacing.sm`) was negative: `TagInputChip` paints the minimum as an
outer `minWidth` and spends it on two `spacing.sm` insets, a `caption` label, the
`spacing.xs` gap and a 16px remove control. Plan 384 declined the bound because
it read the value as a content width and said the chip's padding had no token;
the padding is `spacing.sm`. The chip now holds its own chrome from the theme's
spacing, caption size and `fieldAdornmentSize` (44px at the identity against the
shipped 80px, 1.82×), the field rule from plans 384/624/634 is untouched, and
`chip-chrome-fit.test.ts` states the erased-chip regression. No colour, pair,
floor, metric or shipped theme value moves.

Plan `669` holds the ownership sentence plan `668` left behind. `metricMembers`
now derives from the ten scale indexes and `textRoles`, but §*Numeric metrics*
still said "each group's default object" and named `dimensions` — the object,
not `dimensionNames` — so a reader building a diagnostics table would write the
`Object.keys` cast `668` removed. The paragraph names every index and a
`docs.test.ts` case rejects the old phrasing and any dropped name. No source or
token value changes.

Plan `670` closes the half of plan `350`'s convention that was never guarded.
`350` fixed `primary-text.example.ts` for having "no test importing it and no
document linking it", but its `examples.test.ts` case enforced only the import,
so thirteen examples were linked from neither the catalogue, the design system
nor the README. Each now sits in the section it explains, and two cases hold the
link set to `readdirSync(src)` in both directions: every example is linked, and
every example link names a file that exists. No source or token value changes.

Plan `671` closes the error ring on plan `651`'s new surface. `selectedActive` is
the fill a chosen row keeps under the pointer, and both documents said an
invalid control paints its `destructive` ring "on the same surfaces" as `ring` —
which now includes that fill — but `invalidRingPairs` predates it. A planted
`destructive: #E1E5EC` measures 1.0596:1 on light `selectedActive`: it clears the
chip's 1.05:1 floor, so no surface pair caught it, and the boundary check
returned `[]` for an error ring a reader could not see. The pair joins the list,
every shipped set already clears its floor (3.761:1 at the tightest, XP light),
and the contract grows 460 → 461. No colour, floor or shipped metric moves.

Plan `672` finishes plan `651`'s count in the four prose surfaces it did not
touch. Plan `651` changed the catalogue's "eight surfaces a link paints" to
"nine" when it added `primaryText` on `selectedActive`, but the sentence still
enumerated eight, and the two `primaryText` role-table use cells, the *Brand
action* paragraph and the package README repeated the omission while the
design-system interaction-state guard stayed green because its own link row
already named the pressed fill. All five passages name it now, and a derived
`docs.test.ts` case reads the nine at-rest surfaces from `contrastPairs` and
holds every passage to them. No token value, pair, floor or metric moves.

Plan `674` finishes plan `651`'s surface list for the two roles that still
stopped at the persistent washes. `selectionPressPairs` measures
`disabledForeground` on the pressed `selectedActive` at the inactive floor, and
`border` on it at the divider floor, but the §8 `disabled` row, the §9
inactive-label and decorative-divider rows, the catalogue's Verification
paragraph and the README named only `hover`/`active`/`accent`/`selected`. The
`disabled` state row's derived guard read `inactivePairs` and
`selectionInactivePairs`, never `selectionPressPairs`, and both §9 rows were
compared with a hand-written string, so nothing could catch it. The prose names
the pressed row now, `docs.test.ts` derives every `disabledForeground` surface,
and `disabled-press-surfaces.test.ts` derives the two floor rows from the pair
lists; the divider case also found the persistent `selected` fill plan 335 has
measured since, missing from the same row. `disabledRowStyle` paints the
composition in the executable example. No colour, pair, floor, metric or shipped
theme moves.

Plan `695` corrects the blockquote composition's role. `nativeTextOverFades`
held `textMuted` over the 5% accent wash because the reference blockquote
container names `text_muted`, but every non-code markdown run carries
`theme.text` and `SelectableText` paints those runs, so the authored body ink
was unmeasured. A planted `foreground: "#bebebe"` on `Dark · Linux` paints a
6.315:1 body on the card, popover and quiet panel while the pre-fix check
returned no accent-wash entry. `text@1>accent@0.05` joins the list beside the
container fallback, which is kept because the pinned binary is not inspectable;
every shipped set already passes, so no colour, pair count, floor or shipped
metric moves.

Plan `698` closes the selected option's check on the fill that carries the
selection. `comboboxCheckPairs` measured the `primary` check on the `hover` wash
a highlighted option paints (plan 341) but not on `selected`, where the chosen
option sits at rest, or `selectedActive`, where it presses. The shipped macOS
dark set painted `primary` on `selected` at **2.748:1**, under the 3:1 mark
floor, while `themeFailures` returned `[]`. Both fills join the list (461 → 463
pairs); the macOS dark accent moves one designed step (`#0A84FF` → `#2E93FF`,
3.214:1 on `selected`) with its hover, press, ring and selection wash, and the
documented brand example lightens its primary family (`#9579FF`, 3.146:1 on the
inherited selection) and drops the scrim override its lighter fill no longer
needs. No other shipped set or role moves.

Plan `700` closes the selected menu option's label on the pressed fill.
`selectionPressPairs` already measured the menu foreground on a pressed row, and
`rowTextPairs` measured `popoverForeground` on `selected`, but a selected
`Select` option keeps the same foreground on `selectedActive` while the row is
held, and nothing measured it there. The pair joins `selectionPressPairs`
(463 → 464 pairs); every shipped set already clears the 7:1 body floor — Linux
dark at **11.59:1**, the tightest, beside 8.98:1 on `selected` — so no colour,
floor or shipped metric moves.

Plan `720` closes the one consumer claim the density prose never qualified. The
preset still publishes `controlHeight` / `controlPaddingX` / `rowHeight`, but
`primitives` plans `370`–`372` pinned the text-entry field family to one 36 px
box and the Button to the shadcn 32 / 36 / 40 heights, which are the `spacious`
preset's three steps — so both pages read as if a compact theme still shrank a
field or a button while the shipped library does not. The two density sections
now name the exception, the families that still read the metrics (`Toggle`,
`ToggleGroup`, a `Select` option row), and the proof, and
`density-exception.test.ts` holds the prose to the preset arithmetic and fails
on the old unconditional sentence. No token value, pair, floor, metric or
shipped theme moves.

Plan `723` closes the one pointer surface the selection walk omitted. A reader
click-drags a text selection with the button held, so the fill under the
highlight is the row's pointer state: `hover`/`active` for an unselected row —
both in `selectionSurfaces` since plan `081` — and the pressed `selectedActive`
(plan `651`) for a chosen one. The pressed fill was excluded by plans `651`, `689`
and `700` with the sentence "a row is selected at rest", a reason the list itself
contradicts, so a theme whose `selection` composited to `selectedActive` returned
`[]` from `themeFailures` while the highlight measured **1.000:1** on the only
surface a reader drags over while the row is pressed. The pair joins
`selectionWashPairs` (10 → **11**); every shipped set already clears the floor
(**1.185:1** at the tightest, `High contrast dark`), so no colour moves and
`contrastPairs` stays 464. `selectionSurfaces` is untouched, because `figures.ts`
derives the caret's four "nine surfaces" figures from it; the pressed row stays
outside the scrim and elevation walks, which are read at rest.

Plan `725` closes the last hand-typed ladders in the scale suite. Plan `668`
shipped the ordered indexes (`spacingSteps`, `avatarSizeSteps`) and plans
`068`/`096` the axis indexes (`densityNames`, `controlSizes`) so a table or a
test walks the owner; `scale.test.ts` still typed nine spacing pairs, the two
preset pairs, the three avatar comparisons and the within-preset control sizes
by hand, and `rowHeight` had no cross-preset order at all. A fourth preset added
to `densityNames` would compile, ship and never be compared to `spacious`; a
preset whose rows shrank as density grew passed every check. The pairs now derive
from the indexes, each list's length is held to `index.length - 1`, the density
ladder covers control height, padding and the row, and a synthetic inverted
preset proves the order check can fail. Every shipped value already holds
(spacing 2…64, avatars 20…40, controls 24/28/32 → 28/32/36 → 32/36/40, rows 28 →
32 → 36), so no metric moves. (This sentence first said `avatars 16…40` and named
two control presets; plan `787` derived all four ranges from the shipped scales.)

727 closes the persistence half of the extension mechanism. `themeOverrides` is
relative to the base it was measured against, and four consumer documents
corrected only the mode (“choose a base of the theme's mode”) — so a Windows
application that stored `{ radius: { md: 8 } }` and replayed it on the identity
silently painted the identity's radii, border and type instead of the Windows
ones, with `themeFailures` returning `[]` for both. The rule is the base, not its
mode: `ThemeEdit` is the artifact (`{ base: ThemeChoice, overrides }`),
`themeEdit(choice, edited)` resolves the choice before it diffs so a mismatched
base is not representable, `applyThemeEdit(edit)` is the replay, and the test
walks every shipped platform and recipe in both modes and both contrast levels.

729 closes the last text tier the hierarchy check never compared: a tone-tinted
status panel paints its title with the panel's own `xSoftForeground` and its
caption with `mutedForeground`, but `textTiers` named only the four plain body
roles, so at AAA — where both floors are 7:1 — a caption and the panel ink
measured **1.003–1.042:1** on all six high-contrast light sets and an edited
theme could paint them with one colour while `themeFailures` returned `[]`. The
four pairs derive from `statusTones`, the four AAA light inks take one step
below the ramp's 950 stop (`#081226`, `#03170E`, `#1E1300`, `#2A0607`), and every
shipped set clears the step (1.068:1 at the tightest, AAA dark destructive). The
README's selected-row sentence also gains the fifth fill plan 651 added.

733 closes the one control state the package never defined. Every other state
has a designed owner — `filledControl` for a filled action, `disabledControl` for
an unavailable one, `focusRing`/`invalidFocusRing`/`insetFocusRing` for focus,
`softAction` for a panel action — but the **unchecked** selection control had
none, so `primitives` draws a checkbox's edge with `input` (a field *fill*) and
an off switch's track with `muted` (a *surface* role): both measure **1.000:1**
on a card in six shipped sets (identity light, Linux light and the four platform
dark styles, whose `muted` and `input` are the card itself) while every check
returned `[]`. The off switch's knob is `foreground` on the `track` groove and
was in no pair at all, so an edited theme whose `foreground` equalled its `track`
shipped a switch with no knob. `foreground` on `track` joins `trackMarkPairs`
(464 → **465**, 8.536:1 at the tightest, identity dark, so no colour moves), and
design-system §8 gains the `unchecked` row the table was missing. The plan also
exported `textTierSurfaces`: the new mark made `track` a shared surface of the
`mutedForeground`/`foreground` text tier, where neither role is copy, so the
class rule now has one implementation (the hierarchy check, the figure table and
the suite that counts tier surfaces all read it) and the documented thirteen
surfaces stay thirteen.

737 overturns plan 306's one exemption. `disabledControl(theme)` returns three
roles and `opacity: 1`, and the fill was the only one no pair measured: an edited
theme whose `disabled` equalled its panel returned `[]` from all ten checks while
an unavailable control painted no fill at all. Eight shipped pairs in six sets
were under the 1.05:1 surface floor — the identity dark fill **was** its `muted`
panel and its `popover` (`1.000:1`), the identity light fill **was** its `hover`
wash, and the four light platform variants painted a fill *lighter* than their
window (`1.015`–`1.040:1`). The exemption's stated reason — "no neutral can clear
both a white card and the quiet panel" — is false: the shipped light value clears
both at 1.133:1 and 1.103:1 because the floor is 1.05:1. `disabledFillPairs`
measures the fill on the five surfaces `stateFillSurfaces` names (465 → **470**),
and five values move one designed step inside their own neutral families
(identity light `#EEF1F5` → `#E6EAF0`, identity dark `#222730` → `#2A303B`,
macOS dark `#353537`, Linux dark `#383838`, Aero light `#EAF0F7` → `#E2EBF5`),
so every shipped set clears 1.065:1 at the tightest while its label keeps the
inactive floor and its edge the divider floor.

742 finishes the half of plan `723`'s Decision 5 that shipped undone. The wash
walk gained the pressed `selectedActive` fill, but the passages that carry the
old reason — *"a row is selected at rest"* — were never corrected, and four of
them still said the pressed fill is **deliberately outside the selection-wash
walk**: `selectionPressPairs`' JSDoc, `selectionInputPairs`' JSDoc, the
catalogue's interaction-states paragraph and the design system's selected-row
paragraph. That left `docs/tokens.md` and the design system contradicting their
own *Text selection* sections (plan `723`), and left a reader with the false
impression that a drag across a chosen row is unmeasured. Three further passages
state the same reason about lists that *do* stop at the pressed row — the design
system's `disabled` and inactive-label rows (the second pinned by `docs.test.ts`)
and a case comment in `selection-input-text.test.ts` — where the reason is not
the list's; plan `723` Decision 3 keeps those pairs at rest in
`selectionPressPairs`, and that is what they now say. No pair, colour, floor,
metric or role moves: `selectionWashPairs` stays **11**, `selectionSurfaces` nine
and `contrastPairs` **470**, and a new suite reads all six prose blocks and
fails on the refuted reason or on a claim the pair lists contradict.

744 corrects the one storage rule the extension story got wrong. `ThemeEdit` is
`{ base, overrides }` — there is no whole-theme variant — but both the JSDoc and
the catalogue said an edit of a base a `ThemeChoice` cannot name "is stored as
the whole theme", so a consumer looked for an artifact the package never returns
while the sentence hid the capability it has: `themeEdit` measures the overrides
against the **resolved** choice, so a brand theme's differences travel in them
and the pair reproduces the brand. The two sentences now state that mechanism
and the one limit — a different `mode` returns `undefined`, and the caller keeps
its theme object — and `theme-edit.test.ts` stores and replays a brand theme
built from the identity, pins the artifact's two fields, and fails on the old
sentence. No token, pair, colour, floor or metric moves.

745 closes the one example the total check rejects. `brand-theme.example.ts`
exports a dark brand the catalogue holds to `themeFailures` and a light brand
`theme.test.ts` held only to `themeContrastFailures`; the light brand's
`primaryText: "#5330C8"` measures **6.941:1** through the 3.5% ink a native
`<markdown>`/`<code>`/`<diff>` paints under its body — a layer the native-text
check gained after plan 098 wrote the family — so the executed example a consumer
copies failed the package's own one-call guarantee while its contrast half
passed. The link ink takes one designed step inside its violet family
(`#5330C8` → **`#4B2AB4`**, 7.957:1 through the wash), both brands are held to
`themeFailures`, and a regression case rebuilds the pre-fix palette and pins the
three `nativeText` entries so the example cannot fall behind another check
unnoticed. Only the example moves.

747 closes the last three passages plan `737` left carrying the exemption it
refuted. `disabledFillPairs` holds the `disabled` fill to the 1.05:1 floor on the
five surfaces a control is placed on, and the catalogue, the design system's
history section, the README and `disabledControl`'s JSDoc all say so — but the
public `ThemeColors.disabled` JSDoc, the design system's inactive-control rule
and the catalogue's high-contrast role row still stated that the fill is
"deliberately allowed to sit near the panel" because "no neutral clears both a
white card and the quiet panel", so a consumer reading the type or the rule was
told the fill may equal its panel while `themeFailures` rejects exactly that
theme, and both pages refuted the same reason elsewhere. All three now name
`disabledFillPairs` and the five surfaces, `disabled-fill-claims.test.ts` derives
the surface list from the pair list and fails on the restored reason or a missing
surface, and no colour, pair, floor, metric or role moves.

Plan `753` closes the last promise on the design-system page that the tokens do
not keep: §6 said the fixed metrics "live in `theme.dimensions` so a brand can
widen a dialog or a toast without touching component source", but no consumer
reads a dimension — the dialog keeps a local 360/480/640 ladder, the Toast a
380px card, the menu a 180px minimum, and the rest are literals too — so the
edit changed nothing. The only guard over the paragraph pinned its numbers, not
the promise. The sentence now names the three shipped literals, the cross-team
migrations already in `TODO.md` and the `style` prop a brand passes today, and
`dimension-consumer-reach.test.ts` derives those literals from `dimensions` and
fails if the unconditional promise returns.

Plan `754` closes the gap one step past plans 349 and 546: the 44 published pair
lists were held to uniqueness and to a compile-checked inventory, but not to
being **measured**, so a list added to the record and never added to one of
`themeContrastFailures`'s walks would pass every gate while its pairs were exempt
from the contract. The inventory now lives in `published-pair-lists.ts` for both
suites, `pair-enforcement.test.ts` plants every published pair on the shipped
light theme — the two roles set to one colour, the dialog face set to the
scrimmed surface and the scrim to the face for the face-on-itself composition —
and fails unless a public check names the pair, and a planted composition no walk
measures proves the predicate can fail. No colour, pair, floor, metric, role or
shipped theme moves, and `contrastPairs` stays 470.

Plan `755` closes the one contract the URL codec stated but did not implement:
`themeChoiceParams` documented density as the axis always written — the
fallback belongs to the platform, so `platform=darwin` is `compact` and the same
link edited to `win32` would otherwise become `comfortable` — but the encoder
wrote a density only when the row named one, so the canonical link for
`{ platform: "darwin" }` was `platform=darwin` alone and lost its compact on the
edit. The writer resolves the choice and always emits the preset it carries;
the JSDoc, catalogue, design system, README and COMPONENTS row state the total
rule, `canonicalLink` executes the platform-only row, and
`theme-choice-params.test.ts` fails on the omission. No token value, pair,
floor, role, metric or shipped theme moves.

Plan `760` closes the last section of the catalogue whose figures had no owner.
`docs/tokens.md` §*Native text documents* states four "tightest" figures — the
opaque syntax minimum at 7.706:1 (`Light`), the 3.5% ink wash at 7.110:1
(`Light · macOS`), the inline-code pair at 7.102:1 (`Light · Windows XP`) and
the pressed diff tint at 7.008:1 (`Light`) — and one named value, the 28%
word-level wash at 5.813:1 in identity dark, and none of them was derived:
falsifying any one left every suite green. The ledger stated the same pair of
minima as plan `574` measured them (opaque 7.562:1, inked 7.008:1), which later
palette plans moved. The word-level figure is also wrong by a rounding step —
the shipped composition measures 5.813 852…, so the page now quotes **5.814**.
The table gains the `"ink"` kind, because the runtime's ink wash is black on a
light tone and white on a dark one rather than a theme role, and it calls
`nativeInk` so the table and `themeNativeTextFailures` measure one paint. Seven
entries (five page clauses, the ledger's two) take `documentedFigures` to
56; the ledger states each figure with its set and its pair, and
`figures.test.ts` rejects the pre-760 digits per entry. No colour, pair, floor,
metric, role or shipped theme moves.

Plan `766` closes the last stale count plan `683` left behind. The ledger's
Status tones row said `statusFillPairs` holds each solid fill on "the eight
surfaces a chip sits on" and enumerated the `xText` surfaces as seven — the
plain surfaces plus the four unpressed washes — while `chipSurfaces`,
`statusTextSurfaces`, `softBorderSurfacePairs`, the catalogue and the design
system all hold nine, the `muted` panel and the pressed `selectedActive` wash
included. Plan `683` had called both ledger mentions historical statements about
plans `308` and `399`; this sentence is present tense and names the current
lists. The row now says nine and names every `xText` surface, and
`inventory.test.ts` derives the count from `statusFillPairs` and slices the
`xText` clause to hold it to `statusTextSurfaces`, so a name elsewhere in the
row cannot stand in for a missing member. No token value, pair, floor, metric,
role or shipped theme moves.

Plan `767` catches the last stale solid-chip count in the package front door.
`packages/tokens/README.md` said `statusFillPairs` holds the four solid fills on
"those eight surfaces", two sentences after correctly naming the nine surfaces a
chip sits on; `chipSurfaces` and the derived pair list have held nine since plan
`651` added the pressed `selectedActive` wash, and `docs/tokens.md`,
`docs/design-system.md`, the ledger (plan `766`) and the list itself already said
so. Plan `683`'s README pass and plan `766`'s audit both missed this present-tense
sentence because `readme.test.ts` guarded the skeleton pulse count but never the
solid fills. The sentence now says nine, and the new case derives the count word
from `statusFillPairs`, requires the floor and the `destructive` filter note, and
rejects the old phrase, so a future surface moves the prose with the list. No
token value, pair, floor, metric, role or shipped theme moves.

Plan `760` gave the native-text section's figures an owner. Plan `770` closes the
next four. The washed unavailable-label sentence quotes **4.722:1** "at AAA" —
the pre-`520` AAA **dark** value — while `selectionInactivePairs` measures
**4.8444:1** in the AAA light palette (the dark palette is now 7.9325:1), so the
catalogue, the design system, the README and the ledger all quoted a ratio the
package no longer produces and one of them named the wrong palette. Falsifying
that figure, the panel action's 8.667:1 and the light brand's 6.941:1 / 7.957:1
in place left all 7013 tests green: `figures.ts` is the owner of present-tense
figures and none of the four compositions was in it. The table gains the washed
inactive tightest entry over `selectionInactivePairs`, the AAA light entry, and
the panel action's entry over the `softActionForeground` rows of
`selectionSoftPairs`; the brand's two figures are derived in `theme.test.ts`,
where the executed example already lives, and both brand places now name the
canvas — the tightest of the four document tones. The plan-510 history sentence
also loses the unguarded "thirteen", which the list has not held since plan
`650`. No token value, pair, floor, metric, role or shipped theme moves;
`contrastPairs` stays 470.

Plan `772` gives the inset ring's two published numbers an owner outside the
catalogue. `insetFocusRing` quotes **4.697:1** at the tightest and says `ring`
meets `primary` at **1.000:1** in sixteen shipped sets; `docs/tokens.md` derived
both, but `COMPONENTS.md`'s Focus state row and the helper's own JSDoc quoted the
same two numbers with no derivation behind them, so a palette edit that moved a
family foreground or changed a set's side failed the catalogue's case and left
the other two places stale (falsifying either number in both places stayed green
at 7024 tests). Three `figures.ts` entries now derive the ratio from
`filledControlFamilies` × the three fills, `inset-focus-ring.test.ts` holds the
ledger's count word and the JSDoc's "most" (`identicalCount * 2 >
shippedThemes.length`), and the digit-only no-count guard in `figures.test.ts`
learned the spelled-out forms — the rule plan `717` wrote could not see
`sixteen shipped sets`, and `styles.ts` shipped exactly that one line away from
the phrase the rule replaced. No token value, pair, floor, metric, role or
shipped theme moves; the figure table moves 65 → 68 and `contrastPairs` stays
**470**.

Plan `774` gives the catalogue's index paragraph its four sizes. §*For
documentation sites* teaches `textRoles`, `statusTones`, `platformNames` and
`filledControlFamilies` and states how big each catalogue is — "the ten
typographic roles", "the four status families", "the four platform variants",
"the four filled control families" — and every one of those words was
hand-typed: incrementing each in turn left **7029 tests** green, while the
`Typography` type row and the README already derive the same numbers. The four
are now part of `describe("contract prose counts")`, which captures *every*
occurrence of each phrase in the collapsed page and requires the count to be
`countWord(index.length)`, so a fifth status tone, platform or filled family —
or an eleventh type role — moves the paragraph with its index, and a stale
second copy fails. The page needed no prose edit: it was right, just unowned. No
token value, pair, floor, metric, role or shipped theme moves; `contrastPairs`
stays **470**.

Plan `775` closes the same gap one document over: the package README's index
paragraph states "the four status families", "the four platform variants", "the
six timings" and "four easing phases", and replacing all four with
`five`/`five`/`seven`/`five` left **7030 tests** green — while the equivalent
`Motion` row in `docs/tokens.md` is held by `docs.test.ts`. `readme.test.ts` now
captures every occurrence of each phrase and holds it to `statusTones.length`,
`platformNames.length`, `motionLevels.length` and `motionPhases.length`, and the
two retypings beside it go with it: the motion-level case iterates
`motionLevels` instead of `Object.entries(motion)` (plan `519`'s rule) and the
status-family sentence takes its count from `statusTones`. The README needed no
prose edit. No token value, pair, floor, metric, role or shipped theme moves;
`contrastPairs` stays **470**.

Plan `777` closes the last unowned paragraph on the same page: §*Shadows* names
the six `elevationSurfaces`, the `md` content fills and two ratios, and mutating
all five left `readme.test.ts` green. The paragraph was also stale — it
enumerated twelve of the fifteen `elevationContentSurfaces` (`disabled`,
`skeleton` and `track` joined in plans `737`, `619` and `347`) — so it names all
fifteen, and its surface count, content-fill count, three group counts and two
ratios are derived. An elevation shadow is not a role pair: it is the `shadow`
tint at a level's alpha over a surface, so `figures.ts` gains a `"shadow"` kind
that composes `elevationShadow(theme, level)` the way the contrast checker does,
and the front door's two figures become table entries. The table grows 68 → 70.
No token value, pair, floor, metric, role or shipped theme moves; `contrastPairs`
stays **470**.

Plan `778` closes the figures in that same paragraph: the AAA tint (`#FFFFFF`)
and its three alphas (`10%, 14% and 18%`) are stated in the front door, the
catalogue and the design system, and replacing both in all three passages left
**263 tests** green. The percentages now derive from `highContrastDarkElevation`
at `sm`/`md`/`lg`, the tint from the resolved AAA theme, and the justifying
counterfactual — "a black tint measured **1.000:1** at every level" — from the
default dark tint painted over the AAA canvas. No token value, pair, floor,
metric, role or shipped theme moves; `contrastPairs` stays **470** and the figure
table stays **70**.

Plan `785` gives the brand example's three published figures an owner. The
executed extension story is quoted in four documents — the catalogue, the design
system, the package README and the example's own header — and falsifying two of
its figures in the catalogue (`4.24` → `4.99`, `3.146` → `3.199`) left **7045
tests** green: `docs.test.ts` pins only the 1.157 catalogue sentence,
`theme.test.ts` pins 3.146 numerically but never against a sentence, and nothing
reads the README, the design system or the header. `brand-figures.test.ts`
derives the inherited-foreground cost (the dark `primaryForeground` on the
pre-098 fill `#7C5CFF`, written out because plan `098` moved it), the selected
option's check (`primary` on `selected`, 3.146:1) and the dialog face
(`popover` over the identity scrim composited with the brand's action, 1.157:1)
from the package, and holds each document to every figure it quotes. The brand
is an executed example rather than a shipped set, so the suite is separate from
`documentedFigures`, whose provenance names a shipped theme. No token value,
pair, floor, metric, role or shipped theme moves; `contrastPairs` stays **470**.

Plan `787` closes the last unguarded numbers in the ledger's Design tokens row.
Its closing parenthetical states four shipped scale ranges, and one was false:
it read `avatars 16…40` while `avatarSize` has shipped `20/26/32/40` since plan
`054`; the range came from plan `725`, whose §*Measured* said "16 → 24 → 32 → 40"
— a ladder that never existed. The same parenthetical abbreviated the density
controls to two presets (`24/28/32 → 32/36/40`) where `densityNames` has three,
hiding the step plan `725` made the suite compare. `inventory.test.ts` now builds
all four phrases from `spacingSteps`/`spacing`, `avatarSizeSteps`/`avatarSize`
and the density index, so an endpoint, a step or a preset cannot move without the
ledger; every one of the four mutations, and a shipped `avatarSize.lg` edit,
fails the case. The row and the plan index state the corrected ranges; plan
`725`'s own file keeps its authored text as history. No token value, pair, floor,
metric, role or shipped theme moves; `contrastPairs` stays **470**.

Plan `792` closes the same class one table over. The native syntax palette has
no generated table: its only documentation is a paragraph in the catalogue that
groups captures by role, and the policy case in `native-text.test.ts` read the
**names**, not the assignments. Moving `property` from `foreground` to
`warningText` in that prose left 244 tests green while every name and role still
appeared somewhere, so a consumer could follow the page and paint a different
role than the bridge. The three sentences that state the palette's size — the
type table's "24 syntax capture colours", the native-text paragraph's
"24-capture syntax palette" and the ledger's "24-capture syntax palette" — had
no owner either: mutating any of them left the suite green, and a 25th capture
would ship with all three still saying 24. The case now parses each
`capture … are \`role\`` group, rejects a duplicate capture, compares the whole
`capture → role` map with `nativeSyntaxRoles` both ways, and derives the three
counts from the palette's keys. No colour, pair, floor, metric, role or shipped
theme moves; `contrastPairs` stays **470**.

Plan `793` closes the same class in the table above that paragraph. The native
field table is the only field-to-role mapping for a hand-built document, and the
policy case checked its names the same way: changing `bg` from `card` to
`foreground` left 264 tests green while every name still appeared, and a
consumer following the table would paint a document's content plane in the text
role. The case now parses the table's rows, order included, and compares them
with `nativeTextRoles` plus the three non-role rows (`appearance`,
`fontSans`, `fontMono`); a swapped, moved, deleted or duplicated row fails, as
does a bridge edit. No bridge field, colour, pair, floor, metric, role or
shipped theme moves; `contrastPairs` stays **470**.

Plan `800` owns the three historical ranges the recipe files quote for the inks
plans `574`, `582` and `649` moved. `xp.ts` states "6.41–6.95:1 on the beige
canvas, opaque and through the runtime's 3.5% ink wash", and `aero.ts` states
"4.437–4.498:1 on the quiet panel and the canvas" and "4.429–4.496:1 through the
active match". The pre-fix hexes survived only in the defect suites' planted
tables — which pin single ratios, not endpoints — and XP's four inherited inks
were written down nowhere, so a palette edit or a retyped digit staled a premise
while every shipped ink still passed. `platform-claims.test.ts` now writes out
each pre-fix palette, plants it on the shipped recipe theme, recomputes the
composition the sentence names (opaque and 3.5% ink; the active find match over
3.5% ink; the active match over each 5.5% diff tint), and holds the failing-pair
count, the en-dash range and the floor word to the derivation. Each case fails
on a mutated digit, a moved canvas or a collapsed count. No colour, pair, floor,
metric, role, recipe or shipped theme moves; `contrastPairs` stays **470**.

Plan `803` closes the same class inside the palette itself, where no suite read
the comments at all: `disabled-fill-claims.test.ts` owns the `lightColors` doc
block and the `ThemeColors.disabled` JSDoc, and `soft-panel-caption-tier.test.ts`
derives the current caption step, but neither sees a `//` line — so the
`disabled` fill's 1.131:1 on the quiet panel and the popover, the AAA light
panel inks' pre-729 1.003–1.042:1 and current 1.109–1.133:1 ranges, the quoted
`#1F1F1F` caption, and the AAA raised action's 7.165:1 through the inverse veil
and 1.071:1 off the four soft tints could all be retyped while every gate stayed
green. `palette-rationale-figures.test.ts` reads only the `//` lines, derives
each figure through `contrastRatio`/`compositeOver`/`contrastFloors`, plants
`palette[ramp][950]` for the range whose own sentence names that stop, and holds
each sentence whole. No colour, pair, floor, metric, role or shipped theme
moves.

## How to use a plan

1. Read it fully before starting. Do not skim the STOP conditions.
2. Work only inside your own worktree (`workspaces/<workstream>/`).
3. Run every command in the plan; a command that was not run did not pass.
4. On a STOP condition, stop and report with the evidence. Do not improvise a
   workaround that the plan did not authorise.
5. When done, update this table's status column and tick the matching task in
   `TODO.md`.
