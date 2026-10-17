# TODO.md — the persistent source of truth

This file is how work resumes after a context compaction, a restart, or a new
agent. Tick items as they finish. Add categories as plans land. If a task is not
here, add it and tick it. Implementation details do not belong here — only tasks
worth tracking.

Legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` cancelled

---

## Harness — the supervisor that keeps the swarm alive

`[x]` `[█████████░]` 5/6

`[x]` Repo on `proserver` with the required shape, mission, rules and plan index
`[x]` opencode 2.0.31 installed with the provider credentials and a trimmed config
`[x]` Verified a real run on `opencode-go-braven/deepseek-v4.1-flash`
`[x]` Supervisor: 30-minute tick, ≥5 agents, one worktree each, idempotent and crash-safe
`[x]` Scheduler installed (launchd agent + daemon driver; see `.agents/slop/README.md`)
`[ ]` Enforce one live session per worktree: the `opencode run` loop currently
starts a new session before the previous one closes (evidence:
`.agents/slop/blockers/2026-10-17-concurrent-tokens-writers.md`)

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

`[x]` `[██░░░░░░░░]` 1/6

`[ ]` Land the workspace, boundaries and package scaffolding that has real content
`[x]` Land tokens and the theming architecture (light + dark, semantic roles)
`[ ]` Land the primitives package
`[ ]` **Native smoke test**: layout, input, focus, overlay and panel primitives in real GPUix
`[ ]` Land one fully working component running in GPUix
`[ ]` Land the docs shell and document that component in Fumadocs

### Design tokens and theming (`tokens-theme`)

`[x]` `[████████████]` 13/15

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
`[ ]` Cross-team: native theme gallery in `apps/playground` (owner:
`playground`; blocked by B1); Fumadocs Theming page from `docs/tokens.md`
(owner: `docs-site`); add `tokens` to `packages/README.md` and ignore the
`references` symlink in `.gitignore` (owner: repo tooling)
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
