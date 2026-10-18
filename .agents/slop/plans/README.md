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

Numbering is per workstream. This index is the union of the workstreams' plans;
the `200` block is the reference-adoption and gap-sequencing set, the primitives
workstream owns `020–049`, the playground and components workstreams share
`100–199` (two plans collide on `110`; renumbering is tracked in `TODO.md`), and
the docs-site workstream owns `4xx`.

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
| [052](./052-register-font.md) | `registerFont`: the library's and a consumer's typefaces in the runtime | B | 011, 051 | planned — native proof unblocked (B1 fixed) |

Plans 010–019 are the `tokens-theme` workstream. They own `packages/tokens`,
`docs/tokens.md` and `docs/design-system.md`; every other plan belongs to the
agent that owns its paths. The block was full at 019 and 020–049 belongs to
primitives, icons and Phase C, so 051 takes the first free block — as the tokens
workstream's docs-layering plan (050) does. 052 is rescued from the abandoned
`agent/fonts` branch (`6fc7641`), with its step 1 answered from the pinned
runtime's source; its native proof is blocked by B1, so it is planned, not
done. — **B1 is fixed** (ADR 0003, plan `140`): 052's and 017's native proofs
are unblocked.

### `primitives` (block `020–049`)

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [020](020-gpuix-runtime-capability.md) | GPUix runtime capability map and verification strategy | A | — | done (recon); runtime proof now comes from plan 041 / 140 |
| [022](022-swarm-single-writer.md) | One writer per worktree — the swarm is running duplicate agents | infra | — | **BLOCKER B3 — read §3 before writing anything** |
| [021](021-primitives-consume-tokens.md) | `packages/primitives` consumes `@gpuixui/tokens` directly | B | 016, 017, 018, 030 | **done** — `Theme` re-exported as `PrimitiveTheme`; `focusRing`/`elevationShadow` replace the local copies; 165 offline tests and 68 runtime tests green (plan 055: 119 runtime tests) |
| [023](023-primitives-alpha-from-tokens.md) | `alpha` comes from `@gpuixui/tokens` | B | 014, 021 | **done** — the local copy and its test are deleted; `core/index.ts` re-exports the tokens helper (161 offline tests) |
| [024](024-icons-size-scale-from-tokens.md) | `packages/icons` takes its size scale from tokens | B | 021, 031 | **done** — `ICON_SIZES` is tokens' `iconSize`; the identity test is the guard (19 icons tests) |
| [025](025-fields-disabled.md) | A real disabled state for `Input`/`TextArea` | C | 030, 041, 046 | **done** — read-only + tab-order + handler guards; 3 offline and 2 runtime tests, both-direction proof on the handler guard |
| [030](030-primitives-package.md) | `packages/primitives` — render primitives + Tier 1 components | B/C | 020 | **implemented** — every Tier 1 component + `core/` + element-tree suites; docs pages and examples delivered by 047; read §9 (the §2.2/§3 file lists are superseded by the shipped tree) |
| [031](031-icons-package.md) | `packages/icons` — icon set, sizing, accessibility | B | 020 | **done** (47 icons, 18 tests proven in both directions; on-screen paint covered by 047's runtime suite) |
| [040](040-phase-c-tier1.md) | Phase C: Tier 1 foundational components (primitives workstream) | C | 030, 031 | **done** — every Tier 1 row has code, tests, a runtime proof, an in-package page, an example and an inventory row; the `apps/docs` pages are plans 422, 423 and 435 |
| [041](041-tier1-runtime-verification.md) | Tier 1 in the real GPUix runtime (primitives workstream) | C | 030, 031, 040, **140** | **done** — the baseline 46 `test:runtime` tests in `packages/primitives/runtime/` (icons included, §2.2); now 119 across 13 files after plans 049, 053–055; measured results and two-direction proofs in §9 |
| [042](042-tier1-theme-verification.md) | Tier 1 in both themes, and a live theme switch | C | 030, 040, 041 | **done** — 5 `test:runtime` tests incl. a repaint-on-switch proof; results in §8 |
| [043](043-presentational-testid.md) | `testId` parity for the presentational primitives | C | 030, 041 | **done** — `Text`/`Separator`/`Spacer` accept and forward it; both-direction proof in §6 |
| [044](044-radio-skip-disabled.md) | A radio group must skip disabled options | C | 030, 041 | **done** — `decideMove` takes an optional `isDisabled`; measured regression proof in §6 |
| [045](045-labelledby-prop.md) | `labelledBy` must return the prop the controls read | C | 030, 040 | **done** — returns `{ label }`; the old return type named nothing; measured proof in §6 |
| [046](046-textarea-no-submit.md) | `TextArea` must not accept `onSubmit` | C | 030, 040, 041 | **done** — the runtime trades the newline for a submit; measured probe in §6 |
| [047](047-tier1-docs-and-examples.md) | Tier 1 docs pages and runnable examples | C | 030, 031, 040, 041 | **done** — the primitives pages + the icons page, the composed examples, and a runtime run that mounts every example (§8) |
| [048](048-tier1-fixable-limitations.md) | Three fixable Tier 1 limitations | C | 030, 040, 041, 047 | **done** — named `ButtonGroup`, `ScrollArea` deltas, RadioGroup Home/End; measured both directions in §7 (63 runtime tests) |
| [049](049-radio-group-focus-contract.md) | The radio group's focus contract, and a Switch prop that did nothing | C | 030, 040, 041, 044, 048 | **done** — per-item ring, focus follows the selection, a derived roving index and `Switch.invalid`; six measured both-direction probes in §7 (68 runtime tests) |
| [053](053-value-controls.md) | Value controls: `Slider`, `RangeSlider`, `Meter` | C | 030, 040, 041, 047, 049 | **done** — one value-maths core, thumb geometry, element-tree and runtime suites, docs pages and a composed example; measured in §11 |
| [054](054-remaining-tier1-controls.md) | The remaining Tier 1 rows: `NumberField`, `OTPField`, `Toggle`, `Rating` | C | 053 | **done** — all four landed with docs, examples and runtime proofs; OTPField's key contract runs on key up and a real clipboard paste is documented as unverified (§9) |
| [055](055-tier1-theme-axes.md) | Tier 1 under the remaining theme axes: high contrast, density, platform type | F | 030, 041, 042, 051 | **done** — 4 runtime tests (13 files / 119), green in both directions; measured in §7 |

### `components` (block `100–199`)

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [110](./110-package-components.md) | `packages/components`: package, boundaries, token/primitives contract, test harness | C | tokens, primitives | done — §7 amended for the local `Button`/`IconButton` stand-in |
| [111](./111-tier2-foundation-parts.md) | Foundation parts: Card, Badge, Avatar, Alert, EmptyState, List | C-1 | 110 | done — all six verified in the real renderer |
| [112](./112-tier2-overlays.md) | Overlays: Dialog, Confirmation dialog, Popover | C-2 | 110, 111 | done — probe answers in §1c; 25 native behaviour tests + 5 dismiss-stack logic tests |
| [113](./113-tier2-disclosure-navigation.md) | Disclosure and navigation: Tabs, Accordion, Collapsible, Breadcrumb, Pagination | C-3 | 110, 111 | done — 5 components, 33 native behaviour tests |
| [114](./114-tier2-menus.md) | Menus: Dropdown, Context, Command | C-4 | 110, 111, 112 | done — 3 menus, shared core, 23 native behaviour tests |
| [115](./115-tier2-feedback.md) | Feedback: Toast system (Effect) and inline validation | C-5 | 110, 111, 112 | done — store + provider/viewport + Field, 12 native behaviour tests |
| [116](./116-tier2-choice-inputs.md) | Choice inputs: Search input, Combobox (+ deferred date picker design) | C-6 | 110, 111, 114 | done — 16 native behaviour tests; date picker deferred with a design |
| [117](./117-tier2-verification.md) | Tier 2 verification, inventory sync check and completion gate | C/F | 110–116 | done — inventory check + 11-test theme matrix; gate green |
| [118](./118-single-writer-components.md) | B3 in the components worktree: two live writers, one tree | cross-cutting | — | **blocker** — permanent fix is plan `022` §5 |
| [119](./119-tier2-date-picker.md) | Date picker: the deferred Tier 2 item | C | 110, 112, 117 | done — 13 calendar tests + 9 native behaviour tests |

The components workstream's external interlocks (primitives exports, the
playground mounting the Tier 2 examples, the published-version decision) are
tracked in its plans and `TODO.md`; the docs site consumes their in-package
pages, examples and prop types (plan `425`).

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
| `203` | Adopt `adabraka-ui`'s GPUI limits map as `docs/gpuix-capabilities.md`, re-verified against GPUix 0.10.0 | A | `020`, `110` | planned |
| `204` | Adopt `adabraka-ui`'s workspace and data tiers for Tier 3–4 | A/D | `203`, `020` | planned |
| `205` | Implement the "not provided by GPUix" cluster | C/E | `200`, `201`, `203`, `030`, `110–117` | planned |
| `206` | Port **shadcn/ui's Message Scroller** behaviour — pinned follow, no yank, jump-to-latest, streaming rows | C | `200`, `201`, `203` | planned |
| `207` | Port **shadcn/ui's AI Elements `chat` + `message`** — conversation scaffold and message row (streaming, reasoning, tool calls, sources, retry) | C | `200`, `201`, `206` | planned |
| `433` | **Platform theme recipes** — reshape the Windows variant into XP (Luna) / 7 (Aero), and follow Omarchy's live system theme | E | `063`, `203`, `200` | planned |
| `434` | **Landing page** — a "Hunter License" identity over a stacked macOS / Windows / Linux hero, in the register of cap.so / klack | E | `063`, `433`, `423` | planned (number collides with docs `434-platform-styled-previews`) |
| `435a` | **Pele** (Obsidian's design system) — recon, licence, and an inventory diff | A | `203`, `200` | planned |
| `435b` | **Fumadocs Editor** — ship an MDX/rich-text editor as a component in the suite (not for authoring our docs) | C/E | `200`, `203` | planned |
| `435c` | **RTL** — logical placement, a direction token, mirrored directional icons, and an RTL docs toggle | C/D | `063`, `200` | planned |

### Docs site (block `400–499`)

Plan `461` is the docs half of the components expansion merged from `master` on
2026-10-18 (plans 119–157 there): the delivered components' pages, their props
tables and the inventory reconciliation.

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| `410-docs-site.md` | `apps/docs`: the Fumadocs site (IA, themes, search, build, deploy) | B–F | 001; `0xx` tokens docs | Phase B implemented — build, dev, search and IA verified; theme now reconciled with 011 (plan 416) |
| `411-component-page-template.md` | Component metadata contract, page template, API tables | B–F | 410; `1xx` components | Phase B implemented — schema, registry, index and tests pass; prop tables wait on `1xx` |
| `412-preview-strategy.md` | Honest native-preview mechanism (`docs/preview-strategy.md`) | A–F | 001; playground | Phase B implemented — tiers N/S/A/X and label tests pass; screenshots wait on the playground |
| `413-docs-page-metadata.md` | Per-page document metadata (title, description, OpenGraph, canonical) | B | 410 | landed |
| `414-copyable-component-source.md` | Copyable real source on component pages via Fumadocs `<include>`, guarded by a test | B–C | 410, 411, 412 | implemented |
| `415-api-type-table.md` | The API type table: verified in this app, landed, and guarded (`@internal`, optionality, unresolved names) | B–C | 410, 411 | implemented |
| `416-docs-identity-from-tokens.md` | Docs identity from `@gpuixui/tokens`: the palette pinned by test, generated colour/type tables, theming + typography truth | B/F | 410, 011–018 | implemented |
| `417-component-index-filter.md` | Searchable component index: local title/summary filter, live count, empty state | B/F | 411, 410 | implemented |
| `418-absolute-urls-and-sitemap.md` | Absolute canonical URLs, generated `sitemap.xml` and `robots.txt`, one `VITE_SITE_URL` | B/F | 410, 413 | implemented |
| `419-search-component-registry.md` | Index the component registry in `/api/search` so ⌘K finds component names from any page | B/F | 411, 410, 417 | implemented |
| `420-docs-platform-toggle.md` | The docs platform toggle: macOS · Linux · Windows · Default, URL + storage, package values | B/F | 410, 416, 051 | implemented |
| `421-component-search-deep-link.md` | A planned component's search result opens the component index filtered to it (`?q=`) | F | 417, 419, 420 | implemented |
| `422-first-real-component-page.md` | The first real component page (Buttons): registry → page → real source → API table → honest preview; planned related links no longer 404 | B/C | 411, 412, 414, 415; primitives 047 | implemented — 19 files/100 tests, real 14-row API table, tier-X preview, sitemap + search verified |
| `423-tier1-component-pages.md` | The remaining 19 Tier 1 pages: every implemented primitive becomes a real page with generated props and source | C | 422; primitives 047 | implemented — 20 pages total, every Tier 1 row `wip` with a real source path; sitemap and search verified |
| `424-docs-truth-pass.md` | Phase F truth pass: every path a component page names exists or is a registered plan, and no placeholder prose ships | F | 410 §13, 422, 423 | implemented — 20 pages audited; guard covers paths, placeholders and real package exports |
| `425-tier2-component-pages.md` | The 22 delivered Tier 2 components become real pages with generated props, examples and source | C | 422–424; components 110–118 | implemented — 42 pages total, every Tier 2 row `wip`; sitemap and all URLs verified |
| `426-prose-truth-and-examples.md` | Prose truth pass (layouts, examples, getting started, installation) and a drift guard | F | 410, 424; primitives 047; components 110–119 | implemented — `prose-truth.test.ts` failed on the stale pages first, then passed; 111 docs tests, type-check and build green |
| `427-phase-d-docs-and-patterns.md` | Phase D docs: compound-component metadata/page template, Tier 3–4 pages, interaction previews and pattern pages | D/F | data-grid, docking; 410–412, 426 | partly implemented — Parts A–C contracts (schema, conditional template, part-source and interaction-preview guards) and Part D's first pattern page landed; Tier 3–4 pages await `packages/data-grid` and `packages/docking` |
| `428-component-page-dependencies.md` | The `Dependencies` section every `MISSION.md` component page owes, derived from each entry file and guarded against drift | F | 410, 411, 422–426 | implemented — 42 records and pages, `dependencies.test.ts` re-derives from source |
| `429-inventory-status-is-registry-status.md` | `COMPONENTS.md` owns status; the registry mirrors it and the landing page stops reporting "Implemented 0" | F | 411, 425; components 117 | implemented — status agreement test, 22 Tier 2 rows corrected |
| `430-theming-token-scales.md` | Theming page completeness: render every token group (spacing, radius, border, icon, density, elevation) from the package | F | 410, 416; tokens `Theme` | implemented — `<TokenScales />`, 151 docs tests; both directions proven |
| `431-search-relevance.md` | Search relevance: a component's exact name reaches its page; a blank query returns `[]`; one page listed once | F | 410, 411, 417, 419, 421 | implemented — title ranking, empty guard, page dedupe; 157 docs tests; every rule proven to fail when removed |
| [`432-native-coverage-preview.md`](./432-native-coverage-preview.md) | Previews stop calling runtime-verified components unverified: tier V names the native suite and its command | F | 412, 411, 425; primitives 041, components 117 | implemented — every delivered record declares its suite; the registry guard derives the command and the import |
| [`433-theming-native-captures.md`](./433-theming-native-captures.md) | Curated native theme captures on Theming: real frames, a sidecar from the run, refresh recipe | F | 412, 416, 430; playground 140, 150 | implemented — 20/20 capture run, two frames + sidecar committed, `<ThemeCaptures />` guarded |
| [`434-platform-styled-previews.md`](./434-platform-styled-previews.md) | Platform-styled component previews: the toggle reaches labelled tier-A previews built from the whole active `Theme` | F | 410, 412, 420; `@gpuixui/tokens` | implemented — token surface, four previews, page/theming wiring, browser-verified; real per-platform palettes remain a tokens task |
| [`435-tier1-value-and-choice-pages.md`](./435-tier1-value-and-choice-pages.md) | The seven delivered Tier 1 value/choice components (Slider, Range slider, Meter, Number field, OTP field, Toggle, Rating) get their `apps/docs` pages | C | 411–415, 423, 424, 428, 432; primitives 053, 054 | implemented — 7 records + pages, 49 total; 180 docs tests, routes/sitemap/search verified (§8.1) |
| [`436-prose-truth-playground.md`](./436-prose-truth-playground.md) | Prose truth: the built playground, five preview tiers and the quick start's runner; the guard now catches the wording that shipped | F | 412, 426, 432; playground 120, 140, 150 | implemented — the widened guard failed on both stale pages first (8 claims), then passed; 182 docs tests, `check`, `lint`, `test`, docs build and dev-server renders verified (§8) |
| [`437-tiered-component-sidebar.md`](./437-tiered-component-sidebar.md) | The component sidebar names its tiers at the real boundary, from one shared title rule | F | 411, 417, 423, 425, 435, 436 | implemented — the registry guard failed on the flat sidebar first, then on the untaught IA guard; 182 docs tests, browser-verified separators, all gates green (§7) |
| [`438-internal-link-integrity.md`](./438-internal-link-integrity.md) | Every literal `/docs` link in the content tree and the app resolves to a real page; the layouts page stops linking a non-existent Grid route | F | 410, 424, 426, 437 | implemented — the guard failed on `layouts.mdx` → `/docs/components/grid` first, then passed after the link moved to the Stack page; 184 docs tests, dev-server 200/404 check, all gates green (§7) |
| [`439-built-site-smoke.md`](./439-built-site-smoke.md) | Crawl the **production build**: every sitemap page renders, every internal link resolves, search answers and an unknown slug is 404 | G | 410, 418, 426, 438 | implemented — found two nested `<main>` landmarks on `/` and the 404 (fixed); 66 pages / 85 links, exit `0`; canonical break → `1`, unreachable server → `2` (§8) |
| [`440-landing-showcase.md`](./440-landing-showcase.md) | The landing page shows the design system: real light/dark palettes, platform families, tier counts and the five preview tiers, all derived from tokens/registry | F | 410, 411, 416, 429, 434 | implemented — no colour literal, no hard-coded count; four two-direction proofs; 190 docs tests, build and built-site crawl green (§5) |
| [`441-api-reference-index.md`](./441-api-reference-index.md) | `/docs/api-reference` becomes a generated index of every documented component's real props types | F | 410, 411, 414, 415, 425, 435 | implemented — 49 records declare 55 props types; `apiDrift` + component default enforce page ⇄ registry, 198 tests; four two-direction proofs (§10) |
| [`442-props-type-search.md`](./442-props-type-search.md) | A props type name (`ButtonProps`) reaches its component page from ⌘K | F | 419, 431, 441 | implemented — types are indexed; two new search tests, both proven to fail when the names are dropped; built `/api/search` verified (§8) |
| [`443-gpuix-support-column.md`](./443-gpuix-support-column.md) | The registry mirrors the inventory's GPUix-support column (`ours`/`reuse` included) | F | 411, 429, 432, 435 | implemented — 9 records corrected, the guard reads `COMPONENTS.md`; two-direction proofs in §8 |
| [`444-preview-dark-mode.md`](./444-preview-dark-mode.md) | Preview surfaces follow the docs' dark mode after hydration | F | 412, 416, 434 | implemented — `previewMode` gated with `useSyncExternalStore`; unit + browser two-direction proofs in §8. **Superseded in part by 445**, which reads both mode and platform from the published document state |
| [`445-preview-platform-snapshot.md`](./445-preview-platform-snapshot.md) | Previews follow the platform toggle too: one document-state snapshot for mode and platform | F | 420, 434, 444 | implemented — `parsePreviewState` reads `data-platform` + `dark`; unit + browser proofs in §8 |
| [`446-browser-smoke.md`](./446-browser-smoke.md) | A browser smoke check for hydrated previews (dark mode + platform) | F/G | 439, 420, 434, 444, 445 | implemented — `smoke:browser` hydrates the production build in Chrome; exit 1/2 proofs in §8 |
| [`447-tokens-api-reference.md`](./447-tokens-api-reference.md) | The tokens and theming API reference: generated `ThemeConfig`/`Theme` tables, every exported helper, and the React provider | F | 410, 415, 441; `@gpuixui/tokens` exports | implemented — 13 helper rows, both shapes generated, three two-direction proofs; 215 docs tests, 67-page built-site crawl (§8) |
| [`448-capability-evidence-page.md`](./448-capability-evidence-page.md) | The GPUix capability page: the measured support matrix, the surprises and the limits, generated from `COMPONENTS.md` and the playground scenario registry | E/F | 410, 412; `COMPONENTS.md`; playground 140–156 | implemented — `/docs/capabilities` and the measured subset on Workspace and Data display; 39 files / 228 tests, 68-page crawl (§6) |
| [`449-tier-a-preview-coverage.md`](./449-tier-a-preview-coverage.md) | Tier-A preview coverage: eight static Tier 1–2 pages get a labelled rest preview, so the platform toggle reaches most of the showcase | F | 410, 412, 434, 440 | implemented — 12 previews total; content + literal guards proven both ways, 229 docs tests, hydrated `?platform=win32` badge check green (§9) |
| [`450-preview-count-truth.md`](./450-preview-count-truth.md) | Preview coverage prose stops hand-counting previews; the registry is the only count and a page that states a different total fails | F | 410, 412, 424, 426, 449 | implemented — four stale "four" claims removed, `previewCountClaims` guard proven both ways, 231 docs tests (§8) |
| [`451-tier1-static-previews.md`](./451-tier1-static-previews.md) | Tier-A previews for the nine remaining static Tier 1 controls, plus a guard that every `--preview-*` name a preview reads is one the surface defines | F | 410, 412, 434, 449, 450 | implemented — 21 previews, 29 invalid variable names fixed (kebab-case colour roles), 232 docs tests (§9) |
| [`452-tier2-static-previews.md`](./452-tier2-static-previews.md) | Tier-A previews for the static Tier 2 compositions: list, empty state, inline validation, breadcrumb, pagination, search input, accordion, collapsible | F | 410, 412, 449, 451 | implemented — 29 previews, the new file is under the literal and variable-name guards; 232 docs tests (§9) |
| [`453-layout-static-previews.md`](./453-layout-static-previews.md) | Tier-A previews for the static layout/typography pages: text, separator, spacer, stack, box, button group, label — every static component page now carries one | F | 410, 412, 449, 451, 452 | implemented — 36 previews, 13 interaction/animation/icon pages intentionally stay at tier V/X; 232 docs tests (§9) |
| [`454-component-index-finds-limitations.md`](./454-component-index-finds-limitations.md) | The component index matches the props types and limitations a record proves, and the built-site smoke queries a component's prose | F | 411, 417, 419, 421, 431, 441, 443 | implemented — index filter, tests and a second production search query; both directions proven (§6) |
| [`455-live-wasm-preview.md`](./455-live-wasm-preview.md) | Live GPUix surface previews: the published 0.10.0 wasm renderer, isolated per scene, opt-in and labelled | F | 410, 412, 420, 432, 434, 444, 445 | implemented — Button renders on the real wasm renderer, tier L keeps its native evidence, `smoke:preview` drives it in real time; 244 docs tests (§10) |
| [`456-live-interaction-scenes.md`](./456-live-interaction-scenes.md) | Live interaction scenes: Tabs, Dropdown menu and Dialog on the real wasm renderer, with one smoke assertion per scene | F | 455, 410, 412, 434, 445 | implemented — four scenes, a JSX-free expectation table, a drift guard, and the renderer-window readiness probe that makes the dialog scene possible; `smoke:preview` drives all four scenes and pages (§9) |
| [`457-live-scene-coverage.md`](./457-live-scene-coverage.md) | Live scene coverage: Popover and Command menu join the wasm surface; the two scenes that need a component prop are recorded | F | 455, 456, 412, 445 | implemented — six scenes, the page loop derived from `LIVE_SCENES`, two blocked scenes recorded with their exact API asks; 250 docs tests (§9) |
| [`458-live-scene-finish.md`](./458-live-scene-finish.md) | The pages a real surface can show: Icons, Scrollable containers, Skeletons, Loading indicators and Confirmation dialogs join the wasm renderer; the four remaining gaps are measured | F | 455, 456, 457, 412, 445 | implemented — eleven scenes, a gap guard that fails on an unexplained page, `smoke:preview` green for every scene and page, two-direction proofs in §8; 251 docs tests |
| [`459-architecture-page-truth.md`](./459-architecture-page-truth.md) | The Architecture page names every real package, drops a promised document that does not exist, and includes the live surface; two guards read the repository | F | 410, 426, 455–458 | implemented — seven packages and the six preview groups on the page; `prose-truth.test.ts` guards both claims, proven in both directions (§8); 253 docs tests |
| [`460-stop-denying-live-surface.md`](./460-stop-denying-live-surface.md) | The introduction, getting-started, examples, landing page and 19 component pages stop saying the site cannot render the live surface it ships; three guards read the registry and the pages | F | 455–459, 426 | implemented — three guards, proven in both directions (§8); 255 docs tests, all three browser smokes green |
| [`461-tier2-expansion-pages.md`](./461-tier2-expansion-pages.md) | The 17 Tier 2 components merged from `master` get records, pages, generated props, examples and honest previews; the date/time row split reaches the registry | C/F | 410, 411, 412, 415, 425, 428, 429, 432, 441; components 119–157 | implemented — 66 component pages, 13 tier-A previews, 4 measured tier-V gaps; 260 docs tests, types, build, built-site and hydrated smokes green |
| [`462-first-compound-records.md`](./462-first-compound-records.md) | The compound contract meets real components: Tabs and Toasts adopt `pattern: "stateful"`, declare their parts and document state ownership; the Toast page shows the viewport source | F | 411, 414, 427, 425, 461 | implemented — two stateful records, three fixtures-only guards now run on real data, two-direction proofs in §9; 255 docs tests, types, build and all gates green |
| [`463-tier2-page-truth.md`](./463-tier2-page-truth.md) | The Tier 2 pages stop denying features the components now ship: list multi-select, submenus, type-ahead, accordion header keys, toast pause and actions, measured menu placement; a `shippedFeatures` guard and a preview readiness budget | F | 410, 411, 424, 425, 429, 443, 461; components 111–119 and the merged expansion | implemented — eight pages and the capability row corrected from source, the guard proven in both directions with two re-break proofs (§7), one measured readiness fix; 42 files / 260 docs tests |
| [`464-preview-strategy-gap-truth.md`](./464-preview-strategy-gap-truth.md) | `docs/preview-strategy.md` names the real preview gaps (nine, not five), and a guard compares the document's table with `gaps.ts` | F | 412, 455–458, 461 | implemented — the gap table and `NO_LIVE_SCENE` agree by test; three two-direction proofs in §9 |
| [`465-record-limitation-truth.md`](./465-record-limitation-truth.md) | The record's limitations stop denying what the inventory ships: the status block above a page can no longer contradict the prose below it | F | 411, 429, 443, 463 | implemented — seven stale limitation strings corrected; the `shippedFeatures` table now reads each record too |
| [`466-page-content-blocks.md`](./466-page-content-blocks.md) | The page template checks the blocks a page must keep: a `tsx`/`ts` `@gpuixui` example under Usage, an `<auto-type-table>` under API reference and an `<include>` under Source | F | 411, 414, 415, 465 | implemented — three content rules over 66 pages, each proven to fail by deleting the block from a real page |
| [`467-fumadocs-editor-authoring.md`](./467-fumadocs-editor-authoring.md) | Fumadocs Studio as the dev-only authoring command, with a byte-for-byte round-trip guard over every page and no editor code in the built site | F | 410, 414, 423, 425, 461 | implemented — 84 pages round-trip, parse failures name the page, `dist` has no editor module, Studio serves `200` (§8) |
| [`468-search-suite-cold-budget.md`](./468-search-suite-cold-budget.md) | The search suite's cold index build gets a budget that survives a loaded host; no assertion changes | F | 419, 431, 442, 439 | implemented — 30 s failed 2 tests on a cold, loaded worktree, 120 s passes 42 files / 260 tests |
| [`469-test-checker-regex-false-positive.md`](./469-test-checker-regex-false-positive.md) | The page-template guard stops tripping `check:tests`: a regex with backticks after a space truncated the checker's block parse | F | 411, 466 | implemented — no `check-tests-ok` escape; the fence check is a line test, and it still fails on a missing example |
| [`470-contributing-page-checks.md`](./470-contributing-page-checks.md) | The Contributing page names every docs-site check it must run — the two browser smokes and the Studio authoring command included — and a guard reads `package.json` so a new smoke cannot ship undocumented; a second guard resolves every docs command in the content tree | F | 410, 439, 446, 455, 467 | implemented — six checks with what each proves and its exit codes; the guards fail on a removed row, an added script, a lost exit-code sentence and a renamed command (§9) |
| [`471-live-scene-command-menu-parts.md`](./471-live-scene-command-menu-parts.md) | The command-menu live scene renders its parts, and the scene contract notices a palette built from data only | F | 455, 456, 457; components 114 | implemented — the scene mounts `CommandMenuInput`/`List`/`Empty`; `smoke:preview` green with 15 text nodes (was 2), and the new guard fails by name when the parts are removed (§9) |
| [`472-scene-painted-text.md`](./472-scene-painted-text.md) | A live scene looks for text its component paints, not its own `h3` heading; the one component that paints none is a written, pinned exception | F | 455–458, 471 | implemented — four expectations moved into the component region, `skeleton` exempt with a reason, the guard fails by name when an old heading returns (§9) |
| [`473-page-surface-sized-canvas.md`](./473-page-surface-sized-canvas.md) | The live-preview page check waits for a sized canvas instead of accepting a `ready` flag on a 1×1 frame | F/G | 455–458, 471, 472 | implemented — `/docs/components/button` reported 1×1 before; all twelve page loads now report 606×358, and a forced threshold fails the first page with `timeout` (§8) |
| [`474-live-surface-light-mode.md`](./474-live-surface-light-mode.md) | The live-surface smoke proves light mode: the iframe carries the page's mode in both schemes, and the Button scene paints a different frame in light than in dark | F/G | 444, 445, 455–458, 473 | implemented — forced schemes replace the host preference; two forced defects fail by name (§8) |
| [`475-scene-surface-sized-canvas.md`](./475-scene-surface-sized-canvas.md) | A live scene's canvas must be sized, not merely non-zero: the scene half of plan 473's rule | F/G | 455–458, 473, 474 | implemented — `dropdown-menu` passed on a 1×1 canvas before; every scene now waits for a sized canvas, and a forced threshold fails the first scene with `timeout` (§7) |
| [`476-drawer-navigation-live-scenes.md`](./476-drawer-navigation-live-scenes.md) | Drawer and Navigation menu join the live surface: the open props their gap reasons denied | F | 455–458, 461, 475 | implemented — two scenes, gap set nine → seven; removing `defaultOpen`/`value` fails the smoke by scene name (§7) |
| [`477-mention-input-live-scene.md`](./477-mention-input-live-scene.md) | Mention input's suggestion list is a live scene: the text, not a prop, opens it | F | 455–458, 461, 475, 476 | implemented — one scene, gap set seven → six; removing the initial token leaves only the heading in the tree (§7) |
| [`478-preview-card-live-scene.md`](./478-preview-card-live-scene.md) | Preview card gets a live scene through its `defaultOpen`; the hover policy stays with the native suite | F | 455–458, 461, 475, 476 | implemented — one scene, fifteen total; removing `defaultOpen` leaves only the trigger (§7) |
| [`479-compound-parts-api.md`](./479-compound-parts-api.md) | Compound parts are real: 29 records declare their exported parts, every part props type gets a generated table, and the guards read real data | F | 411, 414, 415, 427, 441, 462 | implemented — §3 is the exact record data; §10 records the five two-direction proofs and the search regression the tables exposed |
| [`480-state-ownership.md`](./480-state-ownership.md) | State ownership on the interactive compound pages: 19 records become `stateful` and each page names what it owns and what the consumer owns | F | 411, 427, 462, 479 | implemented — 21 stateful records total; two source-corrected claims and two two-direction proofs in §8 |
| [`481-part-name-search.md`](./481-part-name-search.md) | A part name (`DialogTitle`, `DropdownMenuSubTrigger`) finds its component in ⌘K and the index filter, and the built smoke queries one | F | 419, 431, 442, 454, 479 | implemented — three tests and a production query, both directions proven in §7 |
| [`482-component-api-page.md`](./482-component-api-page.md) | The public component API contract reaches the site: parts, controlled state, state-aware styles, keyboard and accessibility, with the real hook/keyboard sources and a generated parts index | F | 410, 411, 427, 461, 479, 480; `docs/component-api.md` | implemented — `/docs/component-api`, `<PartIndex />` generated from 29 compound records, two guards proven both ways, 85 → 86 pages |
| [`483-live-surface-chrome-truth.md`](./483-live-surface-chrome-truth.md) | The landing page stops denying the live surface it ships; one predicate guards MDX prose and rendered chrome | F | 410, 439, 455–460 | implemented — the shipped denial failed the new guard first, then passed; 46 files / 293 docs tests, all gates and the built-site smoke green |
| [`484-toast-live-scene.md`](./484-toast-live-scene.md) | Toast joins the live surface: an infinite-duration toast removes the race the gap reason named, so the real viewport paints on the wasm renderer | F | 455–458, 461, 475–478, 483 | implemented — the gap set falls six → five; the scene, record, page and document agree; gates and `smoke:preview` green |
| [`485-patterns-index-truth.md`](./485-patterns-index-truth.md) | The patterns index names the real blocker: the confirmation flow and command palette wait on a composed example, not on unimplemented components | F | 427, 461, 463, 465 | implemented — prose corrected, a wording-class guard proven in both directions, all gates green |
| [`486-gesture-live-scenes.md`](./486-gesture-live-scenes.md) | The five remaining preview gaps become gesture-driven live scenes: the renderer's own automation API opens tooltip, context menu, date picker, combobox and hotkey input, and the smoke proves text absent before / present after | F | 455–458, 461, 475, 484 | implemented — 21 scenes, gap set empty; three two-direction proofs measured in §6 |
| [`487-component-page-template-docs.md`](./487-component-page-template-docs.md) | The component-page template reaches the site: `/docs/component-pages` generates its section list from `sectionsFor`, names the record fields, the MDX blocks and the guards, and a suite fails when the prose drifts | F | 410, 411, 414, 415, 427, 441, 479, 480, 482 | implemented — three two-direction proofs; 47 files / 304 docs tests, 87-page built-site crawl |
| [`488-extending-page.md`](./488-extending-page.md) | Extension instructions: `/docs/extending` documents the `core/` layer, names every real core module, includes the public surface and a worked component, and a guard fails when the layer grows undocumented | F | 410, 030/041, 021/023, 487 | implemented — five two-direction proofs; 48 files / 311 docs tests, 88-page built-site crawl |
| [`489-license-page-truth.md`](./489-license-page-truth.md) | The License page names what is recorded (`LICENSES/README.md`, the verified `base-gpui` MIT record) and what is still owed, instead of denying both; a guard compares the page to the directory | F/G | 410; the licensing workstream's first record | implemented — six tests, five two-direction proofs |
| [`490-public-value-api-index.md`](./490-public-value-api-index.md) | The public value exports get a generated index: every function, hook, class, constant, inventory record and namespace from the documented packages' real entries, with an explicit excluded/internal classification and a guard against an undocumented or unregenerated export | F | 410, 415, 441, 447, 487, 488 | implemented — `/docs/api-values`, 190 exports from 5 entries, four two-direction proofs, 51 files / 335 docs tests, 89-page crawl (§9) |
| [`491-native-testing-page.md`](./491-native-testing-page.md) | The native smoke suite gets a real page: the platform-free harness, the playground adapter, the `0`/`1`/`2` exit contract, the scenario model and its limits, guarded against the package it documents | F/G | 410, 412, 448, 470, 490; playground 100/110/140 | implemented — `/docs/native-testing` + `native-testing.test.ts`; four two-direction proofs; 52 files / 342 docs tests (§8) |
| [`492-choice-control-live-scenes.md`](./492-choice-control-live-scenes.md) | Live scenes for the three choice controls: Select's opened list, Checkbox's check and Switch's thumb move are states a still cannot prove, so the smoke drives a real click and asserts absent-before / present-after | F | 455, 456, 475, 486, 451 | implemented — three scenes, three records, three contract pairs; `smoke:preview` 24 scenes / 24 pages, exit 0; three two-direction proofs (§6) |
| [`493-form-control-live-scenes.md`](./493-form-control-live-scenes.md) | Live scenes for the remaining interactive form controls: a radio selection, a slider's keyboard maximum, a range slider's clicked thumb, and typed text in the search input, input and text area; `SceneStep` gains `click-text` and `fill` | F | 455, 456, 475, 486, 492, 451 | implemented — six scenes, `smoke:preview` 30 scenes / 14 gesture-driven, exit 0; four two-direction proofs (§6) |
| [`494-preview-count-guard.md`](./494-preview-count-guard.md) | The preview counts stop being remembered: `docs/preview-strategy.md` and `apps/docs/README.md` state digit totals that a test derives from `LIVE_SCENES` and `SCENE_GESTURE`, including the gesture-table row count | F | 412, 450, 464, 455–493 | implemented — digit totals derived from `LIVE_SCENES`/`SCENE_GESTURE`; four two-direction proofs (§6) |
| [`495-preview-hydration-every-page.md`](./495-preview-hydration-every-page.md) | The hydrated-preview smoke checks every page that carries a labelled preview, in dark and light, from one Chrome session; the page list is derived from the MDX tree | F/G | 412, 434, 444–446, 449–453, 461 | implemented — 49 preview pages × 2 schemes + 3 platform URLs = 101 checks, exit `0`; a shared CDP session replaces 98 Chrome spawns; three two-direction proofs (§8) |
| [`496-docs-keyboard-navigation.md`](./496-docs-keyboard-navigation.md) | Skip navigation and the docs focus ring: every page's first tab stop jumps into its content, and focus draws the library's ring token in both docs themes | F/G | 410, 416, 446, 495 | implemented — three pages in a real browser (docs dark, home light, 404 dark); skip link first in tab order, focus target `#nd-page`/`#main-content` without a whole-region ring, ring pinned to `--color-fd-ring`; 354 docs tests, six two-direction proofs (§7) |
| [`497-remaining-value-live-scenes.md`](./497-remaining-value-live-scenes.md) | The remaining value and disclosure controls get live scenes: Accordions, Number fields, OTP fields, Ratings, Tag inputs and Toggles render on the wasm renderer; a page can no longer deny a scene its record declares | F | 412, 434, 455–458, 475, 486, 492, 493 | implemented — six scenes, 36 total; the widened guard caught the shipped `search-input` denial before it was fixed; `smoke:preview` green for every scene and page (§8) |
| [`498-code-contrast.md`](./498-code-contrast.md) | The docs code palette clears the 4.5:1 text floor: the two failing GitHub Light/Dark colours are replaced per theme, both Shiki pipelines share the map, and the hydrated smoke reads every painted code leaf | F | 410, 416, 446, 495 | implemented — the measured 3.49:1 and 3.51:1 pairs are 5.50:1 and 5.49:1; a 7-test suite pins the wiring and both directions were measured (§7) |
| [`499-heading-outline.md`](./499-heading-outline.md) | Every page's heading outline is ordered: the three generated indexes open their groups at `h2`, and the built-site crawl fails when any page skips a level | F | 410, 417, 441, 490, 439 | implemented — the crawl named the three `h1 → h3` pages before the swap, then passed 90 pages; the check now guards every page (§7) |
| [`500-exported-symbol-search.md`](./500-exported-symbol-search.md) | A component's **exported symbol** reaches its page: `Spinner` (from `SpinnerProps`) outranks prose, so the nine stems that differ from their inventory title stop landing in the appendix | F | 411, 419, 431, 441, 479 | implemented — nine symbol queries now return their page first; `smoke:build` asserts one against the production index (§8) |
| [`501-fragment-anchor-integrity.md`](./501-fragment-anchor-integrity.md) | A fragment link lands on a heading: the production crawl compares every internal `#fragment` with the ids the destination page actually renders, so a renamed heading cannot silently break the 66 generated `#api-reference` links | F | 410, 438, 439, 441, 499 | implemented — 1 143 anchors over 90 pages, exit `0`; both directions (66 broken API links, one renamed heading) fail by name (§7) |
| [`502-responsive-smoke.md`](./502-responsive-smoke.md) | The site is usable at a phone width: a 390 px browser smoke crawls every sitemap page for sideways scroll and clipped columns, then opens and navigates the mobile sidebar | F | 410, 439, 446, 470, 495 | implemented — it found the Buttons page clipping a 423 px suite path in a 390 px column; inline code now wraps, 90/90 pages clean, nav failure proven at 1200 px (§7) |
| [`503-getting-started-providers.md`](./503-getting-started-providers.md) | Getting started actually starts with the library: the first app mounts a provider and renders a real component, the install declares `@gpuixui/tokens`, Theming names the second provider a mixed app needs, and a suite derives both contexts from package source | F | 410, 411, 426, 455, 457 §9; shipped tokens/primitives | implemented — five two-direction proofs (one exposed a missed "fall back" wording), 380 docs tests, `check` and `smoke:build` green (§7) |
| [`504-token-search.md`](./504-token-search.md) | A token role is findable from ⌘K: the generated colour, type, scale and platform tables get their own index documents, so `destructiveSoft` and `spacing.md` reach the table that documents them rather than returning nothing | F | 410, 416, 419, 430, 431, 447, 490, 500 | implemented — 14-test suite, five two-direction proofs plus the production before/after; 58 files / 394 docs tests, `check` and `smoke:build` green (§8) |
| [`505-capability-search.md`](./505-capability-search.md) | A scenario id finds the capability page: the measured matrix gets a generated index document and the promoted-name ranker becomes shared with the token index | F | 410, 419, 431, 448, 490, 500, 504 | implemented — eight tests, three two-direction proofs plus the production before/after; 59 files / 402 docs tests, `check` and `smoke:build` green (§8) |
| [`506-search-palette-smoke.md`](./506-search-palette-smoke.md) | The search palette is keyboard-usable end to end: ⌘K opens it, typing lists the real page, Enter navigates, an unknown query says so, and Escape returns focus to the trigger (a measured defect: the controlled Radix dialog left it on `<body>`) | F/G | 410, 419, 446, 470, 496, 505 | implemented — `src/search/search-focus.tsx` + pure rules, `smoke:search`; fix in place exit `0`, component removed exit `1` (focus on body), selector broken exit `1` (did not open) (§7) |

> The `400–499` block is full; plans `500`–`506` take the next free numbers, as
> plan `051` did for the tokens workstream when `010–019` filled.
>
> The `200` block was written by the reference-adoption executor on
> 2026-10-17 from `.agents/slop/reference-research.md`. The per-workstream plans
> live on their own branches and are merged into the integration branch as each
> workstream completes; this index is the union.

### Runtime verification: what is true now

`020-gpuix-runtime-capability.md` §3 recorded the measured evidence that this box
is **Intel macOS**, GPUix publishes **no `darwin-x64` native binary**, and this
SSH session has **no Aqua session**. That changed on 2026-10-17:
**`140-gpuix-native-darwin-x64-build.md`** (playground workstream) built
`@gpuix/native@0.10.0` from source with `gpui_macos/runtime_shaders`, and the
playground's native suite is green against it. The artifact is a local build
product (gitignored); a fresh checkout has no binding until the script is run.

Consequences:

- `packages/primitives` and `packages/icons` run the **real** `TestRenderer`
  (`test:runtime`, plans 041/047);
- `nub run test` still runs on a host without a binding, so runtime suites stay
  opt-in and fail loudly when the binding is absent;
- a row may only cite the runtime when that workstream's `test:runtime` produced
  the observation. The gold-standard confirmation on the **published** binary is
  a CI task in `TODO.md`.

### Prerequisite for the whole swarm: one writer per worktree

`022-swarm-single-writer.md` records the measured fact that the supervisor ran
**several live agents per worktree**, so they clobbered each other's files. Its
§4 mitigation was applied to the `primitives` tree on 2026-10-17 08:40 (the
duplicate session was deleted after the tree was committed). **The fix itself is
still unlanded:** `scripts/swarm-supervisor.sh`'s runner loops `opencode run`
without a stable `--session`, so every loop iteration that returns early leaves a
live turn and the next iteration forks another. Until §5.1 lands in the shared
`scripts/`, every workstream can re-acquire a duplicate. Read its §3 first.

## How to use a plan

1. Read it fully before starting. Do not skim the STOP conditions.
2. Work only inside your own worktree (`workspaces/<workstream>/`).
3. Run every command in the plan; a command that was not run did not pass.
4. On a STOP condition, stop and report with the evidence. Do not improvise a
   workaround that the plan did not authorise.
5. When done, update this table's status column and tick the matching task in
   `TODO.md`.
6. **Read `020-gpuix-runtime-capability.md` §3 and the runtime note above before
   promising a component is verified.** A locally-built binding exists on this
   host; a clean checkout does not.
