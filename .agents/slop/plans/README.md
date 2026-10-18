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
| `300–399` | free — `300–303` are the components workstream's §9 part migrations |
| `400–499` | docs site |

## The plan set

Numbering is reserved per workstream so concurrent agents never collide:
`010–099` tokens and theming, `100–199` components, and whatever each other
workstream declares in its own section below.

### Components workstream (Tier 2 composition and feedback)

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [110](./110-package-components.md) | `packages/components`: package, boundaries, token/primitives contract, test harness | C | tokens, primitives | done — §7 amended for the local `Button`/`IconButton` stand-in |
| [111](./111-tier2-foundation-parts.md) | Foundation parts: Card, Badge, Avatar, Alert, EmptyState, List | C-1 | 110 | done — all six verified in the real renderer |
| [112](./112-tier2-overlays.md) | Overlays: Dialog, Confirmation dialog, Popover | C-2 | 110, 111 | done — probe answers in §1c; 25 native behaviour tests + 5 dismiss-stack logic tests |
| [113](./113-tier2-disclosure-navigation.md) | Disclosure and navigation: Tabs, Accordion, Collapsible, Breadcrumb, Pagination | C-3 | 110, 111 | done — 5 components, 33 native behaviour tests |
| [114](./114-tier2-menus.md) | Menus: Dropdown, Context, Command | C-4 | 110, 111, 112 | done — 3 menus, shared core, 23 native behaviour tests |
| [115](./115-tier2-feedback.md) | Feedback: Toast system (Effect) and inline validation | C-5 | 110, 111, 112 | done — store + provider/viewport + Field, 12 native behaviour tests |
| [116](./116-tier2-choice-inputs.md) | Choice inputs: Search input, Combobox (+ date picker delivered in 119) | C-6 | 110, 111, 114 | done — 16 native behaviour tests |
| [117](./117-tier2-verification.md) | Tier 2 verification, inventory sync check and completion gate | C/F | 110–116 | done — inventory check + 11-test theme matrix; gate green |
| [118](./118-single-writer-components.md) | B3 in the components worktree: two live writers, one tree | cross-cutting | — | resolved in this worktree; permanent `scripts/` fix pending |
| [119](./119-tier2-date-picker.md) | Date picker: the deferred Tier 2 item | C | 110, 112, 117 | done — 13 calendar tests + 9 native behaviour tests |
| [120](./120-list-multi-select.md) | List multiple selection + the duplicate inventory row | C/F | 111, 117 | done — 13 selection tests + 8 native behaviour tests; duplicate-row regression |
| [121](./121-accordion-keyboard.md) | Accordion header keyboard navigation | C/F | 111, 113 | done — 4 upsert tests + 4 native tests; both-direction proof |
| [122](./122-context-menu-keyboard.md) | Context menu keyboard opening and focus return | C/F | 112, 114 | done — 5 native tests; both-direction proof |
| [123](./123-toast-pause.md) | Toast pause on hover (timing adjustable) | C/F | 115, 117 | done — 3 store tests + 1 real-time native test; both-direction proof |
| [124](./124-toast-focus-hold.md) | Toast timers respect keyboard focus, not only the pointer | C/F | 115, 123 | done — 2 native tests (Toast: 10); both-direction proof |
| [125](./125-list-select-all.md) | List select-all (`Cmd`/`Ctrl`+`A`) | C/F | 111, 120, 117 | done — 3 selector tests + 2 native tests (List: 22); both-direction proof |
| [126](./126-menu-keyboard-open.md) | Dropdown menu keyboard opening lands on a row | C/F | 114, 117 | done — 4 native tests (DropdownMenu: 13); both-direction proof |
| [127](./127-date-picker-bounds-and-clear.md) | Date picker `min`/`max` bounds and a clear action | C/F | 119, 117 | done — 5 calendar tests + 5 native tests, plus the trigger-ref regression fix (3 native tests); behaviour 220 |
| [128](./128-ref-composition-sweep.md) | Compose the caller's ref on every part that owns one | C/F | 127, 117 | done — 5 native tests (behaviour 225); both-direction proof |
| [129](./129-menu-typeahead.md) | Menu type-ahead (`DropdownMenu`/`ContextMenu`) | C/F | 114, 126, 117 | done — 13 logic + 7 native tests (behaviour 232); both-direction proof |
| [130](./130-list-typeahead.md) | List type-ahead over the shared type-ahead core | C/F | 111, 125, 129 | done — 13 logic (moved) + 7 native tests (List 29, behaviour 239); both-direction proof |
| [131](./131-dropdown-submenus.md) | Dropdown menu submenus | C/F | 114, 122, 126, 129, 112 | done — 3 parts, 11 native tests (DropdownMenu 32, behaviour 250); both-direction proof |
| [132](./132-time-picker.md) | Time picker: the time half of "date/time pickers" | C/F | 110, 117, 119 | done — 12 logic + 8 native tests + 1 theme-matrix row (behaviour 259); both-direction proof |
| [133](./133-command-menu-fuzzy.md) | Command menu fuzzy matching and in-group ranking | C/F | 114, 129, 117 | done — 12 logic + 4 native tests (CommandMenu 12, behaviour 263); both-direction proof |
| [134](./134-list-activation.md) | List row activation on Enter and click | C/F | 111, 120, 125, 130, 117 | done — 6 native tests (List 36, behaviour 269); both-direction proof; double-click probe documented |
| [135](./135-submenu-pointer-activation.md) | Submenu pointer activation and ContextMenu submenus | C/F | 112, 114, 131, 134 | done — shared `menu/sub.tsx`, 5 native tests (ContextMenu 17, DropdownMenu 33, behaviour 274); both-direction proof |
| [136](./136-prop-forwarding-sweep.md) | SearchInput ref and TabsTrigger onBlur forwarding | C/F | 113, 116, 128, 134 | done — 2 native tests (SearchInput 7, Tabs 10, behaviour 276); both-direction proof |
| [137](./137-list-item-click-forwarding.md) | ListItem's caller onClick | C/F | 111, 134, 136 | done — 1 native test (List 37, behaviour 277); both-direction proof |
| [138](./138-combobox-pointer-coverage.md) | Combobox pointer selection coverage | C/F | 116, 117, 134 | done — 3 native tests (Combobox 13, behaviour 280); liveness proof |
| [139](./139-inventory-test-counts.md) | Inventory test counts, and the rows that drifted | C/F | 117, 128, 134 | done — +1 inventory check (unit 224); 3 counts + Cards row corrected; both-direction proof |
| [157](./157-components-consume-token-helpers.md) | `@gpuixui/components` consumes the token helpers instead of copying them | F | 014, 016, 017, 018 | done — theme test fails against the old `accent` tone; behaviour 280 green |
| [158](./158-alert-parts.md) | Alert becomes a compound part (the first contract migration) | F | 200, 157 | done — 11 native tests; both-direction proof (281 behaviour tests) |
| [200](./200-adopt-compound-part-api.md) | Adopt `base-gpui`'s compound-part API contract as the Tier 1–2 public API spec | A | 020, 030, 110–117 | done — `docs/component-api.md` + ADR 0004 + `LICENSES/base-gpui.md`; contract test proven in both directions |
| [300](./300-pagination-parts.md) | Pagination becomes a compound part | F | 200, 201 | done — the `docs/component-api.md` §9 deviation |
| [301](./301-command-menu-parts.md) | CommandMenu becomes a compound part | F | 200, 201, 114, 133 | done — the `docs/component-api.md` §9 deviation |
| [302](./302-combobox-parts.md) | Combobox becomes a compound part | F | 200, 201, 116, 138 | done — the `docs/component-api.md` §9 deviation |
| [303](./303-date-time-picker-parts.md) | DatePicker and TimePicker become compound parts | F | 200, 201, 119, 127, 132 | done — the §9 deviation; formalises the TimePicker field shape |
| [304](./304-typed-by-position-children.md) | Typed-by-position children: the render check and the measured compile-time limit | F | 200, 201, 158, 300–303 | done — 32 family-scoped checks across 19 modules, `PartChildren` narrowing, 6 unit + 7 native tests (behaviour 298); part identity is not expressible in React 19's JSX types |
| [305](./305-state-aware-style.md) | State-aware `style` on interactive parts | F | 200, 201, 304 | done — 11 parts use the runtime's `StateStyle`/`resolveStyle`, 11 native tests (behaviour 309); button-shaped triggers recorded out of scope until primitives owns the button |
| [306](./306-fieldset.md) | Fieldset: a named group of fields, with disabled propagation to `FieldInput` | C | 200, 201, 115, 205 | done — 7 native tests + 1 Field regression; both-direction proof (behaviour 317) |
| [307](./307-stepper.md) | Stepper: a read-only multi-step progress indicator | C | 200, 201, 205, 306 | done — 8 native tests; both-direction proof (behaviour 325) |
| [308](./308-form.md) | Form: validation orchestration and the submit lifecycle | C | 200, 201, 115, 205, 306 | done — 7 native tests; both-direction proof (behaviour 332) |
| [309](./309-drawer.md) | Drawer: an edge-anchored modal panel over the shared modal hooks | C | 200, 201, 205, 112 | done — 10 native tests; Dialog's 18 re-pass after the extraction |
| [310](./310-keyboard-shortcuts.md) | Keyboard shortcuts and keycaps, plus the shared accelerator model | C | 200, 201, 205, 111 | done — 10 accelerator tests + 6 native tests, both-direction proof (behaviour 338) |
| [311](./311-timeline.md) | Timeline: an event rail with derived last-item context | C | 200, 201, 205 | done — 6 native tests; both-direction proof |
| [312](./312-countdown.md) | Countdown: a remaining-time display whose clock is the app's | C | 200, 201, 205 | done — 9 logic + 5 native tests |
| [313](./313-inline-edit.md) | Inline edit: rename in place with a commit/cancel contract | C | 200, 201, 115 | done — 8 native tests; both-direction proof |
| [314](./314-tag-input.md) | Tag / token input over a pure add/remove rule set | C | 200, 201, 205 | done — 10 rule + 8 native tests; both-direction proof |
| [315](./315-carousel.md) | Carousel: discrete slide stepping (no transform in 0.10.0) | C | 200, 201, 205 | done — 8 native tests; both-direction proof |
| [316](./316-hotkey-recorder.md) | Hotkey recorder over the shared accelerator model | C | 200, 201, 310 | done — 8 capture + 8 native tests; both-direction proof |
| [317](./317-preview-card.md) | Preview card: hover/focus preview on the anchored layer | C | 200, 201, 112, 114 | done — 8 native tests; delay + pointer-travel + Escape proven |
| [318](./318-color-picker.md) | Color picker: discrete swatches and HEX (no gradients in 0.10.0) | C | 200, 201, 205 | done — 8 hex + 8 native tests; both-direction proof |
| [319](./319-mention-input.md) | Mention input: ranked `@` suggestions over an anchored list | C | 200, 201, 116, 112 | done — 12 rule + 9 native tests; both-direction proof |
| [320](./320-navigation-menu.md) | Navigation menu: one open panel, roving triggers | C | 200, 201, 112, 114, 113 | done — 6 parts, 10 native tests; both-direction proof |
| [321](./321-tabs-vertical-orientation.md) | Tabs vertical orientation: prove the axis, then show it | C/F | 113, 117 | done — 4 native tests (Tabs 14, behaviour 441), a vertical example, docs/inventory sync; both-direction proof |
| [322](./322-toast-action.md) | Toast actions: one labelled action per toast, provider-owned handler | C/F | 115, 123, 124 | done — 3 unit + 4 native tests (unit 299, Toast 14, behaviour 445), undo example and docs |
| [323](./323-floating-placement.md) | Floating placement truth: centre alignment and a real near-edge flip | C/F | 112, 114, 116, 117, 156 | done — measured `align="center"` corrects from `start` + the trigger/surface difference, and a snapped surface flips off its trigger for Popover, Dropdown menu and Combobox; +6 native tests (Popover 12, Dropdown 35, Combobox 17), both-direction proof |

Interlocks this workstream depends on and does not own:

- `@gpuixui/primitives` exports listed in plan 110 §7;
- `apps/playground` mounting the Tier 2 examples (recorded as a TODO task);
- a decision on the GPUix version: 0.10.0 is the latest published release and is
  behind the reference clone, so it ships no `Dialog`, `Button` or
  `DismissableLayer` (evidence in `TODO.md` → Blockers).
- **B3 — one writer per tree:** resolved in this worktree 2026-10-17 08:56 — the
  stale turn committed and stood down, and the count has read `1` since. The
  permanent fix (pinned `--session`, session counting in `agent_alive`) is still
  plan `022` §5 / plan `118` §4, owner `scripts/`.

**Foundation parts are done**, which unblocks C-2 onwards. The behaviour suites run
here because plan 140's locally built `darwin-x64` binding is in the store, so the
component side is no longer waiting on primitives:

### `primitives`, `icons` and Tier 1 (block `020–049`)

Owns `packages/primitives`, `packages/icons` and the Tier 1 rows. The table is
the authority on order; the file names carry the detail.

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [020](./020-gpuix-runtime-capability.md) | GPUix runtime capability map and verification strategy | A | — | done (recon) — runtime verification is unblocked by plan 140 |
| [021](./021-primitives-consume-tokens.md) | `packages/primitives` consumes `@gpuixui/tokens` directly | B | 016, 017, 018, 030 | done — `Theme` re-exported; `focusRing`/`elevationShadow` replace the local copies |
| [022](./022-swarm-single-writer.md) | One writer per worktree — the swarm is running duplicate agents | infra | — | **BLOCKER B3 — read §3 before writing anything** |
| [023](./023-primitives-alpha-from-tokens.md) | `alpha` comes from `@gpuixui/tokens` | B | 014, 021 | done — the local copy is deleted; `core/index.ts` re-exports the tokens helper |
| [024](./024-icons-size-scale-from-tokens.md) | `packages/icons` takes its size scale from tokens | B | 021, 031 | done — `ICON_SIZES` is tokens' `iconSize` |
| [025](./025-fields-disabled.md) | A real disabled state for `Input`/`TextArea` | C | 030, 041, 046 | done — read-only + tab-order + handler guards |
| [030](./030-primitives-package.md) | `packages/primitives` — render primitives + Tier 1 components | B/C | 020 | implemented — all 19 Tier 1 components + `core/`; docs-site pages pending |
| [031](./031-icons-package.md) | `packages/icons` — icon set, sizing, accessibility | B | 020 | done — 47 icons, both-direction tests |
| [040](./040-phase-c-tier1.md) | Phase C: Tier 1 foundational components | C | 030, 031 | done in-package — docs-site pages pending |
| [041](./041-tier1-runtime-verification.md) | Tier 1 in the real GPUix runtime | C | 030, 031, 040, 140 | done — 46 runtime tests |
| [042](./042-tier1-theme-verification.md) | Tier 1 in both themes, and a live theme switch | C | 030, 040, 041 | done — 5 runtime tests |
| [043](./043-presentational-testid.md) | `testId` parity for the presentational primitives | C | 030, 041 | done |
| [044](./044-radio-skip-disabled.md) | A radio group must skip disabled options | C | 030, 041 | done |
| [045](./045-labelledby-prop.md) | `labelledBy` must return the prop the controls read | C | 030, 040 | done |
| [046](./046-textarea-no-submit.md) | `TextArea` must not accept `onSubmit` | C | 030, 040, 041 | done |
| [047](./047-tier1-docs-and-examples.md) | Tier 1 docs pages and runnable examples | C | 030, 031, 040, 041 | done |
| [048](./048-tier1-fixable-limitations.md) | Three fixable Tier 1 limitations | C | 030, 040, 041, 047 | done |
| [049](./049-radio-group-focus-contract.md) | The radio group's focus contract, and a `Switch` prop that did nothing | C | 030, 040, 041, 044, 048 | done |
| [053](./053-value-controls.md) | Value controls: `Slider`, `RangeSlider`, `Meter` | C | 030, 040, 041, 047, 049 | done |
| [054](./054-remaining-tier1-controls.md) | The remaining Tier 1 rows: `NumberField`, `OTPField`, `Toggle`, `Rating` | C | 053 | done (implementation) |
| [055](./055-tier1-theme-axes.md) | Tier 1 under high contrast, density and platform type | F | 030, 041, 042, 051 | done — 4 runtime tests |

Cross-cutting records: `.agents/adr/0001-native-smoke-host.md` (the 0.10.0
binding gap), `0002-two-gpuix-versions.md` (the 0.5.1 legacy probe),
`0003-darwin-x64-source-build.md` (the locally built binding and the provenance
of every `verified 0.10.0` verdict).

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
playground shell and the feasibility probes. `100–199` is **full**; the next
playground plans take the free numbers above the components (`300–324`) and
tokens-theme (`300–328`) reservations — `330` and `331` are landed and `332` is
the next free number.

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
| [157](./157-motion-collapse.md) | Native motion: the collapsible sidebar and the exit tween | B→C/D | 110, 120, 140 | **landed**: `motion-collapse` — the paused motion clock makes a width tween exact (96 px of 240 at 80 ms), the inner pane does not reflow, `AnimatePresence` retains the exit child; `onMotionComplete` needs `dispatchNativeEvents`; **21/21** green (§8) |
| [158](./158-roving-focus.md) | Roving focus: a list and a virtual list | B→C/D | 110, 140, 152, 155 | **landed**: `roving-focus` — programmatic focus reaches a never-clicked row and the next key lands there; inside `<virtual-list>` focus survives the window scrolling past it; a focused off-window row stays in `getPaintedText()`; **22/22** green (§8) |
| [159](./159-native-popups.md) | Native popups: `Select`, `Combobox` and `Tooltip` | B→C | 100, 110, 120, 140 | **landed**: `select-choose`, `combobox-filter`, `tooltip-open` — all three published popups work and are now `verified` (25/25); adds the `hover` host call and records the `ComboboxList` function-child trap (§8) |
| [160](./160-native-a11y-tree.md) | The accessibility tree in the real runtime | B→C/D | 100, 110, 120, 140 | **landed**: `a11y-tree` — roles map; names are **not** derived from text; CheckBox/Switch expose no checked state; the tree follows the painted virtual window; 26/26 green (§8) |
| [161](./161-native-content-surfaces.md) | Native content surfaces: `<svg>`, `<img>`, `<diff>` and the `<canvas>` trap | B→C/E | 100, 110, 120, 140 | **landed**: `native-surfaces` — svg/img/diff are retained and painted; **`<canvas>` is retained as a node but renders `gpui::Empty`** (no bounds, children dropped from paint); a corrupt PNG is indistinguishable without pixels; 27/27 green (§8) |
| [162](./162-drag-targets.md) | Cross-element drag targets and file drops | B→D/E | 100, 110, 120, 140 | **landed**: `drag-targets` — capture keeps moves and up on the source; **hover is frozen during the drag** and settles after release; the gesture ends in a click on the source; a drop on an element without a handler emits **no drop but a click**; 28/28 green (§8) |
| [163](./163-text-selection.md) | Native text selection and copy | B→D/E | 100, 110, 120, 140, 161 | **landed**: `text-selection` — cross-element selection joins with newlines; `<code>`/`<diff>` copy is chrome-free; an anchor inside `userSelect: "none"` selects **nothing**, a cross-selection skips it; 29/29 green (§8) |
| [164](./164-native-context-menus.md) | Native context menus: right click, pointer placement and dismissal | B→C/D | 100, 110, 120, 140, 155, 156, 162 | **landed**: `context-menu-pointer` — right click is `onAuxClick` + `isRightClick` (no `button`, no `onClick`), a pointer-positioned `<anchored>` is exact even inside a **scrolled** container (no offset, no clipping), `shift-f10` arrives as `key=f10` and focus returns; 30/30 green (§8) |
| [165](./165-virtualized-tree.md) | A virtualized tree (file tree / hierarchical data) | B→D/E | 152, 153, 158 | **landed**: `virtualized-tree` — a flattened 8×40 tree inside `<virtual-list>`: 16 px indentation per depth survives virtualization, expand/collapse (8 ↔ 48 rows) repaints the window, clicks and arrows move **native focus** by roving index, an off-window focused row stays painted and still receives the next key; 31/31 green (§8) |
| [166](./166-scroll-into-view.md) | Scroll a virtual row into view | B→D | 152, 158, 165 | **landed**: `scroll-into-view` — `focusElement` alone reveals a virtual row; `scrollToItem(list, 120)` anchors `[120, 0, 280]` and `scrollIntoView(row 10)` anchors `[10, 0, 280]` exactly; **`getScrollOffset` saturates** (`-1320` at row 199) so persistence must read `getListScrollTop`; focus survives a scroll; 32/32 green (§8) |
| [167](./167-workspace-restore.md) | Workspace state restore: panels, tabs and a virtual-list anchor | B→D | 152, 164, 166 | **landed**: `workspace-restore` — a keyed remount loses the workspace, app-owned JSON restores split, tab order, active tab and the virtual-list anchor **exactly** (`scrollToItem(list, 120, 16)` → anchor index 120, offset 16), native focus is not restored and the restored list accepts input; 33/33 green (§8) |
| [168](./168-native-primitives.md) | The shipped Tier 1 components in the native smoke suite | B | 100, 110, 120, 140, 150, 159, 160 | **landed**: `primitives-actions`, `primitives-fields`, `primitives-display` mount `@gpuixui/primitives` (Button, Toggle, Input, Checkbox, Switch, Select, Slider, Progress, Meter, Skeleton, Tooltip) through the tokens theme; new `components` capability, a focus ring that the component merges/drops, click + Enter-down + Space-up, `aria-valuetext` state; `SmokeHost` gains `keyDown`/`keyUp`; 36/36 green (§8) |
| [169](./169-primitives-advanced.md) | The remaining Tier 1 controls in the native smoke suite | B→C | 100, 110, 120, 140, 168 | **landed**: `primitives-choice` (RadioGroup click/arrows/wrap, Rating clamp/End/Delete) and `primitives-entry` (NumberField step/clamp on commit, OTP fill/advance/one-character Backspace/Left); 38/38 green (§8) |
| [170](./170-platform-styles-native.md) | The platform styles in the native runtime | B→F | 100, 110, 120, 140, 150, 051 | **landed**: `theme-platform` cycles Default/macOS/Linux/Windows — the mono family paints `Menlo` / `Menlo` / `DejaVu Sans Mono` / `Consolas`, `sans` stays `.SystemUIFont`, colours do not move; 39/39 green (§8) |
| [171](./171-native-search-highlights.md) | Native search highlights: the find-bar contract | B→D/E | 100, 110, 120, 140, 150, 154, 160, 166 | **landed**: `search-highlights` — washes paint in window coordinates, `onHighlight` counts through `dispatchNativeEvents`, nested declarations win, whole-word/case/ranges/soft-wrap/surrogate behave as documented, `<code>` is query-only, and a virtual row's `matchIndexOffset` numbers matches document-wide; 41 checks, suite `39 → 40` (§8) |
| [172](./172-drag-autoscroll.md) | Drag edge auto-scroll and the reorder target | B→D/E | 100, 110, 120, 140, 162, 165 | **landed**: `drag-autoscroll` — the runtime does **not** scroll a held drag at an edge; a component-owned `scrollTo` loop scrolls one row per held move and keeps the capture, the `up` and the gesture-ending click; the drop index follows the live offset; moves go to the pressed element, not its container; 17 checks, suite `40 → 41` (§8) |
| [173](./173-horizontal-scroll.md) | Horizontal scroll, tab-strip overflow and active-tab reveal | B→C/D | 100, 110, 120, 140, 158, 166, 167 | **landed**: `tab-strip-overflow` — `overflowX: "scroll"` pans (`deltaX -240 → x -240`), a vertical wheel leaves a horizontal-only strip alone, a clipped tab **keeps painted bounds**, `scrollIntoView` reveals it and saturates (−461), the near-end reveal stops at `x = -5` (clamp it yourself), `scrollTo` is exact; 29 checks, suite `41 → 42` (§8) |
| [174](./174-tab-strip-focus.md) | The tab strip's focus contract: clipped stops and the roving index | B→C | 100, 110, 120, 140, 158, 160, 173 | **landed**: `tab-strip-focus` — a clipped tab **is** a tab stop (nine Tabs reach `naive-9`) and focus does **not** reveal it in a plain scroller (`x` stayed `0`), unlike a virtual row; a roving strip is exactly one stop; End/Home move selection, native focus and reveal together (`-461` / `-5`); 19 checks, suite `42 → 43` (§8) |
| [175](./175-nested-panels.md) | Nested panels: the vertical split, isolation and the collapsible sidebar | B→D | 100, 110, 120, 140, 157 | **landed**: `panel-nested` — `dy` drives a vertical split (`180 → 228` painted), a nested `dx` drag (`300 → 360`) leaves its parent at `228`, a collapsed sidebar paints `0` with no residue, arrows resize the focused divider by 16 px, and the divider reports as `Splitter` with `aria-valuetext`; the reverse traversal edge does not re-enter the nested divider (§8); 32 checks, suite `43 → 44` |
| [176](./176-command-palette.md) | The command palette: window shortcuts, a non-modal overlay and a filtered list | B→D | 100, 110, 120, 140, 155, 158, 159, 164 | **landed**: `command-palette` — a window shortcut opens a non-modal overlay; letters/arrows/Escape reach both the field and the app-level handler while **Enter and Backspace do not**; `cmd-k` does not type; arrows move a visual row while focus stays in the input; `onSubmit` commits and returns focus; the scrim is a hit-testable sibling under the surface; application menus are in-window only (no menu API in 0.10.0); 58 checks, suite `44 → 45`; three two-direction proofs (§8) |
| [177](./177-workspace-panes.md) | Tabbed panes: hide vs unmount, focus across panes, nested scrolling and a resized list | B→D | 100, 110, 120, 140, 152, 158, 166, 167, 175 | **landed**: `workspace-panes` — **`display: "none"` is a no-op in 0.10.0** (source + measurement), so panes overlap absolutely and hide with `visibility: "hidden"`; a hidden pane keeps its draft, pick and virtual-list anchor and leaves the tab order; a nested scroller **chains** the wheel to its ancestor unless `pointerEvents: "auto"` guards it; a resized pane re-windows its list (5 → 2 painted rows at 240 → 180) and keeps the anchor; 29 checks, suite `45 → 46`; three two-direction proofs (§8) |
| [178](./178-shared-native-host.md) | Hoist the native renderer adapter into `@gpuixui/testing` | B | 100, 120, 140 | **landed**: `Native.createHost` + the structural `NativeRenderer` port and the shared lookups live in the package; `apps/playground`'s `host.ts` is deleted; 18 adapter tests with four mutation proofs; the native suite stays 46/46 (§7) |
| [179](./179-terminal-feasibility.md) | Tier 4 feasibility: a terminal surface | B→D | 100, 110, 120, 140, 154, 176 | **landed**: `terminal-grid` — a click natively focuses the `div` surface (even without `tabIndex`), printable keys reach `onKeyDown`, Enter/Up/Backspace/Escape and `ctrl-c` (`modifiers.ctrl`) are delivered, 18 px rows align at equal widths in the mono family, per-run colour carries `destructive`/`success`, a 200-line scrollback starts at the tail and the sibling prompt keeps focus across jumps; **no PTY/process API** in 0.10.0; 27 checks, suite `46 → 47` (§8) |
| [180](./180-chart-feasibility.md) | Tier 3 feasibility: a chart surface | B→D | 100, 110, 120, 140, 160, 161 | **landed**: `chart-svg` — bars from `div`s keep exact geometry, token colour and hit-testing; a sourced `<svg>` is an **alpha mask tinted by one `color`** (one layer per series), SVG-internal text is painted but absent from `getPaintedText`/a11y, `<svg>` children are retained and unpainted; an `<img>` SVG data URL is the **full-colour** path (linear + radial gradient and two fills); 52 checks, suite `47 → 48` (§8) |
| [181](./181-markdown-feasibility.md) | Tier 5 feasibility: a markdown surface | B→D | 100, 110, 120, 140, 160, 163 | **landed**: `markdown-surface` — GFM blocks (heading, list, table, fenced code with highlighting) paint as addressable text, a crossing drag copies the document, a coordinate click fires `onLinkClick` with the URL, React children are retained but unpainted, and `role="article"` is one named AccessKit region; 21 checks, suite `48 → 49` (§8) |
| [182](./182-shell-selection.md) | The playground shell selects, repaints and answers keys | B | 120, 140, 150, 151, 170 | **landed**: `shell-selection` — selecting an entry mounts that scenario's real view and paints its active state; Enter (down) and Space (up) switch entries through the shipped `decideActivation`; the palette switch repaints the shell and keeps the selection. Exposed and fixed a **harness state leak**: consecutive `<App>` scenarios shared Shell state and the sidebar scroll offset, so every scenario now mounts under a `Fragment` keyed by id; 17 checks, suite `49 → 50` (§7) |
| [183](./183-toast-feasibility.md) | Tier 2 feasibility: a toast viewport in the real runtime | B→C/D | 100, 110, 120, 140, 155, 156, 157, 159, 177, 182 | **landed**: `toast-lifecycle` — `right`/`bottom` resolve exactly (24 px insets), the bottom-anchored stack grows upward, the viewport's `pointerEvents: "none"` lets a page control under its strip take the click while a painted card is hit without `auto`, paint order covers the app (`behind=0`), `role="status"` is an AccessKit `Status` and dismiss is a `Button`, a toast does not steal focus and its dismiss is one Tab away, and a per-toast JS timer dismisses only its own card through a frozen exit. Six two-direction proofs, including `right`→`left`, `none`→`auto` and the removed role; 55 checks, suite `50 → 51` (§7) |
| [184](./184-docking-layout.md) | Tier 4 feasibility: a docking layout with edge drop zones and restore | D | 100, 110, 120, 140, 155, 162, 165, 167, 173, 175, 177, 182 | **landed**: `docking-layout` — the surface rectangle is read from component code (`ref` + `renderer.getElementBounds`) and every model-derived pane box matches the runtime; a pixel-exact drop bar inside a nested `position: "relative"` pane; a captured tab drag survives indicator re-renders; an edge drop splits the target, a centre drop merges; an emptied group is pruned and its split collapses; every split must be `key`ed by node id or a reparented split keeps the wrong size; a recursive layout with nested sizes restores exactly through a keyed remount; AccessKit exposes `Region`/`TabList`/`TabPanel`/`Tab`/`Splitter`. 80 checks, suite `51 → 52`, four two-direction proofs (§7) |
| [185](./185-pinned-grid-chrome.md) | Tier 3 feasibility: pinned grid chrome and column windowing | B→D | 100, 110, 120, 140, 152, 166, 173, 174 | **landed**: `grid-wide-table` — **`position: "sticky"` is ignored** (a sticky header scrolls exactly with its content), so a grid derives its header and frozen column from one scroll source (`renderer.getScrollOffset`); the header/body cells and pinned/body rows align within 1 px under a wheel pan; only the visible columns are in the tree (`0` absent at `x=-360`, `20` absent at `x=0`, `20` painted at `x=-1700`) and rows window the same way (`row 0` absent at `y=-280`, `row 39` painted at the bottom); six Rights reach column 7, focus follows, and the component pans to `-260` to reveal it; `gridcell` maps to AccessKit `GridCell` with `aria-selected`. 57 checks, suite `52 → 53`, four runtime two-direction proofs plus a clamp-unit mutation (§8) |
| [186](./186-collapsible-height.md) | Tier 2 feasibility: collapsible height motion, natural measurement and state | B→C/D | 100, 110, 120, 140, 157, 177 | **landed**: `collapsible-height` — **`onLayout` does not exist**; the route is `ref` + `renderer.getElementBounds`, and it works at **first layout while the body is clipped to `height: 0`** (`mounted=140`), so a `defaultOpen` section can animate on its first open. `motion.div` height interpolates exactly (56 px at 80 ms of a 200 ms 140 px tween); the clip is load-bearing for **input** (the collapsed button refuses a click, and removing `overflow: hidden` lets it through) with no `pointerEvents` guard; content stays mounted so a typed draft survives collapse/re-open; `onMotionComplete` fires once per tween. 32 checks, suite `53 → 54`, five mutation proofs (M1–M5, §10) |
| [187](./187-nested-layer-dismiss.md) | Tier 2 feasibility: nested overlay layers, payload identity and the dismiss stack | B→C | 100, 110, 120, 140, 155, 156, 164 | **landed**: `nested-layer-dismiss` — the runtime delivers **a separate payload copy per handler** (`keyHandlers=2`, `keyObjects=2`), so `dismiss-layer.ts`'s `WeakSet<EventPayload>` premise is false and one Escape closed **both** layers; the field claim from `event-claim.ts` closes exactly one. A press inside the submenu fires the **parent** surface's `onMouseDownOutside` (`outsideParent=1`, `outsideSub=0`) with `x`/`y` present, so `insideSurface`'s containment branch is real and load-bearing (`subClicks=1` with it, `0` without); a row-derived `<anchored position>` is exact (±1 px); a raw `<anchored side/align>` anchors to the **parent**, not the trigger. 29 checks, suite `54 → 55`, four mutation proofs (§9) |
| [188](./188-text-entry-contract.md) | The native text-entry contract: caret, selection, masking, placeholder and autosize | B→C | 100, 110, 120, 140, 160 | **landed**: `text-entry` — caret keys, `shift-arrow` selection, `cmd-a`, Backspace and empty-field safety all work natively; `readOnly` is native-enforced (no change event); the placeholder paints and stops painting on text; a fixed-width field **clips** (`158` px before/after 40 characters); `minRows`/`maxRows` autosize exactly (`64 → 116 → 168` px, then clamped). **No masked entry exists**: a typed secret is held, announced and painted in clear, so a `PasswordInput` must not be shipped. The a11y `value` is the **authored prop**, not the live editor (an uncontrolled field reports none). 56 checks, suite `55 → 56`, nine mutation proofs (§9) |
| [189](./189-real-window-smoke.md) | The real-window smoke run: the playground driven through the automation API | B→F | 100, 110, 120, 140, 188 | **landed**: `smoke:live` opens a real 1100×720 window, mounts the shipped `App` and drives it with `@gpuix/native/automation` — `live-shell` (bounds, click and Enter navigation), `live-input` (typing → `onChange`, Enter → `onSubmit`), `live-scroll` (wheel → offset, `onScroll` delta), `live-panel` (a paced divider drag resizes the split `320 → 400`) `live-overlay` (a modal opens centred, Escape closes it) `live-docking` (dragging a tab onto a pane edge splits it) `live-primitives` (the **shipped** Button activates, a disabled one refuses, the Toggle reports pressed) and `live-table` (a virtual row is hit-testable, the list scrolls, selection survives); 8/8 green, exit `0`, real screenshots. The window needs `createRenderer()` (a bare `GpuixRenderer` gets no input) and a settle/`waitFor` per step — the protocol has no frame boundary, and a drag sent back to back is ignored; no window is exit `2`. Colour/a11y/style stay `TestRenderer`-only (§9) |
| [190](./190-live-focus.md) | Focus in a real window: the live host reads the renderer's focus | B→F | 100, 155, 176, 182, 189 | **landed**: `AsyncSmokeHost.focused` over `renderer.getFocusedElementId`, a pure tree→`testId` lookup, and `live-focus` — focus entry, the modal Tab/Shift-Tab trap and focus return, plus a nested popover's Escape, measured in a real window; 18 checks, live `8 → 9`, exit `0`; the trap and the return each fail `exit 1` when removed (§7) |
| [191](./191-live-selection.md) | Text selection in a real window | B→F | 100, 163, 189, 190 | **landed**: three async selection verbs, a pure drag-geometry helper and `live-selection` — a real drag copies three text nodes, a `userSelect: none` anchor selects nothing, a crossing drag skips the chrome, and `clearSelection`/a click empty it; 9 checks, live `9 → 10`, exit `0`; ending the drag inside the last line fails `exit 1` with the partial copy (§7) |
| [192](./192-live-motion.md) | Motion in a real window: the paused clock and a mid-tween frame | B→F | 100, 157, 186, 189, 190 | **landed**: `live-motion` — the paused clock collapses a 240 px sidebar to exactly 96 px at 80 ms of a 200 ms linear tween, the inner pane stays 240 px, `onMotionComplete` fires once per tween, and the `AnimatePresence` exit holds; 25 checks, live `10 → 11`, exit `0`; `fastForwardMotion(0)` fails `exit 1` with 0 px. **`onExitComplete` fires twice live** for one exit (headless: once), so handlers must be idempotent; live `bounds` now returns `null` for a removed element (§7) |
| [193](./193-live-context-menu.md) | The right click and a context menu in a real window | B→F | 100, 164, 187, 189, 190 | **landed**: `AsyncSmokeHost.rightClick` over `mouse.click(button: 2)` and `live-context-menu` — a right click opens at the pointer (1 px), a disabled row is inert, Copy closes, outside/Escape dismiss, a child click bubbles, and a scrolled-container right click keeps the placement with an item below the viewport still hittable; 31 checks, live `11 → 12`, exit `0`; sending button 0 fails `exit 1` (§7) |
| [194](./194-in-window-float.md) | Detachable tabs as in-window floating panels | B→D | 100, 110, 120, 140, 162, 164, 172, 177, 184 | **landed**: `float-tab` — a tab released outside the dock opens an absolute panel at the release point; it paints above the dock as the app root's last child and takes the overlap click, its title drags by the pointer delta and a component clamp pins it, it owns native focus and returns it on Escape, a drag back re-docks and prunes it, and the `{dock, float}` snapshot restores the exact position. 46 checks, suite `56 → 57`, exit `0`; three two-direction proofs (clamp, paint order, release point). Adds the `float` capability; limits: no drag preview, and a close control nested in the drag surface does not fire (§8) |
| [195](./195-live-float.md) | The in-window float in a real window | F | 100, 110, 140, 189, 190, 194 | **landed**: `live-float` — a paced drag tears the tab out and the panel lands within 1 px of the release point, the title delta is exact, its tab takes focus, Escape returns focus to the dock, and the close button drops a reopened tab. 28 checks, live `12 → 13`, exit `0`; the reverse (release inside the dock) fails `host waitFor float-window`, exit `1`. Caught a live-only race: the drag-ending click re-applied the pre-drag dock and resurrected the tab, fixed with a functional tab click (§7) |
| [196](./196-preview-card.md) | An interactive hover card: hover intent and a grace close | B→C | 100, 110, 120, 140, 156, 159 | **landed**: `preview-card` — the card enter arrives **before** the trigger leave, the leave has **no coordinates**, and enter/leave are **per element**, so an interactive card needs a delayed close that re-checks an `inside` ref at fire time and a handler on every hoverable child. A click runs and keeps it open, hover does not focus, a re-enter cancels. 18 checks, suite `57 → 58`, exit `0`; removing the fire-time check closes the card on arrival, exit `1` (§7) |
| [197](./197-live-observation-surface.md) | The renderer is the live observation surface (part 2): highlights and list anchors | F | 100, 110, 140, 171, 185, 189, 190 | **landed**: `AsyncSmokeHost` gains `highlights`/`scrollToItem`/`listScrollTop`; `live-highlights` proves four document washes, rects inside their line, clear/restore and document-wide match numbering after a row-90 jump; `live-table` proves `[0,0,258] → [120,0,258]`. Live `13 → 14`, exit `0`; both directions exit `1` (§11). Records the measured limits: the live tree has **no `style`** and `GpuixRenderer` **no a11y method** |
| [198](./198-variable-row-heights.md) | Variable row heights and expandable rows in a virtual list | D | 100, 110, 120, 140, 152, 165, 166, 186 | **landed**: `variable-rows` — 20/40/60 px rows stack exactly (y `0/20/60/120/140/180`), eight fill the 300 px viewport, a `60 → 120` expansion moves the rows below by exactly `+60` with the anchor still `[0,0,300]`, collapsing restores, `scrollToItem(30)` and `scrollIntoView(45)` stay exact, and a wheel's in-row offset stays inside its row. Suite `58 → 59`, exit `0`; expected `+40` fails `exit 1` (§7) |
| [199](./199-live-hover.md) | Hover in a real window: enter/leave and the grace close | F | 100, 110, 120, 140, 156, 159, 189, 196 | **landed**: `live-preview` — the first live `hover`; a real `mouse.move` opens the card, the pointer reaches its body, the fire-time check holds past the 200 ms close, a control clicks, leaving closes from the **last hovered child**, re-enter cancels and a final leave closes. Measured: the card enter + trigger leave arrive in **one React batch** live, so the log (not `prev`/`last`) is the order. Live `14 → 15`, exit `0`; skipping the body hover fails `exit 1` (§7) |
| [300](./300-message-scroller-feasibility.md) | Tier 3 feasibility: a message scroller — pin, no-yank, streaming and jump-to-latest | D | 100, 110, 120, 140, 152, 166, 183, 198, 206 | **landed**: `message-scroller` — `<virtual-list>` has **no `onScroll`**, and the `onVisibleRange` payload is a built-window range with overdraw that lags one gesture (`endIndex >= count` stayed pinned through a 400 px scroll up and yanked on the next append). The exact pin source is `renderer.getListScrollTop(id)` read inside the handler; a single 400 px wheel up unpins, an append while unpinned leaves the anchor untouched and counts unread, jump-to-latest re-pins, a streamed last row keeps the tail at the viewport bottom, a 10 px scroll stays inside the 24 px threshold, and a 3-row history has no affordance. 51 checks, suite `59 → 60`, exit `0`; the stale-payload mutation fails `exit 1`, and removing the growth effect fails `52,0 ≠ 52,20` (§8) |
| [301](./301-live-scroller.md) | The message scroller in a real window | F | 189, 190, 192, 197, 300 | **landed**: `live-scroller` reuses the headless view and asserts the full pin/no-yank/jump/stream path through the automation protocol (45 checks, live `15 → 16`, exit `0`); a no-op wheel fails `exit 1`. Also maps the protocol's `NotFound` for a retained-but-unpainted element to `bounds = null` (§7) |
| [302](./302-native-cost-model.md) | The native cost model: retained host nodes and the syntax cache | F | 100, 110, 120, 140, 152, 188, 198 | **landed**: `scale-cost` — a virtual list retains **3 host nodes per row** (2,000 rows = 6,012; 100 = 312; the delta is exactly 5,700) while painting ~15, a jump neither leaks nor recycles, two identical `<code>` blocks cost one miss + one hit, a **theme switch reparses nothing**, idle frames do nothing, and each source edit costs exactly one miss + one hit + one document. `SmokeHost` gains `retainedElements` and a schema-decoded `syntaxCache`; 36 checks, suite `60 → 61`, exit `0`; M1/M2/M3 fail in the documented direction (§6) |

| [330](./330-tier2-in-playground.md) | The shipped Tier 2 components in the playground | C/D | 100, 110, 120, 140, 155, 164, 183, 187, 189, 190, 193; `packages/components` | **landed** — `tier2-dialog` (24 checks), `tier2-menu` (18) and `tier2-toast` (21) mount the shipped `Dialog`/`ConfirmDialog`, `DropdownMenu`/`ContextMenu` and `ToastProvider`/`ToastViewport`; suite `61 → 64`, exit `0`, `tier2=verified`; three mutation proofs. Measured consumer-path facts: one root host element (a provider with sibling children paints nothing), the viewport insets **16** px (`spacing.xl`), oldest-above-newest stack, and the package must be compiled by the consumer because its tsconfig maps the JSX runtime to a `.d.ts` that `nub` cannot execute (§8) |
| [331](./331-live-tier2.md) | The shipped Tier 2 components in a real window | F | 189–193, 330 | **landed** — `live-tier2-dialog` (24 checks), `live-tier2-menu` (15) and `live-tier2-toast` (21) reuse the plan-330 views in the real 1100×720 window; live `16 → 19`, exit `0`; three live mutation proofs. The window confirms the dialog centre/2 px and Tab trap, native focus on the shipped menu surface, and the 16 px toast inset with a real 300 ms timer (§8) |
| [332](./332-shared-command-replay.md) | `@gpuixui/testing`: replay a component runtime without a renderer | B | 100, 201 | **landed** — `State.runCommands` folds a structural runtime's commands and returns the final state plus the query output; 5 tests (fold, one query on the final state, empty replay, untouched initial, a runtime with a private `run`); mutation proof in §8 |

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
| [200](./200-adopt-compound-part-api.md) | Adopt `base-gpui`'s compound-part API contract as the Tier 1–2 public API spec | A | `020`, `030`, `110–117` | **done** — components workstream |
| [201](./201-adopt-runtime-state-model.md) | Adopt `base-gpui`'s runtime / context / parts state model as our state convention | B | `200`, `020` | **done** — `core/runtime.ts` + test + doc §7 + ADR 0005 (components); the `packages/testing` replay helper is plan `332` |
| `202` | Reconcile `adabraka-ui`'s `ThemeTokens` with `@gpuixui/tokens` | B | `010–014`, `020` | planned |
| `203` | Adopt `adabraka-ui`'s GPUI limits map as `docs/gpuix-capabilities.md`, re-verified against GPUix 0.10.0 | A | `020`, `110` | planned |
| `204` | Adopt `adabraka-ui`'s workspace and data tiers for Tier 3–4 | A/D | `203`, `020` | planned |
| `205` | Implement the "not provided by GPUix" cluster | C/E | `200`, `201`, `203`, `030`, `110–117` | planned |
| `206` | Port **shadcn/ui's Message Scroller** behaviour — pinned follow, no yank, jump-to-latest, streaming rows | C | `200`, `201`, `203` | done — 11 rule + 10 native tests + 1 theme-matrix case (behaviour 437, unit 296); plain scroll viewport recorded as the limitation; both-direction proof |
| `207` | Port **shadcn/ui's AI Elements `chat` + `message`** — conversation scaffold and message row (streaming, reasoning, tool calls, sources, retry) | C | `200`, `201`, `206` | planned |
| `433` | **Platform theme recipes** — reshape the Windows variant into XP (Luna) / 7 (Aero), and follow Omarchy's live system theme | E | `063`, `203`, `200` | planned |
| `434` | **Landing page** — a "Hunter License" identity over a stacked macOS / Windows / Linux hero, in the register of cap.so / klack | E | `063`, `433`, `423` | planned |

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
