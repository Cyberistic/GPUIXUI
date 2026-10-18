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

`[~]` `[███░░░░░░░]` 3/7

`[x]` Inspect the environment, package manager and toolchain; record the findings
`[x]` Establish the GPUix version, APIs, primitives, events, layout and limits
`[x]` Read GPUix docs and examples; write the capability map
`[~]` Inspect GPUI Kit (hierarchy, theming, layout, interaction, licence)
`[ ]` Study shadcn/ui organisation and semantic tokens; review PanelUI; review Fumadocs setup
`[~]` Write and index every phase and package plan in `.agents/slop/plans/`
`[!]` **BLOCKER: no GPUix runtime can run on this machine.** Intel macOS + no
      `darwin-x64` native binary + no Aqua session (SSH background). Evidence and
      the three honest ways out are in
      `.agents/slop/plans/020-gpuix-runtime-capability.md` §3. Owned by
      playground workstream (wasm path) with a human decision for the GUI path.
`[!]` **BLOCKER B3: several live agents are writing the same worktree.** Measured
      2026-10-17 07:40: 5 live `swarm:primitives` sessions (and 2–6 for every
      other workstream) editing `workspaces/primitives` concurrently, clobbering
      each other's files. `scripts/swarm-supervisor.sh`'s runner loops
      `opencode run` without a session id, so each CLI return leaves a live turn
      and starts another. Evidence, mitigation and the fix:
      `.agents/slop/plans/022-swarm-single-writer.md`. Fix lives in `scripts/`
      (shared checkout) — needs a coordinator or the human.
      **Update 2026-10-17 08:40:** the primitives tree is back to one writer —
      the duplicate session was removed (§4) after the tree was committed, and
      the tree then went green (`nub run check`, 133 + 18 tests). The runner
      **still forks a new session per loop iteration**, so every workstream will
      re-acquire a duplicate until §5.1 lands in the shared `scripts/`.

### Playground workstream (`apps/playground`, `packages/testing`)

`[x]` `[████████░░]` 20/24 plans-and-harness

`[x]` Plans `100`–`155` written and indexed for the playground workstream
`[x]` **Blocker B1 fixed**: the `darwin-x64` GPUix 0.10.0 binding builds from source with `gpui_macos/runtime_shaders` (the `xcrun metal` step is optional) and loads — plan `140`, ADR 0003
`[x]` **The native smoke suite is 20/20 green on this host** — `nub run --filter playground build && nub apps/playground/dist/smoke/run.js` exits `0`, writes `smoke-report.json` and 20 screenshots. Two-direction proof recorded (plan `140` §4, plan `150` §4, plans `151`–`156` §8: exit `1` when a check is broken). Every capability in `COMPONENTS.md` is now `verified 0.10.0`
`[x]` Probe the modal contract per plan `155`: `modal-focus-trap` — component code moves native focus (`renderer.focusElement`), Tab wraps inside the surface (`focusNextWithin`/`focusPreviousWithin`), focus returns to the trigger, and a nested popover's Escape closes only the popover — 19/19 green (fails with exit `1` when the Tab trap or the focus return is removed)
`[x]` Probe floating placement per plan `156`: `floating-placement` — `side`/`sideOffset`/`align="start"` are exact; **`align="center"` is off by half the panel** and `fit="snap"` clamps inside the window without flipping, so a bottom-side menu can cover its trigger — 20/20 green (fails with exit `1` when the layer ignores `side`)
`[ ]` Cross-team: `@gpuixui/components` must handle the measured floating defects — `PopoverContent`/`DropdownMenuContent` expose `align="center"`, which is short by half the panel on both axes, and `fit="snap"` does not flip, so a near-bottom menu must choose `side="top"` itself (owner: `components`; evidence: plan `156` §8)
`[ ]` Mount the real Tier 2 components in the playground (`@gpuixui/components`: dialog, menu, toast) and drive open/close/confirm in the native suite — blocked until that package is on the integration branch; plan `117` records the ask, owner `playground`
`[x]` Record the build host's missing 0.10 binding as ADR 0001 (evidence + consequence)
`[x]` Probe GPUix 0.5.1 on this host: it runs (real window, layout/input/overlay/panel/virtual-list/programmatic scroll) and it never delivers focus or wheel-scroll events — ADR 0002
`[x]` Establish the GPUix capability map from docs/types and measured probes (layout, input, focus, overlay, scroll, panel, virtual-list, Tier 3/4)
`[x]` Land `packages/testing` (harness, report, runtime preflight) per plan `100`
`[x]` Land the `legacy-probe` (0.5.1) so the documented capability matrix is reproducible per plan `110` §3.4
`[x]` Land `apps/playground` shell + `SplitPane` + the eight core scenarios per plan `120`
`[x]` Land the Tier 3/4 probe scenarios per plan `130` (`table-select-sort`, `table-column-resize`, `workspace-tab-drag`) — now run green on this host
`[x]` Correct the scenarios to the measured 0.10.0 contract (wheel sign, painted-window virtual-list, visible-row selection, pointer-capture `onMouseMove`, focus traversal, overlay handlers on the content div) — plan `140` §4
`[x]` Add the app-level window-key probe (`window-key-shortcut`: cmd-k palette, Escape) so the command-palette/app-menu path is covered — 12/12 green
`[x]` Land the native theme gallery per plan `150`: `paintedStyle` on the smoke host (schema-decoded at the boundary), `theme` capability, `theme-color-roles` + `theme-type-and-shadow`, and the shell wired to `@gpuixui/tokens` — 14/14 green; `src/theme.ts` deleted
`[x]` Guard the app's own navigation per plan `151`: `App` takes the scenario list as a prop and the sidebar is a scroll container; `shell-navigation` mounts the real shell, proves the 15-entry list scrolls and that the last entry ends up inside it — 15/15 green (fails with exit `1` when `overflowY` is removed)
`[x]` Probe the virtualized table per plan `152`: `virtualized-table` — 500 fixed-height flex rows with fixed-width cells inside `<virtual-list>`, a painted row hit-tested and selected, selection surviving scroll; measured the one-gesture `onVisibleRange` lag — 16/16 green (fails with exit `1` when the row `onClick` is removed)
`[x]` Probe the tree view per plan `153`: `tree-view` — exact per-depth indentation, expand/collapse repaint, click-to-focus and arrow-key delivery; the no-programmatic-focus limitation recorded — 17/17 green (fails with exit `1` when the directory toggle is disabled)
`[x]` Probe the log viewer per plan `154`: `log-viewer` — bottom-anchored `<virtual-list>` starts at the tail and re-anchors on appends; the overlap of `alignment`/`followTail` and the no-snap-back-on-scroll limitation recorded — 18/18 green (fails with exit `1` when both props are dropped)
`[ ]` **Gold standard (outside this workstream):** add `.github/workflows/native-smoke.yml` running `nub run --filter playground smoke` on `macos-14` (Apple Silicon) to confirm with the **published** binary (this host's verdict uses a locally-built binding, ADR 0003). The repo is public, so the runners are free. Owner: whoever owns CI/platform
`[x]` Cross-team: the docs' honest native previews need **committed** images — decided in plan 433: the raw `.artifacts` stay gitignored, the docs commit a curated set under `apps/docs/public/screenshots/theming/` with a `provenance.json` from the measured run (20/20, commit `7fd029f`), and `<ThemeCaptures />` refuses a frame with no sidecar. Component screenshots still wait on per-component playground screens. Owner: `docs-site`
`[ ]` Cross-team: plan numbers collide in the shared `100–199` block —
      `110-package-components.md` and `110-native-smoke-test.md` both exist, and
      the playground set continues `120`–`156`. Renumber one set and update every
      reference; the plan index now says the block is shared. Owner: repo
      coordinator (do not edit another workstream's plans from `docs-site`)
`[ ]` **Plan numbering collides in `100–199`**: the components set uses `110`–`119`
      and the playground set uses `100`–`156`, so both `110-package-components.md`
      and `110-native-smoke-test.md` exist. Renumber the playground set (or the
      components set) and update the index, plans and commit messages that cite
      them. Owner: whoever owns `scripts/` / the plan index.
`[x]` Wire the playground to `@gpuixui/tokens` and delete the app-local `src/theme.ts` (plan `150`) — the shell, shared helpers and every scenario read `useTheme()`; the smoke runner wraps each view in `ThemeProvider`
`[ ]` Make `@gpuixui/tokens/react` consumable by a GPUix app without a tsconfig shim: its JSX compiles against `@gpuix/react/jsx-runtime` because the consumer sets that `jsxImportSource`, but `packages/tokens` cannot resolve it, so `apps/playground` maps the type path in `tsconfig.check.json`/`tsconfig.build.json`. Fix in `packages/tokens` (a `/** @jsxImportSource react */` pragma, or `createElement`) and remove the mapping. Owner: `tokens` workstream
`[ ]` Replace the jj-based `scripts/verify-two-directions.sh` with a git implementation (outside this workstream)

#### Process — one writer per tree

`[ ]` **Supervisor bug: two playground agents ran in `workspaces/playground` at
once.** The 30-minute tick starts a workstream loop when its pid file is gone,
but an interactive session for the same workstream is not tracked, so a second
agent implemented `packages/testing` while the first was mid-edit. Either track
interactive sessions or refuse to start a workstream whose tree has uncommitted
changes from another pid. Owners: whoever owns `scripts/swarm-supervisor.sh`.

## Phase B — working foundation

`[~]` `[████████░░]` 5/6

`[ ]` Land the workspace, boundaries and package scaffolding that has real content
`[x]` Land tokens and the theming architecture (light + dark, semantic roles)
`[x]` Land the primitives package
`[x]` **Native smoke test**: layout, input, focus, overlay, scroll, panel and virtual-list primitives verified in real GPUix 0.10.0 on this host (11/11, plan `140` §4)
`[x]` Land one fully working component running in GPUix — every Tier 1 component mounts in the real `TestRenderer` (plan 041; 119 runtime tests after plan 055) and is documented in Fumadocs (plans 422–424, 435)
`[x]` Land the docs shell and document that component in Fumadocs — `apps/docs/content/docs/components/button.mdx` (plan 422)

### Design tokens and theming (`tokens-theme`)

`[x]` `[███████░░░]` 14/20

`[x]` Write and index the tokens/theme plan set (plans 010–019 and 051)
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
`[x]` Add platform type styles and `platformTheme(theme, platform)` for the docs
platform toggle (plan 051)
`[x]` Add the design-system rows to `COMPONENTS.md`
`[ ]` Add motion tokens (durations/easings) once a component consumes them
`[ ]` Ship `registerFonts` so a consumer's (or the library's) typeface reaches the
runtime, and record the licence review for any bundled family — plan 052, native
proof blocked by B1 (rescued from the abandoned `agent/fonts` branch)
`[x]` Cross-team: native theme gallery in `apps/playground` (owner:
`playground`) — landed as plan `150`; Fumadocs Theming page from `docs/tokens.md`
and the docs platform toggle (macOS / Linux / Windows / Default) built on
`platformTypes` + `platformTheme` (owner: `docs-site`); ignore the `references`
**symlink** — a `references/` rule does not match a symlink, so every worktree
shows it as untracked (owner: repo tooling; `packages/README.md` already lists
`tokens`)
`[ ]` Cross-team: `primitives` and `components` depend on `@gpuixui/tokens`
directly and delete their structural copies of the theme and role list, their
local focus-ring helpers (`primitives/src/core/style.ts`,
`components/src/internal/theme.ts`) and their first-shadow helpers
(`primitives/src/core/style.ts` `firstShadow`, `components/src/internal/theme.ts`
`elevation`), now that `focusRing` and `elevationShadow` exist and the package
resolves from source (owner: those workstreams; plans 016–018)
`[ ]` Cross-team: `components` still carries a whole structural copy of the
package (`packages/components/packages/tokens/src`, plus a built `dist/`) — delete
it and import `@gpuixui/tokens` directly once the package is on `main` (owner:
`components`)
`[x]` Promote the workstream to `main`: plans 010–019 and 051, `packages/tokens`
and the union plan index are on `main` (commit `458fe10`); `main` now compiles
`@gpuixui/tokens` from source, so `primitives`, `components` and `docs-site` can
merge it and drop their structural copies
`[ ]` Merge `main` into `agent/tokens-theme` once plan 019 (motion tokens) lands
there, then promote that commit — `agent/tokens-platform` is a second branch for
this workstream, created because two live sessions shared one worktree (see
`.agents/slop/blockers/2026-10-17-concurrent-tokens-writers.md`), and should be
retired once both branches are one

### Primitives workstream (owner: primitives)

`[x]` Write and index the primitives, icons and Tier 1 plans
`[x]` `packages/icons`: registry, sizing, accessibility rule, invariant tests
`[x]` `packages/primitives`: the `core/` layer (theme port, style resolution,
      variants, keyboard, state, layout, selection, loading) with tests
`[x]` `packages/primitives`: `ThemeProvider` + density override
`[x]` `packages/primitives`: layout primitives (Box, Stack, Grid, Separator, Spacer, ScrollArea)
`[x]` `packages/primitives`: Text + typography scale
`[x]` `packages/primitives`: Button + ButtonGroup
`[x]` `packages/primitives`: Label, Input, TextArea
`[x]` `packages/primitives`: Checkbox, RadioGroup, Switch, Select
`[x]` `packages/primitives`: Progress, Skeleton, Spinner, Tooltip
`[x]` `packages/primitives`: element-tree test harness + component suites
      (`src/components/testing/element.ts`; render is impossible here, so a test
      asserts on the tree the runtime would receive)
`[x]` `packages/primitives`: package README (theme port, density, component
      list, and the runtime-verification status)
`[x]` `packages/primitives`: docs page + composed example for every Tier 1
      component, co-located in the package (`docs/`, `examples/`); one runtime
      suite mounts every example (plan 047)
`[x]` `packages/icons`: docs page and the icon-gallery example (plan 047)
`[x]` `packages/primitives`: close three fixable limitations — a named
      `ButtonGroup`, `ScrollArea` scroll deltas, RadioGroup Home/End (plan 048)
`[x]` `packages/primitives`: Tier 1 runtime suites in `runtime/` — 119 tests
      against the real GPUix 0.10.0 `TestRenderer` (layout, controls, fields,
      loading, icons, value controls, OTP, toggle, rating), with the
      two-direction proof; results in plans 041 §9, 053 §11 and 054 §9
`[x]` `packages/primitives`: the remaining Tier 1 rows — Slider, Range slider,
      Meter (plan 053); Number Field, OTP Field, Toggle, Rating (plan 054) —
      plus the disabled fields, radio focus contract and theme axes (plans
      025, 049, 055)
`[x]` `examples/basic-app`: compose the Tier 1 set into one settings-form workflow
      (typed + `check-types` green; the app itself is **never run** — it needs a
      desktop session, while the primitives it composes are runtime-verified)
`[x]` `packages/primitives`: docs pages for every Tier 1 component (docs-site workstream) — all 20 pages landed with plans 422 and 423
`[ ]` **packages/testing** (playground workstream): hoist `runtime/harness.ts`
      into the shared smoke framework once the package lands — plan 041 §2.2
      records why it is duplicated for now

### Cross-workstream dependencies (do not edit their paths — record only)

`[x]` **root**: `nub.lock` is tracked on `master`, so a clean checkout resolves
      the same versions (the merge conflict was resolved in `master`'s favour).
`[ ]` **root**: `.gitignore` ignores `references/`, which does not match the
      `references` **symlink** the supervisor creates in each worktree. It
      therefore shows as untracked, and a `git add -A` at the root would commit a
      symlink to an absolute path outside the repo. Ignore `references` without
      the trailing slash.

`[!]` **swarm runner**: one writer per worktree. Add
      `opencode run --session swarm-<ws>` to the generated runner, count live
      sessions in `agent_alive`, and land `scripts/check-single-writer.sh` as the
      regression guard. Full evidence and the fix:
      `.agents/slop/plans/022-swarm-single-writer.md`.
`[x]` **root**: the old `PLAN.md` claim that GPUix cannot run here is replaced by
      D23, which records the locally-built `darwin-x64` binding (plan 140) the
      runtime suites use.
`[x]` **tokens workstream**: `primitives` imports `@gpuixui/tokens` directly;
      the structural `PrimitiveTheme` port is gone and the shipped light/dark
      themes are the values the components render (plan 021)
`[ ]` **playground workstream**: resolve the runtime blocker — either run the
      published wasm renderer in headless Chrome
      (`@gpuix/native@0.10.0/wasm`, COOP/COEP headers, `--enable-unsafe-swiftshader`),
      or get a `darwin-x64` source build / a GUI session
`[ ]` **playground workstream**: Tier 1 runtime tests in `packages/testing` —
      render, hit-test, Tab order, Enter/Space activation, checkbox/switch toggle,
      radio arrow navigation, scroll offset, a11y-tree dump. These are the tests
      that move a `wip` component row to `done`
`[x]` **docs-site workstream**: Tier 1 component pages + the `docs/preview-strategy.md`
      decision (code examples plus a companion native playground, never a silent
      HTML/CSS reimplementation) — the strategy is implemented (plan 412) and all
      20 Tier 1 pages landed with plans 422 and 423
`[ ]` **licensing**: record the GPUix (Apache-2.0) and Lucide (ISC) provenance and
      any icon/blend decision in `LICENSES/`

## Phase C — Tier 1–2 components

`[x]` `[██████████]` 3/3

`[x]` Tier 1 foundational components (code + test + example + docs + inventory) — every row runtime-verified, with in-package and `apps/docs` pages (plans 422–424, 435)
`[x]` Tier 2 composition/feedback components (same bar)
  - [x] Write and index the Tier 2 plan set (plans 110–117)
  - [x] `packages/components` package, token/primitives adapters, native test harness
    - [x] Package scaffold (package.json, tsconfig, vitest config, README)
    - [x] `internal/collection.ts` (index arithmetic), `internal/key.ts` (key predicates)
    - [x] `internal/theme.ts` adapter over the landed token API (plan 110 §6) — the tokens workstream is merged into this branch
    - [x] `runtime.test.tsx` — the renderer guard (plan 117 §5b): a lifted dynamic import decides `available` / `unsupported-host` / `missing`, and fails on a supported host. Proven to fail by adding this host to `supportedHosts`.
    - [x] `internal/test-root.tsx` (`renderComponent`) — renders under a theme; runs here now that the native binding loads
    - [x] `internal/a11y.ts` — the accessibility dump normalised for assertions (role case, `value` vs `label`)
    - [x] Behaviour suites under a second config (`src/behaviour/`, `test:behaviour`): a static GPUix import fails to *load* on an unsupported host, so `describe.skipIf` cannot gate them (plan 117 §5a/§5c). **The split stays**: the suites now run here, on hosts with a binding
  - [x] Foundation parts: Card, Badge, Avatar, Alert, EmptyState, List (plan 111)
    - [x] `internal/collection.ts` (List single-selection core, shared with Tabs/menus)
    - [x] Card: `src/card.tsx`, behaviour suite, example, docs page, inventory record — **verified natively** (5/5, `nub run --filter @gpuixui/components test:behaviour`)
    - [x] Badge: `src/badge.tsx` + `toneSurface` in the theme seam, behaviour suite (7/7), example, docs page, inventory record
    - [x] Avatar: `src/avatar.tsx` + `src/avatar/logic.ts` (unicode-safe initials), behaviour suite (7/7) + logic suite (8), example, docs page, inventory record
    - [x] Alert: `src/alert.tsx`, behaviour suite (10/10, real click + keyboard), example, docs page, inventory record — the dismiss control is `internal/button.tsx`
    - [x] Local button stand-in: `src/internal/button.tsx` (`Button`, `IconButton`), behaviour suite (9/9); plan 110 §7 amended
    - [x] EmptyState: `src/empty-state.tsx`, behaviour suite (6/6), example, docs page, inventory record
    - [x] List / ListItem: `src/list.tsx` over `internal/collection.ts`, behaviour suite (12/12: real focus, wrap over disabled rows, controlled), example, docs page, inventory record
  - [x] Overlays: Dialog, Confirmation dialog, Popover
    - [x] Plan 112 §1/§1b re-measured against 0.10.0 and corrected: there is **no** `Dialog`, `DismissableLayer`, `pushDismissLayer` or `anchored fill="window"`, so the overlays are local implementations over host elements
    - [x] Plan 112 §1b's five overlay probes answered and recorded in plan 112 §1c — the veil must be an `<anchored position={{x:0,y:0}}>`, because `position:"absolute"` resolves against the mount parent; `focusNextWithin` wraps; a focused `tabIndex={-1}` node receives keys
    - [x] `internal/dismiss-layer.ts` (topmost-layer-wins, one event consumes one layer) + `dialog.tsx` (+ 5 logic tests, 12 native behaviour tests)
    - [x] `confirm-dialog.tsx` — Cancel-first, caller-owned close, loading locks both dismissals (+ 5 native behaviour tests)
    - [x] `popover.tsx` — `FloatingLayer` anchoring, Escape restores focus, Tab/outside press do not, mouse-down re-open guard (+ 8 native behaviour tests, both themes)
    - [x] Examples, docs pages and inventory rows for Dialog, Confirmation dialog and Popover
    - [x] Plans 112/113 reference `keyboardFocusDim` and `focusVisible`, which 0.10.0's `StyleDesc` does not have — corrected in the plans before any overlay style was written
    - [x] `StyleDesc` has per-side border *widths* but a single `borderColor`; a separator that needs its own colour uses a 1px `div` or `borderColor` (as `CardFooter` does). Plan 111's footer row uses `borderColor`.
    - [x] Plan 112's `DialogContent` names the surface through `aria-label` only (0.10.0 has no `aria-labelledby`; verified in `AnchoredProps`/`HostProps`)
  - [x] Disclosure and navigation: Tabs, Accordion, Collapsible, Breadcrumb, Pagination (plan 113)
    - [x] Logic: `accordion/logic.ts`, `breadcrumb/logic.ts`, `pagination/logic.ts`, `tabs/logic.ts`
    - [x] `tabs.tsx` + 8 native behaviour tests (automatic/manual activation, wrap, disabled, controlled)
    - [x] `collapsible.tsx` + 4 native behaviour tests (unmounts while closed, Enter/Space, controlled)
    - [x] `accordion.tsx` + 8 native behaviour tests (single/multiple, collapsible, disabled, null close)
    - [x] `breadcrumb.tsx` + 5 native behaviour tests (collapse keeps the ends, separators follow their item)
    - [x] `pagination.tsx` + 8 native behaviour tests (edges, current page no-op, both themes)
    - [x] Examples, docs pages and inventory rows for all five
  - [x] Menus: Dropdown, Context, Command (plan 114)
    - [x] Logic: `menu/logic.ts` over the shared collection
    - [x] `menu/state.ts` + `menu/item.tsx` + `menu/surface.tsx` (the shared row registry, highlight-follows-focus, menu keyboard rules)
    - [x] `dropdown-menu.tsx`, behaviour suite (9/9), example, docs page, inventory row
    - [x] `context-menu.tsx` on `onAuxClick` + `isRightClick` and an `anchored` surface at the pointer (6/6), example, docs, inventory
    - [x] `command-menu.tsx` composing Dialog + the shared row look; input keeps focus, Enter arrives as `submit` (8/8), example, docs, inventory
  - [x] Choice inputs: Search input, Combobox (plan 116)
    - [x] Logic: `combobox/logic.ts` (ranking + selection)
    - [x] `search-input.tsx` + 6 native behaviour tests (typing, clear + focus, Enter, Escape once, controlled)
    - [x] `combobox.tsx` wrapping GPUix's headless combobox with pre-ranked items; 10 native behaviour tests (ranking, value payload, single/multiple, disabled, Escape)
    - [x] Examples, docs pages and inventory rows for both
  - [x] Feedback: Toast system, inline validation (`Field`)
    - [x] `toast/model.ts` + test (the `ToastInput` boundary type and the queued `Toast`)
    - [x] `toast/store.ts` + test (queue, monotonic ids, `FiberMap` timers, `TestClock`)
    - [x] `validation/logic.ts` + test (`validate` / `validateAll` over schema issues)
    - [x] `toast/provider.tsx` + `viewport.tsx` + `toast.tsx` (ManagedRuntime boundary, `useToast`, viewport) + 7 native behaviour tests
    - [x] `field.tsx` (Field/FieldLabel/FieldDescription/FieldError/FieldInput) + 5 native behaviour tests
    - [x] Examples, docs pages and inventory rows for Toast and Field
  - [x] Date / time picker (plan 119) — the day picker is done; a time picker is documented as out of scope
  - [x] Tier 2 verification matrix and inventory sync check (plan 117)
    - [x] `src/inventory.ts` + `src/inventory.test.ts`: files exist, rows agree, no duplicates, `done` implies a behaviour test
    - [x] `src/behaviour/theme-matrix.test.tsx`: the both-theme matrix for the 11 components without one
    - [x] Six records corrected from `gpuixSupport: "yes"` to `partial` where the runtime lacks the ARIA surface or a keyboard path
`[x]` Verify every component in both themes

## Blockers (project-level, with evidence)

`[x]` **The GPUix native runtime now loads on this machine, so the Tier 2 behaviour
suites run here.** Resolved 2026-10-17 08:57 by plan `140` (playground workstream):
`@gpuix/native@0.10.0` publishes no `darwin-x64` binary, so the pinned source was
built locally with `gpui_macos/runtime_shaders` (which removes the build-time
`xcrun metal` dependency) and the resulting `gpuix-native.darwin-x64.node` is in
the store, hard-linked across worktrees. Verified from `packages/components`:
`nub run --filter @gpuixui/components test:behaviour` runs the real
`TestRenderer` and Card's suite passes 5/5.

Evidence, 2026-10-17 (the failure this replaced): `uname -m` → `x86_64`;
`@gpuix/native@0.10.0` published only `-darwin-arm64`, `-linux-x64-gnu`,
`-win32-x64-msvc`; loading it failed with `mach-o file, but is an incompatible
architecture (have 'arm64', need 'x86_64')`.

Still true and worth remembering:

- The `wasm` build exports only `GpuixRenderer`, not `TestGpuixRenderer`.
- The binding is a **locally built artifact**, not a published one: a clean
  `nub install` on a bare host still has none, so the behaviour suites stay out
  of the default `test` run (plan 117 §5a–§5c) and a host without a binding
  reports `unsupported-host` from `src/runtime.test.tsx`.
- On an Apple-silicon Mac, Linux x64 or Windows x64 the published binding works
  with no local build.

`[x]` **nub's isolated linker does not install optional platform binaries of
transitive dependencies.** `@gpuix/native-darwin-arm64` (an optional dependency
of `@gpuix/native`) was absent from the store entry; `nub install --node-linker
hoisted` links it. Superseded on this host: the store now carries a locally built
`darwin-x64` binding (first entry above), hard-linked across worktrees.

`[x]` **Two sessions wrote this worktree at once — B3, resolved 2026-10-17
08:56.** Root cause and permanent fix: plan `022-swarm-single-writer.md`
(primitives worktree). Measurement for this worktree: plan
`118-single-writer-components.md`, which also records the resolution: the stale
turn `ses_eb7f09666ffeRRbJxPz0d344Cw` (07:12) committed and pushed everything it
produced and stood down, because the rotating `run-components.sh` turn is the one
the supervisor can see and replace. Re-verified at 08:56 and again at 09:00: the
`session_v2` count is `1`, and the tree is clean apart from the untracked
`nub.lock` and `references` symlink. The permanent fix — pinning `--session` and
teaching `agent_alive` to count live server-side sessions (plan 022 §5) — is
still the coordinator's, in `scripts/`.

`[!]` **`@gpuix/react@0.10.0` (the latest published release) is far behind the
reference clone in `~/GPUIXUI/references/gpuix`.** Verified against the installed
package, 2026-10-17:

| Surface | Reference clone | installed 0.10.0 |
| ------- | --------------- | ---------------- |
| `KeyEvent` type, `preventDefault`, `defaultPrevented` | yes | **no** — handlers receive `EventPayload` |
| `Button`, `buttonProps` | yes | **no** |
| `Dialog` + parts, `DialogPortal/Backdrop/Popup` | yes | **no** |
| `DismissableLayer`, `pushDismissLayer`, layer stack, focus restore | yes | **no** |
| `FloatingLayer`, `renderSlot`, `useControllableState`, `mergeStyles` | yes | yes, via `@gpuix/react/floating` |
| `Select` + parts, `Combobox` + parts, `Tooltip` + parts | yes | yes |
| `motion`, `AnimatePresence` | yes | yes |
| WASM build exports `TestGpuixRenderer` | no | no |

Consequences for Tier 2: Escape dismissal, layer stacking, focus-in/out and
Tab trapping must be implemented in this package on top of `renderer.focusElement`
/ `focusNextWithin` / `focusPreviousWithin` and element-level `onKeyDown`, instead
of relying on the clone's `DismissableLayer`. `Button`/`buttonProps` and
`Dialog` parts must be equivalent local implementations over `<div>` + host props
until `packages/primitives` and a newer `@gpuix/react` land. Plans 110 §1/§7 and
112/114 have been corrected for this.

Related: the reference clone must not be treated as the API of the pinned
dependency anywhere in this repo, and `package.json` pins must stay explicit.

`[!]` **Two sessions write this worktree at once — B3, still live** (measured
2026-10-17 08:47). Root cause and permanent fix: plan
`022-swarm-single-writer.md` (primitives worktree). Measurement for this
worktree: plan `118-single-writer-components.md`. Two live top-level sessions
hold `workspaces/components` at the same time —
`ses_eb7f09666ffeRRbJxPz0d344Cw` (07:12:12, a stale turn from an earlier tick)
and `ses_eb7a7c3edffeSehcVqeqHJEsYa` (08:31:44, the current `run-components.sh`
turn). `run-components.sh` starts a new `opencode run` session every iteration
and does not own the turn, so a turn that outlives its CLI call keeps writing
while the loop starts another on top of it; `agent_alive` only checks the runner
pid, so the supervisor cannot see the duplicate. Between 08:40 and 08:47 the tree
gained `card.tsx`, `behaviour/card.test.tsx`, `docs/card.mdx`,
`examples/card.example.tsx` and the commits `7786193`, `f424b1e`, `ab000ab` —
none authored by the supervisor's session. **Response:** this workstream stopped
writing component code the moment the duplicate was confirmed, restoring the
one-writer invariant; the one clean non-overlapping commit (`22f706c`, the
status-tone palette) is preserved. No session was deleted — that is the
coordinator's call and would discard the stale session's in-flight work (plan
022 §4/§7). Resume `packages/components` only when the plan 118 §5 check prints
`1` twice. **Re-measured 08:54:** the pair rotates — `ses_eb7a7c3e…` went idle and
`ses_eb795d97…` took its place while the stale turn stayed live — so the count
stays `2` and the condition **cannot** be met by agent discipline; it needs plan
022 §5's pinned-session fix (coordinator, `scripts/`). Component code stays
paused on a green, pushed `HEAD`; plan 118 carries the measurement.

## Interlocks (cross-workstream dependencies)

Work that this workstream needs but does not own. Another agent owns each row.

| Need | Owner | Status |
| ---- | ----- | ------ |
| `@gpuixui/tokens` roles in plan 110 §6 | tokens-theme | **resolved** — the workstream is merged into `agent/components`; `internal/theme.ts` is the seam over it |
| Serialise writers per worktree: a second live session writes `packages/components` alongside the supervisor's; root cause in plan `022` (primitives), this worktree's measurement in plan `118` | repo tooling (`scripts/`) | **pending — components work paused until fixed** |
| Decide the GPUix version: stay on 0.10.0 and implement dismiss layers/focus locally, or ship a release that includes `Dialog`/`Button`/`DismissableLayer` (0.10.0 is the latest published) | owner / playground | pending |
| Soft tone pair per status (`info`, `infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft` + readable foregrounds) so the local `tone()` helper can be deleted | tokens-theme | pending |
| `alpha(color, amount)` helper so the local `withAlpha()` can be deleted | tokens-theme | pending |
| An `info` status role so Alert/Badge/Toast stop borrowing `accent` | tokens-theme | pending |
| An avatar diameter scale (20/26/32/40) so `DIAMETER` in `avatar.tsx` can be deleted | tokens-theme | pending |
| `@gpuixui/primitives` exports in plan 110 §7 | primitives | pending — **blocking nothing meanwhile**: `internal/button.tsx` is the local `Button`/`IconButton` stand-in (plan 110 §7 amendment), to be deleted when the package lands |
| A `primaryHover` / `destructiveHover` role pair so filled buttons stop using a half-alpha fill for hover | tokens-theme | pending |
| Playground mounts the Tier 2 examples and runs a dialog/menu/toast smoke | playground | pending |
| Docs site renders `packages/components/docs/*.mdx` and the example registry | docs-site | **resolved** — the 22 pages landed with plan 425, each with its generated props and the package's own example |
| `scripts/verify-two-directions.sh` uses `jj`, which is not installed (D1) | tooling | pending |
| `nub.lock` reproducibility | tooling | **resolved** — tracked on `master` |
| `LICENSES/`: record GPUI Kit = Apache-2.0 (+ CC BY 4.0 for its docs prose, Lucide ISC for icons, no NOTICE file); shadcn/ui is referenced as design inspiration only, not copied source | licensing | pending |

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

`[~]` `[███░░░░░░░]` 1/3

`[ ]` Consistency, keyboard, themes, composability pass
`[ ]` Performance and packaging
`[x]` Docs truth pass against the implementation — the 20 component pages and the pre-component pages audited (plans 410 §13, 424); guarded by `component-truth.test.ts`

## Phase G — release readiness

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Clean-environment install and public-export checks
`[ ]` Licence inventory and attribution complete
`[ ]` All gates green (`nub run check`, `nub run lint`, `nub run test`)

## Swarm-owned blockers (fix these)

- **B1** GPUix native bindings fail to install (blocks the playground + every native smoke test).
- **B2** No durable scheduler — the swarm runs on a detached daemon; launchd and cron do not fire here.

Both are specified in `BLOCKERS.md`; each fix starts with a plan under `.agents/slop/plans/`.

## Docs site workstream (plans 410–473)

`[x]` `[██████████]` 79/80

`[x]` **A part name finds its component (plan 481)** — `DialogTitle` and every
      other declared part is searchable from ⌘K and the index filter, and a
      built-site query guards the production index
`[x]` **State ownership on the interactive compound pages (plan 480)** — 19
      records became `stateful` (21 total), each page names what it owns and what
      the consumer owns, and two claims were corrected against the source
`[x]` **Preview card gets a live scene (plan 478)** — `defaultOpen` mounts the real anchored card, so an interaction-only page now shows the component on GPUix's wasm renderer instead of only a static approximation; the hover policy stays with the native suite

`[x]` **Mention input's suggestion list is a live scene (plan 477)** — the gap reason said no prop opens the list, but the query comes from the field's text: an initial `@tok` mounts the real ranked list, so the page now renders it on GPUix's wasm renderer; the gap set falls from seven to six

`[x]` **Drawer and Navigation menu get live scenes (plan 476)** — both ship the open prop their gap reason denied (`Drawer.defaultOpen`, `NavigationMenu.value`), so the two pages now render the real open surface on GPUix's wasm renderer; the gap set falls from nine to seven and the document, the code and the records agree

`[x]` **A live scene's canvas must be sized (plan 475)** — the scene loop accepted a `ready` flag on a 1×1 frame, and the plan-474 run measured `dropdown-menu ready — 1x1 canvas` passing; every scene now waits for a canvas larger than 1×1, and a forced threshold fails the first scene with `timeout`

`[x]` **The live-surface gate proves light mode too (plan 474)** — the scene loop hard-coded `mode=dark` and the page loop never asserted the mode, so a renderer or wiring that ignored light passed the release gate; the scheme is now forced through CDP, the Button scene's light and dark frames are compared (with two identical dark captures proving determinism), and both forced defects fail by name

`[x]` **The page surface waits for a sized canvas (plan 473)** — the page half of `smoke:preview` accepted a `ready` flag on a 1×1 frame, so the first page it visited could be blank and still pass; every frame now has to reach more than 1×1, and all twelve page loads report 606×358

`[x]` **A live scene looks for text its component paints (plan 472)** — four scenes asserted their own `<Text role="h3">` heading, so the surface smoke stayed green with the Icon, ScrollArea, Skeleton or Spinner missing; three now assert component-region text, `skeleton` keeps a written exception, and the guard names any scene that returns to its heading

`[x]` **The command-menu live scene renders its parts (plan 471)** — the palette mounted an empty dialog because the scene passed `actions` and no children, and the contract guard passed on a string that lived in the actions array; the scene mounts `CommandMenuInput`/`List`/`Empty`, a new guard names the parts, and `smoke:preview` is green again (15 text nodes, was 2)

`[x]` **The Contributing page names every docs check (plan 470)** — six commands with what each proves and its exit codes (`2` is never a pass), the Studio authoring command, and a guard that reads `apps/docs/package.json` so the next smoke cannot ship undocumented

`[x]` **The page template checks content, not only headings (plan 466)** — every delivered page must keep a `tsx`/`ts` example importing `@gpuixui/` under Usage, an `<auto-type-table>` under API reference and an `<include>` under Source; each rule fails on a real page when its block is removed
`[x]` **Fumadocs Studio authors the pages (plan 467)** — a dev-only `studio` command opens `content/docs`; every one of the 84 pages round-trips byte-for-byte, a parse failure names the page, no editor module reaches `dist`, and Studio serves `200`
`[x]` **Tier 2 page truth (plan 463)** — eight pages stop denying features the components ship: accordion header keys, list multi-select and type-ahead, dropdown/context submenus and 500 ms type-ahead, command-menu subsequence ranking, toast pause and one action, the real reason the dialog/search glyph is text; `preview-server.ts` waits 90 s so a 45 s cold start is not reported unverified
`[x]` **`docs/preview-strategy.md` gap truth (plan 464)** — the document names all nine pages with neither a live scene nor an illustration, `gaps.ts` owns the set, and `preview-gaps.test.ts` fails when the document and the code disagree
`[x]` **The record's limitations stop denying shipped features (plan 465)** — the `shippedFeatures` table now also reads each record's limitations, so the status block above a page cannot contradict the prose below it; seven stale strings corrected (list, toast, dropdown, two context, command, accordion)
`[x]` **The compound contract meets real components (plan 462)** — Tabs and Toasts are `pattern: "stateful"` with real parts, both pages carry `## State and ownership`, and the Toast page includes the viewport source it tells the reader to render; the three guards that were fixtures-only now run on shipped records, with two-direction proofs
`[x]` **The search suite survives a cold, loaded host (plan 468)** — its first query builds the index for every page; 30 s failed 2 tests when 41 other files ran in parallel and 120 s passes 42 files / 260 tests, with no assertion changed
`[x]` **The page-template guard stops tripping the test-quality checker (plan 469)** — a regex containing backticks after a space truncated the checker's block parse, so a test that asserts was reported as unable to fail; the fence check is now a line test, with the same two-direction proof
`[x]` **Document the 17 Tier 2 components merged from `master` (plan 461)** —
time picker, message scroller, fieldset, form, navigation menu, preview card,
drawer, stepper, timeline, colour picker, tag input, mention input, hotkey
recorder, countdown, carousel, inline edit and keycap: records, pages, real
examples, generated props, sources, the date/time row split and 13 tier-A
previews (the four interaction-only pages carry a measured tier-V reason).

`[x]` The registry mirrors the inventory's GPUix-support column (plan 443) — `ours`/`reuse` are real values, the nine flattened records are corrected, a test reads `COMPONENTS.md`, and `done` is backed by its native suite rather than by GPUix writing the primitive
`[x]` Preview surfaces follow the docs' dark mode (plan 444) — a dark page painted light previews because the surface took `next-themes`' pre-hydration `undefined` and never re-rendered; one tested `previewMode` + `useSyncExternalStore` snapshot fixes it, verified in headless Chrome in both modes
`[x]` Previews follow the platform toggle on a shared link (plan 445) — `?platform=win32` showed Windows chrome with Menlo previews; previews now read the `data-platform`/`dark` state the providers publish, through one tested parser (`parsePreviewState`), superseding 444's mount gate
`[x]` Hydrated previews are in the release gate (plan 446) — `smoke:browser` loads the production build in headless Chrome and fails on a wrong palette or platform on every preview surface; exit `1` for a broken site, `2` when Chrome or the server is missing
`[x]` The measured GPUix capability page (plan 448) — `/docs/capabilities` renders all 15 inventory capabilities from one docs module, guarded against `COMPONENTS.md` and the playground scenario registry; Workspace and Data display now show their measured subset instead of a promise paragraph; 39 files / 228 tests, 68-page crawl
`[x]` The component index finds what the registry proves (plan 454) — the filter matches documented props types and limitations, and the built-site smoke queries a component's prose so a production index that lost the component pages fails the gate
`[x]` **Live GPUix surface previews (plan 455)** — the published 0.10.0 wasm renderer runs the real Button scene behind a labelled click-to-load iframe on the Buttons and Theming pages; the native tier stays beneath it, `smoke:preview` proves the scene reaches GPUI's tree in headless Chrome (real time), the page wiring, and that `?platform=win32` reaches the renderer
`[x]` Live scenes for the rest of the delivered components — one per interaction record first (Tabs, Dropdown menu, Dialog), each with its own `LIVE_SCENES` key, a real composition and a smoke assertion; the tier-A list and the components' platform-styled previews stay as they are — plan 456: four scenes with a JSX-free expectation table, the per-page iframe check, and a readiness probe for the renderer's window handle
`[x]` Live scenes for Popover and Command menu (plan 457) — six scenes total; the smoke derives its page URLs from `LIVE_SCENES` and a contract test pins `slug === scene`
`[ ]` Live scenes for Context menu and Date picker — blocked on the component API: `ContextMenu` needs a `point` prop (its surface is fixed at the internal `{ x: 0, y: 0 }`) and `DatePicker` needs `defaultOpen`; owner: `components`; a scene is never faked
`[x]` Live scenes for the five pages a real surface can show without a new component API (plan 458) — Icons, Scrollable containers, Skeletons, Loading indicators and Confirmation dialogs; eleven scenes, and `scene-contract.test.ts` fails on a delivered page with neither a live scene nor an illustration unless its reason is listed
`[x]` Every `liveScene` gap is measured: Tooltip, Combobox and Select hide their open state behind a wrapper with no `open`/`defaultOpen`; Toast races its own dismissal and pulls the Effect runtime into the shared scene bundle (`TODO.md` cross-team row, `docs/preview-strategy.md`)
`[x]` Architecture page truth (plan 459) — it names all seven packages with real edges, includes the live surface in the preview list, and no longer promises `docs/architecture.md`; `prose-truth.test.ts` reads `packages/*/package.json` and fails on an absent `docs/*.md`
`[x]` The site stops denying the live surface (plan 460) — the introduction, getting-started, examples, landing page and 19 component pages; a live-scene page may never carry the old denial, and the landing page lists the live tier as its first preview

`[x]` Merge `master` (playground + `packages/testing` + ADRs 0001–0003) into `agent/docs-site`; reconcile PLAN/COMPONENTS/TODO/plan index and keep every gate green
`[x]` A props type name (`ButtonProps`) reaches its component page from search (plan 442)
`[x]` `/docs/api-reference` is an index of every documented component's real props types, generated from the registry instead of a demo type (plan 441)
`[x]` Curated native theme captures on Theming (plan 433) — a real 20/20 capture run, two frames + provenance sidecar, `<ThemeCaptures />` refuses an unproven frame

`[x]` Write and index the docs-site plans (410, 411, 412, 413, 414, 415, 416)
`[x]` Scaffold `apps/docs` (Fumadocs + TanStack Start, build + dev work) — build, dev, type-check and tests verified
`[x]` Docs identity: light/dark themes from the tokens theme — reconciled to `@gpuixui/tokens` (plan 416); every `--color-fd-*` role is pinned to a library role by `theme.test.ts`
`[x]` Theming and typography pages generated from the package (plan 416) — all 47 colour roles and 10 text roles render from `@gpuixui/tokens`, and the pinned runtime's missing `registerFont` is documented
`[x]` Searchable component index (plan 417) — title/summary filter with live count and empty state; verified hydrated in headless Chrome (`combobox` → 1 of 64, `zzz` → 0, clear → 64)
`[x]` Absolute canonical/OpenGraph URLs, generated `/sitemap.xml` and `/robots.txt` (plan 418) — `SITE_URL` defaults to the deploy domain and accepts `VITE_SITE_URL`; verified against the dev server (16 `<url>` entries, absolute canonical on `/docs/installation`)
`[x]` Working search (server route + UI) — `/api/search?query=installation` returns the Installation page and `/api/search` with no query returns `[]`; the dialog was exercised in headless Chrome (typing `installation` lists the page, Escape closes)
`[x]` Information architecture pages (`content/docs/**`) + landing page — guarded by `src/content.test.ts`; all 16 sitemap pages and every internal link return 200, an unknown slug returns 404, and the 390px mobile sidebar was verified in headless Chrome
`[x]` Component metadata contract, registry test, generated index (plan 411)
`[x]` Preview components + `docs/preview-strategy.md` (plan 412) — tier selection and screenshot provenance are enforced; a capture without its sidecar is never shown
`[x]` Per-page document metadata (plan 413) — every page's title, description, OpenGraph tags and canonical URL come from its frontmatter; verified against the dev server in both directions (`<title>GPUIXUI</title>` before, `<title>Installation — GPUIXUI</title>` after)
`[x]` Copyable real source (plan 414) — component pages include the real file with Fumadocs' built-in `<include>` instead of a custom component; `content-references.test.ts` guards broken paths, missing regions, silent self-closing tags, `auto-type-table` paths and a finished component's page omitting its source
`[x]` API metadata (plan 415) — the generator is verified in this app, a real table renders on `api-reference.mdx`, and `type-table.test.ts` pins the props-type contract (`@internal` hidden, optionality, unknown name → nothing); the generator's cache ignores options, so no type is generated twice with different options
`[x]` Content truth audit of the pre-component pages — every repository path a page names checked against the file system; three present-tense claims about documents that do not exist yet corrected (`architecture`, `theming`, `typography`); evidence in plan 410 §13
`[x]` Component package names checked against the repository — the `Icons` row claimed `@gpuixui/primitives`; it is `@gpuixui/icons` (plan 411 §9a)
`[x]` Component-page contract enforced (`component-pages.test.ts`) — the template lists the required sections and every finished component's page must carry them plus the `ComponentState`/`NativePreview` blocks; the template had no `Composition` section (plan 411 §9b)
`[x]` Document the first real component page — Buttons: registry → page → real source → generated API table → honest preview tier X (plan 422)
`[x]` Document every Tier 1 component (plan 423) — 20 pages with real source includes and generated props tables; sidebar, sitemap, search and index agree
`[x]` Docs platform toggle (macOS · Linux · Windows · Default) built on `platformTypes` + `platformTheme`; URL + storage state, live values on Theming (plan 420)
`[x]` A planned component's search result opens the index filtered to it (plan 421)
`[x]` Docs truth pass against the implementation (plan 424) — 20 pages audited against source, inventory and the shared keyboard module; `component-truth.test.ts` guards repo paths, placeholder prose and real package exports; one tooltip import defect fixed
`[x]` Document every delivered Tier 2 component (plan 425) — 22 pages with generated props, real source and their own examples; 42 component pages total
`[x]` Prose truth pass over the non-component pages (plan 426) — `layouts`, `examples`, `getting-started` and `installation` now describe the landed packages and the real `basic-app`; `prose-truth.test.ts` fails on the old claims and guards future drift
`[x]` First real pattern page (plan 427 Part D) — `patterns/settings-form.mdx` documents `examples/basic-app` with its real source, the verification table and `pattern-pages.test.ts`; Plans index and sidebar updated
`[x]` Every component page states its dependencies (plan 428) — the list is derived from each record's real entry file, rendered by `<ComponentDependencies>`, and re-derived by `dependencies.test.ts`; all 42 pages carry the section
`[x]` The inventory owns component status (plan 429) — the registry mirrors each `COMPONENTS.md` row (22 Tier 2 rows move to `done`), `registry.test.ts` parses the inventory and fails on drift, and the landing page counts **Documented** instead of reporting "Implemented 0"
`[x]` Theming renders every token group from the package (plan 430) — `<TokenScales />` generates spacing, radius, border width, icon size, density and elevation; its test fails on a dropped group, a dropped row or a retyped value, and proves both directions
`[x]` Search relevance (plan 431) — a component title match outranks prose (`button` → its page), a blank query returns `[]`, and a page is listed once; each rule proven to fail when removed
`[x]` Native coverage is not the absence of a capture (plan 432) — tier V names each delivered component's real GPUix suite and command on all 42 pages instead of calling it "Not verified"; the registry guard derives the command and proves the suite imports the component
`[x]` Platform-styled previews (plan 434) — the toggle reaches four labelled tier-A previews (Button, Tabs, Dropdown menu, Card) built from the whole active `Theme`; source, page and platform guards pass; browser-verified at `?platform=win32` (Consolas on every preview surface)
`[x]` Document the seven delivered Tier 1 value/choice components (plan 435) — Slider, Range slider, Meter, Number field, OTP field, Toggle and Rating: `wip` records, pages, generated props tables, real sources and their examples; 49 component pages, 180 docs tests, sitemap and search verified
`[x]` Prose truth: the site no longer calls the built playground missing (plan 436) — getting-started, examples, architecture and the intro now describe it, the five preview tiers and the quick start's Bun/`check-types` prerequisite; the widened `prose-truth.test.ts` failed on both stale pages first (8 claims) and the command-resolves guard is proven in both directions
`[x]` The component sidebar names its tiers (plan 437) — `meta.json` separators at the Tier 1/Tier 2 boundary, one shared `tierGroupTitle` rule with the index, the registry guard proves a missing or misplaced separator fails, and the IA guard no longer treats a separator as a page
`[x]` Internal link integrity (plan 438) — every literal `/docs` link in the content tree and the app resolves to a real page; the guard failed on the shipped `layouts.mdx` → `/docs/components/grid` link first, the page now points at the Stack page that documents `Grid`, and 184 docs tests pass
`[x]` Built-site smoke check (plan 439) — `nub run --filter docs smoke:build` builds, serves and crawls the production output (66 pages, 85 links, search, 404, robots); it found and fixed two nested `<main>` landmarks on `/` and the 404, exits `1` on a broken canonical and `2` when it cannot verify, and the default suite guards the landmark regression without a server
`[x]` Landing page showcase (plan 440) — `/` now renders the real light/dark palettes, the macOS/Linux/Windows families, documented-of-tracked counts per tier and the five honest preview tiers, all derived from `@gpuixui/tokens` and the registry; no colour literal, no hand-counted number, no component image, and four two-direction proofs
`[x]` The tokens and theming API reference (plan 447) — `/docs/tokens-api` generates the `ThemeConfig`/`Theme` shapes, lists all 13 exported helpers and the React provider, and fails when a helper or a table name is missing; 215 docs tests, 67-page built-site crawl
`[x]` Tier-A preview coverage (plan 449) — eight static Tier 1–2 pages (text input, checkbox, switch, slider, badge, alert, progress, avatar) now carry a labelled rest preview built only from the active theme; 12 previews in total, all under the platform toggle, with a content guard and a hydrated `?platform=win32` badge check
`[x]` Preview coverage prose stops hand-counting previews (plan 450) — the four stale "four previews" claims are gone, and `prose-truth.test.ts` fails when a page states a total different from the preview registry
`[x]` Tier-A previews for the nine remaining static Tier 1 controls (plan 451) — text area, radio group, select, range slider, meter, number field, OTP field, toggle and rating; 21 previews in total, and `theme-surface.test.ts` fails when a preview reads a `--preview-*` name the surface does not define (29 shipped kebab-case names fixed)
`[x]` Tier-A previews for the eight static Tier 2 compositions (plan 452) — list, empty state, inline validation, breadcrumb, pagination, search input, accordion and collapsible; 29 previews in total, all under the literal and variable-name guards
`[x]` Tier-A previews for the seven static layout/typography pages (plan 453) — text, separator, spacer, stack, box, button group and label; 36 previews in total, and every component page whose rest state is static now carries one (13 interaction/animation/icon pages stay at tier V/X)
`[x]` **Compound parts and their API tables (plan 479)** — 29 compound records
      declare their real parts, every exported `<Part>Props` gets a generated
      table, the menu pages include their row and submenu sources, and the
      generated prop rows no longer bury prose in search

`[~]` Plan 427 Parts A–C — the compound/workspace metadata (`parts`,
      `pattern`, `persistence`), the conditional page template, the
      part-source and `kind: "interaction"` preview guards are landed
      (`component-meta/contract.ts`, `registry.test.ts`,
      `component-pages.test.ts`, `content-references.test.ts`,
      `preview.test.tsx`); Tabs and Toasts now prove the contract on shipped
      records (plan 462), and the Tier 3–4 pages still wait on
      `packages/data-grid` / `packages/docking`

## Cross-team tasks raised by the docs-site workstream

`[~]` `[██░░░░░░░░]` 6/29

`[ ]` **Licensing**: record the MIT licence for `@fumadocs-editor/core`, `@fumadocs-editor/ui` and `@fumadocs-editor/studio` (dev-only authoring dependencies, plan 467) in `LICENSES/`. `apps/docs` cannot write the licence inventory; owner: licensing
`[ ]` **Components**: expose the two props the remaining live scenes need — `ContextMenu.point` (its surface paints at an internal `{ x: 0, y: 0 }` set only by the trigger's aux click) and `DatePicker.defaultOpen` (it owns its open state). Plans 457 and the preview strategy record why both stay at their native tier until then
`[ ]` **Components/primitives**: expose the open state the wrappers hide, so a live scene can prove it — `Select` and `Tooltip` (primitives) and `Combobox` (components) have no `open`/`defaultOpen`, while GPUix's primitives do; a headless check cannot prove a hover- or click-opened surface. Plan 458 records the three asks; no scene is faked meanwhile
`[ ]` **Components/primitives**: a consumer composing both packages must nest two theme providers — primitives own `ThemeProvider`, components read `@gpuixui/tokens/react` and fall back to the light theme without it. The live scenes painted light-on-dark until `apps/docs` mounted both (plan 457 §9). Unify the context or document the nesting in both package READMEs

`[ ]` **Repo tooling (`scripts/check-tests.ts`)**: a regex literal whose `/` follows a space is read as division, and backticks inside it then open a phantom template literal, so a real `it(...)` block can be truncated to `"("` and reported as assertionless. The docs guard worked around it without the `check-tests-ok` escape (plan 469); the parser should accept a regex after whitespace when the previous non-space token cannot end a value. Owner: whoever owns `scripts/`
`[ ]` **Deploy: confirm the production host serves `/gpuix-preview/`** — the live surface adds a 19.1 MB wasm asset to `apps/docs/public/` (under Workers' 25 MiB per-asset limit). Run `smoke:preview --base-url <deploy>` once the deploy path is verified; owner: packages/deploy, with `docs-site` verifying.
`[ ]` Owner: hoist the `apps/docs` stack (fumadocs, tanstack, tailwind, vite) into the root catalog
`[ ]` **Repo docs**: `docs/architecture.md` is listed as a deliverable in `docs/README.md`, but the site no longer promises it (plan 459 rewrote the Architecture page). Write the maintainer document there, or drop the row from `docs/README.md`; owner: this workstream owns `apps/docs`, not `docs/README.md`
`[-]` Repo tooling: oxfmt now ignores `**/.source/**` and `**/routeTree.gen.ts` (edited in this workstream)
`[ ]` Repo tooling: `.gitignore`'s `references/` does not match the worktree's `references` symlink, so it shows as untracked and can be committed by accident; ignore the symlink too
`[x]` Root `nub.lock` is committed — `master` tracks it, so a clean install resolves the same versions
`[ ]` Repo: AGENTS/PLAN name an integration branch `main`, but only `master` exists and the shared checkout is on it — confirm the name before workstreams merge. `agent/docs-site` has merged `master` (playground + testing) and is green at `552bc43`; it still waits on a coordinator because `master` is another tree's branch and this workstream must not push to it
`[ ]` **Supervisor: two writers in one worktree.** A docs-site loop session (`run-docs-site.sh` → `opencode run`) and the interactive docs-site session wrote `workspaces/docs-site` at the same time on 2026-10-17 08:38–08:52: the loop committed the other session's in-flight edit together with its own work, and reverted a line of it mid-run. Evidence in `.agents/slop/docs-site-concurrency.md`. Per AGENTS §6 this session stopped the loop (both pids) to become the single writer. Fix: treat a live writer as owning the tree — either track interactive sessions, or refuse to start a workstream whose tree has uncommitted changes from a different pid. Owner: whoever owns `scripts/swarm-supervisor.sh`
`[x]` Tokens-theme: expose a dependency-free token data export the docs site can read for token tables — `@gpuixui/tokens` (root entry) is consumed by the docs site; plan 416 renders the colour and type tables from it
`[ ]` **Tokens-theme: ship the real per-platform style variants `MISSION.md` now requires.** `platformTheme` changes only the type families and the theme name (plan 051), so the docs platform toggle can only change the mono face. The docs side is ready (plan 434): every labelled preview reads the whole active `Theme`, so per-platform colours, spacing, radius, density and border values reach all four previews with no docs edit. Needs: three editable variant themes in `packages/tokens` pre-styled for macOS/Linux/Windows, their contrast guard, and `docs/tokens.md` updated; the docs then verifies "toggles macOS → Windows and every preview changes" visually. Do not add platform colours in `apps/docs`.
`[x]` Components/primitives: export tsdoc-annotated props types the docs site can turn into API tables — `ButtonProps` generates the real 14-row table on the Buttons page (plan 422); the contract is executable in `apps/docs/src/lib/type-table.fixture.tsx` / `type-table.test.ts` (plan 415)
`[ ]` Playground: add a **per-component** screen (one per delivered component) so component pages can move from tier V to tier S — the capture script exists and produced 20/20 frames (`nub apps/playground/dist/smoke/run.js --screenshots`), but the scenarios are capability probes, not component screens. The sidecar contract (`provenance.json` beside each PNG) is enforced by `preview.test.tsx`, so a capture without it will not render
`[ ]` **Components/examples**: provide one real composed source for the confirmation flow (`ConfirmDialog` + a form + `Toast`) and one for the command palette (`CommandMenu` + `Dialog`) — plan 427's remaining pattern pages cannot land until a runnable composition exists; do not write a page from separate component examples and call it a pattern
`[x]` Docs site: the first real component page — Buttons shows its source via `<include>`, generates its API table from `ButtonProps`, sits in `content/docs/components/meta.json` and the sitemap, and relates to a planned component without a 404 link (plan 422)
`[ ]` Primitives: the `packages/primitives/docs/tooltip.mdx` usage snippet imports `Icon` from `@gpuixui/primitives`; it lives in `@gpuixui/icons`. The docs-site page was corrected during the truth pass (plan 424); fix the package page too
`[ ]` **Primitives**: declare `effect` as a runtime dependency — `RadioGroup`, `Select` and `Spinner` import `effect/Array` / `effect/Option` at runtime, but `packages/primitives/package.json` lists `effect` only in `devDependencies`. Found while deriving the docs dependency lists (plan 428)
`[ ]` **Examples**: `examples/basic-app`'s `dev` script runs `bun src/main.tsx`; Bun is not installed on this host and AGENTS pins nub as the toolchain, so the documented quick start (`nub run --filter @gpuixui/basic-app dev`) fails before it reaches GPUix. Replace the runner (nub/tsx) and verify, or document Bun as a prerequisite. The Examples page now states the current truth
`[x]` Canonical and OpenGraph URLs are absolute — resolved in the docs workstream by plan 418: `SITE_URL` defaults to the deploy domain (`docs.gpuixui.dev`) and is overridable with `VITE_SITE_URL`; no change to `packages/deploy` was needed
`[ ]` **Plan numbering collision in the docs block**: `origin/master` adds
      `.agents/slop/plans/433-platform-theme-recipes.md` while `agent/docs-site`
      already ships `433-theming-native-captures.md`. Renumber one before either
      is executed. The recipes' docs half is also blocked: it needs editable
      per-platform variants in `packages/tokens` (the row above) and a
      Linux/Omarchy host for Recipe B; `apps/docs` must not invent the colours.
      Owner: coordinator / tokens-theme.
`[ ]` Owner: the Alchemy deploy path (`nub run deploy:docs`) is unverified — it needs Cloudflare credentials and lives in `packages/deploy`. The stand-down path is verified locally (plan 410 §3)
`[ ]` Repo: `README.md` still says "Phase A (audit and feasibility)" although Phase B tokens and the docs site are implemented; update the ledger to match `TODO.md`
`[ ]` Owner: `packages/README.md` still lists only `config` and `deploy` under "Present"; `tokens`, `primitives`, `components` and `icons` have shipped (the docs prose now describes them, plan 426)
`[ ]` Owner: `examples/basic-app/README.md` says `@gpuixui/tokens` "has not landed yet" and carries a stand-in palette; the package is on `main` and the docs page (plan 426) points readers at the example — reconcile the README
