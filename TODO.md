# TODO.md — the persistent source of truth

This file is how work resumes after a context compaction, a restart, or a new
agent. Tick items as they finish. Add categories as plans land. If a task is not
here, add it and tick it. Implementation details do not belong here — only tasks
worth tracking.

Legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` cancelled

---

## Phase A — audit and feasibility

`[ ]` `[░░░░░░░░░░]` 0/6

`[ ]` Inspect the environment, package manager and toolchain; record the findings
`[ ]` Establish the GPUix version, APIs, primitives, events, layout and limits
`[ ]` Read GPUix docs and examples; write the capability map
`[ ]` Inspect GPUI Kit (hierarchy, theming, layout, interaction, licence)
`[ ]` Study shadcn/ui organisation and semantic tokens; review PanelUI; review Fumadocs setup
`[ ]` Write and index every phase and package plan in `.agents/slop/plans/`

## Phase B — working foundation

`[ ]` `[░░░░░░░░░░]` 0/6

`[ ]` Land the workspace, boundaries and package scaffolding that has real content
`[ ]` Land tokens and the theming architecture (light + dark, semantic roles)
`[ ]` Land the primitives package
`[ ]` **Native smoke test**: layout, input, focus, overlay and panel primitives in real GPUix
`[ ]` Land one fully working component running in GPUix
`[ ]` Land the docs shell and document that component in Fumadocs

## Phase C — Tier 1–2 components

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Tier 1 foundational components (code + test + example + docs + inventory)
`[~]` Tier 2 composition/feedback components (same bar)
  - [x] Write and index the Tier 2 plan set (plans 110–117)
  - [ ] `packages/components` package, token/primitives adapters, native test harness
    - [x] Package scaffold (package.json, tsconfig, vitest config, README)
    - [x] `internal/collection.ts` (index arithmetic), `internal/key.ts` (key predicates)
    - [ ] `internal/theme.ts` adapter over the landed token API (plan 110 §6)
    - [ ] Native test harness (`internal/test-root.tsx`, `runtime.test.tsx`) — needs a supported host, see Blockers
  - [ ] Foundation parts: Card, Badge, Avatar, Alert, EmptyState, List
    - [x] `internal/collection.ts` (List single-selection core, shared with Tabs/menus)
    - [ ] Card, Badge, Avatar, Alert, EmptyState, List
  - [ ] Overlays: Dialog, Confirmation dialog, Popover
    - [ ] `internal/dismiss-layer.ts` + `internal/button-props.ts` (0.10.0 has neither)
  - [ ] Disclosure and navigation: Tabs, Accordion, Collapsible, Breadcrumb, Pagination
    - [x] Logic: `accordion/logic.ts`, `breadcrumb/logic.ts`, `pagination/logic.ts`
  - [ ] Menus: Dropdown, Context, Command
    - [x] Logic: `menu/logic.ts` over the shared collection
  - [ ] Choice inputs: Search input, Combobox
    - [x] Logic: `combobox/logic.ts` (ranking + selection)
  - [ ] Feedback: Toast system, inline validation (`Field`)
  - [ ] Date / time picker (design in plan 116 §5; not started)
  - [ ] Tier 2 verification matrix and inventory sync check (plan 117)
`[ ]` Verify every component in both themes

## Blockers (project-level, with evidence)

`[!]` **The GPUix native runtime cannot run on this machine, so native renderer
tests and the playground are impossible here.** Evidence, 2026-10-17:

- `uname -m` → `x86_64`; `sysctl -n machdep.cpu.brand_string` →
  `Intel(R) Core(TM) i7-8750H`; `node -p process.arch` → `x64`.
- `@gpuix/native@0.10.0` publishes only `@gpuix/native-darwin-arm64`,
  `-linux-x64-gnu`, `-win32-x64-msvc`. There is **no darwin-x64 binary**.
- Loading it fails with
  `mach-o file, but is an incompatible architecture (have 'arm64', need 'x86_64')`
  and then `Cannot find native binding`.
- The WASM build (`@gpuix/native/wasm`) exports only `GpuixRenderer`, not
  `TestGpuixRenderer`, and is a browser (wasm-bindgen) build. `cargo` is not
  installed, so the napi package cannot be rebuilt from source here.

Consequences: `createTestRoot()`, `hasNativeTestRenderer`, screenshots and
`apps/playground` are all unavailable on this host. Logic tests run normally.
Affected: every Tier 2 component's behaviour test, and the native smoke test.

Alternatives, in order: (1) run the suite on an Apple-silicon Mac, Linux x64 or
Windows x64 runner; (2) upstream an x64 Darwin build to GPUix; (3) until then,
the behaviour suites stay written and explicitly skipped with this reason, and
no component may claim `done` on native interaction evidence.

`[!]` **nub's isolated linker does not install optional platform binaries of
transitive dependencies.** `@gpuix/native-darwin-arm64` (an optional dependency
of `@gpuix/native`) was absent from the store entry; `nub install --node-linker
hoisted` links it, but the architecture mismatch above still blocks it here.

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

## Interlocks (cross-workstream dependencies)

Work that this workstream needs but does not own. Another agent owns each row.

| Need | Owner | Status |
| ---- | ----- | ------ |
| `@gpuixui/tokens` roles in plan 110 §6 — **landed**; adapter maps to it | tokens-theme | aligned |
| Decide the GPUix version: stay on 0.10.0 and implement dismiss layers/focus locally, or ship a release that includes `Dialog`/`Button`/`DismissableLayer` (0.10.0 is the latest published) | owner / playground | pending |
| Soft tone pair per status (`info`, `infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft` + readable foregrounds) so the local `tone()` helper can be deleted | tokens-theme | pending |
| `alpha(color, amount)` helper so the local `withAlpha()` can be deleted | tokens-theme | pending |
| An `info` status role so Alert/Badge/Toast stop borrowing `accent` | tokens-theme | pending |
| `@gpuixui/primitives` exports in plan 110 §7 | primitives | pending |
| Playground mounts the Tier 2 examples and runs a dialog/menu/toast smoke | playground | pending |
| Docs site renders `packages/components/docs/*.mdx` and the example registry | docs-site | pending |
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

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Consistency, keyboard, themes, composability pass
`[ ]` Performance and packaging
`[ ]` Docs truth pass against the implementation

## Phase G — release readiness

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Clean-environment install and public-export checks
`[ ]` Licence inventory and attribution complete
`[ ]` All gates green (`nub run check`, `nub run lint`, `nub run test`)
