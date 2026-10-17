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

### Docs site (block `400–499`)

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
