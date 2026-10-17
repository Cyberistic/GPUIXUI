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
`[~]` `packages/primitives`: docs pages for every Tier 1 component (docs-site workstream) — Buttons landed with plan 422; the other 18 Tier 1 pages are next
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
`[~]` **docs-site workstream**: Tier 1 component pages + the `docs/preview-strategy.md`
      decision (code examples plus a companion native playground, never a silent
      HTML/CSS reimplementation) — the strategy is implemented (plan 412) and the
      first page (Buttons) lands with plan 422; the remaining pages are next
`[ ]` **licensing**: record the GPUix (Apache-2.0) and Lucide (ISC) provenance and
      any icon/blend decision in `LICENSES/`

## Phase C — Tier 1–2 components

`[~]` `[███░░░░░░░]` 1/3

`[~]` Tier 1 foundational components (code + test + example + docs + inventory):
      all 19 components have code, tests, a runtime-verified interaction, an
      in-package docs page, a mounted example and an inventory row; **docs-site
      pages are still pending** (docs-site workstream)
`[ ]` Tier 2 composition/feedback components (same bar)
`[x]` Verify every component in both themes (`runtime/theme.runtime.test.tsx`: both palettes, a live switch, and no colour outside the active palette)

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

## Docs site workstream (plans 410–422)

`[x]` `[█████████░]` 19/20

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
`[x]` Docs platform toggle (macOS · Linux · Windows · Default) built on `platformTypes` + `platformTheme`; URL + storage state, live values on Theming (plan 420)
`[x]` A planned component's search result opens the index filtered to it (plan 421)
`[ ]` Docs truth pass against the implementation (Phase F) — needs the component pages

## Cross-team tasks raised by the docs-site workstream

`[x]` `[███░░░░░░░]` 4/13

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
`[x]` Canonical and OpenGraph URLs are absolute — resolved in the docs workstream by plan 418: `SITE_URL` defaults to the deploy domain (`docs.gpuixui.dev`) and is overridable with `VITE_SITE_URL`; no change to `packages/deploy` was needed
`[ ]` Owner: the Alchemy deploy path (`nub run deploy:docs`) is unverified — it needs Cloudflare credentials and lives in `packages/deploy`. The stand-down path is verified locally (plan 410 §3)
`[ ]` Repo: `README.md` still says "Phase A (audit and feasibility)" although Phase B tokens and the docs site are implemented; update the ledger to match `TODO.md`
