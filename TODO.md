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

`[x]` `[███████░░░]` 32/44 plans-and-harness

`[x]` Plans `100`–`158` written and indexed for the playground workstream
`[x]` **Blocker B1 fixed**: the `darwin-x64` GPUix 0.10.0 binding builds from source with `gpui_macos/runtime_shaders` (the `xcrun metal` step is optional) and loads — plan `140`, ADR 0003
`[x]` **The native smoke suite is 32/32 green on this host** — `nub run --filter playground build && nub apps/playground/dist/smoke/run.js` exits `0`, writes `smoke-report.json` and 32 screenshots. Two-direction proof recorded (plan `140` §4, plan `150` §4, plans `151`–`166` §8: exit `1` when a check is broken). Every capability in `COMPONENTS.md` is now `verified 0.10.0`
`[x]` Probe the modal contract per plan `155`: `modal-focus-trap` — component code moves native focus (`renderer.focusElement`), Tab wraps inside the surface (`focusNextWithin`/`focusPreviousWithin`), focus returns to the trigger, and a nested popover's Escape closes only the popover — 19/19 green (fails with exit `1` when the Tab trap or the focus return is removed)
`[x]` Probe floating placement per plan `156`: `floating-placement` — `side`/`sideOffset`/`align="start"` are exact; **`align="center"` is off by half the panel** and `fit="snap"` clamps inside the window without flipping, so a bottom-side menu can cover its trigger — 20/20 green (fails with exit `1` when the layer ignores `side`)
`[x]` Probe native motion per plan `157`: `motion-collapse` — the paused motion clock makes a 200 ms width tween exact (96 px of 240 at 80 ms), the inner pane keeps its 240 px width (outer clipping, no reflow), and `AnimatePresence` retains the leaving toast until the native exit settles; `onMotionComplete` needs `dispatchNativeEvents` — 21/21 green (fails with exit `1` when the mid-tween expectation is a jump value)
`[x]` Probe roving focus per plan `158`: `roving-focus` — programmatic focus reaches a never-clicked row and the next key is delivered there; inside a `<virtual-list>` focus survives the window scrolling past it and stays in the painted set; 22/22 green (fails with exit `1` when the focus move is removed)
`[x]` Probe the runtime accessibility tree per plan `160`: `a11y-tree` — roles map, names are **not** derived from text, CheckBox/Switch have no checked state, and a virtual list exposes only the painted window; 26/26 green
`[x]` Probe the published popups per plan `159`: `select-choose`, `combobox-filter`, `tooltip-open` — all three work natively and are `verified`; the suite is now 25/25 and the host gained `hover`
`[x]` Probe native content surfaces per plan `161`: `native-surfaces` — `<svg>`, `<img>` and `<diff>` are retained **and painted** (bounds fire from `on_painted`); `<img>` paints `img: no src` / `img: load failed` fallbacks and `setImagePixels` uploads through the ref; **`<canvas>` is retained as a node but renders `gpui::Empty`** — no bounds, children dropped from the paint log, so charts and the colour picker cannot use it; a corrupt PNG with a valid MIME is indistinguishable without pixel readback — 27/27 green (fails with exit `1` when the canvas is swapped for a div, or when the data-URL fallback count changes)
`[x]` Probe cross-element drag targets per plan `162`: `drag-targets` — capture keeps every move and the up on the source; **hover is frozen during the drag** and settles as `A:leave>B:enter` after release; the gesture ends in a **click on the source**; `onFileDrop` carries paths and coordinates, the drop simulation emits moves, and a drop on an element without a handler emits **no drop but a click**; 28/28 green (fails with exit `1` when the drop handler is removed or the gesture is swapped)
`[x]` Probe native text selection per plan `163`: `text-selection` — cross-element selection joins with newlines exactly; `<code>`/`<diff>` copy only line text (no line numbers, headers, gutters or markers); **a drag anchored inside `userSelect: "none"` selects nothing**, while one crossing it skips it; `clearSelection` and a click leave it empty — 30/30 green (fails with exit `1` without `userSelect: none`, or without `clearSelection`)
`[x]` Probe workspace restore per plan `167`: serialise split width, tab order, active tab and the virtual-list anchor; prove a reset loses them and a remount restores them exactly, including `scrollToItem`'s `offsetInItem` — 28 checks, suite `32 → 33`
`[x]` Probe scrolling a virtual row into view per plan `166`: `scroll-into-view` — `focusElement` alone reveals an off-window row; `scrollToItem(list, 120)` anchors `[120, 0, 280]` and `scrollIntoView(row 10)` anchors `[10, 0, 280]` exactly; **`getScrollOffset` saturates on a virtual list** so persistence reads `getListScrollTop`; a scroll does not move focus — 32/32 green (fails with exit `1` when `scrollIntoView` is a no-op or the index is wrong)
`[x]` Probe a virtualized tree per plan `165`: `virtualized-tree` — 328 flattened rows inside `<virtual-list>`; `paddingLeft` still indents 16 px per depth; expanding 8 ↔ 48 rows repaints the window with no stale child; click and arrows move selection **and native focus** by roving index, and an off-window focused row stays painted and still receives the next key — 31/31 green (fails with exit `1` when the indent, the focus move or the flattening is removed)
`[x]` Probe the right-click context-menu contract per plan `164`: `context-menu-pointer` — a right click is `onAuxClick` + `isRightClick` with **no `button`** and no `onClick`; a child's right click bubbles; `<anchored position={pointer}>` is exact **inside a scrolled container** (no offset, no clipping, an item below the viewport still activates); outside press and Escape dismiss; `shift-f10` opens and Escape returns focus — 30/30 green (fails with exit `1` when the open call, the position or the focus return is removed)
`[~]` Probe the remaining Tier 1 controls natively per plan `169`: `RadioGroup` arrow selection/wrap, `Rating` clamp/clear, `NumberField` step/clamp, `OTPField` focus advance and Backspace
`[x]` Probe the shipped Tier 1 primitives natively per plan `168`: mount `@gpuixui/primitives` (`Button`, `Toggle`, `Input`, `Checkbox`, `Switch`, `Select`, `Slider`, `Progress`, `Meter`, `Skeleton`, `Tooltip`) through the tokens theme and add the `components` capability — 36/36 green, two-direction proofs recorded
`[ ]` Cross-team: `@gpuixui/components` must handle the measured floating defects — `PopoverContent`/`DropdownMenuContent` expose `align="center"`, which is short by half the panel on both axes, and `fit="snap"` does not flip, so a near-bottom menu must choose `side="top"` itself (owner: `components`; evidence: plan `156` §8)
`[ ]` Cross-team: `motion.div`'s published `MotionDivProps` omits `testId`, `role` and the `aria-*` props, so an animated surface cannot be addressed in a smoke test or given an accessible role through the typed API. Add a typed motion wrapper (published `HostProps` + `motion`) in `@gpuixui/components` and use it for Collapsible/sidebar/toast surfaces (owner: `components`; evidence: plan `157` §8)
`[ ]` **Promote the playground workstream to the integration branch**: `origin/master` still carries only the `apps/playground/README.md` placeholder — none of the 57 commits (plans `100`–`166`, `packages/testing`, the playground, ADR 0001–0003) are on it. `agent/playground` is a **fast-forward** of `origin/master` (0 commits behind), so the promotion is conflict-free; the workstream's own instruction is *never push to master*, so an owner/supervisor performs the merge
`[ ]` Cross-team: `@gpuixui/components` plan `117` §5a still reports the native renderer as **unavailable** on this host, so its 21 Tier 2 behaviour suites are not collected. ADR 0003 fixed that: point the behaviour config at the locally built `darwin-x64` 0.10.0 binding (or run on CI) and record the measured verdicts (owner: `components`; evidence: plan `140` §4, ADR 0003)
`[ ]` Cross-team: **charts and the colour picker must not build on `<canvas>`** — it is retained but renders `gpui::Empty` on 0.10.0 (no bounds, children dropped). Use `<svg>` for static drawing and `<img>` + `setImagePixels` for live bitmaps (owner: `components`; evidence: plan `161` §8, `COMPONENTS.md` Charts / Color picker)
`[ ]` Cross-team: **drag-and-drop and detachable tabs must hit-test pointer coordinates** — hover is frozen during a captured drag, the drag still ends in a click on the source, and a drop on an element without `onFileDrop` produces a click. The component owns the drop indicator and click suppression (owner: `components`/`docking`; evidence: plan `162` §8)
`[ ]` Cross-team: export the composed examples from `@gpuixui/primitives` (`"./examples": "./examples/index.ts"` in its `exports` map) so the playground can show and smoke the ten realistic compositions its README already points at; plan `168` builds against the public root export for now (owner: `primitives`)
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
`[ ]` Cross-team: the docs' honest native previews need **committed** images; the smoke run writes 18 frames to the gitignored `apps/playground/.artifacts/screenshots`. Decide (docs-site) whether to commit a curated set under the docs app and how it is refreshed; never substitute a browser reimplementation. Owner: `docs-site`
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

`[~]` `[████░░░░░░]` 4/6

`[ ]` Land the workspace, boundaries and package scaffolding that has real content
`[x]` Land tokens and the theming architecture (light + dark, semantic roles)
`[x]` Land the primitives package
`[x]` **Native smoke test**: layout, input, focus, overlay, scroll, panel and virtual-list primitives verified in real GPUix 0.10.0 on this host (11/11, plan `140` §4)
`[x]` Land one fully working component running in GPUix — all 19 Tier 1
      components mount in the real `TestRenderer` (plan 041; 119 runtime tests
      after plan 055), and the playground drives the shipped package through the
      token theme (`primitives-actions`, `primitives-fields`,
      `primitives-display`, plan `168`)
`[ ]` Land the docs shell and document that component in Fumadocs

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
resolves from source (owner: those workstreams; plans 016–018).
**Primitives half done** in plan 021 (`Theme` re-export, `focusRing`,
`elevationShadow`); `components` is still outstanding.
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
`[x]` `packages/primitives`: the `core/` layer (theme re-export, style
      resolution, variants, keyboard, state, layout, selection, loading) with
      tests
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
`[x]` `packages/icons`: the size scale is `@gpuixui/tokens`' `iconSize`, not a
      second copy (plan 024)
`[x]` `packages/primitives`: `Input`/`TextArea` gain an honest `disabled` state
      (read-only, out of the tab order, guarded handlers) — plan 025
`[x]` `packages/primitives`: close three fixable limitations — a named
      `ButtonGroup`, `ScrollArea` scroll deltas, RadioGroup Home/End (plan 048)
`[x]` `packages/primitives`: the RadioGroup focus contract — a per-item focus
      ring, focus following the selection, a derived roving index, and
      `Switch`'s ignored `invalid` prop (plan 049)
`[x]` `packages/primitives`: Tier 1 runtime suites in `runtime/` — 46 tests
      against the real GPUix 0.10.0 `TestRenderer` (layout, controls, fields,
      loading, icons), with the two-direction proof; results in plan 041 §9
`[x]` `packages/primitives`: consume `@gpuixui/tokens` directly — delete the
      structural theme port and the local ring/shadow helpers, use `focusRing`
      and `elevationShadow`, and verify both shipped themes in the runtime
      (plan 021)
`[x]` `packages/primitives`: `alpha` comes from `@gpuixui/tokens`; delete the
      local copy and its test (plan 023)
`[x]` `examples/basic-app`: compose the Tier 1 set into one settings-form workflow
      (typed + `check-types` green; the app itself is **never run** — it needs a
      desktop session, while the primitives it composes are runtime-verified)
`[x]` `packages/primitives`: the extra Tier 1 controls are claimed here (D18):
      `Slider`, `RangeSlider` and `Meter` (plan 053) — value maths, paint,
      element trees, runtime geometry and focus proofs, docs pages and a
      composed example; the rest of the claimed rows are plan 054
`[x]` `packages/primitives`: `NumberField`, `OTPField`, `Toggle` and `Rating`
      landed (plan 054) — core modules, element-tree and runtime suites, docs
      pages and examples. `OTPField`'s multi-character fill is proven as a pure
      rule; a real clipboard paste is unverifiable in 0.10.0 (no `onPaste`, no
      clipboard simulation) and is documented as such
`[x]` `packages/primitives`: the remaining theme axes are runtime-proven (plan
      055) — the high-contrast palettes in both modes, a density override
      measured against the preset metrics, and `platformTheme`'s mono family
      reaching the paint; 13 files / 119 runtime tests
`[ ]` `packages/primitives`: docs pages for every Tier 1 component (docs-site workstream)
`[ ]` **packages/testing** (playground workstream): hoist `runtime/harness.ts`
      into the shared smoke framework once the package lands — plan 041 §2.2
      records why it is duplicated for now

### Cross-workstream dependencies (do not edit their paths — record only)

`[x]` **resolved (D18)**: `COMPONENTS.md`'s extra Tier 1 rows — Slider, Range
      slider, Meter, Number Field, OTP Field, Toggle, Rating — are claimed by
      the primitives workstream: they are single-purpose input/selection/value
      primitives built from `div` + `<input>` + our keyboard contract, which is
      this package's definition (plans 053, 054). They stay outside MISSION's
      Tier 1 list but are in the inventory, so they are built to the same bar.

`[x]` **root**: `nub.lock` is generated by `nub install`; `master` now tracks it,
      so a clean install resolves the same versions (Phase G).
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
`[x]` **root**: `PLAN.md`'s "GPUix cannot run" decision (now D10 after merging
      `master`'s infrastructure decisions) is marked superseded: plan 140 built
      the binding and plan 041 used it.
`[x]` **tokens workstream**: `packages/tokens` exports light and dark themes that
      are the primitives' `PrimitiveTheme` (plan 021 proves it in the offline and
      runtime suites)
`[ ]` **playground workstream**: resolve the runtime blocker — either run the
      published wasm renderer in headless Chrome
      (`@gpuix/native@0.10.0/wasm`, COOP/COEP headers, `--enable-unsafe-swiftshader`),
      or get a `darwin-x64` source build / a GUI session
`[ ]` **playground workstream**: Tier 1 runtime tests in `packages/testing` —
      render, hit-test, Tab order, Enter/Space activation, checkbox/switch toggle,
      radio arrow navigation, scroll offset, a11y-tree dump. These are the tests
      that move a `wip` component row to `done`
`[ ]` **docs-site workstream**: Tier 1 component pages + the `docs/preview-strategy.md`
      decision (code examples plus a companion native playground, never a silent
      HTML/CSS reimplementation)
`[ ]` **licensing**: record the GPUix (Apache-2.0) and Lucide (ISC) provenance and
      any icon/blend decision in `LICENSES/`

## Phase C — Tier 1–2 components

`[~]` `[███░░░░░░░]` 1/3

`[~]` Tier 1 foundational components (code + test + example + docs + inventory):
      all 19 components have code, tests, a runtime-verified interaction, an
      in-package docs page, a mounted example and an inventory row; **docs-site
      pages are still pending** (docs-site workstream)
`[ ]` Tier 2 composition/feedback components (same bar)
`[x]` Verify every component in both themes (`runtime/theme.runtime.test.tsx`: both palettes, a live switch, and no colour outside the active palette)

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

Both are specified in ; each fix starts with a plan under .

- **Docs: platform toggle (macOS / Linux / Windows / Default)** — every component preview switches platform style; the styles are real editable token themes in packages/tokens, not docs-only CSS (see MISSION.md).
