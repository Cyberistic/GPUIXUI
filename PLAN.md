# PLAN.md — architecture, phases, decisions

This is the living architecture record. **It starts as a skeleton and is filled
by the plans** in `.agents/slop/plans/` (see that directory's `README.md` for the
index). Every decision that changes the architecture gets a row in §4 and, if it
is structural, an ADR in `.agents/adr/`.

## 1. What this repo is

A production-quality, reusable **native UI component library** rendered by
**GPUix** through its React integration, with a **Fumadocs** documentation site
as a separate web app. `MISSION.md` is the source of truth for the requirement;
this file records how we satisfy it.

## 2. Workspace architecture

TypeScript-first monorepo on **nub** (Node 24.18.0). Workspaces: `apps/*`,
`packages/*`, `examples/*`.

```
apps/docs          Fumadocs documentation + showcase (browser; no GPUix dependency)
apps/playground    Native GPUix playground: runs the library, hosts smoke tests
packages/tokens    Design tokens and semantic roles (no dependency on components)
packages/primitives Foundational render primitives (depends on tokens)
packages/components Composable components (depends on tokens + primitives)
packages/icons     Icon set and sizing/alignment rules
packages/data-grid Tables, virtualization, column config (depends on components)
packages/docking   Panels, splits, tabs, workspace layout (depends on components)
packages/editor    Code/diff/rich-text surfaces (depends on components)
packages/testing   Test helpers for GPUix runtime tests
packages/config    Shared tsconfig and tooling config
packages/deploy    Alchemy stack declarations (Cloudflare resources)
examples/*         Runnable example apps
```

**Boundary law.** Dependencies point down this list and never up: tokens →
primitives → components → specialised (data-grid, docking, editor). The native
runtime must never depend on `apps/docs`. A package exists only once it has a
real responsibility and an implementation — no empty scaffolding.

## 3. Execution phases

| Phase | Goal | Exit condition |
| ----- | ---- | -------------- |
| A | Audit and feasibility | GPUix capability map recorded; architecture agreed; **all plans written and indexed** |
| B | Working foundation | Tokens, theming, primitives, example app and docs shell; **at least one component running in GPUix and documented in Fumadocs** |
| C | Tier 1–2 components | Each component: code + test + example + docs page + inventory entry |
| D | Data and workspace components | Built in dependency order, prioritising what GPUix supports robustly |
| E | Specialised components | What needs unavailable infrastructure is documented with evidence |
| F | Integration and polish | Consistency, keyboard, themes, composability, native behaviour, performance, packaging |
| G | Release readiness | Clean-environment install, public exports, examples, licence compliance, all gates green |

Completing a phase is not a reason to stop while the acceptance criteria are
unmet.

## 4. Decisions

| # | Decision | Why | Date |
| - | -------- | --- | ---- |
| D1 | **git**, not jj | `jj` is not installed on this machine and cannot be installed without a package manager; `git worktree` gives the same one-writer-per-tree isolation | 2026-10-17 |
| D2 | **nub** as the package manager | Matches the owner's other repos; pinned via `devEngines.packageManager`; Node 24.18.0 via `.node-version` | 2026-10-17 |
| D3 | **One `git worktree` per agent workstream** under `workspaces/` | The reference repo's rule: never two writers in one tree | 2026-10-17 |
| D4 | Package scope `@gpuixui/*` | Placeholder: the original branding and package name are a Phase A deliverable. **Finalise the scope in Phase A, before packages proliferate** | 2026-10-17 |
| D5 | Planning before implementation | The mission's first deliverable is the plan set; a weaker executor must be able to run each plan unaided | 2026-10-17 |
| D6 | The shared checkout's `main` is the integration branch | Agents work on `agent/<workstream>` branches in `workspaces/`; a workstream merges into `main` once its plan set is complete and the gates pass, so the plan index and `TODO.md` in the shared checkout stay current | 2026-10-17 |
| D7 | Plans are counted across every worktree | A workstream's plans live on its branch, so the supervisor aggregates distinct plan files from the shared checkout and all worktrees rather than reading only `main` | 2026-10-17 |
| D8 | The tick is driven by a `nohup` daemon, with a launchd agent and a crontab entry installed alongside | A per-user launchd agent cannot be bootstrapped from this account's SSH session (no `gui/$UID` domain; `launchctl load` aborts) and macOS `cron` silently refuses to run jobs without Full Disk Access. All three paths take the same lock, so none can overlap. Evidence in `.agents/slop/README.md` | 2026-10-17 |
| D9 | Plan numbers are reserved per workstream (000s platform, 100s playground, 200s tokens, 300s primitives, 400s components, 500s docs) | Five agents write plans in parallel; a shared counter collides | 2026-10-17 |
| D10 | The native smoke suite reports **exit 2 "unverified"** when the host has no GPUix binding; no capability is `verified` without a report | The swarm's only machine is an Intel Mac, which GPUix does not ship a 0.10 binding for. Faking or skipping the run would poison every `done` row — `.agents/adr/0001-native-smoke-host.md` | 2026-10-17 |
| D11 | GPUix's wasm browser build is **not** native evidence; it is a docs-embedding candidate for the docs-site workstream to evaluate separately | It is a real GPUix renderer but a browser canvas; MISSION forbids implying a browser preview is native | 2026-10-17 |
| D12 | The library and playground target `@gpuix/react@0.10.0` + `@gpuix/native@0.10.0`; a separate, labelled `legacy-probe` runs `0.5.1` (the last `darwin-x64` release) to measure the underlying primitives on this host | 0.5.1 runs here but never delivers focus/blur events, so a component library cannot paint focus states on it; 0.10.0 has the API and cannot run here — both facts are recorded with evidence in `.agents/adr/0002-two-gpuix-versions.md` | 2026-10-17 |
| D13 | **The `darwin-x64` 0.10.0 binding is built from source** with `gpui_macos/runtime_shaders` (the `xcrun metal` build step is optional), so the native smoke suite runs **on this host** — 11/11 green, exit `0`. `verified 0.10.0` is therefore a valid component-status basis | Closes blocker B1: `gpui_apple/build.rs` compiles the shaders at runtime through the OS Metal compiler when the feature is on, so only Rust + Command Line Tools are needed. Provenance (same version/source, different shader path) is recorded; a CI run with the published binary is the gold standard. `.agents/adr/0003-darwin-x64-source-build.md`, plan `140` | 2026-10-17 |
| D14 | The theme gallery asserts the **runtime's own style report** (`SmokeHost.paintedStyle`, schema-decoded at the adapter) and is the docs' native evidence source for the token layer; screenshots are artifacts, never assertions | A screenshot diff cannot say *which token* painted a pixel, and is brittle across GPU/theme changes. `TestElement.style` reports the authored value verbatim (including 8-digit `#RRGGBBAA` and `boxShadow`), so a token that never reached the renderer fails by name. Plan `150`; `theme-color-roles` (148 checks) and `theme-type-and-shadow` (30) | 2026-10-17 |

## 5. Open questions

Tracked here until an ADR answers them. Each plan that resolves one moves the
answer into §4 or an ADR.

- ~~Which GPUix primitives actually exist for layout, input, focus, overlays and
  panels?~~ **Answered by measurement** (plan `140` §4, this host, 0.10.0):
  layout, text, input, focus/blur, overlays, wheel scroll, panel resizing,
  virtual-list painting, tables and workspace tabs are all supported. The
  surprises that changed plans: focus/blur **do** work (they never did on
  0.5.1); `autoFocus` sets native focus without dispatching `onFocus`; a
  synthetic `"tab"` keystroke does not itself traverse in the `TestRenderer`
  (`focusNext` does); wheel `deltaY` is negative to scroll down; a
  `<virtual-list>` retains every row but paints only a window; an `<anchored>`
  paints no surface of its own, so overlay handlers go on the content div.
- Can a GPUix rendering surface be embedded in the Fumadocs site, or is the
  companion playground the only honest preview? (Phase A/B.) — GPUix ships a
  **wasm browser build** (`@gpuix/native/wasm`), so strategy 1 may be real; it
  is not the native runtime and needs its own evaluation by the docs-site
  workstream.
- What is the original package name and branding identity? (Phase A.)
