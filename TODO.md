# TODO.md — the persistent source of truth

This file is how work resumes after a context compaction, a restart, or a new
agent. Tick items as they finish. Add categories as plans land. If a task is not
here, add it and tick it. Implementation details do not belong here — only tasks
worth tracking.

Legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` cancelled

---

## Harness — the supervisor that keeps the swarm alive

`[x]` `[████████████]` 6/6

`[x]` Repo on `proserver` with the required shape, mission, rules and plan index
`[x]` opencode 2.0.31 installed with the provider credentials and a trimmed config
`[x]` Verified a real run on `opencode-go-braven/deepseek-v4.1-flash`
`[x]` Supervisor: 30-minute tick, ≥5 agents, one worktree each, idempotent and crash-safe
`[x]` Scheduler installed (launchd agent + daemon driver; see `.agents/slop/README.md`)
`[x]` Model fallback chain with limit detection, one active model for the whole swarm, and an hourly recovery probe (see `scripts/README.md`)

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

## Swarm-owned blockers (fix these)

- **B1** GPUix native bindings fail to install (blocks the playground + every native smoke test).
- **B2** No durable scheduler — the swarm runs on a detached daemon; launchd and cron do not fire here.

Both are specified in `BLOCKERS.md`; each fix starts with a plan under `.agents/slop/plans/`.

## Docs site workstream (plans 410–413)

`[x]` `[█████████████░]` 13/15

`[x]` Write and index the docs-site plans (410, 411, 412, 413, 414, 415)
`[x]` Scaffold `apps/docs` (Fumadocs + TanStack Start, build + dev work) — build, dev, type-check and tests verified
`[x]` Docs identity: light/dark themes from the tokens theme — provisional HSL roles in `app.css`, reconciled with the tokens workstream later
`[x]` Working search (server route + UI) — `/api/search?query=button` returns real results
`[x]` Information architecture pages (`content/docs/**`) + landing page — guarded by `src/content.test.ts`
`[x]` Component metadata contract, registry test, generated index (plan 411)
`[x]` Preview components + `docs/preview-strategy.md` (plan 412) — tier selection and screenshot provenance are enforced; a capture without its sidecar is never shown
`[x]` Per-page document metadata (plan 413) — every page's title, description, OpenGraph tags and canonical URL come from its frontmatter; verified against the dev server in both directions (`<title>GPUIXUI</title>` before, `<title>Installation — GPUIXUI</title>` after)
`[x]` Copyable real source (plan 414) — component pages include the real file with Fumadocs' built-in `<include>` instead of a custom component; `content-references.test.ts` guards broken paths, missing regions, silent self-closing tags, `auto-type-table` paths and a finished component's page omitting its source
`[x]` API metadata (plan 415) — the generator is verified in this app, a real table renders on `api-reference.mdx`, and `type-table.test.ts` pins the props-type contract (`@internal` hidden, optionality, unknown name → nothing); the generator's cache ignores options, so no type is generated twice with different options
`[x]` Content truth audit of the pre-component pages — every repository path a page names checked against the file system; three present-tense claims about documents that do not exist yet corrected (`architecture`, `theming`, `typography`); evidence in plan 410 §13
`[x]` Component package names checked against the repository — the `Icons` row claimed `@gpuixui/primitives`; it is `@gpuixui/icons` (plan 411 §9a)
`[x]` Component-page contract enforced (`component-pages.test.ts`) — the template lists the required sections and every finished component's page must carry them plus the `ComponentState`/`NativePreview` blocks; the template had no `Composition` section (plan 411 §9b)
`[ ]` Document the first real component page (needs the primitives/components workstream)
`[ ]` Docs truth pass against the implementation (Phase F) — needs the component pages

## Cross-team tasks raised by the docs-site workstream

`[ ]` `[░░░░░░░░░░]` 0/11

`[ ]` Owner: hoist the `apps/docs` stack (fumadocs, tanstack, tailwind, vite) into the root catalog
`[-]` Repo tooling: oxfmt now ignores `**/.source/**` and `**/routeTree.gen.ts` (edited in this workstream)
`[ ]` Repo tooling: `.gitignore`'s `references/` does not match the worktree's `references` symlink, so it shows as untracked and can be committed by accident; ignore the symlink too
`[ ]` Owner: decide whether the root `nub.lock` (produced by `nub install`) is committed for reproducible installs or ignored; it is currently untracked
`[ ]` Repo: AGENTS/PLAN name an integration branch `main`, but only `master` exists and the shared checkout is on it — confirm the name before workstreams merge. `agent/docs-site` is green and ready to integrate; it was not merged because the shared checkout had uncommitted edits from another agent
`[ ]` **Supervisor: two writers in one worktree.** A docs-site loop session (`run-docs-site.sh` → `opencode run`) and the interactive docs-site session wrote `workspaces/docs-site` at the same time on 2026-10-17 08:38–08:52: the loop committed the other session's in-flight edit together with its own work, and reverted a line of it mid-run. Evidence in `.agents/slop/docs-site-concurrency.md`. Per AGENTS §6 this session stopped the loop (both pids) to become the single writer. Fix: treat a live writer as owning the tree — either track interactive sessions, or refuse to start a workstream whose tree has uncommitted changes from a different pid. Owner: whoever owns `scripts/swarm-supervisor.sh`
`[ ]` Tokens-theme: expose a dependency-free token data export the docs site can read for token tables
`[ ]` Components/primitives: export tsdoc-annotated props types the docs site can turn into API tables — the contract is now executable in `apps/docs/src/lib/type-table.fixture.tsx` / `type-table.test.ts` (plan 415): exported type, tsdoc per prop, `@internal` for hidden props, `?` for optional
`[ ]` Playground: add a per-component screen + a real native screenshot capture script (plan 412 §5) — the sidecar contract (`provenance.json` beside each PNG) is now enforced by `preview.test.tsx`, so a capture without it will not render
`[ ]` Docs site: the first real component page — it must show its source via `<include>` and include it in `content/docs/components/meta.json`. The copyable-source mechanism itself landed with plan 414; the page waits on the primitives/components workstream
`[ ]` Owner: the site's canonical link and OpenGraph tags are relative (`/docs/installation`); an absolute URL needs the deploy domain (`packages/deploy/alchemy.run.docs.ts`), which is outside this workstream — plan 413 §7
