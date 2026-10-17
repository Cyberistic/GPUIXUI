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
| D19 | Plan numbers follow the block table in `.agents/slop/plans/README.md` | The playground branch proposed per-workstream number ranges; the merged index kept explicit blocks (`010–019` tokens, `020–049` primitives/icons/Phase C, `050–099` free, `100–199` packages/apps/smoke, `200–299` reference adoption, `400–499` docs), which is what plans 053–055 use | 2026-10-17 |
| D20 | The native smoke suite reports **exit 2 "unverified"** when the host has no GPUix binding; no capability is `verified` without a report | The swarm's machine is an Intel Mac, which GPUix does not publish a 0.10 binding for. Faking or skipping the run would poison every `done` row — `.agents/adr/0001-native-smoke-host.md` | 2026-10-17 |
| D21 | GPUix's wasm browser build is **not** native evidence; it is a docs-embedding candidate for the docs-site workstream to evaluate separately | It is a real GPUix renderer but a browser canvas; MISSION forbids implying a browser preview is native | 2026-10-17 |
| D22 | The library and playground target `@gpuix/react@0.10.0` + `@gpuix/native@0.10.0`; a separate, labelled `legacy-probe` runs `0.5.1` (the last `darwin-x64` release) to measure the underlying primitives on this host | 0.5.1 runs here but never delivers focus/blur events, so a component library cannot paint focus states on it; 0.10.0 has the API and cannot run here — both facts are recorded with evidence in `.agents/adr/0002-two-gpuix-versions.md` | 2026-10-17 |
| D23 | **The `darwin-x64` 0.10.0 binding is built from source** with `gpui_macos/runtime_shaders` (the `xcrun metal` build step is optional), so the native smoke suite runs **on this host** — 11/11 green, exit `0`. `verified 0.10.0` is therefore a valid component-status basis | Closes blocker B1: `gpui_apple/build.rs` compiles the shaders at runtime through the OS Metal compiler when the feature is on, so only Rust + Command Line Tools are needed. Provenance (same version/source, different shader path) is recorded; a CI run with the published binary is the gold standard. `.agents/adr/0003-darwin-x64-source-build.md`, plan `140` | 2026-10-17 |
| D24 | The theme gallery asserts the **runtime's own style report** (`SmokeHost.paintedStyle`, schema-decoded at the adapter) and is the docs' native evidence source for the token layer; screenshots are artifacts, never assertions | A screenshot diff cannot say *which token* painted a pixel, and is brittle across GPU/theme changes. `TestElement.style` reports the authored value verbatim (including 8-digit `#RRGGBBAA` and `boxShadow`), so a token that never reached the renderer fails by name. Plan `150`; `theme-color-roles` (148 checks) and `theme-type-and-shadow` (30) | 2026-10-17 |
| D25 | Docs site is **Fumadocs + TanStack Start (SSR)** on Cloudflare Workers via `Cloudflare.Website.Vite` | Fumadocs' documented Vite/Start path; alchemy supports TanStack Start in one call; SSR gives search + SEO; the deploy `rootDir` is already fixed to `apps/docs` (plan 410) | 2026-10-17 |
| D26 | Honest preview default is **companion playground + real native screenshots**; labelled browser approximations only; live Wasm embed only if proven | GPUix has a browser Wasm build but it needs nightly Rust, ~19 MB Wasm and COOP/COEP, so it is an upgrade path, not a default; `MISSION.md` forbids faking native (plan 412). **Updated by D29:** the published package ships the built Wasm, so the live surface now exists as an opt-in tier L beside these tiers, never instead of them | 2026-10-17 |
| D27 | Component metadata is **docs-owned** under `apps/docs` in Phase B, typed by an Effect Schema contract; hoisting it into the packages is a tracked task | The component packages are another workstream; a single schema keeps the index, sidebar and status generated and makes the hoist a file move (plan 411) | 2026-10-17 |
| D28 | Previews read the state the providers **publish on `<html>`** (`data-platform`, `dark`) through one `useSyncExternalStore` snapshot, not the React contexts | The MDX body renders behind `use(page.load())` and loses the providers' mount-time context updates: a dark page painted light previews and `?platform=win32` kept Menlo. The published state is what the chrome paints, so a preview cannot disagree with it; the server snapshot stays `default`/light so hydration matches. `smoke:browser` guards it in the release gate | 2026-10-17 |
| D29 | **Live GPUix surface previews (tier L)**: the docs embed the **published** `@gpuix/native@0.10.0` WebAssembly renderer in an isolated, click-to-load `/gpuix-preview/` document, with the native evidence kept beneath it | `MISSION.md` prefers a real GPUix surface over an approximation, and the published package ships the built wasm, so the nightly-Rust cost in D26 applies only to *building* it. Measured: it initialises and paints in headless Chrome; a browser renderer is still not the desktop binary, so the label says so and never replaces tier N/S/V. `smoke:preview` drives it in real time (virtual-time screenshots are black) | 2026-10-18 |

## 5. Open questions

Tracked here until an ADR answers them. Each plan that resolves one moves the
answer into §4 or an ADR.

- Which GPUix primitives actually exist for layout, input, focus, overlays and
  panels? — **answered by measurement** (plan `140` §4, this host, 0.10.0;
  plan `020` §1). Layout, text, input, focus/blur, overlays, wheel scroll,
  panel resizing, virtual-list painting, tables and workspace tabs are
  supported. The surprises that changed plans: focus/blur **do** work (they
  never did on 0.5.1); `autoFocus` sets native focus without dispatching
  `onFocus`; a synthetic `"tab"` keystroke does not traverse in the
  `TestRenderer` (`focusNext` does); wheel `deltaY` is negative to scroll down;
  a `<virtual-list>` retains every row but paints only a window; an `<anchored>`
  paints no surface of its own, so overlay handlers go on the content div.
- Can a GPUix rendering surface be embedded in the Fumadocs site, or is the
  companion playground the only honest preview? — **answered** by D29 / plan 455:
  the published 0.10.0 ships a working wasm renderer, so the docs embed it as
  tier L in an isolated, opt-in document; it is not the desktop binary, and the
  native evidence stays on the page.
- What is the original package name and branding identity? — **still open**, and
  now blocking nothing but release metadata. `@gpuixui/*` remains the working
  scope (D4).
- Which verification path discharges the runtime debt? — **answered locally** by
  D23 / plan 140: the source-built `darwin-x64` binding runs `test:runtime`.
  Confirming with the published binary on CI remains open.
