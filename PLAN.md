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
| D9 | Docs site is **Fumadocs + TanStack Start (SSR)** on Cloudflare Workers via `Cloudflare.Website.Vite` | Fumadocs' documented Vite/Start path; alchemy supports TanStack Start in one call; SSR gives search + SEO; the deploy `rootDir` is already fixed to `apps/docs` (plan 410) | 2026-10-17 |
| D10 | Honest preview default is **companion playground + real native screenshots**; labelled browser approximations only; live Wasm embed only if proven | GPUix has a browser Wasm build but it needs nightly Rust, ~19 MB Wasm and COOP/COEP, so it is an upgrade path, not a default; `MISSION.md` forbids faking native (plan 412) | 2026-10-17 |
| D11 | Component metadata is **docs-owned** under `apps/docs` in Phase B, typed by an Effect Schema contract; hoisting it into the packages is a tracked task | The component packages are another workstream; a single schema keeps the index, sidebar and status generated and makes the hoist a file move (plan 411) | 2026-10-17 |
| D12 | Target **`@gpuix/react` / `@gpuix/native` 0.10.0 (published)**, not the `references/gpuix` checkout | The checkout is `main`, ahead of the release: it has `./button` and `Button`/`buttonProps` that **the published 0.10.0 does not export**. Code must compile against what a consumer can install. | 2026-10-17 |
| D13 | **Source-first package exports; no build step** for `packages/*` until a publish requirement exists | The consumers are workspace apps with bundlers; a `tsc` emit step would add a second copy of the truth and a stale-`dist` failure mode. `check-types` is the type gate. | 2026-10-17 |
| D14 | `primitives` consumes the theme through a **structural port** (`PrimitiveTheme`), not an import of `@gpuixui/tokens` | Keeps `primitives` testable independently of the token package and keeps the boundary law (nothing depends on components). `packages/tokens` owns the values; the shipped port groups are `colors`, `typography`, `spacing`, `radius`, `density`, `elevation`, `borderWidth`, `iconSize` | 2026-10-17 |
| D15 | Behaviour lives in **pure `core/` modules**, components are thin renderers | GPUix's published `./button` is unavailable, so keyboard/state behaviour is ours; and a pure function is the part that can be proven without a runtime | 2026-10-17 |
| D16 | Component tests assert on the **decoded element tree** (`src/components/testing/element.ts`), not a render | The harness decodes `ReactElement` props with `Schema` at the boundary rather than reading `any`, so the strongest offline check is also a typed one. The real runtime is covered separately by `test:runtime` | 2026-10-17 |
| D17 | `Select` and `Tooltip` are **themed wrappers** over `@gpuix/react/select`/`/tooltip` | GPUix already publishes headless, shadcn-shaped versions; reimplementing them would duplicate the open state, positioning, delay and dismissal for no gain (plan 020 §1.5) | 2026-10-17 |
| D18 | `RadioGroup` takes its options **as data**, not compound children | The group owns the roving index and the arrow contract; a compound API moves that logic into a context each child reads — strictly more code for the same behaviour. Recorded as a deviation from shadcn's shape in `COMPONENTS.md` | 2026-10-17 |
| D19 | Runtime verification runs against a **locally-built `darwin-x64` GPUix 0.10.0 binding** (`runtime_shaders` feature), not the published binary | GPUix publishes no `darwin-x64` artifact for 0.10.0 and this host has no Aqua session. Plan 140's script builds the same version and source revision at `node_modules/@gpuix/native/gpuix-native.darwin-x64.node`; `packages/primitives` and `apps/playground` run against it. The artifact is gitignored, so a clean checkout has no binding until the script runs; published-binary confirmation stays a CI task | 2026-10-17 |

## 5. Open questions

Tracked here until an ADR answers them. Each plan that resolves one moves the
answer into §4 or an ADR.

- Which GPUix primitives actually exist for layout, input, focus, overlays and
  panels? — **answered** by `.agents/slop/plans/020-gpuix-runtime-capability.md`
  §1; the §1.5 list of what GPUix already ships decides reuse vs. reimplement.
- Can a GPUix rendering surface be embedded in the Fumadocs site, or is the
  companion playground the only honest preview? — **answered as a default** in
  D10 / plan 412: playground + screenshots. `@gpuix/native@0.10.0` ships a wasm
  renderer, so a *real* GPUix surface in the browser stays a conditional upgrade;
  it needs nightly Rust, ~19 MB Wasm and COOP/COEP, and the deploy headers would
  have to allow it.
- What is the original package name and branding identity? — **still open**, and
  now blocking nothing but release metadata. `@gpuixui/*` remains the working
  scope (D4).
- Which verification path discharges the runtime debt? — **answered locally** by
  D19 / plan 140: the source-built `darwin-x64` binding runs `test:runtime`.
  Confirming with the published binary on CI remains open.
