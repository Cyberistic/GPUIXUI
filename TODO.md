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
      after plan 055)
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

`[x]` `[██████████]` 80/80

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
`[x]` `packages/primitives`: `ToggleGroup` — the segmented control and
      formatting set the inventory already claimed as a "merged variant" but
      never had. Single/multiple selection, a roving tab stop, arrows that
      select in `single` and only move focus in `multiple`, disabled skipping
      (plan 056). Also fixed the selected-but-disabled radio leaving its group
      with no tab stop (regression test in `selection.test.tsx`)
`[x]` `packages/primitives`: `Select` accessibility — GPUix's headless Select
      set no ARIA role, so the wrapper produced **no accessibility node at
      all**. It now supplies combobox/listbox/option, `expanded`, `selected`
      and the value text, measured in the runtime (plan 057)
`[x]` `packages/primitives`: accessible names for text `Button`/`Toggle` — the
      runtime does not derive a button name from painted text, so every text
      button was unnamed. Text-only children now become the name, an explicit
      `label` wins, and non-text content stays unnamed (plan 058)
`[x]` `packages/primitives`: `Text` semantics — the docs claimed the runtime
      exposed no heading, but `<text role="heading" aria-level>` maps. `h1`-`h3`
      are now headings with levels and `code` is `Code`; `display` stays flat
      (plan 059)
`[x]` `packages/primitives`: `Tooltip` placement — the tip anchored to the
      surrounding layout, not its trigger (a column put it at the container's
      edge/centre; a row put it below the row), and the runtime's `center`
      align is half a panel off. The root now hugs the trigger and the default
      align is `start`; three runtime and two offline tests, both directions
      proven (plan 060)
`[x]` `packages/primitives`: `RadioGroup` gains `invalid` — every other
      selectable control could show a failed validation, the radio could not.
      The empty circles take the destructive border, a chosen one keeps its
      accent; measured in the runtime and in the element tree (plan 061)
`[x]` `packages/primitives`: **`Select`'s list never matched its trigger.**
      Measured: `minWidth: "100%"` in `selectContentStyle` resolves against the
      layer, so a 108 px trigger and a 900 px `fullWidth` trigger both opened a
      57 px list. The wrapper now measures the trigger (renderer
      `getElementBounds`, refreshed on open and on a size/fullWidth change) and
      passes a numeric `minWidth`; the dead percentage is gone. Measured in the
      runtime, both directions proven (plan 062)
`[x]` `packages/primitives`: **a slider drag is captured, and only the primary
      button may start one.** The docs claimed "no pointer capture" but the
      runtime captures the pressed element (the playground's `panel-resize`
      already proved it); a right or middle click also moved the value and
      focused a range thumb. The gesture is now `button === 0`, five runtime
      tests cover the captured drag and the refusal, and every false claim is
      corrected (plan 063)
`[x]` `packages/primitives`: **`autoFocus` fields paint no ring.** The runtime
      focuses on mount without dispatching `onFocus`, so the tracked focus state
      stayed false and the field looked unfocused. It now starts from the prop;
      five runtime tests prove the ring on mount and that it clears on blur, and
      the limitation is deleted from the docs (plan 064)
`[x]` `packages/primitives`: **`CheckboxGroup`** — the inventory's "Checkbox
      Group" variant had no component; the example hand-rolled the parent
      maths. Data-driven rows, one interactive element per option (the visible
      label is the hit area and the tab stop), an optional select-all parent
      with a derived mixed state, and a core rule that never clears a disabled
      option (plan 065)
`[x]` `packages/primitives`: **`Select`'s list covered its own trigger** at the
      window's bottom edge — the runtime's `fit="snap"` clamps without flipping
      (measured: list `y 724..792` over a trigger at `740..772`). The wrapper
      now estimates the list height from its own styles and opens above when it
      does not fit below; an explicit `side` still wins. Pure side rule,
      estimate-vs-styles guard, and two runtime placement tests with both
      directions proven (plan 066)
`[x]` `packages/primitives`: **`Tooltip`'s tip covered its trigger at the
      window's top edge** — the same clamp-without-flip rule: measured tip
      `y 8..34` over a trigger at `y 12..30`. The wrapper measures its root and
      flips the tip below when it does not fit above, sharing
      `decideVerticalSide` with `Select` (a `preferred` side keeps tooltips
      above by default). Estimated height pinned to `tooltipStyle`; two runtime
      tests, both directions proven (plan 067)
`[x]` `packages/primitives`: **`Select`'s list ran off the window** — nothing
      capped it, so 30 options painted a 908 px layer from `y 8` and left the
      last option at `y 888` in an 800 px window, unreachable. The list is now
      capped to the free space on its side and scrolls; option rows are
      `flexShrink: 0` so they keep their height instead of squashing. Measured
      cap + wheel scroll + last option reachable, with three regression
      directions (plan 068). **Its recorded keyboard limitation is fixed by plan
      069** (the published `SelectItem` does expose `highlighted`)
`[x]` `packages/primitives`: **`Select`'s keyboard highlight did not scroll the
      capped list.** Plan 068 concluded there was no active-index signal; the
      published `SelectItem` passes `highlighted` to its state children, so the
      wrapper now scrolls the newly highlighted option into view through the
      renderer. Measured: 40 Down presses move the 60-option list from offset
      `0` to `-455` and keep "Option 39" inside it; a list that fits does not
      move. Three runtime tests, both directions proven (plan 069)
`[x]` `packages/primitives`: **`Rating` could not show a failed validation** —
      every other value-bearing control painted `invalid`; the rating's colour
      resolver had no branch. Empty stars now take `destructive` and a chosen
      one keeps `primary` (the `RadioGroup` rule); measured in the element tree
      and the runtime (`<svg>` tint), both directions proven (plan 070)
`[x]` `packages/primitives`: **`Tooltip` content reached no assistive
      technology** — the tip painted but produced no accessibility node, and the
      trigger carried no description. A string tip is now the trigger's
      `aria-description` and the open tip is a named `role="tooltip"` node; the
      feedback example's info icon is a named `role="img"` so the keyboard path
      works (plan 071)
`[x]` `packages/primitives`: the remaining theme axes are runtime-proven (plan
      055) — the high-contrast palettes in both modes, a density override
      measured against the preset metrics, and `platformTheme`'s mono family
      reaching the paint; 13 files / 119 runtime tests
`[x]` **examples/basic-app** (owner: primitives workstream, outside
      `packages/primitives`): the info-icon tooltip trigger was a bare `Box`,
      which forwarded neither `tabIndex` nor a role, so the tip was hover-only
      and absent from the accessibility tree. It now uses **`InfoTip`**, the
      hoisted shape (a named focusable `img` trigger with a focus ring); the
      app's stale README (stand-in theme, never-run claims) is refreshed — plan
      073
`[x]` `packages/primitives`: **`InfoTip`** — the info-icon tooltip trigger as a
      component. It was hand-rolled in the feedback example and shipped broken in
      `basic-app`; one named, focusable `role="img"` trigger with a decorative
      icon, a string description and a focus ring. 3 element + 3 runtime tests,
      both directions proven (plan 073)
`[x]` `packages/primitives`: **`ScrollArea` could not be scrolled by keyboard**
      — the runtime never scrolled a focused container, focus does not bubble
      from a child, and Tab could land on a control painted outside the region.
      A labelled area is now a named focusable `region` with
      arrow/page/Home/End scrolling through the renderer, guarded by the
      runtime's focused id so fields inside keep their keys; an unlabelled area
      stays inert. 7 core + 3 element + 5 runtime tests, both directions proven
      (plan 072)
`[x]` `packages/primitives`: **docs/export coverage guard** — the docs half of
      the component bar (a page per component, indexed, with frontmatter) was
      hand-maintained and unenforced. `src/exports.test.ts` now fails by name for
      an undocumented PascalCase export, a missing page, or an unindexed page;
      three failure directions proven (plan 074)
`[x]` `packages/primitives`: **`Select` option groups** — the docs claimed
      "no option groups" as a limitation, but GPUix publishes
      `SelectGroup`/`SelectLabel` and maps a named `group`. `options` accepts a
      `SelectOptionGroup` beside a flat option, headings are skipped by the
      keyboard and counted in the placement estimate, and the group is a named
      a11y node (plan 075; 5 core + 2 element + 4 runtime tests, both failing
      directions measured)
`[x]` `packages/primitives`: **`OTPField` was six tab stops** — measured: Tab
      walked `otp-cell-1…6` before reaching the next control, so a form with a
      code step appeared to stall. The field is now **one** roving stop: the
      focused cell while focused, otherwise the first empty cell (the last when
      the code is full); typing moves it with the caret. 3 core + 3 element + 2
      runtime tests, both directions proven (plan 076)
`[x]` `packages/primitives`: **decimal `NumberField` steps carried float noise** —
      a `step={0.1}` field painted `0.3` but reported `0.30000000000000004` to
      its consumer, so the number on screen and the number in state disagreed.
      `stepNumber` now trims its clamped result to 12 decimal places; typed
      precision and bounds are unchanged. 4 core + 1 runtime tests, both
      directions proven (plan 077)
`[x]` `packages/primitives`: **an attached `ButtonGroup` left every button
      rounded** — the clip rounds only the group's boundary, so two contiguous
      buttons met with a rounded notch, and the docs' "hidden by the clip" claim
      was false (the source also told readers to pass a `radius` prop that did
      not exist). `Button` gains `radius`; an attached group provides `"none"`
      through React context, the group supplies the clipped rounded ends, and
      an explicit per-button `radius` wins. 1 element + 2 runtime tests, both
      directions proven (plan 078)
`[x]` `packages/primitives`: **state-aware `style` (slice 1)** — the
      components workstream's contract (`docs/component-api.md` §3, plan 305)
      asks every Tier 1–2 part to style from a public state object through the
      runtime's `StateStyle`/`resolveStyle`. `Button`, `Toggle`, `Checkbox`,
      `Switch`, `Input`, `TextArea` and `NumberField` now accept
      `StateStyle<<X>State>` and export their state type; the callback's result
      merges last and object styles are unchanged. 7 element-tree + 4 runtime
      tests, both directions proven (plan 079)
`[x]` `packages/primitives`: **state-aware `style` (slice 2)** — the group
      roots (`CheckboxGroup`, `RadioGroup`, `ToggleGroup`, `Rating`, `OTPField`,
      `Slider`, `RangeSlider`), `Label`, `ScrollArea` and `Select` accept and
      export their state type; 9 element-tree + 2 runtime tests, both directions
      proven (plan 080)
`[x]` `packages/primitives`: **per-item styling for the data-driven groups** —
      `optionStyle`/`rowStyle`/`itemStyle`/`thumbStyle`/`starStyle`/`cellStyle`
      and a `Select` `triggerStyle`; each state includes the item's identity
      (plan 081; 8 element-tree + 4 runtime tests, both directions proven)
`[x]` `packages/primitives`: **`Text`'s `clamp` was decided by whichever
      identical string the runtime laid out first** — the runtime keeps one
      shaped text layout per string/font/width for the whole window and
      `lineClamp` is not in that key, so a clamped copy clipped an innocent
      plain `Text` (measured `36 / 36` px) and was ignored when a plain copy
      came first (`108 / 108` px). `clamp` is now the element's own `maxHeight`
      (`clamp × the role's lineHeight`) plus `overflow: hidden`, which cannot
      leak; a hard cut without an ellipsis is the recorded trade. 3 offline + 5
      runtime tests, both leak directions measured (plan 082)
`[x]` `packages/primitives`: **the capability reference** — `docs/gpuix-capabilities.md`
      answers "does GPUix provide this?" row by row with verdict, evidence and
      workaround, and separates the published 0.10.0 surface from the features
      documented on `references/gpuix` `main`. 8 contract tests guard the rows
      (both directions proven) and `LICENSES/adabraka-ui.md` records the
      reference structure (plan 203)
`[x]` `packages/primitives`: **`Select`'s trigger took focus and painted no
      focus ring** — measured: Tab focused the trigger (element 4) while its
      `boxShadow` stayed `undefined`, the only focusable control in the library
      with no focus indicator, and the trigger had no `testId` so
      `runtime.focused()` could not name it. It now tracks focus and paints
      `focusRing(theme)` while focused or open, is named `${testId}-trigger`,
      and `SelectTriggerState` carries `focused`. 2 offline + 5 runtime tests,
      4 failing in the old direction (plan 083)
`[x]` `packages/primitives`: **the focus-ring matrix** — plan 083's bug class (a
      focusable control that forgets its ring) had no cross-control guard.
      Seventeen `it.each` cases prove Button, Toggle, Checkbox, Switch, Input,
      TextArea, NumberField, OTPField, Select, Rating, ToggleGroup, RadioGroup,
      CheckboxGroup, Slider, RangeSlider, InfoTip and ScrollArea each paint
      exactly one `focusRing`, of the exact value, inside the control. 17/17
      green; both the zero-ring and the two-ring direction fail as they should
      (plan 084)
`[x]` `packages/primitives`: **`Button.onClick` was mouse-only** — measured: a
      button wired with the familiar `onClick` reported **0** calls on Enter and
      1 on a click, because the key path called `onActivate` alone, so every
      consumer using the obvious prop shipped a keyboard-dead control (the
      components workstream's contract passes `onClick`). Pointer and key now
      share one path: `onClick(event)` then `onActivate()`, with held/disabled/
      loading refused. 2 offline + 4 runtime tests, both directions proven
      (plan 085)
`[x]` `packages/primitives`: **`IconButton`** — the icon-only button the
      components workstream's contract imports (plan `110` §7) had only a local
      stand-in, and the hand-rolled shape got three things wrong: the icon tint
      (needs the variant's *foreground* role), `loading` (painted the spinner
      **and** the icon), and the accessible name (an icon child is not text, so
      the button shipped unnamed). One part: a square `Button` with a required
      `label`, the tint and `iconSize` resolved from the button, and the spinner
      in place of the icon while busy. 6 offline + 5 runtime tests, both
      directions proven (plan 086)
`[x]` `packages/primitives`: **the "`Label` beside it" advice was false** — the
      `Checkbox`/`Switch` docstrings and both docs pages recommended pairing a
      standalone control with a visible `Label`, which is painted text: not
      clickable and not associated (no `aria-labelledby`). The docs now say so
      and point at `CheckboxGroup` for a clickable labelled row; a runtime test
      measures that a label click does not toggle the box (plan 087)
`[x]` `packages/primitives`: **one value callback, `onValueChange`** — the
      accepted cross-package contract names `onValueChange` as the only value
      callback, but thirteen public props were `onChange`, a name that promises
      React's event shape while receiving a value (and the text fields kept it
      "because the table says so"). Every controlled value is now
      `value`/`defaultValue`/`onValueChange`; `Toggle` keeps `onPressedChange`
      and overlays `onOpenChange`. `src/callback-names.test.ts` fails by file
      and line if a component, page or example reintroduces it, and both guard
      directions plus the runtime suites were run (plan `088`)
`[x]` `packages/primitives`: **the tab-order matrix** — every one of sixteen
      controls writes its own "not a tab stop while disabled" guard, the same
      duplication behind plan `076`'s six OTP stops and plan `083`'s missing
      ring. `runtime/tab-order.runtime.test.tsx` proves both halves per control
      (enabled: the next Tab lands inside it; disabled: the next Tab lands on the
      element after it) in 32 cases; both mutations of a `Checkbox` guard fail the
      matrix as they should (plan `089`); `isWithin` is now a harness helper.
`[x]` `packages/primitives`: **the contract** — the accepted Tier 1–2 API spec (`docs/component-api.md`, ADR `0004`) had no Tier 1 record and no guard. `src/contract.test.ts` now holds the parts table (one record per public component: page and state types) and proves export completeness, no `render*`/`*Parts` seam in the root, a real declaration for every advertised state type, the page's state name and required sections, and the verified ARIA subset only. Five mutations failed it; the one real deviation was `IconButton`'s two public renderer seams, now module-level. 7 tests (plan `090`)
`[x]` `packages/primitives`: **an invalid field repainted its whole surface** —
      `controlStyle`'s `invalid` branch assigned the destructive role to
      `backgroundColor`, so a failed `Input`/`TextArea`/`Select` trigger/
      `NumberField`/`OTPField` was filled red under the normal text, and the
      hover/press rules replaced the error border with the healthy one. The rule
      is now boundary-only: the surface stays the field role, the border and ring
      are destructive, and hover/press keep that border (a filled, borderless
      variant is unaffected). 4 core + 1 element-tree + 1 runtime case across
      `Input`/`TextArea`, plus the OTP cell's fill; both directions measured
      (plan 091)
`[x]` `packages/primitives`: **the examples suite did not mount every example** —
      the test named "mounts every registered example" iterated a hand-written
      list of 10 while the registry had 12, so `rating` and `toggle` escaped both
      the mount and the dark-palette pass, and a new example needed no record.
      `SCREENS` now has all 12 and a registry-parity test fails on a missing or
      stale record; both directions measured (plan 092)
`[x]` `packages/primitives`: **no control's accessible name was guarded across
      controls** — three shipped defects were one class (a control that painted
      and took focus but reached assistive technology with no role or no name),
      and `Slider`'s role plus `TextArea`/`NumberField`/`Switch` names had no
      assertion at all. `runtime/name.runtime.test.tsx` now proves 28 role/name
      pairs, a composed scene proves no interactive node is unnamed, and the
      presentational primitives prove they invent no role; measured `TextArea`
      is `MultilineTextInput`. Both directions measured (plan 093)
`[x]` `packages/primitives`: **`Rating` had no hover preview, and the docs'
      reason was false** — the limitation said a preview needed a "which star is
      under the pointer" query the runtime does not provide, but every star is
      its own element with `onMouseEnter`/`onMouseLeave`, so the star *is* the
      target. The stars now preview the prospective value from one pure rule
      while the committed value, `onValueChange` and `aria-valuetext` stay put;
      `disabled`/`readOnly` never preview, an invalid preview keeps the brand
      role, and `starStyle.filled` follows the paint. 3 core + 3 element-tree +
      5 runtime tests, both directions measured (plan 094)
`[x]` `packages/primitives`: **`Tooltip` still accepted the runtime's broken
      `align="center"`** — plan 060 measured the tip's end landing on the
      trigger's centre line, then defaulted to `start` but left `center` exposed,
      so the obvious value was half a panel off. One pure rule maps `center` to
      `start` plus `(triggerWidth − tipWidth)/2`; `Tooltip` measures the open tip
      in a layout effect and never passes the runtime's own centre through. A
      runtime case on a 400 px trigger centres within 1 px (the old direction was
      176.5 px left). 3 core + 1 element-tree + 1 runtime tests (plan 095)
`[x]` `packages/primitives`: **the floating rule assumed every layer sits above
      or below its trigger.** `Tooltip` and `Select` accept all four
      `FloatingSide` values, but `align="center"` was corrected with a *width*
      difference on every side, so a left/right tooltip painted 90 px below its
      trigger (measured tip `y 139` for a true `49`), and only the vertical
      sides computed a `maxHeight`, so a left/right select list painted 908 px
      from `y 12` in an 800 px window, unscrollable, with the last option at
      `y 888.5`. One axis-aware `resolveAlign` (widths above/below, heights
      beside), `availableOn` over all four sides, and a tip-height measurement
      in `Tooltip`. 5 offline + 3 runtime tests, both directions proven
      (plan 098)
`[x]` `packages/primitives`: **the focus ring had two owners** — D17/plan 021
      deleted the primitives' local copy of the tokens helper, but
      `core/selection.ts` still built the same five-field `BoxShadow` by hand, so
      a change to `focusRing` would have to be mirrored there. It now names the
      helper, and `src/core/token-helpers.test.ts` walks the real source and
      fails by file and line when a component builds a shadow instead. 2 tests,
      both directions proven (plan 099)
`[ ]` **components workstream**: `internal/placement.ts` and
      `packages/primitives/src/core/floating.ts` now both know how to correct a
      centre alignment. **Updated 2026-10-18 (plan 098):** the primitives rule is
      no longer horizontal-only — `resolveAlign` takes the difference on the
      layer's own axis (widths above/below, heights beside) and is exported from
      `@gpuixui/primitives/core`. Import it there and delete the local copy so
      the library has one answer again (plans 323, 095, 098). Owner: components.
`[x]` `packages/primitives`: **`ButtonGroup` was the one group that could not
      stack** — `CheckboxGroup`, `RadioGroup` and `ToggleGroup` all take
      `orientation`, but `ButtonGroup` was hard-coded to a centred row, so a
      vertical action stack hugged each label (measured: 45/45/56 px buttons in
      a 1256 px group). It now takes the same prop; `vertical` stacks the
      buttons and stretches each to the group's width under the same clip. 2
      element-tree + 1 runtime + 1 example test, both directions measured (plan
      096)
`[x]` `packages/primitives`: **the caller's `style` did not always win last** —
      the rule the package documents ("merged last": `COMPONENTS.md`'s Box row,
      `docs/component-api.md` §3) had two exceptions where a component re-applied
      its own layout *after* the merge. `Progress` forced `display` /
      `flexDirection` over the caller's style, and `TextArea` re-based `height`,
      `paddingTop` and `paddingBottom` after `fieldChrome` had already resolved
      the caller's `style`, so `style={{ height: 120 }}` painted a one-row field.
      Both now build their layout first and merge the caller last; a
      package-wide guard (`src/components/style-order.test.tsx`) walks the
      element tree of all 29 `render*` functions that take `style` and fails by
      property name, in two independent directions (plan `097`).
`[x]` `packages/primitives`: **a value supplied after mount was ignored** — the
      shared controlled rule froze its mode at mount, so a parent that loaded
      its record later (`value={data?.name}`) never saw it: measured, an
      `<Input value="loaded">` typed `"x"` instead of `"loadedx"`, and a late
      `checked` stayed `"unchecked"`. The mode is now derived from the value
      present on **every render**; all 14 `useControlState` parts share the
      fix. 3 transition tests + 2 runtime tests, both directions proven
      (plan `324`)
`[x]` `packages/primitives`: **a controlled `NumberField` ignored an external
      value change** — the draft text was painted unconditionally, so after the
      parent set `value={5}` the field kept `"123"` and the next keystroke
      reported `1236` instead of `56`. The draft now carries the value it
      started from and the value it reported, and only paints while the current
      value is one of them; 4 unit + 1 runtime test, both directions proven
      (plan `325`)
`[x]` `packages/primitives`: **`NumberField` hid a value supplied after mount**
      — its "untouched fields are empty" gate was decided at mount, so an empty
      field that became controlled later painted nothing and typing `7`
      reported `7` instead of `427`. The gate now also passes when the field is
      controlled on this render; 1 runtime test, both directions proven
      (plan `326`)
`[x]` **examples/basic-app** (owner: primitives workstream): the composed
      Tier 1 workflow has never been mounted, and its consent checkbox's
      accessible name is invisible (no painted label). It is now one visible,
      clickable `CheckboxGroup` row, the real `App` is mounted in the native
      `TestRenderer` (6 workflow tests: mount, skeleton→form, consent gate and
      reachability, save lifecycle, validation, label paint, and Reset
      restoring the form), `autoFocus` was
      measured not to survive a later mount and removed, and the `TestRenderer`
      adapter moved to `@gpuixui/primitives/testing` so both suites share one
      (plan `327`)
`[x]` `packages/primitives`: **`Progress`'s indeterminate fill ignored `tone`,
      and a determinate bar ran the step timer forever** — measured: with
      `tone="success"` the segment painted the brand role (`#000007`, not
      `#000011`), and a determinate mount scheduled the 120 ms interval once for
      its whole life. Both modes now resolve one `progressToneColor`, and
      `useStep` takes an explicit `active`, so a determinate bar schedules
      nothing while an indeterminate one keeps its one timer. 1 element-tree +
      2 runtime tests, both directions proven (plan `328`)
`[x]` `packages/primitives`: **the switch thumb jumped, and the docs claimed
      `motion` was unusable** — the thumb was laid out with the track's
      `justifyContent`, so it teleported from one end to the other, and
      `core/loading.ts`/three docs asserted the package "cannot import
      `motion`". Measured: 0.10.0 publishes `motion`, it animates (`x 0.5 →
      50.5 → 100.5 → 200` over 1 s) and the `TestRenderer` drives it with
      `clockFastForward`, not `advanceTime`. The thumb is now an absolute
      `motion.div` sliding `left` 2 → 12 over 200 ms `easeOut`, resting exactly
      where the layout painter put it (dx 3/13, dy 2 at `md`); 2 core +
      1 element-tree + 2 runtime tests, both directions proven (plan `329`)
`[x]` `packages/primitives`: **`Skeleton circle` painted a pill** — the `circle`
      prop only changed the radius, so the default `width: "100%"` made a bare
      `<Skeleton circle />` a 100 % × line-height ellipse; the docs' avatar
      example hid it by passing both numbers. A circle now takes its height as
      its width, an explicit `width` still wins, and a plain skeleton stays
      `100%`; 1 core + 1 runtime test, both directions proven (plan `330`)
`[x]` `packages/primitives`: **the slider's maximum was not a stop** — with a
      step that does not divide the span (`min 0`, `max 10`, `step 3`) a value
      of `10` snapped back to `9`, so `End` announced a value the track painted
      at 90 %, `ArrowRight` at `9` was stuck, `ArrowLeft` from `10` jumped to
      `6`, and a default `RangeSlider` never reached its own maximum. The stops
      now include `max` and arrow/Page/Home/End movement walks the stops; 6 core
      + 3 runtime cases, both directions proven (plan `331`)

`[ ]` `packages/primitives`: docs pages for every Tier 1 component (docs-site workstream)
`[ ]` **packages/testing** (playground workstream): hoist `runtime/harness.ts`
      into the shared smoke framework once the package lands — plan 041 §2.2
      records why it is duplicated for now

### Cross-workstream dependencies (do not edit their paths — record only)

`[ ]` **tokens workstream**: plan `052`'s `registerFont` does **not** exist in
      published GPUix 0.10.0 — it is absent from the `NativeRenderer` type and
      documented only on `references/gpuix` `main`, which the plan assumed was
      available. Re-plan `052` around installed family names, or wait for a
      runtime upgrade, before implementing (evidence:
      `docs/gpuix-capabilities.md` §5).

`[x]` **components workstream — the primitives import list (plan `110` §7) is
      answered.** `IconButton` now exists (plan `086`). `Icon`/`IconProps` stay
      owned by `@gpuixui/icons` — add that dependency and import it there; a
      second re-export path from primitives would give one component two owners
      (the icon page and size scale live in `packages/icons`). The filled
      destructive variant is named `"destructive"`, not `"danger"`. And
      `Button.onClick` is now the full activation callback (plan `085`), so the
      trigger wiring in `internal/button.tsx` keeps working when the stand-in is
      deleted.

`[x]` **primitives + components — the change-callback name: decided and
      landed.** Every controlled value is now `value` / `defaultValue` /
      `onValueChange(value)` — including the text fields, whose callback already
      carried a value rather than the host event, so `onChange` was a name that
      promised React's shape while delivering ours. `Toggle` keeps
      `pressed`/`onPressedChange` and overlays keep `onOpenChange`, because a
      callback is named after the state it reports. `src/callback-names.test.ts`
      fails by file and line if a component, page or example reintroduces
      `onChange`; both guard directions were proven (plan `088`).

`[ ]` **components workstream — the change-callback table.** Their plan `110`
      §7 table and `docs/component-api.md`'s adoption note still say the text
      fields keep `onChange`; this package now exposes `onValueChange` on every
      control, text fields included (plan `088`), so the import contract and the
      source agree again. Their local input stand-in passes
      `onChange: onValueChange` to the raw host, which stays correct.

`[ ]` **components workstream — replace the local button stand-in.** With
      `@gpuixui/primitives` on the same tree (this branch's merge), `Button` and
      `IconButton` are real exports: delete `packages/components/src/internal/button.tsx`,
      import the primitives, and keep the 9 behaviour tests passing. Primitives
      now guarantees the activation path (`onClick` + `onActivate`), the variant
      foreground tint and the required `label` (plans `085`, `086`) that the
      stand-in re-derived locally. Owner: `components`; the path is outside this
      workstream.

`[ ]` **components workstream — the contract's Tier 1 parts table is missing four
      shipped parts.** `docs/component-api.md` §8's Tier 1 table has no row for
      `CheckboxGroup`, `ToggleGroup`, `IconButton` or `InfoTip`, all of which
      shipped in this package (plans `065`, `056`, `086`, `073`) and are in the
      primitives parts table (`src/contract.test.ts`, plan `090`). Add the rows so
      the accepted contract and both packages agree; the doc is outside this
      workstream's paths.

`[ ]` **components workstream**: plan `201` §2.3 tells the thin context to call
      `useControllableState` from `@gpuix/react/floating`, but that function is
      **not re-exported** in 0.10.0 — it is internal to
      `dist/components/floating` and the public `./floating` module exports only
      `FloatingLayer` + the style helpers. The plan's own STOP condition applies:
      keep one controlled/uncontrolled rule in our `core/state.ts` (primitives)
      or export a local hook (components), and do not import the internal path
      (evidence: `docs/gpuix-capabilities.md` §2).

`[ ]` **components workstream**: a visible label is still inert beside a
      **standalone** Tier 1 `Checkbox`/`Switch`. GPUix has no
      `htmlFor`/`aria-labelledby`, the control keeps its name in `label`, and a
      `Text` beside it is not part of the clickable element. The honest fix is a
      Tier 2 `Field`/`CheckboxRow` that puts the label inside one clickable
      element (with its own keyboard contract); do not add `onClick` to `Box` for
      it — that stays documented as "a container, not an interactive surface".
      **Precedent:** `CheckboxGroup` (plan 065) already does this for option
      rows — one `role="checkbox"` per row with the box, label and description
      inside — so a row component should follow that contract rather than
      inventing a second one.

`[ ]` **docs-site workstream**: `apps/docs` needs a **Checkbox Group** page —
      the component landed on the primitives branch (plan 065) with its
      in-package page at `packages/primitives/docs/checkbox-group.mdx`; the
      existing `checkbox.mdx` on `agent/docs-site` predates it.

`[x]` **examples/basic-app** (owner: primitives workstream, outside
      `packages/primitives`): the info-icon tooltip trigger is now `InfoTip`,
      the hoisted shape (plan 073) — the old bare `Box` forwarded neither
      `tabIndex` nor a role, so the tip was hover-only and absent from the
      accessibility tree.

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
`[ ]` **root**: `README.md` still says "Phase A (audit and feasibility). The
      first deliverable is the plan set" while plans `020`-`059`, tokens,
      primitives, icons, `packages/testing` and `apps/playground` have landed.
      Refresh the status, layout and tooling ledger (owner: whoever owns the
      root ledger; recorded here because it is outside the primitives paths).

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

`[~]` `[███░░░░░░░]` 2/3

`[~]` Tier 1 foundational components (code + test + example + docs + inventory):
      all 31 components have code, tests, a runtime-verified interaction, an
      in-package docs page, a mounted example and an inventory row; the
      workstream's own ledger is the section above; **docs-site pages are still
      pending** (docs-site workstream)
`[x]` Tier 2 composition/feedback components (same bar)
  - [x] Write and index the Tier 2 plan set (plans 110–119)
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
  - Tier 2 hardening after the inventory closed (plans 120+)
    - [x] List multiple selection (`selectionMode="multiple"`, modifiers, range) and the duplicate `COMPONENTS.md` row — plan 120
    - [x] Accordion arrow/Home/End movement between headers — plan 121
    - [x] Context menu Shift+F10 opening and focus return — plan 122
    - [x] Toast pause-on-hover with remaining-time resume — plan 123
    - [x] Toast hold on keyboard focus, composed with hover — plan 124
    - [x] List select-all (`Cmd`/`Ctrl`+A) over enabled rows — plan 125
    - [x] Dropdown menu keyboard opening lands on the first/last row — plan 126
    - [x] Date picker `min`/`max` bounds and a clear action — plan 127
    - [x] Trigger parts merge the caller's ref with their internal one (found by plan 127)
    - [x] Every part that owns a ref composes the caller's too — plan 128
    - [x] Menu type-ahead (`DropdownMenu`/`ContextMenu`) — plan 129
    - [x] List type-ahead over the shared type-ahead core — plan 130
    - [x] Dropdown menu submenus — plan 131
    - [x] Time picker, the time half of the date/time item — plan 132
    - [x] Command menu fuzzy matching and in-group ranking — plan 133
    - [x] List row activation on Enter and click — plan 134
    - [x] Submenu pointer activation and ContextMenu submenus — plan 135
    - [x] SearchInput ref and TabsTrigger onBlur forwarding — plan 136
    - [x] ListItem caller `onClick` forwarding — plan 137
    - [x] Combobox pointer selection coverage — plan 138
    - [x] Inventory test counts and the drifted rows — plan 139
    - [x] Tabs vertical orientation verified: axis keys, layout and manual activation — plan 321
    - [x] Toast actions: one labelled action with a provider-owned handler — plan 322
    - [x] Floating placement truth: compensate `align="center"` from the measured
      panel and flip a snapped surface off its trigger — plan 323 (evidence:
      plan 156 §8; `PopoverContent`/`DropdownMenuContent` promised a runtime
      flip that 0.10.0 does not provide)
    - [x] Cross-team: handle the playground's measured floating defects
      (`align="center"` off by half the panel; `fit="snap"` clamping over the
      trigger) in `PopoverContent`, `DropdownMenuContent` and
      `ComboboxContent` — plan 323; 6 new native tests, both-direction proof
  - Reference adoption
    - [x] 200 — adopt `base-gpui`'s compound-part contract as the Tier 1–2 API spec: `docs/component-api.md`, ADR 0004, `LICENSES/base-gpui.md`, `PLAN.md` D25 and a contract check in `inventory.test.ts` (plan 200; proven to fail by changing one translation row)
    - [x] 201 (components half) — `core/runtime.ts` (`createRuntime`: initial/reduce/query/run), its pure test, the `docs/component-api.md` §7 state-model section, ADR 0005 and PLAN.md D26 (plan 201; both-direction proof: deleting the select branch fails the fold test)
    - [ ] 201 (shared helper) — `packages/testing/src/state.ts` + its test (`runCommands` over a runtime), so suites outside `packages/components` replay commands (owner: playground; this package's `runtime.run` is the same fold)
    - [x] Split Alert into parts — `Alert`, `AlertIcon`, `AlertContent`, `AlertTitle`, `AlertDescription`, `AlertDismiss` over a tone context; 11 native tests; docs, example and API table updated (plan 158)
    - [x] Split the remaining landed deviations named in `docs/component-api.md` §9 into parts — each with its own behaviour test, docs update and inventory row (owner: components). Plans 300–303 are landed.
      - [x] Pagination parts — plan 300
      - [x] CommandMenu parts — plan 301
      - [x] Combobox parts — plan 302
      - [x] DatePicker + TimePicker parts — plan 303
    - [x] Typed-by-position children — plan 304: `PartChildren` (elements/conditionals, never text) plus a family-scoped render check on 32 parents; part identity cannot be a compile error in React 19's JSX types, recorded in `docs/component-api.md` §1 (owner: components)
    - [x] Expose `style` as `StateStyle<PartState>` on the interactive parts — plan 305: 11 parts with exported state types; button-shaped triggers stay on the local stand-in until `@gpuixui/primitives` owns it (owner: components)
    - [x] `packages/primitives` adopts the same contract for Tier 1 (a parts table row is the spec; the package is owned by primitives) (owner: primitives) — landed in plan `090`; `src/contract.test.ts` is the record and the guard
  - Tier 2 gap rows (plan 205; each row gets its own plan before implementation)
    - [x] Write and index plans 309–320 for the twelve remaining gap rows
    - [x] Fieldset — plan 306: groups fields, propagates `disabled` to `FieldInput` (7 native tests; both-direction proof)
    - [x] Stepper — plan 307: read-only multi-step indicator, statuses derived from `value` (8 native tests; both-direction proof)
    - [x] Form — plan 308: owned-value schema validation, one alert summary, decoded `onSubmit`, pending guard (7 native tests; both-direction proof)
    - [x] Drawer — plan 309: 10 native tests; the modal rules extracted from Dialog, whose 18 tests re-pass
    - [x] Keyboard shortcuts / keycap display — plan 310 (owns the accelerator model): 10 accelerator tests + 6 native tests; both-direction proof
    - [x] Timeline — plan 311: 6 native tests; both-direction proof
    - [x] Countdown — plan 312: 9 formatting tests + 5 native tests
    - [x] Inline edit — plan 313: 8 native tests; both-direction proof
    - [x] Tag / token input — plan 314: 10 rule + 8 native tests; both-direction proof
    - [x] Carousel — plan 315: 8 native tests; both-direction proof
    - [x] Hotkey-recorder input — plan 316 (consumes plan 310): 8 capture + 8 native tests; both-direction proof
    - [x] Preview Card — plan 317: 8 native tests; delay, pointer travel and Escape proven
    - [x] Color picker — plan 318 (discrete swatches: 0.10.0 has no gradients): 8 hex + 8 native tests; both-direction proof
    - [x] Mention input — plan 319: 12 rule + 9 native tests; both-direction proof
    - [x] Navigation Menu — plan 320: 6 parts, 10 native tests; both-direction proof
    - [x] Message scroller — plan 206: pinned follow over a 1px tail sentinel, no yank when scrolled up, unread count, jump-to-latest, streamed growth; 11 rule + 10 native tests + 1 theme-matrix case; both-direction proof (behaviour 437, unit 296). Non-virtualized viewport recorded as the limitation (`<virtual-list>` takes an item count, not compound children)
    - [x] Tier 2 gap cluster complete: all twelve landed with code, a native test, an example, a docs page and an inventory row; after plan 206 the suite is behaviour 437, unit 296
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
| Serialise writers per worktree: a second live session writes `packages/components` alongside the supervisor's; root cause in plan `022` (primitives), this worktree's measurement in plan `118` | repo tooling (`scripts/`) | **resolved in this worktree** 2026-10-17 (the stale turn stood down; the tree has read one writer since); the permanent `scripts/` fix (plan 022 §5) is still pending |
| Decide the GPUix version: stay on 0.10.0 and implement dismiss layers/focus locally, or ship a release that includes `Dialog`/`Button`/`DismissableLayer` (0.10.0 is the latest published) | owner / playground | pending |
| Soft tone pair per status (`info`, `infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft` + readable foregrounds) | tokens-theme | **resolved** — landed on `main`; `internal/theme.ts` consumes `statusTone` (plan 157) |
| `alpha(color, amount)` helper | tokens-theme | **resolved** — landed on `main`; the local `withAlpha` is deleted (plan 157) |
| An `info` status role so Alert/Badge/Toast stop borrowing `accent` | tokens-theme | **resolved** — `infoSoft`/`infoSoftForeground` are the tone's roles (plan 157) |
| `@gpuixui/tokens`' React file compiles with this package's `jsxImportSource`; tokens cannot resolve `@gpuix/react` under the isolated linker | tokens-theme | pending — worked around in `packages/components/tsconfig.json` `paths`; durable fix is a tokens devDependency or pragma |
| `packages/testing/src/state.ts` + test: `runCommands(runtime, commands)` for suites outside this package (plan 201) | playground | pending — `runtime.run` in `packages/components` is the same fold meanwhile |
| An avatar diameter scale (20/26/32/40) so `DIAMETER` in `avatar.tsx` can be deleted | tokens-theme | pending |
| `@gpuixui/primitives` exports in plan 110 §7 | primitives | **available on `agent/primitives`** — the package (including `IconButton`) is now on the same tree as `packages/components`, so deleting `src/internal/button.tsx` and importing the real parts is the components workstream's follow-up |
| A `primaryHover` / `destructiveHover` role pair so filled buttons stop using a half-alpha fill for hover | tokens-theme | pending |
| Playground mounts the Tier 2 examples and runs a dialog/menu/toast smoke | playground | pending |
| Docs site renders `packages/components/docs/*.mdx` and the example registry | docs-site | pending |
| `scripts/verify-two-directions.sh` uses `jj`, which is not installed (D1) | tooling | pending |
| Decide whether `nub.lock` is committed: it is currently untracked and regenerated per worktree, so every workstream's copy would conflict | tooling | **resolved** — master tracks `nub.lock`; the merge took master's committed copy |
| `LICENSES/`: record GPUI Kit = Apache-2.0 (+ CC BY 4.0 for its docs prose, Lucide ISC for icons, no NOTICE file); shadcn/ui is referenced as design inspiration only, not copied source. The Message Scroller behaviour port (MIT) needs its own `provenance.md` row (plan 206 credits it on the docs page) | licensing | pending |

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
