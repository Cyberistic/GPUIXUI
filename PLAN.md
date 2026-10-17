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
| D9 | Target **`@gpuix/react` / `@gpuix/native` 0.10.0 (published)**, not the `references/gpuix` checkout | The checkout is `main`, ahead of the release: it has `./button` and `Button`/`buttonProps` that **the published 0.10.0 does not export**. Code must compile against what a consumer can install. | 2026-10-17 |
| D10 | **GPUix could not run in this environment** when the plan set was written. No `darwin-x64` native binary is published (Intel macOS) and this session has no Aqua session; the `darwin-x64` binary that does exist (0.5.1) throws `NSException` in `MacDisplay::primary`. Evidence: plan 020 §3. | Verification strategy had to be honest: pure logic under vitest, runtime interaction recorded as debt. **Superseded 2026-10-17:** plan 140 built `@gpuix/native@0.10.0` from source on this host and plan 041 runs the real `TestRenderer`; the published-binary confirmation is still a CI task. | 2026-10-17 |
| D11 | **Source-first package exports; no build step** for `packages/*` until a publish requirement exists | The consumers are workspace apps with bundlers; a `tsc` emit step would add a second copy of the truth and a stale-`dist` failure mode. `check-types` is the type gate. | 2026-10-17 |
| D12 | `primitives` consumed the theme through a **structural port** (`PrimitiveTheme`), not an import of `@gpuixui/tokens` | Kept `primitives` testable and unblocked before tokens landed, and kept the boundary law (nothing depends on components). **Superseded by D17** once the tokens package resolved from source. | 2026-10-17 |
| D13 | Behaviour lives in **pure `core/` modules**, components are thin renderers | GPUix's published `./button` is unavailable, so keyboard/state behaviour is ours; and a pure function is the only part of a component library that can be proven on a machine with no runtime (D10) | 2026-10-17 |
| D14 | Component tests assert on the **decoded element tree** (`src/components/testing/element.ts`), not a render | Rendering needs the native binding that did not exist when this was written (D10). The harness decodes `ReactElement` props with `Schema` at the boundary rather than reading `any`, so the strongest honest check is also a typed one | 2026-10-17 |
| D15 | `Select` and `Tooltip` are **themed wrappers** over `@gpuix/react/select`/`/tooltip` | GPUix already publishes headless, shadcn-shaped versions; reimplementing them would duplicate the open state, positioning, delay and dismissal for no gain (plan 020 §1.5) | 2026-10-17 |
| D16 | `RadioGroup` takes its options **as data**, not compound children | The group owns the roving index and the arrow contract; a compound API moves that logic into a context each child reads — strictly more code for the same behaviour. Recorded as a deviation from shadcn's shape in `COMPONENTS.md` | 2026-10-17 |
| D17 | `primitives` imports **`@gpuixui/tokens` directly**; the `PrimitiveTheme` port, the local focus-ring geometry and the first-shadow helper are deleted | Tokens is the single source of truth for values and for the two runtime-shaped helpers (`focusRing`, `elevationShadow`); keeping a structural copy let the two drift silently. `Theme` is structurally the shape the components already render, so the migration is a type re-export plus two helper calls (plan 021) | 2026-10-17 |
| D18 | The remaining inventory rows — **Slider, Range slider, Meter, Number Field, OTP Field, Toggle, Rating** — belong to `packages/primitives` | Each is a single-purpose value/input/selection primitive built from `div`/`<input>` plus our own keyboard and pointer contract, which is the definition of this package; `packages/components` composes Tier 2 surfaces. Claimed in plan 053 (value controls, shipped) and plan 054 (fields/toggle/rating) so the inventory has one owner per row | 2026-10-17 |

## 5. Open questions

Tracked here until an ADR answers them. Each plan that resolves one moves the
answer into §4 or an ADR.

- Which GPUix primitives actually exist for layout, input, focus, overlays and
  panels? — **answered** by `.agents/slop/plans/020-gpuix-runtime-capability.md`
  §1; the §1.5 list of what GPUix already ships decides reuse vs. reimplement.
- Can a GPUix rendering surface be embedded in the Fumadocs site, or is the
  companion playground the only honest preview? — still open. Note for the
  docs-site workstream: `@gpuix/native@0.10.0` ships a wasm renderer, so a
  *real* GPUix surface in the browser is plausible; a demo of a native desktop
  component inside a docs page is where the honest line has to be drawn.
- What is the original package name and branding identity? — **still open**, and
  now blocking nothing but release metadata. `@gpuixui/*` remains the working
  scope (D4).
- Which verification path discharges D10? — wasm in headless Chrome (playground
  workstream), or a GUI session / `darwin-x64` source build (human decision).
  Tracked in `TODO.md` Phase A.
