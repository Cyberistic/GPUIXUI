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
B1, so it is planned, not done.

### Reference adoption (block `200–299`)

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [200](./200-adopt-compound-part-api.md) | Adopt `base-gpui`'s compound-part API contract as the Tier 1–2 public API spec | A | `020`, `030`, `110–117` | **done** — components workstream |
| [201](./201-adopt-runtime-state-model.md) | Adopt `base-gpui`'s runtime / context / parts state model as our state convention | B | `200`, `020` | **components half done** — `core/runtime.ts` + test + doc §7 + ADR 0005; `packages/testing` helper pending |
| `202` | Reconcile `adabraka-ui`'s `ThemeTokens` with `@gpuixui/tokens` | B | `010–014`, `020` | planned |
| `203` | Adopt `adabraka-ui`'s GPUI limits map as `docs/gpuix-capabilities.md`, re-verified against GPUix 0.10.0 | A | `020`, `110` | planned |
| `204` | Adopt `adabraka-ui`'s workspace and data tiers for Tier 3–4 | A/D | `203`, `020` | planned |
| `205` | Implement the "not provided by GPUix" cluster | C/E | `200`, `201`, `203`, `030`, `110–117` | planned |
| `206` | Port **shadcn/ui's Message Scroller** behaviour — pinned follow, no yank, jump-to-latest, streaming rows | C | `200`, `201`, `203` | done — 11 rule + 10 native tests + 1 theme-matrix case (behaviour 437, unit 296); plain scroll viewport recorded as the limitation; both-direction proof |
| `207` | Port **shadcn/ui's AI Elements `chat` + `message`** — conversation scaffold and message row (streaming, reasoning, tool calls, sources, retry) | C | `200`, `201`, `206` | planned |
| `433` | **Platform theme recipes** — reshape the Windows variant into XP (Luna) / 7 (Aero), and follow Omarchy's live system theme | E | `063`, `203`, `200` | planned |
| `434` | **Landing page** — a "Hunter License" identity over a stacked macOS / Windows / Linux hero, in the register of cap.so / klack | E | `063`, `433`, `423` | planned |
| `435a` | **Pele** (Obsidian's design system) — recon, licence, and an inventory diff | A | `203`, `200` | planned |
| `435b` | **Fumadocs Editor** — ship an MDX/rich-text editor as a component in the suite (not for authoring our docs) | C/E | `200`, `203` | planned |
| `435c` | **RTL** — logical placement, a direction token, mirrored directional icons, and an RTL docs toggle | C/D | `063`, `200` | planned |

> The `200` block was written by the reference-adoption executor on
> 2026-10-17 from `.agents/slop/reference-research.md`. The per-workstream plans
> (`010–019`, `020–040`, `051`, `100–130`, `410–412`) live on their own branches
> and are merged into `main` as each workstream completes; this index is the
> union.

### Docs site (block `400–499`)

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [436](./436-blocks-and-theme-editor.md) | **Blocks and the Theme Editor** — the two remaining shadcn surfaces (`/docs/blocks`, `/docs/themes`) | E | `524`, `063`, `200` | done — `/docs/blocks` index + login/settings recipes and the `/docs/themes` token editor, on `agent/blocks-theme-editor` |

> The earlier phase-E docs plans (`433` platform recipes, `434` landing, `435a–c`
> Pele / Editor / RTL) are listed in the reference-adoption table above; they
> share this block but were numbered before the docs-site section existed.

### Cross-cutting styling conformance

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [524](./524-shadcn-tailwind-conformance.md) | shadcn/Base UI conformance: Tailwind recipes → `StyleDesc`, with `cn` | infra | `020`, `200`, `201` | in progress |
| [525](./525-gpui-transform.md) | GPUI transform/scale: audit the 0xErwin1 branch, merge surface, licence, and the fork-or-fallback decision | infra (renderer) | `020`, `524`, `140` | research complete — **needs port**; optional patch ported and green (`patches/gpui/`), but the fork is still not distributable; fallback recommended until gate 2. Build plumbing: `538` |
| [537](./537-gpui-ce.md) | `gpui-ce`: capability delta, patch-vs-switch, and the integration verdict | infra (runtime) | `020`, `524`, `525` | research complete — **do not switch**; port binding-level patches, keep renderer features unsupported |
| [530](./530-gpuix-zindex.md) | `zIndex` in the GPUix binding: paint order and hit order | infra (runtime) | `140`, `529`, `524` | done — patch applied to the source-built `darwin-x64` binding; 27 Rust tests and 397 playground tests pass; transform/scale/rotate stay out of scope |
| [538](./538-transform-build-fork-source.md) | Transform build plumbing: fetch the GPUix Zed fork at the pin and apply the transform patch behind `GPUIX_TRANSFORM=1` | infra (renderer) | `525`, `530`, `140` | source integration done — fetch, patch apply and flag transitions proven without a build; transform-enabled build deliberately deferred |

## How to use a plan

1. Read it fully before starting. Do not skim the STOP conditions.
2. Work only inside your own worktree (`workspaces/<workstream>/`).
3. Run every command in the plan; a command that was not run did not pass.
4. On a STOP condition, stop and report with the evidence. Do not improvise a
   workaround that the plan did not authorise.
5. When done, update this table's status column and tick the matching task in
   `TODO.md`.
