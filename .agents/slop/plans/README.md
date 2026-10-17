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

Numbering is by dependency order; gaps are left for other workstreams. The table
is the authority on order, not the file name.

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [020](020-gpuix-runtime-capability.md) | GPUix runtime capability map and verification strategy | A | — | **done (recon); runtime verification BLOCKED — read §3** |
| [021](021-primitives-consume-tokens.md) | `packages/primitives` consumes `@gpuixui/tokens` directly | B | 016, 017, 018, 030 | **done** — `Theme` re-exported as `PrimitiveTheme`; `focusRing`/`elevationShadow` replace the local copies; 165 offline tests and 68 runtime tests green, the runtime theme suite now uses the shipped light/dark palettes |
| [024](024-icons-size-scale-from-tokens.md) | `packages/icons` takes its size scale from tokens | B | 021, 031 | **done** — `ICON_SIZES` is tokens’ `iconSize`; the identity test is the guard (19 icons tests) |
| [023](023-primitives-alpha-from-tokens.md) | `alpha` comes from `@gpuixui/tokens` | B | 014, 021 | **done** — the local copy and its test are deleted; `core/index.ts` re-exports the tokens helper (161 offline tests) |
| [022](022-swarm-single-writer.md) | One writer per worktree — the swarm is running duplicate agents | infra | — | **BLOCKER B3 — read §3 before writing anything** |
| [025](025-fields-disabled.md) | A real disabled state for `Input`/`TextArea` | C | 030, 041, 046 | **done** — read-only + tab-order + handler guards; 3 offline and 2 runtime tests (70 total), both-direction proof on the handler guard |
| [030](030-primitives-package.md) | `packages/primitives` — render primitives + Tier 1 components | B/C | 020 | **implemented** — all 19 Tier 1 components + `core/` + element-tree suites; docs pages and `examples/basic-app` pending; read §9 (the §2.2/§3 file lists are superseded by the shipped tree) |
| [031](031-icons-package.md) | `packages/icons` — icon set, sizing, accessibility | B | 020 | **done** (47 icons, 18 tests proven in both directions; on-screen paint unverified — 020 §3) |
| [040](040-phase-c-tier1.md) | Phase C: Tier 1 foundational components (primitives workstream) | C | 030, 031 | **implemented** — code, tests, in-package docs, mounted examples and runtime proofs are done (plans 047, 041); only the `apps/docs` pages (docs-site) and the published-binary CI run remain |
| [041](041-tier1-runtime-verification.md) | Tier 1 in the real GPUix runtime (primitives workstream) | C | 030, 031, 040, **140** | **done** — 46 `test:runtime` tests in `packages/primitives/runtime/` (icons included there, §2.2); measured results and the two-direction proof in §9 |
| [042](042-tier1-theme-verification.md) | Tier 1 in both themes, and a live theme switch | C | 030, 040, 041 | **done** — 5 `test:runtime` tests incl. a repaint-on-switch proof; results in §8 |
| [043](043-presentational-testid.md) | `testId` parity for the presentational primitives | C | 030, 041 | **done** — `Text`/`Separator`/`Spacer` accept and forward it; both-direction proof in §6 |
| [044](044-radio-skip-disabled.md) | A radio group must skip disabled options | C | 030, 041 | **done** — `decideMove` takes an optional `isDisabled`; measured regression proof in §6 |
| [045](045-labelledby-prop.md) | `labelledBy` must return the prop the controls read | C | 030, 040 | **done** — returns `{ label }`; the old return type named nothing; measured proof in §6 |
| [046](046-textarea-no-submit.md) | `TextArea` must not accept `onSubmit` | C | 030, 040, 041 | **done** — the runtime trades the newline for a submit; measured probe in §6 |
| [047](047-tier1-docs-and-examples.md) | Tier 1 docs pages and runnable examples | C | 030, 031, 040, 041 | **done** — 21 primitives pages + the icons page, six composed examples, and a 7-file/60-test runtime run that mounts every example (§8) |
| [048](048-tier1-fixable-limitations.md) | Three fixable Tier 1 limitations | C | 030, 040, 041, 047 | **done** — named `ButtonGroup`, `ScrollArea` deltas, RadioGroup Home/End; measured both directions in §7 (64 runtime tests) |
| [049](049-radio-group-focus-contract.md) | The radio group's focus contract, and a Switch prop that did nothing | C | 030, 040, 041, 044, 048 | **done** — per-item ring, focus follows the selection, a derived roving index and `Switch.invalid`; six measured both-direction probes in §7 (68 runtime tests) |
| [053](053-value-controls.md) | Value controls: `Slider`, `RangeSlider`, `Meter` — owner claimed | C | 030, 040, 041, 047, 049 | **done** — one value-maths core, thumb geometry, element-tree and runtime suites, docs pages and a composed example; measured in §11 |
| [054](054-remaining-tier1-controls.md) | The remaining unclaimed Tier 1 rows: `NumberField`, `OTPField`, `Toggle`, `Rating` | C | 053 | **done (implementation)** — all four landed with docs, examples and runtime proofs; OTPField's key contract runs on key up and a real clipboard paste is documented as unverified (§9) |
| [055](055-tier1-theme-axes.md) | Tier 1 under the remaining theme axes: high contrast, density, platform type | F | 030, 041, 042, 051 | **done** — 4 runtime tests (13 files / 119), green in both directions; measured in §7 |
| [056](056-toggle-group.md) | `ToggleGroup`: a real segmented control, and the disabled radio tab stop | C | 030, 041, 047, 049, 054 | **done** — data-driven single/multiple group, one roving tab stop, measured click/arrow/activation/disabled contracts; §7-§12 record the fix and the two-direction proofs. `COMPONENTS.md` now has a real row and Button groups no longer claims it |
| [057](057-select-accessibility.md) | `Select` is invisible to assistive technology | C/F | 030, 041, 047 | **done** — the published GPUix `Select` sets no ARIA roles, so the wrapper produced only a `Window` node; §0 has the measured dump and the runtime's supported roles. Now combobox/listbox/option with `expanded`, `value` and `selected`, proven in both directions |
| [058](058-accessible-names-from-text.md) | Text buttons and toggles have no accessible name | C/F | 030, 041, 047, 057 | **done** — measured: a `<Button>Save changes</Button>` exposed `role: Button` and no label, so every text button was unnamed to AT. The name now comes from text-only children, an explicit `label` wins, and non-text content stays unnamed; §8 has the dumps and both directions |
| [059](059-text-semantics.md) | `Text` roles do not reach the accessibility tree | C/F | 030, 041, 047, 058 | **done** — measured: the raw `<text role="heading" aria-level={2}>` is a `Heading`, but our `Text` (and its docs) claimed the runtime exposes no heading at all. `h1`-`h3` are now headings with levels and `code`/`codeBlock` are `Code`; §8 has the evidence |
| [060](060-tooltip-placement.md) | Tooltip placement: the tip anchors to the container, not the trigger | C/F | 020, 041, 156 | **done** — measured: GPUix's tooltip root stretches on its parent's cross axis, so the tip opened at the layout edge (column) or below the row, and the runtime's `center` align is half a panel off. The root now hugs the trigger via `alignSelf` and the default align is `start`; §6 has both directions (14 files / 137 runtime tests) |
| [061](061-radio-group-invalid.md) | `RadioGroup` cannot show a failed validation | C/F | 030, 041, 049 | **done** — every other selectable control painted `invalid`; the radio's spec never passed it. `invalid` now paints the empty circles destructive and leaves a chosen one on its accent; §6 has both directions (14 files / 138 runtime tests) |
| [062](062-select-list-width.md) | `Select`'s list never matches its trigger | C/F | 030, 041, 057 | **done** — measured: `minWidth: "100%"` resolved against the layer, so a 108 px and a 900 px trigger both opened a 57 px list. The wrapper now measures the trigger and passes a numeric `minWidth`; §6 has both directions (14 files / 140 runtime tests) |
| [063](063-slider-drag-contract.md) | A slider drag is captured, and only the primary button may start one | C/F | 030, 041, 047, 053, 130 | **done** — the docs' "no pointer capture" claim was never measured and is false; a right/middle click moved the value. The gesture is now primary-only, five runtime tests cover the captured drag/clamp/refusal, and §6 has both directions (14 files / 145 runtime tests) |
| [064](064-autofocus-ring.md) | `autoFocus` fields take focus but paint no ring | C/F | 025, 030, 041, 047, 054 | **done** — the runtime focuses on mount without dispatching `onFocus`, so the tracked focus state stayed false. The focus state now starts from `autoFocus`; five runtime tests prove the ring on mount and its clearing, §6 has both directions (14 files / 150 runtime tests) |
| [065](065-checkbox-group.md) | `CheckboxGroup`: the claimed Tier 1 variant with no component | C | 030, 040, 041, 047, 049, 061, 056 | **done** — data-driven rows where the whole row is the hit area and the tab stop, an optional select-all parent derived over enabled options only, and a core rule that never clears a disabled value. 13 core + 6 element + 6 runtime tests; §6 records both directions (15 files / 156 runtime tests) |
| [066](066-select-placement-flip.md) | `Select`'s list covers its trigger near the window edge | C/F | 030, 041, 047, 062, 156 | **done** — measured: `fit="snap"` clamps without flipping, so a select at the bottom opened a 68 px list at `y 724` over a trigger at `y 740`. The wrapper now estimates the list height, opens above when it does not fit below, and lets `side` win; 5 core + 1 estimate + 2 runtime tests, both directions proven (§6) |
| [067](067-tooltip-placement-flip.md) | `Tooltip`'s tip covers its trigger at the window's top edge | C/F | 030, 041, 047, 060, 066, 156 | **done** — measured: the tip opened at `y 8..34` over a trigger at `y 12..30`. The wrapper measures its root and flips the tip below when it does not fit above, using the shared `decideVerticalSide` with a preferred `top`; 3 core/estimate + 2 runtime tests, both directions proven (§6) |
| [068](068-select-long-list-scroll.md) | `Select`'s list runs off the window instead of scrolling | C/F | 030, 041, 047, 062, 066, 156 | **done** — measured: 30 options painted a 908 px list from `y 8`; the last option was at `y 888.5`, outside the 800 px window, and the list was not a scroller. The list is now capped to the free space on its side and scrolls, and rows keep their height; 3 offline + 1 runtime tests, three regression directions proven (§6). Its recorded keyboard limitation is fixed by plan `069` |
| [069](069-select-keyboard-scroll.md) | `Select`'s keyboard highlight does not scroll the capped list | C/F | 030, 041, 047, 057, 062, 066, 068 | **done** — plan `068`'s conclusion ("no active-index signal") was wrong: the published `SelectItem` exposes `highlighted` through its state children, and `renderer.scrollIntoView` scrolls the capped list (measured). The wrapper now scrolls a newly highlighted option into view; 3 runtime tests, both directions proven (§6) |
| [070](070-rating-invalid.md) | `Rating` cannot show a failed validation | C/F | 030, 041, 047, 054, 061 | **done** — every value-bearing control painted `invalid`; the rating's colour resolver had no branch. An empty star now takes `destructive`, a filled one keeps `primary` (the `RadioGroup` rule); measured in the element tree and the runtime `<svg>` tint, both directions proven (§6) |
| [071](071-tooltip-accessible-description.md) | `Tooltip` content is invisible to assistive technology | C/F | 030, 041, 047, 060, 067 | **done** — the tip painted but produced no a11y node, and the trigger carried no description. A string tip is now the trigger's `aria-description` and the open tip is a named `role="tooltip"` node; the feedback example's info icon is a named `role="img"` so keyboard focus announces it. Measured before/after in §1/§6, both directions proven (§6) |
| [072](072-scroll-area-keyboard.md) | `ScrollArea` cannot be scrolled with the keyboard | C/F | 030, 041, 047, 048, 140 | **done** — measured: a focused scroller ignored PageDown/Space/arrows, and Tab landed on controls painted outside a 60 px region with no scroll. A **labelled** area is now a named focusable `region` with arrow/page/Home/End scrolling through `renderer.scrollTo`, guarded by `getFocusedElementId` so fields inside keep their keys; an unlabelled area is unchanged. 7 core + 3 element + 5 runtime tests, 15 files / 172 native tests, both directions proven (§6) |
| [073](073-info-tip.md) | The info-icon tooltip trigger is hand-rolled, and `basic-app` ships it broken | C/F | 041, 047, 060, 067, 071 | **done** — the trigger shape was duplicated per consumer and the app's `Box` version was hover-only and absent from the a11y tree. `InfoTip` is now the one shape: a named focusable `img` with a focus ring, a decorative icon and a string description; used by the feedback example, the docs and `basic-app`. 3 element + 3 runtime tests, 16 files / 175 native tests, both directions proven (§6) |
| [074](074-docs-coverage-guard.md) | Guard the package's own bar: every public component has an indexed page | F | 030, 040, 047 | **done** — nothing enforced the docs half of the component bar. A runtime-free guard now asserts every PascalCase export has a page (or is allowlisted), every page exists with frontmatter, and every page is linked from `docs/README.md`. 5 tests, three failure directions proven (§6) |
| [075](075-select-option-groups.md) | `Select` option groups | C | 030, 040, 041, 047, 057, 062, 066, 068, 069 | **done** — GPUix publishes `SelectGroup`/`SelectLabel` and the runtime maps a named `group`, so the documented "no option groups" limitation was ours. `options` accepts a `SelectOptionGroup`; the heading is skipped by the keyboard, counted in the placement estimate and exposed as a named `group` node. 5 core + 2 element + 4 runtime tests; §4 measured the two failing directions |
| [076](076-otp-single-tab-stop.md) | `OTPField` is six tab stops | C/F | 030, 041, 047, 054, 064, 072 | **done** — measured: `Tab` visited `otp-cell-1…6` before the next control. The field now carries **one** roving stop: the focused cell while focused, otherwise the first empty cell (the last when full). 3 core + 3 element + 2 runtime tests; §7 has both directions (16 files / 181 runtime tests) |
| [077](077-number-field-decimal-step.md) | `NumberField`'s decimal step carries floating-point noise | C/F | 030, 041, 047, 054, 064 | **done** — measured: `0.2 + 0.1` reported `0.30000000000000004` from `onChange` while painting `0.3`. `stepNumber` now trims its clamped result to 12 decimals; typed precision and bounds are unchanged. 4 core + 1 runtime tests; §7 has both directions (16 files / 182 runtime tests) |
| [078](078-button-group-square-edges.md) | `ButtonGroup`'s attached mode leaves every button rounded | C/F | 030, 041, 047, 048 | **done** — the clip rounds only the group's boundary, so contiguous buttons met with a rounded notch, and the docs' "hidden by the clip" claim was false. `Button` gains `radius`; an attached group now provides `"none"` through context and the group supplies the rounded ends. 1 element + 2 runtime tests, both directions proven (16 files / 184 runtime tests) |
| [079](079-tier1-state-aware-style.md) | State-aware `style`, slice 1: the seam and the seven controls | F | 030, 040, 041, 047, 074, 078 | **done** — the runtime's own `StateStyle`/`resolveStyle`; seven parts export their state type; 7 element-tree + 4 runtime tests, both directions proven (17 files / 188 runtime tests) |
| [080](080-tier1-state-aware-style-groups.md) | State-aware `style`, slice 2: group roots, `Label`, `ScrollArea`, `Select` | F | 079, 030, 040, 041, 047 | **done** — ten more state types; 9 element-tree + 2 runtime cases, both directions proven (17 files / 190 runtime tests); per-item styling stays an open API question |
| [081](081-tier1-per-item-style.md) | Per-item styling for the data-driven groups, and a `Select` trigger style | F | 079, 080, 030, 040, 041, 047, 065, 066, 075 | **done** — seven per-item props + `Select.triggerStyle`; 8 element-tree + 4 runtime cases, both directions proven (17 files / 194 runtime tests); D28 |
| [082](082-text-clamp-runtime-cache.md) | `Text`'s `clamp` is decided by whichever identical string the runtime lays out first | F | 030, 041, 047, 059, 074 | **done** — measured: the runtime's text layout cache omits `lineClamp`, so a clamp leaked into an identical plain `Text` (`36 / 36` px) or was ignored (`108 / 108` px). `clamp` is now the element's own `maxHeight` + `overflow: hidden`; 3 offline + 5 runtime tests, 4 of 5 fail in the old direction (§6) |
| [083](083-select-focus-ring.md) | `Select`'s trigger takes focus but paints no focus ring | F | 030, 041, 047, 057, 079, 081 | **done** — measured: the trigger held native focus with `boxShadow: undefined`, the only focusable control with no indicator, and had no `testId`. It now tracks focus (`useFocus`), rings while focused or open, carries `focused` in `SelectTriggerState` and is named `${testId}-trigger`; 2 offline + 5 runtime tests, 4 failing in the old direction (§6) |
| [084](084-focus-ring-matrix.md) | A focus-ring matrix over every focusable Tier 1 control | F | 030, 041, 047, 083 | **done** — the bug class plan `083` belongs to (a focusable control that forgets its ring) had no cross-control guard. Seventeen `it.each` cases now prove each control paints exactly one `focusRing`, of the exact value, inside the control; 221 runtime tests, both "zero" and "two rings" directions proven (§6) |
| [085](085-button-onclick-activation.md) | `Button.onClick` fires for a pointer click only | F | 030, 041, 047, 058, 079 | **done** — measured: a `Button` with only `onClick` reported **0** calls on Enter and 1 on a click, so the familiar prop dropped every keyboard user (and the components workstream's contract passes `onClick`). One activation path: pointer and key both report `onClick(event)`, then `onActivate()`; 2 offline + 4 runtime tests, both directions proven (§6) |
| [086](086-icon-button.md) | `IconButton`: the icon-only button as one part | C/F | 030, 031, 040, 041, 047, 058, 078, 085 | **done** — the components workstream's plan `110` §7 imports `IconButton` and had a local stand-in; the hand-rolled shape also got the icon tint, loading state and name wrong. `IconButton` composes a square `Button` with a required `label`, tints the icon with the variant's foreground, sizes it from `iconSize`, and paints the spinner instead of the icon while loading; 6 offline + 5 runtime tests, both directions proven (§6) |
| [087](087-label-beside-control-truth.md) | A `Label` beside a standalone checkbox/switch is inert — the docs said otherwise | F | 025, 030, 047, 065, 074 | **done** — the component docstrings and both pages recommended pairing a standalone box with a `Label`, which is painted text: not clickable and not associated. The docs now say so and point at `CheckboxGroup` for a labelled row; no behaviour changed (§6) |
| [088](088-one-value-callback.md) | One change callback name: `onValueChange` across Tier 1 | F | 030, 040, 047, 079, 200 | **done** — thirteen public props were `onChange`, a name that promises React's event shape while carrying a value; every controlled value is now `value`/`defaultValue`/`onValueChange`, `Toggle` keeps `onPressedChange` and overlays `onOpenChange`. A source/doc/example guard fails by file and line; both guard directions and the runtime suites ran (§6) |
| [089](089-disabled-tab-order-matrix.md) | The disabled tab-order matrix | F | 025, 030, 041, 047, 072, 076, 084 | **done** — sixteen controls each carry their own hand-written "not a tab stop when disabled" guard, the same duplication that produced `076`'s six stops and `083`'s missing ring. `runtime/tab-order.runtime.test.tsx` proves both halves per control in 32 cases; a `Checkbox` mutated to keep its stop fails the disabled half, one that drops it fails the enabled half (§6) |
| — | `packages/tokens` (tokens-theme) | B | — | not written here |
| — | `packages/components` (components) | C/D | 030 | not written here |
| — | `apps/playground` + `packages/testing` + the native smoke test (playground) | B | 020 | not written here |
| — | `apps/docs` Fumadocs site (docs-site) | B–F | — | not written here |

### The runtime blocker (D10 / B1) is fixed — read plan 140 before claiming anything

`020-gpuix-runtime-capability.md` §3 recorded the measured evidence that this box
is **Intel macOS**, GPUix publishes **no `darwin-x64` native binary**, and this
SSH session has **no Aqua session** — so no GPUix component could be rendered,
clicked or focused here.

That changed on 2026-10-17. **`140-gpuix-native-darwin-x64-build.md`
(playground workstream) built `@gpuix/native@0.10.0` from source on this host**
with `gpui_macos/runtime_shaders` (the `xcrun metal` step is optional), and the
playground's native suite is **11/11 green** against it: layout, text, input,
focus, overlay, scroll, panel, virtual-list, table and workspace are all
`verified 0.10.0`, with nine screenshots and `smoke-report.json` as evidence.

Two consequences for this workstream:

- the artifact is present in every worktree's `node_modules` (one shareable
  store), so `packages/primitives` and `packages/icons` can run the **real**
  `TestRenderer` — see `041-tier1-runtime-verification.md`;
- the verdict's provenance is a **locally-built** binding, and `nub run test`
  still runs on a host without any binding. A row may only cite the runtime when
  this workstream's `test:runtime` run produced the observation, and the
  gold-standard confirmation on the *published* binary is the CI task in
  `TODO.md` (playground workstream).

### Prerequisite for the whole swarm: one writer per worktree

`022-swarm-single-writer.md` records the measured fact that the supervisor is
running **several live agents per worktree** (5 for `primitives` alone), so they
clobber each other's files. Its §4 mitigation was applied to the `primitives`
tree on 2026-10-17 08:40 (the duplicate session was deleted after the tree was
committed) and the tree went green afterwards. **The fix itself is still
unlanded:** `scripts/swarm-supervisor.sh`'s runner loops `opencode run` without a
stable `--session`, so every loop iteration that returns early leaves a live turn
and the next iteration forks another. Until §5.1 lands in the shared `scripts/`,
every workstream will re-acquire a duplicate. Read its §3 first.

### `tokens-theme` (block `010–019`, plus one overflow plan)

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
| [019](./019-motion-tokens.md) | Motion tokens (durations and easings) | B | 011, 016 | in progress |
| [051](./051-platform-type-styles.md) | Platform type styles: one real theme per platform | B | 011, 016 | done |
| [052](./052-register-font.md) | `registerFont`: the library's and a consumer's typefaces in the runtime | B | 011, 051 | planned — native proof blocked by B1 |

Plans 010–019 are the `tokens-theme` workstream. They own `packages/tokens`,
`docs/tokens.md` and `docs/design-system.md`; every other plan belongs to the
agent that owns its paths. The block was full at 019 (`010–019` in the table
above) and 020–049 belongs to primitives, icons and Phase C, so 051 takes the
first free block — as the tokens workstream's docs-layering plan (050) does.
052 is rescued from the abandoned `agent/fonts` branch (`6fc7641`), with its
step 1 answered from the pinned runtime's source; its native proof is blocked by
B1, so it is planned, not done. — **B1 is fixed** (ADR 0003, plan `140`), so
052's and 017's native proofs are unblocked; the playground runs a locally built
`darwin-x64` 0.10.0 binding.

### `playground` (block `100–199`)

Owns `apps/playground` and `packages/testing`: the native smoke harness, the
playground shell and the feasibility probes. `100–150` is used; `151+` continues
in the same block.

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [100](./100-package-testing.md) | `packages/testing` — the platform-free smoke harness | B | — | **landed** |
| [110](./110-native-smoke-test.md) | The native smoke test (cross-cutting) | B | 100, 120 | **landed**: the suite runs on this host against a locally built 0.10.0 binding; the 0.5.1 legacy probe is at `apps/playground/legacy-probe` (ADR 0002) |
| [120](./120-app-playground.md) | `apps/playground` — native playground + smoke runner | B | 100 | **landed**: shell, `SplitPane`, the scenario registry and the CLI (§2.1 records the API deviations) |
| [130](./130-tier3-4-feasibility-probes.md) | Tier 3/4 feasibility probes | B→D | 100, 110, 120 | **landed**: `table-select-sort`, `table-column-resize`, `workspace-tab-drag` green on this host (§3 records the deviations) |
| [140](./140-gpuix-native-darwin-x64-build.md) | Build the `darwin-x64` GPUix binding from source (blocker B1) | B | 110, 120, 130 | **landed**: `gpui_macos/runtime_shaders` removes the blocking `xcrun metal` step; **12/12 green on this host**, exit `0` (§4 records every measured fact) |
| [150](./150-native-theme-gallery.md) | Native theme gallery: the token layer in the real runtime | B | 140, 011 | **landed**: `paintedStyle` on the smoke host, `theme` capability, two scenarios; **14/14 green on this host**, exit `0`; the shell is on `@gpuixui/tokens` (§8 records both two-direction proofs) |
| [151](./151-playground-shell-navigation.md) | The playground shell navigates: a scrollable scenario list | B | 120, 140 | **landed**: `shell-navigation` mounts the real `App`; the sidebar is a scroll container |
| [152](./152-virtualized-table-probe.md) | The virtualized table probe (Tier 3 feasibility) | B→D | 130, 140, 151 | **landed**: `virtualized-table` — fixed cells in virtual rows, painted-row click, selection across scroll; `onVisibleRange` lags one gesture (§8) |
| [153](./153-tree-view-probe.md) | The tree-view probe (Tier 3 feasibility) | B→D | 130, 140, 152 | **landed**: `tree-view` — exact indentation, expand/collapse repaint, click-to-focus and arrow keys; no programmatic focus (§8) |
| [154](./154-log-viewer-probe.md) | The log-viewer probe (Tier 4 feasibility) | B→D | 130, 140, 152 | **landed**: `log-viewer` — starts at the tail, re-anchors on appends; `alignment`/`followTail` overlap and no snap-back after scroll (§8) |
| [155](./155-modal-focus-semantics.md) | Modal focus and nested-overlay semantics (Tier 2 feasibility) | B→C | 120, 140, 117 | **landed**: `modal-focus-trap` — focus entry/return via `renderer.focusElement`, the Tab trap wraps inside the surface, a nested popover's Escape closes only the popover; 19/19 green (§8) |
| [156](./156-floating-placement.md) | Floating-layer placement and collision (Tier 2 feasibility) | B→C | 120, 140, 155 | **landed**: `floating-placement` — `side`/`gap`/`align=start` are exact; **`align=center` is off by half the panel** and `fit=snap` clamps but does not flip; 20/20 green (§8) |

Cross-cutting records:

- `.agents/adr/0001-native-smoke-host.md` — the 0.10.0 binding gap and what it
  means for every `done` row (superseded in part).
- `.agents/adr/0002-two-gpuix-versions.md` — the library targets 0.10.0; 0.5.1
  is the newest version that runs on this Intel Mac, and the measured matrix of
  what it does and does not verify (focus and wheel scroll are the gaps).
- `.agents/adr/0003-darwin-x64-source-build.md` — the locally built
  `darwin-x64` 0.10.0 binding and the provenance of every `verified 0.10.0`
  verdict.

### Reference adoption (block `200–299`)

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| `200` | Adopt `base-gpui`'s compound-part API contract as the Tier 1–2 public API spec | A | `020`, `030`, `110–117` | planned |
| `201` | Adopt `base-gpui`'s runtime / context / parts state model as our state convention | B | `200`, `020` | planned |
| `202` | Reconcile `adabraka-ui`'s `ThemeTokens` with `@gpuixui/tokens` | B | `010–014`, `020` | planned |
| `203` | Adopt `adabraka-ui`'s GPUI limits map as `docs/gpuix-capabilities.md`, re-verified against GPUix 0.10.0 | A | `020`, `110` | **done** — `docs/gpuix-capabilities.md` records the published 0.10.0 surface row by row (verdict, evidence, workaround), plus the main-only features 0.10.0 does not ship; `packages/primitives/src/capabilities.test.ts` guards the rows (8 tests, both directions proven) |
| `204` | Adopt `adabraka-ui`'s workspace and data tiers for Tier 3–4 | A/D | `203`, `020` | planned |
| `205` | Implement the "not provided by GPUix" cluster | C/E | `200`, `201`, `203`, `030`, `110–117` | planned |
| `206` | Port **shadcn/ui's Message Scroller** behaviour — pinned follow, no yank, jump-to-latest, streaming rows | C | `200`, `201`, `203` | planned |
| `207` | Port **shadcn/ui's AI Elements `chat` + `message`** — conversation scaffold and message row (streaming, reasoning, tool calls, sources, retry) | C | `200`, `201`, `206` | planned |

> The `200` block was written by the reference-adoption executor on
> 2026-10-17 from `.agents/slop/reference-research.md`. The per-workstream plans
> (`010–019`, `020–040`, `051`, `100–130`, `410–412`) live on their own branches
> and are merged into `main` as each workstream completes; this index is the
> union.

## How to use a plan

1. Read it fully before starting. Do not skim the STOP conditions.
2. Work only inside your own worktree (`workspaces/<workstream>/`).
3. Run every command in the plan; a command that was not run did not pass.
4. On a STOP condition, stop and report with the evidence. Do not improvise a
   workaround that the plan did not authorise.
5. When done, update this table's status column and tick the matching task in
   `TODO.md`.
6. **Read `020-gpuix-runtime-capability.md` §3 before promising any component is
   verified.** The native runtime cannot run in this environment; the honest
   paths to verification are listed there.
