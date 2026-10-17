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

## Phase B — working foundation

`[~]` `[███████░░░]` 4/6

`[ ]` Land the workspace, boundaries and package scaffolding that has real content
`[x]` Land tokens and the theming architecture (light + dark, semantic roles)
`[x]` Land the primitives package
`[ ]` **Native smoke test**: layout, input, focus, overlay and panel primitives in real GPUix
`[x]` Land one fully working component running in GPUix — Buttons, runtime-verified by the primitives suite (plan 041) and documented by plan 422
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
`[ ]` Cross-team: native theme gallery in `apps/playground` (owner:
`playground`; blocked by B1); Fumadocs Theming page from `docs/tokens.md` and the
docs platform toggle (macOS / Linux / Windows / Default) built on
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
`[x]` `packages/primitives`: Tier 1 runtime suites in `runtime/` — 46 tests
      against the real GPUix 0.10.0 `TestRenderer` (layout, controls, fields,
      loading, icons), with the two-direction proof; results in plan 041 §9
`[x]` `examples/basic-app`: compose the Tier 1 set into one settings-form workflow
      (typed + `check-types` green; the app itself is **never run** — it needs a
      desktop session, while the primitives it composes are runtime-verified)
`[x]` `packages/primitives`: docs pages for every Tier 1 component (docs-site workstream) — all 20 pages landed with plans 422 and 423
`[ ]` **packages/testing** (playground workstream): hoist `runtime/harness.ts`
      into the shared smoke framework once the package lands — plan 041 §2.2
      records why it is duplicated for now

### Cross-workstream dependencies (do not edit their paths — record only)

`[ ]` **root**: `nub.lock` is generated by `nub install` but is untracked (also
      absent from `master`). Decide whether the lockfile belongs in git — a
      reproducible clean install (Phase G) needs an answer.
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
      D19, which records the locally-built `darwin-x64` binding (plan 140) the
      runtime suites use.
`[ ]` **tokens workstream**: `packages/tokens` must export light and dark theme
      values satisfying the `PrimitiveTheme` port in
      `.agents/slop/plans/030-primitives-package.md` §2.2 (colours, space,
      radius, font; density as a number multiplier, never a second palette)
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

`[x]` Tier 1 foundational components (code + test + example + docs + inventory) — all 19 runtime-verified, with in-package and `apps/docs` pages (plans 422–424)
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
| Decide whether `nub.lock` is committed: it is currently untracked and regenerated per worktree, so every workstream's copy would conflict | tooling | pending |
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

## Docs site workstream (plans 410–426)

`[x]` `[██████████]` 24/25

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
`[ ]` Plan 427 Parts A–C — extend the metadata schema and page template for compound/workspace components, then add Tier 3–4 pages and interaction previews when `packages/data-grid` and `packages/docking` land

## Cross-team tasks raised by the docs-site workstream

`[x]` `[███░░░░░░░]` 4/16

`[ ]` Owner: hoist the `apps/docs` stack (fumadocs, tanstack, tailwind, vite) into the root catalog
`[-]` Repo tooling: oxfmt now ignores `**/.source/**` and `**/routeTree.gen.ts` (edited in this workstream)
`[ ]` Repo tooling: `.gitignore`'s `references/` does not match the worktree's `references` symlink, so it shows as untracked and can be committed by accident; ignore the symlink too
`[ ]` Owner: decide whether the root `nub.lock` (produced by `nub install`) is committed for reproducible installs or ignored; it is currently untracked
`[ ]` Repo: AGENTS/PLAN name an integration branch `main`, but only `master` exists and the shared checkout is on it — confirm the name before workstreams merge. `agent/docs-site` is green and ready to integrate; it was not merged because the shared checkout had uncommitted edits from another agent
`[ ]` **Supervisor: two writers in one worktree.** A docs-site loop session (`run-docs-site.sh` → `opencode run`) and the interactive docs-site session wrote `workspaces/docs-site` at the same time on 2026-10-17 08:38–08:52: the loop committed the other session's in-flight edit together with its own work, and reverted a line of it mid-run. Evidence in `.agents/slop/docs-site-concurrency.md`. Per AGENTS §6 this session stopped the loop (both pids) to become the single writer. Fix: treat a live writer as owning the tree — either track interactive sessions, or refuse to start a workstream whose tree has uncommitted changes from a different pid. Owner: whoever owns `scripts/swarm-supervisor.sh`
`[x]` Tokens-theme: expose a dependency-free token data export the docs site can read for token tables — `@gpuixui/tokens` (root entry) is consumed by the docs site; plan 416 renders the colour and type tables from it
`[x]` Components/primitives: export tsdoc-annotated props types the docs site can turn into API tables — `ButtonProps` generates the real 14-row table on the Buttons page (plan 422); the contract is executable in `apps/docs/src/lib/type-table.fixture.tsx` / `type-table.test.ts` (plan 415)
`[ ]` Playground: add a per-component screen + a real native screenshot capture script (plan 412 §5) — the sidecar contract (`provenance.json` beside each PNG) is now enforced by `preview.test.tsx`, so a capture without it will not render
`[x]` Docs site: the first real component page — Buttons shows its source via `<include>`, generates its API table from `ButtonProps`, sits in `content/docs/components/meta.json` and the sitemap, and relates to a planned component without a 404 link (plan 422)
`[ ]` Primitives: the `packages/primitives/docs/tooltip.mdx` usage snippet imports `Icon` from `@gpuixui/primitives`; it lives in `@gpuixui/icons`. The docs-site page was corrected during the truth pass (plan 424); fix the package page too
`[x]` Canonical and OpenGraph URLs are absolute — resolved in the docs workstream by plan 418: `SITE_URL` defaults to the deploy domain (`docs.gpuixui.dev`) and is overridable with `VITE_SITE_URL`; no change to `packages/deploy` was needed
`[ ]` Owner: the Alchemy deploy path (`nub run deploy:docs`) is unverified — it needs Cloudflare credentials and lives in `packages/deploy`. The stand-down path is verified locally (plan 410 §3)
`[ ]` Repo: `README.md` still says "Phase A (audit and feasibility)" although Phase B tokens and the docs site are implemented; update the ledger to match `TODO.md`
`[ ]` Owner: `packages/README.md` still lists only `config` and `deploy` under "Present"; `tokens`, `primitives`, `components` and `icons` have shipped (the docs prose now describes them, plan 426)
`[ ]` Owner: `examples/basic-app/README.md` says `@gpuixui/tokens` "has not landed yet" and carries a stand-in palette; the package is on `main` and the docs page (plan 426) points readers at the example — reconcile the README
