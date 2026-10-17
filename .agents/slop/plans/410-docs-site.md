# 410 — `apps/docs`: the Fumadocs documentation site

- **Workstream:** docs-site
- **Phase:** B (shell) → C–F (population); this plan is the app contract for all phases
- **Owns:** `apps/docs/**`, `docs/preview-strategy.md`, `.agents/slop/plans/410-*.md`–`412-*.md`,
  the docs rows in `TODO.md`, and the docs section of `COMPONENTS.md`
- **Depends on:** 001 (Phase A audit — GPUix capability map), plan 012/`0xx`
  (`docs/tokens.md`, `docs/design-system.md`, tokens-theme workstream) for the docs
  theme values; the components workstream plans (`1xx`) for the prop types the API
  tables read
- **Depended on by:** nothing in the native runtime. **The native runtime must never
  depend on `apps/docs`** (`MISSION.md`, boundary law).

Companion plans in this workstream:

- [`411-component-page-template.md`](./411-component-page-template.md) — the
  component metadata contract, page template, and generated index/navigation.
- [`412-preview-strategy.md`](./412-preview-strategy.md) — the honest-preview
  mechanism and `docs/preview-strategy.md`.

---

## 1. Goal

A real, deployable Fumadocs site that documents and showcases the GPUix-native
library with the information architecture from `MISSION.md`, light and dark docs
themes, working search, structured component metadata, and readable code blocks —
**without rendering a fake native surface**. The docs site is a browser app and
may use ordinary web technology (`MISSION.md`).

Phase B exits for this workstream when:

1. `apps/docs` is a real Fumadocs + TanStack Start app; `nub run --filter docs build`
   succeeds and `nub run --filter docs dev` serves the site locally.
2. The IA from `MISSION.md` exists as navigable pages (content may mark work that
   other packages have not delivered yet — honestly, not as fake functionality).
3. Light/dark themes work; the site carries an original identity (not the stock
   Fumadocs neutral palette) driven by CSS variables derived from
   `docs/design-system.md` / `docs/tokens.md` (handoff with tokens-theme).
4. Search works end to end (server search route + UI dialog).
5. The component metadata contract and generated component index from plan 411 are
   in place, with a test that can fail.
6. `docs/preview-strategy.md` exists and every preview component obeys it (plan 412).
7. `nub run check`, `nub run lint`, `nub run test` pass.

Phase B's *library* exit condition — "one fully working component running in GPUix
and documented in Fumadocs" — needs a real component from the primitives/components
workstreams. This workstream builds the machine that documents it; the first real
component page is a cross-team task (see §9).

## 2. Scope and boundaries

In scope (this workstream owns these paths):

```
apps/docs/**
docs/preview-strategy.md
.agents/slop/plans/410-*.md, 411-*.md, 412-*.md
.agents/slop/plans/README.md          (index rows only)
TODO.md                               (docs-site tasks only)
COMPONENTS.md                         (docs-site section only)
```

Out of scope — record a task in `TODO.md` instead of editing:

- `apps/playground/**` and `packages/testing/**` (playground workstream) — the
  native run path and the native screenshots the preview strategy consumes;
- anything under `packages/**` (primitives, components, tokens, icons, data-grid,
  docking, editor);
- the root `package.json` catalog (owner) — see §7 for the version policy;
- `packages/deploy/alchemy.run.docs.ts` (owner) — the deploy resource already
  fixes `rootDir: "../../apps/docs"`; if the app needs a deploy change, record it;
- `docs/tokens.md`, `docs/design-system.md`, `docs/architecture.md`,
  `docs/gpuix-capabilities.md` (their workstreams) — the site **links** to them.

**Boundary law, restated because the docs site is the easy place to break it:**
`apps/docs` must not import `@gpuixui/components`, `@gpuixui/primitives`,
`@gpuixui/tokens/react`, `@gpuix/native`, or `@gpuix/react` at **runtime**. It may
read their **TypeScript source files as text at build time** (for prop tables and
copyable source) and may import pure data constants if a package exposes a
dependency-free subpath. It never mounts a GPUix tree.

## 3. Architecture decision

**Fumadocs + TanStack Start (SSR) on Cloudflare Workers, built with Vite.**

Evidence and reasoning:

- `packages/deploy/alchemy.run.docs.ts` declares `Cloudflare.Website.Vite` with
  `rootDir: "../../apps/docs"` and domain `docs.gpuixui.dev`. The deploy shape is
  fixed: a Vite project that builds a Worker (server bundle + static assets) in one
  `vite build`.
- Fumadocs documents TanStack Start as a supported manual installation
  (`(framework)/manual-installation/tanstack-start.mdx`) and ships a runnable
  example (`references/fumadocs/examples/tanstack-start-min`). TanStack Start is
  Cloudflare's official partner path for Start and is configured with
  `@cloudflare/vite-plugin` + `wrangler.jsonc`
  (`https://tanstack.com/start/latest/docs/framework/react/guide/hosting`).
- Alchemy's `Cloudflare.Website.Vite` injects its own resource-aware Cloudflare
  Vite plugin and sets `ALCHEMY_CLOUDFLARE_VITE_INJECTED=1` during its build/dev.
  The app must therefore include `cloudflare(...)` in its own `vite.config.ts` but
  stand it down when that variable is set (Alchemy's own documented contract in
  `alchemy/src/Cloudflare/Workers/Sources/Vite.ts`), so both standalone `vite build`
  and Alchemy deploys work without double-injecting the plugin.
  **Verified (2026-10-17):** `ALCHEMY_CLOUDFLARE_VITE_INJECTED=1 nub run --filter
  docs build` exits 0 with the app's plugin stood down — the MDX, Tailwind,
  TanStack Start and React plugins still produce `dist/client` and
  `dist/server/server.js`. It does not emit `dist/server/wrangler.json`: the
  Cloudflare plugin writes that, and in a real Alchemy run the injected plugin is
  present. The end-to-end deploy (`nub run deploy:docs`) is **not** verified here —
  it needs Cloudflare credentials and is the owner's path (`TODO.md`).
- SSR (not a client-only SPA) gives server-side search (`/api/search` via
  `fumadocs-core/search/server`) and real HTML for SEO, which a documentation site
  wants. TanStack Start's `prerender` can be enabled later for speed if needed.

Alternatives rejected:

- **Next.js** — the deploy resource is `Website.Vite`, not `Website.Nextjs`; changing
  it is outside this workstream.
- **React Router** — Cloudflare needs a custom Worker entry (`main: "workers/app.ts"`),
  which is a deploy change outside this workstream.
- **Client-only Vite SPA** — loses SSR search/SEO and needs `single-page-application`
  asset handling configured in the deploy; more deploy coupling, not less.
- **A bespoke docs framework** — forbidden by `MISSION.md`.

The preview mechanism (how the site shows the *native* components) is deliberately a
separate decision, in plan 412. This plan only wires the plumbing.

## 4. Files to create

```
apps/docs/
├── package.json                     # name: "docs" (matches root dev:docs filter), scripts + pinned deps
├── tsconfig.json                    # DOM libs, jsx, "@/*" + "collections/*" paths
├── vite.config.ts                   # fumadocs-mdx, tailwind, tanstackStart, react, guarded cloudflare
├── wrangler.jsonc                   # standalone build/preview + `main: "@tanstack/react-start/server-entry"`
├── source.config.ts                 # fumadocs-mdx config (+ remarkAutoTypeTable for plan 411)
├── README.md                        # what the app is, how to run/build; links MISSION/PLAN
├── content/
│   ├── meta.json
│   └── docs/
│       ├── meta.json
│       ├── index.mdx                # Introduction / landing content
│       ├── installation.mdx
│       ├── getting-started.mdx
│       ├── architecture.mdx
│       ├── theming.mdx
│       ├── typography.mdx
│       ├── components/
│       │   ├── meta.json
│       │   └── index.mdx            # generated from component metadata (plan 411)
│       ├── layouts.mdx
│       ├── workspace.mdx
│       ├── data-display.mdx
│       ├── patterns/
│       │   ├── meta.json
│       │   └── index.mdx
│       ├── examples/
│       │   ├── meta.json
│       │   └── index.mdx
│       ├── api-reference.mdx
│       ├── contributing.mdx
│       └── license.mdx              # licence + attribution (links LICENSES/)
├── public/
│   ├── screenshots/                  # real native screenshots (plan 412); empty at first
│   └── brand/                        # original logo/wordmark; no third-party marks
└── src/
    ├── styles/app.css                # Tailwind + fumadocs neutral/preset + GPUIXUI identity vars
    ├── router.tsx                    # TanStack Start router (from the fumadocs example)
    ├── routeTree.gen.ts              # committed generated route tree (so tsc runs without a dev server)
    ├── lib/
    │   ├── source.ts                 # fumadocs core loader over content/docs
    │   └── layout.shared.tsx         # nav title, GitHub link, base options
    ├── components/
    │   ├── mdx.tsx                   # MDX component map (fumadocs defaults + our preview components)
    │   └── preview/                  # plan 412; empty stubs with honest labels at first
    └── routes/
        ├── __root.tsx                # html shell + RootProvider (theme, search)
        ├── index.tsx                 # landing page
        ├── docs/$.tsx                # catch-all docs route (DocsLayout + page render)
        └── api/search.ts             # server search route
```

Files owned by plan 411 (listed here for the tree, specified there):

```
apps/docs/src/component-meta/schema.ts
apps/docs/src/component-meta/registry.ts
apps/docs/src/component-meta/registry.test.ts
apps/docs/src/component-meta/entries/*.ts
apps/docs/src/components/component-index.tsx
```

## 5. Dependency versions

The root catalog (`package.json` → `workspaces.catalog`) is owner-controlled and
currently carries only the shared foundation (`effect`, `typescript`, `vitest`,
`oxlint`, `oxfmt`, `alchemy`). The docs stack is not in it. Until the owner hoists
these into the catalog (recorded as a task in `TODO.md`), `apps/docs/package.json`
pins them **exactly** and a comment records why:

| Package | Version | Runtime? |
| ------- | ------- | -------- |
| `fumadocs-core` | `16.17.5` | dependency |
| `fumadocs-ui` | `16.17.5` | dependency |
| `fumadocs-mdx` | `15.4.7` | dependency |
| `@tanstack/react-start` | `1.169.3` | dependency |
| `@tanstack/react-router` | `1.170.45` | dependency |
| `react` | `19.3.1` | dependency |
| `react-dom` | `19.3.1` | dependency |
| `lucide-react` | `1.58.0` | dependency |
| `vite` | `8.3.4` | dev |
| `@vitejs/plugin-react` | `6.1.2` | dev |
| `@tailwindcss/vite` | `4.3.3` | dev |
| `tailwindcss` | `4.3.3` | dev |
| `@cloudflare/vite-plugin` | latest 1.x at install time | dev |
| `wrangler` | latest 4.x at install time | dev |
| `fumadocs-typescript` | `5.5.2` | dev (plan 411) |
| `effect` | `catalog:` | dev — **test-only** validation (plan 411 §6) |
| `vitest` | `catalog:` | dev |
| `typescript` | `catalog:` | dev |
| `@types/react`, `@types/react-dom`, `@types/node` | matching majors | dev |

Rule: `effect` is a **devDependency** and is imported only by tests. Nothing in the
browser bundle imports `effect` (plan 411 §6 explains why).

## 6. Work breakdown (Phase B)

| # | Task | Deliverable | Depends on |
| - | ---- | ----------- | ---------- |
| T1 | Scaffold the app | `package.json`, `tsconfig.json`, `vite.config.ts`, `wrangler.jsonc`, `source.config.ts`; `nub install` clean | — |
| T2 | Fumadocs wiring | `src/lib/source.ts`, `src/lib/layout.shared.tsx`, `src/components/mdx.tsx`, `src/routes/*`, `routeTree.gen.ts`; `dev` + `build` work | T1 |
| T3 | Identity + themes | `src/styles/app.css` with GPUIXUI CSS variables; light/dark via `RootProvider` | T2; handoff with tokens-theme |
| T4 | Search | `src/routes/api/search.ts` + `RootProvider` search UI; a test/manual check that a real query returns the intended page | T2 |
| T5 | IA content | the `content/docs/**` pages + `meta.json` order from §8, honest about unfinished work | T2 |
| T6 | Landing page | `src/routes/index.tsx`: identity, quick-start, component counts from the registry | T2, T7 |
| T7 | Metadata + template | plan 411 deliverables | T2 |
| T8 | Preview mechanism | plan 412 deliverables (`docs/preview-strategy.md` + preview components) | T2, T7 |
| T9 | Gates | `nub run check`, `nub run lint`, `nub run test`; commit | T1–T8 |

## 7. Exact commands

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/docs-site`).

```sh
nub install
nub run --filter docs dev            # serves http://localhost:3000 ; Ctrl-C to stop
nub run --filter docs build          # SSR bundle + client assets
nub run --filter docs check-types    # fumadocs-mdx generate + tsc --noEmit
nub run --filter docs test           # vitest run (plan 411 metadata tests)
nub run lint
nub run fmt
nub run check
nub run test
```

`apps/docs` scripts (exact):

```json
{
  "dev": "vite dev",
  "build": "vite build",
  "preview": "vite preview",
  "check-types": "fumadocs-mdx && tsc --noEmit",
  "test": "vitest run"
}
```

Expected results:

| Command | Expected |
| ------- | -------- |
| `nub install` | resolves workspaces; `apps/docs/node_modules` exists; no unresolved peer warnings that break the build |
| `docs dev` | Vite dev server starts; `GET /` returns the landing page; `GET /docs` returns the Introduction page; `GET /api/search?query=...` returns JSON |
| `docs build` | exits 0; client assets and a server bundle are emitted |
| `docs check-types` | `fumadocs-mdx` generates `.source/`; `tsc --noEmit` exits 0 |
| `docs test` | all metadata tests pass; report the count |
| `lint` / `fmt` | exit 0 |
| `check` | test-quality gate, lint, fmt and type-check all pass |
| `test` (root) | every workspace with a test script passes |

## 8. Information architecture and content map

Top-level order is `content/docs/meta.json` `pages`; each page maps to a
`MISSION.md` IA item. Content that depends on another workstream links to that
workstream's repo document and clearly says what is not built yet.

| IA item | File | Content owner | Notes |
| ------- | ---- | ------------- | ----- |
| Introduction | `index.mdx` | docs | what the library is, links `MISSION.md` |
| Installation | `installation.mdx` | docs | real install steps once packages publish; until then states the truth |
| Getting started | `getting-started.mdx` | docs + playground | links the playground run instructions |
| Architecture | `architecture.mdx` | docs + tokens-theme | links `docs/architecture.md` |
| Theming | `theming.mdx` | docs + tokens-theme | links `docs/design-system.md`, `docs/tokens.md`; token tables generated from the tokens package when it exposes pure data |
| Typography | `typography.mdx` | docs + tokens-theme | type scale table |
| Components | `components/index.mdx` | docs | **generated** from plan 411 metadata |
| Layouts | `layouts.mdx` | docs + primitives | describes layout primitives when they land |
| Workspace | `workspace.mdx` | docs + docking | panels/tabs/docking; links playground |
| Data display | `data-display.mdx` | docs + data-grid | tables, virtualization |
| Patterns | `patterns/` | docs | realistic compositions (form + dialog flow, settings page) |
| Examples | `examples/` | docs + playground | runnable example apps |
| API reference | `api-reference.mdx` | docs | links per-component prop tables (plan 411) |
| Contributing | `contributing.mdx` | docs | workflow, gates, worktrees |
| License and attribution | `license.mdx` | docs + owner | links `LICENSES/inventory.md`, `LICENSES/NOTICE` |

Navigation is Fumadocs' `meta.json` (`pages`, `title`, optional `icon`). Icons come
from `lucide-react` via `fumadocs-core/source/lucide-icons`, matching the reference
examples.

## 9. Cross-team handoffs (record, do not implement)

- **Tokens-theme → docs:** provide `docs/design-system.md` (light/dark semantic
  roles) and `docs/tokens.md`. The site derives its CSS variables from them and
  links back. Offer, if useful, a dependency-free `@gpuixui/tokens` data export the
  site can import to generate token tables so they cannot drift. Record a `TODO.md`
  task; do not import `@gpuixui/tokens/react`.
- **Primitives/components → docs (plan 411):** each component package exposes a
  typed metadata + prop source the site can read (`sourcePath`) and `@internal` /
  `@remarks` tsdoc annotations that `fumadocs-typescript` understands, so prop
  tables are generated from real types. Until then the site's registry entries point
  at the expected paths and render "not published yet" honestly.
- **Playground → docs (plan 412):** the playground provides (a) a named screen per
  component and (b) a script that captures real native screenshots with
  `@gpuix/react/automation` (`launch({ env: { GPUIX_BACKGROUND: "1" } })` +
  `screenshot()`), writing them under `apps/docs/public/screenshots/<slug>/`. The
  docs site never fakes a screenshot.

## 10. Test plan

Tests are vitest, co-located, and must be able to fail (`scripts/check-tests.ts`).

| Test | File | What it must catch |
| ---- | ---- | ------------------ |
| Metadata decodes and is internally consistent | `src/component-meta/registry.test.ts` (plan 411) | malformed entry, duplicate slug, dangling `related`, `status: done` with `gpuix: no`, metadata whose docs page does not exist |
| IA order is complete | `src/content.test.ts` | a `MISSION.md` IA section missing from `content/docs/meta.json`, or an ordered page whose file does not exist |
| Search adapter returns the seeded page | `src/lib/search.test.ts` | a query for a known page title returns that page's URL; an unknown query returns no results |

Content/MDX rendering itself is validated by `docs build` (a real build that fails on
a broken MDX import) plus the `docs dev` smoke checks in §7. There is no DOM test
that pretends to prove GPUix behaviour — that is the playground's job.

Two-direction proof (AGENTS §3) is required for the metadata consistency checks:
temporarily set a `status: done` entry to `gpuix: no` and show `registry.test.ts`
fails, then restore.

## 11. STOP conditions

Stop and report (do not improvise) if:

- `nub install` cannot resolve the Fumadocs/TanStack/Tailwind versions, or a peer
  conflict blocks the build. Report the exact error; do not switch package managers
  or vendor packages.
- `docs build` fails because TanStack Start and Alchemy's injected Cloudflare Vite
  plugin conflict. Record the failing command and error. Fallback options, in order,
  are documented in plan 412; adopting any of them that changes the deploy resource
  is a `TODO.md` task for the owner, not an edit here.
- The Fumadocs API in `16.17.5` differs from the reference examples in this plan
  (e.g. `defineDocs`/`loader` signatures). Read the installed package's README/types
  and adjust the wiring only — do not invent a custom docs framework.
- A required `MISSION.md` IA page cannot be written honestly yet. Write the page
  with what is true and an explicit "not yet available" note; do not invent
  component behaviour.
- A gate fails for a reason outside this workstream (another package's type error).
  Report the failing workspace and leave it untouched.
- Anything would require mounting a GPUix tree in the browser. Stop: that is plan
  412's decision, and only with the Phase A evidence.

## 12. Acceptance criteria

- [ ] `apps/docs` builds and runs with `nub run --filter docs dev` / `build`.
- [ ] Every `MISSION.md` IA item is reachable from the sidebar and has a real page.
- [ ] Light and dark themes both render; the palette is GPUIXUI's, not stock Fumadocs.
- [ ] Search returns real content for a real query.
- [ ] The component index, sidebar order and status badges are generated from the
  plan 411 metadata, and the metadata test fails when an entry is inconsistent.
- [ ] Every preview on the site obeys `docs/preview-strategy.md` (plan 412).
- [ ] `apps/docs` imports no GPUix runtime package.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.
- [ ] `TODO.md` docs rows and the plans index are current; work committed on
  `agent/docs-site`.

## 13. Content truth audit (2026-10-17)

Every repository path named in backticks on a page was checked against the file
system (a throwaway script over `content/docs/**/*.mdx`). Findings and fixes:

| Page | Path named | State | Action |
| ---- | ---------- | ----- | ------ |
| `architecture.mdx` | `docs/architecture.md` | claimed to exist ("lives at"), does not exist; registered in `docs/README.md` | reworded to "will live at …; not written yet" |
| `theming.mdx` | `docs/design-system.md`, `docs/tokens.md` | claimed "are written beside the code" | reworded to "are not written yet; they are produced by the tokens/theming workstream" |
| `typography.mdx` | same two | "is defined in …" next to "once those land" | reworded to the future tense only |
| `license.mdx` | `LICENSES/{inventory,provenance}.md`, `NOTICE` | absent | already honest ("must exist before release; none is written yet") — no change |
| `api-reference.mdx` | `apps/docs/src/components/preview/captures.ts` | exists | none |

This is **not** a test, deliberately: whether a page means "planned" or
"landed" is page prose, and the mechanical rule that is checkable — "a named
repository file exists, or is registered in that directory's README" — accepts
`docs/architecture.md`, so it would not have caught the defect. The register
(`docs/README.md`, `LICENSES/README.md`) stays the source of what will land
where, and this table records that the audit was run.

The same pass over component pages happens with them (Phase F).
