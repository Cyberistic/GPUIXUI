# TODO.md — the persistent source of truth

This file is how work resumes after a context compaction, a restart, or a new
agent. Tick items as they finish. Add categories as plans land. If a task is not
here, add it and tick it. Implementation details do not belong here — only tasks
worth tracking.

Legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` cancelled

---

## Harness — the supervisor that keeps the swarm alive

`[x]` `[██████████]` 5/5

`[x]` Repo on `proserver` with the required shape, mission, rules and plan index
`[x]` opencode 2.0.31 installed with the provider credentials and a trimmed config
`[x]` Verified a real run on `opencode-go-braven/deepseek-v4.1-flash`
`[x]` Supervisor: 30-minute tick, ≥5 agents, one worktree each, idempotent and crash-safe
`[x]` Scheduler installed (launchd agent + daemon driver; see `.agents/slop/README.md`)

---

## Phase A — audit and feasibility

`[ ]` `[░░░░░░░░░░]` 0/6

`[ ]` Inspect the environment, package manager and toolchain; record the findings
`[ ]` Establish the GPUix version, APIs, primitives, events, layout and limits
`[ ]` Read GPUix docs and examples; write the capability map
`[ ]` Inspect GPUI Kit (hierarchy, theming, layout, interaction, licence)
`[ ]` Study shadcn/ui organisation and semantic tokens; review PanelUI; review Fumadocs setup
`[ ]` Write and index every phase and package plan in `.agents/slop/plans/`

### Playground workstream (`apps/playground`, `packages/testing`)

`[~]` `[████████░░]` 8/12 plans-and-harness

`[x]` Plans `100`–`130` written and indexed for the playground workstream
`[~]` **Blocker B1: build the `darwin-x64` GPUix binding from source** per plan `140` — the blocking `xcrun metal` step is optional (`gpui_macos/runtime_shaders`); Rust 1.97.1 + the zed tree are staged in `.agents/slop/scratch/gpuix-build/`, the one-line feature change is applied, and the release build is running. If it succeeds, the smoke suite produces a real report on this host; if not, the fallback records the exact failure and the CI-runner task below
`[x]` Record the build host's missing 0.10 binding as ADR 0001 (evidence + consequence)
`[x]` Probe GPUix 0.5.1 on this host: it runs (real window, layout/input/overlay/panel/virtual-list/programmatic scroll) and it never delivers focus or wheel-scroll events — ADR 0002
`[x]` Establish the GPUix capability map from docs/types and measured probes (layout, input, focus, overlay, scroll, panel, virtual-list, Tier 3/4)
`[x]` Land `packages/testing` (harness, report, runtime preflight) per plan `100`
`[x]` Land the `legacy-probe` (0.5.1) so the documented capability matrix is reproducible per plan `110` §3.4
`[x]` Land `apps/playground` shell + `SplitPane` + the eight core scenarios per plan `120` (the built CLI `node apps/playground/dist/smoke/run.js` exits `2` here with the ADR 0001 evidence and writes no report; `nub run … smoke` prints it but returns `1` — nub collapses non-zero codes, plan `120` §2.1.8)
`[x]` Land the Tier 3/4 probe scenarios per plan `130` (`table-select-sort`, `table-column-resize`, `workspace-tab-drag`; verdicts still need a supported host)
`[ ]` **Blocked: run the 0.10 native smoke suite on a supported host** (Apple Silicon Mac / x64 Windows / x64 Linux) and paste the report into `COMPONENTS.md` — no supported host on this machine (ADR 0001/0002)
`[ ]` Wire the playground to `@gpuixui/tokens` once the tokens workstream lands (replace `src/theme.ts`)
`[ ]` Replace the jj-based `scripts/verify-two-directions.sh` with a git implementation (outside this workstream)
`[ ]` **Fallback if B1's source build fails (plan `140` §4.8):** add `.github/workflows/native-smoke.yml` running `nub run --filter playground smoke` on `macos-14` (Apple Silicon — a supported host per ADR 0001 §3) and paste the report. The repo is public, so the runners are free. **Outside this workstream** (`.github/` is not `apps/playground`/`packages/testing`); owner: whoever owns CI/platform

#### Process — one writer per tree

`[ ]` **Supervisor bug: two playground agents ran in `workspaces/playground` at
once.** The 30-minute tick starts a workstream loop when its pid file is gone,
but an interactive session for the same workstream is not tracked, so a second
agent implemented `packages/testing` while the first was mid-edit. Either track
interactive sessions or refuse to start a workstream whose tree has uncommitted
changes from another pid. Owners: whoever owns `scripts/swarm-supervisor.sh`.

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
`[ ]` Tier 2 composition/feedback components (same bar)
`[ ]` Verify every component in both themes

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
